import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";

const { Schema } = mongoose;

const inventoryConsumptionSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true, index: true }, // "C-1"
    date: { type: String, required: true, index: true },

    item: { type: Schema.Types.ObjectId, ref: "InventoryItem", required: true, index: true },
    qtyUsed: { type: Number, min: 0, required: true },

    // optional linkage to a treatment / appointment later
    treatmentName: { type: String, default: "" },
  },
  { timestamps: true }
);

inventoryConsumptionSchema.plugin(toJSON);

export default mongoose.models.InventoryConsumption ||
  mongoose.model("InventoryConsumption", inventoryConsumptionSchema);