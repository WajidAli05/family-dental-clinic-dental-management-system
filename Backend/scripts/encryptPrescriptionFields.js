/**
 * Backend/scripts/encryptPrescriptionFields.js
 *
 * Encrypt PHI fields in existing Prescription documents.
 *
 * DRY RUN (default — safe to run at any time, zero writes):
 *   node Backend/scripts/encryptPrescriptionFields.js
 *
 * APPLY (writes to the database — run only with the correct FIELD_ENCRYPTION_KEY):
 *   node Backend/scripts/encryptPrescriptionFields.js --apply
 *
 * KEY SAFETY:
 *   • Ensure FIELD_ENCRYPTION_KEY in Backend/.env is the production key.
 *   • Take a database backup before applying to production.
 *   • Never run this twice — the script skips already-encrypted fields.
 *
 * OPENSSL KEY GENERATION:
 *   openssl rand -hex 32
 *
 * KEY-LOSS WARNING:
 *   If you lose or rotate the key without re-encrypting the database first,
 *   every encrypted prescription becomes permanently unreadable.
 *   Back the key up to a secure vault (password manager / secrets manager).
 */

import "dotenv/config";
import mongoose from "mongoose";
import Prescription from "../models/Prescription.model.js";
import {
  initEncryption,
  PRESCRIPTION_PHI_STRING_FIELDS,
  encryptField,
  encryptMedications,
} from "../utils/fieldEncryption.js";

const APPLY   = process.argv.includes("--apply");
const BATCH   = 100;

// A document needs encryption if any PHI string field has a non-empty value
// not yet carrying the "v1:" version prefix, OR if medications is a non-empty
// plain array (not yet an encrypted string).
function needsEncryption(doc) {
  for (const field of PRESCRIPTION_PHI_STRING_FIELDS) {
    const val = doc[field];
    if (val && typeof val === "string" && !val.startsWith("v1:")) return true;
  }
  const meds = doc.medications;
  if (Array.isArray(meds) && meds.length > 0) return true;
  return false;
}

async function run() {
  initEncryption(); // throws fast if key is missing or wrong length

  const mongoUri = process.env.MONGO_URI || process.env.DATABASE_URL;
  if (!mongoUri) {
    console.error("ERROR: MONGO_URI (or DATABASE_URL) is not set in environment.");
    process.exit(1);
  }

  console.log(`\n[encryptPrescriptionFields] Mode: ${APPLY ? "APPLY (will write)" : "DRY RUN (no writes)"}`);
  console.log("[encryptPrescriptionFields] Connecting to MongoDB…");

  await mongoose.connect(mongoUri);
  console.log("[encryptPrescriptionFields] Connected.\n");

  let totalScanned = 0;
  let totalNeedsWork = 0;
  let totalUpdated = 0;
  let totalErrors = 0;

  let lastId = null;

  // Paginate through all documents using range-based batching (avoids skip/offset).
  for (;;) {
    const query = lastId ? { _id: { $gt: lastId } } : {};
    const batch = await Prescription.find(query)
      .sort({ _id: 1 })
      .limit(BATCH)
      .lean();

    if (batch.length === 0) break;

    lastId = batch[batch.length - 1]._id;
    totalScanned += batch.length;

    const candidates = batch.filter(needsEncryption);
    totalNeedsWork += candidates.length;

    if (candidates.length > 0) {
      console.log(
        `[encryptPrescriptionFields] Batch ending _id=${lastId}: ` +
        `${batch.length} scanned, ${candidates.length} to encrypt.`
      );
    }

    if (APPLY) {
      for (const doc of candidates) {
        const $set = {};

        for (const field of PRESCRIPTION_PHI_STRING_FIELDS) {
          const val = doc[field];
          if (val && typeof val === "string" && !val.startsWith("v1:")) {
            $set[field] = encryptField(val);
          }
        }

        const meds = doc.medications;
        if (Array.isArray(meds) && meds.length > 0) {
          $set.medications = encryptMedications(meds);
        }

        if (Object.keys($set).length === 0) continue; // nothing to write

        try {
          await Prescription.updateOne({ _id: doc._id }, { $set });
          totalUpdated++;
        } catch (err) {
          totalErrors++;
          // Log only the document ID, never PHI content.
          console.error(`[encryptPrescriptionFields] ERROR updating _id=${doc._id}: ${err.message}`);
        }
      }
    }
  }

  console.log("\n─────────────────────────────────────────────");
  console.log(`[encryptPrescriptionFields] Done.`);
  console.log(`  Total scanned : ${totalScanned}`);
  console.log(`  Needs work    : ${totalNeedsWork}`);
  if (APPLY) {
    console.log(`  Updated       : ${totalUpdated}`);
    console.log(`  Errors        : ${totalErrors}`);
  } else {
    console.log(`  (Dry run — no writes performed.)`);
    if (totalNeedsWork > 0) {
      console.log(`  Run with --apply to encrypt these ${totalNeedsWork} documents.`);
    } else {
      console.log(`  All documents already encrypted or empty — nothing to do.`);
    }
  }
  console.log("─────────────────────────────────────────────\n");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("[encryptPrescriptionFields] Fatal error:", err.message);
  process.exit(1);
});
