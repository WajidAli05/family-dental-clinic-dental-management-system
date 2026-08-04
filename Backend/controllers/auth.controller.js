import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import { recordAudit } from "../services/shared/audit.js";
import { generateAndSendOtp } from "../services/twoFactor.service.js";
import {
  isLocked,
  minutesLeft,
  recordFailedAttempt,
  recordSuccess,
} from "../services/lockout.service.js";

export const login = async (req, res) => {
  const { email, password } = req.body;

  // `failedLoginAttempts` and `lockedUntil` are selected by default (no select:false)
  const user = await User.findOne({ email, enabled: true })
    .select("+passwordHash +otpHash +otpExpiry");
  if (!user) {
    await recordAudit({
      req,
      action:      "auth.login_failed",
      entityType:  "User",
      entityLabel: email,
      actorId:     "",
      actorRole:   "unknown",
      actorName:   email,
    });
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  // ── Lockout check BEFORE expensive bcrypt ────────────────────────────────────
  if (isLocked(user)) {
    const mins = minutesLeft(user);
    return res.status(423).json({
      success:     false,
      locked:      true,
      minutesLeft: mins,
      message:     `Account temporarily locked. Try again in ${mins} minute(s).`,
    });
  }

  const ok = await user.verifyPassword(password);
  if (!ok) {
    await recordAudit({
      req,
      action:      "auth.login_failed",
      entityType:  "User",
      entityLabel: email,
      actorId:     "",
      actorRole:   "unknown",
      actorName:   email,
    });
    // recordFailedAttempt may trigger lockout + owner notification
    await recordFailedAttempt(user, req);
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  // ── Password correct — check if 2FA is required ──────────────────────────────
  if (user.twoFactorEnabled) {
    // For OTP method: generate + send a fresh code now (before issuing challenge)
    if (user.twoFactorMethod === "otp") {
      await generateAndSendOtp(user).catch((err) => {
        console.error("[auth] Failed to send OTP during login:", err.message);
      });
    }

    // Issue a short-lived challenge token — NOT usable as a session token.
    // Counter is NOT reset here; it resets only after 2FA also passes.
    const challengeToken = jwt.sign(
      { type: "2fa_challenge", id: String(user._id) },
      process.env.JWT_SECRET,
      { expiresIn: "5m" }
    );

    return res.json({
      success:           true,
      twoFactorRequired: true,
      challengeToken,
      method:            user.twoFactorMethod,
    });
  }

  // ── No 2FA — full login success ──────────────────────────────────────────────
  // Reset failure counter, record successful login history entry
  recordSuccess(user, req).catch((err) =>
    console.error("[auth] recordSuccess failed (non-fatal):", err.message)
  );

  const token = jwt.sign(
    { id: user._id, publicId: user.publicId, role: user.role, tokenVersion: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  await recordAudit({
    req,
    action:      "user.login",
    entityType:  "User",
    entityId:    user.publicId,
    entityLabel: user.name,
    actorId:     String(user._id),
    actorRole:   user.role,
    actorName:   user.name,
  });

  return res.json({
    success: true,
    data: {
      token,
      user: {
        publicId: user.publicId,
        name:     user.name,
        email:    user.email,
        role:     user.role,
      },
    },
  });
};
