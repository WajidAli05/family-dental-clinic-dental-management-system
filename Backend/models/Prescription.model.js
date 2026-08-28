import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";
import softDelete from "./plugins/softDelete.js";

const { Schema } = mongoose;

const PrescriptionSchema = new Schema(
  {
    _id: { type: String, required: true }, // e.g. "RX-...." from makeId()

    patientType: { type: String, default: null },
    selectedTeeth: { type: [String], default: [] },

    diagnosis: { type: String, default: "" },
    treatment: { type: String, default: "" },
    clinicalFinding: { type: String, default: "" },

    visualStatus: { type: String, enum: ["none", "planned", "progress", "completed", "urgent"], default: "none" },
    notes: { type: String, default: "" },

    // Stored as AES-256-GCM encrypted JSON string ("v1:iv:tag:ct") after encryption
    // is deployed. Legacy documents retain the plain array until the migration
    // script (Backend/scripts/encryptPrescriptionFields.js) is run.
    // Mixed type allows both the legacy array and the encrypted string to coexist
    // during the transition window.
    medications: {
      type: Schema.Types.Mixed,
      default: [],
    },

    // Per-tooth clinical record (tooth-based charting, the Open Dental model):
    // [{ toothNumber (FDI), diagnosis, treatment, clinicalFinding, note,
    //    xrayRequested, xrayNote,
    //    planId?, planItemId? }]
    // planId/planItemId are OPTIONAL provenance: present only when the entry
    // was prefilled from a treatment-plan item, so the record shows which
    // planned treatment this visit executed. Hand-entered and legacy entries
    // carry neither. Mixed + JSON-encrypted, so no migration is needed.
    // Encrypted as a single JSON ciphertext string exactly like medications
    // (all the text fields inside are PHI). Mixed so the encrypted string and
    // the decrypted array can both live here. Legacy prescriptions simply have
    // [] and keep using the flat diagnosis/treatment/clinicalFinding above.
    toothEntries: {
      type: Schema.Types.Mixed,
      default: [],
    },

    // optional linkage without forcing frontend changes
    patientId: { type: String, default: "" },  // "PT-1001"
    // Visit this prescription belongs to ("APT-0001"). Empty on legacy
    // prescriptions — the owner clinical view falls back to patientId+date.
    appointmentId: { type: String, default: "", index: true },
    dentistName: { type: String, default: "" },
    date: { type: String, default: "" }, // "YYYY-MM-DD"
  },
  { timestamps: true }
);

PrescriptionSchema.plugin(toJSON);
PrescriptionSchema.plugin(softDelete);

export default mongoose.models.Prescription ||
  mongoose.model("Prescription", PrescriptionSchema);