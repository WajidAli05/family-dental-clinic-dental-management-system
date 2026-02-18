// pages/owner/OwnerDashboardHome.jsx
import { useEffect } from "react";
import Wave from "react-wavify";
import { Users, FlaskConical, Banknote, Calendar } from "lucide-react";

import { useOwnerDashboardStore } from "@/store/ownerDashboardStore";
import OwnerStatCard from "@/components/owner/OwnerStatCard";
import AppointmentsSummaryCard from "@/components/owner/AppointmentsSummaryCard";

const formatPKR = (n) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const OwnerDashboardHome = () => {
  const { stats, appointmentsSummary, init, loading, error } =
    useOwnerDashboardStore();

  useEffect(() => {
    if (typeof init === "function") init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [init]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-white p-6">
        <h1 className="text-2xl font-bold text-gray-900">Owner Dashboard</h1>
        <p className="text-gray-500">
          Clinic overview — quick insights, no quick actions
        </p>

        <Wave
          fill="#2ec4b6"
          paused={false}
          options={{ height: 20, amplitude: 30, speed: 0.15, points: 3 }}
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

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <OwnerStatCard
          title="Active Patients"
          value={stats?.activePatients ?? 0}
          icon={Users}
          subtitle="Total active in system"
        />
        <OwnerStatCard
          title="Pending Lab Samples"
          value={stats?.pendingLabSamples ?? 0}
          icon={FlaskConical}
          subtitle="Across all dentists"
        />
        <OwnerStatCard
          title="Revenue Today"
          value={formatPKR(stats?.revenueToday ?? 0)}
          icon={Banknote}
          subtitle="Collected today"
        />
        <OwnerStatCard
          title="Revenue This Month"
          value={formatPKR(stats?.revenueThisMonth ?? 0)}
          icon={Calendar}
          subtitle="Month-to-date"
        />
      </div>

      {/* Appointments summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <AppointmentsSummaryCard
            summary={{
              total: appointmentsSummary?.total ?? 0,
              scheduled: appointmentsSummary?.scheduled ?? 0,
              checkedIn: appointmentsSummary?.checkedIn ?? 0,
              completed: appointmentsSummary?.completed ?? 0,
              cancelled: appointmentsSummary?.cancelled ?? 0,
            }}
          />
        </div>

        {/* Optional placeholder card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Snapshot</h2>
          <p className="mt-2 text-sm text-gray-500">
            Charts can be added later (appointments trend, revenue trend). This
            page remains overview-only.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboardHome;