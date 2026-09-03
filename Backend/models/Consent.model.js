import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";
import softDelete from "./plugins/softDelete.js";
import { PROCEDURE_TYPES } from "../services/shared/consentTemplates.js";

const { Schema } = mongoose;

/**
 * A signed consent.
 *
 * WHY A MODEL AND NOT JUST A FILE: "has this patient consented to an
 * extraction, and is it still the current wording?" is a question a PDF in a
 * folder cannot answer. The record makes consent queryable and indexable; the
 * generated PDF remains the human/legal artifact and is linked by publicId.
 *
 * PROVING WHAT WAS SIGNED: we store the template `textVersion` plus a SHA-256
 * `textHash` of the exact rendered text the patient was shown, and the PDF
 * itself contains the full wording. Editing a template later can therefore
 * never rewrite what someone already agreed to — the hash simply stops
 * matching the current template, which is the correct signal.
 *
 * The signature image is NOT stored in Mongo. It is drawn into the generated
 * PDF, which lives in the file store like any other document.
 */
const consentSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true, index: true }, // "CNS-0001"

    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
    patientId: { type: String, required: true, index: true }, // "PT-0001", for cheap lookups

    procedureType: { type: String, enum: PROCEDURE_TYPES, required: true, index: true },

    // Proof of exactly what was agreed to.
    textVersion: { type: Number, min: 1, default: 1 },
    textHash: { type: String, default: "" },       // sha256 of the rendered text
    displayLanguage: { type: String, enum: ["en", "ur", "ar"], default: "en" },

    // PHI — the person who signed. Encrypted at rest (v1:iv:tag:ct).
    signedByName: { type: String, default: "" },
    // "patient" or "guardian" — not PHI on its own.
    signedByRole: { type: String, enum: ["patient", "guardian"], default: "patient" },
    signatureMethod: { type: String, enum: ["drawn", "typed"], default: "drawn" },
    signedAt: { type: Date, default: Date.now, index: true },

    // Staff member who witnessed the signing.
    witnessedBy: { type: String, default: "" },      // actor publicId
    witnessedByName: { type: String, default: "" },

    // The generated PDF, stored through the shared file layer.
    fileId: { type: String, default: "", index: true }, // "FILE-0007"

    // Optional clinical context.
    appointmentId: { type: String, default: "" },
    treatmentPlanId: { type: String, default: "" },
    treatmentPlanItemId: { type: String, default: "" },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

consentSchema.plugin(toJSON);
// Signed consents are NEVER hard-deleted — withdrawing one is a soft delete.
consentSchema.plugin(softDelete);

// "which procedures does this patient have consent on file for?"
consentSchema.index({ patientId: 1, procedureType: 1, signedAt: -1 });

export default mongoose.models.Consent || mongoose.model("Consent", consentSchema);
