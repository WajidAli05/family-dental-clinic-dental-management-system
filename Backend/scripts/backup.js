/**
 * Backend/scripts/backup.js
 * ─────────────────────────────────────────────────────────────────────────────
 * CLI entry point for a one-off backup. All the actual logic (dumping
 * collections, encrypting, retention pruning) lives in backupCore.js's
 * runBackup() — the SAME function the in-app nightly scheduler calls
 * (services/backupScheduler.js). This file only owns the standalone-process
 * concerns: connecting to Mongo and disconnecting when done.
 *
 * USAGE (from the project root):
 *   node Backend/scripts/backup.js
 *
 * See BACKUP.md for required/optional env vars, retention tiers, scheduling,
 * and the optional mongodump alternative.
 */

import "dotenv/config";
import mongoose from "mongoose";
import { runBackup } from "./backupCore.js";

async function main() {
  console.log("[backup] Connecting to MongoDB…");
  await mongoose.connect(process.env.MONGO_URI);
  try {
    await runBackup();
  } finally {
    await mongoose.disconnect();
  }
  console.log("[backup] Done.");
}

main().catch((err) => {
  console.error("[backup] FAILED:", err.message);
  process.exit(1);
});
