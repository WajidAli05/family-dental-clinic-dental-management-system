import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";

const { Schema } = mongoose;

const supplierSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true, index: true }, // "SUP-1"
    name: { type: String, required: true, trim: true, index: true },
    phone: { type: String, default: "" },
    email: { type: String, default: "", trim: true, lowercase: true },
    address: { type: String, default: "" },
  },
  { timestamps: true }
);

supplierSchema.plugin(toJSON);

export default mongoose.models.Supplier || mongoose.model("Supplier", supplierSchema);