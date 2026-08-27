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
/**
 * `contentClassName` exists for nested use: the portaled SelectContent is z-50
 * by default, which renders behind a dialog opened inside a patient modal.
 * Default undefined => every existing usage is unchanged. See lib/zLayers.js.
 */
const AppointmentTypeSelect = ({ value, onChange, disabled = false, showLabel = true, contentClassName }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-1">
      {showLabel && <Label>{t("appointments.typeLabel")}</Label>}
      <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={t("appointments.typeSelect")} />
        </SelectTrigger>
        <SelectContent className={contentClassName}>
          {APPOINTMENT_TYPES.map((tp) => (
            <SelectItem key={tp} value={tp}>{t(typeKey(tp))}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default AppointmentTypeSelect;
