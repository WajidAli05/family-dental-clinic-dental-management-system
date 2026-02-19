// Backend/services/owner.service.js
import mongoose from "mongoose";
import User from "../models/User.model.js";
import Patient from "../models/Patient.model.js";
import Appointment from "../models/Appointment.model.js";
import Invoice from "../models/Invoice.model.js";
import LabCase from "../models/LabCase.model.js";
import Prescription from "../models/Prescription.model.js";
import SampleType from "../models/SampleType.model.js";

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

// helpers
const pad = (n, w = 4) => String(n).padStart(w, "0");
const randPassword = () => Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);

// ---------- LAB ACCOUNTS ----------
export async function ownerListLabAccounts(_ownerId) {
  const labs = await User.find({ role: "lab" })
    .select("publicId name email phone enabled forcePasswordChange createdAt")
    .sort({ createdAt: -1 })
    .lean();

  return labs.map((u) => ({
    id: u.publicId,
    name: u.name || "",
    email: u.email || "",
    phone: u.phone || "",
    enabled: !!u.enabled,
    forcePasswordChange: !!u.forcePasswordChange,
    createdAt: toISO(u.createdAt),
  }));
}

export async function ownerCreateLabAccount(_ownerId, payload = {}) {
  const name = normalize(payload.name);
  const email = lower(payload.email);
  const phone = normalize(payload.phone);
  const enabled = payload.enabled !== undefined ? !!payload.enabled : true;
  const forcePasswordChange = payload.forcePasswordChange !== undefined ? !!payload.forcePasswordChange : true;

  if (!name) throw new Error("Lab name is required");
  if (!email) throw new Error("Email is required");

  // generate next LAB-USER-####
  const last = await User.findOne({ role: "lab", publicId: { $regex: /^LAB-USER-\d+$/ } })
    .select("publicId")
    .sort({ createdAt: -1 })
    .lean();

  let n = 1;
  if (last?.publicId) {
    const m = String(last.publicId).match(/^LAB-USER-(\d+)$/);
    if (m?.[1]) n = parseInt(m[1], 10) + 1;
  }
  const publicId = `LAB-USER-${pad(n)}`;

  const u = new User({
    publicId,
    name,
    email,
    phone,
    role: "lab",
    enabled,
    forcePasswordChange,
  });

  // set temporary password (lab will change on login if forcePasswordChange=true)
  await u.setPassword(randPassword());
  await u.save();

  return {
    id: u.publicId,
    name: u.name,
    email: u.email,
    phone: u.phone,
    enabled: u.enabled,
    forcePasswordChange: u.forcePasswordChange,
    createdAt: toISO(u.createdAt),
  };
}

export async function ownerUpdateLabAccount(_ownerId, labPublicId, patch = {}) {
  const id = normalize(labPublicId);
  if (!id) throw new Error("Lab id is required");

  const u = await User.findOne({ role: "lab", publicId: id });
  if (!u) throw new Error("Lab not found");

  if (patch.name !== undefined) u.name = normalize(patch.name);
  if (patch.email !== undefined) u.email = lower(patch.email);
  if (patch.phone !== undefined) u.phone = normalize(patch.phone);
  if (patch.enabled !== undefined) u.enabled = !!patch.enabled;
  if (patch.forcePasswordChange !== undefined) u.forcePasswordChange = !!patch.forcePasswordChange;

  if (!u.name) throw new Error("Lab name is required");
  if (!u.email) throw new Error("Email is required");

  await u.save();

  return {
    id: u.publicId,
    name: u.name,
    email: u.email,
    phone: u.phone,
    enabled: u.enabled,
    forcePasswordChange: u.forcePasswordChange,
    createdAt: toISO(u.createdAt),
  };
}

export async function ownerSetLabAccountEnabled(_ownerId, labPublicId, enabled) {
  return ownerUpdateLabAccount(_ownerId, labPublicId, { enabled: !!enabled });
}

// ---------- LAB CASES (read-only) ----------
export async function ownerListLabCases(_ownerId) {
  const rows = await LabCase.find({})
    .populate("patient", "name publicId")
    .populate("dentist", "name publicId")
    .populate("lab", "name publicId")
    .populate("sampleType", "name publicId")
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  return rows.map((c) => ({
    id: c.publicId,
    createdAt: toISO(c.createdAt),
    patientName: c.patient?.name || "",
    dentistId: c.dentist?.publicId || "",
    dentistName: c.dentist?.name || "",
    labId: c.lab?.publicId || "",
    labName: c.lab?.name || "",
    sampleTypeId: c.sampleType?.publicId || "",
    sampleTypeName: c.sampleType?.name || "",
    status: c.status || "",
    notes: c.note || "",
    timeline: (c.timeline || []).map((t) => ({
      at: t.at,
      status: t.status,
      note: t.note || "",
    })),
  }));
}

// ---------- SAMPLE TYPES ----------
export async function ownerListSampleTypes(_ownerId) {
  const rows = await SampleType.find({}).sort({ createdAt: -1 }).lean();
  return rows.map((s) => ({
    id: s.publicId,
    name: s.name || "",
    description: s.description || "",
    active: !!s.active,
    price: money(s.price),
  }));
}

export async function ownerCreateSampleType(_ownerId, payload = {}) {
  const name = normalize(payload.name);
  const description = normalize(payload.description);
  const active = payload.active !== undefined ? !!payload.active : true;
  const price = Math.max(0, money(payload.price));

  if (!name) throw new Error("Name is required");

  // next ST-#
  const last = await SampleType.findOne({ publicId: { $regex: /^ST-\d+$/ } })
    .select("publicId")
    .sort({ createdAt: -1 })
    .lean();

  let n = 1;
  if (last?.publicId) {
    const m = String(last.publicId).match(/^ST-(\d+)$/);
    if (m?.[1]) n = parseInt(m[1], 10) + 1;
  }

  const st = await SampleType.create({
    publicId: `ST-${n}`,
    name,
    description,
    active,
    price,
  });

  return {
    id: st.publicId,
    name: st.name,
    description: st.description,
    active: !!st.active,
    price: money(st.price),
  };
}

export async function ownerUpdateSampleType(_ownerId, sampleTypePublicId, patch = {}) {
  const id = normalize(sampleTypePublicId);
  if (!id) throw new Error("Sample type id is required");

  const st = await SampleType.findOne({ publicId: id });
  if (!st) throw new Error("Sample type not found");

  if (patch.name !== undefined) st.name = normalize(patch.name);
  if (patch.description !== undefined) st.description = normalize(patch.description);
  if (patch.active !== undefined) st.active = !!patch.active;
  if (patch.price !== undefined) st.price = Math.max(0, money(patch.price));

  if (!st.name) throw new Error("Name is required");

  await st.save();

  return {
    id: st.publicId,
    name: st.name,
    description: st.description,
    active: !!st.active,
    price: money(st.price),
  };
}

export async function ownerDeleteSampleType(_ownerId, sampleTypePublicId) {
  const id = normalize(sampleTypePublicId);
  if (!id) throw new Error("Sample type id is required");

  const st = await SampleType.findOne({ publicId: id });
  if (!st) throw new Error("Sample type not found");

  await SampleType.deleteOne({ _id: st._id });
  return { message: "Deleted", id };
}

// ✅ NEW: Owner dentists list (for filters)
export async function ownerListDentists(_ownerId) {
  const rows = await User.find({ role: "dentist" })
    .select("publicId name")
    .sort({ name: 1 })
    .lean();

  return rows.map((d) => ({
    id: d.publicId,
    name: d.name || "",
  }));
}