import mongoose from "mongoose";
import User from "../models/User.model.js";
import Patient from "../models/Patient.model.js";
import Appointment from "../models/Appointment.model.js";
import LabCase from "../models/LabCase.model.js";
import LabBill from "../models/LabBill.model.js";
import SampleType from "../models/SampleType.model.js";
import Invoice from "../models/Invoice.model.js";
import InventoryItem from "../models/InventoryItem.model.js";
import { revenueCollected, outstanding, invoiceStatus } from "./shared/billing.js";
import { validateAndPriceItems } from "./shared/invoices.js";
import { getNextSequence } from "./shared/counters.js";
import { parsePagination, paginateArray, buildSort } from "./shared/paginate.js";
import { updateLabCaseStatus as sharedUpdateStatus } from "./shared/labCases.js";
import { findPatientsByPhone, generatePatientPublicId, computeAge, mapInsurance, mapEmergencyContact, encryptMedicalFields, mapMedicalInfo, mapOdontogram, latestToothEntriesByPatient, mergeToothClinical } from "./shared/patients.js";
import { generateAppointmentPublicId, toDbAppointmentStatus, toUiAppointmentStatus, assertNoSlotConflict, updateAppointmentCore, updateAppointmentStatusCore, rescheduleAppointmentCore } from "./shared/appointments.js";
import { canonicalStatus, allowedNextStatuses, statusLabel, isEditLocked } from "./shared/appointmentConfig.js";
import { encryptField } from "../utils/fieldEncryption.js";

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
const humanizeAppointmentStatus = (status) => statusLabel(status);


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
// IMPORTANT: callers MUST pass the client's local date ("YYYY-MM-DD").
// Appointments are stored with the user's local date, so using UTC (todayISO())
// as a fallback would miss same-day appointments in UTC+ timezones.
export async function receptionistGetStats(_receptionistId, { date } = {}) {
  const d = date || todayISO(); // fallback only for non-browser callers
  const firstOfMonth = d.slice(0, 7) + "-01";

  const [appointmentsToday, activePatients, pendingLabSamples, todayRevenue, revenueThisMonth, breakdownAgg] =
    await Promise.all([
      Appointment.countDocuments({ date: d }),
      Patient.countDocuments({ status: "active" }),
      LabCase.countDocuments({ status: { $in: ["sent", "in_progress", "ready"] } }),
      revenueCollected(d, d),
      revenueCollected(firstOfMonth, d),
      Appointment.aggregate([
        { $match: { date: d } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

  // Canonicalize so legacy ("scheduled"/"checked_in") and new lifecycle values
  // both land in the right bucket. `scheduled` keeps its name in the response
  // for backward compatibility with the existing dashboard cards, and now
  // means "booked but not yet completed/cancelled".
  const todayBreakdown = { total: appointmentsToday, scheduled: 0, completed: 0, cancelled: 0 };
  for (const { _id, count } of breakdownAgg) {
    const c = canonicalStatus(_id);
    if (c === "completed") todayBreakdown.completed += count;
    else if (c === "cancelled") todayBreakdown.cancelled += count;
    else if (c !== "no_show" && c !== "rescheduled") todayBreakdown.scheduled += count;
  }

  return {
    appointmentsToday,
    activePatients,
    pendingLabSamples,
    todayRevenue,
    revenueThisMonth,
    todayBreakdown,
  };
}

// -------------------- APPOINTMENTS --------------------
// NOTE: callers should pass client local date. UTC fallback may miss today's appts in UTC+ zones.
export async function receptionistGetAppointments(_receptionistId, { date } = {}) {
  const d = date || todayISO(); // prefer passing local date from browser

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

  let dob = null;
  if (body?.dateOfBirth) {
    dob = new Date(body.dateOfBirth);
    if (Number.isNaN(dob.getTime())) throw new Error("dateOfBirth is invalid");
  }
  const effectiveAge = dob ? computeAge(dob) : ageNum;

  if (effectiveAge !== null && (Number.isNaN(effectiveAge) || effectiveAge < 1 || effectiveAge > 120)) {
    throw new Error("Valid age is required (1-120)");
  }

  // Phone-duplicate guard: block only if exact same name + same number and not acknowledged.
  // Different-name same-number is allowed (families share a phone).
  const phoneMatches = await findPatientsByPhone(phone);
  if (phoneMatches.length > 0) {
    const nameLower = name.toLowerCase();
    const exactMatch = phoneMatches.find(
      (p) => String(p.name || "").toLowerCase() === nameLower
    );
    if (exactMatch && !body?.allowDuplicatePhone) {
      throw new Error(
        `A patient named "${exactMatch.name}" is already registered with this phone number. ` +
        `If this is really a different person, please confirm on the form.`
      );
    }
  }

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
    city:              body?.city              ? String(body.city).trim()              : "",
    country:           body?.country           ? String(body.country).trim()           : "",
    postalCode:         body?.postalCode         ? String(body.postalCode).trim()         : "",
    nationality:        body?.nationality        ? String(body.nationality).trim()        : "",
    preferredLanguage:  body?.preferredLanguage  ? String(body.preferredLanguage).trim()  : "",
    referralSource:     body?.referralSource     ? String(body.referralSource).trim()     : "",
  };

  if (effectiveAge !== null) payload.age = effectiveAge;
  if (dob) payload.dateOfBirth = dob;

  if (body?.emergencyContact && typeof body.emergencyContact === "object") {
    const ec = body.emergencyContact;
    payload.emergencyContact = {
      name:         String(ec.name         || "").trim(),
      relationship: String(ec.relationship || "").trim(),
      phone:        String(ec.phone        || "").trim(),
    };
  }

  if (body?.insurance && typeof body.insurance === "object") {
    payload.insurance = {
      provider: String(body.insurance.provider || "").trim(),
      ...(body.insurance.policyNumber
        ? { policyNumber: encryptField(String(body.insurance.policyNumber).trim()) }
        : {}),
    };
  }

  Object.assign(payload, encryptMedicalFields(body));

  const created = await Patient.create(payload);

  // Return frontend-friendly row
  return {
    id: created.publicId,
    name: created.name || "",
    phone: created.phone || "",
    age: created.dateOfBirth ? computeAge(created.dateOfBirth) : (created.age ?? ""),
    lastVisit: created.lastVisit || "",
    status: created.status || "active",
    original: { ...created.toJSON(), insurance: mapInsurance(created), ...mapMedicalInfo(created) },
  };
}

// ---------- UPDATE ----------
const PATIENT_EDITABLE_FIELDS = [
  "name",
  "phone",
  "email",
  "age",
  "gender",
  "address",
  "city",
  "status",
  "primaryDentist",
  "tags",
  "lastVisit",
  "dateOfBirth", "nationality", "preferredLanguage", "country", "postalCode", "referralSource",
  // "insurance"/"emergencyContact" handled separately below (merge, not blind pick+assign)
];

export async function receptionistUpdatePatient(_user, patientPublicId, body) {
  // +insurance.policyNumber: needed so the merge below preserves the existing
  // encrypted value when the incoming payload omits it (see patients.js for
  // the same pattern in updatePatientCore).
  const patient = await Patient.findOne({ publicId: String(patientPublicId || "").trim() })
    .select("+insurance.policyNumber");
  if (!patient) throw new Error("Patient not found");

  const updates = pick(body, PATIENT_EDITABLE_FIELDS);

  if (updates.name !== undefined) {
    const name = String(updates.name).trim();
    if (!name) throw new Error("name is required");
    updates.name = name;
  }

  if (updates.phone !== undefined) {
    const phone = String(updates.phone).trim();
    if (!phone) throw new Error("phone is required");

    const phoneMatches = await findPatientsByPhone(phone, patient._id);
    if (phoneMatches.length > 0) {
      const nameLower = String(updates.name || patient.name || "").toLowerCase();
      const exactMatch = phoneMatches.find(
        (p) => String(p.name || "").toLowerCase() === nameLower
      );
      if (exactMatch && !body?.allowDuplicatePhone) {
        throw new Error(
          `A patient named "${exactMatch.name}" is already registered with this phone number. ` +
          `If this is really a different person, please confirm on the form.`
        );
      }
    }

    updates.phone = phone;
  }

  // DOB is the source of truth once set — recompute + persist age from it.
  if (updates.dateOfBirth !== undefined) {
    if (updates.dateOfBirth === null || updates.dateOfBirth === "") {
      updates.dateOfBirth = null;
    } else {
      const dob = new Date(updates.dateOfBirth);
      if (Number.isNaN(dob.getTime())) throw new Error("dateOfBirth is invalid");
      updates.dateOfBirth = dob;
      updates.age = computeAge(dob);
    }
  } else if (updates.age !== undefined) {
    const ageNum = Number(updates.age);
    if (Number.isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      throw new Error("Valid age is required (1-120)");
    }
    updates.age = ageNum;
  }

  if (updates.email !== undefined) {
    updates.email = String(updates.email || "").trim();
  }

  if (updates.address !== undefined) {
    updates.address = String(updates.address || "").trim();
  }

  if (updates.city !== undefined) {
    updates.city = String(updates.city || "").trim();
  }

  if (updates.gender !== undefined) {
    updates.gender = String(updates.gender || "").trim();
  }

  if (updates.country            !== undefined) updates.country            = String(updates.country            || "").trim();
  if (updates.postalCode         !== undefined) updates.postalCode         = String(updates.postalCode         || "").trim();
  if (updates.nationality        !== undefined) updates.nationality        = String(updates.nationality        || "").trim();
  if (updates.preferredLanguage  !== undefined) updates.preferredLanguage  = String(updates.preferredLanguage  || "").trim();
  if (updates.referralSource     !== undefined) updates.referralSource     = String(updates.referralSource     || "").trim();

  if (updates.status !== undefined) {
    const status = String(updates.status || "").trim().toLowerCase();
    if (!["active", "inactive"].includes(status)) {
      throw new Error("status must be 'active' or 'inactive'");
    }
    updates.status = status;
  }

  if (updates.tags !== undefined) {
    updates.tags = Array.isArray(updates.tags)
      ? updates.tags.map((t) => String(t).trim()).filter(Boolean)
      : [];
  }

  if (updates.lastVisit !== undefined) {
    updates.lastVisit = String(updates.lastVisit || "").trim();
  }

  if (updates.primaryDentist !== undefined) {
    const key = String(updates.primaryDentist || "").trim();
    if (!key) {
      updates.primaryDentist = null;
    } else {
      const dentist = await User.findOne({
        role: "dentist",
        $or: [{ publicId: key }, { name: key }],
      }).select("_id");
      if (!dentist) throw new Error("Dentist not found");
      updates.primaryDentist = dentist._id;
    }
  }

  // Nested objects: MERGE onto the existing sub-object, never blind-replace —
  // same reasoning as updatePatientCore in shared/patients.js.
  if (body?.emergencyContact && typeof body.emergencyContact === "object") {
    const current = patient.emergencyContact?.toObject?.() || patient.emergencyContact || {};
    const incoming = body.emergencyContact;
    patient.emergencyContact = {
      name:         incoming.name         !== undefined ? String(incoming.name).trim()         : (current.name || ""),
      relationship: incoming.relationship !== undefined ? String(incoming.relationship).trim() : (current.relationship || ""),
      phone:        incoming.phone        !== undefined ? String(incoming.phone).trim()        : (current.phone || ""),
    };
  }

  if (body?.insurance && typeof body.insurance === "object") {
    const current = patient.insurance?.toObject?.() || patient.insurance || {};
    const incoming = body.insurance;
    patient.insurance = {
      provider: incoming.provider !== undefined ? String(incoming.provider).trim() : (current.provider || ""),
      policyNumber: incoming.policyNumber
        ? encryptField(String(incoming.policyNumber).trim())
        : (current.policyNumber || ""),
    };
  }

  Object.assign(updates, encryptMedicalFields(body));

  Object.assign(patient, updates);
  await patient.save();

  return {
    id: patient.publicId,
    name: patient.name || "",
    phone: patient.phone || "",
    age: patient.dateOfBirth ? computeAge(patient.dateOfBirth) : (patient.age ?? ""),
    lastVisit: patient.lastVisit || "",
    status: patient.status || "active",
    // insurance.policyNumber was explicitly selected above for the merge —
    // strip it before returning so the ciphertext never reaches the client.
    original: { ...patient.toJSON(), insurance: mapInsurance(patient), ...mapMedicalInfo(patient) },
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
    allergies: mapMedicalInfo(patient).allergies,
    original: { ...patient, ...mapMedicalInfo(patient), odontogram: mapOdontogram(patient) },
  };
}

// ---------- CREATE APPOINTMENT ----------
export async function receptionistCreateAppointment(_user, body) {
  const date = String(body?.date || "").trim();
  const time = String(body?.time || "").trim();
  const reason = String(body?.reason || "").trim();

  const feeScheduleId = String(body?.feeScheduleId || "").trim();
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
  await assertNoSlotConflict({ dentist: dentist._id, date, time });

  const publicId = await generateAppointmentPublicId();

const created = await Appointment.create({
  publicId,               // ✅ FIX: required by schema
  patient: patient._id,
  dentist: dentist._id,
  date,
  time,
  reason,
  status: "confirmed",
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
    status: toUiAppointmentStatus(populated.status),
    original: populated,
  };
}

function isoToPretty(iso) {
  if (!iso) return "";
  // if it's already "YYYY-MM-DD"
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return String(iso);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

// -------------------- PATIENTS LIST --------------------
export async function receptionistGetPatients(_receptionistId, { q, limit, page, sortBy, sortDir } = {}) {
  const { page: P, limit: L, skip, sortDir: sd, sortBy: sb } = parsePagination({ page, limit, sortBy, sortDir });

  const filter = {};
  const needle = String(q || "").trim();
  if (needle) {
    filter.$or = [
      { name: { $regex: needle, $options: "i" } },
      { phone: { $regex: needle, $options: "i" } },
      { address: { $regex: needle, $options: "i" } },
      { publicId: { $regex: needle, $options: "i" } },
    ];
  }

  const sort = buildSort(sb, sd, { createdAt: -1 });
  const [total, patients] = await Promise.all([
    Patient.countDocuments(filter),
    Patient.find(filter)
      .select("+insurance.policyNumber") // only to derive hasPolicyNumber below — never returned raw
      .sort(sort)
      .skip(skip)
      .limit(L)
      .lean(),
  ]);

  // Fetch last visit per patient using appointments (fast + accurate)
  const patientIds = patients.map((p) => p._id);

  const lastVisits = await Appointment.aggregate([
    { $match: { patient: { $in: patientIds } } },
    { $sort: { date: -1, createdAt: -1 } },
    { $group: { _id: "$patient", lastVisit: { $first: "$date" } } },
  ]);

  const lastVisitMap = new Map(lastVisits.map((x) => [String(x._id), x.lastVisit]));

  const toothClinicalByPatient = await latestToothEntriesByPatient(patients.map((p) => p.publicId));

  const rows = patients.map((p) => {
    const lastVisitISO = lastVisitMap.get(String(p._id)) || p.lastVisit || null;

    return {
      id: p.publicId || String(p.mr || p._id),
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
      ...mapMedicalInfo(p),
      // Same prescription overlay as the owner view — receptionist sees the
      // full per-tooth clinical picture (read-only).
      odontogram: mergeToothClinical(mapOdontogram(p), toothClinicalByPatient.get(p.publicId)),
      lastVisit: isoToPretty(lastVisitISO),
      status: p.status || "active",
      mr: p.mr ?? null,
      address: p.address ?? "",
      registrationDate: isoToPretty(p.createdAt || p.registrationDate),
      original: { ...p, ...mapMedicalInfo(p) },
    };
  });

  const pages = Math.max(1, Math.ceil(total / L));
  return { rows, total, page: P, pages };
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
export async function receptionistListAppointments(_receptionistId, { date, dentist, status, q, page, limit, sortBy, sortDir } = {}) {
  const { page: P, limit: L, sortDir: sd, sortBy: sb } = parsePagination({ page, limit, sortBy, sortDir });

  const filter = {};
  if (date) filter.date = String(date);
  if (status && status !== "All") filter.status = toDbAppointmentStatus(status);

  const sort = buildSort(sb, sd, { date: -1, time: 1 });

  const rows = await Appointment.find(filter)
    .populate("patient", "name publicId mr phone age gender")
    .populate("dentist", "name publicId specialization")
    .sort(sort)
    .lean();

  let mapped = rows.map((a) => ({
    id: a.publicId,
    mr: a.patient?.mr ?? null,
    patientId: a.patient?.publicId || "",
    patientName: a.patient?.name || "",
    dentistId: a.dentist?.publicId || "",
    dentist: a.dentist?.name || "",
    specialization: a.dentist?.specialization || "",
    date: a.date,
    time: a.time,
    reason: a.reason || "",
    appointmentType: a.appointmentType || "",
    status: toUiAppointmentStatus(a.status),
    // Canonical value + legal next-states drive AppointmentStatusControl
    // (incl. the Reopen option) in the receptionist table.
    statusCode: canonicalStatus(a.status),
    allowedNext: allowedNextStatuses(a.status),
    editLocked: isEditLocked(a.status),
    original: a,
  }));

  if (dentist && dentist !== "All") {
    const dk = String(dentist).toLowerCase();
    mapped = mapped.filter((x) => String(x.dentistId).toLowerCase() === dk);
  }

  const needle = String(q || "").trim().toLowerCase();
  if (needle) {
    mapped = mapped.filter((x) =>
      `${x.id} ${x.patientName} ${x.dentist} ${x.reason} ${x.status} ${x.date} ${x.time}`
        .toLowerCase()
        .includes(needle)
    );
  }

  return paginateArray(mapped, P, L);
}

// ✅ Update status by publicId
/**
 * Full front-desk appointment edit — date, time, dentist, patient, type,
 * reason, notes. Delegates to the shared core so the slot-conflict rule and
 * field coverage are identical to the owner's edit (no third copy).
 * Route is gated by tab_receptionist_appointments.
 */
export async function receptionistUpdateAppointment(_receptionistId, apptPublicId, body) {
  return updateAppointmentCore(apptPublicId, body);
}

/**
 * Status change — delegates to the shared core so the receptionist gets the
 * SAME rules as every other role: transition validation AND the slot re-check
 * that runs when an appointment moves back into an occupying status (reopen).
 * This previously had its own copy that skipped assertNoSlotConflict, which
 * let a receptionist reopen straight into a slot someone else had taken.
 */
/** Front-desk reschedule — same shared core (and slot check) as the owner. */
export async function receptionistRescheduleAppointment(_receptionistId, apptPublicId, body) {
  return rescheduleAppointmentCore(apptPublicId, body);
}

export async function receptionistUpdateAppointmentStatus(_receptionistId, apptPublicId, { status }) {
  if (!String(status || "").trim()) throw new Error("status is required");
  return updateAppointmentStatusCore(apptPublicId, status);
}



// ---------- LIST ----------
export async function receptionistListLabSamples(_receptionistId, { status, q, date, page, limit, sortBy, sortDir } = {}) {
  const { page: P, limit: L, sortDir: sd, sortBy: sb } = parsePagination({ page, limit, sortBy, sortDir });

  const filter = {};
  if (date) {
    const d = String(date);
    filter.createdAt = {
      $gte: new Date(`${d}T00:00:00.000Z`),
      $lt: new Date(`${d}T23:59:59.999Z`),
    };
  }
  if (status && status !== "All") filter.status = toDbLabStatus(status);

  const sort = buildSort(sb, sd, { createdAt: -1 });

  const rows = await LabCase.find(filter)
    .populate("patient", "name publicId mr phone")
    .populate("dentist", "name publicId")
    .populate("lab", "name publicId")
    .populate("sampleType", "name publicId")
    .sort(sort)
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

  return paginateArray(mapped, P, L);
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

  // Delegate to shared helper — receptionist has free transitions; ownership unrestricted
  const c = await sharedUpdateStatus("receptionist", _user?._id ?? null, casePublicId, uiStatus);

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

  await c.softDelete();
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
    .select("name publicId price")
    .sort({ name: 1 })
    .lean();

  return rows.map((x) => ({
    id: x.publicId || String(x._id),
    name: x.name || "",
    price: Number(x.price) || 0,
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
  const status = invoiceStatus(totalAmount, paidAmount);

  return {
    id: inv.publicId,
    mr: inv.patient?.mr ?? null,
    patientName: inv.patient?.name || "",
    // The itemised PDF prints patient ID, dentist and the quoting schedule.
    patientId: inv.patient?.publicId || "",
    dentistId: inv.dentist?.publicId || "",
    dentistName: inv.dentist?.name || "",
    feeScheduleId: inv.feeScheduleId || "",
    date: inv.date,
    totalAmount,
    paidAmount,
    status,
    items: Array.isArray(inv.items)
      ? inv.items.map((it) => ({
          kind: it.kind,
          refId: it.refId || "",
          name: it.name || "",
          unitPrice: Number(it.unitPrice) || 0,
          qty: Number(it.qty) || 1,
          lineTotal: Number(it.lineTotal) || 0,
          priceOverridden: !!it.priceOverridden,
        }))
      : [],
    payments: payments.map((p) => ({
      id: p.publicId,          // ✅ frontend expects id
      amount: Number(p.amount || 0),
      mode: p.mode,
      date: p.date,
    })),
    original: inv,
  };
};

/**
 * Atomic invoice number via the shared Counter.
 *
 * The previous countDocuments()+exists() loop read THROUGH the softDelete
 * filter, so a soft-deleted invoice made the count fall back and made its
 * publicId look free — while the unique index (which does not ignore
 * soft-deleted rows) still held it. The next create then died on a duplicate
 * key. Two invoices created concurrently could also collide.
 *
 * The seed scans with includeDeleted so retired numbers are never reissued.
 */
async function generateInvoicePublicId() {
  const seq = await getNextSequence("invoice", async () => {
    const rows = await Invoice.find({})
      .setOptions({ includeDeleted: true })
      .select("publicId")
      .lean();
    let max = 1000;
    for (const r of rows) {
      const m = /^INV-(\d+)$/.exec(String(r.publicId || ""));
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return max;
  });
  return `INV-${seq}`;
}

async function generatePaymentPublicId(invoice) {
  const payments = Array.isArray(invoice?.payments) ? invoice.payments : [];
  return `PAY-${payments.length + 1}`;
}

// ✅ CREATE INVOICE
export async function receptionistCreateInvoice(_user, body) {
  const date = String(body?.date || "").trim();
  const rawItems = Array.isArray(body?.items) ? body.items : [];

  const feeScheduleId = String(body?.feeScheduleId || "").trim();
  const patientKey = body?.patientId || body?.mr || body?.phone;
  const dentistKey = body?.dentistId || body?.dentist || body?.dentistName; // optional

  if (!patientKey) throw new Error("patientId (or mr/phone) is required");
  if (!date) throw new Error("date is required");

  // Server-side totalAmount computation from items (preferred) or body.totalAmount (legacy compat)
  let totalAmount;
  let validatedItems = [];

  if (rawItems.length > 0) {
    // Shared core: validates kinds, RESOLVES treatment prices from the chosen
    // fee schedule (client prices honoured only on flagged overrides) and
    // computes every line total server-side.
    const priced = await validateAndPriceItems(rawItems, feeScheduleId);
    validatedItems = priced.items;
    totalAmount = priced.totalAmount;
    if (totalAmount <= 0) throw new Error("Invoice total must be > 0");
  } else {
    totalAmount = Number(body?.totalAmount);
    if (!totalAmount || totalAmount <= 0) throw new Error("totalAmount must be > 0");
  }

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
    items: validatedItems,
    feeScheduleId,
    payments: [],
  });

  const populated = await Invoice.findById(created._id)
    .populate("patient", "name publicId mr phone")
    .populate("dentist", "name publicId specialization")
    .lean();

  return toUiInvoice(populated);
}

// ✅ LIST INVOICES
export async function receptionistListInvoices(_receptionistId, { q, status, page, limit, sortBy, sortDir } = {}) {
  const { page: P, limit: L, sortDir: sd, sortBy: sb } = parsePagination({ page, limit, sortBy, sortDir });

  const sort = buildSort(sb, sd, { date: -1, createdAt: -1 });

  const rows = await Invoice.find({})
    .populate("patient", "name publicId mr phone")
    .populate("dentist", "name publicId specialization")
    .sort(sort)
    .lean({ virtuals: true });

  let mapped = rows.map(toUiInvoice);

  if (status && status !== "All") {
    mapped = mapped.filter((x) => x.status === String(status).trim());
  }

  const needle = String(q || "").trim().toLowerCase();
  if (needle) {
    mapped = mapped.filter((x) =>
      `${x.id} ${x.patientName} ${x.mr ?? ""} ${x.status} ${x.date}`
        .toLowerCase()
        .includes(needle)
    );
  }

  return paginateArray(mapped, P, L);
}

// ✅ BILLING STATS (Invoices + LabBills merged)
export async function receptionistBillingStats(_receptionistId, { month } = {}) {
  const m = String(month || monthISO()).trim(); // "YYYY-MM"
  const dateFrom = `${m}-01`;
  const dateTo = `${m}-31`;

  // invoice status counts for month
  const invRows = await Invoice.find({ date: { $gte: dateFrom, $lte: dateTo } })
    .lean({ virtuals: true });

  const statuses = invRows.map((inv) => {
    const total = Number(inv.totalAmount || 0);
    const payments = Array.isArray(inv.payments) ? inv.payments : [];
    const paidAmount = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    return invoiceStatus(total, paidAmount);
  });

  const pending = statuses.filter((s) => s === "Pending").length;
  const partial = statuses.filter((s) => s === "Partial").length;
  const paid = statuses.filter((s) => s === "Paid").length;

  const outstandingTotal = await outstanding(dateFrom, dateTo);

  // lab bills for month
  const labRows = await LabBill.find({ month: m }).lean();
  const labTotal = labRows.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  return {
    month: m,
    pending,
    partial,
    paid,
    outstanding: outstandingTotal,
    labTotal,
    grandOutstanding: outstandingTotal + labTotal,
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


const mapInventoryItem = (x) => ({
  id: x.publicId,
  name: x.name || "",
  category: x.category || "",
  stock: Number(x.stock || 0),
  minStock: Number(x.minStock || 0),
  unit: x.unit || "",
  usedIn: Array.isArray(x.usedIn) ? x.usedIn : [],

  // optional extras (safe)
  sku: x.sku || "",
  supplier: x.supplier || "",
  unitCost: Number(x.unitCost || 0),
  location: x.location || "",
  expiryDate: x.expiryDate || "",
  packSize: Number(x.packSize || 0),

  original: x,
});


// Optional: consume stock (future use, keeps your clinic realistic)
export async function receptionistConsumeInventory(_receptionistId, itemPublicId, body) {
  const qtyUsed = Number(body?.qtyUsed);
  if (!qtyUsed || qtyUsed <= 0) throw new Error("qtyUsed must be > 0");

  const item = await InventoryItem.findOne({ publicId: itemPublicId });
  if (!item) throw new Error("Item not found");

  const current = Number(item.stock || 0);
  if (qtyUsed > current) throw new Error("Not enough stock");

  item.stock = current - qtyUsed;
  item.history = item.history || [];
  item.history.push({
    publicId: `MOV-${Date.now()}`,
    date: todayISO(),
    type: "use",
    qty: qtyUsed,
    note: String(body?.note || "").trim(),
    treatmentName: String(body?.treatmentName || "").trim(),
  });

  await item.save();
  const row = await InventoryItem.findById(item._id).lean();
  return mapInventoryItem(row);
}

const toUiItem = (x) => ({
  id: x.publicId,
  name: x.name || "",
  category: x.category || "",
  unit: x.unit || "",
  stock: Number(x.qty || 0),
  minStock: Number(x.reorderLevel || 0),
  usedIn: Array.isArray(x.usedIn) ? x.usedIn : [],
  supplier: x.supplier || "",
  location: x.location || "",
  expiryDate: x.expiryDate || "",
  unitCost: Number(x.unitCost || 0),
  original: x,
});

export async function receptionistListInventory(_receptionistId, { q, stockFilter, page, limit, sortBy, sortDir } = {}) {
  const { page: P, limit: L, sortDir: sd, sortBy: sb } = parsePagination({ page, limit, sortBy, sortDir });

  const filter = {};
  const needle = String(q || "").trim();
  if (needle) {
    filter.$or = [
      { name: { $regex: needle, $options: "i" } },
      { category: { $regex: needle, $options: "i" } },
      { sku: { $regex: needle, $options: "i" } },
      { publicId: { $regex: needle, $options: "i" } },
    ];
  }

  const sort = buildSort(sb, sd, { createdAt: -1 });
  const rows = await InventoryItem.find(filter).sort(sort).lean();

  let mapped = rows.map(toUiItem);

  const sf = String(stockFilter || "").trim();
  if (sf && sf !== "All") {
    if (sf === "Out") mapped = mapped.filter((i) => i.stock === 0);
    if (sf === "Low") mapped = mapped.filter((i) => i.stock <= i.minStock && i.stock > 0);
    if (sf === "InStock") mapped = mapped.filter((i) => i.stock > i.minStock);
  }

  return paginateArray(mapped, P, L);
}

export async function receptionistInventoryStats(_receptionistId) {
  const rows = await InventoryItem.find({}).lean();
  const items = rows.map(toUiItem);

  return {
    totalItems: items.length,
    lowStock: items.filter((i) => i.stock <= i.minStock && i.stock > 0).length,
    outOfStock: items.filter((i) => i.stock === 0).length,
  };
}

export async function receptionistCreateInventoryItem(_receptionistId, body) {
  const name = String(body?.name || "").trim();
  if (!name) throw new Error("name is required");

  const qty = Number(body?.qty ?? body?.stock ?? 0);
  const reorderLevel = Number(body?.reorderLevel ?? body?.minStock ?? 0);

  const usedIn = Array.isArray(body?.usedIn)
    ? body.usedIn
    : String(body?.usedIn || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

  const created = await InventoryItem.create({
    // publicId auto-generated by model hook
    name,
    sku: String(body?.sku || "").trim(),
    category: String(body?.category || "").trim(),
    unit: String(body?.unit || "").trim(),

    qty: Number.isFinite(qty) && qty >= 0 ? qty : 0,
    reorderLevel: Number.isFinite(reorderLevel) && reorderLevel >= 0 ? reorderLevel : 0,
    unitCost: Number(body?.unitCost || 0) || 0,

    supplier: String(body?.supplier || "").trim(),
    location: String(body?.location || "").trim(),
    expiryDate: String(body?.expiryDate || "").trim(),
    usedIn,
  });

  return toUiItem(created.toJSON());
}

export async function receptionistUpdateInventoryItem(_receptionistId, itemPublicId, body) {
  const item = await InventoryItem.findOne({ publicId: itemPublicId });
  if (!item) throw new Error("Item not found");

  // update fields safely
  if (body?.name !== undefined) item.name = String(body.name || "").trim();
  if (body?.sku !== undefined) item.sku = String(body.sku || "").trim();
  if (body?.category !== undefined) item.category = String(body.category || "").trim();
  if (body?.unit !== undefined) item.unit = String(body.unit || "").trim();

  // allow stock edits
  if (body?.qty !== undefined || body?.stock !== undefined) {
    const qty = Number(body.qty ?? body.stock);
    if (!Number.isFinite(qty) || qty < 0) throw new Error("qty must be >= 0");
    item.qty = qty;
  }

  if (body?.reorderLevel !== undefined || body?.minStock !== undefined) {
    const rl = Number(body.reorderLevel ?? body.minStock);
    if (!Number.isFinite(rl) || rl < 0) throw new Error("reorderLevel must be >= 0");
    item.reorderLevel = rl;
  }

  if (body?.unitCost !== undefined) {
    const cost = Number(body.unitCost);
    if (!Number.isFinite(cost) || cost < 0) throw new Error("unitCost must be >= 0");
    item.unitCost = cost;
  }

  if (body?.supplier !== undefined) item.supplier = String(body.supplier || "").trim();
  if (body?.location !== undefined) item.location = String(body.location || "").trim();
  if (body?.expiryDate !== undefined) item.expiryDate = String(body.expiryDate || "").trim();

  // usedIn: accept array or comma string
  if (body?.usedIn !== undefined) {
    const usedIn = Array.isArray(body.usedIn)
      ? body.usedIn
      : String(body.usedIn || "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);

    item.usedIn = usedIn;
  }

  await item.save();
  const fresh = await InventoryItem.findById(item._id).lean();

  return toUiItem(fresh);
}

export async function receptionistDeleteInventoryItem(_receptionistId, itemPublicId) {
  const item = await InventoryItem.findOne({ publicId: itemPublicId });
  if (!item) throw new Error("Item not found");

  await InventoryItem.deleteOne({ _id: item._id });

  return { message: "Deleted", id: itemPublicId };
}