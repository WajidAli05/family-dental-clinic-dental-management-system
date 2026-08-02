import { queryAuditLogs } from "../services/shared/auditQuery.js";
import { recordAudit } from "../services/shared/audit.js";

export const getAuditLogs = async (req, res) => {
  try {
    const role = req.user?.role;
    const filters = {
      page:           req.query.page,
      startDate:      req.query.startDate,
      endDate:        req.query.endDate,
      startInclusive: req.query.startInclusive,
      endInclusive:   req.query.endInclusive,
      actor:          req.query.actor,
      actorRole:      req.query.actorRole,
      action:         req.query.action,
      entityType:     req.query.entityType,
      q:              req.query.q,
    };

    const result = await queryAuditLogs(role, filters);

    // Fire-and-forget self-audit (never throws; non-recursive since action is audit.view)
    recordAudit({
      req,
      action:      "audit.view",
      entityType:  "AuditLog",
      entityLabel: "log-query",
      after:       { page: req.query.page, resultCount: result.total },
    }).catch(() => {});

    return res.json({ success: true, data: result });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};
