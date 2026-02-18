// Backend/services/owner.service.js
import mongoose from "mongoose";
import User from "../models/User.model.js";
import Patient from "../models/Patient.model.js";
import Appointment from "../models/Appointment.model.js";
import Invoice from "../models/Invoice.model.js";
import LabCase from "../models/LabCase.model.js";
import Prescription from "../models/Prescription.model.js";

const normalize = (v) => String(v || "").trim();
const lower = (v) => normalize(v).toLowerCase();

const isObjectId = (v) => mongoose.Types.ObjectId.isValid(String(v || ""));

const toISO = (d) => {
  if (!d) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(d))) return String(d);
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 10);
};

const money = (v) => Number(v || 0) || 0;

// ----------------------------
// ✅ OWNER APPOINTMENTS (already used by appointments tab)
// ----------------------------
export async function ownerListAppointments(_ownerId, { dateFrom, dateTo, dentistId, status, q } = {}) {
  const filter = {};

  // Date range on YYYY-MM-DD strings (works lexicographically)
  if (dateFrom && dateTo) filter.date = { $gte: normalize(dateFrom), $lte: normalize(dateTo) };
  else if (dateFrom) filter.date = { $gte: normalize(dateFrom) };
  else if (dateTo) filter.date = { $lte: normalize(dateTo) };

  // Status
  if (status && status !== "all") {
    const st = lower(status);
    const allowed = ["scheduled", "checked_in", "completed", "cancelled", "no_show"];
    if (allowed.includes(st)) filter.status = st;
  }

  // Dentist (publicId -> ObjectId)
  if (dentistId && dentistId !== "all") {
    const d = await User.findOne({ role: "dentist", publicId: normalize(dentistId) }).select("_id");
    if (!d) return []; // invalid dentist => empty results
    filter.dentist = d._id;
  }

  const rows = await Appointment.find(filter)
    .populate("patient", "name phone publicId mr")
    .populate("dentist", "name publicId")
    .sort({ date: 1, time: 1 })
    .lean();

  let mapped = rows.map((a) => ({
    id: a.publicId,
    date: a.date,
    time: a.time,

    patientName: a.patient?.name || "",
    patientPhone: a.patient?.phone || "",

    dentistId: a.dentist?.publicId || "",
    dentistName: a.dentist?.name || "",

    status: a.status,
    reason: a.reason || "",
    notes: a.notes || "",
  }));

  // Search (q)
  const needle = lower(q);
  if (needle) {
    mapped = mapped.filter((x) =>
      `${x.id} ${x.patientName} ${x.patientPhone} ${x.dentistName} ${x.reason} ${x.status} ${x.date} ${x.time}`
        .toLowerCase()
        .includes(needle)
    );
  }

  return mapped;
}

// ----------------------------
// ✅ OWNER PATIENTS LIST
// ----------------------------
export async function ownerPatientsList(_ownerId) {
  const patients = await Patient.find({})
    .populate("primaryDentist", "name publicId role")
    .sort({ createdAt: -1 })
    .lean();

  if (!patients.length) return [];

  const patientIds = patients.map((p) => p._id);

  // Pending labs per patient (statuses that are not finished)
  const pendingLabAgg = await LabCase.aggregate([
    { $match: { patient: { $in: patientIds }, status: { $in: ["sent", "received", "in_progress", "ready"] } } },
    { $group: { _id: "$patient", count: { $sum: 1 } } },
  ]);
  const pendingLabMap = new Map(pendingLabAgg.map((x) => [String(x._id), Number(x.count || 0)]));

  // Total spent + last invoice amount per patient (Invoice.totalAmount)
  const invoiceAgg = await Invoice.aggregate([
    { $match: { patient: { $in: patientIds } } },
    { $sort: { date: -1, createdAt: -1 } },
    {
      $group: {
        _id: "$patient",
        totalSpent: { $sum: "$totalAmount" },
        lastInvoiceAmount: { $first: "$totalAmount" },
      },
    },
  ]);
  const invoiceMap = new Map(
    invoiceAgg.map((x) => [
      String(x._id),
      {
        totalSpent: money(x.totalSpent),
        lastInvoiceAmount: money(x.lastInvoiceAmount),
      },
    ])
  );

  return patients.map((p) => {
    const inv = invoiceMap.get(String(p._id)) || { totalSpent: 0, lastInvoiceAmount: 0 };
    return {
      id: p.publicId,
      name: p.name || "",
      phone: p.phone || "",
      age: p.age ?? "",
      gender: p.gender || "",
      city: p.city || "",
      status: p.status || "active",
      createdAt: p.registrationDate || toISO(p.createdAt),
      lastVisit: p.lastVisit || "",
      dentist: p.primaryDentist?.name || "",
      pendingLab: pendingLabMap.get(String(p._id)) || 0,
      totalSpent: inv.totalSpent,
      lastInvoiceAmount: inv.lastInvoiceAmount,
      tags: Array.isArray(p.tags) ? p.tags : [],
    };
  });
}

// ----------------------------
// ✅ OWNER PATIENT PROFILE (history + invoices + labs + treatments)
// ----------------------------
export async function ownerPatientProfile(_ownerId, patientPublicId) {
  const pid = normalize(patientPublicId);
  if (!pid) throw new Error("Patient id is required");

  const patient = await Patient.findOne({ publicId: pid })
    .populate("primaryDentist", "name publicId")
    .lean();

  if (!patient) throw new Error("Patient not found");

  // appointments (latest 10)
  const appts = await Appointment.find({ patient: patient._id })
    .populate("dentist", "name publicId")
    .sort({ date: -1, createdAt: -1 })
    .limit(10)
    .lean();

  // invoices (latest 10)
  const invoices = await Invoice.find({ patient: patient._id })
    .sort({ date: -1, createdAt: -1 })
    .limit(10)
    .lean({ virtuals: true });

  // labs (latest 10)
  const labs = await LabCase.find({ patient: patient._id })
    .populate("sampleType", "name publicId")
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  // treatments: use Prescription as “treatments” (latest 10)
  // (no patient ObjectId link exists; we use patientId string field in Prescription)
  const rx = await Prescription.find({ patientId: pid })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const mappedInvoices = invoices.map((inv) => ({
    id: inv.publicId,
    date: inv.date,
    amount: money(inv.totalAmount),
    status: String(inv.status || "").toLowerCase(), // "paid" | "partial" | "pending"
  }));

  const mappedLabs = labs.map((c) => ({
    id: c.publicId,
    date: toISO(c.createdAt),
    type: c.sampleType?.name || "Lab Sample",
    status: c.status || "",
  }));

  const mappedTreatments = rx
    .filter((r) => String(r.treatment || r.diagnosis || "").trim())
    .map((r) => ({
      id: r._id,
      date: r.date || toISO(r.createdAt),
      title: r.treatment || r.diagnosis || "Treatment",
    }));

  // history (merge of appointments/invoices/labs/treatments)
  const history = [];

  appts.forEach((a) => {
    history.push({
      date: a.date,
      type: "Appointment",
      detail: `${a.reason || "Appointment"} • ${a.status || ""}`.trim(),
    });
  });

  invoices.forEach((inv) => {
    history.push({
      date: inv.date,
      type: "Invoice",
      detail: `${inv.publicId} • PKR ${money(inv.totalAmount).toLocaleString("en-PK")} • ${inv.status || ""}`,
    });
  });

  labs.forEach((c) => {
    history.push({
      date: toISO(c.createdAt),
      type: "Lab",
      detail: `${c.publicId} • ${c.sampleType?.name || "Sample"} • ${c.status || ""}`,
    });
  });

  mappedTreatments.forEach((t) => {
    history.push({
      date: t.date,
      type: "Treatment",
      detail: t.title,
    });
  });

  // sort newest first (date strings)
  history.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  return {
    patient: {
      id: patient.publicId,
      name: patient.name || "",
      phone: patient.phone || "",
      age: patient.age ?? "",
      gender: patient.gender || "",
      city: patient.city || "",
      status: patient.status || "active",
      lastVisit: patient.lastVisit || "",
      dentist: patient.primaryDentist?.name || "",
      tags: Array.isArray(patient.tags) ? patient.tags : [],
    },
    history: history.slice(0, 30),
    invoices: mappedInvoices,
    labs: mappedLabs,
    treatments: mappedTreatments,
  };
}

// ----------------------------
// ✅ OWNER PATIENT DELETE (safe “soft delete”)
// - We DO NOT delete the record to avoid breaking other dashboards.
// - We mark inactive + tag it as deleted.
// ----------------------------
export async function ownerPatientDelete(_ownerId, patientPublicId) {
  const pid = normalize(patientPublicId);
  if (!pid) throw new Error("Patient id is required");

  const patient = await Patient.findOne({ publicId: pid });
  if (!patient) throw new Error("Patient not found");

  patient.status = "inactive";
  patient.tags = Array.isArray(patient.tags) ? patient.tags : [];
  if (!patient.tags.includes("deleted")) patient.tags.push("deleted");

  await patient.save();

  return { message: "Deleted", id: pid };
}