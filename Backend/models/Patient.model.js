import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";

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
  },
  { timestamps: true }
);

patientSchema.plugin(toJSON);

patientSchema.index({ status: 1, lastVisit: -1 });

export default mongoose.models.Patient || mongoose.model("Patient", patientSchema);