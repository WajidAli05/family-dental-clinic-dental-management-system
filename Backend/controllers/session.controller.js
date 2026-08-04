import User from "../models/User.model.js";
import { recordAudit } from "../services/shared/audit.js";

// ─── GET /auth/session/login-history ──────────────────────────────────────────
// Self-service: each authenticated user can see their own recent logins.

export const getMyLoginHistory = async (req, res) => {
  const user = await User.findById(req.user._id).select("+loginHistory").lean();
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  const history = [...(user.loginHistory || [])].reverse(); // newest first

  return res.json({ success: true, data: history });
};

// ─── POST /auth/session/logout-all-devices ────────────────────────────────────
// Bumps tokenVersion — every existing JWT for this user (including the one
// making this request) is rejected on its next use. The caller must re-login.

export const logoutAllDevices = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $inc: { tokenVersion: 1 } },
    { new: true }
  );
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  await recordAudit({
    req,
    action:      "session.revoke_all",
    entityType:  "User",
    entityId:    user.publicId || String(user._id),
    entityLabel: user.email,
    actorId:     String(user._id),
    actorRole:   user.role,
    actorName:   user.name,
  });

  return res.json({ success: true, message: "Logged out of all devices." });
};
