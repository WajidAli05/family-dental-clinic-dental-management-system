import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import { recordAudit } from "../services/shared/audit.js";
import {
  setupTotp,
  setupOtp,
  verifyTotp,
  verifyOtp,
  verifyBackupCode,
  generateAndSendOtp,
  clear2fa,
} from "../services/twoFactor.service.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SELECT_2FA = "+twoFactorSecret +backupCodes +otpHash +otpExpiry";

function userAuditCtx(user) {
  return {
    entityType:  "User",
    entityId:    user.publicId || String(user._id),
    entityLabel: user.name,
    actorId:     String(user._id),
    actorRole:   user.role,
    actorName:   user.name,
  };
}

// ─── GET /auth/2fa/status ─────────────────────────────────────────────────────

export const get2faStatus = async (req, res) => {
  const user = await User.findById(req.user._id).lean();
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  return res.json({
    success: true,
    data: {
      twoFactorEnabled:    user.twoFactorEnabled    ?? false,
      twoFactorMethod:     user.twoFactorMethod      ?? null,
      twoFactorVerifiedAt: user.twoFactorVerifiedAt  ?? null,
    },
  });
};

// ─── POST /auth/2fa/setup ─────────────────────────────────────────────────────

export const setup2fa = async (req, res) => {
  const { method = "totp" } = req.body;
  if (!["totp", "otp"].includes(method)) {
    return res.status(400).json({ success: false, message: "method must be 'totp' or 'otp'" });
  }

  const user = await User.findById(req.user._id).select(SELECT_2FA);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  let result;
  if (method === "totp") {
    result = await setupTotp(user);
  } else {
    result = await setupOtp(user);
  }

  await recordAudit({
    req,
    action: "user.2fa_setup",
    ...userAuditCtx(user),
    after: { method },
  });

  return res.json({ success: true, data: { method, ...result } });
};

// ─── POST /auth/2fa/verify-setup ──────────────────────────────────────────────
// Confirms a code after setup — enables 2FA on the account.

export const verifySetup = async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ success: false, message: "code is required" });

  const user = await User.findById(req.user._id).select(SELECT_2FA);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  if (!user.twoFactorMethod) {
    return res.status(400).json({ success: false, message: "Run setup first" });
  }

  let ok = false;
  if (user.twoFactorMethod === "totp") {
    ok = await verifyTotp(user, code);
  } else {
    ok = await verifyOtp(user, code);
  }

  if (!ok) {
    await recordAudit({ req, action: "auth.2fa_failed", ...userAuditCtx(user), after: { step: "setup_verify" } });
    return res.status(401).json({ success: false, message: "Invalid or expired code" });
  }

  // Enable 2FA
  user.twoFactorEnabled    = true;
  user.twoFactorVerifiedAt = new Date();
  if (user.twoFactorMethod === "otp") {
    user.otpHash   = null;
    user.otpExpiry = null;
  }
  await user.save();

  await recordAudit({ req, action: "user.2fa_enabled", ...userAuditCtx(user), after: { method: user.twoFactorMethod } });

  return res.json({ success: true, message: "2FA enabled successfully" });
};

// ─── POST /auth/2fa/send-otp ──────────────────────────────────────────────────
// Trigger an OTP send (for disable flow or resend during OTP setup).

export const sendOtpForUser = async (req, res) => {
  const user = await User.findById(req.user._id).select("+otpHash +otpExpiry");
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  await generateAndSendOtp(user);

  return res.json({ success: true, message: "Code sent to your registered email" });
};

// ─── POST /auth/2fa/login ─────────────────────────────────────────────────────
// Second step of login — validate challenge token + code, issue real JWT.

export const verify2faLogin = async (req, res) => {
  const { challengeToken, code, codeType = "totp" } = req.body;
  if (!challengeToken || !code) {
    return res.status(400).json({ success: false, message: "challengeToken and code are required" });
  }

  // Verify the challenge token (must be type "2fa_challenge")
  let payload;
  try {
    payload = jwt.verify(challengeToken, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired challenge token" });
  }

  if (payload.type !== "2fa_challenge") {
    return res.status(401).json({ success: false, message: "Invalid token type" });
  }

  const user = await User.findById(payload.id).select(`+passwordHash ${SELECT_2FA}`);
  if (!user || !user.enabled) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  if (!user.twoFactorEnabled) {
    return res.status(400).json({ success: false, message: "2FA not enabled for this account" });
  }

  let ok = false;
  if (codeType === "backup") {
    ok = await verifyBackupCode(user, code);
  } else if (user.twoFactorMethod === "totp") {
    ok = await verifyTotp(user, code);
  } else if (user.twoFactorMethod === "otp") {
    ok = await verifyOtp(user, code);
    if (ok) {
      // Consume the OTP
      user.otpHash   = null;
      user.otpExpiry = null;
      await user.save();
    }
  }

  if (!ok) {
    await recordAudit({
      req,
      action:      "auth.2fa_failed",
      ...userAuditCtx(user),
      after: { step: "login", codeType },
    });
    return res.status(401).json({ success: false, message: "Invalid 2FA code" });
  }

  // 2FA passed — issue full JWT
  const token = jwt.sign(
    { id: user._id, publicId: user.publicId, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  await recordAudit({ req, action: "auth.2fa_verified", ...userAuditCtx(user), after: { codeType } });
  await recordAudit({ req, action: "user.login",        ...userAuditCtx(user) });

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

// ─── POST /auth/2fa/disable ───────────────────────────────────────────────────
// Requires valid password AND a current 2FA code (or backup code).

export const disable2fa = async (req, res) => {
  const { password, code, codeType = "totp" } = req.body;
  if (!password || !code) {
    return res.status(400).json({ success: false, message: "password and code are required" });
  }

  const user = await User.findById(req.user._id).select(`+passwordHash ${SELECT_2FA}`);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  if (!user.twoFactorEnabled) {
    return res.status(400).json({ success: false, message: "2FA is not enabled" });
  }

  // Re-authenticate with password
  const pwOk = await user.verifyPassword(password);
  if (!pwOk) {
    return res.status(401).json({ success: false, message: "Invalid password" });
  }

  // Verify 2FA code
  let ok = false;
  if (codeType === "backup") {
    ok = await verifyBackupCode(user, code);
  } else if (user.twoFactorMethod === "totp") {
    ok = await verifyTotp(user, code);
  } else if (user.twoFactorMethod === "otp") {
    ok = await verifyOtp(user, code);
  }

  if (!ok) {
    await recordAudit({ req, action: "auth.2fa_failed", ...userAuditCtx(user), after: { step: "disable" } });
    return res.status(401).json({ success: false, message: "Invalid 2FA code" });
  }

  await clear2fa(user);

  await recordAudit({ req, action: "user.2fa_disabled", ...userAuditCtx(user) });

  return res.json({ success: true, message: "2FA disabled" });
};
