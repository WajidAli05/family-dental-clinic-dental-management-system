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
  };
}
