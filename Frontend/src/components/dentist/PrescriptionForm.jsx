import { useTranslation } from "react-i18next";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import { VISUAL_STATUS_OPTIONS } from "./options";
import { usePrescriptionStore } from "@/store/prescriptionStore";
import MedicationPicker from "./MedicationPicker";

/**
 * Visit-level prescription fields. Diagnosis / treatment / clinical finding
 * are NOT here any more — they are captured PER TOOTH on the odontogram
 * (tooth-based charting). What remains is genuinely visit-wide: overall
 * treatment status, general notes, and the general medications list.
 * Legacy prescriptions that still carry flat diagnosis/treatment/finding
 * keep those values in the store and still print; they're just no longer
 * authored from this form.
 */
const PrescriptionForm = () => {
  const { t } = useTranslation();
  const visualStatus = usePrescriptionStore((s) => s.visualStatus);
  const notes = usePrescriptionStore((s) => s.notes);
  const setVisualStatus = usePrescriptionStore((s) => s.setVisualStatus);
  const setNotes = usePrescriptionStore((s) => s.setNotes);
  const legacyDiagnosis = usePrescriptionStore((s) => s.diagnosis);
  const legacyTreatment = usePrescriptionStore((s) => s.treatment);
  const legacyFinding = usePrescriptionStore((s) => s.clinicalFinding);

  const hasLegacyBlock = Boolean(legacyDiagnosis || legacyTreatment || legacyFinding);

  return (
    <div className="space-y-4">
      {/* Legacy single-block clinical data (older prescriptions) — shown
          read-only so nothing is lost or silently overwritten. */}
      {hasLegacyBlock && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            {t("patients.legacyClinicalBlock")}
          </p>
          {legacyDiagnosis && <p className="text-sm"><span className="text-gray-500">{t("patients.toothDiagnosis")}:</span> {legacyDiagnosis}</p>}
          {legacyTreatment && <p className="text-sm"><span className="text-gray-500">{t("patients.toothTreatment")}:</span> {legacyTreatment}</p>}
          {legacyFinding && <p className="text-sm"><span className="text-gray-500">{t("patients.toothFinding")}:</span> {legacyFinding}</p>}
        </div>
      )}

      {/* Visit-wide treatment status */}
      <Select value={visualStatus} onValueChange={setVisualStatus}>
        <SelectTrigger>
          <SelectValue placeholder="Treatment Status" />
        </SelectTrigger>
        <SelectContent>
          {VISUAL_STATUS_OPTIONS.map((v) => (
            <SelectItem key={v.value} value={v.value}>
              {v.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Textarea
        placeholder="Additional Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      {/* General medications — one list per prescription, never per tooth */}
      <MedicationPicker />
    </div>
  );
};

export default PrescriptionForm;