import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";

const { Schema } = mongoose;

const labBillSchema = new Schema(
  {
    _id: { type: String, required: true }, // uid()
    month: { type: String, required: true, index: true }, // "YYYY-MM"
    labId: { type: String, required: true, index: true },
    labName: { type: String, required: true },
    amount: { type: Number, min: 0, required: true },
    paid: { type: Boolean, default: false },
  },
  { timestamps: true }
);

labBillSchema.plugin(toJSON);

export default mongoose.models.LabBill || mongoose.model("LabBill", labBillSchema);