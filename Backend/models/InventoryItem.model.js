import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";

const { Schema } = mongoose;

const inventoryItemSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true, index: true }, // "IT-1"
    sku: { type: String, default: "", trim: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    category: { type: String, default: "" }, // consumables/materials/equipment
    unit: { type: String, default: "" },

    qty: { type: Number, min: 0, default: 0 }, // single stock source of truth
    reorderLevel: { type: Number, min: 0, default: 0 },
    unitCost: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true }
);

inventoryItemSchema.plugin(toJSON);

export default mongoose.models.InventoryItem || mongoose.model("InventoryItem", inventoryItemSchema);