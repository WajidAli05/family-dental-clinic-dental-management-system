/**
 * 2FA business logic — TOTP (authenticator app) + OTP (email/sms/whatsapp).
 *
 * Rules:
 *   - TOTP secret stored ENCRYPTED via fieldEncryption.encryptField()
 *   - Backup codes stored HASHED via bcrypt (never plaintext after generation)
 *   - OTP stored HASHED via bcrypt
 *   - Secrets, codes, and backup codes are NEVER logged
 */

import crypto from "crypto";
import bcrypt from "bcrypt";
import { generateSecret, generateSync, verifySync, generateURI } from "otplib";
import QRCode from "qrcode";
import { encryptField, decryptField } from "../utils/fieldEncryption.js";
import { sendOtp } from "../utils/otpSender.js";

const APP_NAME = process.env.APP_NAME || "FDC";
const BACKUP_CODE_COUNT = 8;
const OTP_EXPIRY_MINUTES = 10;
const BCRYPT_ROUNDS = 10;

// epochTolerance: 30 s = ±1 TOTP time step to handle clock skew

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateOtpCode() {
  // 6-digit numeric, zero-padded
  return String(Math.floor(100000 + (crypto.randomInt(900000)))).padStart(6, "0");
}

function generateBackupCodes() {
  const codes = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const a = crypto.randomBytes(3).toString("hex").toUpperCase();
    const b = crypto.randomBytes(3).toString("hex").toUpperCase();
    codes.push(`${a}-${b}`);
  }
  return codes;
}

async function hashAll(values) {
  return Promise.all(values.map((v) => bcrypt.hash(v, BCRYPT_ROUNDS)));
}

// ─── TOTP ─────────────────────────────────────────────────────────────────────

/**
 * Begin TOTP setup: generate secret + QR data-URL + backup codes.
 * Saves encrypted secret + hashed backup codes (twoFactorEnabled stays false until verified).
 * Returns plaintext backup codes — shown to the user exactly once.
 *
 * Throws if 2FA is already enabled (user must disable first).
 */
export async function setupTotp(user) {
  if (user.twoFactorEnabled) {
    throw new Error("2FA is already enabled. Disable it first before changing method.");
  }

  const secret     = generateSecret();
  const otpauthUrl = generateURI({ label: user.email, issuer: APP_NAME, secret });
  const qrDataUrl  = await QRCode.toDataURL(otpauthUrl);

  const backupCodes = generateBackupCodes();
  const hashedCodes = await hashAll(backupCodes);

  user.twoFactorSecret = encryptField(secret);
  user.twoFactorMethod = "totp";
  user.twoFactorEnabled = false;
  user.backupCodes = hashedCodes;
  await user.save();

  // Return plaintext backup codes — never stored in plaintext
  return { otpauthUrl, qrDataUrl, backupCodes };
}

/**
 * Verify a TOTP code against the stored (decrypted) secret.
 * Used both during setup confirmation and at each login.
 */
export async function verifyTotp(user, code) {
  if (!user.twoFactorSecret) return false;
  const secret = decryptField(user.twoFactorSecret);
  if (!secret || secret === "[DECRYPTION FAILED]") return false;
  const result = verifySync({ secret, token: String(code).trim(), epochTolerance: 30 });
  return result?.valid === true;
}

// ─── OTP (email / sms / whatsapp) ─────────────────────────────────────────────

/**
 * Begin OTP setup: generate backup codes, send a test OTP to the user's email.
 * Saves hashed OTP + expiry + hashed backup codes.
 * Returns plaintext backup codes — shown once.
 *
 * Throws if 2FA is already enabled.
 */
export async function setupOtp(user) {
  if (user.twoFactorEnabled) {
    throw new Error("2FA is already enabled. Disable it first before changing method.");
  }

  const otp = generateOtpCode();
  const otpHash = await bcrypt.hash(otp, BCRYPT_ROUNDS);
  const expiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  const backupCodes = generateBackupCodes();
  const hashedCodes = await hashAll(backupCodes);

  user.twoFactorMethod = "otp";
  user.twoFactorEnabled = false;
  user.otpHash = otpHash;
  user.otpExpiry = expiry;
  user.backupCodes = hashedCodes;
  await user.save();

  await sendOtp({ channel: "email", to: user.email, name: user.name, otp });

  return { backupCodes };
}

/**
 * Generate a fresh OTP, store it hashed, and send it via email.
 * Used at login challenge time (OTP method) and for the disable flow.
 */
export async function generateAndSendOtp(user) {
  const otp = generateOtpCode();
  const otpHash = await bcrypt.hash(otp, BCRYPT_ROUNDS);
  const expiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  user.otpHash = otpHash;
  user.otpExpiry = expiry;
  await user.save();

  await sendOtp({ channel: "email", to: user.email, name: user.name, otp });
}

/**
 * Verify a 6-digit OTP against the stored hash.
 * Returns false if expired, not set, or hash mismatch.
 */
export async function verifyOtp(user, code) {
  if (!user.otpHash || !user.otpExpiry) return false;
  if (new Date() > new Date(user.otpExpiry)) return false;
  return bcrypt.compare(String(code).trim(), user.otpHash);
}

// ─── Backup codes ─────────────────────────────────────────────────────────────

/**
 * Verify a backup code against the hashed set.
 * Consumes the code on success (removes from array — single use).
 */
export async function verifyBackupCode(user, code) {
  if (!user.backupCodes || user.backupCodes.length === 0) return false;

  const normalized = String(code).trim().toUpperCase();
  for (let i = 0; i < user.backupCodes.length; i++) {
    const match = await bcrypt.compare(normalized, user.backupCodes[i]);
    if (match) {
      user.backupCodes.splice(i, 1);
      user.markModified("backupCodes");
      await user.save();
      return true;
    }
  }
  return false;
}

// ─── Disable ──────────────────────────────────────────────────────────────────

/**
 * Clear all 2FA state from a user document.
 */
export async function clear2fa(user) {
  user.twoFactorEnabled = false;
  user.twoFactorMethod = null;
  user.twoFactorSecret = null;
  user.backupCodes = [];
  user.otpHash = null;
  user.otpExpiry = null;
  user.twoFactorVerifiedAt = null;
  user.markModified("backupCodes");
  await user.save();
}
