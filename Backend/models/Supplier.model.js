import mongoose from "mongoose";
import { getNextSequence } from "../services/shared/counters.js";
import toJSON from "./plugins/toJSON.js";
import softDelete from "./plugins/softDelete.js";

const { Schema } = mongoose;

const supplierSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true, index: true }, // "SUP-####"
    name: { type: String, required: true, trim: true, index: true },
    contactPerson: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "", trim: true, lowercase: true },
    address: { type: String, default: "" },
    paymentTerms: { type: String, default: "" }, // free text, e.g. "net30"
    notes: { type: String, default: "" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/**
 * Suppliers had NO create path at all before this — the model existed with a
 * `required` publicId that nothing ever populated. Atomic from day one, so
 * this never has the chance to develop the lab-case/inventory class of bug
 * (createdAt-sort, non-atomic, soft-delete-blind id generation).
 */
export async function computeSupplierIdSeed() {
  const rows = await mongoose.models.Supplier.find({})
    .setOptions({ includeDeleted: true })
    .select("publicId")
    .lean();
  let max = 0;
  for (const r of rows) {
    const m = /^SUP-(\d+)$/.exec(String(r.publicId || ""));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max;
}

supplierSchema.pre("validate", async function () {
  if (!this.isNew || this.publicId) return;
  const n = await getNextSequence("supplier", computeSupplierIdSeed);
  this.publicId = `SUP-${String(n).padStart(4, "0")}`;
});

supplierSchema.plugin(toJSON);
// Suppliers carry financial history (POs, payments) — never hard-delete.
supplierSchema.plugin(softDelete);

export default mongoose.models.Supplier || mongoose.model("Supplier", supplierSchema);
