import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";
import softDelete from "./plugins/softDelete.js";

const { Schema } = mongoose;

/** What a file can hang off. Additive — Prompt 8/10 use labcase/document. */
export const FILE_OWNER_TYPES = Object.freeze(["patient", "labcase", "document"]);

export const FILE_CATEGORIES = Object.freeze([
  "xray",
  "photo",
  "document",
  "consent",
  "lab_attachment",
  "other",
]);

const fileAssetSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true, index: true }, // "FILE-0001"

    // Generic ownership — the storage layer knows nothing about patients.
    ownerType: { type: String, enum: FILE_OWNER_TYPES, required: true, index: true },
    ownerId: { type: String, required: true, index: true }, // publicId, e.g. "PT-0001"
    category: { type: String, enum: FILE_CATEGORIES, default: "other", index: true },

    filename: { type: String, required: true },     // sanitized, stored on disk
    originalName: { type: String, default: "" },    // as the user named it (display only)
    mimeType: { type: String, default: "" },        // sniffed from CONTENT, not the extension
    sizeBytes: { type: Number, min: 0, default: 0 },

    // RELATIVE path under UPLOAD_DIR. Absolute paths never reach a client.
    storageKey: { type: String, required: true },
    // Small client-generated preview; absent for PDFs and non-images.
    thumbKey: { type: String, default: "" },

    uploadedBy: { type: String, default: "" },   // actor publicId
    uploadedByName: { type: String, default: "" },

    // Optional clinical context.
    appointmentId: { type: String, default: "", index: true }, // "APT-0001"
    toothNumber: { type: String, default: "" },                // FDI, "11".."48"
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

fileAssetSchema.plugin(toJSON);
fileAssetSchema.plugin(softDelete);

// The gallery query: this owner's files, newest first.
fileAssetSchema.index({ ownerType: 1, ownerId: 1, createdAt: -1 });
// "does this tooth have an x-ray on file?"
fileAssetSchema.index({ ownerType: 1, ownerId: 1, category: 1, toothNumber: 1 });

export default mongoose.models.FileAsset || mongoose.model("FileAsset", fileAssetSchema);
