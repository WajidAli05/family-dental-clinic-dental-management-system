import { useEffect, useState } from "react";

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
  const { lookupPatient } = usePatientStore();
  const { createAppointment, addAppointment } = useAppointmentStore();
  const { dentists, fetchAllDentists, loading: dentistLoading } = useDentistStore();

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false); // patient search
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patient, setPatient] = useState(null);
  const [error, setError] = useState("");

  const [appointment, setAppointment] = useState({
    date: "",
    time: "",
    dentist: "", // dentistId OR dentistName (we will store dentistId)
    reason: "",
  });

  const [notification, setNotification] = useState(null);

  const resetState = () => {
    setQuery("");
    setPatient(null);
    setError("");
    setAppointment({ date: "", time: "", dentist: "", reason: "" });
    setNotification(null);
    setIsSubmitting(false);
    setLoading(false);
  };

  // ✅ Load dentists when modal opens
  useEffect(() => {
    if (!open) return;
    if (typeof fetchAllDentists === "function") fetchAllDentists();
  }, [open, fetchAllDentists]);

  const handleSearch = async () => {
    setError("");
    setPatient(null);
    setNotification(null);
    setLoading(true);

    try {
      if (typeof lookupPatient !== "function") {
        throw new Error("Patient lookup is not configured");
      }

      const found = await lookupPatient(query);
      setPatient(found);
    } catch (e) {
      setError(e.message || "Patient not found. Please register patient first.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAppointment = async () => {
    if (!patient) {
      setNotification({ type: "error", message: "Please search and select a patient first." });
      return;
    }

    if (!appointment.date || !appointment.time || !appointment.dentist) {
      setNotification({
        type: "error",
        message: "Please fill all required fields before confirming.",
      });
      return;
    }

    setIsSubmitting(true);
    setNotification(null);

    try {
      // ✅ Prefer DB create
      if (typeof createAppointment === "function") {
        await createAppointment({
          patientId: patient.id,         // PT-0001
          dentistId: appointment.dentist, // dentist publicId
          date: appointment.date,
          time: appointment.time,
          reason: appointment.reason,
        });
      } else {
        // fallback to local add if DB method not present
        addAppointment({
          mr: patient.mr,
          patientName: patient.name,
          dentist: appointment.dentist,
          date: appointment.date,
          time: appointment.time,
          reason: appointment.reason,
        });
      }

      setNotification({
        type: "success",
        message: `Appointment booked successfully for ${patient.name}.`,
      });

      setTimeout(() => {
        resetState();
        onOpenChange(false);
      }, 900);
    } catch (e) {
      setNotification({
        type: "error",
        message: e.message || "Failed to create appointment. Please try again.",
      });
      setIsSubmitting(false);
    }
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
          <Label>Search Patient (MR / PT-0001 / Phone)</Label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. 1 or PT-0001 or 03001234567"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading || isSubmitting}
            />
            <Button
              onClick={handleSearch}
              disabled={!query || loading || isSubmitting}
              className="bg-[#2ec4b6] hover:bg-[#26a699]"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
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
                    ID: {patient.id}
                    {patient.mr ? ` • MR: ${patient.mr}` : ""} • {patient.gender},{" "}
                    {patient.age}
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1 col-span-2">
                <Label>Dentist</Label>
                <Select
                  value={appointment.dentist}
                  onValueChange={(value) =>
                    setAppointment({ ...appointment, dentist: value })
                  }
                  disabled={isSubmitting || dentistLoading}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        dentistLoading ? "Loading dentists..." : "Select dentist"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(dentists || []).map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
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
                    setAppointment({ ...appointment, reason: e.target.value })
                  }
                  disabled={isSubmitting}
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