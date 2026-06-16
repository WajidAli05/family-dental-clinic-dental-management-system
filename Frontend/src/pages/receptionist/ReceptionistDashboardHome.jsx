import { useEffect } from "react";
import Wave from "react-wavify";
import { Users, FlaskConical, Banknote, Calendar, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

import { useReceptionistStore } from "@/store/receptionistStore";
import OwnerStatCard from "@/components/owner/OwnerStatCard";
import { formatPKR } from "@/utils/formatPKR";
import { localISODate } from "@/utils/localISODate";

const ReceptionistDashboardHome = () => {
  const { stats, fetchDashboard, loading } = useReceptionistStore();

  useEffect(() => {
    if (typeof fetchDashboard === "function") fetchDashboard({ date: localISODate() });
  }, [fetchDashboard]);

  const breakdown = stats?.todayBreakdown || { total: 0, scheduled: 0, completed: 0, cancelled: 0 };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-white p-6">
        <h1 className="text-2xl font-bold text-gray-900">Receptionist Dashboard</h1>
        <p className="text-gray-500">
          Front-desk overview — appointments, patients, and revenue
        </p>
        <Wave
          fill="#2ec4b6"
          paused={false}
          options={{ height: 20, amplitude: 30, speed: 0.15, points: 3 }}
          className="absolute bottom-0 left-0 w-full opacity-20"
        />
      </div>

      {loading ? (
        <div className="rounded-xl bg-white p-3 text-sm text-gray-600">
          Loading dashboard...
        </div>
      ) : null}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <OwnerStatCard
          title="Active Patients"
          value={stats?.activePatients ?? 0}
          icon={Users}
          subtitle="Status = active in system"
        />
        <OwnerStatCard
          title="Today's Appointments"
          value={stats?.appointmentsToday ?? 0}
          icon={Calendar}
          subtitle="Booked for today"
        />
        <OwnerStatCard
          title="Revenue Today"
          value={formatPKR(stats?.todayRevenue ?? 0)}
          icon={Banknote}
          subtitle="Payments received today"
        />
        <OwnerStatCard
          title="Revenue This Month"
          value={formatPKR(stats?.revenueThisMonth ?? 0)}
          icon={Banknote}
          subtitle="Month-to-date"
        />
      </div>

      {/* Today's appointment breakdown + pending lab samples */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card className="rounded-2xl h-full">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Today's Appointment Breakdown
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col items-center gap-1 p-4 rounded-xl bg-blue-50">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <span className="text-2xl font-bold text-blue-700">{breakdown.scheduled}</span>
                  <span className="text-xs text-blue-500">Scheduled</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-4 rounded-xl bg-green-50">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-2xl font-bold text-green-700">{breakdown.completed}</span>
                  <span className="text-xs text-green-500">Completed</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-4 rounded-xl bg-red-50">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-2xl font-bold text-red-700">{breakdown.cancelled}</span>
                  <span className="text-xs text-red-500">Cancelled</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-2xl bg-[#2ec4b61a] p-3">
              <FlaskConical className="h-5 w-5 text-[#2ec4b6]" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Lab Samples</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.pendingLabSamples ?? 0}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Cases with status: Sent, In Progress, or Ready
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReceptionistDashboardHome;
