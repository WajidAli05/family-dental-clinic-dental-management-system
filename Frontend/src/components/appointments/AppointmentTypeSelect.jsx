import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { APPOINTMENT_TYPES, typeKey } from "@/lib/appointmentConfig";

/**
 * Appointment type picker, driven entirely by APPOINTMENT_TYPES so the option
 * list exists in exactly one place per tier. Optional by design — leaving it
 * unset is valid and matches how existing appointments behave.
 */
const AppointmentTypeSelect = ({ value, onChange, disabled = false, showLabel = true }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-1">
      {showLabel && <Label>{t("appointments.typeLabel")}</Label>}
      <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={t("appointments.typeSelect")} />
        </SelectTrigger>
        <SelectContent>
          {APPOINTMENT_TYPES.map((tp) => (
            <SelectItem key={tp} value={tp}>{t(typeKey(tp))}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default AppointmentTypeSelect;
