import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePatientStore } from "@/store/patientStore";
import Wavify from "react-wavify";
import {
  User,
  Phone,
  MapPin,
  Calendar,
  Mail,
  Building2,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

const EMPTY_FORM = {
  name: "",
  age: "",
  gender: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  status: "active",
};

const EditPatientModal = ({ open, onOpenChange, patient }) => {
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
    });
    setErrors({});
    setNotification(null);
  }, [patient]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    if (notification) setNotification(null);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = "Name is required";

    const ageNum = Number(formData.age);
    if (!formData.age || Number.isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      newErrors.age = "Valid age is required (1-120)";
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
        ...formData,
        age: parseInt(formData.age, 10),
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

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !isLoading) {
      e.preventDefault();
      handleSubmit();
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

        <div className="space-y-5 px-6 pb-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-name" className="text-sm font-medium">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="edit-name"
                placeholder="Enter patient's full name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                onKeyPress={handleKeyPress}
                className={`pl-10 ${errors.name ? "border-red-500" : ""}`}
                disabled={isLoading}
              />
            </div>
            {errors.name ? (
              <p className="text-sm text-red-500">{errors.name}</p>
            ) : null}
          </div>

          {/* Age and Gender */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-age" className="text-sm font-medium">
                Age <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="edit-age"
                  type="number"
                  placeholder="Age"
                  value={formData.age}
                  onChange={(e) => handleChange("age", e.target.value)}
                  onKeyPress={handleKeyPress}
                  className={`pl-10 ${errors.age ? "border-red-500" : ""}`}
                  min="1"
                  max="120"
                  disabled={isLoading}
                />
              </div>
              {errors.age ? (
                <p className="text-sm text-red-500">{errors.age}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-gender" className="text-sm font-medium">
                Gender <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => handleChange("gender", value)}
                disabled={isLoading}
              >
                <SelectTrigger className={errors.gender ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.gender ? (
                <p className="text-sm text-red-500">{errors.gender}</p>
              ) : null}
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="edit-phone" className="text-sm font-medium">
              Phone Number <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="edit-phone"
                placeholder="+1 555 123 4567"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                onKeyPress={handleKeyPress}
                className={`pl-10 ${errors.phone ? "border-red-500" : ""}`}
                disabled={isLoading}
              />
            </div>
            {errors.phone ? (
              <p className="text-sm text-red-500">{errors.phone}</p>
            ) : null}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="edit-email" className="text-sm font-medium">
              Email Address <span className="text-gray-400">(Optional)</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="edit-email"
                type="email"
                placeholder="patient@example.com"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                onKeyPress={handleKeyPress}
                className={`pl-10 ${errors.email ? "border-red-500" : ""}`}
                disabled={isLoading}
              />
            </div>
            {errors.email ? (
              <p className="text-sm text-red-500">{errors.email}</p>
            ) : null}
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="edit-address" className="text-sm font-medium">
              Address <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Textarea
                id="edit-address"
                placeholder="Enter complete address"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                className={`pl-10 min-h-[80px] ${
                  errors.address ? "border-red-500" : ""
                }`}
                disabled={isLoading}
              />
            </div>
            {errors.address ? (
              <p className="text-sm text-red-500">{errors.address}</p>
            ) : null}
          </div>

          {/* City and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-city" className="text-sm font-medium">
                City
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="edit-city"
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status" className="text-sm font-medium">
                Status
              </Label>
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
          <div className="flex gap-3 pt-4">
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
