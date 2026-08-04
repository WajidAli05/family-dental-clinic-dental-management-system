/**
 * Backend/scripts/restore.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Restores a database backup produced by Backend/scripts/backup.js.
 *
 * SAFE BY DEFAULT: without --apply, this is a DRY RUN. It decrypts the
 * archive, validates its structure, prints a per-collection summary, and
 * verifies the Prescription-field encryption key — but writes NOTHING to
 * the database. Nothing is destructive until you pass --apply, and even
 * then you must type a confirmation phrase (or pass --force to skip it,
 * e.g. for scripted DR drills).
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  CRITICAL — FIELD_ENCRYPTION_KEY DEPENDENCY
 *  Prescription PHI (diagnosis, treatment, clinicalFinding, notes,
 *  medications) is stored encrypted with FIELD_ENCRYPTION_KEY. A restored
 *  backup is only READABLE if you restore it into an environment whose
 *  FIELD_ENCRYPTION_KEY is IDENTICAL to the key that was active when the
 *  backup was taken. The documents themselves will restore fine either way
 *  — but with the wrong key, every prescription's PHI becomes permanently
 *  unreadable garbage. There is no recovery from this. Store
 *  FIELD_ENCRYPTION_KEY in your secrets vault ALONGSIDE every backup archive,
 *  not just once in one place.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * USAGE (from the project root):
 *   Dry run (validates only, no DB writes):
 *     node Backend/scripts/restore.js <path-to-archive.enc>
 *
 *   Apply (destructive — replaces data in the target database):
 *     node Backend/scripts/restore.js <path-to-archive.enc> --apply
 *
 *   Skip the interactive confirmation prompt (e.g. scripted DR drills):
 *     node Backend/scripts/restore.js <path-to-archive.enc> --apply --force
 *
 *   Restore into a DIFFERENT database name than the one in MONGO_URI
 *   (recommended for testing a restore without touching the live DB):
 *     node Backend/scripts/restore.js <path-to-archive.enc> --apply --db fdc_restore_test
 *
 * REQUIRED ENV (Backend/.env):
 *   MONGO_URI               — target cluster to restore into
 *   BACKUP_ENCRYPTION_KEY    — must match the key used to create the archive
 *   FIELD_ENCRYPTION_KEY     — for the PHI-readability check (see warning above)
 */

import "dotenv/config";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import crypto from "crypto";
import readline from "readline";
import { decryptField } from "../utils/fieldEncryption.js";

const ALGO = "aes-256-gcm";

function getBackupKey() {
  const raw = process.env.BACKUP_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("BACKUP_ENCRYPTION_KEY is not set — cannot decrypt the archive.");
  }
  const buf = Buffer.from(raw.trim(), "hex");
  if (buf.length !== 32) {
    throw new Error(`BACKUP_ENCRYPTION_KEY must be 32 bytes (64 hex chars). Got ${buf.length} bytes.`);
  }
  return buf;
}

function decryptBuffer(fileBuf, key) {
  const version = fileBuf[0];
  if (version !== 1) {
    throw new Error(`Unsupported archive envelope version: ${version}. This archive may be corrupt or from an incompatible tool.`);
  }
  const iv  = fileBuf.subarray(1, 13);
  const tag = fileBuf.subarray(13, 29);
  const ct  = fileBuf.subarray(29);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(ct), decipher.final()]);
  } catch {
    throw new Error(
      "Failed to decrypt archive — BACKUP_ENCRYPTION_KEY does not match the key " +
      "used to create this backup, or the file is corrupted."
    );
  }
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const archivePath = args.find((a) => !a.startsWith("--"));
  return {
    archivePath,
    apply: args.includes("--apply"),
    force: args.includes("--force"),
    db: (() => {
      const i = args.indexOf("--db");
      return i !== -1 ? args[i + 1] : undefined;
    })(),
  };
}

function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Picks the first non-empty encrypted-looking PHI value in the archive's
 * prescriptions and attempts to decrypt it with the CURRENT environment's
 * FIELD_ENCRYPTION_KEY. This turns the "loud warning" requirement into a
 * real, actionable check instead of a static disclaimer.
 */
function verifyFieldEncryptionKey(data) {
  const prescriptions = data.prescriptions;
  if (!Array.isArray(prescriptions) || prescriptions.length === 0) {
    console.log("[restore] No prescriptions in this archive — field-encryption key check skipped.");
    return;
  }

  const PHI_FIELDS = ["diagnosis", "treatment", "clinicalFinding", "notes"];
  let sample = null;
  for (const doc of prescriptions) {
    for (const f of PHI_FIELDS) {
      const v = doc[f];
      if (typeof v === "string" && v.startsWith("v1:")) {
        sample = v;
        break;
      }
    }
    if (sample) break;
  }

  if (!sample) {
    console.log("[restore] No encrypted PHI fields found in sample prescriptions (legacy plaintext or empty) — key check skipped.");
    return;
  }

  if (!process.env.FIELD_ENCRYPTION_KEY) {
    console.warn(
      "\n⚠️  WARNING: FIELD_ENCRYPTION_KEY is not set in this environment. " +
      "Restored prescription PHI will be UNREADABLE until you set it to the SAME key " +
      "that was active when this backup was taken.\n"
    );
    return;
  }

  const result = decryptField(sample);
  if (result === "[DECRYPTION FAILED]") {
    console.warn(
      "\n❌ FIELD_ENCRYPTION_KEY MISMATCH: this environment's key could NOT decrypt a sample " +
      "prescription from the archive. If you restore this backup here, prescription PHI will be " +
      "PERMANENTLY UNREADABLE. Restore FIELD_ENCRYPTION_KEY from your secrets vault (the copy stored " +
      "alongside this backup) before proceeding.\n"
    );
  } else {
    console.log("✅ FIELD_ENCRYPTION_KEY verified — sample prescription PHI decrypted successfully.");
  }
}

async function run() {
  const { archivePath, apply, force, db: dbOverride } = parseArgs(process.argv);

  if (!archivePath) {
    console.error("Usage: node Backend/scripts/restore.js <path-to-archive.enc> [--apply] [--force] [--db <name>]");
    process.exit(1);
  }
  if (!fs.existsSync(archivePath)) {
    console.error(`[restore] Archive not found: ${archivePath}`);
    process.exit(1);
  }

  const key = getBackupKey();
  console.log(`[restore] Decrypting ${path.basename(archivePath)}…`);
  const raw = fs.readFileSync(archivePath);
  const decrypted = decryptBuffer(raw, key);
  const json = zlib.gunzipSync(decrypted).toString("utf8");

  let payload;
  try {
    payload = JSON.parse(json);
  } catch {
    console.error("[restore] Archive decrypted but is not valid JSON — corrupt or unsupported archive.");
    process.exit(1);
  }

  if (!payload?.meta || !payload?.data || typeof payload.data !== "object") {
    console.error("[restore] Archive structure invalid — missing meta/data. Refusing to proceed.");
    process.exit(1);
  }

  const collectionNames = Object.keys(payload.data);
  console.log(`[restore] Archive created: ${payload.meta.createdAt}`);
  console.log(`[restore] Collections (${collectionNames.length}):`);
  for (const name of collectionNames) {
    const count = Array.isArray(payload.data[name]) ? payload.data[name].length : "?";
    console.log(`    - ${name}: ${count} document(s)`);
  }

  verifyFieldEncryptionKey(payload.data);

  if (!apply) {
    console.log("\n[restore] DRY RUN complete — no database writes were made. Re-run with --apply to actually restore.");
    return;
  }

  console.warn(
    "\n⚠️  DESTRUCTIVE OPERATION: --apply will REPLACE the contents of every collection listed above " +
    `in the target database (${dbOverride || "the database in MONGO_URI"}). Existing data in those ` +
    "collections will be deleted first. This cannot be undone.\n"
  );

  if (!force) {
    const answer = await confirm('Type "RESTORE" to proceed, or anything else to cancel: ');
    if (answer !== "RESTORE") {
      console.log("[restore] Cancelled — no changes made.");
      return;
    }
  }

  console.log("[restore] Connecting to MongoDB…");
  const connectOptions = dbOverride ? { dbName: dbOverride } : undefined;
  await mongoose.connect(process.env.MONGO_URI, connectOptions);
  const db = mongoose.connection.db;
  console.log(`[restore] Target database: ${db.databaseName}`);

  for (const name of collectionNames) {
    const docs = payload.data[name];
    if (!Array.isArray(docs)) continue;

    const delResult = await db.collection(name).deleteMany({});
    console.log(`[restore] ${name}: cleared ${delResult.deletedCount} existing document(s)`);

    if (docs.length > 0) {
      await db.collection(name).insertMany(docs, { ordered: false });
    }
    console.log(`[restore] ${name}: restored ${docs.length} document(s)`);
  }

  await mongoose.disconnect();
  console.log("\n[restore] Restore complete.");
  console.log("[restore] Reminder: if FIELD_ENCRYPTION_KEY did not verify above, prescription PHI is unreadable until the correct key is restored.");
  console.log("[restore] Note this restore in your ops/incident log — this script does not write to AuditLog (it runs outside an authenticated session).");
}

run().catch((err) => {
  console.error("[restore] FAILED:", err.message);
  process.exit(1);
});
