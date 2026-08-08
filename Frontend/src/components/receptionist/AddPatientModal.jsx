import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePatientStore } from "@/store/patientStore";
import { receptionistApi } from "@/lib/receptionistApi";
import Wavify from "react-wavify";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import PatientFormFields from "@/components/patients/PatientFormFields";
import { EMPTY_PATIENT_FIELDS, buildMedicalFieldsPayload } from "@/utils/patientForm";

const AddPatientModal = ({ open, onOpenChange }) => {
  const { addPatient, createPatient, fetchPatients, fetchPatientStats } =
    usePatientStore();

  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    ...EMPTY_PATIENT_FIELDS,
  });

  const [errors, setErrors] = useState({});
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [phoneWarning, setPhoneWarning] = useState([]);
  const [acknowledgedDuplicate, setAcknowledgedDuplicate] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    if (notification) setNotification(null);
    if (field === "phone") {
      setPhoneWarning([]);
      setAcknowledgedDuplicate(false);
    }
  };

  const handlePhoneBlur = async () => {
    const phone = formData.phone.trim();
    if (!phone) return;
    try {
      const res = await receptionistApi.checkPhone(phone);
      setPhoneWarning(res?.data || []);
    } catch {
      // silently ignore — the submit will catch real errors
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = "Name is required";

    if (!formData.dateOfBirth) {
      const ageNum = Number(formData.age);
      if (!formData.age || Number.isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
        newErrors.age = "Valid age is required (1-120)";
      }
    }

    if (!formData.gender) newErrors.gender = "Gender is required";

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else {
      const internationalPhoneRegex = /^\+?[\d\s\-()]+$/;
      const digitsOnly = formData.phone.replace(/\D/g, "");
      if (
        !internationalPhoneRegex.test(formData.phone) ||
        digitsOnly.length < 6 ||
        digitsOnly.length > 15
      ) {
        newErrors.phone = "Enter a valid phone number (6-15 digits)";
      }
    }

    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = "Invalid email format";
      }
    }

    if (!formData.address.trim()) newErrors.address = "Address is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetAndClose = () => {
    setFormData({ name: "", age: "", gender: "", phone: "", email: "", address: "", city: "", ...EMPTY_PATIENT_FIELDS });
    setErrors({});
    setNotification(null);
    setIsLoading(false);
    setPhoneWarning([]);
    setAcknowledgedDuplicate(false);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setNotification({ type: "error", message: "Please fill in all required fields correctly." });
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        name: formData.name,
        gender: formData.gender,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        city: formData.city,
        age: formData.dateOfBirth ? undefined : parseInt(formData.age, 10),
        dateOfBirth: formData.dateOfBirth || null,
        nationality: formData.nationality,
        preferredLanguage: formData.preferredLanguage,
        country: formData.country,
        postalCode: formData.postalCode,
        referralSource: formData.referralSource,
        // lastVisit is deliberately omitted — it's system-managed, derived
        // from the patient's actual appointment history, never hand-typed
        // for a brand-new patient who hasn't been seen yet.
        emergencyContact: {
          name: formData.emergencyContactName,
          relationship: formData.emergencyContactRelationship,
          phone: formData.emergencyContactPhone,
        },
        insurance: {
          provider: formData.insuranceProvider,
          ...(formData.insurancePolicyNumber.trim() ? { policyNumber: formData.insurancePolicyNumber.trim() } : {}),
        },
        ...buildMedicalFieldsPayload(formData),
      };

      if (acknowledgedDuplicate) payload.allowDuplicatePhone = true;

      if (typeof createPatient === "function") {
        await createPatient(payload);
      } else {
        addPatient(payload);
      }

      setNotification({
        type: "success",
        message: `Patient ${formData.name} has been registered successfully!`,
      });

      if (typeof fetchPatients === "function") await fetchPatients();
      if (typeof fetchPatientStats === "function") await fetchPatientStats();

      setTimeout(() => { resetAndClose(); }, 900);
    } catch (error) {
      setIsLoading(false);
      setNotification({
        type: "error",
        message: error?.message || "Failed to register patient. Please try again.",
      });
    }
  };

  const handleCancel = () => {
    if (isLoading) return;
    resetAndClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !isLoading) handleCancel();
        else onOpenChange(isOpen);
      }}
    >
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        {/* Header with Wave */}
        <div className="relative overflow-hidden rounded-t-lg -mx-6 -mt-6 mb-4">
          <Wavify
            fill="#2ec4b6"
            paused={false}
            options={{ height: 15, amplitude: 20, speed: 0.2, points: 3 }}
            className="absolute bottom-0 left-0 w-full opacity-20"
          />
          <DialogHeader className="relative z-10 p-6 pb-8">
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Add New Patient
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Register a new patient to the system
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6">
          <PatientFormFields
            values={formData}
            onChange={handleChange}
            errors={errors}
            disabled={isLoading}
            showLastVisit={false}
            onPhoneBlur={handlePhoneBlur}
            phoneWarning={phoneWarning}
            acknowledgedDuplicate={acknowledgedDuplicate}
            onAcknowledgeDuplicateChange={setAcknowledgedDuplicate}
          />

          {/* Notification */}
          {notification ? (
            <Alert
              className={`mt-5 ${
                notification.type === "success"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              {notification.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className="ml-2">{notification.message}</AlertDescription>
            </Alert>
          ) : null}

          {/* Buttons */}
          <div className="flex gap-3 pt-5">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-[#2ec4b6] hover:bg-[#26a699] text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                "Register Patient"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddPatientModal;
