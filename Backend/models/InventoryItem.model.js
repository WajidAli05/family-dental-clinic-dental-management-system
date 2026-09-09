import mongoose from "mongoose";
import { getNextSequence } from "../services/shared/counters.js";
import toJSON from "./plugins/toJSON.js";

const { Schema } = mongoose;

const pad = (n, w = 4) => String(n).padStart(w, "0");

const inventoryItemSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true, index: true }, // IT-0001
    sku: { type: String, default: "", trim: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    category: { type: String, default: "" },
    unit: { type: String, default: "" }, // boxes, pairs, vials, etc

    qty: { type: Number, min: 0, default: 0 }, // stock source of truth
    reorderLevel: { type: Number, min: 0, default: 0 },
    unitCost: { type: Number, min: 0, default: 0 },

    supplier: { type: String, default: "" },
    location: { type: String, default: "" },
    expiryDate: { type: String, default: "" }, // "YYYY-MM-DD"

    batchNumber: { type: String, default: "", trim: true }, // lot tracking / recalls
    maximumStock: { type: Number, min: 0, default: 0 }, // upper threshold (reorderLevel is the minimum)

    usedIn: { type: [String], default: [] }, // ["Cleaning","Extraction"]
  },
  { timestamps: true }
);

/**
 * Same fragile pattern the lab case had: sorted by `createdAt` rather than by
 * numeric suffix, non-atomic, and blind to soft-deleted rows. Replaced with
 * the shared atomic counter.
 */
export async function computeInventoryItemIdSeed() {
  const rows = await mongoose.models.InventoryItem.find({})
    .setOptions({ includeDeleted: true })
    .select("publicId")
    .lean();
  let max = 0;
  for (const r of rows) {
    const m = /^IT-(\d+)$/.exec(String(r.publicId || ""));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max;
}

inventoryItemSchema.pre("validate", async function () {
  if (!this.isNew || this.publicId) return;
  const n = await getNextSequence("inventoryitem", computeInventoryItemIdSeed);
  this.publicId = `IT-${pad(n)}`;
});

inventoryItemSchema.plugin(toJSON);

export default mongoose.models.InventoryItem ||
  mongoose.model("InventoryItem", inventoryItemSchema);