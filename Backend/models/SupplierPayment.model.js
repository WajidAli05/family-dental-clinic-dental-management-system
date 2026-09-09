import mongoose from "mongoose";
import { getNextSequence } from "../services/shared/counters.js";
import toJSON from "./plugins/toJSON.js";

const { Schema } = mongoose;

/**
 * Append-only supplier-payment ledger — the same shape and role as
 * LabBillPayment (the outstanding balance is always DERIVED by summing these
 * against the supplier's billed purchase orders; nothing here is a running
 * total that could drift out of sync).
 *
 * LabBillPayment identifies each row with `LP-{Date.now()}-{random}` — safe
 * enough for an append-only ledger with a random suffix, but every OTHER new
 * id in this codebase now goes through the atomic counter, so this one does
 * too rather than reintroducing a second id style.
 */
const supplierPaymentSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true, index: true }, // "SPAY-####"
    supplierId: { type: String, required: true, index: true }, // Supplier.publicId
    supplierName: { type: String, default: "" },
    amount: { type: Number, min: 0, required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/, index: true },
    method: { type: String, default: "cash" },
    reference: { type: String, default: "" },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

export async function computeSupplierPaymentIdSeed() {
  const rows = await mongoose.models.SupplierPayment.find({}).select("publicId").lean();
  let max = 0;
  for (const r of rows) {
    const m = /^SPAY-(\d+)$/.exec(String(r.publicId || ""));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max;
}

supplierPaymentSchema.pre("validate", async function () {
  if (!this.isNew || this.publicId) return;
  const n = await getNextSequence("supplierpayment", computeSupplierPaymentIdSeed);
  this.publicId = `SPAY-${String(n).padStart(6, "0")}`;
});

supplierPaymentSchema.plugin(toJSON);

export default mongoose.models.SupplierPayment ||
  mongoose.model("SupplierPayment", supplierPaymentSchema);
