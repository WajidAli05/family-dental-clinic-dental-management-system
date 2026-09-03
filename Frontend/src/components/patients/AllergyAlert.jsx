import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";

const SEVERITY_STYLES = {
  severe:   "bg-red-100 text-red-800 border-red-300",
  moderate: "bg-amber-100 text-amber-800 border-amber-300",
  mild:     "bg-yellow-50 text-yellow-800 border-yellow-200",
};

const SEVERITY_LABEL_KEYS = {
  severe:   "patients.severitySevere",
  moderate: "patients.severityModerate",
  mild:     "patients.severityMild",
};

/**
 * Advisory-only allergy banner — surfaces the patient's OWN recorded
 * allergies wherever a clinician acts clinically (patient profile header,
 * dentist prescribing flow). Not a drug-interaction check; renders nothing
 * when the patient has no recorded allergies.
 */
const AllergyAlert = ({ allergies = [], subtitle }) => {
  const { t } = useTranslation();

  if (!Array.isArray(allergies) || allergies.length === 0) return null;

  // Compact by design: safety-critical, so always visible, but a single slim
  // row with the chips inline rather than the padded block that was eating a
  // third of the patient modal.
  return (
    <div className="rounded-lg border border-red-300 bg-red-50 px-2.5 py-1.5">
      <div className="flex items-center gap-x-2 gap-y-1 flex-wrap">
        <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
        <span className="text-xs font-bold text-red-800 uppercase tracking-wide">
          {t("patients.allergyAlertTitle")}
        </span>
        {subtitle && <span className="text-[11px] text-red-700">{subtitle}</span>}
        {allergies.map((a, idx) => (
          <span
            key={`${a.allergen}-${idx}`}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
              SEVERITY_STYLES[a.severity] || SEVERITY_STYLES.moderate
            }`}
          >
            {/* Allergen names are patient data — never translated. */}
            {a.allergen}
            <span className="opacity-70">
              ({t(SEVERITY_LABEL_KEYS[a.severity] || SEVERITY_LABEL_KEYS.moderate)})
            </span>
          </span>
        ))}
      </div>
    </div>
  );
};

export default AllergyAlert;
