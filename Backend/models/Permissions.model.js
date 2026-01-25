import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";

const { Schema } = mongoose;

// permissions: { manage_patients: ["S-3"], view_billing:["S-1","S-2"], ... }
const permissionsSchema = new Schema(
  {
    _id: { type: String, default: "PERMISSIONS" },
    permissions: { type: Map, of: [String], default: {} },
  },
  { timestamps: true }
);

permissionsSchema.plugin(toJSON);

export default mongoose.models.Permissions ||
  mongoose.model("Permissions", permissionsSchema);