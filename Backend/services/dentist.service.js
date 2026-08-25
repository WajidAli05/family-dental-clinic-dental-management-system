//dentist services
import User from "../models/User.model.js";
import { dentistFinance } from "./shared/finance.js";
import { defaultScheduleIdFrom, getTreatmentFee } from "./shared/feeSchedules.js";
import { searchMedications, createOrGetMedication, listMedications } from "./shared/medications.js";
import Patient from "../models/Patient.model.js";
import Appointment from "../models/Appointment.model.js";
import LabCase from "../models/LabCase.model.js";
import SampleType from "../models/SampleType.model.js";
import Prescription from "../models/Prescription.model.js";
import ClinicalMaster from "../models/ClinicalMaster.model.js";
import { parsePagination, paginateArray, buildSort } from "./shared/paginate.js";
import {
  createAppointmentCore,
  updateAppointmentCore,
  updateAppointmentStatusCore,
} from "./shared/appointments.js";
import { listPatientsCore, upsertOdontogramEntry, computeAge } from "./shared/patients.js";
import { updateLabCaseStatus } from "./shared/labCases.js";
import {
  encryptPrescriptionDoc,
  decryptPrescriptionDoc,
} from "../utils/fieldEncryption.js";

const pick = (obj, keys) =>
  keys.reduce((acc, k) => {
    if (obj?.[k] !== undefined) acc[k] = obj[k];
    return acc;
  }, {});

const todayISO = () => new Date().toISOString().slice(0, 10);

const makeRxId = () =>
  `RX-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

// The softDelete plugin (models/plugins/softDelete.js) already excludes
// soft-deleted docs from populate()'s own query — a populated `patient`/
// `dentist` ref that comes back null means the referenced record is
// soft-deleted (or erased, which also sets deletedAt — see erasure.js).
// Reuse that instead of a second hand-written deletedAt check: any query
// that populates "patient" onto Appointment/LabCase should filter with this
// before returning rows, so a deleted patient's records never surface.
const hasActivePatient = (doc) => Boolean(doc?.patient);

// -------------------- ME --------------------
export async function dentistGetMe(dentistId) {
  const user = await User.findById(dentistId).lean();
  if (!user) throw new Error("Dentist not found");
  return user;
}

export async function dentistUpdateMe(dentistId, body) {
  const allowed = pick(body, [
    "name",
    "email",
    "phone",
    "specialization",
    "available",
    "commissionPercent",
  ]);

  const updated = await User.findByIdAndUpdate(
    dentistId,
    { $set: allowed },
    { new: true }
  );

  if (!updated) throw new Error("Dentist not found");
  return updated.toJSON();
}

export async function dentistChangePassword(dentistId, { currentPassword, newPassword }) {
  if (!currentPassword || !newPassword)
    throw new Error("currentPassword and newPassword are required");

  const user = await User.findById(dentistId).select("+passwordHash");
  if (!user) throw new Error("Dentist not found");

  const ok = await user.verifyPassword(currentPassword);
  if (!ok) throw new Error("Current password is incorrect");

  await user.setPassword(newPassword);
  user.forcePasswordChange = false;
  await user.save();

  return { message: "Password updated" };
}

// -------------------- STATS --------------------
export async function dentistGetStats(dentistId, { date: dateParam } = {}) {
  const date = String(dateParam || "").trim() || todayISO();

  // countDocuments() alone can't see whether a matched appointment's PATIENT
  // is soft-deleted (erasure doesn't cascade to Appointment — see
  // erasure.js). Fetch + populate + filter with the same hasActivePatient
  // check used by dentistGetAppointments/dentistGetCases, so the dashboard
  // counts match what those lists actually show.
  const [todaysAppts, pendingLabCases, prescriptionsToday] = await Promise.all([
    Appointment.find({ dentist: dentistId, date }).populate("patient", "_id").lean(),
    LabCase.find({
      dentist: dentistId,
      status: { $in: ["sent", "in_progress", "ready", "delivered"] },
    }).populate("patient", "_id").lean(),
    Prescription.countDocuments({
      date,
      dentistName: { $exists: true, $ne: "" },
    }),
  ]);

  const activeTodaysAppts = todaysAppts.filter(hasActivePatient);

  return {
    appointmentsToday: activeTodaysAppts.length,
    patientsSeen: activeTodaysAppts.filter((a) => a.status === "completed").length,
    pendingLab: pendingLabCases.filter(hasActivePatient).length,
    prescriptionsToday,
  };
}

// -------------------- APPOINTMENTS --------------------
// export async function dentistGetAppointments(dentistId, { date } = {}) {
//   const d = date || todayISO();

//   const rows = await Appointment.find({ dentist: dentistId, date: d })
//     .populate("patient", "name publicId mr")
//     .sort({ time: 1 })
//     .lean();

//   // ✅ frontend friendly + required patientId for prescriptions
//   return rows.map((a) => ({
//     id: a.publicId,
//     patientId: a.patient?.publicId || "", // ✅ used by FE to fetch prescriptions
//     mr: a.patient?.mr || null,
//     patientName: a.patient?.name || "",
//     date: a.date,
//     time: a.time,
//     reason: a.reason,
//     status: a.status,
//   }));
// }

// -------------------- APPOINTMENTS --------------------
export async function dentistGetAppointments(dentistId, { date, page, limit, sortBy, sortDir } = {}) {
  const { page: P, limit: L, sortDir: sd, sortBy: sb } = parsePagination({ page, limit, sortBy, sortDir });
  const query = { dentist: dentistId };
  const d = String(date || "").trim();
  if (d) query.date = d;
  const sort = buildSort(sb, sd, { date: -1, time: 1 });

  // No DB-level skip/limit here — a soft-deleted/erased patient's appointment
  // can still exist (erasure deliberately doesn't cascade to Appointment; see
  // erasure.js), so populate("patient") comes back null for it and it must be
  // filtered out BEFORE pagination, or `total`/page slicing would be wrong.
  const rows = await Appointment.find(query)
    // age/gender/dateOfBirth feed the prescription letterhead patient block
    .populate("patient", "name publicId mr age gender dateOfBirth")
    .sort(sort)
    .lean();

  const mapped = rows
    .filter(hasActivePatient) // excludes appointments whose patient is soft-deleted/erased
    .map((a) => ({
      id: a.publicId,
      patientId: a.patient?.publicId || "",
      mr: a.patient?.mr || null,
      patientName: a.patient?.name || "",
      patientAge: a.patient?.dateOfBirth ? computeAge(a.patient.dateOfBirth) : (a.patient?.age ?? ""),
      patientGender: a.patient?.gender || "",
      patientDob: a.patient?.dateOfBirth
        ? new Date(a.patient.dateOfBirth).toISOString().slice(0, 10)
        : "",
      date: a.date,
      time: a.time,
      reason: a.reason,
      status: a.status,
      original: a,
    }));

  return paginateArray(mapped, P, L);
}

// -------------------- LAB CASES --------------------
export async function dentistGetCases(dentistId, { status, q, page, limit, sortBy, sortDir } = {}) {
  const { page: P, limit: L, sortDir: sd, sortBy: sb } = parsePagination({ page, limit, sortBy, sortDir });
  const query = { dentist: dentistId };
  if (status && status !== "all") query.status = String(status);
  const sort = buildSort(sb, sd, { createdAt: -1 });
  const rows = await LabCase.find(query)
    .populate("patient", "name publicId phone")
    .populate("dentist", "name publicId")
    .populate("lab", "name publicId")
    .populate("sampleType", "name publicId price")
    .sort(sort)
    .lean();

  let mapped = rows.filter(hasActivePatient).map((c) => ({
    id: c.publicId,
    patientName: c.patient?.name || "",
    lab: c.lab?.name || "",
    sentDate: c.createdAtISO || new Date(c.createdAt).toISOString().slice(0, 10),
    teeth: Array.isArray(c.teeth) ? c.teeth : [],
    type: c.sampleType?.name || "",
    sampleTypePrice: Number(c.sampleType?.price) || 0,
    tooth: (c.teeth || []).map((t) => `#${t}`).join(", "),
    date: new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
    status: c.status,
    note: c.notes || "",
    dentistName: c.dentist?.name || "",
  }));

  const needle = String(q || "").trim().toLowerCase();
  if (needle) {
    mapped = mapped.filter((x) =>
      `${x.id} ${x.type} ${x.tooth} ${x.status} ${x.note} ${x.patientName}`.toLowerCase().includes(needle)
    );
  }

  return paginateArray(mapped, P, L);
}

export async function dentistUpdateCaseStatus(dentistId, casePublicId, uiAction) {
  const c = await updateLabCaseStatus("dentist", dentistId, casePublicId, uiAction);
  return c.toJSON();
}

// -------------------- PRESCRIPTIONS --------------------

// FDI tooth numbers accepted in per-tooth clinical entries.
const FDI_TOOTH_RE = /^[1-4][1-8]$/;

/** Normalize per-tooth clinical entries: drop anything without a valid FDI
 * tooth number, coerce text to trimmed strings, dedupe by tooth (last wins).
 * All text here is PHI and gets encrypted by encryptPrescriptionDoc. */
function sanitizeToothEntries(arr) {
  if (!Array.isArray(arr)) return [];
  const byTooth = new Map();
  for (const e of arr) {
    const tooth = String(e?.toothNumber || "").trim();
    if (!FDI_TOOTH_RE.test(tooth)) continue;
    byTooth.set(tooth, {
      toothNumber:     tooth,
      diagnosis:       String(e?.diagnosis       || "").trim(),
      treatment:       String(e?.treatment       || "").trim(),
      clinicalFinding: String(e?.clinicalFinding || "").trim(),
      note:            String(e?.note            || "").trim(),
      xrayRequested:   Boolean(e?.xrayRequested),
      xrayNote:        String(e?.xrayNote        || "").trim(),
    });
  }
  return [...byTooth.values()];
}

export async function dentistCreatePrescription(user, body) {
  const dentistName = user?.name || "";
  const date = body?.date || todayISO();

  const patientId = body?.patientId || "";
  if (!patientId) throw new Error("patientId is required");

  // Clinical-safety guard: a prescription must never be created for a
  // soft-deleted/erased patient, even via a stale UI reference or a direct
  // API call. Patient.findOne() already excludes soft-deleted patients (the
  // softDelete plugin), so a missing result here reliably means "gone."
  const patient = await Patient.findOne({ publicId: patientId });
  if (!patient) {
    throw Object.assign(new Error("Patient not found or inactive"), { status: 404 });
  }

  // Same appointment-based rule as the tooth chart: only a dentist who has an
  // appointment with this patient may write their clinical record.
  const hasAppointment = await Appointment.exists({ patient: patient._id, dentist: user?._id });
  if (!hasAppointment) {
    throw Object.assign(
      new Error("You can only prescribe for a patient you have an appointment with"),
      { status: 403 }
    );
  }

  const toothEntries = sanitizeToothEntries(body?.toothEntries);

  // Build plaintext payload first (all PHI in the clear at this point)
  const plain = {
    patientType:   body?.patientType ?? null,
    // Keep selectedTeeth mirrored from the per-tooth entries so legacy
    // readers (print, preview, existing prescriptions) keep working unchanged.
    selectedTeeth: toothEntries.length
      ? toothEntries.map((e) => e.toothNumber)
      : (Array.isArray(body?.selectedTeeth) ? body.selectedTeeth : []),
    toothEntries,
    diagnosis:     body?.diagnosis     || "",
    treatment:     body?.treatment     || "",
    clinicalFinding: body?.clinicalFinding || "",
    visualStatus:  body?.visualStatus  || "none",
    notes:         body?.notes         || "",
    medications:   Array.isArray(body?.medications) ? body.medications : [],
    patientId,
    appointmentId: String(body?.appointmentId || "").trim(),
    dentistName,
    date,
  };

  // Encrypt PHI fields before any write
  const encrypted = encryptPrescriptionDoc(plain);

  // if already exists for same dentist+patient+date => UPDATE instead of duplicate
  const existing = await Prescription.findOne({ dentistName, patientId, date });
  if (existing) {
    Object.assign(existing, encrypted);
    await existing.save();
    // Decrypt before returning so caller/controller always sees plaintext
    return decryptPrescriptionDoc(existing.toJSON());
  }

  const doc = await Prescription.create({ _id: makeRxId(), ...encrypted });
  return decryptPrescriptionDoc(doc.toJSON());
}

// used by FE for Edit + Print (load by id)
export async function dentistGetPrescriptionById(user, rxId) {
  const dentistName = user?.name || "";

  const rx = await Prescription.findById(rxId).lean();
  if (!rx) throw new Error("Prescription not found");

  if (rx.dentistName && dentistName && rx.dentistName !== dentistName) {
    throw new Error("Forbidden");
  }

  // Decrypt PHI fields before returning (handles both encrypted and legacy plaintext)
  return decryptPrescriptionDoc(rx);
}

// update route (PATCH /prescriptions/:id)
export async function dentistUpdatePrescription(user, rxId, body) {
  const dentistName = user?.name || "";

  const rx = await Prescription.findById(rxId);
  if (!rx) throw new Error("Prescription not found");

  if (rx.dentistName && dentistName && rx.dentistName !== dentistName) {
    throw new Error("Forbidden");
  }

  const allowed = pick(body || {}, [
    "patientType",
    "selectedTeeth",
    "toothEntries",
    "diagnosis",
    "treatment",
    "clinicalFinding",
    "visualStatus",
    "notes",
    "medications",
    "patientId",
    "appointmentId",
    "date",
  ]);

  // Validate incoming body types before encrypting
  if (allowed.selectedTeeth && !Array.isArray(allowed.selectedTeeth)) {
    throw new Error("selectedTeeth must be an array");
  }
  if (allowed.medications !== undefined && !Array.isArray(allowed.medications)) {
    throw new Error("medications must be an array");
  }
  if (allowed.toothEntries !== undefined) {
    if (!Array.isArray(allowed.toothEntries)) throw new Error("toothEntries must be an array");
    allowed.toothEntries = sanitizeToothEntries(allowed.toothEntries);
    // Keep the legacy selectedTeeth mirror in sync with the per-tooth record.
    if (allowed.toothEntries.length) {
      allowed.selectedTeeth = allowed.toothEntries.map((e) => e.toothNumber);
    }
  }

  // Same clinical-safety guard as create: don't let an update re-point (or
  // leave pointed at) a soft-deleted/erased patient.
  const effectivePatientId = allowed.patientId !== undefined ? allowed.patientId : rx.patientId;
  if (effectivePatientId) {
    const patient = await Patient.findOne({ publicId: effectivePatientId });
    if (!patient) {
      throw Object.assign(new Error("Patient not found or inactive"), { status: 404 });
    }
  }

  // Encrypt PHI fields in the partial update object before writing
  const encryptedAllowed = encryptPrescriptionDoc(allowed);

  Object.assign(rx, encryptedAllowed);
  if (dentistName) rx.dentistName = dentistName;

  await rx.save();
  // Decrypt before returning so caller/controller always sees plaintext
  return decryptPrescriptionDoc(rx.toJSON());
}

// Return the single most-recent prescription for each patientId in the list.
// No date filter — covers all history so button state is correct on any day.
export async function dentistGetLatestByPatients(user, patientIds = []) {
  const dentistName = user?.name || "";
  const ids = patientIds.filter(Boolean);
  if (!ids.length) return [];

  const rxs = await Prescription.find({ dentistName, patientId: { $in: ids } })
    .sort({ createdAt: -1 })
    .lean();

  // Keep only the most-recent prescription per patient, then decrypt
  const map = {};
  for (const rx of rxs) {
    if (!map[rx.patientId]) map[rx.patientId] = rx;
  }
  return Object.values(map).map(decryptPrescriptionDoc);
}

// Full prescription history for one patient, newest first.
export async function dentistGetPatientHistory(user, patientId) {
  const dentistName = user?.name || "";
  if (!patientId) throw new Error("patientId is required");
  const rxs = await Prescription.find({ dentistName, patientId: String(patientId) })
    .sort({ createdAt: -1 })
    .lean();
  return rxs.map(decryptPrescriptionDoc);
}

// used by FE to build rxMap for today appointments:
// GET /dentist/prescriptions?date=YYYY-MM-DD&patientIds=PT-1,PT-2
export async function dentistGetPrescriptions(user, query = {}) {
  const { page: P, limit: L } = parsePagination(query);

  const dentistName = user?.name || "";
  const date = query.date ? String(query.date) : todayISO();

  const q = { dentistName, date };

  if (query.patientId) q.patientId = String(query.patientId);

  if (query.patientIds) {
    const ids = String(query.patientIds).split(",").map((x) => x.trim()).filter(Boolean);
    if (ids.length) q.patientId = { $in: ids };
  }

  const [total, rows] = await Promise.all([
    Prescription.countDocuments(q),
    Prescription.find(q).sort({ createdAt: -1 }).skip((P - 1) * L).limit(L).lean(),
  ]);

  // Decrypt PHI fields on every row before returning
  return { rows: rows.map(decryptPrescriptionDoc), total, page: P, pages: Math.max(1, Math.ceil(total / L)) };
}

// -------------------- APPOINTMENT CRUD (dentist self-service) --------------------
export async function dentistCreateAppointment(dentistId, body) {
  return createAppointmentCore(body, { forceDentistId: dentistId });
}

export async function dentistUpdateAppointment(dentistId, apptPublicId, body) {
  return updateAppointmentCore(apptPublicId, body, { ownDentistId: dentistId });
}

export async function dentistUpdateAppointmentStatus(dentistId, apptPublicId, uiStatus) {
  return updateAppointmentStatusCore(apptPublicId, uiStatus, { ownDentistId: dentistId });
}

// -------------------- LAB CASE CREATE (dentist self-service) --------------------
export async function dentistGetLabs() {
  const rows = await User.find({ role: "lab", enabled: true })
    .select("name publicId")
    .sort({ name: 1 })
    .lean();
  return rows.map((u) => ({ id: u.publicId, name: u.name || "" }));
}

export async function dentistCreateCase(dentistId, body) {
  const patientKey     = String(body?.patientId || "").trim();
  const labKey         = String(body?.labId || "").trim();
  const sampleTypeKey  = String(body?.sampleTypeId || "").trim();
  const teeth = (Array.isArray(body?.teeth) ? body.teeth : [])
    .map((t) => String(t).replace("#", "").trim())
    .filter(Boolean);
  const note = String(body?.note || body?.notes || "");

  if (!patientKey)    throw Object.assign(new Error("patientId is required"), { status: 400 });
  if (!labKey)        throw Object.assign(new Error("labId is required"), { status: 400 });
  if (!sampleTypeKey) throw Object.assign(new Error("sampleTypeId is required"), { status: 400 });
  if (!teeth.length)  throw Object.assign(new Error("At least one tooth is required"), { status: 400 });

  const [patient, lab, sampleType] = await Promise.all([
    Patient.findOne({ publicId: patientKey }),
    User.findOne({ role: "lab", publicId: labKey }),
    SampleType.findOne({ publicId: sampleTypeKey }),
  ]);

  if (!patient)    throw Object.assign(new Error("Patient not found"), { status: 404 });
  if (!lab)        throw Object.assign(new Error("Lab not found"), { status: 404 });
  if (!sampleType) throw Object.assign(new Error("Sample type not found"), { status: 404 });

  const created = await LabCase.create({
    patient: patient._id,
    dentist: dentistId,
    lab: lab._id,
    sampleType: sampleType._id,
    teeth,
    note,
    status: "sent",
    timeline: [{ at: new Date(), status: "sent", note: "Created by dentist" }],
  });

  const populated = await LabCase.findById(created._id)
    .populate("patient", "name publicId")
    .populate("dentist", "name publicId")
    .populate("lab", "name publicId")
    .populate("sampleType", "name publicId price")
    .lean();

  return {
    id: populated.publicId,
    patientName: populated.patient?.name || "",
    lab: populated.lab?.name || "",
    sentDate: new Date(populated.createdAt).toISOString().slice(0, 10),
    teeth: populated.teeth || [],
    type: populated.sampleType?.name || "",
    sampleTypePrice: Number(populated.sampleType?.price) || 0,
    tooth: (populated.teeth || []).map((t) => `#${t}`).join(", "),
    date: new Date(populated.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
    status: populated.status,
    note: populated.note || "",
    dentistName: populated.dentist?.name || "",
  };
}

// -------------------- PATIENTS (read-only list for dentist) --------------------
/**
 * Shared patient list, annotated with `isMyPatient` — true when this dentist
 * has an appointment with that patient. Same relationship that grants chart
 * edit rights (assertDentistCanEditChart), so the badge in the UI always
 * matches what the dentist can actually edit.
 */
export async function dentistGetPatients(dentistId, params = {}) {
  const result = await listPatientsCore(params);
  if (!result.rows.length) return result;

  // One indexed query for this dentist's patient set, resolved to publicIds
  // so it can be matched against the already-mapped rows.
  const patientObjectIds = await Appointment.distinct("patient", { dentist: dentistId });
  if (!patientObjectIds.length) {
    return { ...result, rows: result.rows.map((r) => ({ ...r, isMyPatient: false })) };
  }

  const mine = await Patient.find({ _id: { $in: patientObjectIds } }).select("publicId").lean();
  const minePublicIds = new Set(mine.map((p) => p.publicId));

  return {
    ...result,
    rows: result.rows.map((r) => ({ ...r, isMyPatient: minePublicIds.has(r.id) })),
  };
}

// -------------------- ODONTOGRAM (dentist writes: patients they treat) --------------------
/**
 * PERMISSION RULE (appointment-based).
 *
 * A dentist may write a patient's tooth chart / per-tooth clinical record
 * when they have ANY appointment booked with that patient — booking the visit
 * is what makes them that patient's treating dentist. There is no
 * primaryDentist concept driving this: patients routinely exist with no
 * assigned dentist, so keying off an assignment field locks almost everyone
 * out. Any appointment (any date, any status) counts, so a dentist can chart
 * before, during, or after the visit.
 *
 * A dentist with NO appointment for the patient gets 403.
 * Owner never reaches this path (unrestricted via the owner service).
 *
 * Exported so the per-tooth prescription path reuses the identical rule
 * instead of re-implementing it.
 */
export async function assertDentistCanEditChart(dentistId, patientPublicId) {
  const patient = await Patient.findOne({ publicId: String(patientPublicId || "").trim() }).select("_id");
  if (!patient) throw Object.assign(new Error("Patient not found"), { status: 404 });

  // Indexed on { patient, dentist } individually — cheap existence check.
  const hasAppointment = await Appointment.exists({ patient: patient._id, dentist: dentistId });
  if (hasAppointment) return patient;

  const err = new Error("You can only edit the tooth chart of a patient you have an appointment with");
  err.status = 403;
  throw err;
}

export async function dentistUpdateOdontogram(dentistId, patientPublicId, body) {
  await assertDentistCanEditChart(dentistId, patientPublicId);
  return upsertOdontogramEntry(patientPublicId, body, dentistId);
}

// -------------------- CLINICAL MASTER (for dentist) --------------------
export async function dentistGetClinicalMaster() {
  const doc = await ClinicalMaster.findById("CLINICAL-MASTER").lean();

  if (!doc) {
    return {
      treatments: [],
      diagnosisTemplates: [],
      clinicalFindingTemplates: [],
    };
  }

  // Treatments carried a raw `fee` straight out of the config doc, which would
  // bypass fee schedules entirely. Project them through the shared resolver
  // (default schedule => legacy `fee`, so the dentist sees the same number).
  const defaultScheduleId = defaultScheduleIdFrom(doc);

  return {
    treatments: (doc.treatments || [])
      .filter((t) => t.active !== false)
      .map((t) => ({ ...t, fee: getTreatmentFee(t, defaultScheduleId, defaultScheduleId) })),
    diagnosisTemplates: (doc.diagnosisTemplates || []).filter((d) => d.active !== false),
    clinicalFindingTemplates: (doc.clinicalFindingTemplates || []).filter((f) => f.active !== false),
  };
}

// =====================================================
// ✅ MY FINANCE
// =====================================================
export async function dentistGetFinance(dentistId) {
  const user = await User.findById(dentistId).lean();
  if (!user) throw new Error("Dentist not found");
  return dentistFinance(user.publicId);
}

// -------------------- MEDICATIONS --------------------
export async function dentistSearchMedications(q, limit) {
  return searchMedications(q, limit);
}

export async function dentistCreateOrGetMedication(user, body) {
  return createOrGetMedication(body, user);
}

export async function dentistListMedications(query = {}) {
  return listMedications(query);
}