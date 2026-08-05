/**
 * Backend/services/shared/erasure.js
 *
 * PDPL right-to-erasure: irreversibly anonymizes a patient's personal data
 * on lawful request. Owner-only (enforced at the route).
 *
 * What this does NOT do, by design:
 *   - Does not hard-delete the Patient document, Invoices, Appointments, or
 *     AuditLog entries — financial totals and the audit trail must survive
 *     (billing history, commission calculations, and the append-only,
 *     hash-chained AuditLog integrity all depend on the referenced
 *     documents continuing to exist). Invoice/Appointment/LabCase/
 *     Prescription all carry the same softDelete plugin as Patient
 *     (models/plugins/softDelete.js) — erasure never bypasses that into an
 *     actual deleteOne/deleteMany.
 *   - Does not touch AuditLog at all beyond adding ONE new entry recording
 *     that the erasure happened. AuditLog is append-only (see
 *     AuditLog.model.js pre-hooks) — past entries referencing this patient
 *     (e.g. "receptionist registered patient X") are historical fact and
 *     cannot be edited without breaking the hash chain. This is a known,
 *     documented limitation — see SECURITY.md §Erasure.
 *
 * What IS erased/anonymized:
 *   - Patient identifying fields: name, phone, email, address, city.
 *   - Encrypted Prescription PHI (diagnosis, treatment, clinicalFinding,
 *     notes, medications) for every prescription tied to this patient —
 *     including ones already soft-deleted by a prior ownerPatientDelete
 *     cascade (queried with includeDeleted: true; erasure is a lawful
 *     obligation independent of a record's soft-delete state).
 *
 * Financial documents (Invoice) reference the Patient by ObjectId — once
 * the Patient's name is anonymized, any invoice view that populates the
 * patient automatically shows the anonymized name too. No separate Invoice
 * mutation needed, and totals/line items are never touched.
 */
import Patient from "../../models/Patient.model.js";
import Prescription from "../../models/Prescription.model.js";
import { recordAudit } from "./audit.js";

function anonymizedName(publicId) {
  return `Erased Patient (${publicId})`;
}

/**
 * @param {import("express").Request} req — for recordAudit's actor/IP context
 * @param {string} patientPublicId
 */
export async function erasePatientPII(req, patientPublicId) {
  // includeDeleted: an erasure request is a lawful obligation regardless of
  // whether the patient (or their prescriptions, via the delete cascade in
  // ownerPatientDelete) has already been soft-deleted — it must still be
  // reachable and actionable.
  const patient = await Patient.findOne({ publicId: patientPublicId }).setOptions({ includeDeleted: true });
  if (!patient) throw Object.assign(new Error("Patient not found"), { status: 404 });

  if (patient.anonymizedAt) {
    throw Object.assign(new Error("This patient's data has already been erased"), { status: 409 });
  }

  const fieldsErased = ["name", "phone", "email", "address", "city"];

  patient.name = anonymizedName(patientPublicId);
  patient.phone = "[erased]"; // phone is a required field — cannot be ""
  patient.email = "";
  patient.address = "";
  patient.city = "";
  patient.status = "inactive";
  patient.tags = ["erased"];
  patient.anonymizedAt = new Date();
  patient.deletedAt = patient.deletedAt || new Date(); // also excluded from normal queries
  await patient.save();

  const prescriptions = await Prescription.find({ patientId: patientPublicId }).setOptions({ includeDeleted: true });
  for (const rx of prescriptions) {
    rx.diagnosis = "";
    rx.treatment = "";
    rx.clinicalFinding = "";
    rx.notes = "";
    rx.medications = [];
    await rx.save();
  }

  // Never log the erased PII — only the durable ID and a count of what changed.
  await recordAudit({
    req,
    action:      "patient.erasure",
    entityType:  "Patient",
    entityId:    patientPublicId,
    entityLabel: patientPublicId,
    after:       { fieldsErased, prescriptionsCleared: prescriptions.length },
  });

  return { id: patientPublicId, fieldsErased, prescriptionsCleared: prescriptions.length };
}
