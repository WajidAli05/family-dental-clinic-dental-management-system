import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";

const { Schema } = mongoose;

const ownerPaymentSchema = new Schema(
  {
    _id: { type: String, required: true }, // uid()
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    method: { type: String, enum: ["cash", "card"], required: true, index: true },
    amount: { type: Number, min: 0, required: true },

    dentistId: { type: String, default: "", index: true },
    dentistName: { type: String, default: "" },
  },
  { timestamps: true }
);

ownerPaymentSchema.plugin(toJSON);

export default mongoose.models.OwnerPayment ||
  mongoose.model("OwnerPayment", ownerPaymentSchema);