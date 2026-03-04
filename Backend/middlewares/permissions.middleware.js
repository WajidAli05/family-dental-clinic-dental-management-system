import { userCanAccess } from "../services/permissions.service.js";

export const requirePermission = (permKey) => {
  return async (req, res, next) => {
    try {
      const ok = await userCanAccess(req.user, permKey);
      if (!ok) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: permission denied",
        });
      }
      next();
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: e.message || "Permission check failed",
      });
    }
  };
};