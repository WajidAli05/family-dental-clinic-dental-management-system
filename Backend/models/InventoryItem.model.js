import mongoose from "mongoose";
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

    usedIn: { type: [String], default: [] }, // ["Cleaning","Extraction"]
  },
  { timestamps: true }
);

inventoryItemSchema.pre("validate", async function () {
  if (!this.isNew) return;
  if (this.publicId) return;

  const last = await this.constructor
    .findOne({ publicId: { $regex: /^IT-\d+$/ } })
    .sort({ createdAt: -1 })
    .select("publicId")
    .lean();

  let n = 1;
  if (last?.publicId) {
    const m = String(last.publicId).match(/^IT-(\d+)$/);
    if (m?.[1]) n = parseInt(m[1], 10) + 1;
  }

  this.publicId = `IT-${pad(n)}`;
});

inventoryItemSchema.plugin(toJSON);

export default mongoose.models.InventoryItem ||
  mongoose.model("InventoryItem", inventoryItemSchema);