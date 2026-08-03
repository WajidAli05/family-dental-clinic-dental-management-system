import jwt from "jsonwebtoken";
import User from "../models/User.model.js";

export const auth = (roles = []) => {
  return async (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
      const token = header.split(" ")[1];
      const payload = jwt.verify(token, process.env.JWT_SECRET);

      // Reject challenge tokens — they are only accepted by verify-2fa-login
      if (payload.type === "2fa_challenge") {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const user = await User.findById(payload.id);
      if (!user || !user.enabled) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      if (roles.length && !roles.includes(user.role)) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      req.user = user;
      next();
    } catch {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
  };
};