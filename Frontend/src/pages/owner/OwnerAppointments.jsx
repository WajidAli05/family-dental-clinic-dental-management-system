// src/pages/owner/OwnerAppointments.jsx
import { useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDentistStore } from "@/store/dentistStore";
import { useOwnerAppointmentsStore } from "@/store/ownerAppointmentsStore";
import OwnerAppointmentsTable from "@/components/owner/OwnerAppointmentsTable";
import AppointmentDetailsModal from "@/components/owner/AppointmentDetailsModal";
import OwnerPageHeader from "@/components/owner/OwnerPageHeader";

const filterAppointments = (appointments, filters) => {
  const { dateFrom, dateTo, dentistId, status, query } = filters;

  const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
  const to = dateTo ? new Date(`${dateTo}T23:59:59`) : null;
  const q = String(query || "").trim().toLowerCase();

  return appointments.filter((a) => {
    const d = new Date(`${a.date}T12:00:00`);

    if (from && d < from) return false;
    if (to && d > to) return false;

    if (dentistId !== "all" && String(a.dentistId) !== String(dentistId)) return false;

    if (status !== "all" && a.status !== status) return false;

    if (q) {
      const hay = `${a.id} ${a.patientName} ${a.patientPhone} ${a.dentistName} ${a.reason} ${a.status}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }

    return true;
  });
};

const OwnerAppointments = () => {
  const dentists = useDentistStore((s) => s.dentists);
  const fetchAllDentists = useDentistStore((s) => s.fetchAllDentists);

  const filters = useOwnerAppointmentsStore((s) => s.filters);
  const appointments = useOwnerAppointmentsStore((s) => s.appointments);

  const setFilter = useOwnerAppointmentsStore((s) => s.setFilter);
  const resetFilters = useOwnerAppointmentsStore((s) => s.resetFilters);

  const selectedAppointment = useOwnerAppointmentsStore((s) => s.selectedAppointment);
  const openDetails = useOwnerAppointmentsStore((s) => s.openDetails);
  const closeDetails = useOwnerAppointmentsStore((s) => s.closeDetails);

  useEffect(() => {
    // ✅ Load dentists for dropdown (owner is allowed on /receptionist/dentists per your v1 router)
    fetchAllDentists?.();

    // ✅ Load appointments list (owner store init)
    useOwnerAppointmentsStore.getState().init();
  }, [fetchAllDentists]);

  const data = useMemo(() => filterAppointments(appointments, filters), [appointments, filters]);

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Appointments"
        subtitle="All clinics view — filter by date, dentist, and status"
      />

      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            <Button variant="outline" className="rounded-xl" onClick={resetFilters}>
              Reset
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Field label="From">
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilter("dateFrom", e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30"
              />
            </Field>

            <Field label="To">
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilter("dateTo", e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30"
              />
            </Field>

            <Field label="Dentist">
              <select
                value={filters.dentistId}
                onChange={(e) => setFilter("dentistId", e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30"
              >
                <option value="all">All Dentists</option>
                {dentists.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Status">
              <select
                value={filters.status}
                onChange={(e) => setFilter("status", e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30"
              >
                <option value="all">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="checked_in">Checked-in</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </Field>

            <Field label="Search">
              <input
                value={filters.query}
                onChange={(e) => setFilter("query", e.target.value)}
                placeholder="Patient, dentist, ID..."
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30"
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-semibold text-gray-900">Results</h2>
            <p className="text-sm text-gray-500">
              Showing <span className="font-semibold text-gray-900">{data.length}</span>
            </p>
          </div>

          <div className="mt-4">
            <OwnerAppointmentsTable data={data} onView={openDetails} />
          </div>
        </CardContent>
      </Card>

      <AppointmentDetailsModal
        open={!!selectedAppointment}
        appointment={selectedAppointment}
        onClose={closeDetails}
      />
    </div>
  );
};

const Field = ({ label, children }) => (
  <div>
    <p className="text-xs font-semibold text-gray-600 mb-1">{label}</p>
    {children}
  </div>
);

export default OwnerAppointments;