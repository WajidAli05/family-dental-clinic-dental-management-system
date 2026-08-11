// Single source of truth for appointment TYPES and the status LIFECYCLE.
// Imported by the model, the shared appointment service, and every role
// service — nothing may hardcode these lists.

// ── Appointment types ────────────────────────────────────────────────────────
// AUGMENTS the existing free-text `reason` field, it does not replace it:
//   appointmentType — structured category (filterable, reportable, i18n'd)
//   reason          — free-text detail for this specific visit
export const APPOINTMENT_TYPES = Object.freeze([
  "consultation",
  "checkup",
  "cleaning",
  "filling",
  "rct",
  "extraction",
  "crown_fitting",
  "follow_up",
  "emergency",
]);

export const isAppointmentType = (v) => APPOINTMENT_TYPES.includes(String(v || "").trim().toLowerCase());

/** "" for absent/invalid — the field is optional and backward-compatible. */
export const normalizeAppointmentType = (v) => {
  const s = String(v || "").trim().toLowerCase();
  return isAppointmentType(s) ? s : "";
};

// ── Status lifecycle ─────────────────────────────────────────────────────────
// Canonical statuses written by new code.
export const APPOINTMENT_STATUSES = Object.freeze([
  "requested",
  "confirmed",
  "arrived",
  "waiting",
  "in_treatment",
  "completed",
  "cancelled",
  "rescheduled",
  "no_show",
]);

// LEGACY values that still exist in the database. They remain valid enum
// members on the model so existing documents never fail validation and no
// migration is required; everything reading/writing goes through
// canonicalStatus() so they behave exactly like their modern equivalent.
export const LEGACY_STATUS_ALIASES = Object.freeze({
  scheduled: "confirmed",
  checked_in: "arrived",
});

/** Every value the `status` field may legally hold (new + legacy). */
export const ALL_STORED_STATUSES = Object.freeze([
  ...APPOINTMENT_STATUSES,
  ...Object.keys(LEGACY_STATUS_ALIASES),
]);

/** Legacy or canonical → canonical. Unknown/empty → "confirmed". */
export function canonicalStatus(v) {
  const s = String(v || "").trim().toLowerCase().replace(/\s+/g, "_");
  if (LEGACY_STATUS_ALIASES[s]) return LEGACY_STATUS_ALIASES[s];
  if (APPOINTMENT_STATUSES.includes(s)) return s;
  if (s === "canceled") return "cancelled";
  return "confirmed";
}

// Forward lifecycle plus the exits available at each stage. Terminal states
// allow a limited re-open so a mistake can be corrected.
export const ALLOWED_APPOINTMENT_TRANSITIONS = Object.freeze({
  requested:    ["confirmed", "cancelled", "rescheduled", "no_show"],
  confirmed:    ["arrived", "waiting", "cancelled", "rescheduled", "no_show"],
  arrived:      ["waiting", "in_treatment", "cancelled", "no_show"],
  waiting:      ["in_treatment", "cancelled", "no_show"],
  in_treatment: ["completed", "cancelled"],
  completed:    [],                            // terminal — no completed→requested
  cancelled:    ["confirmed", "rescheduled"],
  rescheduled:  ["confirmed", "cancelled"],
  no_show:      ["confirmed", "rescheduled"],
});

/** Canonical next-states for a (possibly legacy) current status. */
export function allowedNextStatuses(current) {
  return ALLOWED_APPOINTMENT_TRANSITIONS[canonicalStatus(current)] || [];
}

export function canTransition(from, to) {
  const f = canonicalStatus(from);
  const t = canonicalStatus(to);
  if (f === t) return true; // idempotent re-set is always fine
  return (ALLOWED_APPOINTMENT_TRANSITIONS[f] || []).includes(t);
}

// Statuses that do NOT occupy a dentist's slot — used by double-booking checks
// so a cancelled/rescheduled/no-show visit frees its time.
export const NON_BLOCKING_STATUSES = Object.freeze(["cancelled", "rescheduled", "no_show"]);

/** Every stored value that maps to a non-blocking canonical status. */
export const NON_BLOCKING_STORED_STATUSES = Object.freeze(
  ALL_STORED_STATUSES.filter((s) => NON_BLOCKING_STATUSES.includes(canonicalStatus(s)))
);

// Human labels for server-rendered/humanised contexts. The frontend
// translates via i18n (appointments.status.*) — these are the fallback.
const STATUS_LABELS = Object.freeze({
  requested:    "Requested",
  confirmed:    "Confirmed",
  arrived:      "Arrived",
  waiting:      "Waiting",
  in_treatment: "In Treatment",
  completed:    "Completed",
  cancelled:    "Cancelled",
  rescheduled:  "Rescheduled",
  no_show:      "No Show",
});

export const statusLabel = (v) => STATUS_LABELS[canonicalStatus(v)] || "Confirmed";
