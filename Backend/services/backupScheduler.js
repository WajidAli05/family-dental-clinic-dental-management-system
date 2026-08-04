/**
 * Backend/services/backupScheduler.js
 *
 * In-app nightly backup scheduler (node-cron) — so backups run automatically
 * without the operator having to configure OS-level cron/Task Scheduler.
 * Calls the SAME runBackup() the CLI uses (scripts/backupCore.js); no backup
 * logic is duplicated here.
 *
 * Default: nightly at 2:00 AM. A dental practice's RPO is "daily" (unlike a
 * hospital's 5–15 min transaction-log backups) — one clean snapshot per day
 * during off-hours is the accepted baseline. See BACKUP.md.
 *
 * Configurable via env:
 *   BACKUP_SCHEDULE_ENABLED   — "false" to disable entirely (default: enabled)
 *   BACKUP_SCHEDULE           — cron expression (default: "0 2 * * *")
 *   BACKUP_TIMEZONE           — IANA timezone for the schedule (default: server local time)
 */

import cron from "node-cron";
import { runBackup } from "../scripts/backupCore.js";
import { recordAudit } from "./shared/audit.js";

const DEFAULT_SCHEDULE = "0 2 * * *"; // nightly, 2:00 AM

let started = false;

/** Idempotent — safe to call more than once; only the first call registers the job. */
export function startBackupScheduler() {
  if (started) return;
  started = true;

  const enabled = (process.env.BACKUP_SCHEDULE_ENABLED ?? "true").toLowerCase() !== "false";
  if (!enabled) {
    console.log("[backupScheduler] BACKUP_SCHEDULE_ENABLED=false — scheduled backups disabled.");
    return;
  }

  const expression = process.env.BACKUP_SCHEDULE || DEFAULT_SCHEDULE;
  if (!cron.validate(expression)) {
    console.error(
      `[backupScheduler] Invalid BACKUP_SCHEDULE "${expression}" — scheduled backups NOT started. ` +
      "Fix the cron expression in .env and restart the server."
    );
    return;
  }

  cron.schedule(expression, () => runScheduledBackup(expression), {
    name: "fdc-nightly-backup",
    timezone: process.env.BACKUP_TIMEZONE || undefined,
  });

  console.log(
    `[backupScheduler] Scheduled backups enabled — cron "${expression}"` +
    (process.env.BACKUP_TIMEZONE ? ` (${process.env.BACKUP_TIMEZONE})` : "") + "."
  );
}

// Runs one backup, logs the result, and audits it. Never throws — a failed
// scheduled backup must not crash the server or block anything else.
async function runScheduledBackup(expression) {
  console.log(`[backupScheduler] Running scheduled backup (${expression})…`);
  try {
    const result = await runBackup();
    console.log(`[backupScheduler] Success: ${result.file} (${result.totalDocs} documents, ${result.sizeKB} KB).`);
    await recordAudit({
      action:      "system.backup",
      entityType:  "Database",
      entityLabel: "scheduled backup",
      actorRole:   "system",
      actorName:   "backup-scheduler",
      after:       { success: true, file: result.file, collections: result.collections, totalDocs: result.totalDocs },
    });
  } catch (err) {
    console.error("[backupScheduler] Scheduled backup FAILED:", err.message);
    await recordAudit({
      action:      "system.backup",
      entityType:  "Database",
      entityLabel: "scheduled backup",
      actorRole:   "system",
      actorName:   "backup-scheduler",
      after:       { success: false, error: err.message },
    }).catch(() => {});
  }
}
