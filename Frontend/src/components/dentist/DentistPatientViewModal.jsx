import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import AllergyAlert from "@/components/patients/AllergyAlert";

const REFERRAL_LABEL_KEYS = {
  "walk-in": "patients.referralWalkIn",
  referral: "patients.referralReferral",
  online: "patients.referralOnline",
  social: "patients.referralSocial",
  other: "patients.referralOther",
};

const Pill = ({ children }) => (
  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
    {children}
  </span>
);

const DetailField = ({ label, value }) => (
  <div className="min-w-0">
    <p className="text-xs text-gray-400">{label}</p>
    <p className="text-gray-800 truncate">{value}</p>
  </div>
);

const Panel = ({ title, children }) => (
  <div className="rounded-2xl border border-gray-100 bg-white p-4">
    <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
    <div className="mt-3">{children}</div>
  </div>
);

// Read-only patient summary for the dentist. The tooth chart deliberately
// does NOT live here — on the dentist side the odontogram belongs to the
// prescribing flow (StartPrescriptionModal), where charting happens in the
// clinical context of a visit. Owner keeps the profile odontogram.
const DentistPatientViewModal = ({ open, patient, onClose }) => {
  const { t } = useTranslation();

  if (!open || !patient) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{patient.name}</h3>
            <p className="text-xs text-gray-500">
              {patient.id || patient.publicId} • {patient.phone} • {patient.city}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Pill>Age: {patient.age ?? "-"}</Pill>
              <Pill>Gender: {patient.gender ?? "-"}</Pill>
              <Pill>Last Visit: {patient.lastVisit || "-"}</Pill>
              <Pill>Status: {patient.status ?? "-"}</Pill>
            </div>
          </div>
          <Button variant="ghost" className="rounded-xl" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {patient.allergies?.length > 0 && (
          <div className="px-5 pt-4">
            <AllergyAlert allergies={patient.allergies} />
          </div>
        )}

        <div className="p-5 overflow-y-auto space-y-4">
          <Panel title={t("patients.sectionIdentity")}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 text-sm">
              <DetailField label={t("patients.dob")} value={patient.dateOfBirth || "—"} />
              <DetailField label={t("patients.nationality")} value={patient.nationality || "—"} />
              <DetailField
                label={t("patients.preferredLanguage")}
                value={patient.preferredLanguage ? t(`language.${patient.preferredLanguage}`) : "—"}
              />
              <DetailField
                label={t("patients.referralSource")}
                value={patient.referralSource ? t(REFERRAL_LABEL_KEYS[patient.referralSource] || "patients.referralOther") : "—"}
              />
              <DetailField label={t("patients.country")} value={patient.country || "—"} />
              <DetailField label={t("patients.postalCode")} value={patient.postalCode || "—"} />
            </div>

            {(patient.emergencyContact?.name || patient.emergencyContact?.phone) && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t("patients.sectionEmergency")}</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                  <DetailField label={t("patients.emergencyContactName")} value={patient.emergencyContact?.name || "—"} />
                  <DetailField label={t("patients.emergencyContactRelationship")} value={patient.emergencyContact?.relationship || "—"} />
                  <DetailField label={t("patients.emergencyContactPhone")} value={patient.emergencyContact?.phone || "—"} />
                </div>
              </div>
            )}

            {(patient.insurance?.provider || patient.insurance?.hasPolicyNumber) && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t("patients.sectionInsurance")}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <DetailField label={t("patients.insuranceProvider")} value={patient.insurance?.provider || "—"} />
                  <DetailField
                    label={t("patients.insurancePolicyNumber")}
                    value={patient.insurance?.hasPolicyNumber ? t("patients.insurancePolicyOnFile") : "—"}
                  />
                </div>
              </div>
            )}
          </Panel>
        </div>

        <div className="p-5 border-t border-gray-100 flex items-center justify-end">
          <Button variant="outline" className="rounded-xl" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DentistPatientViewModal;
