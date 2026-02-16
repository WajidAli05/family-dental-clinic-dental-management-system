import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Users, FlaskConical, FileText } from "lucide-react";
import Wave from "react-wavify";

import { useDentistDashboardStore } from "@/store/dentistDashboardStore";
import { usePrescriptionStore } from "@/store/prescriptionStore";

import DentistStatCard from "@/components/dentist/StatCard";
import DentistAppointmentsTable from "@/components/dentist/AppointmentsTable";
import StartPrescriptionModal from "@/components/dentist/StartPrescriptionModal";

const DentistDashboardHome = () => {
  const { stats, appointments, fetchDashboard } = useDentistDashboardStore();

  const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const rxStore = usePrescriptionStore();

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  useEffect(() => {
    if (typeof fetchDashboard === "function") fetchDashboard();
  }, [fetchDashboard]);

  /**
   * ✅ IMPORTANT:
   * Dashboard store returns rows where patientId is inside `original.patientId`.
   * We normalize into the SAME shape used in DentistAppointments page:
   * { id, time, patient, type, original, patientId, prescription }
   */
  const apptRows = useMemo(() => {
    return (appointments || []).map((a) => {
      const original = a?.original || a;

      const patientId =
        a?.patientId ||
        original?.patientId ||
        original?.patient?.publicId ||
        "";

      return {
        id: a?.id || original?.id || original?.publicId || original?._id || "",
        time: a?.time || original?.time || "",
        patient: a?.patient || original?.patientName || original?.patient?.name || "",
        type: a?.type || original?.reason || "Consultation",
        original,
        patientId,
        prescription: null, // dashboard doesn't fetch prescriptions here
      };
    });
  }, [appointments]);

  const handleStartPrescription = (row) => {
    const apt = row?.original || null;
    const patientId = row?.patientId || apt?.patientId || "";

    // ✅ Safety: do not open modal if no patientId
    if (!patientId) {
      // You can toast here if you want, but not required
      console.error("Missing patientId for appointment:", row);
      return;
    }

    setSelectedAppointment(apt);

    // ✅ CRITICAL: set store values BEFORE opening modal
    rxStore.reset();
    rxStore.setPatientId(patientId);
    rxStore.setDate(apt?.date || today);

    setIsPrescriptionOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-white p-6">
        <h1 className="text-2xl font-bold text-gray-900">Dentist Dashboard</h1>
        <p className="text-gray-500">Today’s clinical overview</p>

        <Wave
          fill="#2ec4b6"
          paused={false}
          options={{ height: 20, amplitude: 30, speed: 0.15, points: 3 }}
          className="absolute bottom-0 left-0 w-full opacity-20"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DentistStatCard
          title="Appointments Today"
          value={stats?.appointmentsToday ?? 0}
          icon={Calendar}
        />
        <DentistStatCard
          title="Patients Seen"
          value={stats?.patientsSeen ?? 0}
          icon={Users}
        />
        <DentistStatCard
          title="Pending Lab Work"
          value={stats?.pendingLab ?? 0}
          icon={FlaskConical}
        />
        <DentistStatCard
          title="Prescriptions"
          value={stats?.prescriptionsToday ?? 0}
          icon={FileText}
        />
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">Today’s Appointments</h2>

          <DentistAppointmentsTable
            data={apptRows}
            onStartPrescription={handleStartPrescription}
          />
        </CardContent>
      </Card>

      <StartPrescriptionModal
        open={isPrescriptionOpen}
        onOpenChange={(v) => {
          setIsPrescriptionOpen(v);
          if (!v) {
            setSelectedAppointment(null);
            if (typeof fetchDashboard === "function") fetchDashboard();
          }
        }}
        appointment={selectedAppointment}
        prescription={null}
      />
    </div>
  );
};

export default DentistDashboardHome;