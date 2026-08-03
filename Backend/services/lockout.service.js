/**
 * Backend/services/lockout.service.js
 *
 * Account brute-force protection.
 *
 * Policy:
 *   - 3 consecutive failed attempts (wrong password OR wrong 2FA code) → 15-minute lock
 *   - Lock is per-account only; IP is recorded in login history but never used for clinic-wide locks
 *   - Lock auto-expires (no permanent locks)
 *   - On lockout: audit entry + in-app owner notification + email alert (gracefully degraded)
 *   - Successful full login (including 2FA) resets the counter
 */

import User        from "../models/User.model.js";
import Notification from "../models/Notification.model.js";
import { recordAudit } from "./shared/audit.js";
import { sendEmail }   from "../utils/otpSender.js";

export const LOCKOUT_THRESHOLD   = 3;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// ── Helpers ───────────────────────────────────────────────────────────────────

function getIp(req) {
  return (
    req?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req?.ip ||
    req?.socket?.remoteAddress ||
    ""
  );
}

/** Returns true when the account is currently within its lockout window. */
export function isLocked(user) {
  return !!(user.lockedUntil && new Date(user.lockedUntil) > new Date());
}

/** Minutes remaining in the lockout window (ceil, minimum 1). */
export function minutesLeft(user) {
  if (!isLocked(user)) return 0;
  return Math.max(1, Math.ceil((new Date(user.lockedUntil) - Date.now()) / 60_000));
}

// ── Owner notification ────────────────────────────────────────────────────────

async function notifyOwner(lockedUser, req) {
  const owner = await User.findOne({ role: "owner", enabled: true }).select("name email").lean();
  if (!owner) return;

  const ip  = getIp(req);
  const at  = new Date().toLocaleString("en-GB", { timeZone: "Asia/Karachi" });
  const who = `"${lockedUser.email}" (${lockedUser.role})`;
  const msg = `Account ${who} was locked after ${LOCKOUT_THRESHOLD} consecutive failed login attempts at ${at} from IP ${ip || "unknown"}.`;

  // In-app notification (always attempted)
  await Notification.create({
    recipientId: owner._id,
    type:        "lockout_alert",
    title:       "Account Locked",
    message:     msg,
    meta: {
      lockedUserId:    String(lockedUser._id),
      lockedUserEmail: lockedUser.email,
      lockedUserRole:  lockedUser.role,
      ip,
      at,
    },
  });

  // Email to owner — graceful degradation; never throws out
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="color:#dc2626;margin-bottom:4px">Security Alert — Account Locked</h2>
      <p style="color:#555;margin-top:0">Family Dental Clinic</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0;font-size:.9rem">
        <tr style="border-bottom:1px solid #f0f0f0">
          <td style="padding:6px 8px;color:#888;white-space:nowrap">Account</td>
          <td style="padding:6px 8px;color:#222">${lockedUser.email} (${lockedUser.role})</td>
        </tr>
        <tr style="border-bottom:1px solid #f0f0f0">
          <td style="padding:6px 8px;color:#888">Time</td>
          <td style="padding:6px 8px;color:#222">${at}</td>
        </tr>
        <tr style="border-bottom:1px solid #f0f0f0">
          <td style="padding:6px 8px;color:#888">From IP</td>
          <td style="padding:6px 8px;color:#222">${ip || "unknown"}</td>
        </tr>
        <tr>
          <td style="padding:6px 8px;color:#888">Duration</td>
          <td style="padding:6px 8px;color:#222">Auto-unlocks after 15 minutes</td>
        </tr>
      </table>
      <p style="color:#555;font-size:.875rem">
        Log in to the <strong>owner panel → Security</strong> to view or manually unlock this account.
      </p>
      <p style="color:#999;font-size:.75rem;margin-top:24px">
        This is an automated security alert from FDC. Do not reply to this email.
      </p>
    </div>`;
  const text =
    `FDC Security Alert — Account Locked\n\n${msg}\n\n` +
    `Auto-unlocks after 15 minutes.\n` +
    `Log in to the owner panel → Security to manually unlock if needed.`;

  sendEmail({
    to:      owner.email,
    subject: "FDC Security Alert: Account Locked",
    text,
    html,
  }).catch((err) => {
    console.error("[lockout] Owner email alert failed (non-fatal):", err.message);
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Record one failed attempt. Uses findByIdAndUpdate so the caller's User
 * document does not need loginHistory pre-loaded (select: false field).
 * Triggers lockout + audit + owner notification when threshold is reached.
 */
export async function recordFailedAttempt(user, req) {
  const newCount     = (user.failedLoginAttempts || 0) + 1;
  const triggerLock  = newCount >= LOCKOUT_THRESHOLD && !isLocked(user);
  const lockedUntil  = triggerLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : (user.lockedUntil || null);

  const histEntry = {
    at:      new Date(),
    ip:      getIp(req),
    ua:      req?.headers?.["user-agent"] || "",
    success: false,
  };

  await User.findByIdAndUpdate(user._id, {
    $set:  { failedLoginAttempts: newCount, lockedUntil },
    $push: { loginHistory: { $each: [histEntry], $slice: -20 } },
  });

  // Reflect changes on the in-memory object (so the controller can read them without a reload)
  user.failedLoginAttempts = newCount;
  user.lockedUntil         = lockedUntil;

  if (triggerLock) {
    recordAudit({
      req,
      action:      "auth.lockout",
      entityType:  "User",
      entityId:    user.publicId  || String(user._id),
      entityLabel: user.email,
      actorId:     "",
      actorRole:   "unknown",
      actorName:   user.email,
      after: {
        reason:       `${LOCKOUT_THRESHOLD} consecutive failed attempts`,
        minutesLocked: 15,
        ip:            getIp(req),
      },
    }).catch((err) => console.error("[lockout] audit failed:", err.message));

    notifyOwner(user, req).catch((err) =>
      console.error("[lockout] notifyOwner failed:", err.message)
    );
  }
}

/**
 * Record a successful full login (password + optional 2FA both passed).
 * Resets the failure counter and records a successful login history entry.
 */
export async function recordSuccess(user, req) {
  const histEntry = {
    at:      new Date(),
    ip:      getIp(req),
    ua:      req?.headers?.["user-agent"] || "",
    success: true,
  };

  await User.findByIdAndUpdate(user._id, {
    $set:  { failedLoginAttempts: 0, lockedUntil: null },
    $push: { loginHistory: { $each: [histEntry], $slice: -20 } },
  });
}
