/**
 * Lab-case notifications.
 *
 * Reuses the EXISTING Notification model (the one lockout alerts write to) —
 * no new model, table or delivery channel. In-app only, so the Phase-2
 * automation engine can later write into exactly the same place.
 *
 * MESSAGES ARE i18n KEYS, NOT PROSE. `title`/`message` hold the key and the
 * params live in `meta.i18n`, so the bell renders in the reader's language
 * rather than the language of whoever triggered the event. `title`/`message`
 * are still populated with readable English so any consumer that does not
 * translate (or an older client) degrades gracefully instead of showing a key.
 *
 * PHI: only the case id, sample type and lab/dentist names travel. Never the
 * patient name or the encrypted instructions — a lab has no need for either.
 */

import Notification from "../../models/Notification.model.js";
import LabCase from "../../models/LabCase.model.js";
import { canonicalStatus, dueState } from "./labCaseConfig.js";

/** Notification `type` values. Kept narrow so the bell can group them. */
export const LAB_CASE_NOTIFICATION_TYPES = Object.freeze({
  ASSIGNED: "labcase_assigned",
  READY: "labcase_ready",
  DISPATCHED: "labcase_dispatched",
  DECIDED: "labcase_decided",
  OVERDUE: "labcase_overdue",
});

const EN = {
  labcase_assigned: (p) => `New lab case ${p.caseId} (${p.type}) has been sent to you.`,
  labcase_ready: (p) => `Lab case ${p.caseId} is ready at ${p.labName}.`,
  labcase_dispatched: (p) => `Lab case ${p.caseId} has been dispatched by ${p.labName}.`,
  labcase_decided: (p) => `Lab case ${p.caseId} was ${p.status} by ${p.dentistName}.`,
  labcase_overdue: (p) => `Lab case ${p.caseId} is overdue (due ${p.dueDate}).`,
};

const EN_TITLE = {
  labcase_assigned: "New Lab Case",
  labcase_ready: "Lab Case Ready",
  labcase_dispatched: "Lab Case Dispatched",
  labcase_decided: "Lab Case Decision",
  labcase_overdue: "Lab Case Overdue",
};

/**
 * Writes one notification. Never throws into the caller: a notification is a
 * side effect of the real action, and failing to notify must not roll back a
 * status change that already succeeded.
 */
async function notify(recipientId, type, params, extraMeta = {}) {
  if (!recipientId) return null;
  try {
    return await Notification.create({
      recipientId,
      type,
      title: EN_TITLE[type] || "Lab Case",
      message: (EN[type] || (() => ""))(params),
      meta: {
        ...extraMeta,
        caseId: params.caseId,
        // The bell prefers these and falls back to `title`/`message`.
        i18n: { titleKey: `notifications.${type}.title`, messageKey: `notifications.${type}.message`, params },
      },
    });
  } catch {
    return null;
  }
}

/** A case was created/assigned → tell the LAB it landed on. */
export async function notifyCaseAssigned(caseDoc, { labUserId, sampleTypeName = "" } = {}) {
  return notify(labUserId || caseDoc?.lab, LAB_CASE_NOTIFICATION_TYPES.ASSIGNED, {
    caseId: caseDoc?.publicId,
    type: sampleTypeName || "lab case",
  });
}

/**
 * Routes a status change to whoever actually needs to know.
 *
 *   lab marks ready/dispatched  → the DENTIST who owns the case
 *   dentist approves/rejects    → the LAB
 *
 * Other transitions are intentionally silent: notifying on every step would
 * make the bell useless.
 */
export async function notifyStatusChange(caseDoc, { actorRole, labName = "", dentistName = "" } = {}) {
  const status = canonicalStatus(caseDoc?.status);
  const T = LAB_CASE_NOTIFICATION_TYPES;

  if (actorRole === "lab" && (status === "ready" || status === "dispatched")) {
    return notify(
      caseDoc.dentist,
      status === "ready" ? T.READY : T.DISPATCHED,
      { caseId: caseDoc.publicId, labName: labName || "the lab" },
      { status }
    );
  }

  if (actorRole === "dentist" && (status === "approved" || status === "rejected")) {
    return notify(
      caseDoc.lab,
      T.DECIDED,
      { caseId: caseDoc.publicId, status, dentistName: dentistName || "the dentist" },
      { status }
    );
  }

  return null;
}

/**
 * OVERDUE — derived on READ, with no scheduler.
 *
 * WHY NO CRON: a scheduled automation engine is a later phase. Instead, every
 * time a case list is loaded we already hold the rows and the clinic's today,
 * so overdue is computed from data we have in hand. A case nobody ever looks
 * at generates no notification — acceptable, because the notification exists
 * to prompt a person who is already using the app.
 *
 * DE-DUPLICATION: one notification per (recipient, case, dueDate). The
 * dueDate is part of the key so that if the due date is later revised and
 * missed again, that IS a new event and notifies once more. The check is a
 * countDocuments against meta.caseId + meta.dueDate before inserting, so the
 * same overdue case can never spam on repeated list loads.
 *
 * Bounded: at most MAX_PER_SWEEP inserts per call, so loading a list with a
 * large backlog cannot stall the request.
 */
const MAX_PER_SWEEP = 20;

export async function sweepOverdueNotifications(rows, todayISO, { recipient = "dentist" } = {}) {
  if (!Array.isArray(rows) || !rows.length || !todayISO) return 0;

  const overdue = rows
    .filter((c) => dueState(c.dueDate, c.status, todayISO) === "overdue")
    .slice(0, MAX_PER_SWEEP);
  if (!overdue.length) return 0;

  let created = 0;
  for (const c of overdue) {
    const recipientId = recipient === "lab" ? c.lab : c.dentist;
    if (!recipientId) continue;

    // De-dup key: this recipient, this case, this due date.
    const exists = await Notification.countDocuments({
      recipientId,
      type: LAB_CASE_NOTIFICATION_TYPES.OVERDUE,
      "meta.caseId": c.publicId,
      "meta.dueDate": c.dueDate,
    });
    if (exists) continue;

    await notify(
      recipientId,
      LAB_CASE_NOTIFICATION_TYPES.OVERDUE,
      { caseId: c.publicId, dueDate: c.dueDate },
      { dueDate: c.dueDate }
    );
    created++;
  }
  return created;
}

/** Re-reads the minimal fields a sweep needs, for callers holding mapped rows. */
export async function sweepOverdueForCaseIds(caseIds, todayISO, opts) {
  if (!Array.isArray(caseIds) || !caseIds.length) return 0;
  const rows = await LabCase.find({ publicId: { $in: caseIds } })
    .select("publicId status dueDate dentist lab")
    .lean();
  return sweepOverdueNotifications(rows, todayISO, opts);
}
