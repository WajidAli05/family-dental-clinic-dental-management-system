import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Users,
  FlaskConical,
  FileText,
  Plus,
  Smile,
} from "lucide-react";
import Wave from "react-wavify";

import { useDentistDashboardStore } from "@/store/dentistDashboardStore";

import DentistStatCard from "@/components/dentist/StatCard";
import DentistAppointmentsTable from "@/components/dentist/AppointmentsTable";
import StartPrescriptionModal from "@/components/dentist/StartPrescriptionModal";

const DentistDashboardHome = () => {
  const { stats, appointments } = useDentistDashboardStore();

  const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-white p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Dentist Dashboard
        </h1>
        <p className="text-gray-500">
          Today’s clinical overview
        </p>

        <Wave
          fill="#2ec4b6"
          paused={false}
          options={{
            height: 20,
            amplitude: 30,
            speed: 0.15,
            points: 3,
          }}
          className="absolute bottom-0 left-0 w-full opacity-20"
        />
      </div>

      {/* Quick Actions */}
      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">
            Quick Actions
          </h2>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => setIsPrescriptionOpen(true)}
              className="bg-[#2ec4b6] hover:bg-[#26a699] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Prescription
            </Button>

            <Button className="bg-[#2ec4b6] hover:bg-[#26a699] text-white">
              <Smile className="w-4 h-4 mr-2" />
              Dental Chart
            </Button>

            <Button className="bg-[#2ec4b6] hover:bg-[#26a699] text-white">
              <Calendar className="w-4 h-4 mr-2" />
              Today’s Appointments
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DentistStatCard
          title="Appointments Today"
          value={stats.appointmentsToday}
          icon={Calendar}
        />
        <DentistStatCard
          title="Patients Seen"
          value={stats.patientsSeen}
          icon={Users}
        />
        <DentistStatCard
          title="Pending Lab Work"
          value={stats.pendingLab}
          icon={FlaskConical}
        />
        <DentistStatCard
          title="Prescriptions"
          value={stats.prescriptionsToday}
          icon={FileText}
        />
      </div>

      {/* Appointments */}
      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">
            Today’s Appointments
          </h2>
          <DentistAppointmentsTable
            data={appointments}
            onStartPrescription={() => setIsPrescriptionOpen(true)}
          />
        </CardContent>
      </Card>

      {/* Prescription Modal */}
      <StartPrescriptionModal
        open={isPrescriptionOpen}
        onOpenChange={setIsPrescriptionOpen}
      />

    </div>
  );
};

export default DentistDashboardHome;