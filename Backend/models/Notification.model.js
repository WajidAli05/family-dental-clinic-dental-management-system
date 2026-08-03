import mongoose from "mongoose";

const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type:        { type: String, required: true },   // e.g. "lockout_alert"
    title:       { type: String, required: true },
    message:     { type: String, required: true },
    read:        { type: Boolean, default: false, index: true },
    meta:        { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

// Compound index for efficient recipient + unread queries
notificationSchema.index({ recipientId: 1, createdAt: -1 });

export default mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
