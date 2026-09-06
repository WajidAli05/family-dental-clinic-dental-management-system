/**
 * Lab-case lifecycle — THE single source of truth.
 *
 * Two problems this file exists to fix:
 *
 * 1. The status enum was declared TWICE in LabCase.model.js (case level and
 *    timeline level). Both now import LAB_CASE_STATUSES from here.
 *
 * 2. "Which statuses count as an open case?" was hardcoded in six places
 *    across three services — and they disagreed. The dentist counted
 *    `delivered`, the owner counted `received`, the receptionist counted
 *    neither. OPEN_CASE_STATUSES below is now the only answer.
 *
 * Mirrored (not re-derived) by Frontend/src/lib/labCaseConfig.js, the same
 * backend-authoritative pattern as appointmentConfig.js.
 */

// ── Canonical lifecycle ─────────────────────────────────────────────────────
export const CANONICAL_STATUSES = Object.freeze([
  "requested",     // sent to the lab, not yet picked up
  "accepted",      // lab has taken the case on
  "in_production", // being made
  "qc",            // quality check before it leaves the lab
  "ready",         // finished, awaiting dispatch
  "dispatched",    // on its way to the clinic
  "received",      // back at the clinic
  "fitted",        // placed in the patient
  "approved",      // dentist signed it off
  "rejected",      // dentist sent it back
]);

/**
 * LEGACY values kept as legal enum members so existing documents stay valid
 * and no migration is needed — exactly the approach used for appointments.
 * They are mapped to canonical form on READ; nothing rewrites stored data.
 */
export const LEGACY_STATUS_ALIASES = Object.freeze({
  sent: "requested",
  in_progress: "in_production",
  delivered: "dispatched",
});

/** Everything the model will accept: canonical + legacy. */
export const LAB_CASE_STATUSES = Object.freeze([
  ...CANONICAL_STATUSES,
  ...Object.keys(LEGACY_STATUS_ALIASES),
]);

/** Where every NEW case starts. Legacy "sent" rows remain valid on read. */
export const INITIAL_STATUS = "requested";

/** Legacy or canonical in, canonical out. */
export function canonicalStatus(v) {
  const s = String(v || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return LEGACY_STATUS_ALIASES[s] || s;
}

export const isLabCaseStatus = (v) => LAB_CASE_STATUSES.includes(String(v || "").trim().toLowerCase());

/**
 * Cases still in flight. Includes the LEGACY spellings so the existing
 * `countDocuments({ status: { $in: ... } })` queries keep matching rows that
 * were written before the lifecycle was extended.
 */
export const OPEN_CANONICAL = Object.freeze([
  "requested", "accepted", "in_production", "qc", "ready", "dispatched", "received",
]);

export const OPEN_CASE_STATUSES = Object.freeze([
  ...OPEN_CANONICAL,
  ...Object.entries(LEGACY_STATUS_ALIASES)
    .filter(([, canon]) => OPEN_CANONICAL.includes(canon))
    .map(([legacy]) => legacy),
]);

/**
 * Allowed transitions, in canonical terms.
 *
 * `approved`/`rejected` remain reachable from any live state (the dentist may
 * sign off or send back whenever the work is in the clinic's hands), and
 * `rejected` returns to production so a remake does not need a new case.
 */
export const LAB_CASE_TRANSITIONS = Object.freeze({
  requested:     ["accepted", "in_production", "rejected"],
  accepted:      ["in_production", "rejected"],
  in_production: ["qc", "ready", "rejected"],
  qc:            ["ready", "in_production", "rejected"],
  ready:         ["dispatched", "in_production", "rejected"],
  dispatched:    ["received", "rejected"],
  received:      ["fitted", "approved", "rejected"],
  fitted:        ["approved", "rejected"],
  approved:      ["in_production"], // reopen for a remake
  rejected:      ["in_production"], // reopen for a remake
});

/**
 * WHO may set WHAT.
 *
 * The lab drives production but can NEVER approve or reject — that is the
 * dentist's clinical sign-off and the existing 403 must be preserved.
 */
export const ROLE_ALLOWED_STATUSES = Object.freeze({
  lab: ["accepted", "in_production", "qc", "ready", "dispatched"],
  dentist: ["received", "fitted", "approved", "rejected", "in_production"],
  owner: [...CANONICAL_STATUSES],
  receptionist: ["received", "dispatched"],
});

/** Legal next steps for a role, given where the case is now. */
export function allowedNextStatuses(current, role) {
  const from = canonicalStatus(current);
  const byLifecycle = LAB_CASE_TRANSITIONS[from] || [];
  const byRole = ROLE_ALLOWED_STATUSES[String(role || "").toLowerCase()] || [];
  return byLifecycle.filter((s) => byRole.includes(s));
}

export function canTransition(current, next, role) {
  const to = canonicalStatus(next);
  if (to === canonicalStatus(current)) return true;
  return allowedNextStatuses(current, role).includes(to);
}

// ── Priority ────────────────────────────────────────────────────────────────
export const CASE_PRIORITIES = Object.freeze(["normal", "high", "urgent"]);
export const isCasePriority = (v) => CASE_PRIORITIES.includes(String(v || "").trim().toLowerCase());

/** A case is overdue when it is still open and its dueDate has passed. */
export function isOverdue(dueDate, status, today) {
  const d = String(dueDate || "").trim();
  if (!d || !today) return false;
  if (!OPEN_CANONICAL.includes(canonicalStatus(status))) return false;
  return d < today; // "YYYY-MM-DD" compares lexically = chronologically
}

/**
 * Every stored spelling that reads as `canonical`.
 *
 * Queries must match legacy rows too: a tile filtering `status: "in_production"`
 * would silently miss every row written as "in_progress", and vice versa.
 */
export function statusesFor(canonical) {
  const target = canonicalStatus(canonical);
  return [target, ...Object.entries(LEGACY_STATUS_ALIASES)
    .filter(([, c]) => c === target)
    .map(([legacy]) => legacy)];
}

/**
 * "Due soon" window, in days. A case due within this many days (and not yet
 * closed) is flagged so the clinic can chase it before it slips.
 * N = 3: short enough to be actionable, long enough to act on a lab turnaround.
 */
export const DUE_SOON_DAYS = 3;

const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * One derivation of due state, shared by every role and mirrored on the client.
 * Returns "overdue" | "due_soon" | "" (never late for a closed case).
 */
export function dueState(dueDate, status, today) {
  const d = String(dueDate || "").trim();
  if (!d || !today) return "";
  if (!OPEN_CANONICAL.includes(canonicalStatus(status))) return "";
  if (d < today) return "overdue";
  if (d <= addDays(today, DUE_SOON_DAYS)) return "due_soon";
  return "";
}
