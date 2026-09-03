import crypto from "node:crypto";
import Consent from "../../models/Consent.model.js";
import Patient from "../../models/Patient.model.js";
import { getNextSequence } from "./counters.js";
import { parsePagination, paginateArray, buildSort } from "./paginate.js";
import { storeUpload, softDeleteFile } from "./files.js";
import { getConsentTemplate, isProcedureType, PROCEDURE_TYPES } from "./consentTemplates.js";
import { encryptField, decryptField } from "../../utils/fieldEncryption.js";

/**
 * Consent records. Storage goes through shared/files.js — there is no second
 * upload path here, only the consent-specific record around it.
 */

const clean = (v) => String(v ?? "").trim();

/** Stable fingerprint of the exact wording shown, for later proof. */
export const hashConsentText = (text) =>
  crypto.createHash("sha256").update(String(text || ""), "utf8").digest("hex");

async function nextConsentPublicId() {
  const seq = await getNextSequence("consent", async () => {
    const rows = await Consent.find({})
      .setOptions({ includeDeleted: true })
      .select("publicId")
      .lean();
    let max = 0;
    for (const r of rows) {
      const m = /^CNS-(\d+)$/.exec(String(r.publicId || ""));
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return max;
  });
  return `CNS-${String(seq).padStart(4, "0")}`;
}

export function mapConsent(doc) {
  const c = doc?.toObject ? doc.toObject() : doc;
  if (!c) return null;

  // Is the signed wording still the current template?
  const current = getConsentTemplate(c.procedureType, c.displayLanguage || "en");
  const stale = !!c.textHash && c.textHash !== hashConsentText(current.text);

  return {
    id: c.publicId,
    patientId: c.patientId,
    procedureType: c.procedureType,
    textVersion: c.textVersion,
    displayLanguage: c.displayLanguage,
    // True when the template has been revised since this was signed — the
    // record is still valid, it just no longer matches today's wording.
    templateSuperseded: stale || Number(c.textVersion) !== Number(current.version),
    signedByName: decryptField(c.signedByName || ""),
    signedByRole: c.signedByRole,
    signatureMethod: c.signatureMethod,
    signedAt: c.signedAt,
    witnessedByName: c.witnessedByName || "",
    fileId: c.fileId || "",
    appointmentId: c.appointmentId || "",
    treatmentPlanId: c.treatmentPlanId || "",
    treatmentPlanItemId: c.treatmentPlanItemId || "",
    note: c.note || "",
    createdAt: c.createdAt,
  };
}

/**
 * Records a signed consent: stores the generated PDF through the shared file
 * helper, then writes the queryable record pointing at it.
 *
 * The PDF is produced in the browser (jsPDF, reusing the clinic letterhead)
 * and posted here, so no PDF library is added to the backend.
 */
export async function createConsent({
  patientPublicId,
  procedureType,
  displayLanguage = "en",
  signedByName,
  signedByRole = "patient",
  signatureMethod = "drawn",
  witnessedBy = "",
  witnessedByName = "",
  appointmentId = "",
  treatmentPlanId = "",
  treatmentPlanItemId = "",
  note = "",
  pdf,
  actor = {},
} = {}) {
  const pid = clean(patientPublicId);
  const patient = await Patient.findOne({ publicId: pid }).select("_id").lean();
  if (!patient) throw Object.assign(new Error("Patient not found"), { status: 404 });

  if (!isProcedureType(procedureType)) {
    throw Object.assign(new Error(`Unknown procedure type: ${procedureType}`), { status: 400 });
  }
  if (!clean(signedByName)) {
    throw Object.assign(new Error("The name of the person signing is required"), { status: 400 });
  }
  if (!pdf?.buffer?.length) {
    throw Object.assign(new Error("The signed consent document is missing"), { status: 400 });
  }

  // The server resolves the template itself — a client cannot claim a patient
  // signed wording that was never shown.
  const tpl = getConsentTemplate(procedureType, displayLanguage);
  const publicId = await nextConsentPublicId();

  const stored = await storeUpload({
    ownerType: "patient",
    ownerId: pid,
    category: "consent",
    file: pdf,
    appointmentId,
    note: `${publicId} · ${tpl.procedureType}`,
    actor,
  });

  try {
    const doc = await Consent.create({
      publicId,
      patient: patient._id,
      patientId: pid,
      procedureType: tpl.procedureType,
      textVersion: tpl.version,
      textHash: hashConsentText(tpl.text),
      displayLanguage: tpl.language,
      signedByName: encryptField(clean(signedByName)), // PHI at rest
      signedByRole: signedByRole === "guardian" ? "guardian" : "patient",
      signatureMethod: signatureMethod === "typed" ? "typed" : "drawn",
      signedAt: new Date(),
      witnessedBy: clean(witnessedBy),
      witnessedByName: clean(witnessedByName),
      fileId: stored.id,
      appointmentId: clean(appointmentId),
      treatmentPlanId: clean(treatmentPlanId),
      treatmentPlanItemId: clean(treatmentPlanItemId),
      note: clean(note).slice(0, 500),
    });
    return { consent: mapConsent(doc), file: stored };
  } catch (e) {
    // Never leave an orphan PDF behind a failed record write.
    await softDeleteFile(stored.id).catch(() => {});
    throw e;
  }
}

export async function listConsents(patientPublicId, { page, limit, sortBy, sortDir, procedureType } = {}) {
  const { page: P, limit: L, sortBy: sb, sortDir: sd } = parsePagination({ page, limit, sortBy, sortDir });
  const query = { patientId: clean(patientPublicId) };
  if (procedureType) query.procedureType = clean(procedureType);

  const rows = await Consent.find(query).sort(buildSort(sb, sd, { signedAt: -1 })).lean();
  return paginateArray(rows.map(mapConsent), P, L);
}

/**
 * Which procedures this patient has consent on file for — the query a stored
 * PDF alone could never answer. One entry per procedure, most recent first.
 */
export async function consentCoverage(patientPublicId) {
  const rows = await Consent.find({ patientId: clean(patientPublicId) })
    .select("procedureType signedAt publicId textVersion displayLanguage textHash")
    .sort({ signedAt: -1 })
    .lean();

  const seen = new Map();
  for (const r of rows) {
    if (seen.has(r.procedureType)) continue;
    const current = getConsentTemplate(r.procedureType, r.displayLanguage || "en");
    seen.set(r.procedureType, {
      procedureType: r.procedureType,
      consentId: r.publicId,
      signedAt: r.signedAt,
      templateSuperseded:
        (!!r.textHash && r.textHash !== hashConsentText(current.text)) ||
        Number(r.textVersion) !== Number(current.version),
    });
  }

  return PROCEDURE_TYPES.map(
    (p) => seen.get(p) || { procedureType: p, consentId: "", signedAt: null, templateSuperseded: false }
  );
}

/** Withdraw a consent. Soft only — a signed record is never destroyed. */
export async function softDeleteConsent(publicId) {
  const doc = await Consent.findOne({ publicId: clean(publicId) });
  if (!doc) throw Object.assign(new Error("Consent not found"), { status: 404 });
  await doc.softDelete();
  // The PDF follows it out of the document list but is likewise retained.
  if (doc.fileId) await softDeleteFile(doc.fileId).catch(() => {});
  return { message: "Withdrawn", id: doc.publicId, recordRetained: true };
}
