import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";

const { Schema } = mongoose;

const clinicSettingsSchema = new Schema(
  {
    _id: { type: String, default: "CLINIC-SETTINGS" },

    clinic: {
      name: { type: String, required: true, trim: true, maxlength: 150 },
      logoUrl: { type: String, default: "" },
      phone: { type: String, default: "", trim: true },
      whatsapp: { type: String, default: "", trim: true },
      address: { type: String, default: "", trim: true, maxlength: 250 },
    },
  },
  { timestamps: true }
);

clinicSettingsSchema.plugin(toJSON);

export default mongoose.models.ClinicSettings ||
  mongoose.model("ClinicSettings", clinicSettingsSchema);