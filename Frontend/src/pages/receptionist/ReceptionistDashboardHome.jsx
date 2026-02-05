// pages/receptionist/ReceptionistDashboardHome.jsx
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Users, FlaskConical, CreditCard, Plus } from "lucide-react";

import { useReceptionistStore } from "@/store/receptionistStore";

// Patient modal
import AddPatientModal from "@/components/receptionist/AddPatientModal";

// Appointment modal
import AddAppointmentModal from "@/components/receptionist/AddAppointmentModal";

// Components
import StatCard from "@/components/receptionist/StatCard";
import AppointmentsTable from "@/components/receptionist/AppointmentsTable";
import LabSamplesTable from "@/components/receptionist/LabSamplesTable";
import { Button } from "@/components/ui/button";

// Effects
import Wave from "react-wavify";

const ReceptionistDashboardHome = () => {
  // ✅ Keep existing store state shape; only using/reading extra fields if present
  const {
    stats,
    appointments,
    labSamples,
    fetchDashboard,
    loading,
    error,
  } = useReceptionistStore();

  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [isAddAppointmentOpen, setIsAddAppointmentOpen] = useState(false);

  useEffect(() => {
    // ✅ If fetchDashboard exists (after you add it), load real data.
    // Otherwise the page will still render using seeded/dummy store values.
    if (typeof fetchDashboard === "function") {
      fetchDashboard();
    }
  }, [fetchDashboard]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-white p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Receptionist Dashboard
        </h1>
        <p className="text-gray-500">Daily clinic operations overview</p>

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

      {/* Error / Loading */}
      {error ? (
        <div className="rounded-xl bg-red-50 text-red-700 p-3 text-sm">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl bg-white p-3 text-sm text-gray-600">
          Loading dashboard...
        </div>
      ) : null}

      {/* Quick Actions */}
      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => setIsAddPatientOpen(true)}
              className="bg-[#2ec4b6] hover:bg-[#26a699] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Patient
            </Button>

            <Button
              onClick={() => setIsAddAppointmentOpen(true)}
              className="bg-[#2ec4b6] hover:bg-[#26a699] text-white"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Book Appointment
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Appointments Today"
          value={stats?.appointmentsToday ?? 0}
          icon={Calendar}
        />
        {console.log(stats)}
        <StatCard
          title="Active Patients"
          value={stats?.activePatients ?? 0}
          icon={Users}
        />
        <StatCard
          title="Pending Lab Samples"
          value={stats?.pendingLabSamples ?? 0}
          icon={FlaskConical}
        />
        <StatCard
          title="Revenue Today (PKR)"
          value={stats?.todayRevenue ?? 0}
          icon={CreditCard}
        />
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Today’s Appointments</h2>
            <AppointmentsTable data={appointments || []} />
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Lab Samples Status</h2>
            <LabSamplesTable data={labSamples || []} />
          </CardContent>
        </Card>
      </div>

      {/* Add Patient Modal */}
      <AddPatientModal
        open={isAddPatientOpen}
        onOpenChange={setIsAddPatientOpen}
      />

      {/* Add Appointment Modal */}
      <AddAppointmentModal
        open={isAddAppointmentOpen}
        onOpenChange={setIsAddAppointmentOpen}
      />
    </div>
  );
};

export default ReceptionistDashboardHome;