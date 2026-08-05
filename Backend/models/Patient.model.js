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
    age: { type: Number, min: 0 },
    gender: { type: String, default: "Other" }, // keep to match UI strings
    address: { type: String, default: "" },
    city: { type: String, default: "" },

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