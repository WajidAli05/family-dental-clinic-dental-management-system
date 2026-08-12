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
import { Loader2, Search, User } from "lucide-react";
import { toast } from "sonner";

import { useDentistStore } from "@/store/dentistStore";
import { usePatientStore } from "@/store/patientStore";
import { receptionistApi } from "@/lib/receptionistApi";
import AppointmentTypeSelect from "@/components/appointments/AppointmentTypeSelect";
import { isEditLocked } from "@/lib/appointmentConfig";

/**
 * Full front-desk appointment edit — date, time, dentist, patient, type,
 * reason, notes. Hits PATCH /receptionist/appointments/:id, which is gated by
 * tab_receptionist_appointments and re-runs the shared slot-conflict check, so
 * an edit can never create a double-booking (409 surfaces here as a toast).
 *
 * Patient reassignment is opt-in: the current patient is kept unless the user
 * explicitly searches and picks a different one.
 */
const EditAppointmentModal = ({ open, onOpenChange, appointment, onSaved }) => {
  const { t } = useTranslation();
  const dentists = useDentistStore((s) => s.dentists);
  const fetchAllDentists = useDentistStore((s) => s.fetchAllDentists);
  const { lookupPatient } = usePatientStore();

  const [form, setForm] = useState({
    date: "", time: "", dentistId: "", appointmentType: "", reason: "", notes: "",
  });
  const [newPatient, setNewPatient] = useState(null); // null = keep current
  const [patientQuery, setPatientQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !appointment) return;
    fetchAllDentists?.();
    setForm({
      date:            appointment.date || "",
      time:            appointment.time || "",
      dentistId:       appointment.dentistId || "",
      appointmentType: appointment.appointmentType || "",
      reason:          appointment.reason || "",
      notes:           appointment.notes || "",
    });
    setNewPatient(null);
    setPatientQuery("");
  }, [open, appointment, fetchAllDentists]);

  if (!open || !appointment) return null;

  // Closed record — fields stay locked until the visit is reopened. The server
  // rejects the PATCH regardless (409 APPOINTMENT_EDIT_LOCKED); this keeps the
  // UI honest instead of letting the user type into a doomed form.
  const locked = appointment.editLocked ?? isEditLocked(appointment.statusCode || appointment.status);
  const disabled = saving || locked;

  const searchPatient = async () => {
    const q = patientQuery.trim();
    if (!q) return;
    setSearching(true);
    try {
      const found = await lookupPatient(q);
      setNewPatient(found);
    } catch (e) {
      toast.error(e.message || "Patient not found");
      setNewPatient(null);
    } finally {
      setSearching(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        date: form.date,
        time: form.time,
        dentistId: form.dentistId,
        appointmentType: form.appointmentType,
        reason: form.reason,
        notes: form.notes,
      };
      // Only send patientId when the user actually chose a different patient.
      if (newPatient?.id) payload.patientId = newPatient.id;

      const res = await receptionistApi.updateAppointment(appointment.id, payload);
      toast.success(t("appointments.saved"));
      onSaved?.(res?.data);
      onOpenChange(false);
    } catch (e) {
      // 409 from the shared slot-conflict check
      toast.error(e.message || t("appointments.slotTaken"));
    } finally {
      setSaving(false);
    }
  };

  const currentPatient = appointment.patientName || appointment.patient || "—";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("appointments.editTitle")}</DialogTitle>
          <DialogDescription>{t("appointments.editSubtitle")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {locked && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {t("appointments.editLockedHint")}
            </div>
          )}

          {/* Patient — current by default, replaceable */}
          <div className="space-y-1">
            <Label>{t("appointments.patientLabel")}</Label>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm flex items-center gap-2">
              <User className="h-4 w-4 text-[#2ec4b6]" />
              <span className="font-medium">
                {newPatient ? `${newPatient.name} (${newPatient.id})` : currentPatient}
              </span>
              {newPatient && (
                <button
                  type="button"
                  className="ms-auto text-xs text-red-500 hover:underline"
                  onClick={() => setNewPatient(null)}
                >
                  {t("appointments.keepPatient")}
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder={t("appointments.searchPatient")}
                value={patientQuery}
                onChange={(e) => setPatientQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchPatient()}
                disabled={disabled}
              />
              <Button
                type="button"
                variant="outline"
                onClick={searchPatient}
                disabled={disabled || searching || !patientQuery.trim()}
              >
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Dentist */}
          <div className="space-y-1">
            <Label>{t("appointments.dentistLabel")}</Label>
            <Select
              value={form.dentistId || undefined}
              onValueChange={(v) => setForm((f) => ({ ...f, dentistId: v }))}
              disabled={disabled}
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                disabled={disabled}
              />
            </div>
            <div className="space-y-1">
              <Label>Time</Label>
              <Input
                type="time"
                value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                disabled={disabled}
              />
            </div>
          </div>

          <AppointmentTypeSelect
            value={form.appointmentType}
            onChange={(v) => setForm((f) => ({ ...f, appointmentType: v }))}
            disabled={disabled}
          />

          <div className="space-y-1">
            <Label>Reason</Label>
            <Input
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              disabled={disabled}
            />
          </div>

          <div className="space-y-1">
            <Label>Notes</Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              disabled={disabled}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={disabled}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={disabled} className="bg-[#2ec4b6] hover:bg-[#26a699]">
              {saving ? <><Loader2 className="h-4 w-4 me-2 animate-spin" />Saving…</> : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditAppointmentModal;
