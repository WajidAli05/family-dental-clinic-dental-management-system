import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAppointmentStore } from "@/store/appointmentStore";

export default function RescheduleAppointmentModal({
  open,
  onOpenChange,
  appointment,
}) {
  const { updateAppointment } = useAppointmentStore();

  const handleSave = () => {
    updateAppointment(appointment.id, {
      date: appointment.date,
      time: appointment.time,
    });
    onOpenChange(false);
  };

  if (!appointment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule Appointment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={appointment.date}
              onChange={(e) =>
                appointment.date = e.target.value
              }
            />
          </div>

          <div>
            <Label>Time</Label>
            <Input
              type="time"
              value={appointment.time}
              onChange={(e) =>
                appointment.time = e.target.value
              }
            />
          </div>

          <Button
            onClick={handleSave}
            className="bg-[#2ec4b6] hover:bg-[#26a699]"
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}