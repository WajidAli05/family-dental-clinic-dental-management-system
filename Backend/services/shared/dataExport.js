/**
 * Backend/services/shared/dataExport.js
 *
 * Owner-facing data portability export (PDPL-style "right to portability" +
 * anti-lock-in). Unlike Backend/scripts/backup.js (a byte-faithful, still-
 * encrypted DR snapshot), this produces a DECRYPTED, human-readable export —
 * this is authorized owner access to their own clinic's data, requested
 * on-demand through an authenticated owner-only endpoint.
 *
 * Never includes: password hashes, 2FA secrets/backup codes, OTP hashes, or
 * raw PHI inside AuditLog before/after snapshots (redacted the same way the
 * Audit Log Viewer redacts them).
 */
import {
  User, Patient, Appointment, Invoice, InventoryItem, Supplier, PurchaseOrder,
  InventoryConsumption, SampleType, LabCase, LabSample, OwnerPayment, LabBill,
  CommissionRules, ClinicalMaster, Prescription, Permissions, AuditLog,
  Notification, ClinicSettings,
} from "../../models/index.js";
import { decryptPrescriptionDoc } from "../../utils/fieldEncryption.js";
import { redactObj } from "./auditQuery.js";

// Defense in depth — User.find({}) already excludes these (schema: select:false),
// but strip them explicitly too in case that ever changes.
const USER_SECRET_FIELDS = ["passwordHash", "twoFactorSecret", "backupCodes", "otpHash", "otpExpiry"];
function stripUserSecrets(doc) {
  const clone = { ...doc };
  for (const f of USER_SECRET_FIELDS) delete clone[f];
  return clone;
}

function redactAuditDoc(doc) {
  return { ...doc, before: redactObj(doc.before), after: redactObj(doc.after) };
}

// key -> { model, csv: exportable as CSV?, transform: per-document shaping }
const REGISTRY = {
  users:                { model: User,                 transform: stripUserSecrets },
  patients:              { model: Patient,               csv: true },
  appointments:           { model: Appointment,            csv: true },
  invoices:               { model: Invoice,                csv: true },
  prescriptions:          { model: Prescription,           csv: true, transform: decryptPrescriptionDoc },
  labcases:               { model: LabCase,                csv: true },
  labsamples:             { model: LabSample,               csv: true },
  labbills:               { model: LabBill,                 csv: true },
  sampletypes:            { model: SampleType },
  inventoryitems:         { model: InventoryItem,           csv: true },
  suppliers:              { model: Supplier },
  purchaseorders:         { model: PurchaseOrder,           csv: true },
  inventoryconsumption:   { model: InventoryConsumption,    csv: true },
  ownerpayments:          { model: OwnerPayment,             csv: true },
  commissionrules:        { model: CommissionRules },
  clinicalmaster:         { model: ClinicalMaster },
  permissions:            { model: Permissions },
  clinicsettings:         { model: ClinicSettings },
  notifications:          { model: Notification },
  auditlogs:              { model: AuditLog,                 transform: redactAuditDoc },
};

export const EXPORTABLE_COLLECTIONS = Object.keys(REGISTRY);
export const CSV_EXPORTABLE_COLLECTIONS = Object.keys(REGISTRY).filter((k) => REGISTRY[k].csv);

async function fetchShaped(key) {
  const cfg = REGISTRY[key];
  const docs = await cfg.model.find({});
  let rows = docs.map((d) => d.toJSON());
  if (cfg.transform) rows = rows.map(cfg.transform);
  return rows;
}

/** Full clinic data export — all collections, decrypted, secrets stripped. */
export async function buildFullExport() {
  const data = {};
  const counts = {};
  for (const key of EXPORTABLE_COLLECTIONS) {
    const rows = await fetchShaped(key);
    data[key] = rows;
    counts[key] = rows.length;
  }
  return {
    meta: {
      exportedAt: new Date().toISOString(),
      app: "family-dental-clinic",
      formatVersion: 1,
      collections: EXPORTABLE_COLLECTIONS,
      counts,
    },
    data,
  };
}

function csvEscape(val) {
  if (val === null || val === undefined) return "";
  const s = typeof val === "object" ? JSON.stringify(val) : String(val);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows) {
  if (!rows.length) return "";
  const columns = [];
  const seen = new Set();
  for (const row of rows) {
    for (const k of Object.keys(row)) {
      if (!seen.has(k)) { seen.add(k); columns.push(k); }
    }
  }
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((c) => csvEscape(row[c])).join(","));
  }
  return lines.join("\r\n");
}

// Falls back to the schema's field names so an empty collection still
// downloads a valid CSV with a header row, instead of a 0-byte file that
// looks broken (toCsv() can only see columns that appear in actual rows).
function schemaColumns(model) {
  return Object.keys(model.schema.paths).filter((p) => p !== "_id" && p !== "__v").concat("id");
}

/** CSV export for one tabular collection (patients, appointments, invoices, …). */
export async function buildCsvExport(key) {
  const cfg = REGISTRY[key];
  if (!cfg || !cfg.csv) {
    throw new Error(
      `"${key}" is not an exportable tabular collection. Available: ${CSV_EXPORTABLE_COLLECTIONS.join(", ")}`
    );
  }
  const rows = await fetchShaped(key);
  if (rows.length === 0) return schemaColumns(cfg.model).join(",") + "\r\n";
  return toCsv(rows);
}
