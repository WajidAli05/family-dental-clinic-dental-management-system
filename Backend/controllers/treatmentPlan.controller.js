import {
  createPlan,
  listPlansForPatient,
  getPlan,
  updatePlan,
  setPlanFeeSchedule,
  addPlanItem,
  updatePlanItem,
  removePlanItem,
  setPlanItemStatus,
  decideWholePlan,
  softDeletePlan,
  getPlanPatientPublicId,
  listLinkableAppointments,
  scheduleItemWithNewAppointment,
} from "../services/shared/treatmentPlans.js";
import { listFeeSchedules } from "../services/shared/feeSchedules.js";
import { getActiveTreatments } from "../services/shared/catalog.js";
import { assertDentistCanEditChart } from "../services/dentist.service.js";
import { recordAudit } from "../services/shared/audit.js";

/**
 * WRITE GATE — one helper behind every mutating route.
 *
 *   owner        → unrestricted
 *   dentist      → only for a patient they have an appointment with, via
 *                  assertDentistCanEditChart (the SAME appointment-based rule
 *                  that governs the odontogram and prescriptions)
 *   receptionist → never (clinical data is read-only for the front desk)
 *
 * Authoritative server-side; the UI mirrors it but cannot bypass it.
 */
async function assertCanEditPlanFor(req, patientPublicId) {
  const role = req.user?.role;
  if (role === "owner") return;
  if (role === "dentist") {
    await assertDentistCanEditChart(req.user._id, patientPublicId);
    return;
  }
  throw Object.assign(
    new Error("You do not have permission to modify treatment plans"),
    { status: 403 }
  );
}

/** Same gate, resolving the patient from the plan itself. */
async function assertCanEditPlan(req, planPublicId) {
  await assertCanEditPlanFor(req, await getPlanPatientPublicId(planPublicId));
}

const fail = (res, e) =>
  res.status(e.status || 400).json({ success: false, message: e.message, code: e.code });

// ── Reads (owner, dentist, receptionist) ────────────────────────────────────
export const listPatientTreatmentPlans = async (req, res) => {
  try {
    const { page, limit, sortBy, sortDir } = req.query;
    const r = await listPlansForPatient(req.params.patientId, { page, limit, sortBy, sortDir });
    return res.json({ success: true, data: r.rows, total: r.total, page: r.page, pages: r.pages });
  } catch (e) { return fail(res, e); }
};

export const getTreatmentPlan = async (req, res) => {
  try {
    return res.json({ success: true, data: await getPlan(req.params.id) });
  } catch (e) { return fail(res, e); }
};

/** Price lists a plan can be quoted from (default flagged). */
export const getPlanFeeSchedules = async (_req, res) => {
  try {
    return res.json({ success: true, data: await listFeeSchedules() });
  } catch (e) { return fail(res, e); }
};

/** Priced catalogue for the item picker — `scheduleId` prices it via the resolver. */
export const getPlanCatalogTreatments = async (req, res) => {
  try {
    const { page, limit, scheduleId } = req.query;
    const r = await getActiveTreatments({ page, limit, scheduleId });
    return res.json({ success: true, data: r.rows, total: r.total, page: r.page, pages: r.pages });
  } catch (e) { return fail(res, e); }
};

/** Appointments an accepted item can be scheduled into (active ones only). */
export const getLinkableAppointments = async (req, res) => {
  try {
    return res.json({ success: true, data: await listLinkableAppointments(req.params.patientId) });
  } catch (e) { return fail(res, e); }
};

// ── Plan writes ─────────────────────────────────────────────────────────────
export const createTreatmentPlan = async (req, res) => {
  try {
    const patientPublicId = String(req.body?.patientId || "").trim();
    await assertCanEditPlanFor(req, patientPublicId);

    const data = await createPlan({
      patientPublicId,
      dentistId: req.user._id,
      feeScheduleId: req.body?.feeScheduleId,
      title: req.body?.title,
      notes: req.body?.notes,
    });
    // Ids and counts only — never the encrypted clinical notes.
    await recordAudit({ req, action: "treatmentplan.create", entityType: "TreatmentPlan", entityId: data.id, entityLabel: data.id, after: { patientId: data.patientId, feeScheduleId: data.feeScheduleId, status: data.status } });
    return res.json({ success: true, data });
  } catch (e) { return fail(res, e); }
};

export const updateTreatmentPlan = async (req, res) => {
  try {
    await assertCanEditPlan(req, req.params.id);
    const data = await updatePlan(req.params.id, req.body || {});
    await recordAudit({ req, action: "treatmentplan.update", entityType: "TreatmentPlan", entityId: data.id, entityLabel: data.id, after: { status: data.status, itemCount: data.items.length } });
    return res.json({ success: true, data });
  } catch (e) { return fail(res, e); }
};

export const setTreatmentPlanFeeSchedule = async (req, res) => {
  try {
    await assertCanEditPlan(req, req.params.id);
    const data = await setPlanFeeSchedule(req.params.id, req.body?.feeScheduleId);
    await recordAudit({ req, action: "treatmentplan.update", entityType: "TreatmentPlan", entityId: data.id, entityLabel: data.id, after: { feeScheduleId: data.feeScheduleId } });
    return res.json({ success: true, data });
  } catch (e) { return fail(res, e); }
};

export const deleteTreatmentPlan = async (req, res) => {
  try {
    await assertCanEditPlan(req, req.params.id);
    const data = await softDeletePlan(req.params.id);
    await recordAudit({ req, action: "treatmentplan.delete", entityType: "TreatmentPlan", entityId: data.id, entityLabel: data.id, after: { softDeleted: true } });
    return res.json({ success: true, data });
  } catch (e) { return fail(res, e); }
};

// ── Item writes ─────────────────────────────────────────────────────────────
export const addTreatmentPlanItem = async (req, res) => {
  try {
    await assertCanEditPlan(req, req.params.id);
    const data = await addPlanItem(req.params.id, req.body || {});
    const added = data.items[data.items.length - 1];
    await recordAudit({ req, action: "treatmentplan.update", entityType: "TreatmentPlan", entityId: data.id, entityLabel: data.id, after: { itemAdded: added?.id, treatmentId: added?.treatmentId, teeth: added?.toothNumbers, unitFee: added?.unitFee, quantity: added?.quantity, feeScheduleId: data.feeScheduleId } });
    return res.json({ success: true, data });
  } catch (e) { return fail(res, e); }
};

export const updateTreatmentPlanItem = async (req, res) => {
  try {
    await assertCanEditPlan(req, req.params.id);
    const data = await updatePlanItem(req.params.id, req.params.itemId, req.body || {});
    await recordAudit({ req, action: "treatmentplan.update", entityType: "TreatmentPlan", entityId: data.id, entityLabel: data.id, after: { itemId: req.params.itemId } });
    return res.json({ success: true, data });
  } catch (e) { return fail(res, e); }
};

export const removeTreatmentPlanItem = async (req, res) => {
  try {
    await assertCanEditPlan(req, req.params.id);
    const data = await removePlanItem(req.params.id, req.params.itemId);
    await recordAudit({ req, action: "treatmentplan.update", entityType: "TreatmentPlan", entityId: data.id, entityLabel: data.id, after: { itemRemoved: req.params.itemId } });
    return res.json({ success: true, data });
  } catch (e) { return fail(res, e); }
};

/**
 * accept / decline / schedule / in_progress / complete.
 * Acceptance decisions are audited under a DISTINCT action — they are the
 * signal later revenue-at-risk reporting keys off.
 */
export const setTreatmentPlanItemStatus = async (req, res) => {
  try {
    await assertCanEditPlan(req, req.params.id);
    const status = String(req.body?.status || "").trim();
    const data = await setPlanItemStatus(req.params.id, req.params.itemId, status, {
      appointmentId: req.body?.appointmentId,
    });
    const item = data.items.find((i) => i.id === req.params.itemId);

    const isDecision = status === "accepted" || status === "declined";
    await recordAudit({
      req,
      action: isDecision ? "treatmentplan.item_decision" : "treatmentplan.item_status",
      entityType: "TreatmentPlan", entityId: data.id, entityLabel: data.id,
      after: {
        itemId: req.params.itemId,
        status,
        // Money is business data, not PHI — it is what recovery reporting needs.
        lineTotal: item?.lineTotal,
        linkedAppointmentId: item?.linkedAppointmentId || "",
        planStatus: data.status,
      },
    });
    return res.json({ success: true, data });
  } catch (e) { return fail(res, e); }
};


/**
 * PATH B — book a new appointment AND schedule the item onto it.
 *
 * A dentist books onto their own diary (forceDentistId), matching how
 * dentistCreateAppointment works; the owner picks any dentist. Slot conflicts
 * and past dates are enforced inside the shared booking core, so a stale
 * client cannot bypass either.
 */
export const scheduleItemWithNewAppointmentCtrl = async (req, res) => {
  try {
    await assertCanEditPlan(req, req.params.id);

    const isDentist = req.user?.role === "dentist";
    const { plan, appointment } = await scheduleItemWithNewAppointment(
      req.params.id,
      req.params.itemId,
      req.body || {},
      { forceDentistId: isDentist ? req.user._id : undefined }
    );

    const item = plan.items.find((i) => i.id === req.params.itemId);
    // Two things happened — audit both, with no PHI (no reason/notes text).
    await recordAudit({ req, action: "appointment.create", entityType: "Appointment", entityId: appointment.id, entityLabel: appointment.id, after: { date: appointment.date, time: appointment.time, status: appointment.status, viaTreatmentPlan: plan.id } });
    await recordAudit({
      req, action: "treatmentplan.item_status", entityType: "TreatmentPlan", entityId: plan.id, entityLabel: plan.id,
      after: { itemId: req.params.itemId, status: "scheduled", lineTotal: item?.lineTotal, linkedAppointmentId: appointment.id, bookedNewAppointment: true, planStatus: plan.status },
    });

    return res.json({ success: true, data: { plan, appointment } });
  } catch (e) { return fail(res, e); }
};

export const decideTreatmentPlan = async (req, res) => {
  try {
    await assertCanEditPlan(req, req.params.id);
    const decision = String(req.body?.decision || "").trim();
    const data = await decideWholePlan(req.params.id, decision);
    await recordAudit({ req, action: "treatmentplan.item_decision", entityType: "TreatmentPlan", entityId: data.id, entityLabel: data.id, after: { decision, planStatus: data.status, acceptedTotal: data.acceptedTotal } });
    return res.json({ success: true, data });
  } catch (e) { return fail(res, e); }
};
