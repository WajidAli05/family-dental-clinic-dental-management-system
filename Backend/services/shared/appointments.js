import mongoose from "mongoose";
import { isPastDate } from "./clinicDate.js";
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
  SLOT_OCCUPYING_STATUSES,
  occupiesSlot,
  isEditLocked,
  canTransition as _canTransition,
  statusLabel as _statusLabel,
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
    // UI mirrors the server rule: fields locked until the visit is reopened.
    editLocked: isEditLocked(a.status),
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

// ── Slot conflict — THE single check used by every booking path ──────────────
/**
 * Throws 409 when the dentist already has a slot-OCCUPYING appointment at this
 * date+time. Completed / cancelled / rescheduled / no_show appointments do NOT
 * block (see SLOT_OCCUPYING_STATUSES) — their time is free to rebook.
 *
 * Every create / edit / re-activation path calls this, so the rule can never
 * diverge between roles. Server-side and authoritative: a stale or bypassed
 * client cannot double-book.
 */
export async function assertNoSlotConflict({ dentist, date, time, excludeAppointmentId }) {
  const query = {
    dentist,
    date: String(date || "").trim(),
    time: String(time || "").trim(),
    status: { $in: SLOT_OCCUPYING_STATUSES },
  };
  if (excludeAppointmentId) query._id = { $ne: excludeAppointmentId };

  const conflict = await Appointment.findOne(query).select("publicId").lean();
  if (conflict) {
    throw Object.assign(
      new Error(`This slot is no longer available — ${conflict.publicId} already occupies it`),
      { status: 409 }
    );
  }
}

// ── Core CRUD ─────────────────────────────────────────────────────────────────

/**
 * @param {object} body  { patientId, dentistId, date, time, reason, notes }
 * @param {{ forceDentistId?, blockPastDates? }} opts
 *   forceDentistId  bypasses dentist lookup (self-book)
 *   blockPastDates  refuse a date before the clinic's today. OPT-IN so existing
 *                   booking flows keep their current behaviour (back-dating a
 *                   visit for record-keeping still works); the treatment-plan
 *                   scheduler switches it on. One implementation, no fork.
 */
export async function createAppointmentCore(body, { forceDentistId, blockPastDates = false } = {}) {
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

  if (blockPastDates && (await isPastDate(date))) {
    throw Object.assign(
      new Error(`Cannot book an appointment in the past (${date})`),
      { status: 400, code: "APPOINTMENT_IN_PAST" }
    );
  }

  await assertNoSlotConflict({ dentist: dentist._id, date, time });

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

  // A completed/cancelled visit is a closed record — its fields are locked
  // until it is reopened (status transitions remain available, so reopening
  // is always possible). Enforced HERE so owner, receptionist and dentist all
  // inherit it: every field-edit path funnels through this function.
  if (isEditLocked(appt.status)) {
    throw Object.assign(
      new Error(
        `This appointment is ${_statusLabel(appt.status).toLowerCase()} — reopen it before editing.`
      ),
      { status: 409, code: "APPOINTMENT_EDIT_LOCKED" }
    );
  }

  await assertPatientActive(appt.patient);

  const newDate = body?.date ? String(body.date).trim() : appt.date;
  const newTime = body?.time ? String(body.time).trim() : appt.time;

  // Full-field edit: a front-desk correction may need to move the visit to a
  // different dentist or fix the wrong patient, not just the time.
  let newDentistId = appt.dentist;
  const dentistKey = body?.dentistId || body?.dentist || body?.dentistName;
  if (dentistKey !== undefined && dentistKey !== null && String(dentistKey).trim() !== "") {
    const d = await resolveDentist(dentistKey);
    newDentistId = d._id;
  }

  let newPatientId = appt.patient;
  const patientKey = body?.patientId || body?.mr || body?.phone;
  if (patientKey !== undefined && patientKey !== null && String(patientKey).trim() !== "") {
    const pt = await resolvePatient(patientKey);
    newPatientId = pt._id;
  }

  // Re-check whenever anything that defines the slot changes.
  const slotChanged =
    newDate !== appt.date ||
    newTime !== appt.time ||
    String(newDentistId) !== String(appt.dentist);

  // Only matters while this appointment actually holds a slot — an edit to a
  // cancelled/completed one can't double-book anyone.
  if (slotChanged && occupiesSlot(appt.status)) {
    await assertNoSlotConflict({
      dentist: newDentistId,
      date: newDate,
      time: newTime,
      excludeAppointmentId: appt._id,
    });
  }

  appt.date    = newDate;
  appt.time    = newTime;
  appt.dentist = newDentistId;
  appt.patient = newPatientId;
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

  // BUG FIX: moving an appointment back INTO an occupying status (confirming
  // or re-activating a cancelled/no-show/rescheduled visit) must re-verify the
  // slot — another appointment may have taken it in the meantime.
  if (!occupiesSlot(appt.status) && occupiesSlot(dbStatus)) {
    await assertNoSlotConflict({
      dentist: appt.dentist,
      date: appt.date,
      time: appt.time,
      excludeAppointmentId: appt._id,
    });
  }

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

/**
 * RESCHEDULE — move an appointment to a NEW date/time (optionally a new
 * dentist) and land it back in an ACTIVE status.
 *
 * MODEL: the appointment MOVES; it does not linger in a "rescheduled" state.
 * `rescheduled` is a slot-FREEING status, so parking the record there while
 * pointing it at the new time would leave the new slot unowned — anyone could
 * book straight over it. Instead the record takes the new date/time and
 * becomes `confirmed`, which means:
 *   - the OLD slot is released automatically (nothing references it any more)
 *   - the NEW slot is occupied and conflict-checked before the move
 * The "this was rescheduled" history lives in the audit log (old → new), which
 * is where an immutable trail belongs.
 *
 * Permitted only from statuses whose lifecycle allows `rescheduled`
 * (requested / confirmed / cancelled / no_show) — notably NOT from completed.
 */
export async function rescheduleAppointmentCore(apptPublicId, body, { ownDentistId } = {}) {
  const newDate = String(body?.date || "").trim();
  const newTime = String(body?.time || "").trim();
  if (!newDate) throw Object.assign(new Error("A new date is required to reschedule"), { status: 400 });
  if (!newTime) throw Object.assign(new Error("A new time is required to reschedule"), { status: 400 });

  const appt = await Appointment.findOne({ publicId: apptPublicId });
  if (!appt) throw Object.assign(new Error("Appointment not found"), { status: 404 });

  if (ownDentistId && String(appt.dentist) !== String(ownDentistId)) {
    throw Object.assign(new Error("Not authorized to reschedule this appointment"), { status: 403 });
  }

  await assertPatientActive(appt.patient);

  // Gate on the existing lifecycle: only statuses that may go to `rescheduled`
  // can be rescheduled (so a completed visit cannot be moved).
  if (!_canTransition(appt.status, "rescheduled")) {
    throw Object.assign(
      new Error(`Cannot reschedule an appointment that is ${_statusLabel(appt.status).toLowerCase()}`),
      { status: 400 }
    );
  }

  let targetDentist = appt.dentist;
  const dentistKey = body?.dentistId || body?.dentist || body?.dentistName;
  if (dentistKey !== undefined && dentistKey !== null && String(dentistKey).trim() !== "") {
    const d = await resolveDentist(dentistKey);
    targetDentist = d._id;
  }

  // Snapshot BEFORE mutating — the controller audits old → new.
  const previous = { date: appt.date, time: appt.time, dentist: String(appt.dentist) };

  const unchanged =
    previous.date === newDate &&
    previous.time === newTime &&
    String(targetDentist) === previous.dentist;
  if (unchanged) {
    throw Object.assign(
      new Error("Pick a different date, time or dentist to reschedule to"),
      { status: 400 }
    );
  }

  // Authoritative: the NEW slot must be free (own id excluded so a partial
  // move — e.g. same slot, different dentist — never conflicts with itself).
  await assertNoSlotConflict({
    dentist: targetDentist,
    date: newDate,
    time: newTime,
    excludeAppointmentId: appt._id,
  });

  appt.date    = newDate;
  appt.time    = newTime;
  appt.dentist = targetDentist;
  appt.status  = "confirmed"; // occupies the NEW slot
  await appt.save();

  const populated = await Appointment.findById(appt._id)
    .populate("patient", "name publicId mr phone gender age")
    .populate("dentist", "name publicId specialization")
    .lean();

  return { ...mapAppointmentToUI(populated), previous };
}

/** Soft-delete (owner only) — sets deletedAt; excluded from all normal queries thereafter. */
export async function deleteAppointmentCore(apptPublicId) {
  const appt = await Appointment.findOne({ publicId: apptPublicId });
  if (!appt) throw new Error("Appointment not found");
  await appt.softDelete();
  return { message: "Deleted", id: apptPublicId };
}
