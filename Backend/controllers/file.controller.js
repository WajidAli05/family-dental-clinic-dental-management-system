import multer from "multer";
import {
  storeUpload, listFiles, loadFile, openFileStream, softDeleteFile,
  teethWithXrays, mapFile, MAX_FILE_BYTES, MAX_FILES_PER_UPLOAD,
} from "../services/shared/files.js";
import { assertDentistCanEditChart } from "../services/dentist.service.js";
import { createConsent, listConsents, consentCoverage, softDeleteConsent } from "../services/shared/consents.js";
import { listConsentTemplates, getConsentTemplate } from "../services/shared/consentTemplates.js";
import { recordAudit } from "../services/shared/audit.js";

/**
 * Files are buffered in MEMORY, not written by multer.
 *
 * Deliberate: the bytes must pass content sniffing and size checks BEFORE they
 * touch the upload directory, so a rejected .exe never lands on disk at all.
 * At a 15 MB cap and 10 files per request this is bounded.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES_PER_UPLOAD * 2 }, // *2: each file may carry a thumb
});

/** `file` = the originals, `thumb` = optional client-generated previews. */
export const uploadMiddleware = upload.fields([
  { name: "file", maxCount: MAX_FILES_PER_UPLOAD },
  { name: "thumb", maxCount: MAX_FILES_PER_UPLOAD },
]);

/** Turns multer's own limit errors into the same clear shape as ours. */
export const uploadErrorHandler = (err, _req, res, next) => {
  if (!err) return next();
  if (err instanceof multer.MulterError) {
    const tooBig = err.code === "LIMIT_FILE_SIZE";
    return res.status(tooBig ? 413 : 400).json({
      success: false,
      code: tooBig ? "FILE_TOO_LARGE" : err.code,
      message: tooBig
        ? `File is too large (max ${Math.round(MAX_FILE_BYTES / (1024 * 1024))} MB)`
        : err.message,
    });
  }
  return next(err);
};

const fail = (res, e) =>
  res.status(e.status || 400).json({ success: false, message: e.message, code: e.code });

/**
 * ACCESS GATE for patient files — one helper, every route.
 *
 *   owner        → any patient
 *   dentist      → only patients they have an appointment with. Reuses
 *                  assertDentistCanEditChart, the same appointment-based
 *                  relationship rule that governs the chart and prescriptions.
 *                  Read and write share it: seeing a patient's radiographs is
 *                  itself PHI access, so there is no weaker "read" tier.
 *   receptionist → VIEW ONLY, behind tab_receptionist_patients (mounted on the
 *                  route). The front desk handles records and hands images to
 *                  patients, but must not add or withdraw clinical imaging.
 */
async function assertCanReadPatientFiles(req, patientPublicId) {
  const role = req.user?.role;
  if (role === "owner" || role === "receptionist") return;
  if (role === "dentist") {
    await assertDentistCanEditChart(req.user._id, patientPublicId);
    return;
  }
  throw Object.assign(new Error("You do not have access to this patient's files"), { status: 403 });
}

/** Writes exclude the receptionist. */
async function assertCanWritePatientFiles(req, patientPublicId, { category } = {}) {
  const role = req.user?.role;
  if (role === "owner") return;
  if (role === "dentist") {
    await assertDentistCanEditChart(req.user._id, patientPublicId);
    return;
  }
  // Receptionist: UPLOAD of non-clinical paperwork only, never delete.
  if (role === "receptionist" && category !== undefined) {
    if (RECEPTIONIST_UPLOAD_CATEGORIES.includes(String(category || ""))) return;
    throw Object.assign(
      new Error("The front desk can only upload non-clinical documents (receipt, invoice, referral, document, other)"),
      { status: 403, code: "CATEGORY_NOT_ALLOWED_FOR_ROLE" }
    );
  }
  throw Object.assign(
    new Error("You do not have permission to modify patient files"),
    { status: 403 }
  );
}

/**
 * Categories the RECEPTIONIST may upload. Front-desk paperwork only — a
 * receipt, a referral letter, a scanned ID. Clinical imaging and
 * clinician-authored records (xray, photo, prescription, treatment_plan,
 * consent, lab_attachment) are deliberately excluded: the front desk files
 * paperwork, it does not author the clinical record.
 */
export const RECEPTIONIST_UPLOAD_CATEGORIES = Object.freeze([
  "receipt", "invoice", "referral", "document", "other",
]);

const actorOf = (req) => ({
  publicId: req.user?.publicId || String(req.user?._id || ""),
  name: req.user?.name || "",
});

// ── Patient imaging ─────────────────────────────────────────────────────────
export const uploadPatientFiles = async (req, res) => {
  try {
    const patientId = String(req.params.patientId || "").trim();
    const category = req.body?.category || "xray";
    await assertCanWritePatientFiles(req, patientId, { category });

    const files = req.files?.file || [];
    const thumbs = req.files?.thumb || [];
    if (!files.length) throw Object.assign(new Error("No file received"), { status: 400 });

    const saved = [];
    for (let i = 0; i < files.length; i++) {
      saved.push(
        await storeUpload({
          ownerType: "patient",
          ownerId: patientId,
          category,
          file: files[i],
          thumb: thumbs[i],
          appointmentId: req.body?.appointmentId,
          toothNumber: req.body?.toothNumber,
          note: req.body?.note,
          actor: actorOf(req),
        })
      );
    }

    // Metadata only — never file contents.
    for (const f of saved) {
      await recordAudit({
        req, action: "file.upload", entityType: "FileAsset", entityId: f.id, entityLabel: f.id,
        after: { ownerType: f.ownerType, ownerId: f.ownerId, category: f.category, mimeType: f.mimeType, sizeBytes: f.sizeBytes, toothNumber: f.toothNumber, appointmentId: f.appointmentId },
      });
    }
    return res.json({ success: true, data: saved });
  } catch (e) { return fail(res, e); }
};

export const listPatientFiles = async (req, res) => {
  try {
    const patientId = String(req.params.patientId || "").trim();
    await assertCanReadPatientFiles(req, patientId);

    const { page, limit, sortBy, sortDir, category, toothNumber, appointmentId, q } = req.query;
    const r = await listFiles(
      { ownerType: "patient", ownerId: patientId, category, toothNumber, appointmentId, q },
      { page, limit, sortBy, sortDir }
    );
    return res.json({ success: true, data: r.rows, total: r.total, page: r.page, pages: r.pages });
  } catch (e) { return fail(res, e); }
};

/** Teeth that already have a radiograph — drives "requested" vs "on file". */
export const listPatientXrayTeeth = async (req, res) => {
  try {
    const patientId = String(req.params.patientId || "").trim();
    await assertCanReadPatientFiles(req, patientId);
    return res.json({ success: true, data: await teethWithXrays(patientId) });
  } catch (e) { return fail(res, e); }
};

/**
 * Streams bytes. This is the ONLY way a file leaves the server — the upload
 * directory is never served statically, so there is no public URL to leak.
 */
export const downloadFile = async (req, res) => {
  try {
    const doc = await loadFile(req.params.id);
    if (doc.ownerType === "patient") await assertCanReadPatientFiles(req, doc.ownerId);
    else if (req.user?.role !== "owner") {
      throw Object.assign(new Error("You do not have access to this file"), { status: 403 });
    }

    const wantThumb = String(req.query.thumb || "") === "1";
    const { stream, sizeBytes, mimeType } = await openFileStream(doc, { thumb: wantThumb });

    // PHI ACCESS LOGGING (PDPL): full-size views are logged; thumbnail hits in
    // a gallery are not, or one screen would write a dozen rows.
    if (!wantThumb) {
      await recordAudit({
        req, action: "file.view", entityType: "FileAsset", entityId: doc.publicId, entityLabel: doc.publicId,
        after: { ownerType: doc.ownerType, ownerId: doc.ownerId, category: doc.category },
      });
    }

    res.setHeader("Content-Type", mimeType || "application/octet-stream");
    res.setHeader("Content-Length", sizeBytes);
    res.setHeader("Cache-Control", "private, no-store"); // PHI must not be cached by proxies
    res.setHeader("X-Content-Type-Options", "nosniff");
    // `inline` for viewing; the filename is quoted and sanitized already.
    res.setHeader(
      "Content-Disposition",
      `${req.query.download === "1" ? "attachment" : "inline"}; filename="${doc.filename}"`
    );
    stream.on("error", () => { if (!res.headersSent) res.status(500).end(); });
    return stream.pipe(res);
  } catch (e) { return fail(res, e); }
};

export const deletePatientFile = async (req, res) => {
  try {
    const doc = await loadFile(req.params.id);
    if (doc.ownerType === "patient") await assertCanWritePatientFiles(req, doc.ownerId);
    else if (req.user?.role !== "owner") {
      throw Object.assign(new Error("You do not have permission to delete this file"), { status: 403 });
    }

    const data = await softDeleteFile(req.params.id);
    await recordAudit({
      req, action: "file.delete", entityType: "FileAsset", entityId: data.id, entityLabel: data.id,
      after: { softDeleted: true, blobRetained: true, ownerType: doc.ownerType, ownerId: doc.ownerId },
    });
    return res.json({ success: true, data });
  } catch (e) { return fail(res, e); }
};

/** What THIS caller may upload — the UI offers exactly this, nothing more. */
export const getUploadPolicy = async (req, res) => {
  try {
    const role = req.user?.role;
    const categories =
      role === "receptionist" ? [...RECEPTIONIST_UPLOAD_CATEGORIES] : null; // null = all
    return res.json({
      success: true,
      data: {
        role,
        canUpload: role === "owner" || role === "dentist" || role === "receptionist",
        canDelete: role === "owner" || role === "dentist",
        canCaptureConsent: role === "owner" || role === "dentist" || role === "receptionist",
        canWithdrawConsent: role === "owner" || role === "dentist",
        uploadCategories: categories,
      },
    });
  } catch (e) { return fail(res, e); }
};

// ── Digital consent ─────────────────────────────────────────────────────────
/** Templates for the picker. `lang` selects the on-screen wording. */
export const getConsentTemplatesCtrl = async (req, res) => {
  try {
    return res.json({ success: true, data: listConsentTemplates(req.query?.lang) });
  } catch (e) { return fail(res, e); }
};

export const listPatientConsents = async (req, res) => {
  try {
    const patientId = String(req.params.patientId || "").trim();
    await assertCanReadPatientFiles(req, patientId);
    const { page, limit, procedureType } = req.query;
    const r = await listConsents(patientId, { page, limit, procedureType });
    return res.json({ success: true, data: r.rows, total: r.total, page: r.page, pages: r.pages });
  } catch (e) { return fail(res, e); }
};

/** Which procedures have signed consent on file — drives the profile badge. */
export const getPatientConsentCoverage = async (req, res) => {
  try {
    const patientId = String(req.params.patientId || "").trim();
    await assertCanReadPatientFiles(req, patientId);
    return res.json({ success: true, data: await consentCoverage(patientId) });
  } catch (e) { return fail(res, e); }
};

/**
 * Records a signed consent.
 *
 * The RECEPTIONIST may capture one. Witnessing a signature is front-desk work
 * in a real clinic, and this is not a clinical judgement — the wording is
 * fixed server-side from the template, so the front desk cannot alter what is
 * being agreed to. They still cannot upload or delete clinical documents.
 */
export const createPatientConsent = async (req, res) => {
  try {
    const patientId = String(req.params.patientId || "").trim();
    const role = req.user?.role;
    if (role === "dentist") await assertDentistCanEditChart(req.user._id, patientId);
    else if (role !== "owner" && role !== "receptionist") {
      throw Object.assign(new Error("You do not have permission to record consent"), { status: 403 });
    }

    const pdf = (req.files?.file || [])[0];
    const { consent, file } = await createConsent({
      patientPublicId: patientId,
      procedureType: req.body?.procedureType,
      displayLanguage: req.body?.displayLanguage,
      signedByName: req.body?.signedByName,
      signedByRole: req.body?.signedByRole,
      signatureMethod: req.body?.signatureMethod,
      // The AUTHENTICATED actor is always recorded as the responsible staff
      // member; the name may be overridden when a different colleague actually
      // witnessed the signing.
      witnessedBy: actorOf(req).publicId,
      witnessedByName: String(req.body?.witnessName || "").trim() || actorOf(req).name,
      appointmentId: req.body?.appointmentId,
      treatmentPlanId: req.body?.treatmentPlanId,
      treatmentPlanItemId: req.body?.treatmentPlanItemId,
      note: req.body?.note,
      pdf,
      actor: actorOf(req),
    });

    // Metadata only — never the signature image or the signer's name.
    await recordAudit({
      req, action: "consent.create", entityType: "Consent", entityId: consent.id, entityLabel: consent.id,
      after: { patientId, procedureType: consent.procedureType, textVersion: consent.textVersion, displayLanguage: consent.displayLanguage, signatureMethod: consent.signatureMethod, fileId: consent.fileId },
    });
    await recordAudit({
      req, action: "file.upload", entityType: "FileAsset", entityId: file.id, entityLabel: file.id,
      after: { ownerType: file.ownerType, ownerId: file.ownerId, category: file.category, mimeType: file.mimeType, sizeBytes: file.sizeBytes },
    });
    return res.json({ success: true, data: consent });
  } catch (e) { return fail(res, e); }
};

/** Withdraw a consent. Soft only — owner/dentist, never the front desk. */
export const deletePatientConsent = async (req, res) => {
  try {
    const patientId = String(req.query.patientId || "").trim();
    if (patientId) await assertCanWritePatientFiles(req, patientId);
    else if (req.user?.role !== "owner") {
      throw Object.assign(new Error("You do not have permission to withdraw consent"), { status: 403 });
    }
    const data = await softDeleteConsent(req.params.id);
    await recordAudit({
      req, action: "consent.withdraw", entityType: "Consent", entityId: data.id, entityLabel: data.id,
      after: { softDeleted: true, recordRetained: true },
    });
    return res.json({ success: true, data });
  } catch (e) { return fail(res, e); }
};

export { mapFile };
