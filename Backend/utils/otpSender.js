/**
 * Backend/utils/otpSender.js
 *
 * Reusable email + OTP delivery utility.
 *
 * Required env vars (add to Backend/.env):
 *   SMTP_HOST     — SMTP server hostname
 *   SMTP_PORT     — 587 (STARTTLS) or 465 (SSL)
 *   SMTP_SECURE   — "true" for port 465, "false" for 587
 *   SMTP_USER     — SMTP login / email address
 *   SMTP_PASS     — SMTP password or app-specific password
 *   SMTP_FROM     — Sender string, e.g. "FDC Clinic <no-reply@clinic.com>"
 *
 * Behaviour when SMTP is not configured or fails:
 *   NODE_ENV !== "production" (dev / test):
 *     → OTP is printed to the server console (clearly marked [DEV ONLY]).
 *       This lets you test email 2FA locally without a real mail server.
 *       No error is thrown; the OTP is stored and ready to verify.
 *   NODE_ENV === "production":
 *     → A clean user-facing error is thrown. The OTP is NEVER logged.
 *
 * Pluggable channel stubs (SMS, WhatsApp) are at the bottom for future wiring.
 */

import nodemailer from "nodemailer";

// ── Configuration detection ───────────────────────────────────────────────────

// Placeholder values written to .env.example — if still present, SMTP is not set up.
const PLACEHOLDER_HOSTS = new Set([
  "smtp.example.com",
  "your.smtp.host",
  "",
]);

const PLACEHOLDER_USERS = new Set([
  "your-email@example.com",
  "your_smtp_user",
  "",
]);

/**
 * Returns true only when all critical SMTP env vars are present and
 * non-placeholder so we can attempt a real send.
 */
function isSmtpConfigured() {
  const host = (process.env.SMTP_HOST || "").trim();
  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASS || "").trim();

  if (PLACEHOLDER_HOSTS.has(host)) return false;
  if (PLACEHOLDER_USERS.has(user)) return false;
  if (!pass || pass === "your-app-password-here") return false;
  return true;
}

function buildTransporter() {
  return nodemailer.createTransport({
    host:   (process.env.SMTP_HOST || "").trim(),
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: (process.env.SMTP_USER || "").trim(),
      pass: (process.env.SMTP_PASS || "").trim(),
    },
  });
}

// ── Core email sender ─────────────────────────────────────────────────────────

/**
 * Send an arbitrary email through the configured SMTP transport.
 * Reusable by any part of the app (OTP, notifications, etc.).
 *
 * @param {{ to: string, subject: string, text: string, html: string }} opts
 * @throws {Error} if SMTP is not configured (production) or if the send fails (production)
 */
export async function sendEmail({ to, subject, text, html }) {
  const from = (process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@fdclinic.com").trim();
  const transporter = buildTransporter();

  await transporter.sendMail({ from, to, subject, text, html });
}

// ── OTP-specific email ────────────────────────────────────────────────────────

/**
 * Send a 2FA / login OTP to a user.
 *
 * In dev (NODE_ENV !== "production"):
 *   - If SMTP is configured: tries to send. On failure, falls back to console log.
 *   - If SMTP is NOT configured: logs OTP to console only (no error thrown).
 * In production (NODE_ENV === "production"):
 *   - If SMTP is not configured: throws a clean error (never logs the OTP).
 *   - If send fails: throws a clean error (never logs the OTP).
 *
 * @param {string} to    - recipient email address
 * @param {string} name  - recipient display name
 * @param {string} otp   - plaintext OTP (will not be stored; only passed here)
 */
export async function sendOtpEmail(to, name, otp) {
  const isProd = process.env.NODE_ENV === "production";

  // ── Not configured ───────────────────────────────────────────────────────
  if (!isSmtpConfigured()) {
    if (isProd) {
      throw new Error(
        "Email delivery is not configured. " +
        "Set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM in the server environment."
      );
    }
    // Dev: fall back to console — never in production
    console.warn(
      `\n${"─".repeat(60)}\n` +
      `[DEV ONLY] OTP for ${to}: ${otp}\n` +
      `(SMTP not configured — set SMTP_* vars in Backend/.env for real email)\n` +
      `${"─".repeat(60)}\n`
    );
    return;
  }

  // ── Attempt real send ────────────────────────────────────────────────────
  const subject = "FDC — Your verification code";
  const text = [
    `Hello ${name},`,
    ``,
    `Your FDC verification code is: ${otp}`,
    ``,
    `This code expires in 10 minutes.`,
    `If you did not request this, please ignore this message and secure your account.`,
  ].join("\n");
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#2ec4b6;margin-bottom:8px">FDC Verification Code</h2>
      <p style="color:#444">Hello <strong>${name}</strong>,</p>
      <p style="color:#444">Your verification code is:</p>
      <div style="font-size:2.2rem;font-weight:700;letter-spacing:.35rem;color:#2ec4b6;
                  padding:16px 0;border-top:2px solid #e5f9f7;border-bottom:2px solid #e5f9f7;
                  margin:16px 0;text-align:center">
        ${otp}
      </div>
      <p style="color:#666;font-size:.95rem">
        This code expires in <strong>10 minutes</strong>.
      </p>
      <p style="color:#999;font-size:.8rem;margin-top:24px">
        If you did not request this code, please ignore this email.
        Your account remains secure as long as you do not share this code.
      </p>
    </div>`;

  try {
    await sendEmail({ to, subject, text, html });
  } catch (err) {
    if (isProd) {
      // Never log the OTP in production; surface a clean user-facing error
      console.error(`[otpSender] SMTP send failed for ${to}:`, err.message);
      throw new Error("Failed to send verification code. Please try again or contact support.");
    }
    // Dev: log OTP to console and continue — don't let SMTP misconfiguration block dev testing
    console.warn(
      `\n${"─".repeat(60)}\n` +
      `[DEV ONLY] OTP for ${to}: ${otp}\n` +
      `(SMTP send failed: ${err.message})\n` +
      `${"─".repeat(60)}\n`
    );
  }
}

// ── Channel router (existing interface) ───────────────────────────────────────

async function sendSms({ to }) {
  console.log(`[otpSender] SMS stub — wire to your gateway for ${to}`);
}

async function sendWhatsApp({ to }) {
  console.log(`[otpSender] WhatsApp stub — wire to your API for ${to}`);
}

/**
 * Route an OTP to the right channel.
 * The email channel uses sendOtpEmail() with graceful-degradation semantics above.
 */
export async function sendOtp({ channel = "email", to, name = "", otp }) {
  switch (channel) {
    case "email":
      return sendOtpEmail(to, name, otp);
    case "sms":
      return sendSms({ to, otp });
    case "whatsapp":
      return sendWhatsApp({ to, otp });
    default:
      throw new Error(`[otpSender] Unknown channel: ${channel}`);
  }
}
