import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";

const { Schema } = mongoose;

export const APPOINTMENT_STATUS = Object.freeze({
  scheduled: "scheduled",
  checked_in: "checked_in",
  completed: "completed",
  cancelled: "cancelled",
  no_show: "no_show",
});

const appointmentSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true, index: true }, // "APT-1001"

    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
    dentist: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // keep store-friendly strings
    date: { type: String, required: true, index: true }, // "YYYY-MM-DD"
    time: { type: String, required: true }, // "10:30 AM"

    reason: { type: String, default: "" },
    notes: { type: String, default: "" },

    status: {
      type: String,
      enum: Object.values(APPOINTMENT_STATUS),
      default: APPOINTMENT_STATUS.scheduled,
      index: true,
    },
  },
  { timestamps: true }
);

appointmentSchema.plugin(toJSON);

// fast owner filters
appointmentSchema.index({ date: 1, dentist: 1, status: 1 });
appointmentSchema.index({ date: 1, status: 1 });

export default mongoose.models.Appointment || mongoose.model("Appointment", appointmentSchema);