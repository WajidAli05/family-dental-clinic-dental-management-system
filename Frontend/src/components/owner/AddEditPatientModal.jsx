import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ownerApi } from "@/lib/ownerApi";
import { toast } from "sonner";
import Wavify from "react-wavify";
import PatientFormFields from "@/components/patients/PatientFormFields";
import { EMPTY_PATIENT_FIELDS, mapPatientToFormFields } from "@/utils/patientForm";

const EMPTY = {
  name: "", phone: "", age: "", gender: "", address: "",
  city: "", email: "", lastVisit: "",
  ...EMPTY_PATIENT_FIELDS,
};

const AddEditPatientModal = ({ open, patient, onOpenChange, onSuccess }) => {
  const isEdit = !!patient;
  const [form, setForm] = useState({ ...EMPTY });
  const [submitting, setSubmitting] = useState(false);

  const [phoneWarning, setPhoneWarning] = useState([]);
  const [acknowledgedDuplicate, setAcknowledgedDuplicate] = useState(false);

  useEffect(() => {
    if (open) {
      setPhoneWarning([]);
      setAcknowledgedDuplicate(false);
      setForm(patient
        ? {
            name:      patient.name      || "",
            phone:     patient.phone     || "",
            age:       patient.age       != null ? String(patient.age) : "",
            gender:    patient.gender    || "",
            address:   patient.address   || "",
            city:      patient.city      || "",
            email:     patient.email     || "",
            lastVisit: patient.lastVisit || "",
            ...mapPatientToFormFields(patient),
          }
        : { ...EMPTY }
      );
    }
  }, [open, patient]);

  const hasPolicyNumberOnFile = Boolean(patient?.insurance?.hasPolicyNumber);

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "phone") {
      setPhoneWarning([]);
      setAcknowledgedDuplicate(false);
    }
  };

  const handlePhoneBlur = async () => {
    if (isEdit) return; // warning only on add
    const phone = form.phone.trim();
    if (!phone) return;
    try {
      const res = await ownerApi.checkPhone(phone);
      setPhoneWarning(res?.data || []);
    } catch {
      // silently ignore
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim())    return toast.error("Name is required");
    if (!form.phone.trim())   return toast.error("Phone is required");
    if (!form.address.trim()) return toast.error("Address is required");

    const ageNum = form.age !== "" ? Number(form.age) : null;
    if (!form.dateOfBirth && ageNum !== null && (Number.isNaN(ageNum) || ageNum < 1 || ageNum > 120)) {
      return toast.error("Age must be 1–120");
    }

    setSubmitting(true);
    try {
      const body = {
        name:      form.name.trim(),
        phone:     form.phone.trim(),
        address:   form.address.trim(),
        city:      form.city.trim(),
        email:     form.email.trim(),
        gender:    form.gender,
        dateOfBirth:       form.dateOfBirth || null,
        nationality:       form.nationality.trim(),
        preferredLanguage: form.preferredLanguage,
        country:           form.country.trim(),
        postalCode:        form.postalCode.trim(),
        referralSource:    form.referralSource,
        emergencyContact: {
          name:         form.emergencyContactName.trim(),
          relationship: form.emergencyContactRelationship.trim(),
          phone:        form.emergencyContactPhone.trim(),
        },
        insurance: {
          provider: form.insuranceProvider.trim(),
          // write-only: only send policyNumber if the user actually typed one
          ...(form.insurancePolicyNumber.trim() ? { policyNumber: form.insurancePolicyNumber.trim() } : {}),
        },
        ...(!form.dateOfBirth && ageNum !== null ? { age: ageNum } : {}),
        // lastVisit is system-managed (derived from real appointments) — only
        // an EXISTING patient's record can be manually corrected by an owner;
        // a brand-new patient never has one, so it's never sent on create.
        ...(isEdit ? { lastVisit: form.lastVisit } : {}),
      };

      if (!isEdit && acknowledgedDuplicate) body.allowDuplicatePhone = true;

      if (isEdit) {
        await ownerApi.updatePatient(patient.id, body);
        toast.success("Patient updated");
      } else {
        await ownerApi.createPatient(body);
        toast.success("Patient added");
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e.message || "Failed to save patient");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!submitting) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        {/* Header with Wave — matches receptionist's add/edit patient modals */}
        <div className="relative overflow-hidden rounded-t-lg -mx-6 -mt-6 mb-4">
          <Wavify
            fill="#2ec4b6"
            paused={false}
            options={{ height: 15, amplitude: 20, speed: 0.2, points: 3 }}
            className="absolute bottom-0 left-0 w-full opacity-20"
          />
          <DialogHeader className="relative z-10 p-6 pb-8">
            <DialogTitle className="text-2xl font-bold text-gray-900">
              {isEdit ? "Edit Patient" : "Add New Patient"}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {isEdit ? "Update patient details" : "Register a new patient to the system"}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6">
          <PatientFormFields
            values={form}
            onChange={onChange}
            disabled={submitting}
            hasPolicyNumberOnFile={hasPolicyNumberOnFile}
            showLastVisit={isEdit}
            onPhoneBlur={handlePhoneBlur}
            phoneWarning={isEdit ? [] : phoneWarning}
            acknowledgedDuplicate={acknowledgedDuplicate}
            onAcknowledgeDuplicateChange={setAcknowledgedDuplicate}
          />

          <div className="flex justify-end gap-2 pt-5">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-[#2ec4b6] hover:bg-[#26a699]">
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : (isEdit ? "Save Changes" : "Add Patient")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddEditPatientModal;
