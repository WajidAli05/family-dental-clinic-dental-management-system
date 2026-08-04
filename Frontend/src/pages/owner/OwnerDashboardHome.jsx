import { useEffect } from "react";
import Wave from "react-wavify";
import { useOwnerDashboardStore } from "@/store/ownerDashboardStore";
import OwnerStatCard from "@/components/owner/OwnerStatCard";
import AppointmentsSummaryCard from "@/components/owner/AppointmentsSummaryCard";
import StatCardSkeleton from "@/components/ui/StatCardSkeleton";
import NotificationBell from "@/components/owner/NotificationBell";
import { Users, FlaskConical, Banknote, Calendar } from "lucide-react";
import { useFormatMoney } from "@/store/clinicConfigStore";

const OwnerDashboardHome = () => {
  const { stats, appointmentsSummary, init, loading, error } = useOwnerDashboardStore();
  const fm = useFormatMoney();

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="space-y-8">
      {/* Header — outer card has no overflow-hidden so the bell dropdown isn't clipped */}
      <div className="relative rounded-2xl bg-white p-6">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-gray-900">Owner Dashboard</h1>
          <p className="text-gray-500">Clinic overview — quick insights, no quick actions</p>
        </div>

        {/* Wave layer clips itself; doesn't affect the bell */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <Wave
            fill="#2ec4b6"
            paused={false}
            options={{ height: 20, amplitude: 30, speed: 0.15, points: 3 }}
            className="absolute bottom-0 left-0 w-full opacity-20"
          />
        </div>

        {/* Bell — top-end corner, mirrors to top-left in RTL */}
        <div className="absolute top-3 end-3 z-20">
          <NotificationBell />
        </div>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-50 text-red-700 p-3 text-sm">{error}</div>
      ) : null}

      {/* Stats */}
      {loading ? <StatCardSkeleton /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <OwnerStatCard
            title="Active Patients"
            value={stats.activePatients}
            icon={Users}
            subtitle="Total active in system"
          />
          <OwnerStatCard
            title="Pending Lab Samples"
            value={stats.pendingLabSamples}
            icon={FlaskConical}
            subtitle="Across all dentists"
          />
          <OwnerStatCard
            title="Revenue Today"
            value={fm(stats.revenueToday)}
            icon={Banknote}
            subtitle="Collected today"
          />
          <OwnerStatCard
            title="Revenue This Month"
            value={fm(stats.revenueThisMonth)}
            icon={Calendar}
            subtitle="Month-to-date"
          />
        </div>
      )}

      {/* Appointments summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <AppointmentsSummaryCard summary={appointmentsSummary} />
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Snapshot</h2>
          <p className="mt-2 text-sm text-gray-500">
            Charts can be added later (appointments trend, revenue trend).
            This page remains overview-only.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboardHome;
