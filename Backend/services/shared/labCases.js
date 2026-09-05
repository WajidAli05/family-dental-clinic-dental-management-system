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
import {
  canonicalStatus, isLabCaseStatus, canTransition, allowedNextStatuses,
  ROLE_ALLOWED_STATUSES,
} from "./labCaseConfig.js";

// ── Dentist action → canonical DB status (Batch-3 canonical source) ──────────
export const DENTIST_ACTION_MAP = {
  approved: "approved",
  rejected: "rejected",
  // Reopening puts the case back into production — canonical spelling now,
  // but "in_progress" remains a legal stored value for old rows.
  reopened: "in_production",
  // Extended lifecycle steps the clinic performs on receipt.
  received: "received",
  fitted: "fitted",
};

// Canonical spellings; legacy values are canonicalised before these are read.
export const FINALIZE_FROM = new Set([
  "requested", "in_production", "qc", "ready", "dispatched", "received", "fitted",
]);
export const REOPEN_FROM = new Set(["approved", "rejected", "dispatched"]);

export const TIMELINE_NOTES = {
  approved: "Approved by dentist",
  rejected: "Rejected by dentist",
  reopened: "Reopened by dentist",
  received: "Received at the clinic",
  fitted: "Fitted for the patient",
};

/**
 * Statuses the LAB may write. Sourced from the shared config so the rule
 * exists once — and deliberately excludes approved/rejected, which stay a
 * dentist-only clinical decision (the 403 below is preserved behaviour).
 */
const LAB_WRITABLE = new Set(ROLE_ALLOWED_STATUSES.lab);

/** Accepts legacy or canonical spelling; always stores canonical. */
function toDbStatus(v) {
  return canonicalStatus(v);
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
    // The dentist UI historically posted ACTIONS ("reopened"), while the new
    // status control posts canonical STATUSES ("in_production"). Accept both:
    // dropping either vocabulary would break one of the two callers.
    dbStatus = DENTIST_ACTION_MAP[raw] || toDbStatus(raw);
    if (!ROLE_ALLOWED_STATUSES.dentist.includes(dbStatus)) {
      throw makeErr(
        `Invalid action "${requestedStatus}". Valid: ${Object.keys(DENTIST_ACTION_MAP).join(", ")}, ${ROLE_ALLOWED_STATUSES.dentist.join(", ")}.`
      );
    }
    timelineNote = TIMELINE_NOTES[raw] || `Set to ${dbStatus} by dentist`;
  } else {
    dbStatus = toDbStatus(raw);
    if (!isLabCaseStatus(dbStatus)) throw makeErr(`Invalid status "${requestedStatus}".`);

    if (role !== "owner" && (dbStatus === "approved" || dbStatus === "rejected")) {
      throw makeErr(
        `Only the dentist may ${dbStatus === "approved" ? "approve" : "reject"} a lab case.`,
        403
      );
    }
    if (role === "lab" && !LAB_WRITABLE.has(dbStatus)) {
      throw makeErr(
        `Lab may not set status "${dbStatus}". Permitted: ${[...LAB_WRITABLE].join(", ")}.`,
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
  if (role === "dentist" && ["approved", "rejected", "reopened"].includes(raw)) {
    if (raw === "reopened") {
      if (!REOPEN_FROM.has(canonicalStatus(c.status)))
        throw makeErr(
          `Cannot reopen a case with status "${canonicalStatus(c.status)}". Only approved, rejected, or dispatched cases can be reopened.`
        );
    } else {
      if (!FINALIZE_FROM.has(canonicalStatus(c.status)))
        throw makeErr(`Cannot ${raw} a case that is already "${canonicalStatus(c.status)}". Reopen it first.`);
    }
  }

  // ── 3b. Lifecycle guard for lab/receptionist ────────────────────────────────
  // Owner keeps its historical free-transition ability (it is the break-glass
  // role); the lab and front desk must follow the lifecycle.
  if (role === "lab" || role === "receptionist") {
    if (!canTransition(c.status, dbStatus, role)) {
      throw makeErr(
        `Cannot move a case from "${canonicalStatus(c.status)}" to "${dbStatus}". Allowed next: ${allowedNextStatuses(c.status, role).join(", ") || "none"}.`,
        400
      );
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

// ── THE shared mapper ───────────────────────────────────────────────────────
import { canonicalStatus as canon, isOverdue, CANONICAL_STATUSES, INITIAL_STATUS } from "./labCaseConfig.js";
import { decryptField, encryptField } from "../../utils/fieldEncryption.js";

/**
 * ONE case → UI shape, used by every role's endpoint.
 *
 * Five separate hand-rolled mappers existed (dentist x2, lab, owner x2) and
 * they already disagreed about which fields to expose. New lifecycle fields
 * would have had to be added to all five, so this is the single place now.
 *
 * `status` is returned CANONICAL, with the raw stored value alongside — a
 * legacy row storing "sent" reads as "requested" without being rewritten.
 */
export function mapLabCase(doc, { role = "", today = "" } = {}) {
  const c = doc?.toObject ? doc.toObject() : doc;
  if (!c) return null;

  const status = canon(c.status);
  return {
    id: c.publicId,
    status,
    rawStatus: c.status || "",
    allowedNext: role ? allowedNextStatuses(c.status, role) : [],

    patientId: c.patient?.publicId || "",
    patientName: c.patient?.name || "",
    dentistId: c.dentist?.publicId || "",
    dentistName: c.dentist?.name || "",
    labId: c.lab?.publicId || "",
    labName: c.lab?.name || "",
    sampleTypeId: c.sampleType?.publicId || "",
    type: c.sampleType?.name || "",

    teeth: Array.isArray(c.teeth) ? c.teeth : [],
    material: c.material || "",
    shade: c.shade || "",
    priority: c.priority || "normal",
    dueDate: c.dueDate || "",
    // Derived, never stored — an urgent/overdue badge must not go stale.
    overdue: isOverdue(c.dueDate, c.status, today),

    note: c.note || "",
    instructions: decryptField(c.instructions || ""), // PHI, decrypted for authorised reads
    timeline: Array.isArray(c.timeline)
      ? c.timeline.map((t) => ({ at: t.at, status: canon(t.status), note: t.note || "" }))
      : [],
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

/** Case-specification fields any role with edit rights may set. */
export function applyCaseFields(doc, body = {}) {
  const clean = (v) => String(v ?? "").trim();
  if (body.material !== undefined) doc.material = clean(body.material).slice(0, 120);
  if (body.shade !== undefined) doc.shade = clean(body.shade).slice(0, 40);
  if (body.dueDate !== undefined) doc.dueDate = clean(body.dueDate);
  if (body.priority !== undefined) {
    const p = clean(body.priority).toLowerCase();
    doc.priority = ["normal", "high", "urgent"].includes(p) ? p : "normal";
  }
  if (body.instructions !== undefined) {
    doc.instructions = encryptField(clean(body.instructions).slice(0, 2000)); // PHI at rest
  }
  if (Array.isArray(body.teeth)) {
    doc.teeth = body.teeth.map((t) => String(t).trim()).filter(Boolean);
  }
  return doc;
}

export { CANONICAL_STATUSES, INITIAL_STATUS };
