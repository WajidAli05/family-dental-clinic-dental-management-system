// Backend/models/Permissions.model.js
import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";

const { Schema } = mongoose;

// permissions: {
//   manage_patients: { receptionist: true, dentist: false },
//   view_billing: { receptionist: true, dentist: true },
//   ...
// }
const permissionsSchema = new Schema(
  {
    _id: { type: String, default: "PERMISSIONS" },
    permissions: { type: Map, of: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

permissionsSchema.plugin(toJSON);

export default mongoose.models.Permissions ||
  mongoose.model("Permissions", permissionsSchema);