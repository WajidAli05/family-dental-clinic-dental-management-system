import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";

const { Schema } = mongoose;

// Append-only lab-payment ledger.
// `paid` on LabBill is a derived convenience flag; truth is the sum of these records.
const labBillPaymentSchema = new Schema(
  {
    _id:    { type: String, required: true }, // LP-{timestamp}-{rand}
    labId:  { type: String, required: true, index: true },
    labName:{ type: String, default: "" },
    amount: { type: Number, min: 0, required: true },
    date:   { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/, index: true },
    method: { type: String, default: "cash" },
    note:   { type: String, default: "" },
    labBillId: { type: String, default: "" }, // optional reference to specific LabBill
  },
  { timestamps: true }
);

labBillPaymentSchema.plugin(toJSON);

export default mongoose.models.LabBillPayment ||
  mongoose.model("LabBillPayment", labBillPaymentSchema);
