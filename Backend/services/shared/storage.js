import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

/**
 * STORAGE BACKEND — local disk today, swappable tomorrow.
 *
 * Everything above this file talks only to saveFile / getFileStream /
 * statFile / deleteFile / resolveKey. Swapping to S3 means reimplementing
 * those five functions; no caller changes.
 *
 * WHY UPLOAD_DIR MUST BE OUTSIDE THE REPO
 * Production runs from /var/www/family-dental-clinic-dental-management-system/
 * and is redeployed by pulling. Anything stored inside the working tree would
 * be destroyed by a clean checkout — so the root is an absolute path from env,
 * defaulted to /var/fdc-uploads on Linux. It is never served by nginx: bytes
 * only ever leave through an authenticated Express route.
 */

const DEFAULT_POSIX_ROOT = "/var/fdc-uploads";

/** Absolute upload root. Dev falls back to a sibling of the repo, still outside it. */
export function uploadRoot() {
  const configured = String(process.env.UPLOAD_DIR || "").trim();
  if (configured) return path.resolve(configured);
  if (process.platform === "win32") {
    // Dev on Windows: a sibling directory, deliberately NOT inside the repo.
    return path.resolve(process.cwd(), "..", "..", "fdc-uploads");
  }
  return DEFAULT_POSIX_ROOT;
}

/**
 * Fail fast and loudly. A silently unwritable upload dir means uploads appear
 * to work and patient images vanish — verify at startup, not on first upload.
 */
export async function ensureStorageReady() {
  const root = uploadRoot();
  try {
    await fsp.mkdir(root, { recursive: true, mode: 0o700 });
    await fsp.access(root, fs.constants.W_OK | fs.constants.R_OK);
  } catch (e) {
    throw new Error(
      `UPLOAD_DIR is not writable: ${root}. Set UPLOAD_DIR to an absolute path outside the repo and grant the app user write access. (${e.code || e.message})`
    );
  }
  return root;
}

/**
 * Storage keys are RELATIVE and are the only path form that ever reaches a
 * client. Sharded by owner and year so no directory becomes unlistable:
 *   patient/PT-0001/2026/FILE-0007__scan.jpg
 */
export function buildStorageKey({ ownerType, ownerId, filename, at = new Date() }) {
  const year = String(at.getUTCFullYear());
  return [safeSegment(ownerType), safeSegment(ownerId), year, filename].join("/");
}

/** One path segment, stripped of anything that could escape or surprise. */
export function safeSegment(v) {
  return String(v || "")
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .replace(/^\.+/, "_")
    .slice(0, 120) || "_";
}

/**
 * Resolves a relative key to an absolute path, refusing anything that escapes
 * the root. This is the traversal backstop: even a poisoned key in the DB
 * cannot read /etc/passwd.
 */
export function resolveKey(storageKey) {
  const root = uploadRoot();
  const abs = path.resolve(root, String(storageKey || ""));
  const rel = path.relative(root, abs);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) {
    throw Object.assign(new Error("Invalid storage key"), { status: 400 });
  }
  return abs;
}

/** Random, collision-proof, and never derived from user input. */
export const randomToken = (n = 8) => crypto.randomBytes(n).toString("hex");

// ── The swappable interface ─────────────────────────────────────────────────

/** Writes bytes and returns { storageKey, sizeBytes }. */
export async function saveFile({ ownerType, ownerId, filename, buffer, at }) {
  await ensureStorageReady();
  const storageKey = buildStorageKey({ ownerType, ownerId, filename, at });
  const abs = resolveKey(storageKey);
  await fsp.mkdir(path.dirname(abs), { recursive: true, mode: 0o700 });
  // 0600: readable only by the app user. Defence in depth behind the
  // authenticated route — see the encryption-at-rest note in SECURITY.md.
  await fsp.writeFile(abs, buffer, { mode: 0o600 });
  return { storageKey, sizeBytes: buffer.length };
}

/** Read stream for the authenticated download route. */
export function getFileStream(storageKey) {
  return fs.createReadStream(resolveKey(storageKey));
}

export async function statFile(storageKey) {
  try {
    return await fsp.stat(resolveKey(storageKey));
  } catch {
    return null;
  }
}

/**
 * Hard removal of bytes. Deliberately NOT called by the normal delete path —
 * soft-deleting a medical record must retain the blob. Exists for retention
 * purges and for unwinding a failed upload.
 */
export async function deleteFile(storageKey) {
  try {
    await fsp.unlink(resolveKey(storageKey));
    return true;
  } catch (e) {
    if (e.code === "ENOENT") return false;
    throw e;
  }
}
