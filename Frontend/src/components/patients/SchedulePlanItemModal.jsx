import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, CalendarClock, CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { typeKey } from "@/lib/appointmentConfig";
import { NESTED_DIALOG, NESTED_POPOVER } from "@/lib/zLayers";
import { localISODate } from "@/utils/localISODate";
import { useClinicConfigStore } from "@/store/clinicConfigStore";
import AppointmentTypeSelect from "@/components/appointments/AppointmentTypeSelect";

/**
 * Schedules an accepted plan item — two paths, one dialog.
 *
 *   A. Use an existing UPCOMING appointment. Correct when the patient is in
 *      the chair now or already booked, and the only way to attach SEVERAL
 *      plan items to the SAME visit.
 *   B. Book a new appointment and link the item in one action.
 *
 * Path B does NOT re-implement booking: it posts to an endpoint that calls the
 * same createAppointmentCore (slot conflicts, dentist resolution, status) every
 * other booking flow uses, with past dates blocked. The `min` on the date input
 * is only a convenience — the server is the authority.
 */
const SchedulePlanItemModal = ({ open, onOpenChange, patientId, api, canPickDentist = true, onPick, onBooked }) => {
  const { t } = useTranslation();
  const timezone = useClinicConfigStore((s) => s.timezone);

  const [mode, setMode] = useState("existing"); // existing | new
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState("");

  const [dentists, setDentists] = useState([]);
  const [booking, setBooking] = useState(false);
  const [form, setForm] = useState({ dentistId: "", date: "", time: "", appointmentType: "" });

  // Clinic-timezone today — matches the server's clinicToday(), so the input's
  // floor and the server's rule agree.
  const today = useMemo(() => localISODate(new Date(), timezone), [timezone]);

  useEffect(() => {
    if (!open || !patientId) return;
    let alive = true;
    setMode("existing");
    setPicked("");
    setForm({ dentistId: "", date: "", time: "", appointmentType: "" });
    setLoading(true);

    api
      .listPlanAppointments(patientId)
      .then((res) => { if (alive) setRows(res?.data || []); })
      .catch((e) => { if (alive) toast.error(e.message || t("treatmentPlans.loadError")); })
      .finally(() => { if (alive) setLoading(false); });

    // A dentist books onto their own diary, so no picker is needed for them.
    if (canPickDentist && api.getDentists) {
      api.getDentists()
        .then((res) => { if (alive) setDentists(res?.data || []); })
        .catch(() => {});
    }
    return () => { alive = false; };
  }, [open, patientId, api, canPickDentist, t]);

  if (!open) return null;

  const canBook =
    !!form.date && !!form.time && (!canPickDentist || !!form.dentistId) && form.date >= today;

  const book = async () => {
    setBooking(true);
    try {
      await onBooked({
        dentistId: canPickDentist ? form.dentistId : undefined,
        date: form.date,
        time: form.time,
        appointmentType: form.appointmentType || undefined,
      });
      onOpenChange(false);
    } catch (e) {
      // Slot conflicts (409) and past dates (400) surface with the server text.
      toast.error(e.message || t("treatmentPlans.actionFailed"));
    } finally {
      setBooking(false);
    }
  };

  const TabButton = ({ id, icon: Icon, label }) => (
    <button
      type="button"
      onClick={() => setMode(id)}
      className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
        mode === id
          ? "border-[#2ec4b6] bg-[#2ec4b6]/10 text-gray-900"
          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Nested inside the patient profile modal — see lib/zLayers.js. */}
      <DialogContent className={`max-w-lg ${NESTED_DIALOG}`} overlayClassName={NESTED_DIALOG}>
        <DialogHeader>
          <DialogTitle>{t("treatmentPlans.scheduleTitle")}</DialogTitle>
          <DialogDescription>{t("treatmentPlans.scheduleSubtitle")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <TabButton id="existing" icon={CalendarClock} label={t("treatmentPlans.useExisting")} />
            <TabButton id="new" icon={CalendarPlus} label={t("treatmentPlans.bookNew")} />
          </div>

          {/* ── A: existing upcoming appointment ── */}
          {mode === "existing" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>{t("treatmentPlans.pickAppointment")}</Label>
                <p className="text-xs text-gray-500">{t("treatmentPlans.upcomingOnlyHint")}</p>
                {loading ? (
                  <div className="flex items-center gap-2 py-3 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> {t("treatmentPlans.loading")}
                  </div>
                ) : rows.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-gray-200 p-3 text-center text-sm text-gray-500">
                    {t("treatmentPlans.noAppointments")}
                  </p>
                ) : (
                  <Select value={picked || undefined} onValueChange={setPicked}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("treatmentPlans.pickAppointment")} />
                    </SelectTrigger>
                    <SelectContent className={NESTED_POPOVER}>
                      {rows.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {/* Appointment data is never translated — only the type label. */}
                          {a.date} {a.time} — {a.id}
                          {a.appointmentType ? ` (${t(typeKey(a.appointmentType))})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  {t("treatmentPlans.cancel")}
                </Button>
                <Button
                  className="bg-[#2ec4b6] hover:bg-[#26a699]"
                  disabled={!picked}
                  onClick={() => { onPick(picked); onOpenChange(false); }}
                >
                  <CalendarClock className="h-4 w-4 me-1" />
                  {t("treatmentPlans.itemStatus.scheduled")}
                </Button>
              </div>
            </div>
          )}

          {/* ── B: book a new appointment ── */}
          {mode === "new" && (
            <div className="space-y-3">
              {canPickDentist && (
                <div className="space-y-1">
                  <Label>{t("treatmentPlans.dentist")}</Label>
                  <Select
                    value={form.dentistId || undefined}
                    onValueChange={(v) => setForm((f) => ({ ...f, dentistId: v }))}
                    disabled={booking}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("treatmentPlans.dentist")} />
                    </SelectTrigger>
                    <SelectContent className={NESTED_POPOVER}>
                      {dentists.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}{d.specialization ? ` — ${d.specialization}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{t("treatmentPlans.date")}</Label>
                  <Input
                    type="date"
                    min={today} /* convenience only — the server re-checks */
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    disabled={booking}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("treatmentPlans.time")}</Label>
                  <Input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                    disabled={booking}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>{t("treatmentPlans.appointmentType")}</Label>
                {/* The same type selector the normal booking modals use. */}
                <AppointmentTypeSelect
                  value={form.appointmentType}
                  onChange={(v) => setForm((f) => ({ ...f, appointmentType: v }))}
                  disabled={booking}
                  showLabel={false}
                  contentClassName={NESTED_POPOVER}
                />
              </div>

              {form.date && form.date < today && (
                <p className="text-sm text-red-600">{t("treatmentPlans.pastDateBlocked")}</p>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={booking}>
                  {t("treatmentPlans.cancel")}
                </Button>
                <Button
                  className="bg-[#2ec4b6] hover:bg-[#26a699]"
                  disabled={!canBook || booking}
                  onClick={book}
                >
                  {booking ? <Loader2 className="h-4 w-4 me-1 animate-spin" /> : <CalendarPlus className="h-4 w-4 me-1" />}
                  {t("treatmentPlans.bookAndSchedule")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SchedulePlanItemModal;
