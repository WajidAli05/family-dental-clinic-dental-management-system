/**
 * One-shot backfill: for every permission key that is MISSING or has an EMPTY
 * roles array AND DEFAULT_ROLE_GRANTS specifies a non-empty default, write the
 * default into the DB.  Keys that already have roles set by the owner are left
 * untouched.
 *
 * Run from the Backend/ directory:
 *   node scripts/backfillPermissions.js
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

// Load Backend/.env (script lives one level below Backend/)
const __dir = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dir, "../.env") });

import {
  OWNER_PERMISSION_KEYS,
  DEFAULT_ROLE_GRANTS,
} from "../services/shared/permissionsConfig.js";

const PERMISSIONS_DOC_ID = "PERMISSIONS";

// Inline minimal schema so we don't need to register every model.
const permSchema = new mongoose.Schema(
  {
    _id: { type: String, default: "PERMISSIONS" },
    permissions: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const Permissions =
  mongoose.models.Permissions || mongoose.model("Permissions", permSchema);

const toPlain = (m) => {
  if (!m) return {};
  if (typeof m.entries === "function") return Object.fromEntries(m.entries());
  return m;
};

async function run() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI not set — check that .env is present in Backend/");
    process.exit(1);
  }

  console.log("Connecting to MongoDB…");
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected to: ${mongoose.connection.host}/${mongoose.connection.name}\n`);

  const doc = await Permissions.findById(PERMISSIONS_DOC_ID);
  if (!doc) {
    console.log("No PERMISSIONS document found. Run the server once to create it, then re-run this script.");
    await mongoose.disconnect();
    return;
  }

  const current = toPlain(doc.permissions);

  console.log("── Current state of all permission keys ──");
  for (const k of OWNER_PERMISSION_KEYS) {
    const v = current[k];
    const label =
      !(k in current) ? "(missing)" :
      Array.isArray(v) && v.length === 0 ? "[] (empty)" :
      JSON.stringify(v);
    console.log(`  ${k}: ${label}`);
  }
  console.log("");

  const changes = [];

  for (const k of OWNER_PERMISSION_KEYS) {
    const existing = current[k];
    const isAbsent = !(k in current);
    const isEmpty = Array.isArray(existing) && existing.length === 0;
    const grant = DEFAULT_ROLE_GRANTS[k];

    if ((isAbsent || isEmpty) && Array.isArray(grant) && grant.length > 0) {
      changes.push({
        key: k,
        before: isAbsent ? "(missing)" : "[]",
        after: JSON.stringify(grant),
      });
      current[k] = grant;
    }
  }

  if (changes.length === 0) {
    console.log("Nothing to backfill — all keys already have role assignments.");
  } else {
    console.log(`Applying ${changes.length} change(s):\n`);
    for (const c of changes) {
      console.log(`  ${c.key}`);
      console.log(`    before: ${c.before}`);
      console.log(`    after:  ${c.after}`);
    }

    doc.permissions = new Map(Object.entries(current));
    await doc.save();
    console.log("\nSaved successfully.\n");
  }

  // Verification: read back from DB
  const verify = await Permissions.findById(PERMISSIONS_DOC_ID).lean();
  const finalMap = toPlain(verify?.permissions);

  console.log("── Verified DB values (read-back after save) ──");
  for (const k of ["tab_dentist_patients", "tab_dentist_appointments", "tab_dentist_dashboard"]) {
    const v = finalMap[k];
    console.log(`  ${k}: ${JSON.stringify(v ?? "(missing)")}`);
  }

  await mongoose.disconnect();
  console.log("\nDone.");
}

run().catch((e) => {
  console.error("Backfill failed:", e.message);
  process.exit(1);
});
