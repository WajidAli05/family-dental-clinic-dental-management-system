// pages/receptionist/ReceptionistDashboardHome.jsx
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Users, FlaskConical, CreditCard, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Wave from "react-wavify";

import { useReceptionistStore } from "@/store/receptionistStore";
import { receptionistApi } from "@/lib/receptionistApi";

import AddPatientModal from "@/components/receptionist/AddPatientModal";
import AddAppointmentModal from "@/components/receptionist/AddAppointmentModal";

import StatCard from "@/components/receptionist/StatCard";
import AppointmentsTable from "@/components/receptionist/AppointmentsTable";
import LabSamplesTable from "@/components/receptionist/LabSamplesTable";

const ReceptionistDashboardHome = () => {
  const { stats, appointments, labSamples, fetchDashboard, loading, error } =
    useReceptionistStore();
    console.log(appointments)

  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [isAddAppointmentOpen, setIsAddAppointmentOpen] = useState(false);

  useEffect(() => {
    if (typeof fetchDashboard === "function") fetchDashboard();
  }, [fetchDashboard]);

// ✅ LOCAL date (same fix we used in store)
const localISODate = (d = new Date()) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const apptRows = useMemo(() => {
  const today = localISODate();

  const mapped = (appointments || []).map((a) => ({
    id: a.id || a.publicId || a._id,
    patientName: a.patientName || a.patient || a.patient?.name || "",
    dentist: a.dentist || a.dentistName || a.dentist?.name || "",
    date: a.date || "",
    time: a.time || "",
    status: a.status || "Scheduled",
  }));

  // ✅ Only filter when date exists.
  // If backend already filtered by date (it does), mapped is already "today".
  const filtered = mapped.filter((x) => !x.date || x.date === today);

  return filtered;
}, [appointments]);

const labRows = useMemo(() => {
  return (labSamples || []).map((x) => ({
    patient: x.patient || x.patientName || x.patient?.name || "",
    sample:
      x.sample ||
      x.sampleType ||
      x.sampleTypeName ||
      x.sampleType?.name ||
      "—",
    lab: x.lab || x.labName || x.lab?.name || "",
    status: x.status || "Sent",
  }));
}, [labSamples]);

  // ✅ Use existing table actions (Complete/Cancel) without changing the component
  const handleComplete = async (id) => {
    try {
      await receptionistApi.updateAppointmentStatus(id, { status: "Completed" });
      await fetchDashboard();
    } catch (e) {
      // store will show error on next fetch; optional: you can set local toast
      console.error(e);
    }
  };

  const handleCancel = async (id) => {
    try {
      await receptionistApi.updateAppointmentStatus(id, { status: "Cancelled" });
      await fetchDashboard();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-white">
        <Wave
          fill="#2ec4b6"
          paused={false}
          options={{ height: 20, amplitude: 30, speed: 0.15, points: 3 }}
          className="absolute bottom-0 left-0 w-full opacity-20"
        />
        <div className="relative z-10 p-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Receptionist Dashboard
          </h1>
          <p className="text-gray-500">Daily clinic operations overview</p>
        </div>
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
  <CardContent className="p-6 space-y-4">
    <h2 className="text-lg font-semibold">Quick Actions</h2>
    
    <div className="flex flex-wrap gap-2">
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
      <div className="grid grid-cols-1 gap-6">
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Today's Appointments</h2>

            <div className="overflow-x-auto">
              <AppointmentsTable
                data={apptRows}
                onComplete={handleComplete}
                onCancel={handleCancel}
              />
            </div>
          </CardContent>
        </Card>

        {/* <Card className="rounded-2xl">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Lab Samples Status</h2>

            <div className="overflow-x-auto">
              <LabSamplesTable data={labRows} />
            </div>
          </CardContent>
        </Card> */}
      </div>

      {/* Modals */}
      <AddPatientModal open={isAddPatientOpen} onOpenChange={setIsAddPatientOpen} />
      <AddAppointmentModal open={isAddAppointmentOpen} onOpenChange={setIsAddAppointmentOpen} />
    </div>
  );
};

export default ReceptionistDashboardHome;