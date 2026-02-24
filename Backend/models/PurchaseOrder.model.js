import mongoose from "mongoose";
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

// ✅ generate PO id if missing
purchaseOrderSchema.pre("validate", async function () {
  if (!this.isNew) return;
  if (this.publicId) return;

  const last = await this.constructor
    .findOne({ publicId: { $regex: /^PO-\d+$/ } })
    .sort({ createdAt: -1 })
    .select("publicId")
    .lean();

  let n = 1001;
  if (last?.publicId) {
    const m = String(last.publicId).match(/^PO-(\d+)$/);
    if (m?.[1]) n = parseInt(m[1], 10) + 1;
  }
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