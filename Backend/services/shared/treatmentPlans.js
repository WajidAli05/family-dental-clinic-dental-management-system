import TreatmentPlan from "../../models/TreatmentPlan.model.js";
import Patient from "../../models/Patient.model.js";
import Appointment from "../../models/Appointment.model.js";
import { getNextSequence } from "./counters.js";
import { parsePagination, paginateArray, buildSort } from "./paginate.js";
import {
  ensureFeeSchedules,
  defaultScheduleIdFrom,
  getTreatmentFee,
  listFeeSchedules,
} from "./feeSchedules.js";
import { FDI_TEETH } from "./patients.js";
import { SLOT_OCCUPYING_STATUSES, canonicalStatus } from "./appointmentConfig.js";
import {
  canTransitionItem,
  allowedNextItemStatuses,
  derivePlanStatus,
} from "./treatmentPlanConfig.js";
import { encryptField, decryptField } from "../../utils/fieldEncryption.js";

/**
 * Treatment plans — ONE implementation shared by the owner, dentist and
 * receptionist endpoints. This repo has repeatedly grown divergent per-service
 * copies of the same mapper; plans carry prices, so a second copy that drifts
 * would quote patients different numbers depending on who opened the screen.
 *
 * LINE-ITEM MATH LIVES HERE, not in billing.js. billing.js is the invoice
 * aggregation module (revenue / outstanding / status) and plans are
 * quoting-only — they are deliberately NOT wired to invoices yet. Putting a
 * plan-total helper there would add invoice-module surface with no invoice
 * consumer. If plan → invoice conversion lands later, that is the moment to
 * promote `sumLineItems` into billing.js — not before.
 */

const clean = (v) => String(v ?? "").trim();
const money = (v) => Math.max(0, Number(v) || 0);

// ── Line-item math (the only place it exists) ───────────────────────────────
export const lineTotal = (item) => money(item?.unitFee) * Math.max(1, Number(item?.quantity) || 1);
export const sumLineItems = (items = []) =>
  (Array.isArray(items) ? items : []).reduce((sum, i) => sum + lineTotal(i), 0);

// ── ids ─────────────────────────────────────────────────────────────────────
async function nextPlanPublicId() {
  const seq = await getNextSequence("treatmentplan", async () => {
    const rows = await TreatmentPlan.find({})
      .setOptions({ includeDeleted: true }) // never reissue a retired number
      .select("publicId")
      .lean();
    let max = 0;
    for (const r of rows) {
      const m = /^TP-(\d+)$/.exec(String(r.publicId || ""));
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return max;
  });
  return `TP-${String(seq).padStart(4, "0")}`;
}

const nextItemId = (items = []) => {
  let max = 0;
  for (const i of items) {
    const m = /^TPI-(\d+)$/.exec(String(i?.id || ""));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `TPI-${max + 1}`;
};

// ── validation ──────────────────────────────────────────────────────────────
function normaliseTeeth(input) {
  const arr = Array.isArray(input) ? input : [];
  const out = [];
  for (const raw of arr) {
    const t = clean(raw);
    if (!t) continue;
    if (!FDI_TEETH.includes(t)) {
      throw Object.assign(new Error(`Invalid tooth number: ${t}`), { status: 400 });
    }
    if (!out.includes(t)) out.push(t);
  }
  return out;
}

// ── THE shared mapper ───────────────────────────────────────────────────────
/**
 * Every role's endpoint returns this shape. Totals are computed here on read —
 * nothing is stored — and PHI notes are decrypted for the response only.
 */
export function mapPlan(doc, { scheduleNames = new Map() } = {}) {
  const plan = doc?.toObject ? doc.toObject() : doc;
  if (!plan) return null;

  const items = (plan.items || []).map((i) => ({
    id: i.id,
    treatmentId: i.treatmentId || "",
    name: i.name || "",
    toothNumbers: Array.isArray(i.toothNumbers) ? i.toothNumbers : [],
    unitFee: money(i.unitFee),
    quantity: Math.max(1, Number(i.quantity) || 1),
    lineTotal: lineTotal(i),
    status: i.status || "proposed",
    allowedNext: allowedNextItemStatuses(i.status),
    linkedAppointmentId: i.linkedAppointmentId || "",
    decidedAt: i.decidedAt || null,
    completedAt: i.completedAt || null,
    notes: decryptField(i.notes || ""),
  }));

  const accepted = items.filter((i) => i.status !== "declined" && i.status !== "proposed");

  return {
    id: plan.publicId,
    patientId: plan.patient?.publicId || "",
    patientName: plan.patient?.name || "",
    dentistId: plan.dentist?.publicId || "",
    dentistName: plan.dentist?.name || "",
    feeScheduleId: plan.feeScheduleId || "",
    feeScheduleName: scheduleNames.get(plan.feeScheduleId) || scheduleNames.get("__default__") || "",
    title: plan.title || "",
    status: plan.status || "draft",
    notes: decryptField(plan.notes || ""),
    items,
    // DERIVED — never stored.
    totalEstimate: sumLineItems(items),
    acceptedTotal: sumLineItems(accepted),
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

/** id -> name for the mapper; one config read serves a whole list. */
async function scheduleNameMap() {
  const map = new Map();
  try {
    const list = await listFeeSchedules();
    for (const s of list) map.set(s.id, s.name);
    const def = list.find((s) => s.isDefault);
    if (def) map.set("__default__", def.name);
  } catch {
    // A missing pricing config must not fail the whole plan list over a label.
  }
  return map;
}

const POPULATE = [
  { path: "patient", select: "publicId name" },
  { path: "dentist", select: "publicId name" },
];

async function loadPlan(planPublicId) {
  const plan = await TreatmentPlan.findOne({ publicId: clean(planPublicId) }).populate(POPULATE);
  if (!plan) throw Object.assign(new Error("Treatment plan not found"), { status: 404 });
  return plan;
}

const respond = async (plan) => mapPlan(plan, { scheduleNames: await scheduleNameMap() });

// ── reads ───────────────────────────────────────────────────────────────────
export async function listPlansForPatient(patientPublicId, { page, limit, sortBy, sortDir } = {}) {
  const { page: P, limit: L, sortBy: sb, sortDir: sd } = parsePagination({ page, limit, sortBy, sortDir });

  const patient = await Patient.findOne({ publicId: clean(patientPublicId) }).select("_id").lean();
  if (!patient) throw Object.assign(new Error("Patient not found"), { status: 404 });

  const rows = await TreatmentPlan.find({ patient: patient._id })
    .populate(POPULATE)
    .sort(buildSort(sb, sd, { createdAt: -1 }))
    .lean();

  const names = await scheduleNameMap();
  return paginateArray(rows.map((r) => mapPlan(r, { scheduleNames: names })), P, L);
}

export async function getPlan(planPublicId) {
  return respond(await loadPlan(planPublicId));
}

/** Patient publicId behind a plan — used by the write gate. */
export async function getPlanPatientPublicId(planPublicId) {
  const plan = await TreatmentPlan.findOne({ publicId: clean(planPublicId) })
    .populate("patient", "publicId")
    .select("patient")
    .lean();
  if (!plan) throw Object.assign(new Error("Treatment plan not found"), { status: 404 });
  return plan.patient?.publicId || "";
}

/**
 * Appointments a plan item may be scheduled into.
 *
 * Only slot-occupying appointments qualify: completed / cancelled / no_show /
 * rescheduled have released their slot (SLOT_OCCUPYING_STATUSES is the
 * authority) and are not something a treatment can still be booked into.
 * No PHI — ids, date, time, type, status.
 */
export async function listLinkableAppointments(patientPublicId) {
  const patient = await Patient.findOne({ publicId: clean(patientPublicId) }).select("_id").lean();
  if (!patient) throw Object.assign(new Error("Patient not found"), { status: 404 });

  const rows = await Appointment.find({
    patient: patient._id,
    status: { $in: SLOT_OCCUPYING_STATUSES },
  })
    .select("publicId date time appointmentType status")
    .sort({ date: 1, time: 1 })
    .limit(100)
    .lean();

  return rows.map((a) => ({
    id: a.publicId,
    date: a.date || "",
    time: a.time || "",
    appointmentType: a.appointmentType || "",
    status: canonicalStatus(a.status),
  }));
}

// ── writes ──────────────────────────────────────────────────────────────────
export async function createPlan({ patientPublicId, dentistId, feeScheduleId, title, notes } = {}) {
  const patient = await Patient.findOne({ publicId: clean(patientPublicId) }).select("_id").lean();
  if (!patient) throw Object.assign(new Error("Patient not found"), { status: 404 });

  const doc = await ensureFeeSchedules();
  const scheduleId = clean(feeScheduleId) || defaultScheduleIdFrom(doc);

  const plan = await TreatmentPlan.create({
    publicId: await nextPlanPublicId(),
    patient: patient._id,
    dentist: dentistId || undefined,
    feeScheduleId: scheduleId,
    title: clean(title),
    notes: encryptField(clean(notes)), // PHI at rest
    status: "draft",
    items: [],
  });

  return respond(await loadPlan(plan.publicId));
}

export async function updatePlan(planPublicId, { title, notes, status } = {}) {
  const plan = await loadPlan(planPublicId);

  if (title !== undefined) plan.title = clean(title);
  if (notes !== undefined) plan.notes = encryptField(clean(notes));
  if (status !== undefined) {
    const next = clean(status);
    // Only the manual states are settable directly; everything else derives.
    if (!["draft", "proposed", "cancelled"].includes(next)) {
      throw Object.assign(
        new Error(`Plan status "${next}" is derived from its items and cannot be set directly`),
        { status: 400 }
      );
    }
    plan.status = next;
  }

  plan.status = derivePlanStatus(plan.status, plan.items);
  await plan.save();
  return respond(plan);
}

/**
 * Changes the plan's fee schedule. Existing items KEEP their snapshotted
 * price — only items added afterwards are priced from the new schedule.
 */
export async function setPlanFeeSchedule(planPublicId, feeScheduleId) {
  const plan = await loadPlan(planPublicId);
  const doc = await ensureFeeSchedules();

  const wanted = clean(feeScheduleId);
  if (wanted && !(doc.feeSchedules || []).some((s) => String(s.id) === wanted)) {
    throw Object.assign(new Error("Fee schedule not found"), { status: 404 });
  }

  plan.feeScheduleId = wanted || defaultScheduleIdFrom(doc);
  await plan.save();
  return respond(plan);
}

export async function addPlanItem(planPublicId, { treatmentId, name, toothNumbers, quantity, notes } = {}) {
  const plan = await loadPlan(planPublicId);

  const doc = await ensureFeeSchedules();
  const defaultScheduleId = defaultScheduleIdFrom(doc);
  const scheduleId = plan.feeScheduleId || defaultScheduleId;

  const tid = clean(treatmentId);
  const treatment = (doc.treatments || []).find((t) => String(t.id) === tid);
  if (tid && !treatment) throw Object.assign(new Error("Treatment not found"), { status: 404 });

  const label = clean(name) || treatment?.name || "";
  if (!label) throw Object.assign(new Error("Item name is required"), { status: 400 });

  // PRICE SNAPSHOT — resolved once, here, through the fee resolver. Never a
  // raw `.fee` read, and never trusted from the client.
  const unitFee = treatment ? getTreatmentFee(treatment, scheduleId, defaultScheduleId) : 0;

  plan.items.push({
    id: nextItemId(plan.items),
    treatmentId: tid,
    name: label,
    toothNumbers: normaliseTeeth(toothNumbers),
    unitFee,
    quantity: Math.max(1, Number(quantity) || 1),
    status: "proposed",
    notes: encryptField(clean(notes)), // PHI at rest
  });

  plan.status = derivePlanStatus(plan.status, plan.items);
  await plan.save();
  return respond(plan);
}

/** Edits an item's non-price fields. The price snapshot is deliberately immutable. */
export async function updatePlanItem(planPublicId, itemId, { toothNumbers, quantity, notes } = {}) {
  const plan = await loadPlan(planPublicId);
  const item = (plan.items || []).find((i) => i.id === clean(itemId));
  if (!item) throw Object.assign(new Error("Plan item not found"), { status: 404 });

  if (toothNumbers !== undefined) item.toothNumbers = normaliseTeeth(toothNumbers);
  if (quantity !== undefined) item.quantity = Math.max(1, Number(quantity) || 1);
  if (notes !== undefined) item.notes = encryptField(clean(notes));

  await plan.save();
  return respond(plan);
}

export async function removePlanItem(planPublicId, itemId) {
  const plan = await loadPlan(planPublicId);
  const before = (plan.items || []).length;
  plan.items = (plan.items || []).filter((i) => i.id !== clean(itemId));
  if (plan.items.length === before) {
    throw Object.assign(new Error("Plan item not found"), { status: 404 });
  }

  plan.status = derivePlanStatus(plan.status, plan.items);
  await plan.save();
  return respond(plan);
}

/**
 * Item lifecycle: accept / decline / schedule / in_progress / complete.
 * Scheduling requires an appointment that belongs to THIS patient and is still
 * slot-occupying.
 */
export async function setPlanItemStatus(planPublicId, itemId, status, { appointmentId } = {}) {
  const plan = await loadPlan(planPublicId);
  const item = (plan.items || []).find((i) => i.id === clean(itemId));
  if (!item) throw Object.assign(new Error("Plan item not found"), { status: 404 });

  const next = clean(status);
  if (!canTransitionItem(item.status, next)) {
    throw Object.assign(
      new Error(`Cannot move item from ${item.status} to ${next}`),
      { status: 400, code: "ILLEGAL_ITEM_TRANSITION" }
    );
  }

  if (next === "scheduled") {
    const apptId = clean(appointmentId);
    if (!apptId) {
      throw Object.assign(new Error("An appointment is required to schedule this item"), { status: 400 });
    }
    const appt = await Appointment.findOne({ publicId: apptId }).select("patient publicId status").lean();
    if (!appt) throw Object.assign(new Error("Appointment not found"), { status: 404 });

    const planPatientId = String(plan.patient?._id || plan.patient);
    if (String(appt.patient) !== planPatientId) {
      throw Object.assign(new Error("That appointment belongs to a different patient"), { status: 400 });
    }
    if (!SLOT_OCCUPYING_STATUSES.includes(appt.status)) {
      throw Object.assign(
        new Error("That appointment is no longer active and cannot be scheduled into"),
        { status: 409 }
      );
    }
    item.linkedAppointmentId = apptId;
  }

  if (next === "accepted") item.linkedAppointmentId = ""; // unscheduled again
  if (next === "accepted" || next === "declined") item.decidedAt = new Date();
  if (next === "completed") item.completedAt = new Date();

  item.status = next;
  plan.status = derivePlanStatus(plan.status, plan.items);
  await plan.save();
  return respond(plan);
}

/** Accept or decline every still-undecided item in one action. */
export async function decideWholePlan(planPublicId, decision) {
  const plan = await loadPlan(planPublicId);
  const next = clean(decision);
  if (!["accepted", "declined"].includes(next)) {
    throw Object.assign(new Error("Decision must be accepted or declined"), { status: 400 });
  }

  const now = new Date();
  for (const item of plan.items || []) {
    if (item.status !== "proposed") continue;
    item.status = next;
    item.decidedAt = now;
  }

  plan.status = derivePlanStatus(plan.status, plan.items);
  await plan.save();
  return respond(plan);
}

export async function softDeletePlan(planPublicId) {
  const plan = await loadPlan(planPublicId);
  await plan.softDelete();
  return { message: "Deleted", id: plan.publicId };
}
