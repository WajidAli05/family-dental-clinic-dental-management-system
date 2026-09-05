/**
 * Lab-case lifecycle — FRONTEND MIRROR.
 *
 * Mirrors Backend/services/shared/labCaseConfig.js. The backend stays
 * authoritative: it rejects an illegal transition regardless of what this file
 * says, and every case it returns already carries a canonical `status` and an
 * `allowedNext` array computed server-side for the calling role.
 *
 * This file exists so the UI can render labels, colours and ordering without a
 * round trip — the same split as appointmentConfig.js. Prefer the server's
 * `allowedNext` when it is present; STATUS_TRANSITIONS is the fallback for
 * rows fetched by older screens that do not yet return it.
 */

export const CANONICAL_STATUSES = [
  "requested", "accepted", "in_production", "qc",
  "ready", "dispatched", "received", "fitted", "approved", "rejected",
];

/** Old rows still store these; canonicalise before comparing. */
export const LEGACY_STATUS_ALIASES = {
  sent: "requested",
  in_progress: "in_production",
  delivered: "dispatched",
};

export function canonicalStatus(v) {
  const s = String(v || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return LEGACY_STATUS_ALIASES[s] || s;
}

/** i18n keys, not literals — every label goes through t(). */
export const STATUS_LABEL_KEY = {
  requested: "labCase.status.requested",
  accepted: "labCase.status.accepted",
  in_production: "labCase.status.inProduction",
  qc: "labCase.status.qc",
  ready: "labCase.status.ready",
  dispatched: "labCase.status.dispatched",
  received: "labCase.status.received",
  fitted: "labCase.status.fitted",
  approved: "labCase.status.approved",
  rejected: "labCase.status.rejected",
};

/**
 * Badge classes. Logical properties only (no left/right) so the RTL layouts
 * used by ur/ar mirror correctly.
 */
export const STATUS_BADGE = {
  requested: "bg-slate-100 text-slate-700 border-slate-200",
  accepted: "bg-sky-100 text-sky-700 border-sky-200",
  in_production: "bg-amber-100 text-amber-800 border-amber-200",
  qc: "bg-violet-100 text-violet-700 border-violet-200",
  ready: "bg-teal-100 text-teal-700 border-teal-200",
  dispatched: "bg-blue-100 text-blue-700 border-blue-200",
  received: "bg-indigo-100 text-indigo-700 border-indigo-200",
  fitted: "bg-cyan-100 text-cyan-700 border-cyan-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

export const STATUS_TRANSITIONS = {
  requested: ["accepted", "in_production", "rejected"],
  accepted: ["in_production", "rejected"],
  in_production: ["qc", "ready", "rejected"],
  qc: ["ready", "in_production", "rejected"],
  ready: ["dispatched", "in_production", "rejected"],
  dispatched: ["received", "rejected"],
  received: ["fitted", "approved", "rejected"],
  fitted: ["approved", "rejected"],
  approved: ["in_production"],
  rejected: ["in_production"],
};

/** The lab drives production but NEVER approves or rejects — that is clinical. */
export const ROLE_ALLOWED_STATUSES = {
  lab: ["accepted", "in_production", "qc", "ready", "dispatched"],
  dentist: ["received", "fitted", "approved", "rejected", "in_production"],
  owner: [...CANONICAL_STATUSES],
  receptionist: ["received", "dispatched"],
};

/**
 * Legal next steps. `serverAllowed` (the case's `allowedNext`) wins when the
 * API supplied it, so the dropdown can never offer something the API rejects.
 */
export function allowedNextStatuses(current, role, serverAllowed) {
  if (Array.isArray(serverAllowed) && serverAllowed.length) return serverAllowed;
  const from = canonicalStatus(current);
  const byRole = ROLE_ALLOWED_STATUSES[String(role || "").toLowerCase()] || [];
  return (STATUS_TRANSITIONS[from] || []).filter((s) => byRole.includes(s));
}

export const CASE_PRIORITIES = ["normal", "high", "urgent"];

export const PRIORITY_LABEL_KEY = {
  normal: "labCase.priority.normal",
  high: "labCase.priority.high",
  urgent: "labCase.priority.urgent",
};

export const PRIORITY_BADGE = {
  normal: "bg-gray-100 text-gray-600 border-gray-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  urgent: "bg-red-100 text-red-700 border-red-200",
};

export const OPEN_CANONICAL = [
  "requested", "accepted", "in_production", "qc", "ready", "dispatched", "received",
];

/**
 * Prefer the server's `overdue` — it is computed against the CLINIC timezone,
 * whereas the browser only knows its own. This is the fallback for rows that
 * predate the flag.
 */
export function isOverdue(labCase, todayISO) {
  if (typeof labCase?.overdue === "boolean") return labCase.overdue;
  const due = String(labCase?.dueDate || "").trim();
  if (!due || !todayISO) return false;
  if (!OPEN_CANONICAL.includes(canonicalStatus(labCase?.status))) return false;
  return due < todayISO;
}

/** FDI teeth, shared with the odontogram. */
export const isValidTooth = (t) => /^[1-4][1-8]$/.test(String(t || "").trim());
