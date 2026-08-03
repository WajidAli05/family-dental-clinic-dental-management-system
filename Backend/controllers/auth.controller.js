import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import { recordAudit } from "../services/shared/audit.js";
import { generateAndSendOtp } from "../services/twoFactor.service.js";

export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email, enabled: true })
    .select("+passwordHash +otpHash +otpExpiry");
  if (!user) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
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
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  // ── Step 1 passed. Check if 2FA is required ─────────────────────────────────
  if (user.twoFactorEnabled) {
    // For OTP method: generate + send a fresh code now (before issuing challenge)
    if (user.twoFactorMethod === "otp") {
      await generateAndSendOtp(user).catch((err) => {
        console.error("[auth] Failed to send OTP during login:", err.message);
      });
    }

    // Issue a short-lived challenge token — NOT usable as a session token
    const challengeToken = jwt.sign(
      { type: "2fa_challenge", id: String(user._id) },
      process.env.JWT_SECRET,
      { expiresIn: "5m" }
    );

    // Do NOT log user.login yet — authentication is not complete
    return res.json({
      success:           true,
      twoFactorRequired: true,
      challengeToken,
      method:            user.twoFactorMethod,
    });
  }

  // ── No 2FA — issue JWT as before ────────────────────────────────────────────
  const token = jwt.sign(
    { id: user._id, publicId: user.publicId, role: user.role },
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