/**
 * AES-256-GCM field-level encryption for Prescription PHI.
 *
 * Storage format (versioned so the scheme can evolve):
 *   "v1:<base64-iv>:<base64-tag>:<base64-ciphertext>"
 *
 * KEY MANAGEMENT WARNING ─────────────────────────────────────────────────────
 *   • The 256-bit key lives in FIELD_ENCRYPTION_KEY (.env only — never commit).
 *   • BACK THIS KEY UP to a secure vault (password manager, HSM, or secrets
 *     manager). It is separate from your database credentials.
 *   • If you lose or rotate the key WITHOUT re-encrypting the DB first, every
 *     encrypted prescription becomes permanently unreadable. There is no
 *     recovery. Treat it like the database password.
 *   • Generate with: openssl rand -hex 32
 * ────────────────────────────────────────────────────────────────────────────
 */

import crypto from "crypto";

const VERSION  = "v1";
const ALGO     = "aes-256-gcm";
const IV_BYTES = 12; // 96-bit — NIST recommended for GCM

// The PHI string fields on Prescription that we encrypt.
export const PRESCRIPTION_PHI_STRING_FIELDS = [
  "diagnosis",
  "treatment",
  "clinicalFinding",
  "notes",
];

// ─── Key management ──────────────────────────────────────────────────────────

let _cachedKey = null;

function getKey() {
  if (_cachedKey) return _cachedKey;

  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "[fieldEncryption] FIELD_ENCRYPTION_KEY is not set. " +
      "Generate one with: openssl rand -hex 32 " +
      "and add it to Backend/.env. The application cannot start without it."
    );
  }

  const buf = Buffer.from(raw.trim(), "hex");
  if (buf.length !== 32) {
    throw new Error(
      `[fieldEncryption] FIELD_ENCRYPTION_KEY must be 32 bytes (64 hex chars). ` +
      `Got ${buf.length} bytes (${raw.trim().length} chars). ` +
      `Regenerate with: openssl rand -hex 32`
    );
  }

  _cachedKey = buf;
  return _cachedKey;
}

/**
 * Call once at application startup (after dotenv config()).
 * Validates and caches the key; throws with a clear message if missing/wrong.
 */
export function initEncryption() {
  getKey(); // throws fast so the server refuses to start, not silently stores plaintext
  console.log("[fieldEncryption] AES-256-GCM encryption key loaded successfully.");
}

// ─── Core encrypt / decrypt ───────────────────────────────────────────────────

/**
 * Encrypt a plaintext string.
 * Returns the original value unchanged when it is null, undefined, or "".
 * Returns "v1:<iv>:<tag>:<ciphertext>" (all base64) for any other string.
 * A fresh random 96-bit IV is used for every call (GCM requirement).
 */
export function encryptField(plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === "") {
    return plaintext;
  }

  const key     = getKey();
  const iv      = crypto.randomBytes(IV_BYTES);
  const cipher  = crypto.createCipheriv(ALGO, key, iv);
  const ctBuf   = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const tag     = cipher.getAuthTag(); // 128-bit auth tag (GCM default)

  return `${VERSION}:${iv.toString("base64")}:${tag.toString("base64")}:${ctBuf.toString("base64")}`;
}

/**
 * Decrypt a field value encrypted by encryptField().
 *
 * Legacy-safe: if the value does not start with the version prefix, it is
 * returned as-is (plaintext from before encryption was deployed). This lets
 * the app serve existing records during the mixed-state transition.
 *
 * Never logs the plaintext content on error.
 */
export function decryptField(value) {
  if (value === null || value === undefined || value === "") return value;

  const str = String(value);

  // Legacy plaintext: no version prefix → return unchanged
  if (!str.startsWith(`${VERSION}:`)) return str;

  const key   = getKey();
  const parts = str.split(":");

  if (parts.length !== 4) {
    // Malformed — log only the structural problem, never the content
    console.error(
      "[fieldEncryption] decryptField: malformed ciphertext (expected 4 colon-separated parts, " +
      `got ${parts.length}). Returning empty string.`
    );
    return "";
  }

  const [, ivB64, tagB64, ctB64] = parts;
  try {
    const iv       = Buffer.from(ivB64,  "base64");
    const tag      = Buffer.from(tagB64, "base64");
    const ctBuf    = Buffer.from(ctB64,  "base64");
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ctBuf), decipher.final()]).toString("utf8");
  } catch {
    // Auth-tag mismatch or corrupt data — never log the ciphertext (could leak structure)
    console.error(
      "[fieldEncryption] decryptField: authentication failed (tag mismatch or corrupt ciphertext). " +
      "Returning '[DECRYPTION FAILED]'."
    );
    return "[DECRYPTION FAILED]";
  }
}

// ─── medications[] helpers ────────────────────────────────────────────────────

/**
 * Serialize the medications array to JSON and encrypt the resulting string.
 * Empty arrays are returned as-is (no encryption needed).
 */
export function encryptMedications(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return arr;
  return encryptField(JSON.stringify(arr));
}

/**
 * Decrypt a medications value back to an array.
 * Handles:
 *   - Already-decrypted arrays (legacy DB docs)        → returned as-is
 *   - Encrypted "v1:..." string                        → decrypt + JSON.parse
 *   - null / undefined / ""                            → []
 */
export function decryptMedications(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];

  const str = String(value);
  if (!str.startsWith(`${VERSION}:`)) {
    // Legacy: might be a raw JSON string (shouldn't happen in normal use)
    try { return JSON.parse(str); } catch { return []; }
  }

  const decrypted = decryptField(str);
  if (!decrypted || decrypted === "[DECRYPTION FAILED]") return [];
  try {
    return JSON.parse(decrypted);
  } catch {
    console.error("[fieldEncryption] decryptMedications: JSON.parse failed after decryption.");
    return [];
  }
}

// ─── Document-level helpers for Prescription ─────────────────────────────────

/**
 * Encrypt all PHI fields present in a Prescription plain object.
 * Safe for partial objects (update payloads): only touches fields that exist
 * in the object. Returns a new object; does not mutate the original.
 *
 * String fields: encrypted in-place.
 * medications:   array serialised to JSON then encrypted.
 */
export function encryptPrescriptionDoc(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const result = { ...obj };

  for (const field of PRESCRIPTION_PHI_STRING_FIELDS) {
    if (field in result) {
      result[field] = encryptField(result[field] ?? "");
    }
  }

  if ("medications" in result) {
    result.medications = encryptMedications(result.medications);
  }

  return result;
}

/**
 * Decrypt all PHI fields present in a Prescription plain object.
 * Safe for partial objects and lean() results. Returns a new object.
 */
export function decryptPrescriptionDoc(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const result = { ...obj };

  for (const field of PRESCRIPTION_PHI_STRING_FIELDS) {
    if (field in result) {
      result[field] = decryptField(result[field]);
    }
  }

  if ("medications" in result) {
    result.medications = decryptMedications(result.medications);
  }

  return result;
}
