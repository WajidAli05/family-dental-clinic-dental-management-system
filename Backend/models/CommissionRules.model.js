import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";

const { Schema } = mongoose;

const commissionRulesSchema = new Schema(
  {
    _id: { type: String, default: "COMMISSION-RULES" },
    defaultPercent: { type: Number, min: 0, max: 100, default: 20 },
    byDentist: { type: Map, of: Number, default: {} }, // { "1": 20, "2": 18 }
  },
  { timestamps: true }
);

commissionRulesSchema.plugin(toJSON);

export default mongoose.models.CommissionRules ||
  mongoose.model("CommissionRules", commissionRulesSchema);