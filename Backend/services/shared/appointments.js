import mongoose from "mongoose";
import Appointment from "../../models/Appointment.model.js";
import Patient from "../../models/Patient.model.js";
import User from "../../models/User.model.js";
import { getNextSequence } from "./counters.js";
import {
  canonicalStatus,
  canTransition,
  allowedNextStatuses,
  statusLabel,
  normalizeAppointmentType,
  NON_BLOCKING_STORED_STATUSES,
  ALLOWED_APPOINTMENT_TRANSITIONS,
} from "./appointmentConfig.js";

// Re-exported so existing importers keep working — the definitions now live
// in appointmentConfig.js (single source for model + every role service).
export { ALLOWED_APPOINTMENT_TRANSITIONS, allowedNextStatuses, canonicalStatus };

// ── Status mappers ────────────────────────────────────────────────────────────
/** Any inbound form (UI label, legacy value, canonical) → canonical db value. */
export function toDbAppointmentStatus(ui) {
  return canonicalStatus(ui);
}

/** Db value (incl. legacy) → human label. */
export function toUiAppointmentStatus(db) {
  return statusLabel(db);
}

// ── ID generator ──────────────────────────────────────────────────────────────
const pad = (n, w = 4) => String(n).padStart(w, "0");

// Seed (first bootstrap only): true max existing APT-#### number, including
// soft-deleted appointments — they still occupy their publicId at the DB
// level even though normal queries hide them.
async function computeAppointmentIdSeed() {
  const rows = await Appointment.find({ publicId: /^APT-\d+$/ })
    .select("publicId")
    .setOptions({ includeDeleted: true })
    .lean();
  let max = 0;
  for (const r of rows) {
    const m = String(r.publicId).match(/^APT-(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max;
}

export async function generateAppointmentPublicId() {
  const n = await getNextSequence("appointment", computeAppointmentIdSeed);
  return `APT-${pad(n)}`;
}

// ── UI mapper (humanised status — for dentist / receptionist context) ─────────
export function mapAppointmentToUI(a) {
  return {
    id:            a.publicId,
    mr:            a.patient?.mr ?? null,
    patientId:     a.patient?.publicId || "",
    patientName:   a.patient?.name    || "",
    patientPhone:  a.patient?.phone   || "",
    dentistId:     a.dentist?.publicId || "",
    dentist:       a.dentist?.name    || "",
    dentistName:   a.dentist?.name    || "",
    specialization: a.dentist?.specialization || "",
    date:    a.date,
    time:    a.time,
    appointmentType: a.appointmentType || "",
    reason:  a.reason  || "",
    notes:   a.notes   || "",
    // `status` stays the humanised label (existing consumers depend on it);
    // statusCode is the canonical machine value for logic/UI transitions.
    status:  toUiAppointmentStatus(a.status),
    statusCode: canonicalStatus(a.status),
    allowedNext: allowedNextStatuses(a.status),
    original: a,
  };
}

// ── Patient / dentist resolution helpers ─────────────────────────────────────
const isOid = (v) => mongoose.Types.ObjectId.isValid(String(v || ""));

async function resolvePatient(key) {
  const or = [];
  if (isOid(key)) or.push({ _id: key });
  or.push({ publicId: String(key).toUpperCase() });
  if (/^\d+$/.test(String(key))) {
    or.push({ mr: Number(key) });
    or.push({ publicId: `PT-${String(key).padStart(4, "0")}` });
  }
  or.push({ phone: String(key) });
  const patient = await Patient.findOne({ $or: or });
  if (!patient) throw new Error("Patient not found");
  return patient;
}

// Patient.findById already excludes soft-deleted/erased patients (softDelete
// plugin). Reused by every write path below instead of a second hand-rolled
// deletedAt check — a deleted patient's appointments must be fully
// non-actionable, not just hidden from lists.
async function assertPatientActive(patientObjectId) {
  const patient = await Patient.findById(patientObjectId).select("_id");
  if (!patient) {
    throw Object.assign(new Error("Patient not found or inactive"), { status: 404 });
  }
}

async function resolveDentist(key) {
  const or = [];
  if (isOid(key)) or.push({ _id: key });
  or.push({ publicId: String(key) });
  or.push({ name: String(key) });
  const dentist = await User.findOne({ role: "dentist", $or: or });
  if (!dentist) throw new Error("Dentist not found");
  return dentist;
}

// ── Core CRUD ─────────────────────────────────────────────────────────────────

/**
 * @param {object} body  { patientId, dentistId, date, time, reason, notes }
 * @param {{ forceDentistId? }} opts  forceDentistId bypasses dentist lookup (self-book)
 */
export async function createAppointmentCore(body, { forceDentistId } = {}) {
  const date   = String(body?.date   || "").trim();
  const time   = String(body?.time   || "").trim();
  const reason = String(body?.reason || "").trim();
  const notes  = String(body?.notes  || "").trim();
  const appointmentType = normalizeAppointmentType(body?.appointmentType);

  const patientKey = body?.patientId || body?.mr || body?.phone;
  if (!patientKey) throw new Error("patientId is required");
  if (!date)       throw new Error("date is required");
  if (!time)       throw new Error("time is required");

  const patient = await resolvePatient(patientKey);

  let dentist;
  if (forceDentistId) {
    dentist = await User.findById(forceDentistId).select("_id name publicId specialization");
    if (!dentist) throw new Error("Dentist not found");
  } else {
    const dk = body?.dentistId || body?.dentist || body?.dentistName;
    if (!dk) throw new Error("dentistId is required");
    dentist = await resolveDentist(dk);
  }

  // cancelled / rescheduled / no_show release the slot
  const conflict = await Appointment.findOne({
    dentist: dentist._id,
    date,
    time,
    status: { $nin: NON_BLOCKING_STORED_STATUSES },
  });
  if (conflict) throw new Error("Dentist already has an appointment at this time");

  const publicId = await generateAppointmentPublicId();
  const created  = await Appointment.create({
    publicId, patient: patient._id, dentist: dentist._id,
    date, time, appointmentType, reason, notes, status: "confirmed",
  });

  const populated = await Appointment.findById(created._id)
    .populate("patient", "name publicId mr phone gender age")
    .populate("dentist", "name publicId specialization")
    .lean();

  return mapAppointmentToUI(populated);
}

/**
 * @param {string}  apptPublicId
 * @param {object}  body         { date?, time?, reason?, notes? }
 * @param {{ ownDentistId? }} opts  ownDentistId enforces ownership check (dentist role)
 */
export async function updateAppointmentCore(apptPublicId, body, { ownDentistId } = {}) {
  const appt = await Appointment.findOne({ publicId: apptPublicId });
  if (!appt) throw new Error("Appointment not found");

  if (ownDentistId && String(appt.dentist) !== String(ownDentistId)) {
    throw new Error("Not authorized to edit this appointment");
  }

  await assertPatientActive(appt.patient);

  const newDate = body?.date ? String(body.date).trim() : appt.date;
  const newTime = body?.time ? String(body.time).trim() : appt.time;

  if (body?.date || body?.time) {
    const conflict = await Appointment.findOne({
      _id: { $ne: appt._id },
      dentist: appt.dentist,
      date: newDate,
      time: newTime,
      status: { $nin: NON_BLOCKING_STORED_STATUSES },
    });
    if (conflict) throw new Error("Dentist already has an appointment at this time");
  }

  if (body?.date   !== undefined) appt.date   = newDate;
  if (body?.time   !== undefined) appt.time   = newTime;
  if (body?.reason !== undefined) appt.reason = String(body.reason || "");
  if (body?.notes  !== undefined) appt.notes  = String(body.notes  || "");
  if (body?.appointmentType !== undefined) {
    appt.appointmentType = normalizeAppointmentType(body.appointmentType);
  }

  await appt.save();

  const populated = await Appointment.findById(appt._id)
    .populate("patient", "name publicId mr phone gender age")
    .populate("dentist", "name publicId specialization")
    .lean();

  return mapAppointmentToUI(populated);
}

/**
 * @param {string}  apptPublicId
 * @param {string}  uiStatus      UI-format status string
 * @param {{ ownDentistId? }} opts
 */
export async function updateAppointmentStatusCore(apptPublicId, uiStatus, { ownDentistId } = {}) {
  if (!uiStatus) throw new Error("status is required");
  const dbStatus = toDbAppointmentStatus(uiStatus);

  const appt = await Appointment.findOne({ publicId: apptPublicId });
  if (!appt) throw new Error("Appointment not found");

  if (ownDentistId && String(appt.dentist) !== String(ownDentistId)) {
    throw new Error("Not authorized to update this appointment");
  }

  await assertPatientActive(appt.patient);

  if (!canTransition(appt.status, dbStatus)) {
    throw Object.assign(
      new Error(
        `Cannot move from ${toUiAppointmentStatus(appt.status)} to ${toUiAppointmentStatus(dbStatus)}`
      ),
      { status: 400 }
    );
  }

  appt.status = dbStatus;
  await appt.save();

  const populated = await Appointment.findById(appt._id)
    .populate("patient", "name publicId mr phone gender age")
    .populate("dentist", "name publicId specialization")
    .lean();

  return mapAppointmentToUI(populated);
}

/** Soft-delete (owner only) — sets deletedAt; excluded from all normal queries thereafter. */
export async function deleteAppointmentCore(apptPublicId) {
  const appt = await Appointment.findOne({ publicId: apptPublicId });
  if (!appt) throw new Error("Appointment not found");
  await appt.softDelete();
  return { message: "Deleted", id: apptPublicId };
}
