import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";

const { Schema } = mongoose;

const timelineSchema = new Schema(
  {
    at: { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      required: true,
      enum: ["sent", "in-process", "ready", "delivered", "approved", "rejected", "received"],
    },
    note: { type: String, default: "" },
  },
  { _id: false }
);

const labCaseSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true, index: true }, // CASE-2001

    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
    dentist: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    lab: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true }, // role=lab
    sampleType: { type: Schema.Types.ObjectId, ref: "SampleType", required: true, index: true },

    // ✅ match frontend naming
    status: {
      type: String,
      default: "sent",
      index: true,
      enum: ["sent", "in-process", "ready", "delivered", "approved", "rejected", "received"],
    },

    note: { type: String, default: "" }, // ✅ was notes

    teeth: { type: [String], default: [] }, // ["14","15"]

    timeline: { type: [timelineSchema], default: [] },
  },
  { timestamps: true }
);

labCaseSchema.plugin(toJSON);
labCaseSchema.index({ lab: 1, status: 1, createdAt: -1 });

export default mongoose.models.LabCase || mongoose.model("LabCase", labCaseSchema);