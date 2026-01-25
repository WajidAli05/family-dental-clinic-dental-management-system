import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";

const { Schema } = mongoose;

const purchaseOrderSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true, index: true }, // "PO-1001"
    date: { type: String, required: true, index: true },
    supplier: { type: Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
    invoiceNo: { type: String, default: "" },
    total: { type: Number, min: 0, default: 0 },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

purchaseOrderSchema.plugin(toJSON);

export default mongoose.models.PurchaseOrder || mongoose.model("PurchaseOrder", purchaseOrderSchema);