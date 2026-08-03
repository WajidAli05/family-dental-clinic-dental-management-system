/**
 * Backend/scripts/unlockUser.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Emergency recovery: clear the brute-force lockout for a user who has been
 * locked out and cannot wait for the 15-minute auto-expiry.
 *
 * USAGE (from the project root):
 *   node Backend/scripts/unlockUser.js <email>
 *
 * EXAMPLE:
 *   node Backend/scripts/unlockUser.js owner@clinic.com
 *
 * What this script does:
 *   1. Connects to the database (reads MONGO_URI from Backend/.env)
 *   2. Finds the user by email
 *   3. Clears failedLoginAttempts → 0 and lockedUntil → null
 *   4. Prints confirmation and disconnects
 *
 * SECURITY: run this only when you have physically verified the person's identity.
 * This script does not write an audit entry because it runs outside the HTTP
 * request context. Note the unlock in a manual log or support ticket.
 */

import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.model.js";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node Backend/scripts/unlockUser.js <email>");
  process.exit(1);
}

const mongoUri = process.env.MONGO_URI || process.env.DATABASE_URL;
if (!mongoUri) {
  console.error("ERROR: MONGO_URI (or DATABASE_URL) not set in environment.");
  process.exit(1);
}

(async () => {
  console.log(`[unlockUser] Connecting to MongoDB…`);
  await mongoose.connect(mongoUri);

  const user = await User.findOne({ email: email.toLowerCase().trim() });

  if (!user) {
    console.error(`[unlockUser] No user found with email: ${email}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const wasLocked   = user.lockedUntil && user.lockedUntil > new Date();
  const failCount   = user.failedLoginAttempts ?? 0;

  console.log(`[unlockUser] Found user: ${user.name} (${user.role})`);
  console.log(`[unlockUser] Status: locked=${wasLocked ? "YES" : "NO"}, failedAttempts=${failCount}`);

  if (!wasLocked && failCount === 0) {
    console.log("[unlockUser] Account is not locked. No changes made.");
    await mongoose.disconnect();
    process.exit(0);
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil         = null;
  await user.save();

  console.log(`[unlockUser] ✓ Account unlocked for ${user.name} (${email}).`);
  console.log(`[unlockUser] The user can now log in normally.`);

  await mongoose.disconnect();
})().catch((err) => {
  console.error("[unlockUser] Fatal error:", err.message);
  process.exit(1);
});
