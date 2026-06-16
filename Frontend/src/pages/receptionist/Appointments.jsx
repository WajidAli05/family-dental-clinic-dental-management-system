import { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, LayoutGrid, List, Search } from "lucide-react";

import Wavify from "react-wavify";

// Store
import { useAppointmentStore } from "@/store/appointmentStore";
import { useDentistStore } from "@/store/dentistStore";

// Modals
import AddAppointmentModal from "@/components/receptionist/AddAppointmentModal";

// Components
import AppointmentStats from "@/components/receptionist/AppointmentStats";
import AppointmentFilters from "@/components/receptionist/AppointmentFilters";
import AppointmentManagementTable from "@/components/receptionist/AppointmentsTable";
import AppointmentCalendar from "@/components/receptionist/AppointmentCalendar";
import DentistSchedule from "@/components/receptionist/DentistSchedule";

const Appointments = () => {
  const {
    appointments,
    fetchAppointments,
    updateAppointmentStatus,
    loading,
    error,
  } = useAppointmentStore();

  const { fetchAllDentists } = useDentistStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [view, setView] = useState("list"); // list | calendar

  const [search, setSearch] = useState("");

  const [filters, setFilters] = useState({
    date: "",
    dentist: "All",
    status: "All",
  });

  // ✅ Load appointments from backend
  useEffect(() => {
    if (typeof fetchAppointments !== "function") return;

    // Only send meaningful filters to backend
    const params = {};
    if (filters.date) params.date = filters.date;
    if (filters.dentist && filters.dentist !== "All") params.dentist = filters.dentist;
    if (filters.status && filters.status !== "All") params.status = filters.status;

    fetchAppointments(params);
  }, [fetchAppointments, filters.date, filters.dentist, filters.status]);

  useEffect(() => {
  if (typeof fetchAllDentists === "function") {
    fetchAllDentists();
  }
}, [fetchAllDentists]);

  /* -------------------- FILTER LOGIC (keep) -------------------- */
  const filteredAppointments = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (appointments || []).filter((a) => {
      const matchDate = !filters.date || a.date === filters.date;
      const matchDentist =
        filters.dentist === "All" || a.dentistId === filters.dentist;
      const matchStatus =
        filters.status === "All" || a.status === filters.status;
      const matchSearch =
        !needle ||
        String(a.patientName || "").toLowerCase().includes(needle) ||
        String(a.id || "").toLowerCase().includes(needle) ||
        String(a.patientId || "").toLowerCase().includes(needle);
      return matchDate && matchDentist && matchStatus && matchSearch;
    });
  }, [appointments, filters, search]);

  /* Dentist-wise appointments */
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
          <h1 className="text-2xl font-bold text-gray-900">
            Appointment Management
          </h1>
          <p className="text-gray-500">
            Book, reschedule and manage appointments efficiently
          </p>
        </div>
      </div>

      {/* Error/Loading (safe, won’t break UI) */}
      {error ? (
        <div className="rounded-xl bg-red-50 text-red-700 p-3 text-sm">
          {error}
        </div>
      ) : null}
      {loading ? (
        <div className="rounded-xl bg-white p-3 text-sm text-gray-600">
          Loading appointments...
        </div>
      ) : null}

      {/* STATS — counts reflect the current filtered view */}
      <AppointmentStats appointments={filteredAppointments} />

      {/* FILTERS + ACTIONS */}
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative self-start h-10 w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              className="h-10 pl-9 w-full"
              placeholder="Search patient name or APT-id…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <AppointmentFilters filters={filters} onChange={setFilters} />
        </div>

        <div className="flex gap-2">
          <Button
            variant={view === "list" ? "default" : "outline"}
            onClick={() => setView("list")}
          >
            <List className="w-4 h-4 mr-1" />
            List
          </Button>

          <Button
            variant={view === "calendar" ? "default" : "outline"}
            onClick={() => setView("calendar")}
          >
            <LayoutGrid className="w-4 h-4 mr-1" />
            Calendar
          </Button>

          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#2ec4b6] hover:bg-[#26a699]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Book Appointment
          </Button>
        </div>
      </div>


      {/* CONTENT */}
      {view === "list" ? (
        <Card className="rounded-2xl">
          <CardContent className="p-6 space-y-6">
            {filters.dentist !== "All" && (
              <DentistSchedule
                dentist={filters.dentist}
                appointments={dentistAppointments}
              />
            )}

            <AppointmentManagementTable
              data={filteredAppointments}
              onComplete={(id) => updateAppointmentStatus(id, "Completed")}
              onCancel={(id) => updateAppointmentStatus(id, "Cancelled")}
              onReopen={(id) => updateAppointmentStatus(id, "Scheduled")}
            />
          </CardContent>
        </Card>
      ) : (
        <AppointmentCalendar appointments={filteredAppointments} />
      )}

      {/* MODAL */}
      <AddAppointmentModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
};

export default Appointments;