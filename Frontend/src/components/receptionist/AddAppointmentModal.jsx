import { useState } from "react";

// UI
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Stores
import { usePatientStore } from "@/store/patientStore";
import { useAppointmentStore } from "@/store/appointmentStore";
import { useDentistStore } from "@/store/dentistStore";

// Icons
import {
  Search,
  Loader2,
  Calendar,
  User,
  Phone,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const AddAppointmentModal = ({ open, onOpenChange }) => {
  const { patients } = usePatientStore();
  const { addAppointment } = useAppointmentStore();
  const { dentists } = useDentistStore();

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false); // patient search
  const [isSubmitting, setIsSubmitting] = useState(false); // ⬅️ NEW
  const [patient, setPatient] = useState(null);
  const [error, setError] = useState("");

  const [appointment, setAppointment] = useState({
    date: "",
    time: "",
    dentist: "",
    reason: "",
  });

  const [notification, setNotification] = useState(null);

  const resetState = () => {
    setQuery("");
    setPatient(null);
    setError("");
    setAppointment({
      date: "",
      time: "",
      dentist: "",
      reason: "",
    });
    setNotification(null);
    setIsSubmitting(false);
  };

  const handleSearch = () => {
    setError("");
    setPatient(null);
    setNotification(null);
    setLoading(true);

    setTimeout(() => {
      const found = patients.find(
        (p) =>
          p.mr.toString() === query ||
          p.phone.replace(/\s/g, "") === query.replace(/\s/g, "")
      );

      if (!found) {
        setError("Patient not found. Please register patient first.");
      } else {
        setPatient(found);
      }

      setLoading(false);
    }, 1200);
  };

  const handleCreateAppointment = () => {
    if (!appointment.date || !appointment.time || !appointment.dentist) {
      setNotification({
        type: "error",
        message: "Please fill all required fields before confirming.",
      });
      return;
    }

    setIsSubmitting(true);
    setNotification(null);

    // ⏳ Fake API delay
    setTimeout(() => {
      try {
        addAppointment({
          mr: patient.mr,
          patientName: patient.name,
          dentist: appointment.dentist,
          date: appointment.date,
          time: appointment.time,
          reason: appointment.reason,
        });

        setNotification({
          type: "success",
          message: `Appointment booked successfully for ${patient.name}.`,
        });

        setTimeout(() => {
          resetState();
          onOpenChange(false);
        }, 1500);
      } catch {
        setNotification({
          type: "error",
          message: "Failed to create appointment. Please try again.",
        });
        setIsSubmitting(false);
      }
    }, 1500);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetState();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add Appointment</DialogTitle>
        </DialogHeader>

        {/* Search Patient */}
        <div className="space-y-2">
          <Label>Search Patient (MR or Phone)</Label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. 1 or +923001234567"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button
              onClick={handleSearch}
              disabled={!query || loading}
              className="bg-[#2ec4b6] hover:bg-[#26a699]"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        {/* Patient Found */}
        {patient && (
          <>
            <Card className="p-4 bg-gray-50 border">
              <div className="flex items-start gap-4">
                <User className="text-[#2ec4b6]" />
                <div className="text-sm">
                  <p className="font-semibold">{patient.name}</p>
                  <p className="text-gray-500">
                    MR: {patient.mr} • {patient.gender}, {patient.age}
                  </p>
                  <p className="text-gray-500 flex items-center gap-1">
                    <Phone size={14} />
                    {patient.phone}
                  </p>
                </div>
              </div>
            </Card>

            {/* Appointment Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={appointment.date}
                  onChange={(e) =>
                    setAppointment({ ...appointment, date: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={appointment.time}
                  onChange={(e) =>
                    setAppointment({ ...appointment, time: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1 col-span-2">
                <Label>Dentist</Label>
                <Select
                  value={appointment.dentist}
                  onValueChange={(value) =>
                    setAppointment({ ...appointment, dentist: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select dentist" />
                  </SelectTrigger>
                  <SelectContent>
                    {dentists.map((doc) => (
                      <SelectItem key={doc.id} value={doc.name}>
                        {doc.name} — {doc.specialization}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 col-span-2">
                <Label>Reason / Notes</Label>
                <Input
                  placeholder="Consultation, pain, follow-up..."
                  value={appointment.reason}
                  onChange={(e) =>
                    setAppointment({
                      ...appointment,
                      reason: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            {/* Notification */}
            {notification && (
              <Alert
                className={`${
                  notification.type === "success"
                    ? "bg-green-50 border-green-200 text-green-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
              >
                {notification.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className="ml-2">
                  {notification.message}
                </AlertDescription>
              </Alert>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                disabled={isSubmitting}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>

              <Button
                onClick={handleCreateAppointment}
                disabled={isSubmitting}
                className="bg-[#2ec4b6] hover:bg-[#26a699]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Booking...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Confirm Appointment
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddAppointmentModal;