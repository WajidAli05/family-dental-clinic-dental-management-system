import mongoose from "mongoose";
import { getNextSequence } from "../services/shared/counters.js";
import toJSON from "./plugins/toJSON.js";

const { Schema } = mongoose;

const pad = (n, w = 4) => String(n).padStart(w, "0");

const purchaseItemSchema = new Schema(
  {
    item: { type: Schema.Types.ObjectId, ref: "InventoryItem", required: true },
    itemPublicId: { type: String, default: "" },
    sku: { type: String, default: "" },
    name: { type: String, default: "" },
    unit: { type: String, default: "" },
    qty: { type: Number, min: 0, required: true },
    unitCost: { type: Number, min: 0, default: 0 },
    lineTotal: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

const purchaseOrderSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true, index: true }, // "PO-1001"
    date: { type: String, required: true, index: true },
    supplier: { type: Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
    invoiceNo: { type: String, default: "" },

    // ✅ Add items (required for modal details)
    items: { type: [purchaseItemSchema], default: [] },

    total: { type: Number, min: 0, default: 0 },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

/**
 * Same fragile pattern as the lab case (createdAt sort, non-atomic, soft-delete
 * blind). Replaced with the shared atomic counter. Floor 1000 keeps the
 * existing PO-1001.. numbering.
 */
export async function computePurchaseOrderIdSeed() {
  const rows = await mongoose.models.PurchaseOrder.find({})
    .setOptions({ includeDeleted: true })
    .select("publicId")
    .lean();
  let max = 1000;
  for (const r of rows) {
    const m = /^PO-(\d+)$/.exec(String(r.publicId || ""));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max;
}

purchaseOrderSchema.pre("validate", async function () {
  if (!this.isNew || this.publicId) return;
  const n = await getNextSequence("purchaseorder", computePurchaseOrderIdSeed);
  this.publicId = `PO-${n}`;
});

// ✅ compute totals
purchaseOrderSchema.pre("save", function () {
  const items = Array.isArray(this.items) ? this.items : [];
  let total = 0;

  for (const it of items) {
    const qty = Number(it.qty || 0);
    const unitCost = Number(it.unitCost || 0);
    const lineTotal = Math.max(0, qty * Math.max(0, unitCost));
    it.lineTotal = lineTotal;
    total += lineTotal;
  }

  this.total = Math.max(0, total);
});

purchaseOrderSchema.plugin(toJSON);

export default mongoose.models.PurchaseOrder ||
  mongoose.model("PurchaseOrder", purchaseOrderSchema);