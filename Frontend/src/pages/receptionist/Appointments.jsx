import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import { useAppointmentStore } from "@/store/appointmentStore";
import AddAppointmentModal from "@/components/receptionist/AddAppointmentModal";

import AppointmentStats from "@/components/receptionist/AppointmentStats";
import AppointmentFilters from "@/components/receptionist/AppointmentFilters";
import AppointmentManagementTable from "@/components/receptionist/AppointmentsTable";

import Wavify from "react-wavify";

const Appointments = () => {
  const {
    appointments,
    updateAppointmentStatus,
  } = useAppointmentStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");

  const filteredAppointments = appointments.filter((a) => {
    const matchesQuery =
      a.patientName.toLowerCase().includes(query.toLowerCase()) ||
      a.mr?.toString().includes(query);

    const matchesStatus =
      status === "All" || a.status === status;

    return matchesQuery && matchesStatus;
  });

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-white">
        <Wavify
          fill="#2ec4b6"
          paused={false}
          options={{ height: 20, amplitude: 30, speed: 0.15, points: 3 }}
          className="absolute bottom-0 left-0 w-full opacity-20"
        />
        <div className="relative z-10 p-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Appointments
          </h1>
          <p className="text-gray-500">
            Book, manage and track patient appointments
          </p>
        </div>
      </div>

      {/* Stats */}
      <AppointmentStats appointments={appointments} />

      {/* Table */}
      <Card className="rounded-2xl">
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <AppointmentFilters
              query={query}
              setQuery={setQuery}
              status={status}
              setStatus={setStatus}
            />

            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-[#2ec4b6] hover:bg-[#26a699]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Book Appointment
            </Button>
          </div>

          <AppointmentManagementTable
            data={filteredAppointments}
            onComplete={(id) =>
              updateAppointmentStatus(id, "Completed")
            }
            onCancel={(id) =>
              updateAppointmentStatus(id, "Cancelled")
            }
          />
        </CardContent>
      </Card>

      {/* Modal */}
      <AddAppointmentModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
};

export default Appointments;