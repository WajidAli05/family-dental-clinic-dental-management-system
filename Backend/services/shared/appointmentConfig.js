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
  // REOPEN: a finished/cancelled visit can be put back on the books. Both are
  // slot-FREEING statuses, so re-entering `confirmed` re-occupies the slot —
  // updateAppointmentStatusCore re-runs assertNoSlotConflict for exactly this
  // case and rejects with 409 if someone else took the time meanwhile.
  // Deliberately narrow: reopen only ever lands on `confirmed`, never back to
  // requested/in_treatment, so history can't be rewritten.
  completed:    ["confirmed"],
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

// ── Slot occupancy — THE authority for double-booking checks ────────────────
// A dentist's date+time slot is held only while the visit is still live.
//   OCCUPYING : requested, confirmed, arrived, waiting, in_treatment
//   FREEING   : completed, cancelled, rescheduled, no_show
// `completed` frees the slot deliberately: the visit is finished, so the time
// is available to book again. Everything else that ends a visit (cancelled /
// rescheduled / no_show) frees it too.
export const SLOT_OCCUPYING_CANONICAL = Object.freeze([
  "requested", "confirmed", "arrived", "waiting", "in_treatment",
]);

/** Every STORED value (incl. legacy scheduled/checked_in) that holds a slot.
 *  Use directly in queries: `status: { $in: SLOT_OCCUPYING_STATUSES }`. */
export const SLOT_OCCUPYING_STATUSES = Object.freeze(
  ALL_STORED_STATUSES.filter((s) => SLOT_OCCUPYING_CANONICAL.includes(canonicalStatus(s)))
);

/** True when this status holds the dentist's time slot. */
export const occupiesSlot = (v) => SLOT_OCCUPYING_CANONICAL.includes(canonicalStatus(v));

// Derived complement — kept so existing importers keep working and can never
// drift from the occupancy rule above.
export const NON_BLOCKING_STATUSES = Object.freeze(
  APPOINTMENT_STATUSES.filter((s) => !SLOT_OCCUPYING_CANONICAL.includes(s))
);

export const NON_BLOCKING_STORED_STATUSES = Object.freeze(
  ALL_STORED_STATUSES.filter((s) => !occupiesSlot(s))
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
