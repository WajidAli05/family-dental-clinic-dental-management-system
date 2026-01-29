import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Users, FlaskConical, FileText } from "lucide-react";
import Wave from "react-wavify";

import { useDentistDashboardStore } from "@/store/dentistDashboardStore";
import DentistStatCard from "@/components/dentist/StatCard";
import DentistAppointmentsTable from "@/components/dentist/AppointmentsTable";
import StartPrescriptionModal from "@/components/dentist/StartPrescriptionModal";

const DentistDashboardHome = () => {
  const { stats, appointments, fetchDashboard } = useDentistDashboardStore();
  const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

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
        <DentistStatCard title="Appointments Today" value={stats.appointmentsToday} icon={Calendar} />
        <DentistStatCard title="Patients Seen" value={stats.patientsSeen} icon={Users} />
        <DentistStatCard title="Pending Lab Work" value={stats.pendingLab} icon={FlaskConical} />
        <DentistStatCard title="Prescriptions" value={stats.prescriptionsToday} icon={FileText} />
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">Today’s Appointments</h2>
          <DentistAppointmentsTable
            data={appointments}
            onStartPrescription={() => setIsPrescriptionOpen(true)}
          />
        </CardContent>
      </Card>

      <StartPrescriptionModal open={isPrescriptionOpen} onOpenChange={setIsPrescriptionOpen} />
    </div>
  );
};

export default DentistDashboardHome;