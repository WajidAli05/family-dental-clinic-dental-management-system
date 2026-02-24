// Backend/services/owner.service.js
import mongoose from "mongoose";
import User from "../models/User.model.js";
import Patient from "../models/Patient.model.js";
import Appointment from "../models/Appointment.model.js";
import Invoice from "../models/Invoice.model.js";
import LabCase from "../models/LabCase.model.js";
import Prescription from "../models/Prescription.model.js";
import SampleType from "../models/SampleType.model.js";

import OwnerPayment from "../models/OwnerPayment.model.js";
import LabBill from "../models/LabBill.model.js";
import CommissionRules from "../models/CommissionRules.model.js";
import Permissions from "../models/Permissions.model.js";

import InventoryItem from "../models/InventoryItem.model.js";
import Supplier from "../models/Supplier.model.js";
import PurchaseOrder from "../models/PurchaseOrder.model.js";
import InventoryConsumption from "../models/InventoryConsumption.model.js";

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

// helpers
const pad = (n, w = 4) => String(n).padStart(w, "0");

// =====================================================
// ✅ STAFF & PERMISSIONS (NEW)
// =====================================================
const STAFF_ROLES = ["dentist", "receptionist", "lab"];
const PERMISSION_ROLES = ["receptionist", "dentist"]; // labs removed from permissions tab
const PERMISSIONS_DOC_ID = "PERMISSIONS";

// These must match your frontend PERMISSION_KEYS
export const OWNER_PERMISSION_KEYS = [
  // receptionist tabs
  "tab_receptionist_dashboard",
  "tab_receptionist_patients",
  "tab_receptionist_appointments",
  "tab_receptionist_lab_samples",
  "tab_receptionist_billing",
  "tab_receptionist_inventory",
  "tab_receptionist_profile",

  // dentist tabs
  "tab_dentist_dashboard",
  "tab_dentist_appointments",
  "tab_dentist_lab_samples",
  "tab_dentist_profile",
];

// --- Permissions helpers ---
// Stored in DB as: permissions: Map<permKey, ["receptionist","dentist"]>
const mapToPlainObject = (maybeMap) => {
  if (!maybeMap) return {};
  if (typeof maybeMap.entries === "function") return Object.fromEntries(maybeMap.entries());
  return maybeMap;
};

const sanitizeRolesArray = (arr) => {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => String(x || "").trim().toLowerCase())
    .filter((x) => PERMISSION_ROLES.includes(x));
};

// Accept payload as:
// A) { permissions: { key: ["receptionist"] } }
// B) { permissions: { key: {receptionist:true,dentist:false} } }
// C) { key: ["receptionist"] } (tolerate)
const sanitizePermissionsPayload = (payload) => {
  const raw = payload?.permissions && typeof payload.permissions === "object" ? payload.permissions : payload;
  const out = {};
  if (!raw || typeof raw !== "object") {
    OWNER_PERMISSION_KEYS.forEach((k) => (out[k] = []));
    return out;
  }

  OWNER_PERMISSION_KEYS.forEach((k) => {
    const v = raw[k];

    if (Array.isArray(v)) {
      out[k] = sanitizeRolesArray(v);
      return;
    }

    if (v && typeof v === "object") {
      const roles = [];
      if (v.receptionist) roles.push("receptionist");
      if (v.dentist) roles.push("dentist");
      out[k] = roles;
      return;
    }

    out[k] = [];
  });

  return out;
};

async function ensurePermissionsDoc() {
  let doc = await Permissions.findById(PERMISSIONS_DOC_ID);
  if (!doc) {
    const seed = {};
    OWNER_PERMISSION_KEYS.forEach((k) => (seed[k] = []));
    doc = await Permissions.create({
      _id: PERMISSIONS_DOC_ID,
      permissions: new Map(Object.entries(seed)),
    });
  } else {
    // backfill missing keys safely
    const current = mapToPlainObject(doc.permissions) || {};
    let changed = false;

    OWNER_PERMISSION_KEYS.forEach((k) => {
      if (!(k in current)) {
        current[k] = [];
        changed = true;
      } else {
        // also sanitize any old values
        if (Array.isArray(current[k])) current[k] = sanitizeRolesArray(current[k]);
      }
    });

    if (changed) {
      doc.permissions = new Map(Object.entries(current));
      await doc.save();
    }
  }
  return doc;
}

function staffPrefix(role) {
  if (role === "lab") return "LAB-USER";
  if (role === "receptionist") return "REC-USER";
  return "DEN-USER";
}

async function nextStaffPublicId(role) {
  const prefix = staffPrefix(role);
  const last = await User.findOne({
    role,
    publicId: { $regex: new RegExp(`^${prefix}-\\d+$`) },
  })
    .select("publicId")
    .sort({ createdAt: -1 })
    .lean();

  let n = 1;
  if (last?.publicId) {
    const m = String(last.publicId).match(new RegExp(`^${prefix}-(\\d+)$`));
    if (m?.[1]) n = parseInt(m[1], 10) + 1;
  }
  return `${prefix}-${pad(n)}`;
}

// ---------- STAFF CRUD ----------
export async function ownerStaffList(_ownerId) {
  const rows = await User.find({ role: { $in: STAFF_ROLES } })
    .select("publicId name email phone role enabled commissionPercent createdAt")
    .sort({ createdAt: -1 })
    .lean();

  return rows.map((u) => ({
    id: u.publicId,
    name: u.name || "",
    role: u.role,
    email: u.email || "",
    phone: u.phone || "",
    enabled: !!u.enabled,
    commission: u.role === "dentist" ? Number(u.commissionPercent || 0) : undefined,
    createdAt: toISO(u.createdAt),
  }));
}

export async function ownerStaffCreate(_ownerId, payload = {}) {
  const name = normalize(payload.name);
  const role = normalize(payload.role);
  const email = lower(payload.email);
  const phone = normalize(payload.phone);
  const password = String(payload.password || "");
  const enabled = payload.enabled !== undefined ? !!payload.enabled : true;

  if (!name) throw new Error("Name is required");
  if (!STAFF_ROLES.includes(role)) throw new Error("Invalid role");
  if (!email) throw new Error("Email is required");
  if (!password || password.length < 6) throw new Error("Password must be at least 6 characters");

  const exists = await User.findOne({ email }).select("_id").lean();
  if (exists) throw new Error("Email already exists");

  const publicId = await nextStaffPublicId(role);

  const u = new User({
    publicId,
    name,
    role,
    email,
    phone,
    enabled,
    forcePasswordChange: false,
  });

  if (role === "dentist") {
    const c = Math.max(0, Math.min(100, Number(payload.commission ?? payload.commissionPercent ?? 0)));
    u.commissionPercent = Number.isFinite(c) ? c : 0;
  }

  await u.setPassword(password);
  await u.save();

  return {
    id: u.publicId,
    name: u.name,
    role: u.role,
    email: u.email,
    phone: u.phone,
    enabled: !!u.enabled,
    commission: u.role === "dentist" ? Number(u.commissionPercent || 0) : undefined,
    createdAt: toISO(u.createdAt),
  };
}

export async function ownerStaffUpdate(_ownerId, staffPublicId, patch = {}) {
  const id = normalize(staffPublicId);
  if (!id) throw new Error("Staff id is required");

  const u = await User.findOne({ publicId: id, role: { $in: STAFF_ROLES } }).select("+passwordHash");
  if (!u) throw new Error("Staff not found");

  if (patch.name !== undefined) u.name = normalize(patch.name);
  if (patch.email !== undefined) u.email = lower(patch.email);
  if (patch.phone !== undefined) u.phone = normalize(patch.phone);
  if (patch.enabled !== undefined) u.enabled = !!patch.enabled;

  // optional reset password
  if (patch.password !== undefined && patch.password !== null && String(patch.password).trim()) {
    const pw = String(patch.password);
    if (pw.length < 6) throw new Error("Password must be at least 6 characters");
    await u.setPassword(pw);
  }

  // commission only for dentist
  if (u.role === "dentist" && (patch.commission !== undefined || patch.commissionPercent !== undefined)) {
    const c = Math.max(0, Math.min(100, Number(patch.commission ?? patch.commissionPercent ?? 0)));
    u.commissionPercent = Number.isFinite(c) ? c : 0;
  }

  if (!u.name) throw new Error("Name is required");
  if (!u.email) throw new Error("Email is required");

  if (patch.email !== undefined) {
    const clash = await User.findOne({ email: u.email, _id: { $ne: u._id } }).select("_id").lean();
    if (clash) throw new Error("Email already exists");
  }

  await u.save();

  return {
    id: u.publicId,
    name: u.name,
    role: u.role,
    email: u.email,
    phone: u.phone,
    enabled: !!u.enabled,
    commission: u.role === "dentist" ? Number(u.commissionPercent || 0) : undefined,
    createdAt: toISO(u.createdAt),
  };
}

export async function ownerStaffDelete(_ownerId, staffPublicId) {
  const id = normalize(staffPublicId);
  if (!id) throw new Error("Staff id is required");

  const u = await User.findOne({ publicId: id, role: { $in: STAFF_ROLES } })
    .select("_id")
    .lean();
  if (!u) throw new Error("Staff not found");

  await User.deleteOne({ _id: u._id });

  return { message: "Deleted", id };
}

export async function ownerStaffSetEnabled(_ownerId, staffPublicId, enabled) {
  return ownerStaffUpdate(_ownerId, staffPublicId, { enabled: !!enabled });
}

// ---------- PERMISSIONS (role-based matrix) ----------
export async function ownerPermissionsGet(_ownerId) {
  const doc = await ensurePermissionsDoc();
  const raw = mapToPlainObject(doc.permissions) || {};
  const cleaned = sanitizePermissionsPayload({ permissions: raw });

  return { permissions: cleaned };
}

export async function ownerPermissionsUpdate(_ownerId, payload = {}) {
  const cleaned = sanitizePermissionsPayload(payload);

  let doc = await Permissions.findById(PERMISSIONS_DOC_ID);
  if (!doc) {
    doc = new Permissions({
      _id: PERMISSIONS_DOC_ID,
      permissions: new Map(Object.entries(cleaned)),
    });
  } else {
    doc.permissions = new Map(Object.entries(cleaned));
  }

  await doc.save();

  const saved = await Permissions.findById(PERMISSIONS_DOC_ID).lean();
  const raw = mapToPlainObject(saved?.permissions) || {};
  const normalized = sanitizePermissionsPayload({ permissions: raw });

  return { permissions: normalized };
}

// =====================================================
// ✅ YOUR EXISTING SERVICES (kept as-is from your snippet)
// =====================================================

// ----------------------------
// ✅ OWNER APPOINTMENTS
// ----------------------------
export async function ownerListAppointments(_ownerId, { dateFrom, dateTo, dentistId, status, q } = {}) {
  const filter = {};

  if (dateFrom && dateTo) filter.date = { $gte: normalize(dateFrom), $lte: normalize(dateTo) };
  else if (dateFrom) filter.date = { $gte: normalize(dateFrom) };
  else if (dateTo) filter.date = { $lte: normalize(dateTo) };

  if (status && status !== "all") {
    const st = lower(status);
    const allowed = ["scheduled", "checked_in", "completed", "cancelled", "no_show"];
    if (allowed.includes(st)) filter.status = st;
  }

  if (dentistId && dentistId !== "all") {
    const d = await User.findOne({ role: "dentist", publicId: normalize(dentistId) }).select("_id");
    if (!d) return [];
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

  const pendingLabAgg = await LabCase.aggregate([
    { $match: { patient: { $in: patientIds }, status: { $in: ["sent", "received", "in_progress", "ready"] } } },
    { $group: { _id: "$patient", count: { $sum: 1 } } },
  ]);
  const pendingLabMap = new Map(pendingLabAgg.map((x) => [String(x._id), Number(x.count || 0)]));

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
// ✅ OWNER PATIENT PROFILE
// ----------------------------
export async function ownerPatientProfile(_ownerId, patientPublicId) {
  const pid = normalize(patientPublicId);
  if (!pid) throw new Error("Patient id is required");

  const patient = await Patient.findOne({ publicId: pid })
    .populate("primaryDentist", "name publicId")
    .lean();

  if (!patient) throw new Error("Patient not found");

  const appts = await Appointment.find({ patient: patient._id })
    .populate("dentist", "name publicId")
    .sort({ date: -1, createdAt: -1 })
    .limit(10)
    .lean();

  const invoices = await Invoice.find({ patient: patient._id })
    .sort({ date: -1, createdAt: -1 })
    .limit(10)
    .lean({ virtuals: true });

  const labs = await LabCase.find({ patient: patient._id })
    .populate("sampleType", "name publicId")
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const rx = await Prescription.find({ patientId: pid })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const mappedInvoices = invoices.map((inv) => ({
    id: inv.publicId,
    date: inv.date,
    amount: money(inv.totalAmount),
    status: String(inv.status || "").toLowerCase(),
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
// ✅ OWNER PATIENT DELETE
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

  await u.setPassword(Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2));
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

// ---------- LAB CASES ----------
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

// --- BILLING & FINANCIALS ---
export async function ownerBillingPayments(_ownerId, { dateFrom, dateTo, dentistId } = {}) {
  const filter = {};

  const df = normalize(dateFrom);
  const dt = normalize(dateTo);

  if (df && dt) filter.date = { $gte: df, $lte: dt };
  else if (df) filter.date = { $gte: df };
  else if (dt) filter.date = { $lte: dt };

  const did = normalize(dentistId);
  if (did && did !== "all") filter.dentistId = did;

  const rows = await OwnerPayment.find(filter).sort({ date: 1, createdAt: 1 }).lean();

  return rows.map((p) => ({
    id: p._id || p.id || "",
    date: p.date || "",
    method: String(p.method || "").toLowerCase(),
    amount: Number(p.amount || 0),
    dentistId: p.dentistId || "",
    dentistName: p.dentistName || "",
  }));
}

export async function ownerBillingLabBills(_ownerId, { month, labId } = {}) {
  const filter = {};
  const m = normalize(month);
  const lid = normalize(labId);

  if (m) filter.month = m;
  if (lid && lid !== "all") filter.labId = lid;

  const rows = await LabBill.find(filter).sort({ month: -1, createdAt: -1 }).lean();

  return rows.map((b) => ({
    id: b._id,
    month: b.month || "",
    labId: b.labId || "",
    labName: b.labName || "",
    amount: Number(b.amount || 0),
    paid: !!b.paid,
  }));
}

export async function ownerGetCommissionRules(_ownerId) {
  let doc = await CommissionRules.findById("COMMISSION-RULES").lean();

  if (!doc) {
    const created = await CommissionRules.create({
      _id: "COMMISSION-RULES",
      defaultPercent: 20,
      byDentist: {},
    });

    const plain = created.toObject ? created.toObject() : created;
    return {
      defaultPercent: Number(plain.defaultPercent || 20),
      byDentist: plain.byDentist || {},
    };
  }

  return {
    defaultPercent: Number(doc.defaultPercent || 20),
    byDentist: doc.byDentist || {},
  };
}

export async function ownerUpdateCommissionRules(_ownerId, payload = {}) {
  const { defaultPercent, dentistId, percent } = payload || {};

  let doc = await CommissionRules.findById("COMMISSION-RULES");
  if (!doc) {
    doc = new CommissionRules({ _id: "COMMISSION-RULES", defaultPercent: 20, byDentist: {} });
  }

  if (defaultPercent !== undefined && defaultPercent !== null && defaultPercent !== "") {
    doc.defaultPercent = Math.max(0, Math.min(100, Number(defaultPercent)));
  }

  const did = normalize(dentistId);
  if (did) {
    const p = Math.max(0, Math.min(100, Number(percent)));
    if (!doc.byDentist) doc.byDentist = new Map();
    if (typeof doc.byDentist.set === "function") doc.byDentist.set(did, p);
    else doc.byDentist[did] = p;
  }

  await doc.save();

  const saved = await CommissionRules.findById("COMMISSION-RULES").lean();
  return {
    defaultPercent: Number(saved?.defaultPercent || 20),
    byDentist: saved?.byDentist || {},
  };
}

export async function ownerBillingARSummaryService(_ownerId, { dateFrom, dateTo } = {}) {
  const df = normalize(dateFrom);
  const dt = normalize(dateTo);

  const match = {};
  if (df && dt) match.date = { $gte: df, $lte: dt };
  else if (df) match.date = { $gte: df };
  else if (dt) match.date = { $lte: dt };

  const pipeline = [
    Object.keys(match).length ? { $match: match } : null,
    {
      $project: {
        totalAmount: 1,
        paidAmount: {
          $sum: {
            $map: {
              input: { $ifNull: ["$payments", []] },
              as: "p",
              in: { $ifNull: ["$$p.amount", 0] },
            },
          },
        },
      },
    },
    {
      $addFields: {
        outstanding: {
          $max: [0, { $subtract: ["$totalAmount", "$paidAmount"] }],
        },
      },
    },
    {
      $group: {
        _id: null,
        invoiceCount: { $sum: 1 },
        totalBilled: { $sum: "$totalAmount" },
        totalPaid: { $sum: "$paidAmount" },
        totalOutstanding: { $sum: "$outstanding" },
        outstandingCount: {
          $sum: { $cond: [{ $gt: ["$outstanding", 0] }, 1, 0] },
        },
      },
    },
  ].filter(Boolean);

  const agg = await Invoice.aggregate(pipeline);
  const row = agg?.[0] || {};

  return {
    invoiceCount: Number(row.invoiceCount || 0),
    totalBilled: Number(row.totalBilled || 0),
    totalPaid: Number(row.totalPaid || 0),
    totalOutstanding: Number(row.totalOutstanding || 0),
    outstandingCount: Number(row.outstandingCount || 0),
  };
}

// =====================================================
// ✅ INVENTORY (OWNER) — Add-only, does not break shared dashboards
// =====================================================

const SKU_PREFIX = "SKU";

const skuPad = (n, w = 6) => String(n).padStart(w, "0");

async function nextSku() {
  // Find last SKU like SKU-000001
  const last = await InventoryItem.findOne({
    sku: { $regex: new RegExp(`^${SKU_PREFIX}-\\d+$`) },
  })
    .select("sku")
    .sort({ createdAt: -1 })
    .lean();

  let n = 1;
  if (last?.sku) {
    const m = String(last.sku).match(new RegExp(`^${SKU_PREFIX}-(\\d+)$`));
    if (m?.[1]) n = parseInt(m[1], 10) + 1;
  }

  // ensure uniqueness even if old data has holes
  // retry a few times
  for (let i = 0; i < 20; i++) {
    const candidate = `${SKU_PREFIX}-${skuPad(n + i)}`;
    // sku isn't unique in schema, so ensure manually
    const exists = await InventoryItem.findOne({ sku: candidate }).select("_id").lean();
    if (!exists) return candidate;
  }

  // fallback — very unlikely to hit
  return `${SKU_PREFIX}-${Date.now()}`;
}

const mapItem = (doc) => ({
  id: doc.publicId,
  sku: doc.sku || "",
  name: doc.name || "",
  category: doc.category || "",
  unit: doc.unit || "",
  qty: Number(doc.qty || 0),
  reorderLevel: Number(doc.reorderLevel || 0),
  unitCost: Number(doc.unitCost || 0),
  supplier: doc.supplier || "",
  location: doc.location || "",
  expiryDate: doc.expiryDate || "",
  usedIn: Array.isArray(doc.usedIn) ? doc.usedIn : [],
  createdAt: toISO(doc.createdAt),
});

export async function ownerInventoryListItems(_ownerId) {
  const rows = await InventoryItem.find({}).sort({ createdAt: -1 }).lean();
  return rows.map(mapItem);
}

export async function ownerInventoryCreateItem(_ownerId, payload = {}) {
  const name = normalize(payload.name);
  if (!name) throw new Error("Item name is required");

  // ------------------------------------------------------------------//

  // ✅ SKU must NOT be accepted from frontend
  async function nextSku() {
  // Pattern: SKU-0001
  const last = await InventoryItem.findOne({ sku: { $regex: /^SKU-\d+$/ } })
    .select("sku")
    .sort({ createdAt: -1 })
    .lean();

  let n = 1;
  if (last?.sku) {
    const m = String(last.sku).match(/^SKU-(\d+)$/);
    if (m?.[1]) n = parseInt(m[1], 10) + 1;
  }
  return `SKU-${pad(n)}`;
}

  const sku = await nextSku();

  const item = await InventoryItem.create({
    sku,
    name,
    category: normalize(payload.category),
    unit: normalize(payload.unit),
    qty: Math.max(0, Number(payload.qty || 0)),
    reorderLevel: Math.max(0, Number(payload.reorderLevel || 0)),
    unitCost: Math.max(0, Number(payload.unitCost || 0)),
    supplier: normalize(payload.supplier),
    location: normalize(payload.location),
    expiryDate: normalize(payload.expiryDate),
    usedIn: Array.isArray(payload.usedIn) ? payload.usedIn.map(normalize).filter(Boolean) : [],
  });

  const saved = await InventoryItem.findById(item._id).lean();
  return mapItem(saved);
}

export async function ownerInventoryUpdateItem(_ownerId, itemPublicId, patch = {}) {
  const id = normalize(itemPublicId);
  if (!id) throw new Error("Item id is required");

  const doc = await InventoryItem.findOne({ publicId: id });
  if (!doc) throw new Error("Item not found");

  // Do not allow SKU updates from frontend (SKU is backend-controlled)
  if (patch.name !== undefined) doc.name = normalize(patch.name);
  if (patch.category !== undefined) doc.category = normalize(patch.category);
  if (patch.unit !== undefined) doc.unit = normalize(patch.unit);
  if (patch.reorderLevel !== undefined) doc.reorderLevel = Math.max(0, Number(patch.reorderLevel || 0));
  if (patch.unitCost !== undefined) doc.unitCost = Math.max(0, Number(patch.unitCost || 0));
  if (patch.supplier !== undefined) doc.supplier = normalize(patch.supplier);
  if (patch.location !== undefined) doc.location = normalize(patch.location);
  if (patch.expiryDate !== undefined) doc.expiryDate = normalize(patch.expiryDate);

  if (patch.usedIn !== undefined) {
    doc.usedIn = Array.isArray(patch.usedIn) ? patch.usedIn.map(normalize).filter(Boolean) : [];
  }

  if (!doc.name) throw new Error("Item name is required");

  await doc.save();
  const saved = await InventoryItem.findById(doc._id).lean();
  return mapItem(saved);
}

export async function ownerInventoryUpdateStock(_ownerId, itemPublicId, payload = {}) {
  const id = normalize(itemPublicId);
  if (!id) throw new Error("Item id is required");

  const mode = String(payload.mode || "set").toLowerCase(); // set | add | subtract
  const qty = Number(payload.qty);

  if (!Number.isFinite(qty)) throw new Error("qty is required");

  const doc = await InventoryItem.findOne({ publicId: id });
  if (!doc) throw new Error("Item not found");

  const current = Number(doc.qty || 0);
  let next = current;

  if (mode === "add") next = current + qty;
  else if (mode === "subtract") next = current - qty;
  else next = qty;

  doc.qty = Math.max(0, next);

  await doc.save();
  const saved = await InventoryItem.findById(doc._id).lean();
  return mapItem(saved);
}

export async function ownerInventoryDeleteItem(_ownerId, itemPublicId) {
  const id = normalize(itemPublicId);
  if (!id) throw new Error("Item id is required");

  const doc = await InventoryItem.findOne({ publicId: id }).select("_id publicId").lean();
  if (!doc) throw new Error("Item not found");

  await InventoryItem.deleteOne({ _id: doc._id });
  return { message: "Deleted", id };
}

// Suppliers list (for filters/columns; do NOT remove even if tab removed)
export async function ownerInventoryListSuppliers(_ownerId) {
  const rows = await Supplier.find({}).sort({ name: 1 }).lean();
  return rows.map((s) => ({
    id: s.publicId,
    name: s.name || "",
    phone: s.phone || "",
    email: s.email || "",
    address: s.address || "",
  }));
}

// Purchases list
export async function ownerInventoryListPurchases(_ownerId) {
  const rows = await PurchaseOrder.find({})
    .populate("supplier", "publicId name")
    .sort({ date: -1, createdAt: -1 })
    .lean();

  return rows.map((p) => ({
    id: p.publicId,
    date: p.date,
    supplierId: p.supplier?.publicId || "",
    supplierName: p.supplier?.name || "",
    invoiceNo: p.invoiceNo || "",
    total: Number(p.total || 0),
    notes: p.notes || "",
  }));
}

// Purchase details (modal)
export async function ownerInventoryGetPurchase(_ownerId, purchasePublicId) {
  const id = normalize(purchasePublicId);
  if (!id) throw new Error("Purchase id is required");

  const p = await PurchaseOrder.findOne({ publicId: id })
    .populate("supplier", "publicId name phone email address")
    .populate("items.item", "publicId sku name unit")
    .lean();

  if (!p) throw new Error("Purchase not found");

  return {
    id: p.publicId,
    date: p.date,
    supplier: p.supplier
      ? {
          id: p.supplier.publicId,
          name: p.supplier.name || "",
          phone: p.supplier.phone || "",
          email: p.supplier.email || "",
          address: p.supplier.address || "",
        }
      : null,
    invoiceNo: p.invoiceNo || "",
    total: Number(p.total || 0),
    notes: p.notes || "",
    items: Array.isArray(p.items)
      ? p.items.map((it) => ({
          itemId: it.item?.publicId || it.itemPublicId || "",
          sku: it.item?.sku || it.sku || "",
          name: it.item?.name || it.name || "",
          unit: it.item?.unit || it.unit || "",
          qty: Number(it.qty || 0),
          unitCost: Number(it.unitCost || 0),
          lineTotal: Number(it.lineTotal || 0),
        }))
      : [],
  };
}

// Consumption list
export async function ownerInventoryListConsumption(_ownerId) {
  const rows = await InventoryConsumption.find({})
    .populate("item", "publicId name unit")
    .sort({ date: -1, createdAt: -1 })
    .lean();

  return rows.map((c) => ({
    id: c.publicId,
    date: c.date,
    itemId: c.item?.publicId || "",
    itemName: c.item?.name || "",
    unit: c.item?.unit || "",
    qtyUsed: Number(c.qtyUsed || 0),
    treatmentName: c.treatmentName || "",
  }));
}

// =====================================================
// ✅ INVENTORY PURCHASE CREATE (stores items + updates stock)
// =====================================================

function normalizeStr(v) {
  return String(v || "").trim();
}

export async function ownerInventoryCreatePurchase(_ownerId, payload = {}) {
  const date = normalizeStr(payload.date);
  const supplierId = normalizeStr(payload.supplierId);
  const invoiceNo = normalizeStr(payload.invoiceNo);
  const notes = normalizeStr(payload.notes);
  const itemsIn = Array.isArray(payload.items) ? payload.items : [];

  if (!date) throw new Error("date is required");
  if (!supplierId) throw new Error("supplierId is required");
  if (!itemsIn.length) throw new Error("items are required");

  const supplier = await Supplier.findOne({ publicId: supplierId }).select("_id publicId name").lean();
  if (!supplier) throw new Error("Supplier not found");

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const purchaseItems = [];

    for (const row of itemsIn) {
      const itemId = normalizeStr(row.itemId);
      const qty = Number(row.qty);
      const unitCost = Number(row.unitCost || 0);

      if (!itemId) throw new Error("Each item requires itemId");
      if (!Number.isFinite(qty) || qty <= 0) throw new Error("Each item requires qty > 0");

      const itemDoc = await InventoryItem.findOne({ publicId: itemId }).session(session);
      if (!itemDoc) throw new Error(`Inventory item not found: ${itemId}`);

      purchaseItems.push({
        item: itemDoc._id,
        itemPublicId: itemDoc.publicId,
        sku: itemDoc.sku || "",
        name: itemDoc.name || "",
        unit: itemDoc.unit || "",
        qty,
        unitCost: Math.max(0, unitCost),
        lineTotal: Math.max(0, qty * Math.max(0, unitCost)),
      });

      itemDoc.qty = Math.max(0, Number(itemDoc.qty || 0) + qty);
      if (Number.isFinite(unitCost) && unitCost > 0) itemDoc.unitCost = unitCost;

      await itemDoc.save({ session });
    }

    const po = await PurchaseOrder.create(
      [
        {
          date,
          supplier: supplier._id,
          invoiceNo,
          notes,
          items: purchaseItems,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    const saved = await PurchaseOrder.findById(po[0]._id).populate("supplier", "publicId name").lean();

    return {
      id: saved.publicId,
      date: saved.date,
      supplierId: saved.supplier?.publicId || "",
      supplierName: saved.supplier?.name || "",
      invoiceNo: saved.invoiceNo || "",
      total: Number(saved.total || 0),
      notes: saved.notes || "",
    };
  } catch (e) {
    await session.abortTransaction();
    session.endSession();
    throw e;
  }
}