import AuditLog from "../../models/AuditLog.model.js";
import { parsePagination } from "./paginate.js";

const RECEPTIONIST_SAFE_ACTIONS = new Set([
  "appointment.create",
  "appointment.update",
  "appointment.status_change",
  "appointment.assign",
  "appointment.cancel",
  "patient.create",
  "patient.update",
  "invoice.create",
  "invoice.payment",
  "invoice.update",
  "user.login",
  "user.logout",
]);

const PHI_FIELDS = new Set([
  "diagnosis",
  "clinicalFinding",
  "clinicalFindings",
  "treatment",
  "treatments",
  "notes",
  "clinicalNotes",
  "chiefComplaint",
  "medications",
  "password",
  "passwordHash",
  "token",
  "otp",
  "pin",
]);

function redactObj(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(redactObj);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = PHI_FIELDS.has(k) ? "[REDACTED]" : redactObj(v);
  }
  return out;
}

export async function queryAuditLogs(role, filters = {}) {
  const {
    page: rawPage = 1,
    startDate,
    endDate,
    startInclusive = "true",
    endInclusive = "true",
    actor,
    actorRole,
    action,
    entityType,
    q,
  } = filters;

  const { page, limit, skip } = parsePagination({ page: rawPage, limit: 50 });

  const match = {};

  // Role-scope: receptionist may only see the safe subset of actions
  if (role === "receptionist") {
    if (action) {
      if (!RECEPTIONIST_SAFE_ACTIONS.has(action)) {
        return { rows: [], total: 0, page: 1, pages: 1 };
      }
      match.action = action;
    } else {
      match.action = { $in: Array.from(RECEPTIONIST_SAFE_ACTIONS) };
    }
  } else if (action) {
    match.action = action;
  }

  // Date range
  if (startDate || endDate) {
    match.at = {};
    if (startDate) {
      match.at[startInclusive !== "false" ? "$gte" : "$gt"] = new Date(startDate);
    }
    if (endDate) {
      match.at[endInclusive !== "false" ? "$lte" : "$lt"] = new Date(endDate);
    }
  }

  if (actor)      match.actorId   = actor;
  if (actorRole)  match.actorRole = actorRole;
  if (entityType) match.entityType = entityType;

  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    match.$or = [{ actorName: rx }, { entityLabel: rx }, { publicId: rx }];
  }

  const total = await AuditLog.countDocuments(match);
  const pages = Math.max(1, Math.ceil(total / limit));
  const p     = Math.min(page, pages);

  const rawRows = await AuditLog.find(match)
    .sort({ at: -1, _id: -1 })
    .skip((p - 1) * limit)
    .limit(limit)
    .lean();

  const rows = rawRows.map((doc) => ({
    id:          doc.publicId,
    action:      doc.action,
    actorId:     doc.actorId,
    actorRole:   doc.actorRole,
    actorName:   doc.actorName,
    entityType:  doc.entityType,
    entityId:    doc.entityId,
    entityLabel: doc.entityLabel,
    before:      redactObj(doc.before),
    after:       redactObj(doc.after),
    ip:          doc.ip,
    userAgent:   doc.userAgent,
    at:          doc.at,
    hashPrev:    doc.hashPrev,
    hashSelf:    doc.hashSelf,
  }));

  return { rows, total, page: p, pages };
}
