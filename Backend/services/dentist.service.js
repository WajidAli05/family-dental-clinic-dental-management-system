//dentist services
import User from "../models/User.model.js";
import Appointment from "../models/Appointment.model.js";
import LabCase from "../models/LabCase.model.js";
import Prescription from "../models/Prescription.model.js";
import ClinicalMaster from "../models/ClinicalMaster.model.js";
import { parsePagination, paginateArray, buildSort } from "./shared/paginate.js";

const pick = (obj, keys) =>
  keys.reduce((acc, k) => {
    if (obj?.[k] !== undefined) acc[k] = obj[k];
    return acc;
  }, {});

const todayISO = () => new Date().toISOString().slice(0, 10);

const makeRxId = () =>
  `RX-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

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
export async function dentistGetStats(dentistId) {
  const date = todayISO();

  const [appointmentsToday, completedToday, pendingLab, prescriptionsToday] =
    await Promise.all([
      Appointment.countDocuments({ dentist: dentistId, date }),
      Appointment.countDocuments({ dentist: dentistId, date, status: "completed" }),
      LabCase.countDocuments({
        dentist: dentistId,
        status: { $in: ["sent", "in_progress", "ready", "delivered"] },
      }),
      Prescription.countDocuments({
        date,
        dentistName: { $exists: true, $ne: "" },
      }),
    ]);

  return {
    appointmentsToday,
    patientsSeen: completedToday,
    pendingLab,
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
  const { page: P, limit: L, skip, sortDir: sd, sortBy: sb } = parsePagination({ page, limit, sortBy, sortDir });
  const query = { dentist: dentistId };
  const d = String(date || "").trim();
  if (d) query.date = d;
  const sort = buildSort(sb, sd, { date: -1, time: 1 });
  const [total, rows] = await Promise.all([
    Appointment.countDocuments(query),
    Appointment.find(query).populate("patient", "name publicId mr").sort(sort).skip(skip).limit(L).lean(),
  ]);
  const mapped = rows.map((a) => ({
    id: a.publicId,
    patientId: a.patient?.publicId || "",
    mr: a.patient?.mr || null,
    patientName: a.patient?.name || "",
    date: a.date,
    time: a.time,
    reason: a.reason,
    status: a.status,
    original: a,
  }));
  return { rows: mapped, total, page: P, pages: Math.max(1, Math.ceil(total / L)) };
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
    .populate("sampleType", "name publicId")
    .sort(sort)
    .lean();

  let mapped = rows.map((c) => ({
    id: c.publicId,
    patientName: c.patient?.name || "",
    lab: c.lab?.name || "",
    sentDate: c.createdAtISO || new Date(c.createdAt).toISOString().slice(0, 10),
    teeth: Array.isArray(c.teeth) ? c.teeth : [],
    type: c.sampleType?.name || "",
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

export async function dentistApproveCase(dentistId, casePublicId) {
  const c = await LabCase.findOne({ publicId: casePublicId, dentist: dentistId });
  if (!c) throw new Error("Case not found");

  c.status = "approved";
  c.timeline.push({
    at: new Date().toISOString().slice(0, 16).replace("T", " "),
    status: "approved",
    note: "Approved by dentist",
  });

  await c.save();
  return c.toJSON();
}

// -------------------- PRESCRIPTIONS --------------------
export async function dentistCreatePrescription(user, body) {
  const dentistName = user?.name || "";
  const date = body?.date || todayISO();

  const patientId = body?.patientId || "";
  if (!patientId) throw new Error("patientId is required");

  const payload = {
    patientType: body?.patientType ?? null,
    selectedTeeth: Array.isArray(body?.selectedTeeth) ? body.selectedTeeth : [],
    diagnosis: body?.diagnosis || "",
    treatment: body?.treatment || "",
    clinicalFinding: body?.clinicalFinding || "",
    visualStatus: body?.visualStatus || "none",
    notes: body?.notes || "",
    patientId,
    dentistName,
    date,
  };

  // ✅ if already exists for same dentist+patient+date => UPDATE instead of duplicate
  const existing = await Prescription.findOne({ dentistName, patientId, date });
  if (existing) {
    Object.assign(existing, payload);
    await existing.save();
    return existing.toJSON();
  }

  const doc = await Prescription.create({
    _id: makeRxId(),
    ...payload,
  });

  return doc.toJSON();
}

// ✅ used by FE for Edit + Print (load by id)
export async function dentistGetPrescriptionById(user, rxId) {
  const dentistName = user?.name || "";

  const rx = await Prescription.findById(rxId).lean();
  if (!rx) throw new Error("Prescription not found");

  // simple ownership check
  if (rx.dentistName && dentistName && rx.dentistName !== dentistName) {
    throw new Error("Forbidden");
  }

  return rx;
}

// ✅ update route (PATCH /prescriptions/:id)
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
    "diagnosis",
    "treatment",
    "clinicalFinding",
    "visualStatus",
    "notes",
    "patientId",
    "date",
  ]);

  // enforce array if present
  if (allowed.selectedTeeth && !Array.isArray(allowed.selectedTeeth)) {
    throw new Error("selectedTeeth must be an array");
  }

  Object.assign(rx, allowed);

  // keep dentistName consistent
  if (dentistName) rx.dentistName = dentistName;

  await rx.save();
  return rx.toJSON();
}

// ✅ used by FE to build rxMap for today appointments:
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

  return { rows, total, page: P, pages: Math.max(1, Math.ceil(total / L)) };
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

  return {
    treatments: (doc.treatments || []).filter((t) => t.active !== false),
    diagnosisTemplates: (doc.diagnosisTemplates || []).filter((d) => d.active !== false),
    clinicalFindingTemplates: (doc.clinicalFindingTemplates || []).filter((f) => f.active !== false),
  };
}