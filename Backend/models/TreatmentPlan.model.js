import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";
import softDelete from "./plugins/softDelete.js";
import { PLAN_STATUSES, ITEM_STATUSES } from "../services/shared/treatmentPlanConfig.js";

const { Schema } = mongoose;

const itemSchema = new Schema(
  {
    id: { type: String, required: true }, // "TPI-1", unique within the plan

    treatmentId: { type: String, default: "" }, // "TRM-#" from ClinicalMaster
    name: { type: String, required: true },     // snapshot — catalogue renames must not rewrite history

    // FDI two-digit notation (11-18, 21-28, 31-38, 41-48). Optional: a
    // whole-mouth treatment has none.
    toothNumbers: { type: [String], default: [] },

    /**
     * PRICE SNAPSHOT. Resolved ONCE at add-time via getTreatmentFee for the
     * plan's fee schedule, then stored. A later fee-schedule edit therefore
     * cannot silently re-price a quote the patient has already been shown or
     * accepted. Changing the plan's schedule re-prices only NEW items.
     */
    unitFee: { type: Number, min: 0, default: 0 },
    quantity: { type: Number, min: 1, default: 1 },

    // Sequencing only — "Phase 1", "Phase 2". Presentation/ordering, not a
    // workflow state: acceptance stays per ITEM. Legacy items have no field
    // and are read as phase 1.
    phase: { type: Number, min: 1, default: 1 },

    status: { type: String, enum: ITEM_STATUSES, default: "proposed" },

    // Set when the item is scheduled — the Appointment's publicId ("APT-####").
    linkedAppointmentId: { type: String, default: "" },

    decidedAt: { type: Date, default: null },   // accepted/declined moment
    completedAt: { type: Date, default: null },

    // PHI: clinical free text — stored encrypted (v1:iv:tag:ct).
    notes: { type: String, default: "" },
  },
  { _id: false }
);

const treatmentPlanSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true, index: true }, // "TP-0001"

    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
    dentist: { type: Schema.Types.ObjectId, ref: "User", index: true }, // creator

    // Which price list the items were quoted from. "" => the default schedule.
    feeScheduleId: { type: String, default: "" },

    title: { type: String, default: "" },

    status: { type: String, enum: PLAN_STATUSES, default: "draft", index: true },

    // PHI: clinical free text — stored encrypted.
    notes: { type: String, default: "" },

    items: { type: [itemSchema], default: [] },
  },
  { timestamps: true }
);

treatmentPlanSchema.plugin(toJSON);
treatmentPlanSchema.plugin(softDelete);

// Patient profile lists newest-first.
treatmentPlanSchema.index({ patient: 1, createdAt: -1 });

// NOTE: no `totalEstimate` field by design — the plan total is DERIVED from
// the items on every read so it can never drift from its lines.

export default mongoose.models.TreatmentPlan ||
  mongoose.model("TreatmentPlan", treatmentPlanSchema);
