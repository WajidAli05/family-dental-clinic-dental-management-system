/**
 * Clinical-master option lists for the tooth clinical fields.
 *
 * ONE derivation, shared by every surface that renders the tooth dialog. It was
 * previously inlined in StartPrescriptionModal only, which is why the same
 * modal opened from the owner patient profile fell back to free-text inputs:
 * ClinicalField renders a <Select> when it receives options and a plain <Input>
 * when the array is empty, and the owner surface never passed any.
 *
 * The inputs are the raw ClinicalMaster arrays — identical whether they came
 * from /dentist/clinical-master or /owner/clinical-master — so each role feeds
 * this from its own already-existing store. No second fetch path.
 *
 * `active !== false` is the same flag every other catalogue reader honours;
 * items with no explicit flag are treated as active.
 */
export function deriveClinicalOptions({
  diagnosisTemplates = [],
  treatments = [],
  clinicalFindingTemplates = [],
} = {}) {
  const names = (rows, key) =>
    (rows || [])
      .filter((r) => r?.active !== false)
      .map((r) => String(r?.[key] || "").trim())
      .filter(Boolean);

  return {
    diagnosis: names(diagnosisTemplates, "title"),
    treatment: names(treatments, "name"),
    clinicalFinding: names(clinicalFindingTemplates, "title"),
  };
}

/** Empty shape — lets a surface with no catalogue render without extra guards. */
export const EMPTY_CLINICAL_OPTIONS = Object.freeze({
  diagnosis: [],
  treatment: [],
  clinicalFinding: [],
});
