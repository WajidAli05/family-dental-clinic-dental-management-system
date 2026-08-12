import { useMemo, useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, LayoutGrid, List, Search } from "lucide-react";

import Wavify from "react-wavify";

import { useAppointmentStore } from "@/store/appointmentStore";
import { useDentistStore } from "@/store/dentistStore";

import AddAppointmentModal from "@/components/receptionist/AddAppointmentModal";
import EditAppointmentModal from "@/components/receptionist/EditAppointmentModal";
import RescheduleAppointmentModal from "@/components/appointments/RescheduleAppointmentModal";
import { receptionistApi } from "@/lib/receptionistApi";

import AppointmentStats from "@/components/receptionist/AppointmentStats";
import AppointmentFilters from "@/components/receptionist/AppointmentFilters";
import AppointmentManagementTable from "@/components/receptionist/AppointmentsTable";
import AppointmentCalendar from "@/components/receptionist/AppointmentCalendar";
import DentistSchedule from "@/components/receptionist/DentistSchedule";

import TablePagination from "@/components/ui/TablePagination";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { usePagination } from "@/hooks/usePagination";
import { useTableSort } from "@/hooks/useTableSort";

const Appointments = () => {
  const {
    appointments,
    fetchAppointments,
    updateAppointmentStatus,
    loading,
    error,
    pagination,
  } = useAppointmentStore();

  const { fetchAllDentists } = useDentistStore();

  const { page, limit, setPage, resetPage } = usePagination(50);
  const { sortBy, sortDir } = useTableSort("date", "desc");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editAppt, setEditAppt] = useState(null);
  const [reschedAppt, setReschedAppt] = useState(null);
  const [view, setView] = useState("list");

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ date: "", dentist: "All", status: "All" });

  const load = useCallback(() => {
    if (typeof fetchAppointments !== "function") return;
    const params = { page, limit, sortBy, sortDir };
    if (filters.date) params.date = filters.date;
    if (filters.dentist && filters.dentist !== "All") params.dentist = filters.dentist;
    if (filters.status && filters.status !== "All") params.status = filters.status;
    if (search) params.q = search;
    fetchAppointments(params);
  }, [fetchAppointments, filters.date, filters.dentist, filters.status, search, page, limit, sortBy, sortDir]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (typeof fetchAllDentists === "function") fetchAllDentists();
  }, [fetchAllDentists]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    resetPage();
  };

  const handleSearch = (val) => {
    setSearch(val);
    resetPage();
  };

  const filteredAppointments = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (appointments || []).filter((a) => {
      const matchDate = !filters.date || a.date === filters.date;
      const matchDentist = filters.dentist === "All" || a.dentistId === filters.dentist;
      const matchStatus = filters.status === "All" || a.status === filters.status;
      const matchSearch =
        !needle ||
        String(a.patientName || "").toLowerCase().includes(needle) ||
        String(a.id || "").toLowerCase().includes(needle) ||
        String(a.patientId || "").toLowerCase().includes(needle);
      return matchDate && matchDentist && matchStatus && matchSearch;
    });
  }, [appointments, filters, search]);

  const dentistAppointments = useMemo(() => {
    if (filters.dentist === "All") return [];
    return filteredAppointments.filter((a) => a.dentist === filters.dentist);
  }, [filteredAppointments, filters.dentist]);

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-2xl bg-white">
        <Wavify
          fill="#2ec4b6"
          paused={false}
          options={{ height: 20, amplitude: 30, speed: 0.15, points: 3 }}
          className="absolute bottom-0 left-0 w-full opacity-20"
        />
        <div className="relative z-10 p-6">
          <h1 className="text-2xl font-bold text-gray-900">Appointment Management</h1>
          <p className="text-gray-500">Book, reschedule and manage appointments efficiently</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-50 text-red-700 p-3 text-sm">{error}</div>
      ) : null}

      <AppointmentStats appointments={filteredAppointments} />

      {/* FILTERS + ACTIONS */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative h-9 w-48 shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <Input
            className="h-9 pl-8 text-sm w-full"
            placeholder="Search name or APT-id…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <Input
          type="date"
          className="h-9 text-sm w-36 shrink-0"
          value={filters.date}
          onChange={(e) => handleFilterChange({ ...filters, date: e.target.value })}
        />

        <AppointmentFilters filters={filters} onChange={handleFilterChange} />

        <div className="flex items-center gap-2 ml-auto">
          <Button
            size="sm"
            variant={view === "list" ? "default" : "outline"}
            onClick={() => setView("list")}
          >
            <List className="w-4 h-4 mr-1" />
            List
          </Button>
          <Button
            size="sm"
            variant={view === "calendar" ? "default" : "outline"}
            onClick={() => setView("calendar")}
          >
            <LayoutGrid className="w-4 h-4 mr-1" />
            Calendar
          </Button>
          <Button
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="bg-[#2ec4b6] hover:bg-[#26a699]"
          >
            <Plus className="w-4 h-4 mr-1" />
            Book Appointment
          </Button>
        </div>
      </div>

      {/* CONTENT */}
      {view === "list" ? (
        <Card className="rounded-2xl">
          <CardContent className="p-6 space-y-6">
            {filters.dentist !== "All" && (
              <DentistSchedule dentist={filters.dentist} appointments={dentistAppointments} />
            )}

            {loading ? (
              <TableSkeleton rows={8} cols={6} />
            ) : (
              <AppointmentManagementTable
                data={filteredAppointments}
                onStatusChange={(id, next) => updateAppointmentStatus(id, next)}
                onEdit={(a) => setEditAppt(a)}
                onReschedule={(a) => setReschedAppt(a)}
              />
            )}

            <TablePagination
              page={pagination?.page ?? page}
              pages={pagination?.pages ?? 1}
              total={pagination?.total ?? 0}
              limit={limit}
              onPage={setPage}
            />
          </CardContent>
        </Card>
      ) : (
        <AppointmentCalendar appointments={filteredAppointments} />
      )}

      <AddAppointmentModal open={isModalOpen} onOpenChange={setIsModalOpen} />

      <RescheduleAppointmentModal
        open={!!reschedAppt}
        appointment={reschedAppt}
        onOpenChange={(v) => { if (!v) setReschedAppt(null); }}
        onSubmit={async (payload) => {
          await receptionistApi.rescheduleAppointment(reschedAppt.id, payload);
          setReschedAppt(null);
          load();
        }}
      />

      <EditAppointmentModal
        open={!!editAppt}
        appointment={editAppt}
        onOpenChange={(v) => { if (!v) setEditAppt(null); }}
        onSaved={() => { setEditAppt(null); load(); }}
      />
    </div>
  );
};

export default Appointments;
