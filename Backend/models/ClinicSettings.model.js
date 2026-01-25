import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";

const { Schema } = mongoose;

const paymentModeSchema = new Schema(
  {
    _id: { type: String, required: true }, // "PM-1"
    key: { type: String, required: true, trim: true, lowercase: true }, // cash|card|online
    label: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true },
  },
  { _id: false }
);

const clinicSettingsSchema = new Schema(
  {
    _id: { type: String, default: "CLINIC-SETTINGS" },

    clinic: {
      name: { type: String, required: true, trim: true, maxlength: 150 },
      logoUrl: { type: String, default: "" },
      phone: { type: String, trim: true },
      whatsapp: { type: String, trim: true },
      address: { type: String, trim: true, maxlength: 250 },
      timings: {
        monToSat: { type: String, default: "" },
        sunday: { type: String, default: "" },
      },
    },

    paymentModes: { type: [paymentModeSchema], default: [] },

    labSettings: {
      defaultTurnaroundDays: { type: Number, min: 0, default: 3 },
      allowUrgent: { type: Boolean, default: true },
      urgentFee: { type: Number, min: 0, default: 0 },
      defaultStatus: { type: String, default: "created" },
    },

    commissionSettings: {
      defaultDentistCommissionPercent: { type: Number, min: 0, max: 100, default: 30 },
      allowCustomOverrides: { type: Boolean, default: true },
      rounding: { type: String, enum: ["nearest", "floor", "ceil"], default: "nearest" },
    },
  },
  { timestamps: true }
);

clinicSettingsSchema.plugin(toJSON);

export default mongoose.models.ClinicSettings ||
  mongoose.model("ClinicSettings", clinicSettingsSchema);