import mongoose from "mongoose";
import User from "../models/User.model.js";
import Patient from "../models/Patient.model.js";
import Appointment from "../models/Appointment.model.js";
import LabCase from "../models/LabCase.model.js";
import LabBill from "../models/LabBill.model.js";
import SampleType from "../models/SampleType.model.js";
import Invoice from "../models/Invoice.model.js";

const pick = (obj, keys) =>
  keys.reduce((acc, k) => {
    if (obj?.[k] !== undefined) acc[k] = obj[k];
    return acc;
  }, {});

  const isObjectId = (v) => mongoose.Types.ObjectId.isValid(String(v));

const todayISO = () => new Date().toISOString().slice(0, 10);

const normalizeStatus = (s) => String(s || "").trim().toLowerCase();
const pad = (n, width = 4) => String(n).padStart(width, "0");
const cleanPhone = (s) => String(s || "").replace(/[^\d]/g, ""); // digits only

// -------------------- STATUS MAPPERS --------------------

// APPOINTMENTS
function toDbAppointmentStatus(ui) {
  const v = String(ui || "").trim().toLowerCase();

  if (v === "scheduled") return "scheduled";
  if (v === "checked in" || v === "checked_in") return "checked_in";
  if (v === "completed") return "completed";
  if (v === "cancelled" || v === "canceled") return "cancelled";
  if (v === "no show" || v === "no_show") return "no_show";

  // default safe:
  return "scheduled";
}

function toUiAppointmentStatus(db) {
  const v = String(db || "").trim().toLowerCase();

  if (v === "scheduled") return "Scheduled";
  if (v === "checked_in") return "Checked In";
  if (v === "completed") return "Completed";
  if (v === "cancelled" || v === "canceled") return "Cancelled";
  if (v === "no_show") return "No Show";

  return "Scheduled";
}

// LAB SAMPLES
function toDbLabStatus(ui) {
  const v = String(ui || "").trim().toLowerCase();
  if (v === "sent") return "sent";
  if (v === "in process" || v === "in_process" || v === "in-progress" || v === "in_progress")
    return "in_progress";
  if (v === "ready") return "ready";
  if (v === "delivered") return "delivered";
  if (v === "approved") return "approved";
  if (v === "rejected") return "rejected";
  if (v === "received") return "received";
  return "sent";
}

function toUiLabStatus(db) {
  const v = String(db || "").trim().toLowerCase();
  if (v === "sent" || v === "received") return "Sent";
  if (v === "in_progress" || v === "in-process") return "In Process";
  if (v === "ready") return "Ready";
  if (v === "delivered") return "Delivered";
  if (v === "approved") return "Approved";
  if (v === "rejected") return "Rejected";
  return "Sent";
}

function mapCase(c) {
  const teethArr = Array.isArray(c?.teeth)
    ? c.teeth.map((t) => String(t).replace("#", "").trim()).filter(Boolean)
    : [];

  return {
    id: c.publicId,

    patientName: c.patient?.name || "",
    dentistName: c.dentist?.name || "",
    labName: c.lab?.name || "",

    // ✅ THIS is what your store uses first
    teeth: teethArr,

    // ✅ store fallback uses x.tooth (string)
    tooth: teethArr.map((t) => `#${t}`).join(", "),

    status: c.status,
    note: c.note || "",

    // ✅ store uses x.date for sentDate
    date: new Date(c.createdAt).toISOString().slice(0, 10),
  };
}

async function generateAppointmentPublicId() {
  let n = (await Appointment.countDocuments({})) + 1;

  while (true) {
    const publicId = `AP-${pad(n)}`;
    const exists = await Appointment.exists({ publicId });
    if (!exists) return publicId;
    n += 1;
  }
}
// -------------------- ME --------------------
export async function receptionistGetMe(receptionistId) {
  const user = await User.findById(receptionistId).lean();
  if (!user) throw new Error("Receptionist not found");
  return user;
}

export async function receptionistUpdateMe(receptionistId, body) {
  const allowed = pick(body, ["name", "email", "phone"]);
  const updated = await User.findByIdAndUpdate(
    receptionistId,
    { $set: allowed },
    { new: true }
  );

  if (!updated) throw new Error("Receptionist not found");
  return updated.toJSON();
}

export async function receptionistChangePassword(
  receptionistId,
  { currentPassword, newPassword }
) {
  if (!currentPassword || !newPassword)
    throw new Error("currentPassword and newPassword are required");

  const user = await User.findById(receptionistId).select("+passwordHash");
  if (!user) throw new Error("Receptionist not found");

  const ok = await user.verifyPassword(currentPassword);
  if (!ok) throw new Error("Current password is incorrect");

  await user.setPassword(newPassword);
  user.forcePasswordChange = false;
  await user.save();

  return { message: "Password updated" };
}

// -------------------- STATS --------------------
export async function receptionistGetStats(_receptionistId, { date } = {}) {
  const d = date || todayISO();

  const [appointmentsToday, activePatients, pendingLabSamples, todayRevenue] =
    await Promise.all([
      Appointment.countDocuments({ date: d }),
      Patient.countDocuments({}), // if you have an "active" flag, we can use it later
      LabCase.countDocuments({
        status: { $in: ["sent", "in_progress", "ready"] },
      }),
      sumRevenueForDate(d),
    ]);

  return {
    appointmentsToday,
    activePatients,
    pendingLabSamples,
    todayRevenue,
  };
}

async function sumRevenueForDate(dateISO) {
  // Defensive: if billing module differs, return 0 instead of breaking dashboard
  try {
    const start = new Date(dateISO);
    const end = new Date(dateISO);
    end.setDate(end.getDate() + 1);

    // common patterns: createdAt or date field
    const rows = await LabBill.find({
      createdAt: { $gte: start, $lt: end },
    }).lean();

    // if your bill has "total"/"grandTotal"/"amountPaid" etc, this handles most
    const total = rows.reduce((sum, r) => {
      const v =
        Number(r.total ?? r.grandTotal ?? r.amount ?? r.amountPaid ?? 0) || 0;
      return sum + v;
    }, 0);

    return total;
  } catch {
    return 0;
  }
}

// -------------------- APPOINTMENTS --------------------
export async function receptionistGetAppointments(_receptionistId, { date } = {}) {
  const d = date || todayISO();

  const rows = await Appointment.find({ date: d })
    .populate("patient", "name publicId mr")
    .populate("dentist", "name publicId")
    .sort({ time: 1 })
    .lean();

  // ✅ match your receptionist table: patient, dentist, time, status
  return rows.map((a) => ({
    id: a.publicId,
    patient: a.patient?.name || "",
    dentist: a.dentist?.name || "",
    time: a.time || "",
    status: humanizeAppointmentStatus(a.status),
    // keep extra fields for later screens (safe)
    date: a.date,
    patientId: a.patient?.publicId || "",
    dentistId: a.dentist?.publicId || "",
    reason: a.reason || "",
    original: a,
  }));
}

function humanizeAppointmentStatus(status) {
  const s = normalizeStatus(status);
  if (!s) return "Scheduled";
  if (s === "scheduled") return "Scheduled";
  if (s === "completed") return "Completed";
  if (s === "cancelled" || s === "canceled") return "Cancelled";
  if (s === "in_progress") return "In Progress";
  return status;
}

// -------------------- LAB SAMPLES (for home table) --------------------
export async function receptionistGetLabSamples(_receptionistId, { date } = {}) {
  const d = date || todayISO();

  const start = new Date(`${d}T00:00:00.000Z`);
  const end = new Date(`${d}T23:59:59.999Z`);

  const rows = await LabCase.find({ createdAt: { $gte: start, $lt: end } })
    .populate("patient", "name publicId mr phone")
    .populate("dentist", "name publicId specialization")
    .populate("lab", "name publicId")
    .populate("sampleType", "name publicId")
    .sort({ createdAt: -1 })
    .lean();

  // For home widget/table you can return mapCase or a smaller shape.
  // Keeping mapCase is safe and consistent with your store mapping.
  return rows.map(mapCase);
}

function humanizeLabStatus(status) {
  const s = normalizeStatus(status);
  if (!s) return "Pending";
  if (s === "sent") return "Sent";
  if (s === "in_progress") return "In Process";
  if (s === "ready") return "Ready";
  if (s === "delivered") return "Delivered";
  if (s === "approved") return "Approved";
  return status;
}

// -------------------- QUICK ACTIONS (MODALS) --------------------

// Robust enough for most clinics (and matches your PT-0001 style)
async function generatePatientPublicId() {
  // Using count as a base is OK for small systems.
  // To avoid collisions, we loop if it already exists.
  let n = (await Patient.countDocuments({})) + 1;

  while (true) {
    const publicId = `PT-${pad(n)}`;
    const exists = await Patient.exists({ publicId });
    if (!exists) return { publicId, mr: n };
    n += 1;
  }
}

export async function receptionistCreatePatient(_user, body) {
  const name = String(body?.name || "").trim();
  const phone = String(body?.phone || "").trim();
  const address = String(body?.address || "").trim();

  if (!name) throw new Error("name is required");
  if (!phone) throw new Error("phone is required");
  if (!address) throw new Error("address is required");

  const ageNum =
    body?.age !== undefined && body?.age !== null && body?.age !== ""
      ? Number(body.age)
      : null;

  if (ageNum !== null && (Number.isNaN(ageNum) || ageNum < 1 || ageNum > 120)) {
    throw new Error("Valid age is required (1-120)");
  }

  // prevent duplicates by phone (optional but recommended)
  const existing = await Patient.findOne({ phone });
  if (existing) throw new Error("Patient with this phone already exists");

  const { publicId, mr } = await generatePatientPublicId();

  const payload = {
    publicId, // ✅ FIX: required by schema
    mr,       // ✅ in case schema requires mr
    name,
    phone,
    address,
    gender: body?.gender ? String(body.gender) : null,
    email: body?.email ? String(body.email).trim() : "",
    lastVisit: body?.lastVisit ? String(body.lastVisit) : "",
  };

  if (ageNum !== null) payload.age = ageNum;

  const created = await Patient.create(payload);

  // Return frontend-friendly row
  return {
    id: created.publicId,
    name: created.name || "",
    phone: created.phone || "",
    age: created.age ?? "",
    lastVisit: created.lastVisit || "",
    status: "Active",
    original: created.toJSON(),
  };
}

// ---------- DENTISTS LIST ----------
export async function receptionistGetDentists(_receptionistId) {
  const rows = await User.find({ role: "dentist" })
    .select("name publicId specialization available")
    .sort({ name: 1 })
    .lean();

  return rows.map((d) => ({
    id: d.publicId || String(d._id),
    name: d.name || "",
    specialization: d.specialization || "",
    available: d.available ?? true,
  }));
}

// ---------- PATIENT LOOKUP (MR/publicId/phone) ----------
export async function receptionistLookupPatient(_receptionistId, { q } = {}) {
  const needle = String(q || "").trim();
  if (!needle) throw new Error("q is required");

  // match MR (number), publicId (PT-0001), or phone
  const phoneDigits = cleanPhone(needle);

  const or = [];

  // publicId exact
  if (/^PT-\d+$/i.test(needle)) {
    or.push({ publicId: needle.toUpperCase() });
  }

  // MR as number (if schema has mr)
  if (/^\d+$/.test(needle)) {
    or.push({ mr: Number(needle) });
    // also try publicId from MR (PT-0001 style) as fallback:
    or.push({ publicId: `PT-${String(needle).padStart(4, "0")}` });
  }

  // phone search: try full digits match
  if (phoneDigits.length >= 10) {
    // store might include +92/0 — we search by regex on digits
    // If phone stored with formatting, prefer exact raw match too
    or.push({ phone: { $regex: phoneDigits.slice(-10) } });
    or.push({ phone: { $regex: phoneDigits } });
  }

  // fallback name search (optional)
  or.push({ name: { $regex: needle, $options: "i" } });

  const patient = await Patient.findOne({ $or: or }).lean();
  if (!patient) throw new Error("Patient not found. Please register patient first.");

  return {
    id: patient.publicId || String(patient.mr || patient._id),
    mr: patient.mr ?? null,
    name: patient.name || "",
    gender: patient.gender || "",
    age: patient.age ?? "",
    phone: patient.phone || "",
    address: patient.address || "",
    lastVisit: patient.lastVisit || "",
    original: patient,
  };
}

// ---------- CREATE APPOINTMENT ----------
export async function receptionistCreateAppointment(_user, body) {
  const date = String(body?.date || "").trim();
  const time = String(body?.time || "").trim();
  const reason = String(body?.reason || "").trim();

  const patientKey = body?.patientId || body?.mr || body?.phone;
  const dentistKey = body?.dentistId || body?.dentist || body?.dentistName;

  if (!patientKey) throw new Error("patientId (or mr/phone) is required");
  if (!dentistKey) throw new Error("dentistId (or dentist) is required");
  if (!date) throw new Error("date is required");
  if (!time) throw new Error("time is required");

  // ✅ PATIENT: support ObjectId OR publicId OR mr OR phone
  const patientOr = [];

  if (isObjectId(patientKey)) patientOr.push({ _id: patientKey });

  // if frontend sends PT-0012
  patientOr.push({ publicId: String(patientKey).toUpperCase() });

  // MR numeric
  if (/^\d+$/.test(String(patientKey))) {
    patientOr.push({ mr: Number(patientKey) });
    patientOr.push({ publicId: `PT-${String(patientKey).padStart(4, "0")}` });
  }

  // phone
  patientOr.push({ phone: String(patientKey) });

  const patient = await Patient.findOne({ $or: patientOr });
  if (!patient) throw new Error("Patient not found");

  // ✅ DENTIST: support ObjectId OR publicId OR name
  const dentistOr = [];
  if (isObjectId(dentistKey)) dentistOr.push({ _id: dentistKey });
  dentistOr.push({ publicId: String(dentistKey) });
  dentistOr.push({ name: String(dentistKey) });

  const dentist = await User.findOne({ role: "dentist", $or: dentistOr });
  if (!dentist) throw new Error("Dentist not found");

  // ✅ prevent double booking
  const conflict = await Appointment.findOne({
    dentist: dentist._id,
    date,
    time,
    status: { $ne: "cancelled" },
  });
  if (conflict) throw new Error("Dentist already has an appointment at this time");

  const publicId = await generateAppointmentPublicId();

const created = await Appointment.create({
  publicId,               // ✅ FIX: required by schema
  patient: patient._id,
  dentist: dentist._id,
  date,
  time,
  reason,
  status: "scheduled",
});

  const populated = await Appointment.findById(created._id)
    .populate("patient", "name publicId mr phone gender age")
    .populate("dentist", "name publicId specialization")
    .lean();

  return {
    id: populated.publicId,
    mr: populated.patient?.mr ?? null,
    patientId: populated.patient?.publicId || "",
    patientName: populated.patient?.name || "",
    dentistId: populated.dentist?.publicId || "",
    dentist: populated.dentist?.name || "",
    specialization: populated.dentist?.specialization || "",
    date: populated.date,
    time: populated.time,
    reason: populated.reason || "",
    status: populated.status,
    original: populated,
  };
}

function calcAge(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

function isoToPretty(iso) {
  if (!iso) return "";
  // if it's already "YYYY-MM-DD"
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return String(iso);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

// Active/Inactive rule (safe default):
// Active if last visit within last 180 days
function computeStatus(lastVisitISO) {
  if (!lastVisitISO) return "Inactive";
  const lv = new Date(lastVisitISO);
  if (Number.isNaN(lv.getTime())) return "Inactive";
  const diffDays = (Date.now() - lv.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 180 ? "Active" : "Inactive";
}

// -------------------- PATIENTS LIST --------------------
export async function receptionistGetPatients(_receptionistId, { q, limit, page } = {}) {
  const L = Math.min(Math.max(parseInt(limit || "50", 10), 1), 200);
  const P = Math.max(parseInt(page || "1", 10), 1);
  const skip = (P - 1) * L;

  const filter = {};
  const needle = String(q || "").trim();
  if (needle) {
    // simple text search across common fields
    filter.$or = [
      { name: { $regex: needle, $options: "i" } },
      { phone: { $regex: needle, $options: "i" } },
      { address: { $regex: needle, $options: "i" } },
      { publicId: { $regex: needle, $options: "i" } },
    ];
  }

  const patients = await Patient.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(L)
    .lean();

  // Fetch last visit per patient using appointments (fast + accurate)
  const patientIds = patients.map((p) => p._id);

  const lastVisits = await Appointment.aggregate([
    { $match: { patient: { $in: patientIds } } },
    { $sort: { date: -1, createdAt: -1 } },
    { $group: { _id: "$patient", lastVisit: { $first: "$date" } } },
  ]);

  const lastVisitMap = new Map(lastVisits.map((x) => [String(x._id), x.lastVisit]));

  return patients.map((p) => {
    const lastVisitISO = lastVisitMap.get(String(p._id)) || p.lastVisit || null;

    return {
      // ✅ PatientTable expects patient.id
      id: p.publicId || String(p.mr || p._id),

      name: p.name || "",
      phone: p.phone || "",
      age: p.age ?? calcAge(p.dob) ?? "",

      // ✅ PatientTable expects lastVisit string
      lastVisit: isoToPretty(lastVisitISO),

      // ✅ PatientTable expects status: "Active" | "Inactive"
      status: computeStatus(lastVisitISO),

      // keep safe extras for future pages (won’t break table)
      mr: p.mr ?? null,
      address: p.address ?? "",
      registrationDate: isoToPretty(p.createdAt || p.registrationDate),
      original: p,
    };
  });
}

// -------------------- PATIENT STATS --------------------
export async function receptionistGetPatientStats(_receptionistId) {
  const totalPatients = await Patient.countDocuments({});

  // Active patients = last visit within 180 days (based on appointments)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 180);
  const cutoffISO = cutoff.toISOString().slice(0, 10);

  const activePatientsAgg = await Appointment.aggregate([
    { $match: { date: { $gte: cutoffISO } } },
    { $group: { _id: "$patient" } },
    { $count: "count" },
  ]);
  const activePatients = activePatientsAgg?.[0]?.count || 0;

  // Pending lab samples: safe status set (align with your UI "In Process")
  const pendingLabSamples = await LabCase.countDocuments({
    status: { $in: ["sent", "in_progress", "ready"] },
  });

  // Pending invoices + totalRevenue: defensive (schema can vary)
  let pendingInvoices = 0;
  let totalRevenue = 0;

  try {
    const bills = await LabBill.find({}).lean();
    totalRevenue = bills.reduce((sum, b) => {
      const v =
        Number(b.total ?? b.grandTotal ?? b.amount ?? b.amountPaid ?? 0) || 0;
      return sum + v;
    }, 0);

    pendingInvoices = bills.reduce((sum, b) => {
      const st = String(b.status || "").toLowerCase();
      if (st === "pending" || st === "unpaid") return sum + 1;
      return sum;
    }, 0);
  } catch {
    // If LabBill schema differs or not used here, we keep 0 and dashboard won't crash
    pendingInvoices = 0;
    totalRevenue = 0;
  }

  return {
    totalPatients,
    activePatients,
    pendingLabSamples,
    pendingInvoices,
    totalRevenue,
  };
}


// ✅ List appointments for receptionist UI
export async function receptionistListAppointments(_receptionistId, { date, dentist, status, q } = {}) {
  const filter = {};

  // If no date filter provided, you can default to today+future; keeping it flexible:
  // filter.date = { $gte: todayISO() };
  if (date) filter.date = String(date);

  // Status filtering (UI uses "Completed"/"Cancelled"/"Scheduled")
  if (status && status !== "All") {
    filter.status = toDbStatus(status);
  }

  // We'll filter by dentist NAME at the mapping stage (safer if dentist is populated)
  const rows = await Appointment.find(filter)
    .populate("patient", "name publicId mr phone age gender")
    .populate("dentist", "name publicId specialization")
    .sort({ date: 1, time: 1 })
    .lean();

  let mapped = rows.map((a) => ({
    id: a.publicId, // ✅ your UI passes this into updateAppointmentStatus
    mr: a.patient?.mr ?? null,
    patientId: a.patient?.publicId || "",
    patientName: a.patient?.name || "",
    dentistId: a.dentist?.publicId || "",
    dentist: a.dentist?.name || "",
    specialization: a.dentist?.specialization || "",
    date: a.date,
    time: a.time,
    reason: a.reason || "",
    status: toUiAppointmentStatus(a.status),
    original: a,
  }));

  // Dentist name filter (UI uses dentist string)
  if (dentist && dentist !== "All") {
    const dn = String(dentist).toLowerCase();
    mapped = mapped.filter((x) => String(x.dentist).toLowerCase() === dn);
  }

  // Optional search
  const needle = String(q || "").trim().toLowerCase();
  if (needle) {
    mapped = mapped.filter((x) =>
      `${x.id} ${x.patientName} ${x.dentist} ${x.reason} ${x.status} ${x.date} ${x.time}`
        .toLowerCase()
        .includes(needle)
    );
  }

  return mapped;
}

// ✅ Update status by publicId
export async function receptionistUpdateAppointmentStatus(_receptionistId, apptPublicId, { status }) {
  const uiStatus = String(status || "").trim();
  if (!uiStatus) throw new Error("status is required");

  const dbStatus = toDbAppointmentStatus(uiStatus);

  const appt = await Appointment.findOne({ publicId: apptPublicId });
  if (!appt) throw new Error("Appointment not found");

  appt.status = dbStatus;
  await appt.save();

  const populated = await Appointment.findById(appt._id)
    .populate("patient", "name publicId mr phone age gender")
    .populate("dentist", "name publicId specialization")
    .lean();

  return {
    id: populated.publicId,
    mr: populated.patient?.mr ?? null,
    patientId: populated.patient?.publicId || "",
    patientName: populated.patient?.name || "",
    dentistId: populated.dentist?.publicId || "",
    dentist: populated.dentist?.name || "",
    specialization: populated.dentist?.specialization || "",
    date: populated.date,
    time: populated.time,
    reason: populated.reason || "",
    status: toUiAppointmentStatus(populated.status),
    original: populated,
  };
}



// ---------- LIST ----------
export async function receptionistListLabSamples(_receptionistId, { status, q, date } = {}) {
  const filter = {}; // ✅ MUST exist

  // ✅ Date filter (your schema does NOT have createdAtISO)
  if (date) {
    const d = String(date);
    filter.createdAt = {
      $gte: new Date(`${d}T00:00:00.000Z`),
      $lt: new Date(`${d}T23:59:59.999Z`),
    };
  }

if (status && status !== "All") filter.status = toDbLabStatus(status);

  const rows = await LabCase.find(filter)
    .populate("patient", "name publicId mr phone")
    .populate("dentist", "name publicId")
    .populate("lab", "name publicId")
    .populate("sampleType", "name publicId")
    .sort({ createdAt: -1 })
    .lean();

  let mapped = rows.map((c) => mapCase(c));

  const needle = String(q || "").trim().toLowerCase();
  if (needle) {
    mapped = mapped.filter((x) =>
      `${x.id} ${x.patientName} ${x.dentistName} ${x.labName} ${x.tooth} ${x.status} ${x.note}`
        .toLowerCase()
        .includes(needle)
    );
  }

  return mapped;
}

// ---------- CREATE ----------
// Expected body (safe default):
// { patientId (PT-0001), dentistId (DT-0001) OR dentistName, labId, sampleTypeId, teeth: [..], notes }
export async function receptionistCreateLabSample(_user, body) {
  const patientKey = String(body?.patientId || "").trim();
  if (!patientKey) throw new Error("patientId is required");

  // ✅ FIX: read teeth from body, sanitize, ensure array of strings
  const teeth = (Array.isArray(body?.teeth) ? body.teeth : [])
    .map((t) => String(t).replace("#", "").trim())
    .filter(Boolean);

  if (!teeth.length) throw new Error("teeth are required");

  // ✅ FIX: schema field is `note`
  const note = String(body?.notes || body?.note || "");

  const dentistKey = body?.dentistId || body?.dentistName || body?.dentist;
  const labKey = body?.labId || body?.lab;
  const sampleTypeKey = body?.sampleTypeId || body?.sampleType;

  if (!dentistKey) throw new Error("dentistId is required");
  if (!labKey) throw new Error("labId is required");
  if (!sampleTypeKey) throw new Error("sampleTypeId is required");

  const patient = await Patient.findOne({ publicId: patientKey });
  if (!patient) throw new Error("Patient not found");

  const dentist = await User.findOne({
    role: "dentist",
    $or: [{ publicId: String(dentistKey) }, { name: String(dentistKey) }],
  });
  if (!dentist) throw new Error("Dentist not found");

  const lab = await User.findOne({
    role: "lab",
    $or: [{ publicId: String(labKey) }, { name: String(labKey) }],
  });
  if (!lab) throw new Error("Lab not found");

  const sampleType = await SampleType.findOne({
    $or: [{ publicId: String(sampleTypeKey) }, { name: String(sampleTypeKey) }],
  });
  if (!sampleType) throw new Error("Sample type not found");

  const created = await LabCase.create({
    patient: patient._id,
    dentist: dentist._id,
    lab: lab._id,
    sampleType: sampleType._id,
    teeth,                 // ✅ correct
    note,                  // ✅ correct (not notes)
    status: "sent",
    timeline: [
      {
        at: new Date(),     // ✅ Date not string
        status: "sent",
        note: "Created by receptionist",
      },
    ],
  });

  const populated = await LabCase.findById(created._id)
    .populate("patient", "name publicId mr phone")
    .populate("dentist", "name publicId")
    .populate("lab", "name publicId")
    .populate("sampleType", "name publicId")
    .lean();

  return mapCase(populated);
}

// ---------- EDIT ----------
export async function receptionistUpdateLabSample(_user, casePublicId, body) {
  const c = await LabCase.findOne({ publicId: casePublicId });
  if (!c) throw new Error("Sample not found");

  // ✅ update lab by publicId (dropdown sends labId)
  if (body?.labId) {
    const lab = await User.findOne({ role: "lab", publicId: String(body.labId) }).select("_id");
    if (!lab) throw new Error("Lab not found");
    c.lab = lab._id;
  }

  // ✅ update teeth (array required) + sanitize
  if (body?.teeth !== undefined) {
    if (!Array.isArray(body.teeth)) throw new Error("teeth must be an array");
    c.teeth = body.teeth
      .map((t) => String(t).replace("#", "").trim())
      .filter(Boolean);
  }

  // ✅ your schema field is `note` (NOT notes)
  if (body?.notes !== undefined) {
    c.note = String(body.notes || "");
  }

  await c.save();

  const populated = await LabCase.findById(c._id)
    .populate("patient", "name publicId mr phone")
    .populate("dentist", "name publicId")
    .populate("lab", "name publicId")
    .populate("sampleType", "name publicId")
    .lean();

  return mapCase(populated);
}
// ---------- STATUS UPDATE ----------
export async function receptionistUpdateLabSampleStatus(_user, casePublicId, body) {
  const uiStatus = String(body?.status || "").trim();
  if (!uiStatus) throw new Error("status is required");

  const c = await LabCase.findOne({ publicId: casePublicId });
  if (!c) throw new Error("Sample not found");

  const dbStatus = toDbLabStatus(uiStatus);
  c.status = dbStatus;
  c.timeline = c.timeline || [];
c.timeline.push({
  at: new Date(),
  status: dbStatus,
  note: `Updated by receptionist`,
});

  await c.save();

  const populated = await LabCase.findById(c._id)
    .populate("patient", "name publicId mr phone")
    .populate("dentist", "name publicId")
    .populate("lab", "name publicId")
    .populate("sampleType", "name publicId")
    .lean();

  return mapCase(populated);
}

// ---------- DELIVER ----------
export async function receptionistDeliverLabSample(_user, casePublicId) {
  const c = await LabCase.findOne({ publicId: casePublicId });
  if (!c) throw new Error("Sample not found");

  c.status = "delivered";
  c.timeline = c.timeline || [];
c.timeline.push({
  at: new Date(),
  status: "delivered",
  note: "Marked delivered by receptionist",
});

  await c.save();

  const populated = await LabCase.findById(c._id)
    .populate("patient", "name publicId mr phone")
    .populate("dentist", "name publicId")
    .populate("lab", "name publicId")
    .populate("sampleType", "name publicId")
    .lean();

  return mapCase(populated);
}

// ---------- DELETE ----------
export async function receptionistDeleteLabSample(_user, casePublicId) {
  const c = await LabCase.findOne({ publicId: casePublicId });
  if (!c) throw new Error("Sample not found");

  await LabCase.deleteOne({ _id: c._id });
  return { message: "Deleted", id: casePublicId };
}

export async function receptionistGetLabs(_receptionistId) {
  const rows = await User.find({ role: "lab" })
    .select("name publicId")
    .sort({ name: 1 })
    .lean();

  return rows.map((x) => ({
    id: x.publicId || String(x._id),
    name: x.name || "",
  }));
}

export async function receptionistGetSampleTypes(_receptionistId) {
  const rows = await SampleType.find({})
    .select("name publicId")
    .sort({ name: 1 })
    .lean();

  return rows.map((x) => ({
    id: x.publicId || String(x._id),
    name: x.name || "",
  }));
}

//-------------------Billing and Payment----------------------//

// -------------------- BILLING / INVOICES --------------------
const monthISO = (d = new Date()) => {
  const iso = new Date(d).toISOString().slice(0, 10); // YYYY-MM-DD
  return iso.slice(0, 7); // YYYY-MM
};

const toUiInvoice = (inv) => {
  const totalAmount = Number(inv.totalAmount || 0);
  const payments = Array.isArray(inv.payments) ? inv.payments : [];
  const paidAmount = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const status = paidAmount >= totalAmount ? "Paid" : paidAmount > 0 ? "Partial" : "Pending";

  return {
    id: inv.publicId,
    mr: inv.patient?.mr ?? null,
    patientName: inv.patient?.name || "",
    date: inv.date,
    totalAmount,
    paidAmount,
    status,
    payments: payments.map((p) => ({
      id: p.publicId,          // ✅ frontend expects id
      amount: Number(p.amount || 0),
      mode: p.mode,
      date: p.date,
    })),
    original: inv,
  };
};

async function generateInvoicePublicId() {
  let n = (await Invoice.countDocuments({})) + 1001;
  while (true) {
    const publicId = `INV-${n}`;
    const exists = await Invoice.exists({ publicId });
    if (!exists) return publicId;
    n += 1;
  }
}

async function generatePaymentPublicId(invoice) {
  const payments = Array.isArray(invoice?.payments) ? invoice.payments : [];
  return `PAY-${payments.length + 1}`;
}

// ✅ CREATE INVOICE
export async function receptionistCreateInvoice(_user, body) {
  const date = String(body?.date || "").trim();
  const totalAmount = Number(body?.totalAmount);

  const patientKey = body?.patientId || body?.mr || body?.phone;
  const dentistKey = body?.dentistId || body?.dentist || body?.dentistName; // optional

  if (!patientKey) throw new Error("patientId (or mr/phone) is required");
  if (!date) throw new Error("date is required");
  if (!totalAmount || totalAmount <= 0) throw new Error("totalAmount must be > 0");

  // find patient (supports publicId / mr / phone / objectId)
  const patientOr = [];

  if (isObjectId(patientKey)) patientOr.push({ _id: patientKey });
  patientOr.push({ publicId: String(patientKey).toUpperCase() });

  if (/^\d+$/.test(String(patientKey))) {
    patientOr.push({ mr: Number(patientKey) });
    patientOr.push({ publicId: `PT-${String(patientKey).padStart(4, "0")}` });
  }

  // phone
  patientOr.push({ phone: String(patientKey) });

  const patient = await Patient.findOne({ $or: patientOr });
  if (!patient) throw new Error("Patient not found");

  // dentist is optional, but if provided validate
  let dentist = null;
  if (dentistKey) {
    const dentistOr = [];
    if (isObjectId(dentistKey)) dentistOr.push({ _id: dentistKey });
    dentistOr.push({ publicId: String(dentistKey) });
    dentistOr.push({ name: String(dentistKey) });

    dentist = await User.findOne({ role: "dentist", $or: dentistOr }).select("_id");
    if (!dentist) throw new Error("Dentist not found");
  }

  const publicId = await generateInvoicePublicId();

  const created = await Invoice.create({
    publicId,
    patient: patient._id,
    dentist: dentist?._id,
    date,
    totalAmount,
    payments: [],
  });

  const populated = await Invoice.findById(created._id)
    .populate("patient", "name publicId mr phone")
    .populate("dentist", "name publicId specialization")
    .lean();

  return toUiInvoice(populated);
}

// ✅ LIST INVOICES
export async function receptionistListInvoices(_receptionistId, { q, status } = {}) {
  const filter = {};
  // We filter status on the mapped UI side (because status is virtual)
  // Search will also be applied after mapping.

  const rows = await Invoice.find(filter)
    .populate("patient", "name publicId mr phone")
    .populate("dentist", "name publicId specialization")
    .sort({ date: -1, createdAt: -1 })
    .lean({ virtuals: true });

  let mapped = rows.map(toUiInvoice);

  // status filter
  if (status && status !== "All") {
    const st = String(status).trim();
    mapped = mapped.filter((x) => x.status === st);
  }

  // q filter
  const needle = String(q || "").trim().toLowerCase();
  if (needle) {
    mapped = mapped.filter((x) =>
      `${x.id} ${x.patientName} ${x.mr ?? ""} ${x.status} ${x.date}`
        .toLowerCase()
        .includes(needle)
    );
  }

  return mapped;
}

// ✅ BILLING STATS (Invoices + LabBills merged)
export async function receptionistBillingStats(_receptionistId, { month } = {}) {
  const m = String(month || monthISO()).trim(); // "YYYY-MM"

  // invoice stats for month
  const invRows = await Invoice.find({ date: { $regex: `^${m}` } })
    .lean({ virtuals: true });

  const invMapped = invRows.map((inv) => {
    const total = Number(inv.totalAmount || 0);
    const payments = Array.isArray(inv.payments) ? inv.payments : [];
    const paid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const status = paid >= total ? "Paid" : paid > 0 ? "Partial" : "Pending";
    const outstanding = Math.max(0, total - paid);
    return { status, outstanding };
  });

  const pending = invMapped.filter((x) => x.status === "Pending").length;
  const partial = invMapped.filter((x) => x.status === "Partial").length;
  const paid = invMapped.filter((x) => x.status === "Paid").length;
  const outstanding = invMapped.reduce((s, x) => s + x.outstanding, 0);

  // lab bills for month
  const labRows = await LabBill.find({ month: m }).lean();
  const labTotal = labRows.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  return {
    month: m,
    pending,
    partial,
    paid,
    outstanding,
    labTotal,
    grandOutstanding: outstanding + labTotal,
  };
}

// ✅ LIST LAB BILLS (month)
export async function receptionistListLabBills(_receptionistId, { month } = {}) {
  const m = String(month || monthISO()).trim();
  const rows = await LabBill.find({ month: m }).sort({ createdAt: -1 }).lean();
  const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  return { month: m, rows, total };
}

// ✅ ADD PAYMENT
export async function receptionistAddInvoicePayment(_receptionistId, invoicePublicId, body) {
  const amount = Number(body?.amount);
  const mode = String(body?.mode || "").trim();
  const date = String(body?.date || "").trim();

  if (!amount || amount <= 0) throw new Error("amount must be > 0");
  if (!mode) throw new Error("mode is required");
  if (!date) throw new Error("date is required");

  const inv = await Invoice.findOne({ publicId: invoicePublicId });
  if (!inv) throw new Error("Invoice not found");

  inv.payments = inv.payments || [];
  inv.payments.push({
    publicId: await generatePaymentPublicId(inv),
    amount,
    mode,
    date,
  });

  await inv.save();

  const populated = await Invoice.findById(inv._id)
    .populate("patient", "name publicId mr phone")
    .populate("dentist", "name publicId specialization")
    .lean({ virtuals: true });

  return toUiInvoice(populated);
}

// ✅ UPDATE PAYMENT
export async function receptionistUpdateInvoicePayment(_receptionistId, invoicePublicId, paymentPublicId, body) {
  const amount = Number(body?.amount);
  if (!amount || amount <= 0) throw new Error("amount must be > 0");

  const inv = await Invoice.findOne({ publicId: invoicePublicId });
  if (!inv) throw new Error("Invoice not found");

  const p = (inv.payments || []).find((x) => x.publicId === paymentPublicId);
  if (!p) throw new Error("Payment not found");

  p.amount = amount;

  await inv.save();

  const populated = await Invoice.findById(inv._id)
    .populate("patient", "name publicId mr phone")
    .populate("dentist", "name publicId specialization")
    .lean({ virtuals: true });

  return toUiInvoice(populated);
}

// ✅ DELETE PAYMENT
export async function receptionistDeleteInvoicePayment(_receptionistId, invoicePublicId, paymentPublicId) {
  const inv = await Invoice.findOne({ publicId: invoicePublicId });
  if (!inv) throw new Error("Invoice not found");

  const before = (inv.payments || []).length;
  inv.payments = (inv.payments || []).filter((x) => x.publicId !== paymentPublicId);

  if (inv.payments.length === before) throw new Error("Payment not found");

  await inv.save();

  const populated = await Invoice.findById(inv._id)
    .populate("patient", "name publicId mr phone")
    .populate("dentist", "name publicId specialization")
    .lean({ virtuals: true });

  return toUiInvoice(populated);
}