import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import { recordAudit } from "../services/shared/audit.js";

export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email, enabled: true }).select("+passwordHash");
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

  const token = jwt.sign(
    {
      id: user._id,
      publicId: user.publicId,
      role: user.role,
    },
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
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
  });
};