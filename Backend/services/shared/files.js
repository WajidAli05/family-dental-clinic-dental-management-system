import path from "node:path";
import FileAsset, { FILE_OWNER_TYPES, FILE_CATEGORIES } from "../../models/FileAsset.model.js";
import { getNextSequence } from "./counters.js";
import { parsePagination, paginateArray, buildSort } from "./paginate.js";
import { saveFile, deleteFile, getFileStream, statFile, safeSegment, randomToken } from "./storage.js";
import { FDI_TEETH } from "./patients.js";

/**
 * THE shared file helper. Upload / list / read / soft-delete for EVERY
 * consumer — patient imaging today, lab-case attachments (Prompt 8) and
 * documents/consent (Prompt 10) tomorrow.
 *
 * Nothing here knows what a patient is: callers pass ownerType + ownerId +
 * category. Access control lives in the controller, deliberately, because the
 * rule differs per owner type. This repo has repeatedly grown divergent
 * per-service copies of shared logic; files carry PHI, so there is exactly one.
 */

// ── Limits ──────────────────────────────────────────────────────────────────
/** 15 MB. Comfortably fits an intraoral/panoramic JPEG or a scanned PDF. */
export const MAX_FILE_BYTES = 15 * 1024 * 1024;
/** Per request. Keeps one upload bounded without blocking a batch of images. */
export const MAX_FILES_PER_UPLOAD = 10;

/**
 * Allowed types, keyed by what the CONTENT says — never the extension.
 * DICOM (.dcm) is deliberately OUT OF SCOPE: it needs a specialist viewer and
 * usually arrives as a multi-file study, which this simple gallery would
 * misrepresent. Clinics export a JPEG/PNG from their imaging suite today.
 */
const MAGIC = [
  { mime: "image/jpeg", ext: ".jpg",  test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png",  ext: ".png",  test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: "image/webp", ext: ".webp", test: (b) => b.slice(0, 4).toString("latin1") === "RIFF" && b.slice(8, 12).toString("latin1") === "WEBP" },
  { mime: "application/pdf", ext: ".pdf", test: (b) => b.slice(0, 5).toString("latin1") === "%PDF-" },
];

/**
 * Sniffs the real type. An .exe renamed to .jpg fails here because the magic
 * bytes are MZ, not FFD8 — extension is never trusted.
 */
export function sniffType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  return MAGIC.find((m) => m.test(buffer)) || null;
}

export const isImageMime = (mime) => String(mime || "").startsWith("image/");

/**
 * Escapes regex metacharacters so a user's search string is matched literally.
 * Built by scanning rather than with a regex literal, so a search for "*" or
 * "(" cannot turn into an invalid or catastrophically backtracking pattern.
 */
const REGEX_SPECIALS = new Set([".", "*", "+", "?", "^", "$", "{", "}", "(", ")", "|", "[", "]", "\\"]);
export function escapeRegex(input) {
  let out = "";
  for (const ch of String(input || "")) out += REGEX_SPECIALS.has(ch) ? "\\" + ch : ch;
  return out;
}

/**
 * Safe on-disk filename: no traversal, no user-controlled extension, no
 * executable suffix. The extension comes from the SNIFFED type, and a random
 * token prevents collisions and makes keys unguessable.
 */
export function buildFilename({ publicId, originalName, ext }) {
  const base = safeSegment(path.basename(String(originalName || "file"), path.extname(String(originalName || ""))))
    .slice(0, 60) || "file";
  return `${publicId}__${base}__${randomToken(4)}${ext}`;
}

async function nextFilePublicId() {
  const seq = await getNextSequence("fileasset", async () => {
    const rows = await FileAsset.find({})
      .setOptions({ includeDeleted: true }) // never reissue a retired id
      .select("publicId")
      .lean();
    let max = 0;
    for (const r of rows) {
      const m = /^FILE-(\d+)$/.exec(String(r.publicId || ""));
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return max;
  });
  return `FILE-${String(seq).padStart(4, "0")}`;
}

/** The client-facing shape. `storageKey` is NEVER exposed. */
export function mapFile(doc) {
  const f = doc?.toObject ? doc.toObject() : doc;
  if (!f) return null;
  return {
    id: f.publicId,
    ownerType: f.ownerType,
    ownerId: f.ownerId,
    category: f.category,
    originalName: f.originalName || f.filename,
    mimeType: f.mimeType,
    sizeBytes: Number(f.sizeBytes) || 0,
    isImage: isImageMime(f.mimeType),
    hasThumb: !!f.thumbKey,
    appointmentId: f.appointmentId || "",
    toothNumber: f.toothNumber || "",
    note: f.note || "",
    uploadedBy: f.uploadedBy || "",
    uploadedByName: f.uploadedByName || "",
    uploadedAt: f.createdAt,
  };
}

/**
 * Validates and stores ONE file plus its optional client-made thumbnail.
 *
 * THUMBNAILS: generated in the browser (canvas downscale to ~400px) and sent
 * as a second part. No server-side image library is added — the alternative
 * would be a native dep (sharp) for a gallery that only needs previews, and
 * serving 15 MB originals as thumbnails would be worse than either.
 */
export async function storeUpload({
  ownerType, ownerId, category = "other",
  file, thumb,
  appointmentId = "", toothNumber = "", note = "",
  actor = {},
} = {}) {
  if (!FILE_OWNER_TYPES.includes(ownerType)) {
    throw Object.assign(new Error(`Unsupported ownerType: ${ownerType}`), { status: 400 });
  }
  if (!String(ownerId || "").trim()) {
    throw Object.assign(new Error("ownerId is required"), { status: 400 });
  }
  if (!FILE_CATEGORIES.includes(category)) {
    throw Object.assign(new Error(`Unsupported category: ${category}`), { status: 400 });
  }
  if (!file?.buffer?.length) {
    throw Object.assign(new Error("No file received"), { status: 400 });
  }
  if (file.buffer.length > MAX_FILE_BYTES) {
    throw Object.assign(
      new Error(`File is too large (max ${Math.round(MAX_FILE_BYTES / (1024 * 1024))} MB)`),
      { status: 413, code: "FILE_TOO_LARGE" }
    );
  }

  const sniffed = sniffType(file.buffer);
  if (!sniffed) {
    throw Object.assign(
      new Error("Unsupported file type. Allowed: JPEG, PNG, WebP, PDF."),
      { status: 415, code: "UNSUPPORTED_FILE_TYPE" }
    );
  }

  const tooth = String(toothNumber || "").trim();
  if (tooth && !FDI_TEETH.includes(tooth)) {
    throw Object.assign(new Error(`Invalid tooth number: ${tooth}`), { status: 400 });
  }

  const publicId = await nextFilePublicId();
  const filename = buildFilename({ publicId, originalName: file.originalname, ext: sniffed.ext });
  const at = new Date();

  const { storageKey, sizeBytes } = await saveFile({
    ownerType, ownerId, filename, buffer: file.buffer, at,
  });

  // Thumbnail is best-effort: a bad one must never cost us the original.
  let thumbKey = "";
  if (thumb?.buffer?.length && isImageMime(sniffed.mime)) {
    const tSniff = sniffType(thumb.buffer);
    if (tSniff && isImageMime(tSniff.mime) && thumb.buffer.length <= MAX_FILE_BYTES) {
      try {
        const saved = await saveFile({
          ownerType, ownerId,
          filename: `${publicId}__thumb${tSniff.ext}`,
          buffer: thumb.buffer, at,
        });
        thumbKey = saved.storageKey;
      } catch {
        thumbKey = "";
      }
    }
  }

  try {
    const doc = await FileAsset.create({
      publicId, ownerType, ownerId: String(ownerId).trim(), category,
      filename, originalName: String(file.originalname || "").slice(0, 200),
      mimeType: sniffed.mime, sizeBytes,
      storageKey, thumbKey,
      uploadedBy: actor.publicId || "", uploadedByName: actor.name || "",
      appointmentId: String(appointmentId || "").trim(),
      toothNumber: tooth,
      note: String(note || "").slice(0, 500),
    });
    return mapFile(doc);
  } catch (e) {
    // Never leave orphan bytes behind a failed metadata write.
    await deleteFile(storageKey).catch(() => {});
    if (thumbKey) await deleteFile(thumbKey).catch(() => {});
    throw e;
  }
}

/** Paginated {rows,total,page,pages}. Soft-deleted rows are excluded by the plugin. */
export async function listFiles(
  { ownerType, ownerId, category, toothNumber, appointmentId, q } = {},
  { page, limit, sortBy, sortDir } = {}
) {
  const { page: P, limit: L, sortBy: sb, sortDir: sd } = parsePagination({ page, limit, sortBy, sortDir });

  const query = { ownerType, ownerId: String(ownerId || "").trim() };
  if (category) query.category = category;
  if (toothNumber) query.toothNumber = String(toothNumber).trim();
  if (appointmentId) query.appointmentId = String(appointmentId).trim();

  // Free-text search runs in the QUERY, not over the current page, so `total`
  // reflects the filter and a match on page 4 is still found.
  const needle = String(q || "").trim();
  if (needle) {
    const rx = new RegExp(escapeRegex(needle), "i");
    query.$or = [{ originalName: rx }, { note: rx }, { publicId: rx }];
  }

  const rows = await FileAsset.find(query).sort(buildSort(sb, sd, { createdAt: -1 })).lean();
  return paginateArray(rows.map(mapFile), P, L);
}

/** The raw document — controllers need storageKey + ownerId for the access check. */
export async function loadFile(publicId) {
  const doc = await FileAsset.findOne({ publicId: String(publicId || "").trim() });
  if (!doc) throw Object.assign(new Error("File not found"), { status: 404 });
  return doc;
}

/** Stream + headers for the authenticated download route. */
export async function openFileStream(doc, { thumb = false } = {}) {
  const key = thumb && doc.thumbKey ? doc.thumbKey : doc.storageKey;
  const stat = await statFile(key);
  if (!stat) throw Object.assign(new Error("File is missing from storage"), { status: 410 });
  return { stream: getFileStream(key), sizeBytes: stat.size, mimeType: doc.mimeType };
}

/**
 * SOFT delete. The blob is deliberately RETAINED: a dental image is part of a
 * medical record with a retention obligation, and "deleted" here means
 * "withdrawn from the gallery", not "destroyed". Purging bytes belongs to the
 * retention policy, which is why storage.deleteFile stays separate.
 */
export async function softDeleteFile(publicId) {
  const doc = await loadFile(publicId);
  await doc.softDelete();
  return { message: "Deleted", id: doc.publicId, blobRetained: true };
}

/**
 * Teeth that already have an x-ray on file — pairs with the existing
 * toothEntries[].xrayRequested flag so the chart can show "requested" vs
 * "on file" without inventing a second request mechanism.
 */
export async function teethWithXrays(patientPublicId) {
  const rows = await FileAsset.find({
    ownerType: "patient",
    ownerId: String(patientPublicId || "").trim(),
    category: "xray",
    toothNumber: { $nin: ["", null] },
  })
    .select("toothNumber")
    .lean();
  return [...new Set(rows.map((r) => r.toothNumber).filter(Boolean))];
}
