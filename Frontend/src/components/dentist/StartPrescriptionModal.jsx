import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { usePrescriptionStore } from "@/store/prescriptionStore";
import { printPrescription, buildRxPatient } from "@/utils/printPrescription";

import PatientTypeSelector from "./PatientTypeSelector";
import PrescriptionForm from "./PrescriptionForm";
import PrescriptionPreview from "./PrescriptionPreview";
import AllergyAlert from "@/components/patients/AllergyAlert";
import Odontogram from "@/components/patients/Odontogram";
import { useUserStore } from "@/store/userStore";
import { useDentistClinicalMasterStore } from "@/store/dentistClinicalMasterStore";

import { dentistApi } from "@/lib/dentistApi";

const fmtDate = (d) => {
  if (!d) return "—";
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-PK"); } catch { return d; }
};

const StartPrescriptionModal = ({ open, onOpenChange, appointment, prescription }) => {
  const { t } = useTranslation();
  const currentUser = useUserStore((s) => s.currentUser);
  const store = usePrescriptionStore();
  const saving   = usePrescriptionStore((s) => s.saving);
  const error    = usePrescriptionStore((s) => s.error);
  const storeId  = usePrescriptionStore((s) => s._id);

  const [history, setHistory] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [odontogram, setOdontogram] = useState([]);
  const [isMyPatient, setIsMyPatient] = useState(false);
  const [patientMeta, setPatientMeta] = useState({ age: "", gender: "", dateOfBirth: "" });

  const patientId = appointment?.patientId || appointment?.patient?.publicId || "";
  const appointmentId = appointment?.id || appointment?.publicId || "";

  // Write access mirrors the server rule (assertDentistCanEditChart): the
  // dentist has an appointment with this patient. We are prescribing FROM an
  // appointment here, so the patient-list flag (isMyPatient, appointment-
  // derived) is authoritative; fall back to this appointment's own dentist so
  // editing works on first render before the list row resolves.
  const isTreatingDentist =
    Boolean(currentUser?.publicId) &&
    currentUser.publicId === (appointment?.dentistId || "");
  const canEditChart = isMyPatient || isTreatingDentist;

  // Select the raw arrays (stable store references), then derive the option
  // lists with useMemo. A selector returning a NEW object literal each call
  // makes zustand v5's useSyncExternalStore snapshot change on every render,
  // which React 19 treats as an infinite loop and throws on — that crashed
  // this component (and the dashboard that renders it) on mount.
  const diagnosisTemplates = useDentistClinicalMasterStore((s) => s.diagnosisTemplates);
  const treatments = useDentistClinicalMasterStore((s) => s.treatments);
  const clinicalFindingTemplates = useDentistClinicalMasterStore((s) => s.clinicalFindingTemplates);
  const fetchClinicalMaster = useDentistClinicalMasterStore((s) => s.fetchClinicalMaster);
  const cmLoaded = useDentistClinicalMasterStore((s) => s.loaded);

  const clinicalOptions = useMemo(() => ({
    diagnosis: (diagnosisTemplates || []).filter((d) => d?.active !== false).map((d) => String(d?.title || "").trim()).filter(Boolean),
    treatment: (treatments || []).filter((x) => x?.active !== false).map((x) => String(x?.name || "").trim()).filter(Boolean),
    clinicalFinding: (clinicalFindingTemplates || []).filter((c) => c?.active !== false).map((c) => String(c?.title || "").trim()).filter(Boolean),
  }), [diagnosisTemplates, treatments, clinicalFindingTemplates]);

  // On open: hydrate or reset; fetch history + the patient's own recorded
  // allergies (advisory-only safety check — not a drug-interaction database)
  // and odontogram, so the assigned dentist can view/set tooth status without
  // leaving the prescribing flow — same component + endpoint as the profile
  // chart, so both stay in sync.
  // On close: reset store and clear history so the next patient starts clean.
  useEffect(() => {
    if (!open) {
      store.reset();
      setHistory([]);
      setAllergies([]);
      setOdontogram([]);
      setIsMyPatient(false);
      setPatientMeta({ age: "", gender: "", dateOfBirth: "" });
      return;
    }

    if (!cmLoaded) fetchClinicalMaster?.();

    if (prescription) {
      store.hydrateFromBackend(prescription);
      store.setAppointmentId(appointmentId);
    } else {
      store.reset();
      store.setPatientId(patientId);
      store.setAppointmentId(appointmentId);
      store.setDate(appointment?.date || new Date().toISOString().slice(0, 10));
    }

    if (patientId) {
      dentistApi
        .getPatientPrescriptionHistory(patientId)
        .then((res) => setHistory(res?.data || []))
        .catch(() => {});

      dentistApi
        .getPatients({ q: patientId })
        .then((res) => {
          // Exact match on publicId — the search is a fuzzy $or (name/phone/
          // publicId), so blindly taking [0] could grab the wrong patient.
          const row = (res?.data || []).find((r) => r.id === patientId);
          setAllergies(row?.allergies || []);
          setOdontogram(row?.odontogram || []);
          setIsMyPatient(Boolean(row?.isMyPatient));
          setPatientMeta({ age: row?.age ?? "", gender: row?.gender || "", dateOfBirth: row?.dateOfBirth || "" });
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSaveTooth = async (toothNumber, { condition, note }) => {
    try {
      // appointmentId lets the server authorize the treating dentist for this
      // visit, not just the patient's assigned dentist.
      const res = await dentistApi.updateOdontogram(patientId, { toothNumber, condition, note, appointmentId });
      setOdontogram(res?.data || []);
    } catch (e) {
      toast.error(e.message || "Failed to save tooth chart");
    }
  };

  // Per-tooth clinical entry lives in prescription state until the
  // prescription itself is saved. `null` removes the tooth's entry.
  const handleClinicalChange = (toothNumber, entry) => {
    if (entry === null) store.removeToothEntry(toothNumber);
    else store.upsertToothEntry(toothNumber, entry);
  };

  // Reset store and start a blank prescription for this patient/date.
  const handleNewPrescription = () => {
    store.reset();
    store.setPatientId(patientId);
    store.setAppointmentId(appointmentId);
    store.setDate(appointment?.date || new Date().toISOString().slice(0, 10));
  };

  const handleSave = async () => {
    try {
      const isNew = !storeId;
      await store.saveOrUpdate({
        patientId,
        date: appointment?.date || "",
      });

      toast.success(isNew ? "Prescription saved" : "Prescription updated");
      onOpenChange(false);
    } catch (e) {
      toast.error(e.message || "Failed to save prescription");
    }
  };

  const handlePrint = () => {
    printPrescription({
      ...store,
      // Identity block via the shared builder so this path and the
      // appointments-table path always produce the same shape.
      ...buildRxPatient(
        {
          patientName:
            appointment?.patientName ||
            appointment?.patient?.name ||
            appointment?.patient ||
            "",
          patientId,
        },
        { age: patientMeta.age, gender: patientMeta.gender, dob: patientMeta.dateOfBirth },
        appointment
      ),
      dentistName: currentUser?.name || "",
      dentistSpecialization: currentUser?.specialization || "",
      dentistRegNo: currentUser?.registrationNumber || currentUser?.licenseNumber || "",
    });
  };

  const modalTitle = store.patientType
    ? (storeId ? "Edit Prescription" : "New Prescription")
    : "Select Patient Type";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
        </DialogHeader>

        {/* ── Allergy alert — must be visible before/at prescribing ── */}
        <AllergyAlert allergies={allergies} subtitle={t("patients.allergyAlertPrescribing")} />

        {/* ── Odontogram — same component/endpoint as the patient profile chart ── */}
        {patientId && (
          <div className="rounded-xl border border-gray-100 bg-white p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                {t("patients.sectionOdontogram")}
              </p>
              <p className="text-xs text-gray-500">{t("patients.odontogramHint")}</p>
            </div>
            <Odontogram
              odontogram={odontogram}
              editable={canEditChart}
              onSave={handleSaveTooth}
              clinical
              toothEntries={store.toothEntries || []}
              onClinicalChange={handleClinicalChange}
              clinicalOptions={clinicalOptions}
            />
          </div>
        )}

        {/* ── Patient history panel ── */}
        {history.length > 0 && (
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Patient History
            </p>

            <div className="space-y-0.5">
              {history.map((rx) => {
                const rxId   = rx._id || rx.id;
                const active = storeId === rxId;
                return (
                  <button
                    key={rxId}
                    type="button"
                    onClick={() => store.hydrateFromBackend(rx)}
                    className={[
                      "w-full rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                      active
                        ? "bg-[#2ec4b6] text-white"
                        : "text-gray-600 hover:bg-white hover:text-gray-900",
                    ].join(" ")}
                  >
                    <span className="font-semibold">{fmtDate(rx.date)}</span>
                    {rx.diagnosis && (
                      <span className={active ? "ml-2 opacity-80" : "ml-2 text-gray-400"}>
                        {rx.diagnosis.length > 50
                          ? rx.diagnosis.slice(0, 50) + "…"
                          : rx.diagnosis}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleNewPrescription}
              className="mt-2 block text-xs font-medium text-[#2ec4b6] hover:text-[#26a699]"
            >
              + New Prescription
            </button>
          </div>
        )}

        {/* ── Main form ── */}
        {!store.patientType ? (
          <PatientTypeSelector onSelect={store.setPatientType} />
        ) : (
          <div className="space-y-6">
            <PrescriptionForm />
            <PrescriptionPreview
              patient={{
                name: appointment?.patientName || appointment?.patient?.name || "",
                id: patientId,
                age: patientMeta.age,
                gender: patientMeta.gender,
                dob: patientMeta.dateOfBirth,
              }}
            />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3">
              <Button
                className="flex-1 bg-[#2ec4b6]"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving…" : storeId ? "Update Prescription" : "Save Prescription"}
              </Button>

              <Button variant="outline" className="flex-1" onClick={handlePrint}>
                Print
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StartPrescriptionModal;
