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

// ── Derived views over plans (no stored state) ──────────────────────────────

/** Item states that represent work agreed but not yet done. */
export const PLANNED_ITEM_STATUSES = ["accepted", "scheduled", "in_progress"];

/**
 * Per-tooth treatment overlay for the odontogram: { "11": "planned" | "completed" }.
 *
 * DERIVED on read — never stored, and never written into Patient.odontogram.
 * The charted condition (caries/filled/…) stays exactly as the dentist
 * recorded it; this is a second, independent channel drawn on top.
 * "completed" wins over "planned" when a tooth carries both.
 */
export function toothPlanOverlay(plans = []) {
  const overlay = {};
  for (const plan of plans || []) {
    for (const item of plan?.items || []) {
      const teeth = Array.isArray(item.toothNumbers) ? item.toothNumbers : [];
      if (!teeth.length) continue;
      const kind =
        item.status === "completed" ? "completed"
          : PLANNED_ITEM_STATUSES.includes(item.status) ? "planned"
          : null;
      if (!kind) continue; // proposed / declined are not on the chart
      for (const tooth of teeth) {
        if (overlay[tooth] === "completed") continue; // completed outranks planned
        overlay[tooth] = kind;
      }
    }
  }
  return overlay;
}

/**
 * Groups a plan's items by phase, ascending, with a per-phase subtotal.
 * Legacy items carry no phase and are read as phase 1 by the server.
 */
export function groupItemsByPhase(items = []) {
  const byPhase = new Map();
  for (const item of items || []) {
    const phase = Math.max(1, Number(item.phase) || 1);
    if (!byPhase.has(phase)) byPhase.set(phase, []);
    byPhase.get(phase).push(item);
  }
  return [...byPhase.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([phase, rows]) => ({
      phase,
      items: rows,
      subtotal: rows.reduce((s, i) => s + (Number(i.lineTotal) || 0), 0),
    }));
}

/**
 * Plan items eligible to prefill a visit: agreed but not yet carried out.
 * `appointmentId` promotes items booked onto THAT visit to the front — the
 * rest are still returned (flagged) so nothing silently disappears.
 */
export function planItemsForVisit(plans = [], appointmentId = "") {
  const rows = [];
  for (const plan of plans || []) {
    for (const item of plan?.items || []) {
      if (!PLANNED_ITEM_STATUSES.includes(item.status)) continue;
      rows.push({
        planId: plan.id,
        itemId: item.id,
        name: item.name,
        toothNumbers: Array.isArray(item.toothNumbers) ? item.toothNumbers : [],
        phase: Math.max(1, Number(item.phase) || 1),
        status: item.status,
        forThisVisit: !!appointmentId && item.linkedAppointmentId === appointmentId,
      });
    }
  }
  // Items booked onto this appointment first, then by phase.
  return rows.sort((a, b) =>
    Number(b.forThisVisit) - Number(a.forThisVisit) || a.phase - b.phase
  );
}
