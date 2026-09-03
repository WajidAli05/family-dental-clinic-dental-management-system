import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Trash2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOwnerPatientsStore } from "@/store/ownerPatientsStore";
import { useFormatMoney } from "@/store/clinicConfigStore";
import { ownerApi } from "@/lib/ownerApi";
import AllergyAlert from "@/components/patients/AllergyAlert";
import Odontogram from "@/components/patients/Odontogram";
import TreatmentPlanPanel from "@/components/patients/TreatmentPlanPanel";
import PatientImagingPanel from "@/components/patients/PatientImagingPanel";
import PatientDocumentsPanel from "@/components/patients/PatientDocumentsPanel";
import { useOwnerClinicalMasterStore } from "@/store/ownerClinicalMasterStore";
import { deriveClinicalOptions } from "@/lib/clinicalOptions";

const PREGNANCY_LABEL_KEYS = {
  "not applicable": "patients.pregnancyNotApplicable",
  "not pregnant": "patients.pregnancyNotPregnant",
  pregnant: "patients.pregnancyPregnant",
  unknown: "patients.pregnancyUnknown",
};

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

const OwnerPatientProfileModal = ({ open, patient, onClose }) => {
  const { t } = useTranslation();
  const money = useFormatMoney();
  const seedDemoProfile = useOwnerPatientsStore((s) => s.seedDemoProfile);
  const fetchProfile = useOwnerPatientsStore((s) => s.fetchProfile);
  const confirmAndDeletePatient = useOwnerPatientsStore((s) => s.confirmAndDeletePatient);
  const erasePatient = useOwnerPatientsStore((s) => s.erasePatient);
  const loading = useOwnerPatientsStore((s) => s.loading);

  const [profileState, setProfileState] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [eraseOpen, setEraseOpen] = useState(false);
  const [eraseConfirmText, setEraseConfirmText] = useState("");
  const [odontogram, setOdontogram] = useState([]);
  // Derived planned/completed overlay lifted from the treatment-plan panel.
  const [planOverlay, setPlanOverlay] = useState({});

  // Teeth flagged xrayRequested by prescribing (shared/patients.js merges the
  // chart + prescription flags), so the gallery can show what is outstanding.
  const xrayRequestedTeeth = useMemo(
    () => (odontogram || []).filter((e) => e?.xrayRequested).map((e) => e.toothNumber).filter(Boolean),
    [odontogram]
  );

  /**
   * Clinical-master options for the tooth dialog. Reuses the SAME store the
   * Clinical Library page already fills (one fetch path, one derivation) —
   * without these the tooth dialog silently degrades to free-text inputs.
   * Selectors take raw arrays, never a new object literal: a literal makes
   * zustand v5 + React 19 loop on useSyncExternalStore.
   */
  const cmTreatments = useOwnerClinicalMasterStore((s) => s.treatments);
  const cmDiagnosis = useOwnerClinicalMasterStore((s) => s.diagnosisTemplates);
  const cmFindings = useOwnerClinicalMasterStore((s) => s.clinicalFindingTemplates);
  const initClinicalMaster = useOwnerClinicalMasterStore((s) => s.init);

  const clinicalOptions = useMemo(
    () => deriveClinicalOptions({
      diagnosisTemplates: cmDiagnosis,
      treatments: cmTreatments,
      clinicalFindingTemplates: cmFindings,
    }),
    [cmDiagnosis, cmTreatments, cmFindings]
  );

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!open || !patient?.id) return;

      // Idempotent (guarded by `initialized`), so opening the modal repeatedly
      // does not refetch the catalogue.
      initClinicalMaster?.();

      // instant UI
      setProfileState(seedDemoProfile(patient.id));
      setOdontogram(patient.odontogram || []);

      // real profile
      const real = await fetchProfile(patient.id);
      if (alive && real) setProfileState(real);
    }

    run();
    return () => {
      alive = false;
    };
  }, [open, patient?.id, seedDemoProfile, fetchProfile]);

  const handleSaveTooth = async (toothNumber, entry) => {
    try {
      const res = await ownerApi.updateOdontogram(patient.id, { toothNumber, ...entry });
      setOdontogram(res?.data || []);
    } catch (e) {
      toast.error(e.message || "Failed to save tooth chart");
    }
  };

  const profile = useMemo(() => {
    return profileState || { history: [], invoices: [], labs: [], treatments: [] };
  }, [profileState]);

  if (!open || !patient) return null;

  const alreadyInactive = String(patient.status || "").toLowerCase() === "inactive";
  const alreadyErased = Array.isArray(patient.tags) && patient.tags.includes("erased");

  return (
    <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Roomy on desktop, still full-width on small screens. 92vh keeps the
          header + allergy banner pinned while the body scrolls beneath. */}
      <div className="w-full max-w-6xl rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {patient.name}
            </h3>
            <p className="text-xs text-gray-500">
              {patient.id} • {patient.phone} • {patient.city}
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              <Pill>Age: {patient.age ?? "-"}</Pill>
              <Pill>Gender: {patient.gender ?? "-"}</Pill>
              <Pill>Dentist: {patient.dentist ?? "-"}</Pill>
              <Pill>Last Visit: {patient.lastVisit ?? "-"}</Pill>
              <Pill>Status: {patient.status ?? "-"}</Pill>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              className="rounded-xl"
              disabled={loading || alreadyInactive}
              onClick={() => setConfirmOpen(true)}
              title={alreadyInactive ? "Patient is already inactive" : undefined}
            >
              <Trash2 className="h-4 w-4 me-2" />
              {loading ? "Updating..." : "Delete"}
            </Button>

            <Button
              variant="outline"
              className="rounded-xl border-red-300 text-red-700 hover:bg-red-50"
              disabled={loading || alreadyErased}
              onClick={() => { setEraseConfirmText(""); setEraseOpen(true); }}
              title={alreadyErased ? "This patient's data has already been erased" : "Permanently erase this patient's personal data (PDPL)"}
            >
              <ShieldAlert className="h-4 w-4 me-2" />
              {alreadyErased ? "Erased" : "Erase Data"}
            </Button>

            <Button variant="ghost" className="rounded-xl" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Allergy alert — unmissable, right under the header */}
        {patient.allergies?.length > 0 && (
          <div className="px-5 pt-4">
            <AllergyAlert allergies={patient.allergies} />
          </div>
        )}

        {/* Body (scrollable) */}
        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-y-auto flex-1 min-h-0">
          <div className="lg:col-span-3">
            <Panel title={t("patients.sectionIdentity")}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 text-sm">
                <DetailField label={t("patients.dob")} value={patient.dateOfBirth || "—"} />
                <DetailField label={t("patients.nationality")} value={patient.nationality || "—"} />
                <DetailField label={t("patients.preferredLanguage")} value={patient.preferredLanguage ? t(`language.${patient.preferredLanguage}`) : "—"} />
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

          {(patient.allergies?.length > 0 || patient.medicalHistory || patient.currentMedications ||
            patient.existingConditions || patient.previousSurgeries || patient.pregnancyStatus ||
            patient.dentalHistory || patient.previousTreatments) && (
            <div className="lg:col-span-3">
              <Panel title={t("patients.sectionMedical")}>
                {patient.allergies?.length > 0 && (
                  <div className="mb-4">
                    <AllergyAlert allergies={patient.allergies} />
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 text-sm">
                  <DetailField label={t("patients.medicalHistory")} value={patient.medicalHistory || "—"} />
                  <DetailField label={t("patients.currentMedications")} value={patient.currentMedications || "—"} />
                  <DetailField label={t("patients.existingConditions")} value={patient.existingConditions || "—"} />
                  <DetailField label={t("patients.previousSurgeries")} value={patient.previousSurgeries || "—"} />
                  <DetailField label={t("patients.dentalHistory")} value={patient.dentalHistory || "—"} />
                  <DetailField label={t("patients.previousTreatments")} value={patient.previousTreatments || "—"} />
                  {patient.pregnancyStatus && (
                    <DetailField
                      label={t("patients.pregnancyStatus")}
                      value={t(PREGNANCY_LABEL_KEYS[patient.pregnancyStatus] || "patients.pregnancyUnknown")}
                    />
                  )}
                </div>
              </Panel>
            </div>
          )}

          <div className="lg:col-span-3">
            <Panel title={t("patients.sectionOdontogram")}>
              <Odontogram
                odontogram={odontogram}
                editable
                chartClinical
                onSave={handleSaveTooth}
                planOverlay={planOverlay}
                clinicalOptions={clinicalOptions}
              />
            </Panel>
          </div>

          {/* Owner may edit any plan — the server gate agrees (role === "owner"). */}
          <div className="lg:col-span-3">
            <Panel title={t("treatmentPlans.title")}>
              <div className="max-h-[42vh] overflow-y-auto pe-1">
                <TreatmentPlanPanel patientId={patient.id} api={ownerApi} odontogram={odontogram} onOverlayChange={setPlanOverlay} canEdit />
              </div>
            </Panel>
          </div>

          <div className="lg:col-span-3">
            <Panel title={t("imaging.title")}>
              <div className="max-h-[42vh] overflow-y-auto pe-1">
                <PatientImagingPanel
                  patientId={patient.id}
                  api={ownerApi}
                  xrayRequestedTeeth={xrayRequestedTeeth}
                  canEdit
                />
              </div>
            </Panel>
          </div>

          <div className="lg:col-span-3">
            <Panel title={t("documents.title")}>
              <div className="max-h-[42vh] overflow-y-auto pe-1">
                <PatientDocumentsPanel patient={patient} api={ownerApi} />
              </div>
            </Panel>
          </div>

          <Panel title="History">
            <Timeline items={profile.history} />
          </Panel>

          <Panel title="Invoices">
            <SimpleList
              items={profile.invoices.map((x) => ({
                left: x.id,
                right: `${x.date} • ${money(x.amount)} • ${x.status}`,
              }))}
              empty="No invoices found."
            />
          </Panel>

          <Panel title="Lab Samples">
            <SimpleList
              items={profile.labs.map((x) => ({
                left: x.id,
                right: `${x.date} • ${x.type} • ${x.status}`,
              }))}
              empty="No lab samples found."
            />
          </Panel>

          <div className="lg:col-span-3">
            <Panel title="Treatments">
              <SimpleList
                items={profile.treatments.map((x) => ({
                  left: x.id,
                  right: `${x.date} • ${x.title}`,
                }))}
                empty="No treatments found."
              />
            </Panel>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 flex items-center justify-end">
          <Button variant="outline" className="rounded-xl" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* ✅ Custom Confirmation Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title="Mark patient as inactive?"
        description={`This will mark ${patient.name} (${patient.id}) as inactive. No data will be deleted.`}
        confirmText={loading ? "Updating..." : "Yes, mark inactive"}
        cancelText="Cancel"
        disabled={loading}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          try {
            await confirmAndDeletePatient(patient.id); // marks inactive
            setConfirmOpen(false);
            onClose();
          } catch {
            // store already has error; keep dialog open if needed
          }
        }}
      />

      {/* Right-to-erasure confirmation — irreversible, requires typing the exact patient ID */}
      {eraseOpen && (
        <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h4 className="text-base font-semibold text-red-700 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" /> Erase patient data?
              </h4>
              <p className="mt-1 text-sm text-gray-600">
                This permanently replaces {patient.name}'s name, phone, email, and address with
                anonymized placeholders and clears their prescription clinical notes. Financial
                records (invoices) and the audit trail are preserved. <strong>This cannot be undone.</strong>
              </p>
              <p className="mt-3 text-xs font-semibold text-gray-700">
                Type <span className="font-mono bg-gray-100 px-1 rounded">{patient.id}</span> to confirm:
              </p>
              <Input
                value={eraseConfirmText}
                onChange={(e) => setEraseConfirmText(e.target.value)}
                placeholder={patient.id}
                className="mt-2"
                autoFocus
              />
            </div>
            <div className="p-5 flex items-center justify-end gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setEraseOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="rounded-xl"
                disabled={loading || eraseConfirmText !== patient.id}
                onClick={async () => {
                  try {
                    await erasePatient(patient.id, eraseConfirmText);
                    toast.success(`Patient data erased for ${patient.id}.`);
                    setEraseOpen(false);
                    onClose();
                  } catch (e) {
                    toast.error(e.message || "Failed to erase patient data.");
                  }
                }}
              >
                {loading ? "Erasing..." : "Erase permanently"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ConfirmDialog = ({
  open,
  title,
  description,
  confirmText,
  cancelText,
  disabled,
  onClose,
  onConfirm,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h4 className="text-base font-semibold text-gray-900">{title}</h4>
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        </div>

        <div className="p-5 flex items-center justify-end gap-2">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={onClose}
            disabled={disabled}
          >
            {cancelText}
          </Button>

          <Button
            variant="destructive"
            className="rounded-xl"
            onClick={onConfirm}
            disabled={disabled}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

const Panel = ({ title, children }) => (
  <div className="rounded-2xl border border-gray-100 bg-white p-4">
    <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
    <div className="mt-3">{children}</div>
  </div>
);

const DetailField = ({ label, value }) => (
  <div className="min-w-0">
    <p className="text-xs text-gray-400">{label}</p>
    <p className="text-gray-800 truncate">{value}</p>
  </div>
);

const Timeline = ({ items = [] }) => {
  if (!items.length) return <p className="text-sm text-gray-500">No history found.</p>;

  return (
    <div className="space-y-3">
      {items.map((x, idx) => (
        <div key={idx} className="flex items-start gap-3">
          <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[#2ec4b6]" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">{x.type}</p>
            <p className="text-xs text-gray-500">{x.date}</p>
            <p className="text-sm text-gray-700 mt-1">{x.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

const SimpleList = ({ items = [], empty }) => {
  if (!items.length) return <p className="text-sm text-gray-500">{empty}</p>;

  return (
    <div className="space-y-2">
      {items.map((x, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2"
        >
          <p className="text-sm font-semibold text-gray-900">{x.left}</p>
          <p className="text-xs text-gray-600 text-end">{x.right}</p>
        </div>
      ))}
    </div>
  );
};

export default OwnerPatientProfileModal;