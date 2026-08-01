import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { localISODate } from "@/utils/localISODate";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Users, FlaskConical, FileText, Wallet, TrendingUp } from "lucide-react";
import Wave from "react-wavify";

import { useDentistDashboardStore } from "@/store/dentistDashboardStore";
import { usePrescriptionStore } from "@/store/prescriptionStore";
import { useDentistFinanceStore } from "@/store/dentistFinanceStore";

import DentistStatCard from "@/components/dentist/StatCard";
import DentistAppointmentsTable from "@/components/dentist/AppointmentsTable";
import StartPrescriptionModal from "@/components/dentist/StartPrescriptionModal";
import CountrySwitcher from "@/components/common/CountrySwitcher";
import { useFormatMoney } from "@/store/clinicConfigStore";

const DentistDashboardHome = () => {
  const navigate = useNavigate();
  const { stats, appointments, fetchDashboard } = useDentistDashboardStore();
  const { data: financeData, fetch: fetchFinance } = useDentistFinanceStore();
  const money = useFormatMoney();

  const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const rxStore = usePrescriptionStore();

  const today = useMemo(() => localISODate(), []);

  useEffect(() => {
    if (typeof fetchDashboard === "function") fetchDashboard();
    fetchFinance();
  }, [fetchDashboard]);

  /**
   * ✅ IMPORTANT:
   * Dashboard store returns rows where patientId is inside `original.patientId`.
   * We normalize into the SAME shape used in DentistAppointments page:
   * { id, time, patient, type, original, patientId, prescription }
   */
  // const apptRows = useMemo(() => {
  //   return (appointments || []).map((a) => {
  //     const original = a?.original || a;

  //     const patientId =
  //       a?.patientId ||
  //       original?.patientId ||
  //       original?.patient?.publicId ||
  //       "";

  //     return {
  //       id: a?.id || original?.id || original?.publicId || original?._id || "",
  //       time: a?.time || original?.time || "",
  //       patient: a?.patient || original?.patientName || original?.patient?.name || "",
  //       type: a?.type || original?.reason || "Consultation",
  //       original,
  //       patientId,
  //       prescription: null, // dashboard doesn't fetch prescriptions here
  //     };
  //   });
  // }, [appointments]);

  const apptRows = useMemo(() => {
  return (appointments || []).map((a) => {
    const original = a?.original || a;

    const patientId =
      a?.patientId ||
      original?.patientId ||
      original?.patient?.publicId ||
      "";

    const patientName =
      a?.patientName ||
      a?.patient ||
      original?.patientName ||
      original?.patient?.name ||
      "";

    const reason =
      a?.reason ||
      a?.type ||
      original?.reason ||
      "Consultation";

    return {
      // ✅ keep existing keys
      id: a?.id || original?.id || original?.publicId || original?._id || "",
      time: a?.time || original?.time || "",
      patient: patientName,      // existing UI key
      type: reason,              // existing UI key
      original,
      patientId,
      prescription: null,

      // ✅ ADD keys for table components that expect them
      patientName,
      reason: a?.reason || original?.reason || "",
      date: a?.date || original?.date || "",
      status: a?.status || original?.status || "",
      mr: a?.mr ?? original?.patient?.mr ?? null,
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
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dentist Dashboard</h1>
            <p className="text-gray-500">Today’s clinical overview</p>
          </div>
          <CountrySwitcher />
        </div>

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

      {/* Finance quick cards */}
      {financeData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => navigate("/dentist-dashboard/finance")}
            className="rounded-2xl border border-[#2ec4b6]/30 bg-[#f0fdfc] p-4 text-left hover:bg-[#e6faf8] transition"
          >
            <div className="flex items-center gap-2 mb-1">
              <Wallet size={16} className="text-[#2ec4b6]" />
              <span className="text-xs font-semibold text-[#2ec4b6]">Earned This Month</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{money(financeData.earnedThisMonth)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Rate: {financeData.rate}% · View My Finance →</p>
          </button>

          <button
            type="button"
            onClick={() => navigate("/dentist-dashboard/finance")}
            className="rounded-2xl border border-orange-100 bg-orange-50 p-4 text-left hover:bg-orange-100/60 transition"
          >
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={16} className="text-orange-500" />
              <span className="text-xs font-semibold text-orange-600">Remaining Balance</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{money(financeData.remaining)}</p>
            <p className="text-xs text-gray-500 mt-0.5">All-time earned minus total paid out</p>
          </button>
        </div>
      )}

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