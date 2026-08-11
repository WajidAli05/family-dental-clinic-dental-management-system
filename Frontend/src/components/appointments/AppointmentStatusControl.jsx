import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import {
  canonicalStatus, allowedNextStatuses, statusKey, statusBadgeClass,
} from "@/lib/appointmentConfig";

/**
 * Status badge + lifecycle advance control.
 *
 * Only statuses that are legal from the current one are offered — the same
 * transition table the server enforces (appointmentConfig), so the UI can't
 * present an action that would 400. Terminal states render as a badge only.
 *
 * `status` accepts any stored/humanised form (legacy included) — it is
 * canonicalized here, so old appointments show their modern equivalent.
 */
const AppointmentStatusControl = ({ status, allowedNext, onChange, disabled = false }) => {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const current = canonicalStatus(status);
  // Prefer the server-supplied list when present; fall back to the local table.
  const next = Array.isArray(allowedNext) && allowedNext.length
    ? allowedNext
    : allowedNextStatuses(current);

  const badge = (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${statusBadgeClass(current)}`}
    >
      {t(statusKey(current))}
    </span>
  );

  if (!onChange || disabled || next.length === 0) {
    return (
      <div className="flex items-center gap-2">
        {badge}
        {next.length === 0 && !disabled && (
          <span className="sr-only">{t("appointments.noTransitions")}</span>
        )}
      </div>
    );
  }

  const handle = async (value) => {
    setBusy(true);
    try {
      await onChange(value);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {badge}
      <Select value="" onValueChange={handle} disabled={busy}>
        <SelectTrigger
          className="h-7 w-[130px] text-xs"
          aria-label={t("appointments.advanceStatus")}
        >
          {busy
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : <SelectValue placeholder={t("appointments.advanceStatus")} />}
        </SelectTrigger>
        <SelectContent>
          {next.map((s) => (
            <SelectItem key={s} value={s} className="text-xs">
              {t(statusKey(s))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default AppointmentStatusControl;
