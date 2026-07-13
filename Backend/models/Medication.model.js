import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";

const { Schema } = mongoose;

const medicationSchema = new Schema(
  {
    publicId:    { type: String, required: true, unique: true, index: true }, // "MED-<n>"
    name:        { type: String, required: true, trim: true },
    nameLower:   { type: String, index: true },  // lowercase, maintained pre-save for dedup
    genericName: { type: String, default: "" },
    form: {
      type: String,
      enum: ["tablet", "capsule", "syrup", "suspension", "injection", "drops", "gel", "mouthwash", "other"],
      default: "tablet",
    },
    strength: { type: String, default: "" },     // e.g. "500mg"
    active:   { type: Boolean, default: true, index: true },
    addedBy: {
      role:   { type: String, default: "" },
      userId: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

medicationSchema.pre("save", function () {
  this.nameLower = String(this.name || "").toLowerCase().trim();
});

medicationSchema.plugin(toJSON);

export default mongoose.models.Medication ||
  mongoose.model("Medication", medicationSchema);
