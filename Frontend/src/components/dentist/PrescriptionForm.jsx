import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import {
  DIAGNOSIS_OPTIONS,
  TREATMENT_OPTIONS,
  CLINICAL_FINDINGS,
  VISUAL_STATUS_OPTIONS,
} from "./options";

import { usePrescriptionStore } from "@/store/prescriptionStore";

const PrescriptionForm = () => {
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

  return (
    <div className="space-y-4">

      {/* Diagnosis */}
      <Select value={diagnosis} onValueChange={setDiagnosis}>
        <SelectTrigger>
          <SelectValue placeholder="Select Diagnosis" />
        </SelectTrigger>
        <SelectContent>
          {DIAGNOSIS_OPTIONS.map((d) => (
            <SelectItem key={d} value={d}>{d}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Treatment */}
      <Select value={treatment} onValueChange={setTreatment}>
        <SelectTrigger>
          <SelectValue placeholder="Select Treatment" />
        </SelectTrigger>
        <SelectContent>
          {TREATMENT_OPTIONS.map((t) => (
            <SelectItem key={t} value={t}>{t}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clinical Findings */}
      <Select value={clinicalFinding} onValueChange={setClinicalFinding}>
        <SelectTrigger>
          <SelectValue placeholder="Clinical Findings" />
        </SelectTrigger>
        <SelectContent>
          {CLINICAL_FINDINGS.map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
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
    </div>
  );
};

export default PrescriptionForm;