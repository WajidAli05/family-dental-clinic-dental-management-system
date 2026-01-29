import { useEffect, useMemo, useState } from "react";
import Wavify from "react-wavify";
import { Card, CardContent } from "@/components/ui/card";

import { useAppointmentStore } from "@/store/appointmentStore";
import AppointmentsTable from "@/components/dentist/AppointmentsTable";
import StartPrescriptionModal from "@/components/dentist/StartPrescriptionModal";

const DentistAppointments = () => {
  const { appointments, fetchToday, loading } = useAppointmentStore();

  const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  useEffect(() => {
    fetchToday();
  }, [fetchToday]);

  const todaysAppointments = useMemo(() => {
    // your AppointmentsTable expects {id,time,patient,type,original}
    return (appointments || []).map((a) => ({
      id: a.id,
      time: a.time,
      patient: a.patientName,
      type: a.reason || "Consultation",
      original: a,
    }));
  }, [appointments]);

  const handleStartPrescription = (row) => {
    setSelectedAppointment(row.original);
    setIsPrescriptionOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-white p-6">
        <h1 className="text-2xl font-bold text-gray-900">Today’s Appointments</h1>
        <p className="text-gray-500">Tap “Prescribe” to begin treatment</p>

        <Wavify
          fill="#2ec4b6"
          paused={false}
          options={{ height: 20, amplitude: 30, speed: 0.15, points: 3 }}
          className="absolute bottom-0 left-0 w-full opacity-20"
        />
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-6">
          {loading ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : todaysAppointments.length > 0 ? (
            <AppointmentsTable data={todaysAppointments} onStartPrescription={handleStartPrescription} />
          ) : (
            <p className="text-gray-500 text-sm">No appointments scheduled for today.</p>
          )}
        </CardContent>
      </Card>

      <StartPrescriptionModal
        open={isPrescriptionOpen}
        onOpenChange={setIsPrescriptionOpen}
        appointment={selectedAppointment}
      />
    </div>
  );
};

export default DentistAppointments;