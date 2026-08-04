/**
 * Backend/scripts/backup.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Portable, encrypted, timestamped database backup. Pure Node + the MongoDB
 * driver already bundled with Mongoose — no external tools (mongodump, etc.)
 * required, so it runs identically on a bare Windows dev machine and a Linux
 * VPS. See the optional mongodump commands in BACKUP.md for a native-binary
 * alternative where mongodump IS available.
 *
 * WHAT IT DOES
 *   1. Connects to MONGO_URI.
 *   2. Lists every collection actually present in the database (not just the
 *      ones the current codebase happens to model — a real DR backup should
 *      not silently skip collections after schema drift).
 *   3. Dumps each collection's raw documents (encrypted Prescription fields
 *      stay ciphertext — this is a byte-faithful DB snapshot, not a
 *      human-readable export; see dataExport.js / the owner export endpoint
 *      for a decrypted, portable export instead).
 *   4. Gzips the JSON payload, then encrypts it (AES-256-GCM) with
 *      BACKUP_ENCRYPTION_KEY so a stolen archive file is useless on its own.
 *   5. Writes Backend/<BACKUP_DIR>/fdc-backup-<timestamp>.enc
 *   6. Prunes old archives per the retention policy.
 *
 * USAGE (from the project root):
 *   node Backend/scripts/backup.js
 *
 * REQUIRED ENV (Backend/.env):
 *   MONGO_URI               — already set for the app
 *   BACKUP_ENCRYPTION_KEY    — 32-byte hex key, SEPARATE from FIELD_ENCRYPTION_KEY
 *                              Generate with:  openssl rand -hex 32
 *                              (no openssl?    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
 *
 * OPTIONAL ENV:
 *   BACKUP_DIR               — where archives are written (default: Backend/backups)
 *   BACKUP_RETENTION_DAILY   — how many most-recent daily archives to keep (default: 7)
 *   BACKUP_RETENTION_WEEKLY  — how many additional weekly archives to keep beyond
 *                              the daily window (default: 4)
 *
 * This script only ever READS from the database and WRITES a new file to
 * BACKUP_DIR (plus deleting its OWN old archives during retention pruning —
 * it never touches any file outside its own fdc-backup-*.enc naming pattern).
 * It never modifies application data.
 */

import "dotenv/config";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ALGO      = "aes-256-gcm";
const IV_BYTES  = 12;
const ENVELOPE_VERSION = 1; // 1 byte, at the start of every .enc file

function getBackupKey() {
  const raw = process.env.BACKUP_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "BACKUP_ENCRYPTION_KEY is not set. Generate one with: openssl rand -hex 32\n" +
      "(no openssl? node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")\n" +
      "Add it to Backend/.env, then re-run this script."
    );
  }
  const buf = Buffer.from(raw.trim(), "hex");
  if (buf.length !== 32) {
    throw new Error(
      `BACKUP_ENCRYPTION_KEY must be 32 bytes (64 hex chars). Got ${buf.length} bytes. ` +
      "Regenerate with: openssl rand -hex 32"
    );
  }
  return buf;
}

/**
 * Binary envelope: [1 byte version][12 byte IV][16 byte auth tag][ciphertext...]
 * Kept as a compact binary file rather than base64 text — backups can get
 * large, and there is no reason to inflate them by a third for no benefit.
 */
function encryptBuffer(plainBuf, key) {
  const iv     = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ct     = Buffer.concat([cipher.update(plainBuf), cipher.final()]);
  const tag    = cipher.getAuthTag();
  return Buffer.concat([Buffer.from([ENVELOPE_VERSION]), iv, tag, ct]);
}

function resolveBackupDir() {
  const configured = process.env.BACKUP_DIR;
  return configured
    ? path.resolve(configured)
    : path.join(__dirname, "..", "backups");
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

// ─── Retention ────────────────────────────────────────────────────────────────

const ARCHIVE_RE = /^fdc-backup-(\d{8})-(\d{6})\.enc$/;

function isoWeekKey(date) {
  // ISO week number, "YYYY-Www" — good enough as a weekly bucket key.
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/**
 * Grandfather-father-son-lite: keep the N most recent distinct-day archives
 * ("daily"), plus one archive per ISO week for the M weeks immediately
 * preceding the daily window ("weekly"). Everything else is deleted.
 */
function pruneOldArchives(dir, dailyKeep, weeklyKeep) {
  const entries = fs.readdirSync(dir)
    .map((name) => {
      const m = name.match(ARCHIVE_RE);
      if (!m) return null;
      const [, ymd, hms] = m;
      const date = new Date(
        `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}T` +
        `${hms.slice(0, 2)}:${hms.slice(2, 4)}:${hms.slice(4, 6)}Z`
      );
      return { name, date, dayKey: ymd };
    })
    .filter(Boolean)
    .sort((a, b) => b.date - a.date); // newest first

  const keep = new Set();

  const seenDays = new Set();
  for (const e of entries) {
    if (seenDays.size >= dailyKeep) break;
    if (seenDays.has(e.dayKey)) continue;
    seenDays.add(e.dayKey);
    keep.add(e.name);
  }

  const seenWeeks = new Set();
  for (const e of entries) {
    if (keep.has(e.name)) continue; // already kept as part of the daily window
    if (seenWeeks.size >= weeklyKeep) break;
    const wk = isoWeekKey(e.date);
    if (seenWeeks.has(wk)) continue;
    seenWeeks.add(wk);
    keep.add(e.name);
  }

  let deleted = 0;
  for (const e of entries) {
    if (!keep.has(e.name)) {
      fs.unlinkSync(path.join(dir, e.name));
      console.log(`[backup] Pruned old archive: ${e.name}`);
      deleted += 1;
    }
  }
  console.log(`[backup] Retention: kept ${keep.size}, pruned ${deleted} (daily=${dailyKeep}, weekly=${weeklyKeep}).`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  const key = getBackupKey(); // fail fast, before touching the DB
  const backupDir = resolveBackupDir();
  fs.mkdirSync(backupDir, { recursive: true });

  const dailyKeep  = Number(process.env.BACKUP_RETENTION_DAILY  ?? 7);
  const weeklyKeep = Number(process.env.BACKUP_RETENTION_WEEKLY ?? 4);

  console.log("[backup] Connecting to MongoDB…");
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const collInfos = await db.listCollections().toArray();
  const collectionNames = collInfos.map((c) => c.name).sort();

  console.log(`[backup] Found ${collectionNames.length} collections.`);

  const data = {};
  const counts = {};
  for (const name of collectionNames) {
    const docs = await db.collection(name).find({}).toArray();
    data[name] = docs;
    counts[name] = docs.length;
    console.log(`[backup] Dumped ${name}: ${docs.length} document(s)`);
  }

  const payload = {
    meta: {
      createdAt: new Date().toISOString(),
      app: "family-dental-clinic",
      formatVersion: 1,
      collections: collectionNames,
      counts,
    },
    data,
  };

  const json    = JSON.stringify(payload);
  const gzipped = zlib.gzipSync(json);
  const encrypted = encryptBuffer(gzipped, key);

  const filename = `fdc-backup-${timestamp()}.enc`;
  const filepath = path.join(backupDir, filename);
  fs.writeFileSync(filepath, encrypted);

  const totalDocs = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`[backup] Wrote ${filepath}`);
  console.log(`[backup] ${collectionNames.length} collections, ${totalDocs} total documents, ${(encrypted.length / 1024).toFixed(1)} KB encrypted.`);

  pruneOldArchives(backupDir, dailyKeep, weeklyKeep);

  await mongoose.disconnect();
  console.log("[backup] Done.");
}

run().catch((err) => {
  console.error("[backup] FAILED:", err.message);
  process.exit(1);
});
