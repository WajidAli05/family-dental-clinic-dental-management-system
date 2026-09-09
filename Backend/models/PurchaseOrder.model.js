import mongoose from "mongoose";
import { getNextSequence } from "../services/shared/counters.js";
import toJSON from "./plugins/toJSON.js";
import softDelete from "./plugins/softDelete.js";

const { Schema } = mongoose;

const pad = (n, w = 4) => String(n).padStart(w, "0");

/**
 * Lifecycle, in creation order. `cancelled` is reachable from any
 * non-terminal state — see PO_TRANSITIONS in services/shared/purchaseOrders.js,
 * the single place this list is interpreted.
 */
export const PO_STATUSES = Object.freeze([
  "draft", "sent", "confirmed", "partially_received", "received", "closed", "cancelled",
]);

const purchaseItemSchema = new Schema(
  {
    item: { type: Schema.Types.ObjectId, ref: "InventoryItem", required: true },
    itemPublicId: { type: String, default: "" },
    sku: { type: String, default: "" },
    name: { type: String, default: "" },
    unit: { type: String, default: "" },
    // NOTE: kept as `qty` (not renamed to `qtyOrdered`) for backward
    // compatibility with every existing stored document and every existing
    // reader (ownerInventoryListPurchases/GetPurchase). It means "quantity
    // ordered" and is exposed as `qtyOrdered` at the DTO layer in
    // services/shared/purchaseOrders.js — the rename happens at the mapper,
    // not the schema.
    qty: { type: Number, min: 0, required: true },
    unitCost: { type: Number, min: 0, default: 0 },
    lineTotal: { type: Number, min: 0, default: 0 },
    // Additive — absent on every pre-existing line item. A missing value
    // reads as 0 received, EXCEPT for legacy POs, which the DTO mapper
    // treats specially (see mapPurchaseOrderCore): those already had their
    // stock effect applied at creation time under the old ad-hoc flow, so
    // they display as fully received rather than falsely showing a 100%
    // shortfall.
    qtyReceived: { type: Number, min: 0, default: 0 },
    batchNumber: { type: String, default: "" },
    expiryDate: { type: String, default: "" },
  },
  { _id: false }
);

const purchaseOrderSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true, index: true }, // "PO-1001"
    date: { type: String, required: true, index: true }, // orderDate
    expectedDeliveryDate: { type: String, default: "", index: true },
    supplier: { type: Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
    invoiceNo: { type: String, default: "" },
    // Absent on every pre-existing document. The mapper reads a missing
    // status as "received" — see the comment above and
    // services/shared/purchaseOrders.js — because those rows already had
    // their stock effect applied at creation under the old flow; treating
    // them as still-open would let someone "receive" them a second time and
    // double the stock.
    status: { type: String, enum: PO_STATUSES, default: "draft", index: true },

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

// ✅ compute totals — derived, never independently stored (same rule as
// treatment-plan totals): every write recomputes it from the line items.
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
purchaseOrderSchema.plugin(softDelete);

export default mongoose.models.PurchaseOrder ||
  mongoose.model("PurchaseOrder", purchaseOrderSchema);
