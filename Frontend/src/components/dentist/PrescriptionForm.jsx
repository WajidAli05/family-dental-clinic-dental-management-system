import { useEffect, useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { BadgeDollarSign } from "lucide-react";

import { VISUAL_STATUS_OPTIONS } from "./options";
import { usePrescriptionStore } from "@/store/prescriptionStore";
import { useDentistClinicalMasterStore } from "@/store/dentistClinicalMasterStore";
import MedicationPicker from "./MedicationPicker";
import { useFormatMoney } from "@/store/clinicConfigStore";

const PrescriptionForm = () => {
  const money = useFormatMoney();
  const {
    diagnosis,
    treatment,
    clinicalFinding,
    visualStatus,
    notes,
    setDiagnosis,
    setTreatment,
    setClinicalFinding,
    setVisualStatus,
    setNotes,
  } = usePrescriptionStore();

  const cmLoading = useDentistClinicalMasterStore((s) => s.loading);
  const cmLoaded = useDentistClinicalMasterStore((s) => s.loaded);
  const cmError = useDentistClinicalMasterStore((s) => s.error);
  const treatments = useDentistClinicalMasterStore((s) => s.treatments);
  const diagnosisTemplates = useDentistClinicalMasterStore((s) => s.diagnosisTemplates);
  const clinicalFindingTemplates = useDentistClinicalMasterStore((s) => s.clinicalFindingTemplates);
  const fetchClinicalMaster = useDentistClinicalMasterStore((s) => s.fetchClinicalMaster);

  // ✅ fetch once (on first mount)
  useEffect(() => {
    if (!cmLoaded) fetchClinicalMaster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ active-only + convert to string arrays
  const DIAGNOSIS_OPTIONS = useMemo(() => {
    return (diagnosisTemplates || [])
      .filter((d) => d?.active !== false)
      .map((d) => String(d?.title || "").trim())
      .filter(Boolean);
  }, [diagnosisTemplates]);

  const TREATMENT_OPTIONS = useMemo(() => {
    return (treatments || [])
      .filter((t) => t?.active !== false)
      .map((t) => String(t?.name || "").trim())
      .filter(Boolean);
  }, [treatments]);

  const selectedTreatmentFee = useMemo(() => {
    if (!treatment) return null;
    const found = (treatments || []).find(
      (t) => String(t?.name || "").trim() === treatment
    );
    return found?.fee > 0 ? Number(found.fee) : null;
  }, [treatment, treatments]);

  const CLINICAL_FINDINGS = useMemo(() => {
    return (clinicalFindingTemplates || [])
      .filter((c) => c?.active !== false)
      .map((c) => String(c?.title || "").trim())
      .filter(Boolean);
  }, [clinicalFindingTemplates]);

  const showLoadingLabel = cmLoading && !cmLoaded;

  return (
    <div className="space-y-4">
      {/* Diagnosis */}
      <Select value={diagnosis} onValueChange={setDiagnosis}>
        <SelectTrigger>
          <SelectValue
            placeholder={
              showLoadingLabel ? "Loading diagnosis..." : "Select Diagnosis"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {DIAGNOSIS_OPTIONS.length > 0 ? (
            DIAGNOSIS_OPTIONS.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">
              {cmError ? "Failed to load diagnosis" : "No diagnosis available"}
            </div>
          )}
        </SelectContent>
      </Select>

      {/* Treatment */}
      <div className="space-y-1">
        <Select value={treatment} onValueChange={setTreatment}>
          <SelectTrigger>
            <SelectValue
              placeholder={
                showLoadingLabel ? "Loading treatments..." : "Select Treatment"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {TREATMENT_OPTIONS.length > 0 ? (
              TREATMENT_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500">
                {cmError ? "Failed to load treatments" : "No treatments available"}
              </div>
            )}
          </SelectContent>
        </Select>
        {selectedTreatmentFee !== null && (
          <p className="flex items-center gap-1 text-xs text-teal-600 font-medium pl-1">
            <BadgeDollarSign className="w-3.5 h-3.5" />
            Fee: {money(selectedTreatmentFee)}
          </p>
        )}
      </div>

      {/* Clinical Findings */}
      <Select value={clinicalFinding} onValueChange={setClinicalFinding}>
        <SelectTrigger>
          <SelectValue
            placeholder={
              showLoadingLabel ? "Loading findings..." : "Clinical Findings"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {CLINICAL_FINDINGS.length > 0 ? (
            CLINICAL_FINDINGS.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">
              {cmError ? "Failed to load findings" : "No findings available"}
            </div>
          )}
        </SelectContent>
      </Select>

      {/* Visual Indicator */}
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

      {/* Medications */}
      <MedicationPicker />
    </div>
  );
};

export default PrescriptionForm;