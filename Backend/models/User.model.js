import mongoose from "mongoose";
import bcrypt from "bcrypt";
import toJSON from "./plugins/toJSON.js";

const { Schema } = mongoose;

export const USER_ROLES = Object.freeze({
  owner: "owner",
  dentist: "dentist",
  receptionist: "receptionist",
  lab: "lab",
  assistant: "assistant",
  admin: "admin",
});

const userSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true, index: true }, // e.g. "S-1", "LAB-USER-1"

    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    phone: { type: String, trim: true, index: true },

    role: { type: String, enum: Object.values(USER_ROLES), required: true, index: true },
    enabled: { type: Boolean, default: true, index: true },

    // dentist-only fields (optional)
    specialization: { type: String, trim: true, maxlength: 120 },
    available: { type: Boolean, default: true, index: true },
    commissionPercent: { type: Number, min: 0, max: 100, default: 0 },

    // lab-only field (optional)
    forcePasswordChange: { type: Boolean, default: false },

    // auth
    passwordHash: { type: String, select: false },
  },
  { timestamps: true }
);

userSchema.plugin(toJSON);

userSchema.methods.setPassword = async function (password) {
  this.passwordHash = await bcrypt.hash(password, 12);
};

userSchema.methods.verifyPassword = async function (password) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(password, this.passwordHash);
};

export default mongoose.models.User || mongoose.model("User", userSchema);