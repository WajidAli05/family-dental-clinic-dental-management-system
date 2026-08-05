# Backup, Restore & Data Export

Disaster-recovery and data-portability reference for this clinic's database.
For access control, soft delete/retention, and PDPL erasure, see
**[SECURITY.md](./SECURITY.md)**. Three separate mechanisms here, do not
conflate them:

| Mechanism | Purpose | Data shape | Who/what runs it |
|---|---|---|---|
| `services/backupScheduler.js` | Disaster recovery | Same as below — calls the identical routine | The app itself, nightly, automatically |
| `scripts/backup.js` | Disaster recovery | Raw DB snapshot, Prescription fields **stay encrypted** | Ops, manually, or OS cron/Task Scheduler as an alternative to the in-app scheduler |
| `scripts/restore.js` | Disaster recovery | Restores a `backup.js`/scheduler archive | Ops, manually, after an incident |
| Owner → Settings → Data Export | PDPL portability / anti-lock-in | **Decrypted**, human-readable JSON/CSV | Clinic owner, on demand, in-app |

`backupScheduler.js` and `scripts/backup.js` both call the one actual backup
routine, `runBackup()` in `scripts/backupCore.js` — there is exactly one
implementation of "dump collections, encrypt, prune retention," reused by
both the automatic nightly run and any manual CLI run.

---

## 1. What's backed up

`scripts/backup.js` connects to `MONGO_URI` and dumps **every collection
currently in the database** (via `db.listCollections()`, not a hardcoded
list — so it can't silently miss a collection after a schema change). As of
this writing that's 19 collections: users, patients, appointments, invoices,
prescriptions, labcases, labsamples, labbills, sampletypes, inventoryitems,
suppliers, purchaseorders, inventoryconsumption, ownerpayments,
commissionrules, clinicalmaster, permissions, clinicsettings, auditlogs,
notifications.

Documents are dumped **as stored** — this includes password hashes, 2FA
secrets, and encrypted Prescription PHI ciphertext. That's intentional: a
disaster-recovery backup must be able to reconstruct the database exactly,
including auth state. This is why the archive itself is encrypted (below) —
treat it with the same care as the production database itself.

## 2. Archive encryption

The JSON dump is gzipped, then encrypted with **AES-256-GCM** using
`BACKUP_ENCRYPTION_KEY` — a key **separate from** `FIELD_ENCRYPTION_KEY`
(which encrypts individual Prescription fields inside the DB). A stolen
`.enc` file is useless without this key.

Generate it once and store it in your secrets vault:

```bash
openssl rand -hex 32
```

No `openssl` available (e.g. a bare Windows machine)?

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add the result to `Backend/.env`:

```
BACKUP_ENCRYPTION_KEY=<64 hex characters>
```

**Back this key up somewhere other than `.env`.** If you lose it, every
archive encrypted with it is permanently unreadable — there is no recovery.

## 3. `FIELD_ENCRYPTION_KEY` dependency — read this before you need a restore

> **A backup archive is only fully readable if restored into an environment
> whose `FIELD_ENCRYPTION_KEY` is IDENTICAL to the key that was active when
> the backup was taken.**
>
> The archive itself restores fine regardless of the key — documents are
> documents. But Prescription PHI (`diagnosis`, `treatment`,
> `clinicalFinding`, `notes`, `medications`) is stored as AES-256-GCM
> ciphertext keyed to `FIELD_ENCRYPTION_KEY`. Restore with the wrong key and
> every prescription's clinical content becomes **permanently unreadable
> garbage** — decryption fails silently per-field, there is no error that
> stops the restore, and there is no way to recover the plaintext after the
> fact.
>
> **Store a secure copy of `FIELD_ENCRYPTION_KEY` alongside every backup
> archive** (same vault, different secret) — not just once, in one place.
> If you ever rotate `FIELD_ENCRYPTION_KEY`, old archives still need the
> *old* key to be readable; keep a labeled history, not just the current
> value.

`scripts/restore.js` actively checks this for you: it takes a sample
encrypted PHI field from the archive and attempts to decrypt it with the
current environment's `FIELD_ENCRYPTION_KEY`, both in dry-run and apply
mode, and prints a clear ✅ / ❌ result — not just a static warning.

## 4. Retention policy

Three tiers, configurable via env, defaults shown:

```
BACKUP_RETENTION_DAILY=30    # keep the 30 most recent distinct-day archives
BACKUP_RETENTION_WEEKLY=8    # plus 1 archive/week for the 8 weeks before that
BACKUP_RETENTION_MONTHLY=12  # plus 1 archive/month for the 12 months before that
```

This is a grandfather-father-son scheme: any day in the last month can be
restored individually, one snapshot per week is kept for roughly two months
beyond that, and one per calendar month for a year beyond that. Everything
older is pruned automatically at the end of every run — this is inside
`runBackup()` (`scripts/backupCore.js`), so it applies identically whether
the run came from the nightly scheduler or a manual `node scripts/backup.js`.
Pruning only ever deletes files matching `fdc-backup-*.enc` inside
`BACKUP_DIR` — nothing else is touched.

## 5. RPO / RTO assumptions

- **RPO (Recovery Point Objective)**: equal to your backup schedule interval.
  Run nightly (the default, see §8) → up to 24h of data loss in a worst case.
  For a tighter RPO, lower `BACKUP_SCHEDULE`'s interval — the routine itself
  has no minimum interval.
- **RTO (Recovery Time Objective)**: dominated by (a) how fast you can
  provision a fresh MongoDB target and set `MONGO_URI`/`FIELD_ENCRYPTION_KEY`/
  `BACKUP_ENCRYPTION_KEY` in the new environment, and (b) `restore.js --apply`
  itself, which is roughly linear in total document count (a few minutes for
  this clinic's current data volume). Rehearse a restore onto a scratch
  database (`--db` flag, see below) periodically so the real RTO is known,
  not assumed.

## 6. Running a backup

```bash
node Backend/scripts/backup.js
```

Reads `MONGO_URI` and `BACKUP_ENCRYPTION_KEY` from `Backend/.env`. Writes
`fdc-backup-<YYYYMMDD-HHMMSS>.enc` into `BACKUP_DIR` (default:
`Backend/backups/`, override via env). Prints per-collection document counts
as it goes — never document content.

### Optional: native `mongodump` (VPS / Linux, where it's installed)

The Node script above works everywhere and needs no external tools — use it
as the primary mechanism. Where `mongodump` **is** available (typically the
production VPS, not required on a dev machine), it's a reasonable
alternative for a raw BSON dump, particularly for very large datasets:

```bash
mongodump --uri="$MONGO_URI" --gzip --archive=fdc-backup-$(date +%Y%m%d-%H%M%S).archive.gz
```

This produces its own archive format (not compatible with `restore.js`,
which expects the AES-256-GCM envelope `backup.js` produces). If you use
`mongodump` archives, encrypt them yourself before storing off-box, e.g.:

```bash
openssl enc -aes-256-gcm -salt -pbkdf2 \
  -in fdc-backup-20260101-020000.archive.gz \
  -out fdc-backup-20260101-020000.archive.gz.enc \
  -k "$BACKUP_ENCRYPTION_KEY"
```

and restore with `mongorestore --uri="$MONGO_URI" --gzip --archive=...` after
decrypting.

## 7. Restoring

**Always dry-run first.** Dry-run decrypts and validates the archive —
prints collection names, document counts, and the `FIELD_ENCRYPTION_KEY`
check — without writing anything to the database:

```bash
node Backend/scripts/restore.js Backend/backups/fdc-backup-20260101-020000.enc
```

Once you've reviewed the dry-run output, apply it. This is destructive — it
replaces the contents of every collection in the archive in the target
database — so it asks for a typed confirmation unless `--force` is passed:

```bash
node Backend/scripts/restore.js Backend/backups/fdc-backup-20260101-020000.enc --apply
```

Recommended: rehearse restores into a scratch database rather than the live
one, using `--db`:

```bash
node Backend/scripts/restore.js Backend/backups/fdc-backup-20260101-020000.enc --apply --db fdc_restore_test
```

Unattended/scripted restore (DR drills, CI) — skips the confirmation prompt:

```bash
node Backend/scripts/restore.js Backend/backups/fdc-backup-20260101-020000.enc --apply --force
```

The restore script does not write to `AuditLog` (it runs outside an
authenticated HTTP session). Note every restore in your ops/incident log
manually.

## 8. Scheduling automated backups

### Default: in-app nightly scheduler (no setup required)

`services/backupScheduler.js` starts with the server (`server.js` calls
`startBackupScheduler()` once, right after the DB connection) and runs
`runBackup()` on a cron schedule using [`node-cron`](https://www.npmjs.com/package/node-cron)
— no OS-level cron or Task Scheduler entry needed.

**Default: nightly at 2:00 AM.** Rationale: a hospital's OLTP system
typically needs 5–15 minute transaction-log backups because a few minutes of
lost data is clinically significant; a single dental practice's realistic
RPO (Recovery Point Objective) is **daily** — losing a partial day's
appointments/patients/invoices in a true disaster is the accepted tradeoff
for the operational simplicity of one clean nightly snapshot taken during
off-hours. If your risk tolerance is tighter, lower the RPO by scheduling
more frequently (see below) — the routine itself has no minimum interval.

Configurable via env (`Backend/.env`):

```
BACKUP_SCHEDULE_ENABLED=true       # "false" disables the scheduler entirely
BACKUP_SCHEDULE="0 2 * * *"        # cron expression — default nightly, 2:00 AM
BACKUP_TIMEZONE=Asia/Karachi       # IANA timezone; default: server's local time
```

An invalid `BACKUP_SCHEDULE` is logged as an error at startup and the
scheduler simply does not register — it never crashes the server, and a
failed *scheduled run* (e.g. a transient DB hiccup) is caught, logged, and
recorded to `AuditLog` (`system.backup`, `success:false`) without affecting
the running app.

**Testing without waiting overnight:**

```
# Backend/.env — temporarily fire every minute instead of nightly
BACKUP_SCHEDULE="* * * * *"
```

Restart the dev server (`npm run dev` in `Backend/`) and watch the console —
within a minute you'll see:

```
[backupScheduler] Scheduled backups enabled — cron "* * * * *".
[backupScheduler] Running scheduled backup (* * * * *)…
[backup] Found 19 collections.
...
[backupScheduler] Success: .../fdc-backup-<timestamp>.enc (NNN documents, NN.N KB).
```

Confirm the `.enc` file landed in `BACKUP_DIR`, then check Owner → Logs for a
`system.backup` entry. **Revert `BACKUP_SCHEDULE` to the nightly value (or
remove the line) afterward** — an every-minute schedule is for verification
only.

### Alternative: OS-level scheduler

Use this instead of (not in addition to) the in-app scheduler if you'd
rather not depend on the Node process staying up 24/7 — e.g. a Windows dev
machine that isn't always running, or an ops team that already manages all
cron jobs centrally. Set `BACKUP_SCHEDULE_ENABLED=false` first so you don't
end up with two schedules both writing archives.

### Linux / VPS — cron

Edit the crontab for the user that owns the app (`crontab -e`), daily at 2 AM:

```cron
0 2 * * * cd /path/to/App/Backend && /usr/bin/node scripts/backup.js >> /var/log/fdc-backup.log 2>&1
```

Make sure `Backend/.env` (with `MONGO_URI` and `BACKUP_ENCRYPTION_KEY`) is
readable by whichever user cron runs as.

### Windows — Task Scheduler

```powershell
$action  = New-ScheduledTaskAction -Execute "node.exe" -Argument "scripts\backup.js" -WorkingDirectory "E:\Projects\Dr Saif\App\Backend"
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -TaskName "FDC-DB-Backup" -Action $action -Trigger $trigger -Description "Nightly encrypted DB backup for Family Dental Clinic"
```

Or via the GUI: Task Scheduler → Create Task → Trigger: Daily, 2:00 AM →
Action: Start a program → Program: `node.exe`, Arguments: `scripts\backup.js`,
Start in: `E:\Projects\Dr Saif\App\Backend`.

Either way: also copy the resulting `.enc` files to storage *off* the machine
that produced them (cloud storage, a second server, etc.) — a backup that
lives next to the thing it's protecting doesn't survive a disk failure or
ransomware hitting that same machine.

## 9. Owner data export (PDPL portability)

Separate from the DR backup above. Clinic owners can export their own
clinic's data in a **decrypted, portable** format at any time:

- **In-app**: Owner → Settings → Data Export → "Download Full Export (JSON)"
  or a per-table CSV (Patients, Appointments, Invoices, Prescriptions, …).
- **API**: `GET /api/v1/owner/data-export/json` and
  `GET /api/v1/owner/data-export/csv/:collection` (owner-only, requires the
  owner's JWT).

What it does differently from `backup.js`:

- Prescription PHI is **decrypted** before export (this is the owner
  authenticated-accessing their own clinic's data, not an at-rest dump).
- Never includes password hashes, 2FA secrets/backup codes, or OTP hashes —
  the User export strips them explicitly, on top of the schema already
  excluding them by default (`select: false`).
- `AuditLog` entries are redacted the same way the in-app Audit Log Viewer
  redacts them (PHI fields inside `before`/`after` snapshots → `[REDACTED]`).
- Every export call is recorded in `AuditLog` as a `data.export` entry
  (visible in Owner → Logs), so exports are themselves auditable.
- A single generic function (`buildCsvExport()`) produces every per-table
  CSV — there is no per-collection exporter to keep in sync. A table with
  zero documents still downloads a valid CSV with a header row (derived from
  the schema), not an empty/broken-looking file.

Implementation: `Backend/services/shared/dataExport.js` (data shaping),
`Backend/controllers/dataExport.controller.js` (endpoints), routed under
`Backend/routes/v1/owner.routes.js`.

## 10. Quick reference

```bash
# One-time setup
openssl rand -hex 32                          # → BACKUP_ENCRYPTION_KEY in .env

# Backup
node Backend/scripts/backup.js

# Restore — dry run (safe, read-only)
node Backend/scripts/restore.js <archive.enc>

# Restore — apply (destructive, asks for confirmation)
node Backend/scripts/restore.js <archive.enc> --apply

# Restore — apply into a scratch DB for testing
node Backend/scripts/restore.js <archive.enc> --apply --db fdc_restore_test
```
