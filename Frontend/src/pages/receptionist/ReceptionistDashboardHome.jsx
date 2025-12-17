import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  Users,
  FlaskConical,
  CreditCard,
  User,
} from "lucide-react";

import { useReceptionistStore } from "@/store/receptionistStore";

import StatCard from "@/components/receptionist/StatCard";
import AppointmentsTable from "@/components/receptionist/AppointmentsTable";
import LabSamplesTable from "@/components/receptionist/LabSamplesTable";

import Wave from "react-wavify";

const ReceptionistDashboardHome = () => {
  const { stats, appointments, labSamples } = useReceptionistStore();

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-white p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Receptionist Dashboard
        </h1>
        <p className="text-gray-500">
          Daily clinic operations overview
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
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <button className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition">
            <User className="w-5 h-5" /> Add Patient
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition">
            <Calendar className="w-5 h-5" /> Book Appointment
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition">
            <CreditCard className="w-5 h-5" /> Create Invoice
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Appointments Today" value={stats.appointmentsToday} icon={Calendar} />
        <StatCard title="Active Patients" value={stats.activePatients} icon={Users} />
        <StatCard title="Pending Lab Samples" value={stats.pendingLabSamples} icon={FlaskConical} />
        <StatCard title="Revenue Today (PKR)" value={stats.todayRevenue} icon={CreditCard} />
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">
              Today’s Appointments
            </h2>
            <AppointmentsTable data={appointments} />
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">
              Lab Samples Status
            </h2>
            <LabSamplesTable data={labSamples} />
          </CardContent>
        </Card>
      </div>

    </div>
  );
};

export default ReceptionistDashboardHome;