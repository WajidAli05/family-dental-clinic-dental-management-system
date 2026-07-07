import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { dentistApi } from "@/lib/dentistApi";
import { toast } from "sonner";

const DentistEditAppointmentModal = ({ open, appointment, onOpenChange, onSuccess }) => {
  const [form, setForm] = useState({ date: "", time: "", reason: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && appointment) {
      setForm({
        date:   appointment.date   || "",
        time:   appointment.time   || "",
        reason: appointment.reason || appointment.type || "",
        notes:  appointment.notes  || appointment.original?.notes || "",
      });
    }
  }, [open, appointment]);

  const handleSubmit = async () => {
    if (!form.date) return toast.error("Date is required");
    if (!form.time) return toast.error("Time is required");

    setSubmitting(true);
    try {
      await dentistApi.updateAppointment(appointment.id, form);
      toast.success("Appointment updated");
      onSuccess?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e.message || "Failed to update appointment");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!submitting) onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Appointment</DialogTitle>
        </DialogHeader>

        {appointment && (
          <p className="text-sm text-gray-500">
            Patient: <span className="font-semibold text-gray-800">{appointment.patient || appointment.patientName}</span>
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Date</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              disabled={submitting}
            />
          </div>
          <div className="space-y-1">
            <Label>Time</Label>
            <Input
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
              disabled={submitting}
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Reason</Label>
            <Input
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              disabled={submitting}
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Notes</Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              disabled={submitting}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-[#2ec4b6] hover:bg-[#26a699]"
          >
            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DentistEditAppointmentModal;
