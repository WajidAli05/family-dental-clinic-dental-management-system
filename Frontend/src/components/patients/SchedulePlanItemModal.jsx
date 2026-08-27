import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { typeKey } from "@/lib/appointmentConfig";

/**
 * Appointment PICKER for scheduling an accepted item — never a raw ID prompt.
 *
 * The list comes from GET .../patients/:id/plan-appointments, which returns
 * only slot-occupying appointments: completed / cancelled / no-show ones have
 * released their slot and cannot be booked into. The server re-checks both the
 * patient and the status, so this only removes guesswork; it is not the guard.
 */
const SchedulePlanItemModal = ({ open, onOpenChange, patientId, api, onPick }) => {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState("");

  useEffect(() => {
    if (!open || !patientId) return;
    let alive = true;
    setLoading(true);
    setPicked("");
    api
      .listPlanAppointments(patientId)
      .then((res) => { if (alive) setRows(res?.data || []); })
      .catch((e) => { if (alive) toast.error(e.message || t("treatmentPlans.loadError")); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [open, patientId, api, t]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("treatmentPlans.scheduleTitle")}</DialogTitle>
          <DialogDescription>{t("treatmentPlans.scheduleSubtitle")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>{t("treatmentPlans.pickAppointment")}</Label>
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
                <SelectContent>
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
      </DialogContent>
    </Dialog>
  );
};

export default SchedulePlanItemModal;
