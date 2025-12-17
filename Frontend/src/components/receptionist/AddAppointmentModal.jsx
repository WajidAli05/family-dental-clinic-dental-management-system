import { useState } from "react";

// UI
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDentistStore } from "@/store/dentistStore";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useAppointmentStore } from "@/store/appointmentStore";


// Icons
import {
  Search,
  Loader2,
  Calendar,
  User,
  Phone,
  Stethoscope,
} from "lucide-react";

// Store
import { usePatientStore } from "@/store/patientStore";

const AddAppointmentModal = ({ open, onOpenChange }) => {
  const { patients } = usePatientStore();
  const { addAppointment } = useAppointmentStore();
  const { dentists } = useDentistStore();

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [patient, setPatient] = useState(null);
  const [error, setError] = useState("");

  const [appointment, setAppointment] = useState({
    date: "",
    time: "",
    dentist: "",
    reason: "",
  });

  const handleSearch = () => {
    setError("");
    setPatient(null);
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
    }, 1200); // fake API delay
  };

const handleCreateAppointment = () => {
  addAppointment({
    mr: patient.mr,
    patientName: patient.name,
    dentist: appointment.dentist,
    date: appointment.date,
    time: appointment.time,
    reason: appointment.reason,
  });

  onOpenChange(false);
};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
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

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateAppointment}
                className="bg-[#2ec4b6] hover:bg-[#26a699]"
                disabled={
                  !appointment.date ||
                  !appointment.time ||
                  !appointment.dentist
                }
              >
                <Calendar className="w-4 h-4 mr-2" />
                Confirm Appointment
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddAppointmentModal;