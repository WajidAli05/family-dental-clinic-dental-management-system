import express from "express";
import { getAuditLogs } from "../../controllers/audit.controller.js";
import { requirePermission } from "../../middlewares/permissions.middleware.js";

const router = express.Router();

// Owner always passes; receptionist must have tab_receptionist_logs granted
function requireAuditAccess(req, res, next) {
  if (req.user?.role === "owner") return next();
  return requirePermission("tab_receptionist_logs")(req, res, next);
}

router.get("/logs", requireAuditAccess, getAuditLogs);

export default router;
