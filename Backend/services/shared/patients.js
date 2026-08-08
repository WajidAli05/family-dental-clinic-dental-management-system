import Patient from "../../models/Patient.model.js";
import { parsePagination, buildSort } from "./paginate.js";
import {
  encryptField,
  decryptField,
  encryptMedications,
  decryptMedications,
  PATIENT_MEDICAL_PHI_STRING_FIELDS,
} from "../../utils/fieldEncryption.js";
import { getNextSequence } from "./counters.js";

const cleanPhone = (s) => String(s || "").replace(/[^\d]/g, "");
const pad = (n, w = 4) => String(n).padStart(w, "0");

export const PATIENT_EDITABLE_FIELDS = [
  "name", "phone", "email", "age", "gender",
  "address", "city", "status", "primaryDentist", "tags", "lastVisit",
  "dateOfBirth", "nationality", "preferredLanguage", "country", "postalCode", "referralSource",
  // NOTE: "insurance" and "emergencyContact" are deliberately NOT in this list —
  // they're nested objects that need a merge (not blind pick+assign) so a
  // partial edit can't silently wipe a sibling sub-field. Handled separately
  // in createPatientCore/updatePatientCore below.
];

/** DOB is the source of truth once set; age stays populated for backward
 * compatibility with every existing reader of patient.age. */
export function computeAge(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 ? age : null;
}

/** insurance.policyNumber is encrypted + select:false — never return the raw
 * value, only whether one is on file. */
export function mapInsurance(p) {
  return {
    provider: p?.insurance?.provider || "",
    hasPolicyNumber: Boolean(p?.insurance?.policyNumber),
  };
}

export function mapEmergencyContact(p) {
  return {
    name: p?.emergencyContact?.name || "",
    relationship: p?.emergencyContact?.relationship || "",
    phone: p?.emergencyContact?.phone || "",
  };
}

const ALLERGY_SEVERITIES = ["mild", "moderate", "severe"];

function sanitizeAllergies(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((a) => ({
      allergen: String(a?.allergen || "").trim(),
      severity: ALLERGY_SEVERITIES.includes(String(a?.severity || "").toLowerCase())
        ? String(a.severity).toLowerCase()
        : "moderate",
    }))
    .filter((a) => a.allergen);
}

/** Encrypt whichever medicalInfo fields are present in body into a patch
 * object (safe for both create and partial-update payloads — only touches
 * keys the caller actually sent). None of these fields are ever queried,
 * filtered, or sorted on (Rule A), so encrypting them is safe. */
export function encryptMedicalFields(body) {
  const out = {};
  for (const f of PATIENT_MEDICAL_PHI_STRING_FIELDS) {
    if (body?.[f] !== undefined) out[f] = encryptField(String(body[f] || "").trim());
  }
  if (body?.allergies !== undefined) {
    const clean = sanitizeAllergies(body.allergies);
    out.allergies = clean.length ? encryptMedications(clean) : "";
  }
  return out;
}

/** Decrypt medicalInfo fields for API responses. Never returns ciphertext. */
export function mapMedicalInfo(p) {
  const out = {};
  for (const f of PATIENT_MEDICAL_PHI_STRING_FIELDS) {
    out[f] = decryptField(p?.[f] || "");
  }
  out.allergies = decryptMedications(p?.allergies || "");
  return out;
}

/** True if the request body touches any medicalInfo field — used by audit
 * logging to record THAT medical data changed, never the decrypted content. */
export function medicalFieldsChanged(body) {
  return PATIENT_MEDICAL_PHI_STRING_FIELDS.some((f) => body?.[f] !== undefined) || body?.allergies !== undefined;
}

export async function findPatientByPhoneDigits(phone, excludeId = null) {
  const target = cleanPhone(phone);
  if (!target) return null;
  const query = excludeId ? { _id: { $ne: excludeId } } : {};
  const candidates = await Patient.find(query).select("phone").lean();
  return candidates.find((p) => cleanPhone(p.phone) === target) || null;
}

// Return ALL patients whose digits-only phone matches, with the fields needed
// for the "family on this number" warning in registration forms.
export async function findPatientsByPhone(phone, excludeId = null) {
  const target = cleanPhone(phone);
  if (!target) return [];
  const query = excludeId ? { _id: { $ne: excludeId } } : {};
  const candidates = await Patient.find(query).select("phone name publicId age gender").lean();
  return candidates.filter((p) => cleanPhone(p.phone) === target);
}

// Seed (first bootstrap only): true max existing `mr`, including soft-deleted
// patients — publicId/mr are unique at the DB level regardless of
// soft-delete state, so a soft-deleted patient still occupies its slot.
// Seeded from `mr` (a plain Number field) rather than parsing the publicId
// string: some legacy records have a malformed publicId (from an old seed
// script bug) while `mr` stayed a clean, correctly-sequential integer —
// parsing publicId would inherit that corruption into every new patient.
async function computePatientIdSeed() {
  const top = await Patient.findOne({})
    .select("mr")
    .setOptions({ includeDeleted: true })
    .sort({ mr: -1 })
    .lean();
  return top?.mr || 0;
}

export async function generatePatientPublicId() {
  const n = await getNextSequence("patient", computePatientIdSeed);
  return { publicId: `PT-${pad(n)}`, mr: n };
}

export async function createPatientCore(body) {
  const name    = String(body?.name    || "").trim();
  const phone   = String(body?.phone   || "").trim();
  const address = String(body?.address || "").trim();

  if (!name)    throw new Error("name is required");
  if (!phone)   throw new Error("phone is required");
  if (!address) throw new Error("address is required");

  let dob = null;
  if (body?.dateOfBirth) {
    dob = new Date(body.dateOfBirth);
    if (Number.isNaN(dob.getTime())) throw new Error("dateOfBirth is invalid");
  }

  const ageRaw = body?.age;
  const ageNum = dob
    ? computeAge(dob)
    : (ageRaw !== undefined && ageRaw !== null && ageRaw !== "" ? Number(ageRaw) : null);

  if (ageNum !== null && (Number.isNaN(ageNum) || ageNum < 1 || ageNum > 120)) {
    throw new Error("Valid age is required (1-120)");
  }

  // Phone-duplicate guard:
  //   - allowDuplicatePhone=true  → always allow (user acknowledged family sharing)
  //   - same name + same number   → always block (very likely accidental re-entry)
  //   - different name, same #    → allow (different family member)
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
    // Different name → proceed (family sharing).  If exactMatch but flag is set → also proceed.
  }

  const { publicId, mr } = await generatePatientPublicId();

  const payload = {
    publicId, mr, name, phone, address,
    gender:    body?.gender    ? String(body.gender)             : null,
    email:     body?.email     ? String(body.email).trim()       : "",
    lastVisit: body?.lastVisit ? String(body.lastVisit)          : "",
    city:              body?.city              ? String(body.city).trim()              : "",
    country:           body?.country           ? String(body.country).trim()           : "",
    postalCode:         body?.postalCode         ? String(body.postalCode).trim()         : "",
    nationality:        body?.nationality        ? String(body.nationality).trim()        : "",
    preferredLanguage:  body?.preferredLanguage  ? String(body.preferredLanguage).trim()  : "",
    referralSource:     body?.referralSource     ? String(body.referralSource).trim()     : "",
  };
  if (ageNum !== null) payload.age = ageNum;
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

  return Patient.create(payload);
}

export async function updatePatientCore(patientPublicId, body) {
  // +insurance.policyNumber: needed so the merge below (not blind-replace)
  // preserves the existing encrypted value when the incoming payload omits it.
  const patient = await Patient.findOne({ publicId: String(patientPublicId || "").trim() })
    .select("+insurance.policyNumber");
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
    // On update we only guard against exact-same-name matches on a different record.
    // Family sharing (different names, same #) is always allowed on update too.
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

  // DOB is the source of truth once set — recompute + persist age from it,
  // overriding any manually-submitted age in the same payload.
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

  if (updates.email   !== undefined) updates.email   = String(updates.email   || "").trim();
  if (updates.address !== undefined) updates.address = String(updates.address || "").trim();
  if (updates.city    !== undefined) updates.city    = String(updates.city    || "").trim();
  if (updates.gender  !== undefined) updates.gender  = String(updates.gender  || "").trim();
  if (updates.country            !== undefined) updates.country            = String(updates.country            || "").trim();
  if (updates.postalCode         !== undefined) updates.postalCode         = String(updates.postalCode         || "").trim();
  if (updates.nationality        !== undefined) updates.nationality        = String(updates.nationality        || "").trim();
  if (updates.preferredLanguage  !== undefined) updates.preferredLanguage  = String(updates.preferredLanguage  || "").trim();
  if (updates.referralSource     !== undefined) updates.referralSource     = String(updates.referralSource     || "").trim();

  if (updates.status !== undefined) {
    const st = String(updates.status || "").trim().toLowerCase();
    if (!["active", "inactive"].includes(st)) throw new Error("status must be 'active' or 'inactive'");
    updates.status = st;
  }

  // Nested objects: MERGE onto the existing sub-object, never blind-replace —
  // a partial edit (e.g. only emergencyContact.phone changing) must not wipe
  // sibling sub-fields, and must not silently clear the encrypted policyNumber
  // just because this particular request didn't resend it.
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

  // Defense in depth: insurance.policyNumber was explicitly selected above
  // for the merge, so it IS present in memory now — strip it from the
  // returned JSON so no caller can accidentally leak the ciphertext.
  const json = patient.toJSON();
  json.insurance = mapInsurance(patient);
  Object.assign(json, mapMedicalInfo(patient));
  return json;
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
      .select("+insurance.policyNumber") // only to derive hasPolicyNumber below — never returned raw
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
    age:       p.dateOfBirth ? computeAge(p.dateOfBirth) : (p.age ?? ""),
    dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth).toISOString().slice(0, 10) : "",
    gender:    p.gender  || "",
    city:      p.city    || "",
    country:   p.country || "",
    postalCode: p.postalCode || "",
    nationality: p.nationality || "",
    preferredLanguage: p.preferredLanguage || "",
    referralSource: p.referralSource || "",
    emergencyContact: mapEmergencyContact(p),
    insurance: mapInsurance(p),
    ...mapMedicalInfo(p),
    status:    p.status  || "active",
    lastVisit: p.lastVisit || "",
    dentist:   p.primaryDentist?.name    || "",
    dentistId: p.primaryDentist?.publicId || "",
  }));

  return { rows, total, page: P, pages: Math.max(1, Math.ceil(total / L)) };
}
