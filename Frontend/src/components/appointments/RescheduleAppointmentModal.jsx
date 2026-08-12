import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowRight, CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useDentistStore } from "@/store/dentistStore";

/**
 * Reschedule prompt — shows the CURRENT slot for reference and requires a NEW
 * date/time (optionally a different dentist).
 *
 * `onSubmit({ date, time, dentistId })` should hit the role's
 * PATCH /appointments/:id/reschedule endpoint. The SERVER is authoritative:
 * it re-runs assertNoSlotConflict against the new target and 409s if taken —
 * that error is surfaced here so the user can pick another slot without
 * losing what they typed.
 */
const RescheduleAppointmentModal = ({ open, onOpenChange, appointment, onSubmit }) => {
  const { t } = useTranslation();
  const dentists = useDentistStore((s) => s.dentists);
  const fetchAllDentists = useDentistStore((s) => s.fetchAllDentists);

  const [form, setForm] = useState({ date: "", time: "", dentistId: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !appointment) return;
    fetchAllDentists?.();
    // Start blank on date/time so the user must consciously choose a NEW slot
    // rather than accidentally "rescheduling" to the same one.
    setForm({ date: "", time: "", dentistId: appointment.dentistId || "" });
  }, [open, appointment, fetchAllDentists]);

  if (!open || !appointment) return null;

  const handleSubmit = async () => {
    if (!form.date) return toast.error(t("appointments.newDateRequired"));
    if (!form.time) return toast.error(t("appointments.newTimeRequired"));

    setSaving(true);
    try {
      await onSubmit?.({ date: form.date, time: form.time, dentistId: form.dentistId });
      // Modal is closed by the caller on success so the list can refresh first.
    } catch (e) {
      // 409 => new slot taken; keep the modal open so another slot can be picked
      toast.error(e.message || t("appointments.slotTaken"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("appointments.rescheduleTitle")}</DialogTitle>
          <DialogDescription>{t("appointments.rescheduleSubtitle")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current slot — reference only. Values are data, never translated. */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              {t("appointments.currentSlot")}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <CalendarClock className="h-4 w-4 text-gray-400" />
              <span className="font-semibold text-gray-900">
                {appointment.date} · {appointment.time}
              </span>
              {appointment.dentistName && (
                <span className="text-gray-500">— {appointment.dentistName}</span>
              )}
              <ArrowRight className="h-4 w-4 text-[#2ec4b6] rtl:rotate-180" />
              <span className="text-gray-500">
                {form.date || form.time
                  ? `${form.date || "…"} · ${form.time || "…"}`
                  : t("appointments.pickNewSlot")}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t("appointments.newDate")}</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                disabled={saving}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("appointments.newTime")}</Label>
              <Input
                type="time"
                value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                disabled={saving}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>{t("appointments.dentistLabel")}</Label>
            <Select
              value={form.dentistId || undefined}
              onValueChange={(v) => setForm((f) => ({ ...f, dentistId: v }))}
              disabled={saving}
            >
              <SelectTrigger><SelectValue placeholder={t("appointments.dentistLabel")} /></SelectTrigger>
              <SelectContent>
                {(dentists || []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}{d.specialization ? ` — ${d.specialization}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-gray-500">{t("appointments.rescheduleNote")}</p>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t("appointments.toothCancel", "Cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={saving} className="bg-[#2ec4b6] hover:bg-[#26a699]">
              {saving
                ? <><Loader2 className="h-4 w-4 me-2 animate-spin" />{t("appointments.rescheduling")}</>
                : t("appointments.confirmReschedule")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RescheduleAppointmentModal;
