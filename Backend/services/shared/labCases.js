/**
 * Shared lab-case status helper — single source of truth for the permission matrix.
 *
 * Role → allowed status transitions
 *   dentist      : approved / rejected / reopened (maps to in_progress)
 *                  own cases only (dentist === actorId);
 *                  FINALIZE_FROM / REOPEN_FROM guards preserved from Batch-3
 *   lab          : sent / in_progress / ready / delivered
 *                  own assigned cases only (lab === labUser._id); 403 on approved/rejected
 *   owner        : any status, any case
 *   receptionist : any status, any case (free-transition, unchanged)
 *
 * Returns the saved Mongoose document; callers handle shape-mapping.
 */
import LabCase from "../../models/LabCase.model.js";
import User from "../../models/User.model.js";

// ── Dentist action → canonical DB status (Batch-3 canonical source) ──────────
export const DENTIST_ACTION_MAP = {
  approved: "approved",
  rejected: "rejected",
  reopened: "in_progress",
};

export const FINALIZE_FROM = new Set(["sent", "in_progress", "ready", "delivered", "received"]);
export const REOPEN_FROM   = new Set(["approved", "rejected", "delivered"]);

export const TIMELINE_NOTES = {
  approved: "Approved by dentist",
  rejected: "Rejected by dentist",
  reopened: "Reopened by dentist",
};

// Statuses the lab role may write
const LAB_WRITABLE = new Set(["sent", "in_progress", "ready", "delivered"]);

// All canonical DB statuses
const ALL_DB = new Set(["sent", "in_progress", "ready", "delivered", "approved", "rejected", "received"]);

function toDbStatus(v) {
  const s = String(v || "").trim().toLowerCase();
  if (s === "sent") return "sent";
  if (s === "received") return "received";
  if (s === "in_progress" || s === "in-progress" || s === "in process" || s === "in_process") return "in_progress";
  if (s === "ready") return "ready";
  if (s === "delivered") return "delivered";
  if (s === "approved") return "approved";
  if (s === "rejected") return "rejected";
  return s;
}

function makeErr(msg, status = 400) {
  const e = new Error(msg);
  e.status = status;
  return e;
}

/**
 * Update a LabCase status with full role-based permission enforcement.
 *
 * @param {"dentist"|"lab"|"owner"|"receptionist"} actorRole
 * @param {mongoose.Types.ObjectId|string} actorId  ObjectId for dentist/owner/receptionist; publicId string for lab
 * @param {string} casePublicId  e.g. "CASE-0001"
 * @param {string} requestedStatus  dentist: "approved"|"rejected"|"reopened"; others: canonical DB status
 * @returns {Promise<mongoose.Document>} the saved LabCase document
 */
export async function updateLabCaseStatus(actorRole, actorId, casePublicId, requestedStatus) {
  const role = String(actorRole).toLowerCase();
  const raw  = String(requestedStatus || "").toLowerCase().trim();

  // ── 1. Resolve target DB status + validate role permissions ──────────────────
  let dbStatus, timelineNote;

  if (role === "dentist") {
    dbStatus = DENTIST_ACTION_MAP[raw];
    if (!dbStatus) throw makeErr(`Invalid action "${requestedStatus}". Valid: approved, rejected, reopened.`);
    timelineNote = TIMELINE_NOTES[raw];
  } else {
    dbStatus = toDbStatus(raw);
    if (!ALL_DB.has(dbStatus)) throw makeErr(`Invalid status "${requestedStatus}".`);

    if (role === "lab" && !LAB_WRITABLE.has(dbStatus)) {
      throw makeErr(
        `Lab may not set status "${dbStatus}". Permitted: sent, in_progress, ready, delivered.`,
        403
      );
    }

    timelineNote = `Updated by ${role}`;
  }

  // ── 2. Fetch case (with ownership guard where applicable) ────────────────────
  let c;

  if (role === "dentist") {
    c = await LabCase.findOne({ publicId: casePublicId, dentist: actorId });
    if (!c) throw makeErr("Case not found", 404);
  } else if (role === "lab") {
    const labUser = await User.findOne({ publicId: actorId, role: "lab" }).select("_id").lean();
    if (!labUser) throw makeErr("Lab not found", 404);
    c = await LabCase.findOne({ publicId: casePublicId, lab: labUser._id });
    if (!c) throw makeErr("Case not found", 404);
  } else {
    // owner / receptionist: no ownership restriction
    c = await LabCase.findOne({ publicId: casePublicId });
    if (!c) throw makeErr("Case not found", 404);
  }

  // ── 3. Dentist transition guards (Batch-3 behaviour, preserved exactly) ──────
  if (role === "dentist") {
    if (raw === "reopened") {
      if (!REOPEN_FROM.has(c.status))
        throw makeErr(
          `Cannot reopen a case with status "${c.status}". Only approved, rejected, or delivered cases can be reopened.`
        );
    } else {
      if (!FINALIZE_FROM.has(c.status))
        throw makeErr(`Cannot ${raw} a case that is already "${c.status}". Reopen it first.`);
    }
  }

  // ── 4. Apply + save ──────────────────────────────────────────────────────────
  c.status = dbStatus;
  c.timeline.push({
    at: new Date().toISOString().slice(0, 16).replace("T", " "),
    status: dbStatus,
    note: timelineNote,
  });

  await c.save();
  return c;
}
