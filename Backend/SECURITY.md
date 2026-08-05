# Security, Access Control & Data Lifecycle

Coherent reference for who can access what, how deletion and retention work,
and how PDPL erasure requests are handled. For backup/restore/disaster
recovery and the owner data-export feature, see **[BACKUP.md](./BACKUP.md)**
— this document doesn't repeat that content, only links to it.

1. [Authentication & session model](#1-authentication--session-model)
2. [Authorization model (roles + permissions)](#2-authorization-model-roles--permissions)
3. [Route → role/permission matrix](#3-route--rolepermission-matrix)
4. [Least-privilege enforcement (server-side, not just UI)](#4-least-privilege-enforcement-server-side-not-just-ui)
5. [Findings from this audit — fixed](#5-findings-from-this-audit--fixed)
6. [Soft delete](#6-soft-delete)
7. [Data retention policy](#7-data-retention-policy)
8. [Right to erasure / anonymization (PDPL)](#8-right-to-erasure--anonymization-pdpl)
9. [Encryption](#9-encryption)
10. [Audit trail](#10-audit-trail)

---

## 1. Authentication & session model

Every non-public route is guarded by `auth(roles)` (`Backend/middlewares/auth.middleware.js`):

1. Verifies the JWT (`jsonwebtoken`, `JWT_SECRET`).
2. Rejects 2FA challenge tokens outright (they're only valid at `/auth/2fa/login`).
3. Loads the user; rejects if disabled.
4. **Revocation check**: compares the JWT's `tokenVersion` against the user's
   current `tokenVersion`. "Log out of all devices" bumps the DB value,
   instantly invalidating every previously-issued token — see the session
   management work (`tokenVersion`, `Backend/routes/v1/session.routes.js`).
5. If `roles` is non-empty, rejects users whose role isn't in the list.

`auth([])` / `auth()` (empty array) means "any authenticated role, no
restriction" — used only for genuinely shared endpoints (clinic-config read,
2FA self-service, session self-service).

## 2. Authorization model (roles + permissions)

Two layers, reused everywhere — **this audit did not invent a new one**:

- **Role gate** — `auth([...roles])` at the route/mount level. Coarse: "is
  this user's role even allowed near this router at all."
- **Permission gate** — `requirePermission(key)` (`Backend/middlewares/permissions.middleware.js`),
  backed by `userCanAccess()` (`Backend/services/permissions.service.js`) and
  the single source of truth `Backend/services/shared/permissionsConfig.js`.
  Fine-grained: per-tab keys like `tab_dentist_finance`,
  `tab_receptionist_logs`, grantable per role by the owner (Owner → Staff →
  Permissions), self-healing on server start (`ensurePermissionsDoc()`).
  **Owner always passes every permission check** (`userCanAccess` short-circuits
  on `role === "owner"`).

`userCanAccess(user, permKey)` now **fails closed**: no `user` → denied (was:
granted — see §5). `!permKey` still passes through, since every real call
site always supplies a key; that branch exists for callers that don't gate
on a specific permission at all.

## 3. Route → role/permission matrix

Every route across every router in `Backend/routes/v1/`. "Scope" describes
what narrows access *within* an allowed role (self-only, permission-gated,
clinic-wide by design, etc).

### `/api/v1/auth` — mounted with no auth (pre-login by definition)

| Route | Method | Auth | Scope | Status |
|---|---|---|---|---|
| `/auth/login` | POST | none (issues JWT) | — | correct |
| `/auth/2fa/login` | POST | none (challenge token in body, not a Bearer JWT) | — | correct |
| `/auth/2fa/status`, `/setup`, `/verify-setup`, `/send-otp`, `/disable` | GET/POST | `auth(ALL_ROLES)` | self (`req.user._id`) | correct |
| `/auth/session/login-history` | GET | `auth(ALL_ROLES)` | self only | correct |
| `/auth/session/logout-all-devices` | POST | `auth(ALL_ROLES)` | self only (bumps own `tokenVersion`) | correct |

### `/api/v1/clinic-config` — mounted per-route in `routes/v1/index.js`

| Route | Method | Auth | Scope | Status |
|---|---|---|---|---|
| `/clinic-config` | GET | `auth(["dentist","receptionist","owner","lab"])` | read-only, clinic-wide | correct |
| `/clinic-config/country` | PATCH | `auth(["owner"])` | clinic-wide financial config (currency/tax preset) | **fixed** — was all 4 roles |
| `/clinic-config/locale` | PATCH | `auth(["dentist","receptionist","owner","lab"])` | clinic-wide display language | reviewed, kept — see §5 |

### `/api/v1/lab` — `auth(["lab","owner"])` at the mount

| Route | Method | Scope | Status |
|---|---|---|---|
| `/lab/me` (GET/PATCH) | | self (`req.user.publicId`) | correct |
| `/lab/stats` | GET | self | correct |
| `/lab/cases` | GET | self (`lab: labUser._id`) | correct |
| `/lab/cases/:id/status`, `/:id/note` | PATCH | self | correct |

No financial data is exposed anywhere on this router — confirms "lab cannot
read financials."

### `/api/v1/dentist` — `auth(["dentist","owner"])` at the mount, `requirePermission(tab_dentist_*)` per route

Every route below additionally requires the matching permission key AND is
scoped to `req.user._id` in the controller → service call:

| Route family | Permission key | Scope | Status |
|---|---|---|---|
| `/me`, `/me/password` | `tab_dentist_profile` | self | correct |
| `/stats` | `tab_dentist_dashboard` | self | correct |
| `/appointments*` | `tab_dentist_appointments` | self (own appointments only) | correct |
| `/patients` | `tab_dentist_patients` | self (own patients only, read-only) | correct |
| `/cases*`, `/labs` | `tab_dentist_lab_samples` | self | correct |
| `/prescriptions*` | `tab_dentist_appointments` | self | correct |
| `/catalog/*` | `tab_dentist_appointments`/`_lab_samples` | read-only shared catalog | correct |
| `/finance` | `tab_dentist_finance` | self (own commission/earnings only) | correct |
| `/medications*` | `tab_dentist_appointments` | shared catalog | correct |

Confirms "dentist sees only their OWN finance/patients" — `dentistGetFinance`,
`dentistGetPatients`, `dentistGetAppointments` etc. all take `req.user._id`
as their first argument and filter by it at the query level.

### `/api/v1/receptionist` — `auth(["receptionist","owner"])` at the mount, `requirePermission(tab_receptionist_*)` per route

Receptionist is a clinic-wide front-desk role by design (not per-identity
scoped like dentist/lab) — it manages all patients/appointments/lab-samples/
billing/inventory across the clinic. Confirmed it has **no route** exposing
`CommissionRules` or `OwnerPayment` (dentist commissions, owner-lab
settlements) — those stay owner/dentist-only. No permission-management or
clinic-config routes exist on this router either.

| Route family | Permission key | Status |
|---|---|---|
| `/me*` | `tab_receptionist_profile` | correct |
| `/stats` | `tab_receptionist_dashboard` | correct |
| `/appointments*`, `/dentists` | `tab_receptionist_appointments` | correct |
| `/patients*` | `tab_receptionist_patients` | correct |
| `/lab-samples*`, `/labs`, `/sample-types` | `tab_receptionist_lab_samples` | correct |
| `/invoices*`, `/billing/*`, `/catalog/*` | `tab_receptionist_billing` | correct |
| `/inventory*` | `tab_receptionist_inventory` | correct |

### `/api/v1/owner` — `auth(["owner"])` at the mount, no route needs anything finer (single role, full clinic authority)

All of these — including every Phase-0 addition — are owner-only purely by
being on this router:

| Route family | Status |
|---|---|
| `/dashboard`, `/appointments*`, `/patients*`, `/labs*`, `/lab-cases*`, `/sample-types*`, `/dentists` | correct |
| `/billing/*`, `/finance/*` | correct |
| `/staff*`, `/permissions` (GET/PATCH — grants tab access to other roles) | correct |
| `/inventory/*`, `/clinical-master/*`, `/settings*`, `/medications*` | correct |
| `/security/locked-accounts`, `/security/unlock/:userId` | correct |
| `/security/login-history/:publicId` (view **any** staff member's login history) | correct — owner-only, matches "user may only view their own history" for everyone *except* the owner, who is explicitly allowed to audit staff by design |
| `/data-export/collections`, `/data-export/json`, `/data-export/csv/:collection` | correct |
| `/patients/:publicId/erase` (new — §8) | correct |
| `/notifications*` | correct, and additionally self-scoped to `recipientId: req.user._id` |

### `/api/v1/permissions` — `auth(["dentist","receptionist","owner"])`

| Route | Scope | Status |
|---|---|---|
| `/permissions/my` | Returns the full grant matrix + `req.user.role`; matrix itself isn't secret (needed for every role's own UI gating), and no user-specific secret is exposed | correct |

### `/api/v1/audit` — `auth(["owner","receptionist"])`

| Route | Scope | Status |
|---|---|---|
| `/audit/logs` | Owner: unrestricted. Receptionist: `requirePermission("tab_receptionist_logs")` **and** hard-capped server-side to a safe action allowlist (`RECEPTIONIST_SAFE_ACTIONS` in `auditQuery.js`) with PHI fields in `before`/`after` redacted regardless of role | correct — this is the existing "safe subset" the task asked to confirm stays intact; it does |

## 4. Least-privilege enforcement (server-side, not just UI)

Verified server-side (not just hidden in the frontend) for every item TASK 2
named explicitly:

- **Lab cannot read financials** — confirmed, `/lab/*` exposes only case/
  sample status data, no invoice/commission fields anywhere in `lab.service.js`.
- **Dentist sees only their own finance/patients** — confirmed, every
  dentist controller passes `req.user._id` into the service layer as the
  scoping key.
- **Receptionist cannot change permissions or clinic config** — confirmed,
  no such route exists on `/receptionist`; `/clinic-config/country` is now
  owner-only (§5); `/owner/permissions` is owner-only by mount.
- **Only owner can access security, data-export, permission management, full
  audit logs** — confirmed, all on the owner-only router.
- **Receptionist audit view stays the safe subset** — confirmed, unchanged.
- **Users can only act on their own session/history**, except the owner who
  may view (not act on behalf of) staff login history by design — confirmed
  (`/auth/session/*` self-scoped; `/owner/security/login-history/:publicId`
  is read-only and owner-only).

## 5. Findings from this audit — fixed

| # | Finding | Severity | Fix |
|---|---|---|---|
| 1 | `PATCH /clinic-config/country` allowed **all four roles** (dentist, receptionist, owner, lab) to change the clinic's country/currency/tax preset — a clinic-wide financial setting. The service function itself was already documented `/** Owner-only: ... */` but the route didn't enforce it. Any staff member could silently change the whole clinic's currency. | High | Route restricted to `auth(["owner"])`. Frontend `CountryToggle` (rendered in every role's sidebar) now shows read-only for non-owners instead of a dead/403-ing control. |
| 2 | `userCanAccess(user, permKey)` returned `true` (granted) when `user` was falsy — **fail-open**. Currently unreachable in practice because every router using `requirePermission()` sits behind a mount-level `auth()` that populates `req.user` first, but this is a real logic hole: if that assumption is ever broken by a future refactor, the permission check would silently grant access instead of denying it. | Medium (defense-in-depth) | Changed to fail closed: `!user` → `false`. `!permKey` still passes through (no permission key means no permission gate was requested). |
| 3 | `lab.routes.js` carried a comment "For now, no auth middleware. Later plug in JWT middleware here" — factually stale (the parent mount in `index.js` does apply `auth(["lab","owner"])`), but actively misleading: a future maintainer could read it and either assume the router is unprotected, or move/duplicate it somewhere without realizing it depends entirely on its current mount point. | Low (docs) | Comment corrected to state the actual protection and warn against remounting without it. |

**Reviewed, not changed** (documented here so it isn't re-flagged as an
oversight next time):

- `/lab`, `/dentist`, `/receptionist` mounts each also allow `owner` in
  addition to the specific role. This looks broader than necessary since
  the owner has full parallel endpoints under `/owner/*`. It is **not
  exploitable**: every controller on those three routers scopes queries by
  `req.user._id`/`req.user.publicId`, and an owner's identity never matches
  a Dentist/Lab/Receptionist record, so an owner hitting e.g. `/dentist/finance`
  gets an empty result, not another dentist's or the clinic's aggregate data.
  Removing "owner" from those mounts was considered and rejected — no
  verified legitimate use case was found either way, and changing it carries
  real regression risk for a purely theoretical tightening, which conflicts
  with "preserve everything working."
- `PATCH /clinic-config/locale` was left open to all roles. Unlike
  `country` (which changes currency/tax — real financial impact and was
  explicitly commented owner-only), locale only changes the shared UI
  display language. Low stakes, no code comment marking it owner-restricted,
  and it's plausible a clinic wants any staff member able to switch the
  shared terminal language.

## 6. Soft delete

**Before this audit**: `deleteOne`/`deleteMany` hard-removed documents for
Appointments (`deleteAppointmentCore`) and LabCase (`ownerDeleteLabCase`,
`receptionistDeleteLabSample`). Patient deletion was already a de-facto soft
delete (`status: "inactive"` + a `"deleted"` tag) but ad hoc — not a real
flag, and not enforced at the query level (any query could still return a
"deleted" patient if it didn't happen to filter on `status`/`tags`).
Invoice and Prescription had **no delete route at all** — nothing to convert.

**Now**: `Backend/models/plugins/softDelete.js` — a schema plugin (same
pattern as the existing `toJSON` plugin, applied to `Patient`,
`Appointment`, `LabCase`):

- Adds an additive `deletedAt: Date | null` field.
- Installs `pre` hooks on `find`, `findOne`, `findOneAndUpdate`,
  `countDocuments`, `count`, and `aggregate` that automatically inject
  `{ deletedAt: null }` unless the query already specifies `deletedAt` or
  passes `{ includeDeleted: true }` as a query option. This is the "shared
  query filter, not scattered across call sites" the task asked for —
  every existing `.find()`/`.findOne()`/`.aggregate()` call across
  `owner.service.js`, `receptionist.service.js`, `dentist.service.js` etc.
  is now soft-delete-aware **without having been touched**.
- Adds `doc.softDelete()` (sets `deletedAt = now`, saves) and `doc.restore()`
  (clears it) instance methods.

`deleteAppointmentCore`, `ownerDeleteLabCase`, `receptionistDeleteLabSample`
now call `.softDelete()` instead of `.deleteOne()`. `ownerPatientDelete`
keeps its existing `status`/`tags` mutation (frontend may depend on it) and
additionally sets `deletedAt` for real query-level enforcement.

Backup (`scripts/backup.js`) and restore intentionally bypass this — they
use the raw MongoDB driver, not Mongoose, so a DR backup still captures
soft-deleted records (you can recover from an accidental soft-delete via
restore) and a restore writes them back exactly as archived.

## 7. Data retention policy

Configurable per clinic — Owner → Settings → **Data Retention Policy**,
backed by `ClinicSettings.retention` (additive field, same singleton
document as billing/locale settings):

```
patientRecordsYears:   7   (default)
financialRecordsYears: 7   (default)
auditLogYears:         7   (default)
```

**No automated purge job runs today.** These values are the documented
policy and are available to any future purge tooling — per the task's
explicit instruction, an automated purge is optional, must respect these
minimums, and must default to off. Since none exists yet, nothing can
auto-destroy data; soft-deleted and even erased/anonymized records remain
in the database indefinitely until an operator takes manual action.

If a scheduled purge is added later, it must, at minimum:
- Only ever touch documents where `deletedAt` is older than the configured
  retention window for that record type.
- Never touch `AuditLog` before `auditLogYears` has elapsed, regardless of
  any other setting (audit integrity requirements always take precedence).
- Never touch `Invoice` (or anything with financial totals) before
  `financialRecordsYears` has elapsed.
- Be off by default (`purgeEnabled`-style flag, not present in the schema
  today because no purge code consumes it yet — add it alongside the first
  real purge implementation, not before).

## 8. Right to erasure / anonymization (PDPL)

**Owner → Patients → open a patient → "Erase Data"** (also
`POST /api/v1/owner/patients/:publicId/erase`, owner-only via the `/owner`
mount). Implementation: `Backend/services/shared/erasure.js`.

**Confirmation**: destructive and irreversible, so the UI requires typing
the patient's exact ID before the button activates; the server independently
re-checks `req.body.confirm === req.params.publicId` and rejects otherwise.
This mirrors the typed-confirmation pattern already used by
`scripts/restore.js --apply`.

**What gets anonymized:**
- `Patient.name` → `"Erased Patient (<publicId>)"`
- `Patient.phone` → `"[erased]"` (schema requires a non-empty phone; this is
  the placeholder, not a real number)
- `Patient.email`, `.address`, `.city` → `""`
- `Patient.tags` → `["erased"]`; `status` → `"inactive"`; both `deletedAt`
  and a new `anonymizedAt` timestamp are set (anonymization also implies
  soft-delete — an erased patient never appears in normal queries again)
- Every `Prescription` where `patientId` matches: `diagnosis`, `treatment`,
  `clinicalFinding`, `notes` → `""`, `medications` → `[]` (clears the
  encrypted PHI; empty values are never encrypted in the first place, see
  §9, so this is a real erasure, not a re-encryption of empty data)

**What is deliberately preserved:**
- The `Patient` document itself (referenced by `Invoice.patient`,
  `Appointment.patient`, `LabCase.patient` as ObjectId refs — deleting it
  would orphan financial and clinical records).
- `Invoice` documents, in full — `totalAmount`, `items`, `payments` are
  never touched. Since `Invoice.patient` is a live reference (not a
  denormalized name snapshot), any invoice view that populates the patient
  automatically reflects the anonymized name — no separate Invoice mutation
  needed.
- `Appointment` documents (scheduling/financial continuity for dentist
  earnings history).
- `AuditLog` — **cannot** be edited even in principle: the schema's
  `pre("save"/"updateOne"/...)` hooks throw on any attempt to mutate an
  existing entry, by design, to protect the hash chain. Historical entries
  created *before* an erasure (e.g. "receptionist registered patient X" at
  intake) will still show that patient's pre-erasure name as a permanent
  historical fact. This is a known, accepted limitation: an immutable
  security/compliance audit trail and a mutable-on-request PII store are in
  tension, and integrity of the former was prioritized, consistent with how
  audit/security logs are commonly treated as a recognized exception to
  erasure obligations. The erasure action itself only ever writes a new
  `patient.erasure` entry containing the patient's durable ID — **never**
  the PII being erased.

**Audit trail for the erasure itself**: `recordAudit()` with action
`patient.erasure`, `entityType: "Patient"`, `entityId`/`entityLabel` set to
the patient's `publicId` (never their name), `after: { fieldsErased,
prescriptionsCleared }`. Visible in Owner → Logs like any other action.

**Idempotency / re-erasure guard**: calling erase on an already-anonymized
patient (`anonymizedAt` already set) returns a 409 rather than silently
re-running (there is nothing left to anonymize, and re-running would
overwrite the `anonymizedAt` timestamp misleadingly).

## 9. Encryption

Full detail: `Backend/utils/fieldEncryption.js` header comment and prior
implementation docs. Summary: Prescription PHI fields (`diagnosis`,
`treatment`, `clinicalFinding`, `notes`, `medications`) are AES-256-GCM
encrypted at rest with `FIELD_ENCRYPTION_KEY`, versioned ciphertext format
(`v1:iv:tag:ciphertext`), legacy-plaintext-safe on read. Empty values are
never encrypted (stored as real empty strings) — this is what makes the
erasure flow in §8 a genuine erasure rather than "encrypted empty data."
Backup archive encryption (`BACKUP_ENCRYPTION_KEY`, a *separate* key) is
documented in **[BACKUP.md](./BACKUP.md)**.

## 10. Audit trail

`Backend/models/AuditLog.model.js` — append-only (enforced by pre-hooks
that throw on any update/delete attempt), SHA-256 hash-chained
(`hashPrev`/`hashSelf`), `Backend/services/shared/audit.js` exports
`recordAudit()` (never throws — logging failures never break the request).
Actions relevant to this audit, added additively to the existing enum:
`data.export`, `system.backup`, `patient.erasure`. PHI redaction for the
Audit Log Viewer (`Backend/services/shared/auditQuery.js`) is unchanged and
reused as-is by the owner data-export's `auditlogs` collection export (see
BACKUP.md §9).
