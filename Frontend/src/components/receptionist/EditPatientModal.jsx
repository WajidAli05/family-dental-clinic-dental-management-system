import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePatientStore } from "@/store/patientStore";
import Wavify from "react-wavify";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import PatientFormFields from "@/components/patients/PatientFormFields";
import AllergyAlert from "@/components/patients/AllergyAlert";
import Odontogram from "@/components/patients/Odontogram";
import { useTranslation } from "react-i18next";
import { EMPTY_PATIENT_FIELDS, mapPatientToFormFields, buildMedicalFieldsPayload } from "@/utils/patientForm";

const EMPTY_FORM = {
  name: "",
  age: "",
  gender: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  status: "active",
  ...EMPTY_PATIENT_FIELDS,
};

const EditPatientModal = ({ open, onOpenChange, patient }) => {
  const { t } = useTranslation();
  const { updatePatient, fetchPatients, fetchPatientStats } = usePatientStore();

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [notification, setNotification] = useState(null); // { type, message }
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!patient) return;
    const original = patient.original || {};

    setFormData({
      name: original.name ?? patient.name ?? "",
      age: original.age ?? patient.age ?? "",
      gender: original.gender ?? "",
      phone: original.phone ?? patient.phone ?? "",
      email: original.email ?? "",
      address: original.address ?? "",
      city: original.city ?? "",
      status: original.status || "active",
      ...mapPatientToFormFields(original),
    });
    setErrors({});
    setNotification(null);
  }, [patient]);

  const hasPolicyNumberOnFile = Boolean(patient?.insurance?.hasPolicyNumber);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    if (notification) setNotification(null);
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

  const handleClose = () => {
    if (isLoading) return;
    setErrors({});
    setNotification(null);
    setIsLoading(false);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!patient) return;

    if (!validateForm()) {
      setNotification({
        type: "error",
        message: "Please fill in all required fields correctly.",
      });
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
        status: formData.status,
        age: formData.dateOfBirth ? undefined : parseInt(formData.age, 10),
        dateOfBirth: formData.dateOfBirth || null,
        nationality: formData.nationality,
        preferredLanguage: formData.preferredLanguage,
        country: formData.country,
        postalCode: formData.postalCode,
        referralSource: formData.referralSource,
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

      await updatePatient(patient.id, payload);

      setNotification({
        type: "success",
        message: `Patient ${formData.name} has been updated successfully!`,
      });

      if (typeof fetchPatients === "function") await fetchPatients();
      if (typeof fetchPatientStats === "function") await fetchPatientStats();

      setTimeout(() => {
        handleClose();
      }, 900);
    } catch (error) {
      setIsLoading(false);
      setNotification({
        type: "error",
        message: error?.message || "Failed to update patient. Please try again.",
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !isLoading) handleClose();
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
              Edit Patient
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Update patient details
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-5">
          <AllergyAlert allergies={formData.allergies} />

          <div className="space-y-2">
            <Label className="text-sm font-medium">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleChange("status", value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <PatientFormFields
            values={formData}
            onChange={handleChange}
            errors={errors}
            disabled={isLoading}
            hasPolicyNumberOnFile={hasPolicyNumberOnFile}
            showLastVisit={false}
          />

          <div className="space-y-2 pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-4">
              {t("patients.sectionOdontogram")}
            </p>
            <Odontogram odontogram={patient?.odontogram || []} editable={false} />
          </div>

          {/* Notification */}
          {notification ? (
            <Alert
              className={`${
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
              <AlertDescription className="ml-2">
                {notification.message}
              </AlertDescription>
            </Alert>
          ) : null}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
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
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditPatientModal;
