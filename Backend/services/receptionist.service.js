import User from "../models/User.model.js";
import Patient from "../models/Patient.model.js";
import Appointment from "../models/Appointment.model.js";
import LabCase from "../models/LabCase.model.js";
import LabBill from "../models/LabBill.model.js";

const pick = (obj, keys) =>
  keys.reduce((acc, k) => {
    if (obj?.[k] !== undefined) acc[k] = obj[k];
    return acc;
  }, {});

const todayISO = () => new Date().toISOString().slice(0, 10);

const normalizeStatus = (s) => String(s || "").trim().toLowerCase();
const pad = (n, width = 4) => String(n).padStart(width, "0");

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
  // Home table doesn't show date, but we can optionally filter by today or show recent
  const d = date || todayISO();

  const start = new Date(d);
  const end = new Date(d);
  end.setDate(end.getDate() + 1);

  const rows = await LabCase.find({
    createdAt: { $gte: start, $lt: end },
  })
    .populate("patient", "name publicId")
    .populate("lab", "name publicId")
    .populate("sampleType", "name publicId")
    .sort({ createdAt: -1 })
    .lean();

  // ✅ match receptionist store shape: patient, sample, lab, status
  return rows.map((c) => ({
    id: c.publicId,
    patient: c.patient?.name || "",
    sample: c.sampleType?.name || "",
    lab: c.lab?.name || "",
    status: humanizeLabStatus(c.status),
    original: c,
  }));
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

// Minimal appointment creation: expects patientId + dentistId + date + time (+reason)
export async function receptionistCreateAppointment(_user, body) {
  const payload = pick(body || {}, ["patientId", "dentistId", "date", "time", "reason"]);

  if (!payload.patientId) throw new Error("patientId is required");
  if (!payload.dentistId) throw new Error("dentistId is required");
  if (!payload.date) payload.date = todayISO();
  if (!payload.time) throw new Error("time is required");

  // NOTE: your Appointment schema likely uses ObjectId refs; if you use publicId in FE,
  // we should resolve publicId -> _id here. If your FE sends _id already, this works as-is.
  // We'll handle both defensively:
  const patient = await Patient.findOne({
    $or: [{ _id: payload.patientId }, { publicId: payload.patientId }],
  });
  if (!patient) throw new Error("Patient not found");

  const dentist = await User.findOne({
    $or: [{ _id: payload.dentistId }, { publicId: payload.dentistId }],
    role: "dentist",
  });
  if (!dentist) throw new Error("Dentist not found");

  const appt = await Appointment.create({
    patient: patient._id,
    dentist: dentist._id,
    date: payload.date,
    time: payload.time,
    reason: payload.reason || "",
    status: "scheduled",
  });

  const populated = await Appointment.findById(appt._id)
    .populate("patient", "name publicId mr")
    .populate("dentist", "name publicId")
    .lean();

  return {
    id: populated.publicId,
    patient: populated.patient?.name || "",
    dentist: populated.dentist?.name || "",
    time: populated.time || "",
    status: "Scheduled",
    date: populated.date,
    patientId: populated.patient?.publicId || "",
    dentistId: populated.dentist?.publicId || "",
    reason: populated.reason || "",
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