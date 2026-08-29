#!/usr/bin/env node
/**
 * Uploaded-files backup — SEPARATE from the nightly database archive.
 *
 * WHY SEPARATE: scripts/backup.js dumps MongoDB collections only. Patient
 * imaging lives on disk under UPLOAD_DIR, so a DB-only backup silently leaves
 * every radiograph unprotected. Folding gigabytes of images into the nightly
 * archive would also make that archive slow and unusable, so this is its own
 * tool with its own schedule.
 *
 * Produces an uncompressed mirror (default) or a tar.gz, and prints the
 * restore-order warning that matters:
 *
 *   RESTORE ORDER — files FIRST, then the database. Restoring the DB alone
 *   leaves FileAsset rows pointing at bytes that are not there, and the
 *   gallery shows entries that 410 on open.
 *
 * Usage:
 *   node scripts/backupFiles.js                 # mirror into ./backups/files/
 *   node scripts/backupFiles.js --out /mnt/bk   # mirror into a chosen dir
 *   node scripts/backupFiles.js --tar           # single .tar.gz (Linux/macOS)
 *   node scripts/backupFiles.js --dry-run
 */
import "dotenv/config";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { uploadRoot } from "../services/shared/storage.js";

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const valueOf = (f, dflt) => {
  const i = args.indexOf(f);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};

const SRC = uploadRoot();
const OUT = path.resolve(valueOf("--out", path.join(process.cwd(), "backups", "files")));
const DRY = has("--dry-run");

/** Recursive copy with counts — no external deps, works on Windows and Linux. */
async function mirror(src, dest) {
  let files = 0, bytes = 0;
  const entries = await fsp.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) {
      if (!DRY) await fsp.mkdir(d, { recursive: true, mode: 0o700 });
      const sub = await mirror(s, d);
      files += sub.files; bytes += sub.bytes;
    } else if (e.isFile()) {
      const st = await fsp.stat(s);
      if (!DRY) await fsp.copyFile(s, d);
      files += 1; bytes += st.size;
    }
  }
  return { files, bytes };
}

const mb = (b) => (b / (1024 * 1024)).toFixed(1);

(async () => {
  console.log(`Upload source : ${SRC}`);

  if (!fs.existsSync(SRC)) {
    console.error(`\nFATAL: UPLOAD_DIR does not exist: ${SRC}`);
    console.error("Set UPLOAD_DIR to the absolute path this deployment uses.");
    process.exit(1);
  }

  if (has("--tar")) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const archive = path.join(OUT, `fdc-uploads-${stamp}.tar.gz`);
    if (!DRY) await fsp.mkdir(OUT, { recursive: true });
    console.log(`Archive       : ${archive}`);
    if (DRY) { console.log("\n(dry run — nothing written)"); return; }

    // tar is present on the VPS; on Windows use the default mirror mode.
    const r = spawnSync("tar", ["-czf", archive, "-C", path.dirname(SRC), path.basename(SRC)], { stdio: "inherit" });
    if (r.status !== 0) {
      console.error("\nFATAL: tar failed. On Windows run without --tar to use mirror mode.");
      process.exit(1);
    }
    const st = await fsp.stat(archive);
    console.log(`\nDone: ${mb(st.size)} MB`);
  } else {
    console.log(`Mirror target : ${OUT}`);
    if (!DRY) await fsp.mkdir(OUT, { recursive: true, mode: 0o700 });
    const { files, bytes } = await mirror(SRC, OUT);
    console.log(`\n${DRY ? "[dry run] would copy" : "Copied"} ${files} file(s), ${mb(bytes)} MB`);
  }

  console.log(
    "\nRESTORE ORDER: restore FILES first, then the database.\n" +
    "A database restored without its files leaves FileAsset rows pointing at\n" +
    "missing bytes — the gallery lists entries that fail to open."
  );
})().catch((e) => {
  console.error("\nFATAL:", e.message);
  process.exit(1);
});
