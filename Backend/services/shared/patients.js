import Patient from "../../models/Patient.model.js";
import { parsePagination, buildSort } from "./paginate.js";

const cleanPhone = (s) => String(s || "").replace(/[^\d]/g, "");
const pad = (n, w = 4) => String(n).padStart(w, "0");

export const PATIENT_EDITABLE_FIELDS = [
  "name", "phone", "email", "age", "gender",
  "address", "city", "status", "primaryDentist", "tags", "lastVisit",
];

export async function findPatientByPhoneDigits(phone, excludeId = null) {
  const target = cleanPhone(phone);
  if (!target) return null;
  const query = excludeId ? { _id: { $ne: excludeId } } : {};
  const candidates = await Patient.find(query).select("phone").lean();
  return candidates.find((p) => cleanPhone(p.phone) === target) || null;
}

export async function generatePatientPublicId() {
  let n = (await Patient.countDocuments({})) + 1;
  while (true) {
    const publicId = `PT-${pad(n)}`;
    const exists = await Patient.exists({ publicId });
    if (!exists) return { publicId, mr: n };
    n += 1;
  }
}

export async function createPatientCore(body) {
  const name    = String(body?.name    || "").trim();
  const phone   = String(body?.phone   || "").trim();
  const address = String(body?.address || "").trim();

  if (!name)    throw new Error("name is required");
  if (!phone)   throw new Error("phone is required");
  if (!address) throw new Error("address is required");

  const ageRaw = body?.age;
  const ageNum =
    ageRaw !== undefined && ageRaw !== null && ageRaw !== "" ? Number(ageRaw) : null;

  if (ageNum !== null && (Number.isNaN(ageNum) || ageNum < 1 || ageNum > 120)) {
    throw new Error("Valid age is required (1-120)");
  }

  const existing = await findPatientByPhoneDigits(phone);
  if (existing) throw new Error("Patient with this phone already exists");

  const { publicId, mr } = await generatePatientPublicId();

  const payload = {
    publicId, mr, name, phone, address,
    gender:    body?.gender    ? String(body.gender)             : null,
    email:     body?.email     ? String(body.email).trim()       : "",
    lastVisit: body?.lastVisit ? String(body.lastVisit)          : "",
  };
  if (ageNum !== null) payload.age = ageNum;

  return Patient.create(payload);
}

export async function updatePatientCore(patientPublicId, body) {
  const patient = await Patient.findOne({ publicId: String(patientPublicId || "").trim() });
  if (!patient) throw new Error("Patient not found");

  const pick = (obj, keys) =>
    keys.reduce((acc, k) => { if (obj?.[k] !== undefined) acc[k] = obj[k]; return acc; }, {});

  const updates = pick(body, PATIENT_EDITABLE_FIELDS);

  if (updates.name !== undefined) {
    const name = String(updates.name).trim();
    if (!name) throw new Error("name is required");
    updates.name = name;
  }

  if (updates.phone !== undefined) {
    const phone = String(updates.phone).trim();
    if (!phone) throw new Error("phone is required");
    const dup = await findPatientByPhoneDigits(phone, patient._id);
    if (dup) throw new Error("Patient with this phone already exists");
    updates.phone = phone;
  }

  if (updates.age !== undefined) {
    const ageNum = Number(updates.age);
    if (Number.isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      throw new Error("Valid age is required (1-120)");
    }
    updates.age = ageNum;
  }

  if (updates.email   !== undefined) updates.email   = String(updates.email   || "").trim();
  if (updates.address !== undefined) updates.address = String(updates.address || "").trim();
  if (updates.city    !== undefined) updates.city    = String(updates.city    || "").trim();
  if (updates.gender  !== undefined) updates.gender  = String(updates.gender  || "").trim();

  if (updates.status !== undefined) {
    const st = String(updates.status || "").trim().toLowerCase();
    if (!["active", "inactive"].includes(st)) throw new Error("status must be 'active' or 'inactive'");
    updates.status = st;
  }

  Object.assign(patient, updates);
  await patient.save();
  return patient.toJSON();
}

/** Shared paginated patient list used by dentist and receptionist. */
export async function listPatientsCore({ page, limit, sortBy, sortDir, q } = {}) {
  const { page: P, limit: L, skip, sortDir: sd, sortBy: sb } =
    parsePagination({ page, limit, sortBy, sortDir });

  const sort   = buildSort(sb, sd, { createdAt: -1 });
  const filter = {};

  const qStr = String(q || "").trim();
  if (qStr) {
    filter.$or = [
      { name:     { $regex: qStr, $options: "i" } },
      { phone:    { $regex: qStr, $options: "i" } },
      { publicId: { $regex: qStr, $options: "i" } },
    ];
  }

  const [total, patients] = await Promise.all([
    Patient.countDocuments(filter),
    Patient.find(filter)
      .populate("primaryDentist", "name publicId")
      .sort(sort)
      .skip(skip)
      .limit(L)
      .lean(),
  ]);

  const rows = patients.map((p) => ({
    id:        p.publicId,
    mr:        p.mr ?? null,
    name:      p.name    || "",
    phone:     p.phone   || "",
    age:       p.age     ?? "",
    gender:    p.gender  || "",
    city:      p.city    || "",
    status:    p.status  || "active",
    lastVisit: p.lastVisit || "",
    dentist:   p.primaryDentist?.name    || "",
    dentistId: p.primaryDentist?.publicId || "",
  }));

  return { rows, total, page: P, pages: Math.max(1, Math.ceil(total / L)) };
}
