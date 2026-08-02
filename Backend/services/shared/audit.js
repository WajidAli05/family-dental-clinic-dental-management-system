import crypto from "crypto";
import AuditLog from "../../models/AuditLog.model.js";

const ZERO_HASH = "0".repeat(64);

async function nextPublicId() {
  const n = await AuditLog.countDocuments();
  let count = n;
  let id;
  do {
    count++;
    id = `AUD-${String(count).padStart(6, "0")}`;
  } while (await AuditLog.exists({ publicId: id }));
  return id;
}

function sha256(str) {
  return crypto.createHash("sha256").update(str, "utf8").digest("hex");
}

function canonical(entry) {
  return JSON.stringify({
    publicId:   entry.publicId,
    actorId:    entry.actorId,
    actorRole:  entry.actorRole,
    action:     entry.action,
    entityType: entry.entityType,
    entityId:   entry.entityId,
    before:     entry.before,
    after:      entry.after,
    at:         entry.at instanceof Date ? entry.at.toISOString() : String(entry.at),
  });
}

export function buildActorCtx(req) {
  return {
    actorId:   String(req?.user?._id   || ""),
    actorRole: req?.user?.role         || "unknown",
    actorName: req?.user?.name         || "unknown",
    ip: (req?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim())
        || req?.ip
        || req?.socket?.remoteAddress
        || "",
    userAgent: req?.headers?.["user-agent"] || "",
  };
}

/**
 * Write one audit entry. Never throws — failures are console.error'd with full stack.
 *
 * @param {object} opts
 * @param {import("express").Request} opts.req
 * @param {string}  opts.action       — one of ACTIONS enum values
 * @param {string}  [opts.entityType]
 * @param {string}  [opts.entityId]
 * @param {string}  [opts.entityLabel]
 * @param {*}       [opts.before]     — snapshot before mutation (null for creates)
 * @param {*}       [opts.after]      — snapshot after mutation
 * @param {string}  [opts.actorId]    — override when req.user is not populated (auth flows)
 * @param {string}  [opts.actorRole]
 * @param {string}  [opts.actorName]
 */
export async function recordAudit({
  req,
  action,
  entityType  = "",
  entityId    = "",
  entityLabel = "",
  before      = null,
  after       = null,
  actorId     = null,
  actorRole   = null,
  actorName   = null,
} = {}) {
  if (!action) {
    console.error("[audit] recordAudit called with no action — skipped");
    return;
  }

  try {
    const ctx = buildActorCtx(req);

    const at      = new Date();
    const publicId = await nextPublicId();

    const entry = {
      publicId,
      actorId:     actorId   ?? ctx.actorId,
      actorRole:   actorRole ?? ctx.actorRole,
      actorName:   actorName ?? ctx.actorName,
      action,
      entityType,
      entityId:    entityId    ?? "",
      entityLabel: entityLabel ?? "",
      before:      before      ?? null,
      after:       after       ?? null,
      ip:          ctx.ip,
      userAgent:   ctx.userAgent,
      at,
    };

    const prev = await AuditLog
      .findOne({})
      .sort({ at: -1, _id: -1 })
      .select("hashSelf")
      .lean();

    // Gracefully handle missing or empty hashSelf on the previous entry
    const prevHash = (prev && prev.hashSelf) ? prev.hashSelf : ZERO_HASH;
    entry.hashPrev = prevHash;
    entry.hashSelf = sha256(prevHash + canonical(entry));

    await AuditLog.create(entry);
  } catch (err) {
    // Log the FULL stack so failures are never invisible in the server console
    console.error(
      "[audit] recordAudit FAILED — action:", action,
      "| entity:", entityType, entityId,
      "\n", err.stack || err.message
    );
  }
}
