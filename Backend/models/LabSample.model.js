import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";

const { Schema } = mongoose;

const labSampleSchema = new Schema(
  {
    _id: { type: String, required: true }, // "LS-1001"
    mr: { type: Number, index: true },
    patientName: { type: String, required: true },
    dentist: { type: String, required: true },
    lab: { type: String, required: true },

    teeth: { type: [String], default: [] }, // ["14","15"]
    sentDate: { type: String, required: true },
    receivedDate: { type: String, default: null },

    status: { type: String, default: "Sent", index: true },
    paymentStatus: { type: String, default: "Pending", index: true },
    comments: { type: String, default: "" },
  },
  { timestamps: true }
);

labSampleSchema.plugin(toJSON);

export default mongoose.models.LabSample || mongoose.model("LabSample", labSampleSchema);