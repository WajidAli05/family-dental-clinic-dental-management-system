// Shared default state + pre-fill mapping for patient Add/Edit forms
// (owner + receptionist) so both roles capture the same field set.

export const EMPTY_PATIENT_FIELDS = {
  dateOfBirth: "",
  nationality: "",
  preferredLanguage: "",
  country: "",
  postalCode: "",
  referralSource: "",
  emergencyContactName: "",
  emergencyContactRelationship: "",
  emergencyContactPhone: "",
  insuranceProvider: "",
  insurancePolicyNumber: "",
  medicalHistory: "",
  allergies: [],
  currentMedications: "",
  existingConditions: "",
  previousSurgeries: "",
  pregnancyStatus: "",
  dentalHistory: "",
  previousTreatments: "",
};

/** Maps a patient record (list row or raw doc) onto the shared form field
 * names. insurancePolicyNumber is deliberately left blank — it's write-only,
 * never pre-filled with the decrypted value (see hasPolicyNumber instead). */
export function mapPatientToFormFields(source) {
  const p = source || {};
  return {
    dateOfBirth: p.dateOfBirth ? String(p.dateOfBirth).slice(0, 10) : "",
    nationality: p.nationality || "",
    preferredLanguage: p.preferredLanguage || "",
    country: p.country || "",
    postalCode: p.postalCode || "",
    referralSource: p.referralSource || "",
    emergencyContactName: p.emergencyContact?.name || "",
    emergencyContactRelationship: p.emergencyContact?.relationship || "",
    emergencyContactPhone: p.emergencyContact?.phone || "",
    insuranceProvider: p.insurance?.provider || "",
    insurancePolicyNumber: "",
    medicalHistory: p.medicalHistory || "",
    allergies: Array.isArray(p.allergies) ? p.allergies : [],
    currentMedications: p.currentMedications || "",
    existingConditions: p.existingConditions || "",
    previousSurgeries: p.previousSurgeries || "",
    pregnancyStatus: p.pregnancyStatus || "",
    dentalHistory: p.dentalHistory || "",
    previousTreatments: p.previousTreatments || "",
  };
}

/** Build the medicalInfo slice of a create/update payload from form state.
 * Reused by owner + receptionist submit handlers so the field list and
 * sanitization only live in one place. */
export function buildMedicalFieldsPayload(form) {
  return {
    medicalHistory: (form.medicalHistory || "").trim(),
    currentMedications: (form.currentMedications || "").trim(),
    existingConditions: (form.existingConditions || "").trim(),
    previousSurgeries: (form.previousSurgeries || "").trim(),
    pregnancyStatus: form.pregnancyStatus || "",
    dentalHistory: (form.dentalHistory || "").trim(),
    previousTreatments: (form.previousTreatments || "").trim(),
    allergies: Array.isArray(form.allergies)
      ? form.allergies
          .filter((a) => a?.allergen && a.allergen.trim())
          .map((a) => ({ allergen: a.allergen.trim(), severity: a.severity || "moderate" }))
      : [],
  };
}
