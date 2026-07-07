import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { ownerApi } from "@/lib/ownerApi";
import { toast } from "sonner";

const OwnerEditAppointmentModal = ({ open, appointment, onOpenChange, onSuccess }) => {
  const [form, setForm] = useState({ date: "", time: "", reason: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && appointment) {
      setForm({
        date:   appointment.date   || "",
        time:   appointment.time   || "",
        reason: appointment.reason || "",
        notes:  appointment.notes  || "",
      });
    }
  }, [open, appointment]);

  const handleSubmit = async () => {
    if (!form.date) return toast.error("Date is required");
    if (!form.time) return toast.error("Time is required");

    setSubmitting(true);
    try {
      await ownerApi.updateAppointment(appointment.id, form);
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
          <div className="text-sm text-gray-600 space-y-0.5">
            <p>Patient: <span className="font-semibold text-gray-900">{appointment.patientName}</span></p>
            <p>Dentist: <span className="font-semibold text-gray-900">{appointment.dentistName}</span></p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Date</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} disabled={submitting} />
          </div>
          <div className="space-y-1">
            <Label>Time</Label>
            <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} disabled={submitting} />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Reason</Label>
            <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} disabled={submitting} />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Notes</Label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} disabled={submitting} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-[#2ec4b6] hover:bg-[#26a699]">
            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OwnerEditAppointmentModal;
