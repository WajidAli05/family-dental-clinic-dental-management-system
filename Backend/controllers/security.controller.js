import User from "../models/User.model.js";
import { recordAudit } from "../services/shared/audit.js";

// ─── GET /owner/security/locked-accounts ─────────────────────────────────────

export const getLockedAccounts = async (req, res) => {
  const now = new Date();

  const users = await User.find({ lockedUntil: { $gt: now } })
    .select("publicId name email role lockedUntil failedLoginAttempts")
    .lean();

  const data = users.map((u) => ({
    id:                  String(u._id),
    publicId:            u.publicId,
    name:                u.name,
    email:               u.email,
    role:                u.role,
    lockedUntil:         u.lockedUntil,
    failedLoginAttempts: u.failedLoginAttempts ?? 0,
    minutesLeft:         Math.max(1, Math.ceil((new Date(u.lockedUntil) - now) / 60_000)),
  }));

  return res.json({ success: true, data });
};

// ─── POST /owner/security/unlock/:userId ──────────────────────────────────────

export const manualUnlock = async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  if (!user.lockedUntil || user.lockedUntil <= new Date()) {
    return res.status(400).json({ success: false, message: "Account is not currently locked" });
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil         = null;
  await user.save();

  await recordAudit({
    req,
    action:      "auth.account_unlocked",
    entityType:  "User",
    entityId:    user.publicId || String(user._id),
    entityLabel: user.email,
    actorId:     String(req.user._id),
    actorRole:   req.user.role,
    actorName:   req.user.name,
    after: { unlockedBy: req.user.email },
  });

  return res.json({
    success: true,
    message: `Account unlocked for ${user.email}`,
  });
};

// ─── GET /owner/security/login-history/:publicId ──────────────────────────────
// Owner viewing any staff member's login history (reuses User.loginHistory).

export const getStaffLoginHistory = async (req, res) => {
  const { publicId } = req.params;

  const user = await User.findOne({ publicId })
    .select("publicId name email role loginHistory")
    .lean();
  if (!user) {
    return res.status(404).json({ success: false, message: "Staff member not found" });
  }

  const history = [...(user.loginHistory || [])].reverse(); // newest first

  return res.json({
    success: true,
    data: {
      user: {
        publicId: user.publicId,
        name:     user.name,
        email:    user.email,
        role:     user.role,
      },
      history,
    },
  });
};
