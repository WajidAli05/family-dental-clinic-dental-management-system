import { useEffect, useMemo } from "react";
import OwnerPageHeader from "@/components/owner/OwnerPageHeader";
import OwnerStatCard from "@/components/owner/OwnerStatCard";
import OwnerPatientsFilters from "@/components/owner/OwnerPatientsFilters";
import OwnerPatientsTable from "@/components/owner/OwnerPatientsTable";
import OwnerPatientProfileModal from "@/components/owner/OwnerPatientProfileModal";
import { Card, CardContent } from "@/components/ui/card";
import { useOwnerPatientsStore } from "@/store/ownerPatientsStore";
import { useDentistStore } from "@/store/dentistStore";
import { Users, UserCheck, FlaskConical, Banknote } from "lucide-react";

const OwnerPatients = () => {
  const filters = useOwnerPatientsStore((s) => s.filters);
  const patients = useOwnerPatientsStore((s) => s.patients);
  const selectedPatient = useOwnerPatientsStore((s) => s.selectedPatient);

  const setFilter = useOwnerPatientsStore((s) => s.setFilter);
  const resetFilters = useOwnerPatientsStore((s) => s.resetFilters);
  const openProfile = useOwnerPatientsStore((s) => s.openProfile);
  const closeProfile = useOwnerPatientsStore((s) => s.closeProfile);

  // ✅ load dentists from backend (re-uses receptionist route)
  const dentistsStore = useDentistStore((s) => s.dentists);
  const fetchAllDentists = useDentistStore((s) => s.fetchAllDentists);

  useEffect(() => {
    useOwnerPatientsStore.getState().init();
    fetchAllDentists(); // ✅ now dentists will appear in filters
  }, [fetchAllDentists]);

  // ✅ stable filtered data (no hook-subscribe to computed lists)
  const data = useMemo(() => {
    const store = useOwnerPatientsStore.getState();
    return store.getFilteredPatients();
  }, [patients, filters]);

  const stats = useMemo(() => {
    const { getStats } = useOwnerPatientsStore.getState();
    return getStats(data);
  }, [data]);

  // ✅ dentists list for filter (names)
  const dentists = useMemo(() => {
    return (dentistsStore || []).map((d) => d.name).filter(Boolean);
  }, [dentistsStore]);

  const cities = useMemo(() => {
    const set = new Set(patients.map((p) => p.city).filter(Boolean));
    return Array.from(set);
  }, [patients]);

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Patients"
        subtitle="All clinics view — search, filter, and open complete patient profile"
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <OwnerStatCard title="Total Patients" value={stats.total} icon={Users} />
        <OwnerStatCard title="Active Patients" value={stats.active} icon={UserCheck} />
        <OwnerStatCard title="Pending Labs" value={stats.pendingLabs} icon={FlaskConical} />
        <OwnerStatCard
          title="Total Revenue (Patients)"
          value={`PKR ${Number(stats.revenue || 0).toLocaleString("en-PK")}`}
          icon={Banknote}
          subtitle="Sum of totalSpent"
        />
      </div>

      {/* Filters */}
      <OwnerPatientsFilters
        filters={filters}
        dentists={dentists}   // ✅ from backend now
        cities={cities}
        onChange={setFilter}
        onReset={resetFilters}
      />

      {/* Table */}
      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-semibold text-gray-900">Results</h2>
            <p className="text-sm text-gray-500">
              Showing{" "}
              <span className="font-semibold text-gray-900">{data.length}</span>
            </p>
          </div>

          <div className="mt-4">
            <OwnerPatientsTable data={data} onView={openProfile} />
          </div>
        </CardContent>
      </Card>

      {/* Profile Modal */}
      <OwnerPatientProfileModal
        open={!!selectedPatient}
        patient={selectedPatient}
        onClose={closeProfile}
      />
    </div>
  );
};

export default OwnerPatients;