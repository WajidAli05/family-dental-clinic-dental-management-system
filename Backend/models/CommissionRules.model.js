import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";

const { Schema } = mongoose;

const commissionRulesSchema = new Schema(
  {
    _id: { type: String, default: "COMMISSION-RULES" },
    defaultPercent: { type: Number, min: 0, max: 100, default: 20 },
    byDentist: { type: Map, of: Number, default: {} }, // Map in DB
  },
  { timestamps: true }
);

commissionRulesSchema.plugin(toJSON);

// ✅ Convert Map => plain object for frontend safety
commissionRulesSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret.id || ret._id;
    delete ret._id;
    delete ret.__v;

    if (ret.byDentist && typeof ret.byDentist === "object" && ret.byDentist instanceof Map) {
      ret.byDentist = Object.fromEntries(ret.byDentist.entries());
    }

    // if plugin serialized map as { "$__parent": ... } etc, normalize:
    if (ret.byDentist && typeof ret.byDentist === "object" && !Array.isArray(ret.byDentist)) {
      // already ok
    } else if (!ret.byDentist) {
      ret.byDentist = {};
    }

    return ret;
  },
});

export default mongoose.models.CommissionRules ||
  mongoose.model("CommissionRules", commissionRulesSchema);