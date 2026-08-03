/**
 * Backend/scripts/disable2fa.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Emergency recovery: disable 2FA for a user who has lost their authenticator
 * and has no backup codes remaining.
 *
 * USAGE (from the project root):
 *   node Backend/scripts/disable2fa.js <email>
 *
 * EXAMPLE:
 *   node Backend/scripts/disable2fa.js dr.ali@clinic.com
 *
 * This script:
 *   1. Connects to the database (reads MONGO_URI from Backend/.env)
 *   2. Finds the user by email
 *   3. Clears all 2FA fields (twoFactorEnabled → false, secret, backup codes, OTP)
 *   4. Prints a confirmation and disconnects
 *
 * SECURITY: run this only when you have physically verified the identity of the
 * person who lost access. Log that you ran it (the script itself does not write
 * an audit entry because it runs outside the HTTP request context).
 */

import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.model.js";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node Backend/scripts/disable2fa.js <email>");
  process.exit(1);
}

const mongoUri = process.env.MONGO_URI || process.env.DATABASE_URL;
if (!mongoUri) {
  console.error("ERROR: MONGO_URI (or DATABASE_URL) not set in environment.");
  process.exit(1);
}

(async () => {
  console.log(`[disable2fa] Connecting to MongoDB…`);
  await mongoose.connect(mongoUri);

  const user = await User.findOne({ email: email.toLowerCase().trim() })
    .select("+twoFactorSecret +backupCodes +otpHash +otpExpiry");

  if (!user) {
    console.error(`[disable2fa] No user found with email: ${email}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`[disable2fa] Found user: ${user.name} (${user.role}) — 2FA currently ${user.twoFactorEnabled ? "ENABLED" : "DISABLED"}`);

  if (!user.twoFactorEnabled) {
    console.log("[disable2fa] 2FA is already disabled for this user. No changes made.");
    await mongoose.disconnect();
    process.exit(0);
  }

  user.twoFactorEnabled    = false;
  user.twoFactorMethod     = null;
  user.twoFactorSecret     = null;
  user.backupCodes         = [];
  user.otpHash             = null;
  user.otpExpiry           = null;
  user.twoFactorVerifiedAt = null;
  user.markModified("backupCodes");
  await user.save();

  console.log(`[disable2fa] ✓ 2FA disabled for ${user.name} (${email}).`);
  console.log(`[disable2fa] The user can now log in with email + password only.`);
  console.log(`[disable2fa] Remind them to re-enable 2FA once they have a new device.`);

  await mongoose.disconnect();
})().catch((err) => {
  console.error("[disable2fa] Fatal error:", err.message);
  process.exit(1);
});
