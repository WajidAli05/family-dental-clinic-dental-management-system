import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";
import softDelete from "./plugins/softDelete.js";

const { Schema } = mongoose;

const paymentSchema = new Schema(
  {
    publicId: { type: String, required: true }, // "PAY-1"
    amount: { type: Number, min: 0, required: true },
    mode: { type: String, required: true }, // Cash/Card/Online Transfer
    date: { type: String, required: true }, // "YYYY-MM-DD"
  },
  { _id: false }
);

const itemSchema = new Schema(
  {
    kind: {
      type: String,
      enum: ["consultation", "treatment", "lab_sample"],
      required: true,
    },
    refId: { type: String, default: "" }, // treatment id / sampleType publicId, "" for consultation
    name: { type: String, required: true }, // price-snapshot name
    unitPrice: { type: Number, min: 0, required: true },
    qty: { type: Number, min: 1, default: 1 },
    lineTotal: { type: Number, min: 0, required: true },
  },
  { _id: false }
);

const invoiceSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true, index: true }, // "INV-1001"

    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
    dentist: { type: Schema.Types.ObjectId, ref: "User", index: true }, // optional but useful

    date: { type: String, required: true, index: true },
    totalAmount: { type: Number, min: 0, required: true },

    items: { type: [itemSchema], default: [] }, // optional; when present, totalAmount MUST be server-computed

    payments: { type: [paymentSchema], default: [] },
  },
  { timestamps: true }
);

invoiceSchema.plugin(toJSON);
invoiceSchema.plugin(softDelete);

invoiceSchema.virtual("paidAmount").get(function () {
  return (this.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
});

invoiceSchema.virtual("status").get(function () {
  const paid = this.paidAmount;
  if (paid >= this.totalAmount) return "Paid";
  if (paid > 0) return "Partial";
  return "Pending";
});

invoiceSchema.virtual("outstanding").get(function () {
  return Math.max(0, Number(this.totalAmount || 0) - this.paidAmount);
});

export default mongoose.models.Invoice || mongoose.model("Invoice", invoiceSchema);