/**
 * Backend/scripts/backupCore.js
 * ─────────────────────────────────────────────────────────────────────────────
 * The ONE backup routine — exported as runBackup(). Both the CLI
 * (scripts/backup.js) and the in-app scheduler (services/backupScheduler.js)
 * call this exact function; neither duplicates the logic.
 *
 * runBackup() assumes a Mongoose connection is ALREADY open (it does not
 * connect/disconnect itself) — the CLI wrapper owns that lifecycle for a
 * standalone run, while the scheduler reuses the server's existing
 * connection so nightly backups don't tear down the app's live DB link.
 *
 * See BACKUP.md for full documentation (encryption, retention, restore,
 * scheduling).
 */

import fs from "fs";
import path from "path";
import zlib from "zlib";
import crypto from "crypto";
import mongoose from "mongoose";
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
      "Add it to Backend/.env, then re-run."
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

function monthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Grandfather-father-son: keep the N most recent distinct-day archives
 * ("daily"), plus one archive per ISO week for the next M weeks beyond that
 * ("weekly"), plus one per calendar month for the next Y months beyond that
 * ("monthly"). Everything else is deleted. Each tier only considers archives
 * not already kept by a more granular tier.
 */
function pruneOldArchives(dir, dailyKeep, weeklyKeep, monthlyKeep) {
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
    if (keep.has(e.name)) continue;
    if (seenWeeks.size >= weeklyKeep) break;
    const wk = isoWeekKey(e.date);
    if (seenWeeks.has(wk)) continue;
    seenWeeks.add(wk);
    keep.add(e.name);
  }

  const seenMonths = new Set();
  for (const e of entries) {
    if (keep.has(e.name)) continue;
    if (seenMonths.size >= monthlyKeep) break;
    const mk = monthKey(e.date);
    if (seenMonths.has(mk)) continue;
    seenMonths.add(mk);
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
  console.log(
    `[backup] Retention: kept ${keep.size}, pruned ${deleted} ` +
    `(daily=${dailyKeep}, weekly=${weeklyKeep}, monthly=${monthlyKeep}).`
  );
}

// ─── The one backup routine ────────────────────────────────────────────────────

/**
 * Dumps every collection, encrypts the archive, prunes old archives per the
 * tiered retention policy. Requires an already-open Mongoose connection.
 * Never throws PHI in its errors or logs — only collection names/counts.
 *
 * @returns {Promise<{file: string, collections: number, counts: object, totalDocs: number, sizeKB: number}>}
 */
export async function runBackup() {
  const key = getBackupKey(); // fail fast, before touching the DB
  const backupDir = resolveBackupDir();
  fs.mkdirSync(backupDir, { recursive: true });

  const dailyKeep   = Number(process.env.BACKUP_RETENTION_DAILY   ?? 30);
  const weeklyKeep  = Number(process.env.BACKUP_RETENTION_WEEKLY  ?? 8);
  const monthlyKeep = Number(process.env.BACKUP_RETENTION_MONTHLY ?? 12);

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("No active MongoDB connection — runBackup() requires Mongoose to already be connected.");
  }

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

  const json       = JSON.stringify(payload);
  const gzipped    = zlib.gzipSync(json);
  const encrypted  = encryptBuffer(gzipped, key);

  const filename = `fdc-backup-${timestamp()}.enc`;
  const filepath = path.join(backupDir, filename);
  fs.writeFileSync(filepath, encrypted);

  const totalDocs = Object.values(counts).reduce((a, b) => a + b, 0);
  const sizeKB    = Number((encrypted.length / 1024).toFixed(1));
  console.log(`[backup] Wrote ${filepath}`);
  console.log(`[backup] ${collectionNames.length} collections, ${totalDocs} total documents, ${sizeKB} KB encrypted.`);

  pruneOldArchives(backupDir, dailyKeep, weeklyKeep, monthlyKeep);

  return { file: filepath, collections: collectionNames.length, counts, totalDocs, sizeKB };
}
