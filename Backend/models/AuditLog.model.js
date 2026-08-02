import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";

const { Schema } = mongoose;

const ACTIONS = [
  "patient.create",      "patient.update",       "patient.delete",
  "appointment.create",  "appointment.update",    "appointment.status_change",
  "appointment.assign",  "appointment.cancel",    "appointment.delete",
  "invoice.create",      "invoice.payment",       "invoice.update",
  "labcase.create",      "labcase.status_change", "labcase.update",  "labcase.delete",
  "prescription.create", "prescription.update",
  "permission.change",
  "config.update",       "settings.update",
  "user.login",          "user.logout",
  "auth.login_failed",   "auth.lockout",          "session.revoke_all",
  "audit.view",
];

const auditLogSchema = new Schema(
  {
    publicId:    { type: String, unique: true, index: true },
    actorId:     { type: String, default: "" },
    actorRole:   { type: String, default: "" },
    actorName:   { type: String, default: "" },
    action:      { type: String, enum: ACTIONS, required: true },
    entityType:  { type: String, default: "" },
    entityId:    { type: String, default: "" },
    entityLabel: { type: String, default: "" },
    before:      { type: Schema.Types.Mixed, default: null },
    after:       { type: Schema.Types.Mixed, default: null },
    ip:          { type: String, default: "" },
    userAgent:   { type: String, default: "" },
    at:          { type: Date, default: Date.now, index: true },
    hashPrev:    { type: String, default: "" },
    hashSelf:    { type: String, default: "" },
  },
  { timestamps: false }
);

auditLogSchema.plugin(toJSON);

// Append-only enforcement.
// No `next` parameter → Mongoose 9 treats these as sync-throw / promise style.
// Inserts (isNew === true) pass through; attempts to re-save an existing doc are rejected.
auditLogSchema.pre("save", function () {
  if (!this.isNew) throw new Error("AuditLog entries are immutable");
});

// Block all query-level mutations in a single call (array notation, Mongoose 6+).
auditLogSchema.pre(
  [
    "updateOne", "updateMany", "findOneAndUpdate",
    "findByIdAndUpdate", "replaceOne",
    "deleteOne", "deleteMany", "findOneAndDelete", "findByIdAndDelete",
  ],
  function () {
    throw new Error("AuditLog is append-only: updates and deletes are not permitted");
  }
);

export default mongoose.model("AuditLog", auditLogSchema);
