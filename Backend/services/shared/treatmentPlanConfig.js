/**
 * Treatment-plan status sets + transitions — the single source of truth,
 * mirrored (not re-derived) by Frontend/src/lib/treatmentPlanConfig.js in the
 * same backend-authoritative pattern as appointmentConfig.js.
 */

// ── Plan status ──────────────────────────────────────────────────────────────
// draft              — being assembled, not shown to the patient yet
// proposed           — presented, awaiting decisions
// partially_accepted — some accepted, some declined
// accepted           — every item accepted
// declined           — every item declined
// in_progress        — at least one accepted item scheduled/underway
// completed          — every accepted item completed
// cancelled          — abandoned
export const PLAN_STATUSES = Object.freeze([
  "draft",
  "proposed",
  "partially_accepted",
  "accepted",
  "declined",
  "in_progress",
  "completed",
  "cancelled",
]);

// ── Item status ──────────────────────────────────────────────────────────────
export const ITEM_STATUSES = Object.freeze([
  "proposed",
  "accepted",
  "declined",
  "scheduled",
  "in_progress",
  "completed",
]);

/**
 * Item lifecycle. `declined` is reversible so a mis-click can be corrected;
 * `completed` is terminal.
 */
export const ITEM_TRANSITIONS = Object.freeze({
  proposed:    ["accepted", "declined"],
  accepted:    ["scheduled", "in_progress", "declined"],
  declined:    ["proposed"],
  scheduled:   ["in_progress", "completed", "accepted"], // back to accepted = unschedule
  in_progress: ["completed", "scheduled"],
  completed:   [],
});

export const canTransitionItem = (from, to) => {
  const f = String(from || "proposed");
  const t = String(to || "");
  if (f === t) return true;
  return (ITEM_TRANSITIONS[f] || []).includes(t);
};

export const allowedNextItemStatuses = (from) => ITEM_TRANSITIONS[String(from || "proposed")] || [];

/** Items that still represent unearned, at-risk revenue (for later reporting). */
export const OPEN_ITEM_STATUSES = Object.freeze(["proposed", "accepted", "scheduled", "in_progress"]);

/**
 * Plan status DERIVED from its items — the plan never carries a status that
 * contradicts its lines.
 *
 * `cancelled` is fully sticky: abandoning a plan is deliberate and an item
 * edit must not silently revive it.
 *
 * `draft` is sticky only while EVERY item is still `proposed` — that is what a
 * draft is: lines being assembled, nothing decided. The moment the patient
 * accepts or declines a line the plan has demonstrably been presented, so it
 * derives normally. Without this a plan created as a draft could never leave
 * draft through the item actions the UI actually offers.
 */
export function derivePlanStatus(currentStatus, items = []) {
  if (currentStatus === "cancelled") return currentStatus;

  if (currentStatus === "draft") {
    const allUndecided = items.every((i) => String(i.status || "proposed") === "proposed");
    if (allUndecided) return "draft";
  }

  if (!items.length) return currentStatus === "proposed" ? "proposed" : currentStatus;

  const s = items.map((i) => String(i.status || "proposed"));
  const decided = s.filter((x) => x !== "proposed");
  const live = s.filter((x) => x !== "declined" && x !== "proposed");

  if (s.every((x) => x === "declined")) return "declined";
  if (live.length && live.every((x) => x === "completed")) return "completed";
  if (s.some((x) => x === "scheduled" || x === "in_progress" || x === "completed")) return "in_progress";
  if (decided.length === 0) return "proposed";
  if (s.every((x) => x === "accepted" || x === "declined")) {
    return s.some((x) => x === "declined") ? "partially_accepted" : "accepted";
  }
  return "partially_accepted";
}
