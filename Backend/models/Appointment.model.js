import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";
import softDelete from "./plugins/softDelete.js";
import {
  ALL_STORED_STATUSES as STORED_STATUSES,
  APPOINTMENT_TYPES as TYPES,
} from "../services/shared/appointmentConfig.js";

const { Schema } = mongoose;

// Status values + the type list live in shared/appointmentConfig.js so the
// model, services and role layers can never drift apart.
// NOTE: ALL_STORED_STATUSES intentionally includes the legacy "scheduled" and
// "checked_in" values so pre-existing documents stay valid without a
// migration — canonicalStatus() maps them to confirmed/arrived on read.
export {
  APPOINTMENT_STATUSES,
  ALL_STORED_STATUSES,
  APPOINTMENT_TYPES,
  canonicalStatus,
} from "../services/shared/appointmentConfig.js";

// Back-compat: the original object-shaped export is still imported elsewhere.
export const APPOINTMENT_STATUS = Object.freeze({
  scheduled: "scheduled",
  checked_in: "checked_in",
  completed: "completed",
  cancelled: "cancelled",
  no_show: "no_show",
  requested: "requested",
  confirmed: "confirmed",
  arrived: "arrived",
  waiting: "waiting",
  in_treatment: "in_treatment",
  rescheduled: "rescheduled",
});

const appointmentSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true, index: true }, // "APT-1001"

    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
    dentist: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // keep store-friendly strings
    date: { type: String, required: true, index: true }, // "YYYY-MM-DD"
    time: { type: String, required: true }, // "10:30 AM"

    // Structured category for the visit. AUGMENTS `reason` (free text) — the
    // two are not redundant: type is filterable/reportable, reason is detail.
    // Optional: existing appointments keep "" and behave as before.
    appointmentType: { type: String, enum: ["", ...TYPES], default: "", index: true },

    reason: { type: String, default: "" },
    notes: { type: String, default: "" },

    status: {
      type: String,
      enum: STORED_STATUSES,
      default: "confirmed",
      index: true,
    },
  },
  { timestamps: true }
);

appointmentSchema.plugin(toJSON);
appointmentSchema.plugin(softDelete);

// fast owner filters
appointmentSchema.index({ date: 1, dentist: 1, status: 1 });
appointmentSchema.index({ date: 1, status: 1 });

export default mongoose.models.Appointment || mongoose.model("Appointment", appointmentSchema);