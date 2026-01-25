import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";

const { Schema } = mongoose;

const docFieldSchema = new Schema(
  {
    id: { type: String, required: true }, // "F-1"
    label: { type: String, required: true },
    type: { type: String, default: "text" },
    required: { type: Boolean, default: false },
    options: { type: [String], default: [] },
  },
  { _id: false }
);

const docSectionSchema = new Schema(
  {
    id: { type: String, required: true }, // "SEC-1"
    title: { type: String, required: true },
    fields: { type: [docFieldSchema], default: [] },
  },
  { _id: false }
);

const docTemplateSchema = new Schema(
  {
    id: { type: String, required: true }, // "DOC-1"
    name: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    sections: { type: [docSectionSchema], default: [] },
  },
  { _id: false }
);

const clinicalMasterSchema = new Schema(
  {
    _id: { type: String, default: "CLINICAL-MASTER" },

    treatments: {
      type: [
        new Schema(
          {
            id: { type: String, required: true }, // "TRM-1"
            name: { type: String, required: true },
            code: { type: String, default: "" },
            fee: { type: Number, min: 0, default: 0 },
            active: { type: Boolean, default: true },
            notes: { type: String, default: "" },
          },
          { _id: false }
        ),
      ],
      default: [],
    },

    diagnosisTemplates: {
      type: [
        new Schema(
          {
            id: { type: String, required: true }, // "DX-1"
            title: { type: String, required: true },
            description: { type: String, default: "" },
            active: { type: Boolean, default: true },
          },
          { _id: false }
        ),
      ],
      default: [],
    },

    clinicalFindingTemplates: {
      type: [
        new Schema(
          {
            id: { type: String, required: true }, // "CF-1"
            title: { type: String, required: true },
            description: { type: String, default: "" },
            active: { type: Boolean, default: true },
          },
          { _id: false }
        ),
      ],
      default: [],
    },

    documentationTemplates: { type: [docTemplateSchema], default: [] },
  },
  { timestamps: true }
);

clinicalMasterSchema.plugin(toJSON);

export default mongoose.models.ClinicalMaster ||
  mongoose.model("ClinicalMaster", clinicalMasterSchema);