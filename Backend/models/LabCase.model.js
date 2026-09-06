import mongoose from "mongoose";
import { getNextSequence } from "../services/shared/counters.js";
import toJSON from "./plugins/toJSON.js";
import softDelete from "./plugins/softDelete.js";
import { LAB_CASE_STATUSES, CASE_PRIORITIES } from "../services/shared/labCaseConfig.js";

const { Schema } = mongoose;

const pad = (n, w = 4) => String(n).padStart(w, "0");

const timelineSchema = new Schema(
  {
    at: { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      required: true,
      enum: LAB_CASE_STATUSES,
    },
    note: { type: String, default: "" },
  },
  { _id: false }
);

const labCaseSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true, index: true }, // CASE-2001

    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
    dentist: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    lab: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true }, // role=lab
    sampleType: { type: Schema.Types.ObjectId, ref: "SampleType", required: true, index: true },

    // ✅ match frontend naming
    status: {
      type: String,
      default: "sent",
      index: true,
      enum: LAB_CASE_STATUSES,
    },

    note: { type: String, default: "" }, // ✅ was notes

    teeth: { type: [String], default: [] }, // FDI, e.g. ["14","15"]

    // ── Case specification (additive; existing cases read blank/normal) ──
    material: { type: String, default: "" },   // e.g. "Zirconia", "E-max"
    shade: { type: String, default: "" },      // e.g. "A2"
    priority: { type: String, enum: CASE_PRIORITIES, default: "normal", index: true },
    dueDate: { type: String, default: "", index: true }, // "YYYY-MM-DD"

    /**
     * PHI: free-text clinical direction to the technician. It can describe the
     * presentation, the tooth condition and what the dentist wants done — that
     * is clinical detail about an identifiable patient, so it is encrypted at
     * rest (v1:iv:tag:ct) like prescription and treatment-plan notes.
     * The pre-existing `note` field is deliberately left untouched so old
     * cases stay readable without a migration.
     */
    instructions: { type: String, default: "" },

    timeline: { type: [timelineSchema], default: [] },
  },
  { timestamps: true }
);

/**
 * publicId — atomic, via the shared Counter (same as appointments/patients).
 *
 * WHY THE OLD ONE FAILED (E11000 on CASE-1770304130724):
 *  1. It claimed to find "the last CASE-#### by highest numeric suffix" but
 *     actually sorted by `createdAt: -1` — the newest ROW, not the highest id.
 *  2. `exists()` runs through the softDelete plugin, so a soft-deleted row
 *     still holding a publicId looked free while the unique index disagreed.
 *  3. The retry loop re-ran the identical query every pass, so all 5 attempts
 *     produced the SAME candidate — it never actually retried with n+1.
 *  4. On exhausting the loop it wrote `CASE-${Date.now()}`. That timestamp row
 *     then became the newest by createdAt, so step 1 derived every later id
 *     from it — poisoning the sequence into the 13-digit range permanently and
 *     making two creates in the same window collide on the same number.
 *
 * ID FORMAT DECISION
 * ------------------
 * The collection holds two shapes: 29 rows in the intended sequential range
 * (CASE-3001 .. CASE-4012) and 23 rows carrying the timestamp fallback
 * (CASE-1770304130702 .. CASE-1770304130724).
 *
 * The counter is seeded from the highest SEQUENTIAL id only (suffix of 6
 * digits or fewer), NOT the global maximum. Seeding from the global max would
 * be 1770304130724 and would lock every future id into a 13-digit number
 * forever. Starting from 4012 means the next case is CASE-4013, which
 * continues the readable format and cannot collide with the timestamp block —
 * reaching it would take ~1.77 trillion cases.
 *
 * Existing ids of BOTH shapes are left exactly as stored; nothing is rewritten,
 * so attachments (ownerId = case publicId) and invoice links keep resolving.
 *
 * The seed reads with includeDeleted so a soft-deleted case never has its
 * number handed out again.
 */
const CASE_SEQ_FLOOR = 3000;      // first id would be CASE-3001 on an empty DB
const MAX_SEQUENTIAL_DIGITS = 6;  // anything longer is a legacy timestamp id

export async function computeLabCaseIdSeed() {
  const rows = await mongoose.models.LabCase.find({})
    .setOptions({ includeDeleted: true })
    .select("publicId")
    .lean();

  let max = CASE_SEQ_FLOOR;
  for (const r of rows) {
    const m = /^CASE-(\d+)$/.exec(String(r.publicId || ""));
    // Skip the timestamp-shaped ids deliberately — see the note above.
    if (m && m[1].length <= MAX_SEQUENTIAL_DIGITS) {
      max = Math.max(max, parseInt(m[1], 10));
    }
  }
  return max;
}

labCaseSchema.pre("validate", async function () {
  if (!this.isNew || this.publicId) return;
  const n = await getNextSequence("labcase", computeLabCaseIdSeed);
  this.publicId = `CASE-${pad(n)}`;
});

labCaseSchema.plugin(toJSON);
labCaseSchema.plugin(softDelete);
labCaseSchema.index({ lab: 1, status: 1, createdAt: -1 });
// Drives the overdue / urgent indicators without a collection scan.
labCaseSchema.index({ dueDate: 1, status: 1 });

export default mongoose.models.LabCase || mongoose.model("LabCase", labCaseSchema);