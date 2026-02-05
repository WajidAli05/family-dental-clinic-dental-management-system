import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";

const { Schema } = mongoose;

const pad = (n, w = 4) => String(n).padStart(w, "0");

const timelineSchema = new Schema(
  {
    at: { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      required: true,
      enum: ["sent", "in_progress", "ready", "delivered", "approved", "rejected", "received"],
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
      enum: ["sent", "in_progress", "ready", "delivered", "approved", "rejected", "received"],
    },

    note: { type: String, default: "" }, // ✅ was notes

    teeth: { type: [String], default: [] }, // ["14","15"]

    timeline: { type: [timelineSchema], default: [] },
  },
  { timestamps: true }
);

/**
 * ✅ Generate publicId automatically for new cases.
 * - No `next()` to avoid "next is not a function"
 * - Collision-safe loop
 */
labCaseSchema.pre("validate", async function () {
  if (!this.isNew || this.publicId) return;

  // Try a few times to avoid duplicate publicId in edge concurrent writes
  for (let attempt = 0; attempt < 5; attempt++) {
    // Find last CASE-#### by highest numeric suffix
    const last = await this.constructor
      .findOne({ publicId: { $regex: /^CASE-\d+$/ } })
      .select("publicId")
      .sort({ createdAt: -1 })
      .lean();

    let n = 1;
    if (last?.publicId) {
      const m = String(last.publicId).match(/^CASE-(\d+)$/);
      if (m?.[1]) n = parseInt(m[1], 10) + 1;
    }

    const candidate = `CASE-${pad(n)}`;

    // If candidate already exists, retry with n+1
    const exists = await this.constructor.exists({ publicId: candidate });
    if (!exists) {
      this.publicId = candidate;
      return;
    }
  }

  // If we keep colliding (extremely unlikely), force a unique fallback
  this.publicId = `CASE-${Date.now()}`;
});

labCaseSchema.plugin(toJSON);
labCaseSchema.index({ lab: 1, status: 1, createdAt: -1 });

export default mongoose.models.LabCase || mongoose.model("LabCase", labCaseSchema);