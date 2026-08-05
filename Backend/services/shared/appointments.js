import mongoose from "mongoose";
import Appointment from "../../models/Appointment.model.js";
import Patient from "../../models/Patient.model.js";
import User from "../../models/User.model.js";

// ── Transition guard ─────────────────────────────────────────────────────────
export const ALLOWED_APPOINTMENT_TRANSITIONS = {
  scheduled:  ["completed", "cancelled"],
  checked_in: ["completed", "cancelled"],
  completed:  ["scheduled"],
  cancelled:  ["scheduled"],
  no_show:    ["scheduled"],
};

// ── Status mappers ────────────────────────────────────────────────────────────
export function toDbAppointmentStatus(ui) {
  const v = String(ui || "").trim().toLowerCase();
  if (v === "scheduled")                              return "scheduled";
  if (v === "checked in" || v === "checked_in")      return "checked_in";
  if (v === "completed")                             return "completed";
  if (v === "cancelled" || v === "canceled")         return "cancelled";
  if (v === "no show"   || v === "no_show")          return "no_show";
  return "scheduled";
}

export function toUiAppointmentStatus(db) {
  const v = String(db || "").trim().toLowerCase();
  if (v === "scheduled")  return "Scheduled";
  if (v === "checked_in") return "Checked In";
  if (v === "completed")  return "Completed";
  if (v === "cancelled" || v === "canceled") return "Cancelled";
  if (v === "no_show")    return "No Show";
  return "Scheduled";
}

// ── ID generator ──────────────────────────────────────────────────────────────
const pad = (n, w = 4) => String(n).padStart(w, "0");

export async function generateAppointmentPublicId() {
  let n = (await Appointment.countDocuments({})) + 1;
  while (true) {
    const publicId = `APT-${pad(n)}`;
    const exists = await Appointment.exists({ publicId });
    if (!exists) return publicId;
    n += 1;
  }
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
    reason:  a.reason  || "",
    notes:   a.notes   || "",
    status:  toUiAppointmentStatus(a.status),
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

  const conflict = await Appointment.findOne({
    dentist: dentist._id,
    date,
    time,
    status: { $ne: "cancelled" },
  });
  if (conflict) throw new Error("Dentist already has an appointment at this time");

  const publicId = await generateAppointmentPublicId();
  const created  = await Appointment.create({
    publicId, patient: patient._id, dentist: dentist._id,
    date, time, reason, notes, status: "scheduled",
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

  const newDate = body?.date ? String(body.date).trim() : appt.date;
  const newTime = body?.time ? String(body.time).trim() : appt.time;

  if (body?.date || body?.time) {
    const conflict = await Appointment.findOne({
      _id: { $ne: appt._id },
      dentist: appt.dentist,
      date: newDate,
      time: newTime,
      status: { $ne: "cancelled" },
    });
    if (conflict) throw new Error("Dentist already has an appointment at this time");
  }

  if (body?.date   !== undefined) appt.date   = newDate;
  if (body?.time   !== undefined) appt.time   = newTime;
  if (body?.reason !== undefined) appt.reason = String(body.reason || "");
  if (body?.notes  !== undefined) appt.notes  = String(body.notes  || "");

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

  const allowed = ALLOWED_APPOINTMENT_TRANSITIONS[appt.status] || [];
  if (appt.status !== dbStatus && !allowed.includes(dbStatus)) {
    throw new Error(
      `Cannot move from ${toUiAppointmentStatus(appt.status)} to ${toUiAppointmentStatus(dbStatus)}`
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
