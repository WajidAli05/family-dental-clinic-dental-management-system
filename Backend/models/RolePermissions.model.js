import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";

const { Schema } = mongoose;

/**
 * permissions: {
 *   receptionist: { manage_patients: true, manage_appointments: true, ... },
 *   dentist: { view_billing: true, edit_prescriptions: true, ... }
 * }
 */
const rolePermissionsSchema = new Schema(
  {
    _id: { type: String, default: "ROLE-PERMISSIONS" },
    permissions: {
      type: Object,
      default: {
        receptionist: {},
        dentist: {},
      },
    },
  },
  { timestamps: true }
);

rolePermissionsSchema.plugin(toJSON);

export default mongoose.models.RolePermissions ||
  mongoose.model("RolePermissions", rolePermissionsSchema);