/**
 * Audit write path self-test.
 * Run: node Backend/scripts/testAudit.js
 *
 * Connects to MONGO_URI from .env, writes one test audit entry,
 * reads it back, and disconnects. Reports pass/fail to stdout.
 * Does NOT affect application data — only writes to auditlogs collection.
 */

import { config } from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
config({ path: path.resolve(__dirname, "../.env") });

import mongoose from "mongoose";

// Register ALL models so Mongoose knows about them before any query
import "../models/index.js";

import { recordAudit } from "../services/shared/audit.js";
import AuditLog from "../models/AuditLog.model.js";

const LABEL = `__audit-self-test-${Date.now()}`;

const fakeReq = {
  user:    { _id: "000000000000000000000001", role: "system", name: "self-test" },
  headers: { "user-agent": "audit-self-test/1.0" },
  ip:      "127.0.0.1",
  socket:  { remoteAddress: "127.0.0.1" },
};

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("  DB connected:", mongoose.connection.name);
  } catch (err) {
    console.error("  FAILED — cannot connect to MongoDB:", err.message);
    process.exit(1);
  }

  // --- Write ---
  const countBefore = await AuditLog.countDocuments();
  console.log("  AuditLog count before:", countBefore);

  await recordAudit({
    req:         fakeReq,
    action:      "settings.update",
    entityType:  "AuditLog",
    entityLabel: LABEL,
    after:       { selfTest: true, ts: new Date().toISOString() },
  });

  // --- Read back ---
  const doc = await AuditLog.findOne({ entityLabel: LABEL }).lean();

  if (doc) {
    console.log("  PASS — audit entry written:");
    console.log("    publicId :", doc.publicId);
    console.log("    action   :", doc.action);
    console.log("    actorName:", doc.actorName);
    console.log("    hashSelf :", doc.hashSelf?.slice(0, 20) + "...");
    console.log("    at       :", doc.at);
  } else {
    console.error("  FAIL — document was NOT found after write.");
    console.error("  Check server console for [audit] FAILED lines.");
    process.exit(1);
  }

  await mongoose.disconnect();
  console.log("  Done.");
}

run().catch((err) => {
  console.error("  Unexpected error:", err.stack || err.message);
  process.exit(1);
});
