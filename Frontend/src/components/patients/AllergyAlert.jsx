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

  return (
    <div className="rounded-xl border-2 border-red-300 bg-red-50 p-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-red-800 uppercase tracking-wide">
            {t("patients.allergyAlertTitle")}
          </p>
          {subtitle && <p className="text-xs text-red-700 mb-1">{subtitle}</p>}
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {allergies.map((a, idx) => (
              <span
                key={`${a.allergen}-${idx}`}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  SEVERITY_STYLES[a.severity] || SEVERITY_STYLES.moderate
                }`}
              >
                {a.allergen}
                <span className="opacity-70">
                  ({t(SEVERITY_LABEL_KEYS[a.severity] || SEVERITY_LABEL_KEYS.moderate)})
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllergyAlert;
