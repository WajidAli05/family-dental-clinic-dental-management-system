import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";

const { Schema } = mongoose;

const sampleTypeSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true, index: true }, // "ST-1"
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: "" },
    active: { type: Boolean, default: true, index: true },

    // ✅ NEW
    price: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true }
);

sampleTypeSchema.plugin(toJSON);

export default mongoose.models.SampleType || mongoose.model("SampleType", sampleTypeSchema);