// Frontend mirror of Backend/services/shared/appointmentConfig.js.
// Keep the two in sync — the backend remains the authority (it validates and
// enforces transitions); this exists so the UI can render options and disable
// illegal actions without a round-trip.

export const APPOINTMENT_TYPES = [
  "consultation",
  "checkup",
  "cleaning",
  "filling",
  "rct",
  "extraction",
  "crown_fitting",
  "follow_up",
  "emergency",
];

export const APPOINTMENT_STATUSES = [
  "requested",
  "confirmed",
  "arrived",
  "waiting",
  "in_treatment",
  "completed",
  "cancelled",
  "rescheduled",
  "no_show",
];

// Legacy db values still present on older appointments.
const LEGACY_STATUS_ALIASES = { scheduled: "confirmed", checked_in: "arrived" };

/** Legacy value, humanised label, or canonical → canonical. */
export function canonicalStatus(v) {
  const s = String(v || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (LEGACY_STATUS_ALIASES[s]) return LEGACY_STATUS_ALIASES[s];
  if (APPOINTMENT_STATUSES.includes(s)) return s;
  if (s === "canceled") return "cancelled";
  return "confirmed";
}

export const ALLOWED_APPOINTMENT_TRANSITIONS = {
  requested:    ["confirmed", "cancelled", "rescheduled", "no_show"],
  confirmed:    ["arrived", "waiting", "cancelled", "rescheduled", "no_show"],
  arrived:      ["waiting", "in_treatment", "cancelled", "no_show"],
  waiting:      ["in_treatment", "cancelled", "no_show"],
  in_treatment: ["completed", "cancelled"],
  // Reopen — server re-checks the slot and 409s if it is no longer free.
  completed:    ["confirmed"],
  cancelled:    ["confirmed", "rescheduled"],
  rescheduled:  ["confirmed", "cancelled"],
  no_show:      ["confirmed", "rescheduled"],
};

export const allowedNextStatuses = (current) =>
  ALLOWED_APPOINTMENT_TRANSITIONS[canonicalStatus(current)] || [];

// i18n keys — labels are translated, values never are.
export const statusKey = (v) => `appointments.status.${canonicalStatus(v)}`;
export const typeKey = (v) => `appointments.type.${String(v || "").trim().toLowerCase()}`;

/** Badge styling per canonical status. Terminal/exception states read
 *  distinctly from the normal forward lifecycle. */
export const STATUS_BADGE_CLASS = {
  requested:    "bg-slate-100 text-slate-700 border-slate-200",
  confirmed:    "bg-blue-50 text-blue-700 border-blue-200",
  arrived:      "bg-cyan-50 text-cyan-700 border-cyan-200",
  waiting:      "bg-amber-50 text-amber-800 border-amber-200",
  in_treatment: "bg-violet-50 text-violet-700 border-violet-200",
  completed:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled:    "bg-red-50 text-red-700 border-red-200 line-through",
  rescheduled:  "bg-orange-50 text-orange-700 border-orange-200 italic",
  no_show:      "bg-zinc-200 text-zinc-700 border-zinc-300 line-through",
};

export const statusBadgeClass = (v) =>
  STATUS_BADGE_CLASS[canonicalStatus(v)] || STATUS_BADGE_CLASS.confirmed;
