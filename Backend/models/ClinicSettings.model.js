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

    billing: {
      defaultConsultationFee: { type: Number, min: 0, default: 0 },
    },

    locale: {
      country:        { type: String, enum: ["PK", "SA"], default: "PK" },
      locale:         { type: String, enum: ["en", "ur", "ar"], default: "en" },
      currency:       { type: String, default: "PKR" },
      currencySymbol: { type: String, default: "₨" },
      taxEnabled:     { type: Boolean, default: false },
      taxRate:        { type: Number, default: 0, min: 0, max: 100 },
      taxLabel:       { type: String, default: "Tax" },
      timezone:       { type: String, default: "Asia/Karachi" },
      dateFormat:     { type: String, default: "DD/MM/YYYY" },
      weekStart:      { type: Number, default: 0, min: 0, max: 1 },
      exchangeRate:   { type: Number, default: 1, min: 0 },
    },
  },
  { timestamps: true }
);

clinicSettingsSchema.plugin(toJSON);

export default mongoose.models.ClinicSettings ||
  mongoose.model("ClinicSettings", clinicSettingsSchema);