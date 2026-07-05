import { useEffect, useMemo, useCallback } from "react";
import OwnerPageHeader from "@/components/owner/OwnerPageHeader";
import OwnerStatCard from "@/components/owner/OwnerStatCard";
import OwnerPatientsFilters from "@/components/owner/OwnerPatientsFilters";
import OwnerPatientsTable from "@/components/owner/OwnerPatientsTable";
import OwnerPatientProfileModal from "@/components/owner/OwnerPatientProfileModal";
import { Card, CardContent } from "@/components/ui/card";
import { useOwnerPatientsStore } from "@/store/ownerPatientsStore";
import { useDentistStore } from "@/store/dentistStore";
import { Users, UserCheck, FlaskConical, Banknote } from "lucide-react";
import TableSkeleton from "@/components/ui/TableSkeleton";
import StatCardSkeleton from "@/components/ui/StatCardSkeleton";
import TablePagination from "@/components/ui/TablePagination";
import { usePagination } from "@/hooks/usePagination";

const OwnerPatients = () => {
  const filters = useOwnerPatientsStore((s) => s.filters);
  const patients = useOwnerPatientsStore((s) => s.patients);
  const loading = useOwnerPatientsStore((s) => s.loading);
  const error = useOwnerPatientsStore((s) => s.error);
  const pagination = useOwnerPatientsStore((s) => s.pagination);
  const dbStats = useOwnerPatientsStore((s) => s.dbStats);
  const selectedPatient = useOwnerPatientsStore((s) => s.selectedPatient);

  const setFilter = useOwnerPatientsStore((s) => s.setFilter);
  const resetFilters = useOwnerPatientsStore((s) => s.resetFilters);
  const openProfile = useOwnerPatientsStore((s) => s.openProfile);
  const closeProfile = useOwnerPatientsStore((s) => s.closeProfile);
  const fetchPatients = useOwnerPatientsStore((s) => s.fetchPatients);

  const dentistsStore = useDentistStore((s) => s.dentists);
  const fetchAllDentists = useDentistStore((s) => s.fetchAllDentists);

  const { page, limit, setPage, resetPage } = usePagination(50);

  // Load from server — passes q and status for server-side filtering
  const load = useCallback(() => {
    fetchPatients({
      page,
      limit,
      q: filters.query || "",
      status: filters.status !== "all" ? filters.status : "",
    });
  }, [fetchPatients, page, limit, filters.query, filters.status]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => { fetchAllDentists(); }, [fetchAllDentists]);

  // Client-side filters for city / dentist / gender / date range
  // (applied within the current page; server already filtered q + status)
  const data = useMemo(() => {
    const { city, dentist, gender, dateFrom, dateTo } = filters;
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59`) : null;

    return patients.filter((p) => {
      if (city !== "all" && p.city !== city) return false;
      if (dentist !== "all" && p.dentist !== dentist) return false;
      if (gender !== "all" && String(p.gender).toLowerCase() !== gender) return false;

      if (from || to) {
        const lv = p.lastVisit ? new Date(`${p.lastVisit}T12:00:00`) : null;
        if (from && lv && lv < from) return false;
        if (to && lv && lv > to) return false;
      }

      return true;
    });
  }, [patients, filters]);

  const dentists = useMemo(
    () => (dentistsStore || []).map((d) => d.name).filter(Boolean),
    [dentistsStore]
  );

  const cities = useMemo(() => {
    const set = new Set(patients.map((p) => p.city).filter(Boolean));
    return Array.from(set);
  }, [patients]);

  // When search/status filter changes, reset to page 1 then reload
  const handleFilterChange = (key, value) => {
    setFilter(key, value);
    if (key === "query" || key === "status") resetPage();
  };

  const handleReset = () => {
    resetFilters();
    resetPage();
  };

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Patients"
        subtitle="All clinics view — search, filter, and open complete patient profile"
      />

      {error ? (
        <div className="rounded-xl bg-red-50 text-red-700 p-3 text-sm">{error}</div>
      ) : null}

      {/* Stat Cards — use DB-level counts from the server, never page-length */}
      {loading && !patients.length ? <StatCardSkeleton /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <OwnerStatCard title="Total Patients" value={dbStats.total} icon={Users} />
          <OwnerStatCard title="Active Patients" value={dbStats.active} icon={UserCheck} />
          <OwnerStatCard title="Pending Labs" value={dbStats.pendingLabs} icon={FlaskConical} />
          <OwnerStatCard
            title="Total Revenue (Patients)"
            value={`PKR ${Number(dbStats.revenue || 0).toLocaleString("en-PK")}`}
            icon={Banknote}
            subtitle="Sum of all invoices"
          />
        </div>
      )}

      {/* Filters */}
      <OwnerPatientsFilters
        filters={filters}
        dentists={dentists}
        cities={cities}
        onChange={handleFilterChange}
        onReset={handleReset}
      />

      {/* Table */}
      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-semibold text-gray-900">Results</h2>
            <p className="text-sm text-gray-500">
              Showing{" "}
              <span className="font-semibold text-gray-900">{data.length}</span>
              {pagination.total > 0 && pagination.total !== data.length ? (
                <> of <span className="font-semibold text-gray-900">{pagination.total}</span></>
              ) : null}
            </p>
          </div>

          <div className="mt-4">
            {loading ? (
              <TableSkeleton rows={8} cols={5} />
            ) : (
              <OwnerPatientsTable data={data} onView={openProfile} />
            )}
          </div>

          <TablePagination
            page={pagination.page}
            pages={pagination.pages}
            total={pagination.total}
            limit={limit}
            onPage={setPage}
          />
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
