import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { User, Phone, MapPin, Calendar, Mail, Building2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { computeAgeFromDOB } from "@/utils/computeAge";

/**
 * Shared field set for patient registration/edit forms — used by owner and
 * receptionist Add/Edit modals so the two roles capture the same fields and
 * stay visually consistent. Each modal keeps its own submit/validation/API
 * logic; only the field layout lives here.
 *
 * `values` shape: name, phone, age, gender, email, address, city, country,
 * postalCode, dateOfBirth, nationality, preferredLanguage, referralSource,
 * emergencyContactName, emergencyContactRelationship, emergencyContactPhone,
 * insuranceProvider, insurancePolicyNumber, lastVisit (only used if showLastVisit).
 */
const PatientFormFields = ({
  values,
  onChange,
  errors = {},
  disabled = false,
  hasPolicyNumberOnFile = false,
  showLastVisit = false,
  onPhoneBlur,
  phoneWarning = [],
  acknowledgedDuplicate = false,
  onAcknowledgeDuplicateChange,
}) => {
  const { t } = useTranslation();

  const set = (field) => (e) => onChange(field, e.target.value);
  const errClass = (field) => (errors[field] ? "border-red-500" : "");

  const handleDobChange = (e) => {
    const dob = e.target.value;
    onChange("dateOfBirth", dob);
    if (dob) onChange("age", String(computeAgeFromDOB(dob) ?? ""));
  };

  return (
    <div className="space-y-6">
      {/* ---------- Personal Info ---------- */}
      <div className="space-y-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {t("patients.sectionIdentity")}
        </p>

        <div className="space-y-2">
          <Label>Full Name <span className="text-red-500">*</span></Label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              value={values.name}
              onChange={set("name")}
              placeholder="e.g. Ali Raza"
              className={`pl-10 ${errClass("name")}`}
              disabled={disabled}
            />
          </div>
          {errors.name ? <p className="text-sm text-red-500">{errors.name}</p> : null}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Phone <span className="text-red-500">*</span></Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                value={values.phone}
                onChange={set("phone")}
                onBlur={onPhoneBlur}
                placeholder="0300..."
                className={`pl-10 ${errClass("phone")}`}
                disabled={disabled}
              />
            </div>
            {errors.phone ? <p className="text-sm text-red-500">{errors.phone}</p> : null}
          </div>

          <div className="space-y-2">
            <Label>Email <span className="text-gray-400">(Optional)</span></Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="email"
                value={values.email}
                onChange={set("email")}
                placeholder="patient@example.com"
                className={`pl-10 ${errClass("email")}`}
                disabled={disabled}
              />
            </div>
            {errors.email ? <p className="text-sm text-red-500">{errors.email}</p> : null}
          </div>
        </div>

        {phoneWarning.length > 0 && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm">
            <p className="font-medium text-amber-800 mb-1">
              {phoneWarning.length} patient{phoneWarning.length > 1 ? "s" : ""} already registered with this number:
            </p>
            <ul className="list-disc list-inside text-amber-700 mb-2 space-y-0.5">
              {phoneWarning.map((p) => (
                <li key={p.publicId}>
                  {p.name}{p.publicId ? ` (${p.publicId})` : ""}{p.age ? `, age ${p.age}` : ""}
                </li>
              ))}
            </ul>
            <label className="flex items-center gap-2 cursor-pointer text-amber-900 select-none">
              <input
                type="checkbox"
                checked={acknowledgedDuplicate}
                onChange={(e) => onAcknowledgeDuplicateChange?.(e.target.checked)}
                className="accent-amber-600"
              />
              Different family member — register anyway
            </label>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("patients.dob")}</Label>
            <Input type="date" value={values.dateOfBirth} onChange={handleDobChange} disabled={disabled} />
          </div>
          <div className="space-y-2">
            <Label>Age {!values.dateOfBirth && <span className="text-red-500">*</span>}</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="number" min="1" max="120"
                value={values.age}
                onChange={set("age")}
                placeholder="Age"
                className={`pl-10 ${errClass("age")}`}
                disabled={disabled || Boolean(values.dateOfBirth)}
                title={values.dateOfBirth ? "Derived from date of birth" : undefined}
              />
            </div>
            {errors.age ? <p className="text-sm text-red-500">{errors.age}</p> : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Gender <span className="text-red-500">*</span></Label>
            <Select value={values.gender} onValueChange={(v) => onChange("gender", v)} disabled={disabled}>
              <SelectTrigger className={errClass("gender")}><SelectValue placeholder="Select gender" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.gender ? <p className="text-sm text-red-500">{errors.gender}</p> : null}
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input value={values.city} onChange={set("city")} placeholder="e.g. Rawalpindi" className="pl-10" disabled={disabled} />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Address <span className="text-red-500">*</span></Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Textarea
              value={values.address}
              onChange={set("address")}
              placeholder="Enter complete address"
              className={`pl-10 min-h-[70px] ${errClass("address")}`}
              disabled={disabled}
            />
          </div>
          {errors.address ? <p className="text-sm text-red-500">{errors.address}</p> : null}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("patients.country")}</Label>
            <Input value={values.country} onChange={set("country")} disabled={disabled} />
          </div>
          <div className="space-y-2">
            <Label>{t("patients.postalCode")}</Label>
            <Input value={values.postalCode} onChange={set("postalCode")} disabled={disabled} />
          </div>
          <div className="space-y-2">
            <Label>{t("patients.nationality")}</Label>
            <Input value={values.nationality} onChange={set("nationality")} disabled={disabled} />
          </div>
          <div className="space-y-2">
            <Label>{t("patients.preferredLanguage")}</Label>
            <Select value={values.preferredLanguage} onValueChange={(v) => onChange("preferredLanguage", v)} disabled={disabled}>
              <SelectTrigger><SelectValue placeholder={t("patients.referralSelect")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t("language.en")}</SelectItem>
                <SelectItem value="ur">{t("language.ur")}</SelectItem>
                <SelectItem value="ar">{t("language.ar")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("patients.referralSource")}</Label>
            <Select value={values.referralSource} onValueChange={(v) => onChange("referralSource", v)} disabled={disabled}>
              <SelectTrigger><SelectValue placeholder={t("patients.referralSelect")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="walk-in">{t("patients.referralWalkIn")}</SelectItem>
                <SelectItem value="referral">{t("patients.referralReferral")}</SelectItem>
                <SelectItem value="online">{t("patients.referralOnline")}</SelectItem>
                <SelectItem value="social">{t("patients.referralSocial")}</SelectItem>
                <SelectItem value="other">{t("patients.referralOther")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showLastVisit && (
            <div className="space-y-2">
              <Label>Last Visit</Label>
              <Input type="date" value={values.lastVisit || ""} onChange={set("lastVisit")} disabled={disabled} />
            </div>
          )}
        </div>
      </div>

      {/* ---------- Emergency Contact ---------- */}
      <div className="space-y-2 pt-2 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-4">
          {t("patients.sectionEmergency")}
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Input
            placeholder={t("patients.emergencyContactName")}
            value={values.emergencyContactName}
            onChange={set("emergencyContactName")}
            disabled={disabled}
          />
          <Input
            placeholder={t("patients.emergencyContactRelationship")}
            value={values.emergencyContactRelationship}
            onChange={set("emergencyContactRelationship")}
            disabled={disabled}
          />
          <Input
            className="col-span-2"
            placeholder={t("patients.emergencyContactPhone")}
            value={values.emergencyContactPhone}
            onChange={set("emergencyContactPhone")}
            disabled={disabled}
          />
        </div>
      </div>

      {/* ---------- Insurance ---------- */}
      <div className="space-y-2 pt-2 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-4">
          {t("patients.sectionInsurance")}
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Input
            placeholder={t("patients.insuranceProvider")}
            value={values.insuranceProvider}
            onChange={set("insuranceProvider")}
            disabled={disabled}
          />
          <div className="space-y-1">
            <Input
              placeholder={hasPolicyNumberOnFile ? t("patients.insurancePolicyPlaceholderSet") : t("patients.insurancePolicyPlaceholderUnset")}
              value={values.insurancePolicyNumber}
              onChange={set("insurancePolicyNumber")}
              disabled={disabled}
            />
            {hasPolicyNumberOnFile && (
              <p className="text-[11px] text-gray-400">{t("patients.insurancePolicyOnFile")}</p>
            )}
          </div>
        </div>
      </div>

      {/* ---------- Medical Information ---------- */}
      <div className="space-y-4 pt-2 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-4">
          {t("patients.sectionMedical")}
        </p>

        <div className="space-y-2">
          <Label>{t("patients.allergies")}</Label>
          <AllergyListEditor
            allergies={values.allergies || []}
            onChange={(next) => onChange("allergies", next)}
            disabled={disabled}
            t={t}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("patients.medicalHistory")}</Label>
            <Textarea
              value={values.medicalHistory || ""}
              onChange={set("medicalHistory")}
              className="min-h-[70px]"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("patients.currentMedications")}</Label>
            <Textarea
              value={values.currentMedications || ""}
              onChange={set("currentMedications")}
              className="min-h-[70px]"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("patients.existingConditions")}</Label>
            <Textarea
              value={values.existingConditions || ""}
              onChange={set("existingConditions")}
              className="min-h-[70px]"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("patients.previousSurgeries")}</Label>
            <Textarea
              value={values.previousSurgeries || ""}
              onChange={set("previousSurgeries")}
              className="min-h-[70px]"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("patients.dentalHistory")}</Label>
            <Textarea
              value={values.dentalHistory || ""}
              onChange={set("dentalHistory")}
              className="min-h-[70px]"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("patients.previousTreatments")}</Label>
            <Textarea
              value={values.previousTreatments || ""}
              onChange={set("previousTreatments")}
              className="min-h-[70px]"
              disabled={disabled}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t("patients.pregnancyStatus")}</Label>
          <Select
            value={values.pregnancyStatus || ""}
            onValueChange={(v) => onChange("pregnancyStatus", v)}
            disabled={disabled}
          >
            <SelectTrigger className="max-w-xs"><SelectValue placeholder={t("patients.pregnancyStatusSelect")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="not applicable">{t("patients.pregnancyNotApplicable")}</SelectItem>
              <SelectItem value="not pregnant">{t("patients.pregnancyNotPregnant")}</SelectItem>
              <SelectItem value="pregnant">{t("patients.pregnancyPregnant")}</SelectItem>
              <SelectItem value="unknown">{t("patients.pregnancyUnknown")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

/** Structured allergen + severity rows, add/remove — feeds the `allergies`
 * array field as [{allergen, severity}]. */
const AllergyListEditor = ({ allergies, onChange, disabled, t }) => {
  const updateRow = (idx, key, value) => {
    const next = allergies.map((a, i) => (i === idx ? { ...a, [key]: value } : a));
    onChange(next);
  };

  const removeRow = (idx) => onChange(allergies.filter((_, i) => i !== idx));

  const addRow = () => onChange([...allergies, { allergen: "", severity: "moderate" }]);

  return (
    <div className="space-y-2">
      {allergies.length === 0 && (
        <p className="text-xs text-gray-400">{t("patients.noAllergies")}</p>
      )}

      {allergies.map((a, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <Input
            placeholder={t("patients.allergen")}
            value={a.allergen || ""}
            onChange={(e) => updateRow(idx, "allergen", e.target.value)}
            disabled={disabled}
            className="flex-1"
          />
          <Select
            value={a.severity || "moderate"}
            onValueChange={(v) => updateRow(idx, "severity", v)}
            disabled={disabled}
          >
            <SelectTrigger className="w-32"><SelectValue placeholder={t("patients.severity")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mild">{t("patients.severityMild")}</SelectItem>
              <SelectItem value="moderate">{t("patients.severityModerate")}</SelectItem>
              <SelectItem value="severe">{t("patients.severitySevere")}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeRow(idx)}
            disabled={disabled}
            className="text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addRow}
        disabled={disabled}
        className="mt-1"
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        {t("patients.addAllergy")}
      </Button>
    </div>
  );
};

export default PatientFormFields;
