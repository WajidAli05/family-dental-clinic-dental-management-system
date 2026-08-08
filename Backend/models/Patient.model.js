import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";
import softDelete from "./plugins/softDelete.js";

const { Schema } = mongoose;

const patientSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true, index: true }, // "PT-1001"

    mr: { type: Number, unique: true, sparse: true, index: true }, // if you want MR numbering too

    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    age: { type: Number, min: 0 }, // kept for backward compat; derived from dateOfBirth when present (see computeAge)
    dateOfBirth: { type: Date, default: null },
    gender: { type: String, default: "Other" }, // keep to match UI strings
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    country: { type: String, default: "" },
    postalCode: { type: String, default: "" },

    nationality: { type: String, default: "", trim: true },
    preferredLanguage: { type: String, default: "" }, // "en" | "ur" | "ar" — UI-enforced, matches app locale codes
    referralSource: { type: String, default: "" },     // "walk-in" | "referral" | "online" | "social" | "other" — UI-enforced

    emergencyContact: {
      name:         { type: String, default: "" },
      relationship: { type: String, default: "" },
      phone:        { type: String, default: "" },
    },

    // insurance.policyNumber is a lawful-identifier-adjacent field — encrypted
    // at rest (fieldEncryption) and select:false, same treatment as
    // User.passwordHash. Write-only: never decrypted/returned to the client,
    // only a derived hasPolicyNumber boolean is (see services/shared/patients.js).
    insurance: {
      provider:     { type: String, default: "" },
      policyNumber: { type: String, default: "", select: false },
    },

    // ── Medical Information (PHI) ──────────────────────────────────────────
    // Free-text fields are AES-256-GCM encrypted via fieldEncryption
    // (PATIENT_MEDICAL_PHI_STRING_FIELDS) — never queried/filtered/sorted on.
    // `allergies` is a structured [{allergen, severity}] array, serialized to
    // JSON then encrypted the same way Prescription.medications is (see
    // encryptMedications/decryptMedications in fieldEncryption.js) — stored
    // as a single ciphertext string, decrypted back to an array on read.
    medicalHistory:     { type: String, default: "" },
    allergies:          { type: String, default: "" },
    currentMedications: { type: String, default: "" },
    existingConditions: { type: String, default: "" },
    previousSurgeries:  { type: String, default: "" },
    pregnancyStatus:    { type: String, default: "" }, // optional; UI-conditional, not schema-enforced
    dentalHistory:      { type: String, default: "" },
    previousTreatments: { type: String, default: "" },

    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },

    registrationDate: { type: String, default: "" }, // "YYYY-MM-DD"
    lastVisit: { type: String, default: "", index: true },

    // normalize dentist as reference (no dentistName duplication)
    primaryDentist: { type: Schema.Types.ObjectId, ref: "User" },

    tags: { type: [String], default: [] },

    // Right-to-erasure (PDPL) marker — set once PII has been irreversibly
    // anonymized. Distinct from deletedAt (soft-delete is recoverable;
    // anonymization is not). See SECURITY.md.
    anonymizedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

patientSchema.plugin(toJSON);
patientSchema.plugin(softDelete);

patientSchema.index({ status: 1, lastVisit: -1 });

export default mongoose.models.Patient || mongoose.model("Patient", patientSchema);