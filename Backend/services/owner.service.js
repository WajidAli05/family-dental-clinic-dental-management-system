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
import ClinicalMaster from "../models/ClinicalMaster.model.js";
import ClinicSettings from "../models/ClinicSettings.model.js";
import { revenueCollected, outstanding } from "./shared/billing.js";
import { decryptPrescriptionDoc } from "../utils/fieldEncryption.js";
import LabBillPayment from "../models/LabBillPayment.model.js";
import {
  cashbookStats,
  cashbookTransactions,
  cashbookTrend,
  commissionSummary,
  labDuesSummary,
  labBillsForLab,
} from "./shared/finance.js";
import { searchMedications, createOrGetMedication, listMedications } from "./shared/medications.js";
import { parsePagination, paginateArray, buildSort } from "./shared/paginate.js";
import {
  createAppointmentCore,
  updateAppointmentCore,
  updateAppointmentStatusCore,
  deleteAppointmentCore,
} from "./shared/appointments.js";
import { createPatientCore, updatePatientCore, computeAge, mapInsurance, mapEmergencyContact } from "./shared/patients.js";
import {
  PERMISSION_ROLES,
  OWNER_PERMISSION_KEYS,
  DEFAULT_ROLE_GRANTS,
} from "./shared/permissionsConfig.js";
import { updateLabCaseStatus as sharedUpdateLabCaseStatus } from "./shared/labCases.js";

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
const PERMISSIONS_DOC_ID = "PERMISSIONS";

// OWNER_PERMISSION_KEYS, PERMISSION_ROLES, DEFAULT_ROLE_GRANTS imported at top of file
export { OWNER_PERMISSION_KEYS };

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
    // Use DEFAULT_ROLE_GRANTS so a fresh install doesn't need manual owner setup.
    OWNER_PERMISSION_KEYS.forEach((k) => (seed[k] = DEFAULT_ROLE_GRANTS[k] ?? []));
    doc = await Permissions.create({
      _id: PERMISSIONS_DOC_ID,
      permissions: new Map(Object.entries(seed)),
    });
  } else {
    const current = mapToPlainObject(doc.permissions) || {};
    let changed = false;

    OWNER_PERMISSION_KEYS.forEach((k) => {
      if (!(k in current)) {
        // New key — apply the default grant, not a bare [].
        current[k] = DEFAULT_ROLE_GRANTS[k] ?? [];
        changed = true;
      } else if (Array.isArray(current[k])) {
        const clean = sanitizeRolesArray(current[k]);
        if (JSON.stringify(clean) !== JSON.stringify(current[k])) {
          current[k] = clean;
          changed = true;
        }
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
export async function ownerStaffList(_ownerId, { page, limit, sortBy, sortDir } = {}) {
  const { page: P, limit: L, skip, sortDir: sd, sortBy: sb } = parsePagination({ page, limit, sortBy, sortDir });
  const sort = buildSort(sb, sd, { createdAt: -1 });
  const [total, rows] = await Promise.all([
    User.countDocuments({ role: { $in: STAFF_ROLES } }),
    User.find({ role: { $in: STAFF_ROLES } })
      .select("publicId name email phone role enabled commissionPercent createdAt")
      .sort(sort).skip(skip).limit(L).lean(),
  ]);
  const mapped = rows.map((u) => ({
    id: u.publicId,
    name: u.name || "",
    role: u.role,
    email: u.email || "",
    phone: u.phone || "",
    enabled: !!u.enabled,
    commission: u.role === "dentist" ? Number(u.commissionPercent || 0) : undefined,
    createdAt: toISO(u.createdAt),
  }));
  return { rows: mapped, total, page: P, pages: Math.max(1, Math.ceil(total / L)) };
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
export async function ownerListAppointments(_ownerId, { dateFrom, dateTo, dentistId, status, q, page, limit, sortBy, sortDir } = {}) {
  const { page: P, limit: L, sortDir: sd, sortBy: sb } = parsePagination({ page, limit, sortBy, sortDir });

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
    if (!d) return { rows: [], total: 0, page: 1, pages: 1 };
    filter.dentist = d._id;
  }

  const sort = buildSort(sb, sd, { date: -1, time: 1 });

  const rows = await Appointment.find(filter)
    .populate("patient", "name phone publicId mr")
    .populate("dentist", "name publicId")
    .sort(sort)
    .lean();

  let mapped = rows.map((a) => ({
    id: a.publicId,
    date: a.date,
    time: a.time,
    patientId: a.patient?.publicId || "",
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

  return paginateArray(mapped, P, L);
}

// ----------------------------
// ✅ OWNER PATIENTS LIST
// ----------------------------
export async function ownerPatientsList(_ownerId, { page, limit, sortBy, sortDir, q, status } = {}) {
  const { page: P, limit: L, skip, sortDir: sd, sortBy: sb } = parsePagination({ page, limit, sortBy, sortDir });
  const sort = buildSort(sb, sd, { createdAt: -1 });

  // Build filter (q and status come from client search/filter)
  const filter = {};
  const qStr = normalize(q);
  if (qStr) {
    filter.$or = [
      { name: { $regex: qStr, $options: "i" } },
      { phone: { $regex: qStr, $options: "i" } },
      { publicId: { $regex: qStr, $options: "i" } },
      { city: { $regex: qStr, $options: "i" } },
    ];
  }
  const statusStr = normalize(status);
  if (statusStr && statusStr !== "all") filter.status = statusStr;

  // DB-level aggregate stats always run on the full collection (no filter)
  // so stat cards reflect clinic totals, not the current search subset.
  const [total, globalActive, globalTotal, pendingLabsCount, revenueAgg, patients] = await Promise.all([
    Patient.countDocuments(filter),                                               // pagination total
    Patient.countDocuments({ status: "active" }),                                 // card: active
    Patient.countDocuments({}),                                                   // card: all
    LabCase.countDocuments({ status: { $in: ["sent", "received", "in_progress", "ready"] } }),
    Invoice.aggregate([{ $group: { _id: null, total: { $sum: "$totalAmount" } } }]),
    Patient.find(filter)
      .select("+insurance.policyNumber") // only to derive hasPolicyNumber below — never returned raw
      .populate("primaryDentist", "name publicId role")
      .sort(sort)
      .skip(skip)
      .limit(L)
      .lean(),
  ]);

  const dbStats = {
    total: globalTotal,
    active: globalActive,
    inactive: globalTotal - globalActive,
    pendingLabs: pendingLabsCount,
    revenue: money(revenueAgg?.[0]?.total || 0),
  };

  if (!patients.length) {
    return { rows: [], total, page: P, pages: Math.max(1, Math.ceil(total / L)), dbStats };
  }

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

  const mapped = patients.map((p) => {
    const inv = invoiceMap.get(String(p._id)) || { totalSpent: 0, lastInvoiceAmount: 0 };
    return {
      id: p.publicId,
      name: p.name || "",
      phone: p.phone || "",
      age: p.dateOfBirth ? computeAge(p.dateOfBirth) : (p.age ?? ""),
      dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth).toISOString().slice(0, 10) : "",
      gender: p.gender || "",
      city: p.city || "",
      country: p.country || "",
      postalCode: p.postalCode || "",
      nationality: p.nationality || "",
      preferredLanguage: p.preferredLanguage || "",
      referralSource: p.referralSource || "",
      emergencyContact: mapEmergencyContact(p),
      insurance: mapInsurance(p),
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

  return { rows: mapped, total, page: P, pages: Math.max(1, Math.ceil(total / L)), dbStats };
}

// ----------------------------
// ✅ OWNER PATIENT PROFILE
// ----------------------------
// Direct-by-ID profile lookup — deliberately bypasses the soft-delete filter
// (includeDeleted: true) on every query here. Soft-delete hides a patient
// from ACTIVE LIST views (ownerPatientsList etc.), but once the owner is
// looking at one specific patient by ID, historical/financial records must
// stay reviewable (audit + retention integrity) even after the patient and
// their cascaded records (see ownerPatientDelete) have been soft-deleted.
export async function ownerPatientProfile(_ownerId, patientPublicId) {
  const pid = normalize(patientPublicId);
  if (!pid) throw new Error("Patient id is required");

  const patient = await Patient.findOne({ publicId: pid })
    .setOptions({ includeDeleted: true })
    .select("+insurance.policyNumber") // only to derive hasPolicyNumber below — never returned raw
    .populate("primaryDentist", "name publicId")
    .lean();

  if (!patient) throw new Error("Patient not found");

  const appts = await Appointment.find({ patient: patient._id })
    .setOptions({ includeDeleted: true })
    .populate("dentist", "name publicId")
    .sort({ date: -1, createdAt: -1 })
    .limit(10)
    .lean();

  const invoices = await Invoice.find({ patient: patient._id })
    .setOptions({ includeDeleted: true })
    .sort({ date: -1, createdAt: -1 })
    .limit(10)
    .lean({ virtuals: true });

  const labs = await LabCase.find({ patient: patient._id })
    .setOptions({ includeDeleted: true })
    .populate("sampleType", "name publicId")
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const rxRaw = await Prescription.find({ patientId: pid })
    .setOptions({ includeDeleted: true })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
  const rx = rxRaw.map(decryptPrescriptionDoc);

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
      email: patient.email || "",
      age: patient.dateOfBirth ? computeAge(patient.dateOfBirth) : (patient.age ?? ""),
      dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().slice(0, 10) : "",
      gender: patient.gender || "",
      address: patient.address || "",
      city: patient.city || "",
      country: patient.country || "",
      postalCode: patient.postalCode || "",
      nationality: patient.nationality || "",
      preferredLanguage: patient.preferredLanguage || "",
      referralSource: patient.referralSource || "",
      emergencyContact: mapEmergencyContact(patient),
      insurance: mapInsurance(patient),
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
// Soft-deletes the patient AND cascades a soft-delete to appointments, lab
// cases, and prescriptions — via the SAME softDelete plugin used everywhere
// else. Nothing is ever hard-deleted here.
//
// INVOICES ARE DELIBERATELY EXCLUDED FROM THIS CASCADE. Invoices are
// immutable financial records (accounting/tax retention, revenue totals,
// audit integrity) — deleting a patient must never change historical
// revenue. An invoice's softDelete plugin/`deletedAt` field exists for a
// possible future "void this specific invoice" action, not for cascading
// from a patient delete. See SECURITY.md §6.
export async function ownerPatientDelete(_ownerId, patientPublicId) {
  const pid = normalize(patientPublicId);
  if (!pid) throw new Error("Patient id is required");

  const patient = await Patient.findOne({ publicId: pid });
  if (!patient) throw new Error("Patient not found");

  patient.status = "inactive";
  patient.tags = Array.isArray(patient.tags) ? patient.tags : [];
  if (!patient.tags.includes("deleted")) patient.tags.push("deleted");
  patient.deletedAt = new Date();

  await patient.save();

  const now = new Date();
  const [appts, labCases, prescriptions] = await Promise.all([
    Appointment.updateMany({ patient: patient._id, deletedAt: null }, { $set: { deletedAt: now } }),
    LabCase.updateMany({ patient: patient._id, deletedAt: null }, { $set: { deletedAt: now } }),
    Prescription.updateMany({ patientId: pid, deletedAt: null }, { $set: { deletedAt: now } }),
  ]);

  return {
    message: "Deleted",
    id: pid,
    cascaded: {
      appointments: appts.modifiedCount,
      labCases: labCases.modifiedCount,
      prescriptions: prescriptions.modifiedCount,
    },
  };
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
export async function ownerListLabCases(_ownerId, { page, limit, sortBy, sortDir, q, status } = {}) {
  const { page: P, limit: L, skip, sortDir: sd, sortBy: sb } = parsePagination({ page, limit, sortBy, sortDir });
  const sort = buildSort(sb, sd, { createdAt: -1 });

  const filter = {};
  if (status && status !== "all") filter.status = String(status);

  const [total, rows] = await Promise.all([
    LabCase.countDocuments(filter),
    LabCase.find(filter)
      .populate("patient", "name publicId")
      .populate("dentist", "name publicId")
      .populate("lab", "name publicId")
      .populate("sampleType", "name publicId")
      .sort(sort).skip(skip).limit(L).lean(),
  ]);

  let mapped = rows.map((c) => ({
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
    timeline: (c.timeline || []).map((t) => ({ at: t.at, status: t.status, note: t.note || "" })),
  }));

  const needle = String(q || "").trim().toLowerCase();
  if (needle) {
    mapped = mapped.filter((x) =>
      `${x.id} ${x.patientName} ${x.dentistName} ${x.labName} ${x.status}`.toLowerCase().includes(needle)
    );
  }

  return { rows: mapped, total, page: P, pages: Math.max(1, Math.ceil(total / L)) };
}

function mapOwnerCase(c) {
  return {
    id: c.publicId,
    createdAt: toISO(c.createdAt),
    patientId: c.patient?.publicId || "",
    patientName: c.patient?.name || "",
    dentistId: c.dentist?.publicId || "",
    dentistName: c.dentist?.name || "",
    labId: c.lab?.publicId || "",
    labName: c.lab?.name || "",
    sampleTypeId: c.sampleType?.publicId || "",
    sampleTypeName: c.sampleType?.name || "",
    teeth: Array.isArray(c.teeth) ? c.teeth : [],
    status: c.status || "",
    notes: c.note || "",
    timeline: (c.timeline || []).map((t) => ({ at: t.at, status: t.status, note: t.note || "" })),
  };
}

export async function ownerGetLabCase(_ownerId, casePublicId) {
  const c = await LabCase.findOne({ publicId: casePublicId })
    .populate("patient", "name publicId")
    .populate("dentist", "name publicId")
    .populate("lab", "name publicId")
    .populate("sampleType", "name publicId")
    .lean();
  if (!c) throw Object.assign(new Error("Case not found"), { status: 404 });
  return mapOwnerCase(c);
}

export async function ownerCreateLabCase(_ownerId, body) {
  const patientKey    = String(body?.patientId || "").trim();
  const dentistKey    = String(body?.dentistId || "").trim();
  const labKey        = String(body?.labId || "").trim();
  const sampleTypeKey = String(body?.sampleTypeId || "").trim();
  const teeth = (Array.isArray(body?.teeth) ? body.teeth : [])
    .map((t) => String(t).replace("#", "").trim())
    .filter(Boolean);
  const note = String(body?.note || body?.notes || "");

  if (!patientKey)    throw Object.assign(new Error("patientId is required"), { status: 400 });
  if (!dentistKey)    throw Object.assign(new Error("dentistId is required"), { status: 400 });
  if (!labKey)        throw Object.assign(new Error("labId is required"), { status: 400 });
  if (!sampleTypeKey) throw Object.assign(new Error("sampleTypeId is required"), { status: 400 });
  if (!teeth.length)  throw Object.assign(new Error("At least one tooth is required"), { status: 400 });

  const [patient, dentist, lab, sampleType] = await Promise.all([
    Patient.findOne({ publicId: patientKey }),
    User.findOne({ role: "dentist", publicId: dentistKey }),
    User.findOne({ role: "lab", publicId: labKey }),
    SampleType.findOne({ publicId: sampleTypeKey }),
  ]);

  if (!patient)    throw Object.assign(new Error("Patient not found"), { status: 404 });
  if (!dentist)    throw Object.assign(new Error("Dentist not found"), { status: 404 });
  if (!lab)        throw Object.assign(new Error("Lab not found"), { status: 404 });
  if (!sampleType) throw Object.assign(new Error("Sample type not found"), { status: 404 });

  const created = await LabCase.create({
    patient: patient._id,
    dentist: dentist._id,
    lab: lab._id,
    sampleType: sampleType._id,
    teeth,
    note,
    status: "sent",
    timeline: [{ at: new Date(), status: "sent", note: "Created by owner" }],
  });

  const populated = await LabCase.findById(created._id)
    .populate("patient", "name publicId")
    .populate("dentist", "name publicId")
    .populate("lab", "name publicId")
    .populate("sampleType", "name publicId")
    .lean();

  return mapOwnerCase(populated);
}

export async function ownerUpdateLabCase(_ownerId, casePublicId, body) {
  const c = await LabCase.findOne({ publicId: casePublicId });
  if (!c) throw Object.assign(new Error("Case not found"), { status: 404 });

  if (body?.labId) {
    const lab = await User.findOne({ role: "lab", publicId: String(body.labId) }).select("_id");
    if (!lab) throw Object.assign(new Error("Lab not found"), { status: 404 });
    c.lab = lab._id;
  }
  if (body?.sampleTypeId) {
    const st = await SampleType.findOne({ publicId: String(body.sampleTypeId) }).select("_id");
    if (!st) throw Object.assign(new Error("Sample type not found"), { status: 404 });
    c.sampleType = st._id;
  }
  if (body?.teeth !== undefined) {
    if (!Array.isArray(body.teeth)) throw Object.assign(new Error("teeth must be an array"), { status: 400 });
    c.teeth = body.teeth.map((t) => String(t).replace("#", "").trim()).filter(Boolean);
  }
  if (body?.note !== undefined) c.note = String(body.note || "");
  if (body?.notes !== undefined) c.note = String(body.notes || "");

  await c.save();

  const populated = await LabCase.findById(c._id)
    .populate("patient", "name publicId")
    .populate("dentist", "name publicId")
    .populate("lab", "name publicId")
    .populate("sampleType", "name publicId")
    .lean();

  return mapOwnerCase(populated);
}

export async function ownerDeleteLabCase(_ownerId, casePublicId) {
  const c = await LabCase.findOne({ publicId: casePublicId });
  if (!c) throw Object.assign(new Error("Case not found"), { status: 404 });
  await c.softDelete();
  return { id: casePublicId };
}

export async function ownerUpdateLabCaseStatus(_ownerId, casePublicId, status) {
  const c = await sharedUpdateLabCaseStatus("owner", _ownerId, casePublicId, status);
  const populated = await LabCase.findById(c._id)
    .populate("patient", "name publicId")
    .populate("dentist", "name publicId")
    .populate("lab", "name publicId")
    .populate("sampleType", "name publicId")
    .lean();
  return mapOwnerCase(populated);
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
export async function ownerBillingPayments(_ownerId, { dateFrom, dateTo, dentistId, page, limit, sortBy, sortDir } = {}) {
  const { page: P, limit: L, skip, sortDir: sd, sortBy: sb } = parsePagination({ page, limit, sortBy, sortDir });
  const filter = {};
  const df = normalize(dateFrom);
  const dt = normalize(dateTo);
  if (df && dt) filter.date = { $gte: df, $lte: dt };
  else if (df) filter.date = { $gte: df };
  else if (dt) filter.date = { $lte: dt };
  const did = normalize(dentistId);
  if (did && did !== "all") filter.dentistId = did;
  const sort = buildSort(sb, sd, { date: -1, createdAt: -1 });
  const [total, rows] = await Promise.all([
    OwnerPayment.countDocuments(filter),
    OwnerPayment.find(filter).sort(sort).skip(skip).limit(L).lean(),
  ]);
  const mapped = rows.map((p) => ({
    id: p._id || p.id || "",
    date: p.date || "",
    method: String(p.method || "").toLowerCase(),
    amount: Number(p.amount || 0),
    dentistId: p.dentistId || "",
    dentistName: p.dentistName || "",
  }));
  return { rows: mapped, total, page: P, pages: Math.max(1, Math.ceil(total / L)) };
}

export async function ownerBillingLabBills(_ownerId, { month, labId, page, limit, sortBy, sortDir } = {}) {
  const { page: P, limit: L, skip, sortDir: sd, sortBy: sb } = parsePagination({ page, limit, sortBy, sortDir });
  const filter = {};
  const m = normalize(month);
  const lid = normalize(labId);
  if (m) filter.month = m;
  if (lid && lid !== "all") filter.labId = lid;
  const sort = buildSort(sb, sd, { month: -1, createdAt: -1 });
  const [total, rows] = await Promise.all([
    LabBill.countDocuments(filter),
    LabBill.find(filter).sort(sort).skip(skip).limit(L).lean(),
  ]);
  const mapped = rows.map((b) => ({
    id: b._id,
    month: b.month || "",
    labId: b.labId || "",
    labName: b.labName || "",
    amount: Number(b.amount || 0),
    paid: !!b.paid,
  }));
  return { rows: mapped, total, page: P, pages: Math.max(1, Math.ceil(total / L)) };
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
        invoiceOutstanding: {
          $max: [0, { $subtract: ["$totalAmount", "$paidAmount"] }],
        },
      },
    },
    {
      $group: {
        _id: null,
        invoiceCount: { $sum: 1 },
        totalBilled: { $sum: "$totalAmount" },
        outstandingCount: {
          $sum: { $cond: [{ $gt: ["$invoiceOutstanding", 0] }, 1, 0] },
        },
      },
    },
  ].filter(Boolean);

  const [agg, totalPaid, totalOutstanding] = await Promise.all([
    Invoice.aggregate(pipeline),
    revenueCollected(df || undefined, dt || undefined),
    outstanding(df || undefined, dt || undefined),
  ]);

  const row = agg?.[0] || {};

  return {
    invoiceCount: Number(row.invoiceCount || 0),
    totalBilled: Number(row.totalBilled || 0),
    totalPaid,
    totalOutstanding,
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

export async function ownerInventoryListItems(_ownerId, { page, limit, sortBy, sortDir, q } = {}) {
  const { page: P, limit: L, skip, sortDir: sd, sortBy: sb } = parsePagination({ page, limit, sortBy, sortDir });
  const filter = {};
  const needle = String(q || "").trim();
  if (needle) {
    filter.$or = [
      { name: { $regex: needle, $options: "i" } },
      { category: { $regex: needle, $options: "i" } },
      { sku: { $regex: needle, $options: "i" } },
    ];
  }
  const sort = buildSort(sb, sd, { createdAt: -1 });
  const [total, rows] = await Promise.all([
    InventoryItem.countDocuments(filter),
    InventoryItem.find(filter).sort(sort).skip(skip).limit(L).lean(),
  ]);
  return { rows: rows.map(mapItem), total, page: P, pages: Math.max(1, Math.ceil(total / L)) };
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
export async function ownerInventoryListSuppliers(_ownerId, { page, limit, sortBy, sortDir } = {}) {
  const { page: P, limit: L, skip, sortDir: sd, sortBy: sb } = parsePagination({ page, limit, sortBy, sortDir });
  const sort = buildSort(sb, sd, { name: 1 });
  const [total, rows] = await Promise.all([
    Supplier.countDocuments({}),
    Supplier.find({}).sort(sort).skip(skip).limit(L).lean(),
  ]);
  const mapped = rows.map((s) => ({ id: s.publicId, name: s.name || "", phone: s.phone || "", email: s.email || "", address: s.address || "" }));
  return { rows: mapped, total, page: P, pages: Math.max(1, Math.ceil(total / L)) };
}

// Purchases list
export async function ownerInventoryListPurchases(_ownerId, { page, limit, sortBy, sortDir } = {}) {
  const { page: P, limit: L, skip, sortDir: sd, sortBy: sb } = parsePagination({ page, limit, sortBy, sortDir });
  const sort = buildSort(sb, sd, { date: -1, createdAt: -1 });
  const [total, rows] = await Promise.all([
    PurchaseOrder.countDocuments({}),
    PurchaseOrder.find({}).populate("supplier", "publicId name").sort(sort).skip(skip).limit(L).lean(),
  ]);
  const mapped = rows.map((p) => ({
    id: p.publicId,
    date: p.date,
    supplierId: p.supplier?.publicId || "",
    supplierName: p.supplier?.name || "",
    invoiceNo: p.invoiceNo || "",
    total: Number(p.total || 0),
    notes: p.notes || "",
  }));
  return { rows: mapped, total, page: P, pages: Math.max(1, Math.ceil(total / L)) };
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

// ==============================
// ✅ CLINICAL MASTER (OWNER)
// ==============================
const CLINICAL_MASTER_ID = "CLINICAL-MASTER";

async function ensureClinicalMasterDoc() {
  let doc = await ClinicalMaster.findById(CLINICAL_MASTER_ID);
  if (!doc) {
    doc = await ClinicalMaster.create({ _id: CLINICAL_MASTER_ID });
  }
  return doc;
}

function nextIdFromList(prefix, list = []) {
  // list items have .id like "TRM-1"
  let max = 0;
  for (const row of list || []) {
    const m = String(row?.id || "").match(new RegExp(`^${prefix}-(\\d+)$`));
    if (m?.[1]) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}-${max + 1}`;
}

// ---------- GET ALL ----------
export async function ownerClinicalMasterGetAll(_ownerId) {
  const doc = await ensureClinicalMasterDoc();
  const plain = doc.toObject ? doc.toObject() : doc;

  return {
    treatments: Array.isArray(plain.treatments) ? plain.treatments : [],
    diagnosisTemplates: Array.isArray(plain.diagnosisTemplates) ? plain.diagnosisTemplates : [],
    clinicalFindingTemplates: Array.isArray(plain.clinicalFindingTemplates) ? plain.clinicalFindingTemplates : [],
    documentationTemplates: Array.isArray(plain.documentationTemplates) ? plain.documentationTemplates : [],
  };
}

// ==============================
// ✅ TREATMENTS CRUD
// ==============================
export async function ownerClinicalCreateTreatment(_ownerId, payload = {}) {
  const doc = await ensureClinicalMasterDoc();

  const name = normalize(payload.name);
  if (!name) throw new Error("Treatment name is required");

  const id = nextIdFromList("TRM", doc.treatments);

  const row = {
    id,
    name,
    code: normalize(payload.code),
    fee: Math.max(0, money(payload.fee)),
    active: payload.active !== undefined ? !!payload.active : true,
    notes: normalize(payload.notes),
  };

  doc.treatments = Array.isArray(doc.treatments) ? doc.treatments : [];
  doc.treatments.push(row);

  await doc.save();
  return row;
}

export async function ownerClinicalUpdateTreatment(_ownerId, treatmentId, patch = {}) {
  const id = normalize(treatmentId);
  if (!id) throw new Error("Treatment id is required");

  const doc = await ensureClinicalMasterDoc();
  const idx = (doc.treatments || []).findIndex((t) => String(t.id) === id);
  if (idx === -1) throw new Error("Treatment not found");

  if (patch.name !== undefined) doc.treatments[idx].name = normalize(patch.name);
  if (patch.code !== undefined) doc.treatments[idx].code = normalize(patch.code);
  if (patch.fee !== undefined) doc.treatments[idx].fee = Math.max(0, money(patch.fee));
  if (patch.active !== undefined) doc.treatments[idx].active = !!patch.active;
  if (patch.notes !== undefined) doc.treatments[idx].notes = normalize(patch.notes);

  if (!normalize(doc.treatments[idx].name)) throw new Error("Treatment name is required");

  await doc.save();
  return doc.treatments[idx].toObject ? doc.treatments[idx].toObject() : doc.treatments[idx];
}

export async function ownerClinicalToggleTreatmentActive(_ownerId, treatmentId) {
  const id = normalize(treatmentId);
  if (!id) throw new Error("Treatment id is required");

  const doc = await ensureClinicalMasterDoc();
  const idx = (doc.treatments || []).findIndex((t) => String(t.id) === id);
  if (idx === -1) throw new Error("Treatment not found");

  doc.treatments[idx].active = !doc.treatments[idx].active;
  await doc.save();

  return doc.treatments[idx].toObject ? doc.treatments[idx].toObject() : doc.treatments[idx];
}

export async function ownerClinicalDeleteTreatment(_ownerId, treatmentId) {
  const id = normalize(treatmentId);
  if (!id) throw new Error("Treatment id is required");

  const doc = await ensureClinicalMasterDoc();
  const before = (doc.treatments || []).length;

  doc.treatments = (doc.treatments || []).filter((t) => String(t.id) !== id);

  if ((doc.treatments || []).length === before) throw new Error("Treatment not found");

  await doc.save();
  return { message: "Deleted", id };
}

// ==============================
// ✅ DIAGNOSIS TEMPLATES CRUD
// ==============================
export async function ownerClinicalCreateDiagnosis(_ownerId, payload = {}) {
  const doc = await ensureClinicalMasterDoc();

  const title = normalize(payload.title);
  if (!title) throw new Error("Title is required");

  const id = nextIdFromList("DX", doc.diagnosisTemplates);

  const row = {
    id,
    title,
    description: normalize(payload.description),
    active: payload.active !== undefined ? !!payload.active : true,
  };

  doc.diagnosisTemplates = Array.isArray(doc.diagnosisTemplates) ? doc.diagnosisTemplates : [];
  doc.diagnosisTemplates.push(row);

  await doc.save();
  return row;
}

export async function ownerClinicalUpdateDiagnosis(_ownerId, diagnosisId, patch = {}) {
  const id = normalize(diagnosisId);
  if (!id) throw new Error("Diagnosis id is required");

  const doc = await ensureClinicalMasterDoc();
  const idx = (doc.diagnosisTemplates || []).findIndex((d) => String(d.id) === id);
  if (idx === -1) throw new Error("Diagnosis not found");

  if (patch.title !== undefined) doc.diagnosisTemplates[idx].title = normalize(patch.title);
  if (patch.description !== undefined) doc.diagnosisTemplates[idx].description = normalize(patch.description);
  if (patch.active !== undefined) doc.diagnosisTemplates[idx].active = !!patch.active;

  if (!normalize(doc.diagnosisTemplates[idx].title)) throw new Error("Title is required");

  await doc.save();
  return doc.diagnosisTemplates[idx].toObject ? doc.diagnosisTemplates[idx].toObject() : doc.diagnosisTemplates[idx];
}

export async function ownerClinicalDeleteDiagnosis(_ownerId, diagnosisId) {
  const id = normalize(diagnosisId);
  if (!id) throw new Error("Diagnosis id is required");

  const doc = await ensureClinicalMasterDoc();
  const before = (doc.diagnosisTemplates || []).length;

  doc.diagnosisTemplates = (doc.diagnosisTemplates || []).filter((d) => String(d.id) !== id);

  if ((doc.diagnosisTemplates || []).length === before) throw new Error("Diagnosis not found");

  await doc.save();
  return { message: "Deleted", id };
}

// ==============================
// ✅ CLINICAL FINDINGS CRUD
// ==============================
export async function ownerClinicalCreateFinding(_ownerId, payload = {}) {
  const doc = await ensureClinicalMasterDoc();

  const title = normalize(payload.title);
  if (!title) throw new Error("Title is required");

  const id = nextIdFromList("CF", doc.clinicalFindingTemplates);

  const row = {
    id,
    title,
    description: normalize(payload.description),
    active: payload.active !== undefined ? !!payload.active : true,
  };

  doc.clinicalFindingTemplates = Array.isArray(doc.clinicalFindingTemplates) ? doc.clinicalFindingTemplates : [];
  doc.clinicalFindingTemplates.push(row);

  await doc.save();
  return row;
}

export async function ownerClinicalUpdateFinding(_ownerId, findingId, patch = {}) {
  const id = normalize(findingId);
  if (!id) throw new Error("Finding id is required");

  const doc = await ensureClinicalMasterDoc();
  const idx = (doc.clinicalFindingTemplates || []).findIndex((f) => String(f.id) === id);
  if (idx === -1) throw new Error("Finding not found");

  if (patch.title !== undefined) doc.clinicalFindingTemplates[idx].title = normalize(patch.title);
  if (patch.description !== undefined) doc.clinicalFindingTemplates[idx].description = normalize(patch.description);
  if (patch.active !== undefined) doc.clinicalFindingTemplates[idx].active = !!patch.active;

  if (!normalize(doc.clinicalFindingTemplates[idx].title)) throw new Error("Title is required");

  await doc.save();
  return doc.clinicalFindingTemplates[idx].toObject
    ? doc.clinicalFindingTemplates[idx].toObject()
    : doc.clinicalFindingTemplates[idx];
}

export async function ownerClinicalDeleteFinding(_ownerId, findingId) {
  const id = normalize(findingId);
  if (!id) throw new Error("Finding id is required");

  const doc = await ensureClinicalMasterDoc();
  const before = (doc.clinicalFindingTemplates || []).length;

  doc.clinicalFindingTemplates = (doc.clinicalFindingTemplates || []).filter((f) => String(f.id) !== id);

  if ((doc.clinicalFindingTemplates || []).length === before) throw new Error("Finding not found");

  await doc.save();
  return { message: "Deleted", id };
}

// =========================
// OWNER SETTINGS (BASIC CLINIC INFO + PASSWORD CHANGE)
// =========================
const CLINIC_SETTINGS_ID = "CLINIC-SETTINGS";

const DEFAULT_RETENTION = {
  patientRecordsYears:   7,
  financialRecordsYears: 7,
  auditLogYears:          7,
};

const DEFAULT_LOCALE = {
  country:        "PK",
  locale:         "en",
  currency:       "PKR",
  currencySymbol: "₨",
  taxEnabled:     false,
  taxRate:        0,
  taxLabel:       "Tax",
  timezone:       "Asia/Karachi",
  dateFormat:     "DD/MM/YYYY",
  weekStart:      0,
  exchangeRate:   1,
};

// Full presets applied server-side when a country switch is requested.
// The client only sends { country }; all currency/tax/timezone fields
// are derived here so they are always internally consistent.
const COUNTRY_PRESETS = {
  PK: {
    country:        "PK",
    locale:         "en",
    currency:       "PKR",
    currencySymbol: "₨",
    taxEnabled:     false,
    taxRate:        0,
    taxLabel:       "Tax",
    timezone:       "Asia/Karachi",
    dateFormat:     "DD/MM/YYYY",
    weekStart:      0,
    exchangeRate:   1,
  },
  SA: {
    country:        "SA",
    locale:         "en",
    currency:       "SAR",
    currencySymbol: "SR",
    taxEnabled:     true,
    taxRate:        15,
    taxLabel:       "VAT",
    timezone:       "Asia/Riyadh",
    dateFormat:     "DD/MM/YYYY",
    weekStart:      0,
    exchangeRate:   0.01353,
  },
};

async function ensureClinicSettingsDoc() {
  let doc = await ClinicSettings.findById(CLINIC_SETTINGS_ID);
  if (!doc) {
    doc = await ClinicSettings.create({
      _id: CLINIC_SETTINGS_ID,
      clinic: {
        name: "Clinic",
        logoUrl: "",
        phone: "",
        whatsapp: "",
        address: "",
      },
      locale: { ...DEFAULT_LOCALE },
    });
  }

  let dirty = false;

  // Backfill clinic object if missing
  if (!doc.clinic || typeof doc.clinic !== "object") {
    doc.clinic = { name: "Clinic", logoUrl: "", phone: "", whatsapp: "", address: "" };
    dirty = true;
  }

  // Backfill locale object if missing (additive migration for existing docs)
  if (!doc.locale || typeof doc.locale !== "object") {
    doc.locale = { ...DEFAULT_LOCALE };
    dirty = true;
  }

  // Backfill retention object if missing (additive migration for existing docs)
  if (!doc.retention || typeof doc.retention !== "object") {
    doc.retention = { ...DEFAULT_RETENTION };
    dirty = true;
  }

  if (dirty) await doc.save();

  return doc;
}

function serializeLocale(raw = {}) {
  return {
    country:        raw.country        || DEFAULT_LOCALE.country,
    locale:         raw.locale         || DEFAULT_LOCALE.locale,
    currency:       raw.currency       || DEFAULT_LOCALE.currency,
    currencySymbol: raw.currencySymbol || DEFAULT_LOCALE.currencySymbol,
    taxEnabled:     Boolean(raw.taxEnabled),
    taxRate:        Number(raw.taxRate) || 0,
    taxLabel:       raw.taxLabel       || DEFAULT_LOCALE.taxLabel,
    timezone:       raw.timezone       || DEFAULT_LOCALE.timezone,
    dateFormat:     raw.dateFormat     || DEFAULT_LOCALE.dateFormat,
    weekStart:      Number(raw.weekStart) || 0,
    exchangeRate:   Number(raw.exchangeRate) || 1,
  };
}

function serializeRetention(raw = {}) {
  return {
    patientRecordsYears:   Number(raw.patientRecordsYears)   || DEFAULT_RETENTION.patientRecordsYears,
    financialRecordsYears: Number(raw.financialRecordsYears) || DEFAULT_RETENTION.financialRecordsYears,
    auditLogYears:         Number(raw.auditLogYears)          || DEFAULT_RETENTION.auditLogYears,
  };
}

function sanitizeClinicPayload(payload = {}) {
  // supports both:
  // A) { clinic: {...} }
  // B) { name, logoUrl, phone, ... }
  const c =
    payload?.clinic && typeof payload.clinic === "object"
      ? payload.clinic
      : payload;

  return {
    name: normalizeStr(c.name),
    logoUrl: normalizeStr(c.logoUrl),
    phone: normalizeStr(c.phone),
    whatsapp: normalizeStr(c.whatsapp),
    address: normalizeStr(c.address),
  };
}

export async function ownerSettingsGet(_ownerId) {
  await ensureClinicSettingsDoc();
  const doc = await ClinicSettings.findById(CLINIC_SETTINGS_ID).lean();
  const clinic = doc?.clinic || {};
  const billing = doc?.billing || {};

  return {
    clinic: {
      name: clinic.name || "",
      logoUrl: clinic.logoUrl || "",
      phone: clinic.phone || "",
      whatsapp: clinic.whatsapp || "",
      address: clinic.address || "",
    },
    billing: {
      defaultConsultationFee: Number(billing.defaultConsultationFee) || 0,
    },
    locale: serializeLocale(doc?.locale),
    retention: serializeRetention(doc?.retention),
  };
}

// Shared read-only accessor used by the public /clinic-config endpoint (all roles)
export async function getClinicConfig() {
  await ensureClinicSettingsDoc();
  const doc = await ClinicSettings.findById(CLINIC_SETTINGS_ID).lean();
  return serializeLocale(doc?.locale);
}

/**
 * Owner-only: atomically apply the full preset for the given country.
 * Client only sends { country }; all currency/tax/timezone fields are
 * derived server-side from COUNTRY_PRESETS so they stay consistent.
 */
export async function ownerSwitchCountry(_ownerId, country) {
  if (!COUNTRY_PRESETS[country]) {
    throw new Error(`Unsupported country "${country}". Valid values: ${Object.keys(COUNTRY_PRESETS).join(", ")}`);
  }
  const doc = await ensureClinicSettingsDoc();
  const currentUILocale = doc.locale?.locale || "en";
  doc.set("locale", { ...COUNTRY_PRESETS[country], locale: currentUILocale });
  await doc.save();
  const saved = await ClinicSettings.findById(CLINIC_SETTINGS_ID).lean();
  return serializeLocale(saved?.locale);
}

export async function updateClinicLocale(locale) {
  const VALID_LOCALES = ["en", "ur", "ar"];
  if (!VALID_LOCALES.includes(locale)) {
    throw new Error(`Unsupported locale "${locale}". Valid values: ${VALID_LOCALES.join(", ")}`);
  }
  const doc = await ensureClinicSettingsDoc();
  doc.locale.locale = locale;
  await doc.save();
  const saved = await ClinicSettings.findById(CLINIC_SETTINGS_ID).lean();
  return serializeLocale(saved?.locale);
}

export async function ownerSettingsUpdate(_ownerId, payload = {}) {
  const doc = await ensureClinicSettingsDoc();

  // Update clinic block only when clinic data is present in payload
  const hasClinicData = payload?.clinic !== undefined || typeof payload?.name !== "undefined";

  if (hasClinicData) {
    const next = sanitizeClinicPayload(payload);
    if (!next.name) throw new Error("Clinic name is required");
    doc.clinic = {
      ...(doc.clinic || {}),
      ...next,
    };
    if (doc.clinic && "timings" in doc.clinic) {
      delete doc.clinic.timings;
    }
  } else if (payload?.billing === undefined) {
    // Legacy flat payload with no explicit clinic or billing key — treat as clinic update
    const next = sanitizeClinicPayload(payload);
    if (!next.name) throw new Error("Clinic name is required");
    doc.clinic = {
      ...(doc.clinic || {}),
      ...next,
    };
    if (doc.clinic && "timings" in doc.clinic) {
      delete doc.clinic.timings;
    }
  }

  // Update billing block if provided
  if (typeof payload?.billing?.defaultConsultationFee !== "undefined") {
    doc.set("billing.defaultConsultationFee", Math.max(0, Number(payload.billing.defaultConsultationFee) || 0));
  }

  // Update locale block if provided
  if (payload?.locale && typeof payload.locale === "object") {
    const l = payload.locale;
    const current = doc.locale?.toObject?.() || doc.locale || {};
    const next = { ...DEFAULT_LOCALE, ...current };
    if (l.country         !== undefined) next.country        = l.country;
    if (l.locale          !== undefined) next.locale         = l.locale;
    if (l.currency        !== undefined) next.currency       = l.currency;
    if (l.currencySymbol  !== undefined) next.currencySymbol = l.currencySymbol;
    if (l.taxEnabled      !== undefined) next.taxEnabled     = Boolean(l.taxEnabled);
    if (l.taxRate         !== undefined) next.taxRate        = Math.max(0, Math.min(100, Number(l.taxRate) || 0));
    if (l.taxLabel        !== undefined) next.taxLabel       = l.taxLabel;
    if (l.timezone        !== undefined) next.timezone       = l.timezone;
    if (l.dateFormat      !== undefined) next.dateFormat     = l.dateFormat;
    if (l.weekStart       !== undefined) next.weekStart      = Number(l.weekStart) === 1 ? 1 : 0;
    doc.set("locale", next);
  }

  // Update retention block if provided — floors at 1 year; never lets the
  // owner configure a shorter-than-a-year window by accident.
  if (payload?.retention && typeof payload.retention === "object") {
    const r = payload.retention;
    const current = doc.retention?.toObject?.() || doc.retention || {};
    const next = { ...DEFAULT_RETENTION, ...current };
    if (r.patientRecordsYears   !== undefined) next.patientRecordsYears   = Math.max(1, Number(r.patientRecordsYears)   || DEFAULT_RETENTION.patientRecordsYears);
    if (r.financialRecordsYears !== undefined) next.financialRecordsYears = Math.max(1, Number(r.financialRecordsYears) || DEFAULT_RETENTION.financialRecordsYears);
    if (r.auditLogYears         !== undefined) next.auditLogYears         = Math.max(1, Number(r.auditLogYears)         || DEFAULT_RETENTION.auditLogYears);
    doc.set("retention", next);
  }

  await doc.save();

  const saved = await ClinicSettings.findById(CLINIC_SETTINGS_ID).lean();
  const clinic = saved?.clinic || {};
  const billing = saved?.billing || {};

  return {
    clinic: {
      name: clinic.name || "",
      logoUrl: clinic.logoUrl || "",
      phone: clinic.phone || "",
      whatsapp: clinic.whatsapp || "",
      address: clinic.address || "",
    },
    billing: {
      defaultConsultationFee: Number(billing.defaultConsultationFee) || 0,
    },
    locale: serializeLocale(saved?.locale),
    retention: serializeRetention(saved?.retention),
  };
}

export async function ownerSettingsChangePassword(ownerId, payload = {}) {
  const newPassword = String(payload.newPassword || "");
  const confirmPassword = String(payload.confirmPassword || "");

  if (!ownerId) throw new Error("Unauthorized");
  if (!newPassword || newPassword.length < 6) throw new Error("Password must be at least 6 characters");
  if (newPassword !== confirmPassword) throw new Error("Passwords do not match");

  const u = await User.findById(ownerId).select("+passwordHash");
  if (!u) throw new Error("User not found");

  await u.setPassword(newPassword);
  await u.save();

  return { message: "Password updated" };
}

// ----------------------------
// ✅ OWNER DASHBOARD OVERVIEW
// ----------------------------
export async function ownerDashboardOverview(_ownerId, { date } = {}) {
  const d = new Date();
  const pad2 = (n) => String(n).padStart(2, "0");
  const today = date || `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const firstOfMonth = `${today.slice(0, 7)}-01`;

  const [activePatients, pendingLabSamples, revToday, revMonth, apptAgg] = await Promise.all([
    Patient.countDocuments({ status: "active" }),
    LabCase.countDocuments({ status: { $in: ["sent", "received", "in_progress", "ready"] } }),
    revenueCollected(today, today),
    revenueCollected(firstOfMonth, today),
    Appointment.aggregate([
      { $match: { date: today } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const apptMap = {};
  for (const x of apptAgg) apptMap[String(x._id || "")] = Number(x.count || 0);

  return {
    stats: {
      activePatients,
      pendingLabSamples,
      revenueToday: revToday,
      revenueThisMonth: revMonth,
    },
    appointmentsSummary: {
      total: Object.values(apptMap).reduce((s, n) => s + n, 0),
      scheduled: apptMap["scheduled"] || 0,
      checkedIn: apptMap["checked_in"] || 0,
      completed: apptMap["completed"] || 0,
      cancelled: apptMap["cancelled"] || 0,
    },
  };
}

// =====================================================
// ✅ OWNER APPOINTMENT CRUD
// =====================================================

function mapOwnerAppt(populated) {
  return {
    id:          populated.publicId,
    date:        populated.date,
    time:        populated.time,
    patientId:   populated.patient?.publicId || "",
    patientName: populated.patient?.name     || "",
    patientPhone: populated.patient?.phone   || "",
    dentistId:   populated.dentist?.publicId || "",
    dentistName: populated.dentist?.name     || "",
    status:      populated.status,
    reason:      populated.reason  || "",
    notes:       populated.notes   || "",
  };
}

export async function ownerCreateAppointment(_ownerId, body) {
  const result = await createAppointmentCore(body);
  return mapOwnerAppt(result.original || result);
}

export async function ownerUpdateAppointment(_ownerId, apptPublicId, body) {
  const result = await updateAppointmentCore(apptPublicId, body);
  return mapOwnerAppt(result.original || result);
}

export async function ownerUpdateAppointmentStatus(_ownerId, apptPublicId, uiStatus) {
  const result = await updateAppointmentStatusCore(apptPublicId, uiStatus);
  return mapOwnerAppt(result.original || result);
}

export async function ownerDeleteAppointment(_ownerId, apptPublicId) {
  return deleteAppointmentCore(apptPublicId);
}

// =====================================================
// ✅ OWNER PATIENT CREATE / UPDATE
// =====================================================

function mapOwnerPatient(p) {
  return {
    id:          p.publicId,
    name:        p.name    || "",
    phone:       p.phone   || "",
    age:         p.dateOfBirth ? computeAge(p.dateOfBirth) : (p.age ?? ""),
    dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth).toISOString().slice(0, 10) : "",
    gender:      p.gender  || "",
    email:       p.email   || "",
    address:     p.address || "",
    city:        p.city    || "",
    country:     p.country || "",
    postalCode:  p.postalCode || "",
    nationality: p.nationality || "",
    preferredLanguage: p.preferredLanguage || "",
    referralSource:    p.referralSource    || "",
    emergencyContact:  mapEmergencyContact(p),
    insurance:         mapInsurance(p),
    status:      p.status  || "active",
    lastVisit:   p.lastVisit || "",
    createdAt:   (p.registrationDate || ""),
    dentist:     "",
    pendingLab:  0,
    totalSpent:  0,
    lastInvoiceAmount: 0,
    tags:        Array.isArray(p.tags) ? p.tags : [],
  };
}

export async function ownerCreatePatient(_ownerId, body) {
  const patient = await createPatientCore(body);
  return mapOwnerPatient(patient.toJSON ? patient.toJSON() : patient);
}

export async function ownerUpdatePatient(_ownerId, patientPublicId, body) {
  const patient = await updatePatientCore(patientPublicId, body);
  return mapOwnerPatient(patient);
}

// =====================================================
// ✅ FINANCE — Daily Cashbook, Commissions, Lab Dues
// =====================================================

export async function ownerCashbookData(_ownerId, { from, to, page, limit, q } = {}) {
  const f = normalize(from) || undefined;
  const t = normalize(to) || undefined;
  const [stats, transactions, trend] = await Promise.all([
    cashbookStats(f, t),
    cashbookTransactions(f, t, { page, limit, q }),
    cashbookTrend(30),
  ]);
  return { stats, transactions, trend };
}

export async function ownerCommissionData(_ownerId, { from, to } = {}) {
  const f = normalize(from) || undefined;
  const t = normalize(to) || undefined;
  return commissionSummary(f, t);
}

export async function ownerRecordOwnerPayment(_ownerId, { dentistId, dentistName, amount, method, date } = {}) {
  const did = normalize(dentistId);
  if (!did) throw new Error("dentistId is required");
  const amt = Number(amount);
  if (!amt || amt <= 0) throw new Error("amount must be positive");
  const m = normalize(method).toLowerCase();
  if (!["cash", "card"].includes(m)) throw new Error("method must be cash or card");
  const d = normalize(date) || toISO(new Date());
  const id = `OP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await OwnerPayment.create({
    _id: id, dentistId: did, dentistName: normalize(dentistName) || did, amount: amt, method: m, date: d,
  });
  return { id, dentistId: did, amount: amt, method: m, date: d };
}

export async function ownerListOwnerPayments(_ownerId, { dentistId, page, limit } = {}) {
  const { page: P, limit: L, skip } = parsePagination({ page, limit });
  const filter = {};
  const did = normalize(dentistId);
  if (did && did !== "all") filter.dentistId = did;
  const [total, rows] = await Promise.all([
    OwnerPayment.countDocuments(filter),
    OwnerPayment.find(filter).sort({ date: -1, createdAt: -1 }).skip(skip).limit(L).lean(),
  ]);
  return {
    rows: rows.map((p) => ({
      id: p._id, date: p.date, amount: Number(p.amount || 0),
      method: p.method, dentistId: p.dentistId, dentistName: p.dentistName,
    })),
    total, page: P, pages: Math.max(1, Math.ceil(total / L)),
  };
}

export async function ownerLabDuesData(_ownerId) {
  return labDuesSummary();
}

export async function ownerRecordLabPayment(_ownerId, { labId, labName, amount, method, date, note, labBillId } = {}) {
  const lid = normalize(labId);
  if (!lid) throw new Error("labId is required");
  const amt = Number(amount);
  if (!amt || amt <= 0) throw new Error("amount must be positive");
  const d = normalize(date) || toISO(new Date());
  const m = normalize(method) || "cash";
  const id = `LP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await LabBillPayment.create({
    _id: id, labId: lid, labName: normalize(labName) || lid,
    amount: amt, date: d, method: m,
    note: normalize(note), labBillId: normalize(labBillId),
  });
  return { id, labId: lid, amount: amt, date: d };
}

export async function ownerLabBillsByLab(_ownerId, labId, { page, limit } = {}) {
  return labBillsForLab(labId, { page, limit });
}

// -------------------- MEDICATIONS --------------------
export async function ownerSearchMedications(q, limit) {
  return searchMedications(q, limit);
}

export async function ownerCreateOrGetMedication(user, body) {
  return createOrGetMedication(body, user);
}

export async function ownerListMedications(query = {}) {
  return listMedications(query);
}