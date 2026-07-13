import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";

const { Schema } = mongoose;

const PrescriptionSchema = new Schema(
  {
    _id: { type: String, required: true }, // e.g. "RX-...." from makeId()

    patientType: { type: String, default: null },
    selectedTeeth: { type: [String], default: [] },

    diagnosis: { type: String, default: "" },
    treatment: { type: String, default: "" },
    clinicalFinding: { type: String, default: "" },

    visualStatus: { type: String, enum: ["none", "planned", "progress", "completed", "urgent"], default: "none" },
    notes: { type: String, default: "" },

    medications: {
      type: [
        {
          _id: false,
          medicationId:   { type: String, default: "" },
          name:           { type: String, default: "" },
          form:           { type: String, default: "" },
          strength:       { type: String, default: "" },
          dose:           { type: String, default: "0+0+0" },    // "M+N+E"
          frequencyLabel: { type: String, default: "" },
          durationDays:   { type: Number, default: 0 },
          withFood:       { type: String, enum: ["before", "after", "with", "any"], default: "any" },
          instructions:   { type: String, default: "" },
        },
      ],
      default: [],
    },

    // optional linkage without forcing frontend changes
    patientId: { type: String, default: "" },  // "PT-1001"
    dentistName: { type: String, default: "" },
    date: { type: String, default: "" }, // "YYYY-MM-DD"
  },
  { timestamps: true }
);

PrescriptionSchema.plugin(toJSON);

export default mongoose.models.Prescription ||
  mongoose.model("Prescription", PrescriptionSchema);