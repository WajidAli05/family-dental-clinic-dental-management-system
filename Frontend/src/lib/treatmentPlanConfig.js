/**
 * Frontend MIRROR of Backend/services/shared/treatmentPlanConfig.js.
 * The backend is authoritative — this exists only so the UI can label and
 * order things without a round-trip. Status derivation is NOT duplicated here;
 * the server sends the derived plan status and each item's `allowedNext`.
 */
export const PLAN_STATUSES = [
  "draft", "proposed", "partially_accepted", "accepted",
  "declined", "in_progress", "completed", "cancelled",
];

export const ITEM_STATUSES = [
  "proposed", "accepted", "declined", "scheduled", "in_progress", "completed",
];

export const planStatusKey = (v) => `treatmentPlans.planStatus.${String(v || "draft")}`;
export const itemStatusKey = (v) => `treatmentPlans.itemStatus.${String(v || "proposed")}`;

const PLAN_BADGE = {
  draft:              "bg-gray-100 text-gray-700 border-gray-200",
  proposed:           "bg-blue-100 text-blue-700 border-blue-200",
  partially_accepted: "bg-amber-100 text-amber-700 border-amber-200",
  accepted:           "bg-emerald-100 text-emerald-700 border-emerald-200",
  declined:           "bg-red-100 text-red-700 border-red-200",
  in_progress:        "bg-indigo-100 text-indigo-700 border-indigo-200",
  completed:          "bg-teal-100 text-teal-700 border-teal-200",
  cancelled:          "bg-gray-200 text-gray-600 border-gray-300",
};

const ITEM_BADGE = {
  proposed:    "bg-blue-50 text-blue-700 border-blue-200",
  accepted:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  declined:    "bg-red-50 text-red-700 border-red-200",
  scheduled:   "bg-indigo-50 text-indigo-700 border-indigo-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  completed:   "bg-teal-50 text-teal-700 border-teal-200",
};

export const planBadgeClass = (v) => PLAN_BADGE[String(v)] || PLAN_BADGE.draft;
export const itemBadgeClass = (v) => ITEM_BADGE[String(v)] || ITEM_BADGE.proposed;
