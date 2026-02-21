import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";

const { Schema } = mongoose;

const ownerPaymentSchema = new Schema(
  {
    _id: { type: String, required: true }, // uid()
    date: {
      type: String,
      required: true,
      index: true,
      match: /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    },
    method: { type: String, enum: ["cash", "card"], required: true, index: true },
    amount: { type: Number, min: 0, required: true },

    dentistId: { type: String, default: "", index: true },
    dentistName: { type: String, default: "" },
  },
  { timestamps: true }
);

ownerPaymentSchema.plugin(toJSON);

// ensure id is present even if plugin changes later
ownerPaymentSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret.id || ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.models.OwnerPayment ||
  mongoose.model("OwnerPayment", ownerPaymentSchema);