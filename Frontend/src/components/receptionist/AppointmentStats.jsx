import StatCard from "./StatCard";
import { Calendar, CheckCircle2, XCircle } from "lucide-react";

export default function AppointmentStats({ appointments }) {
  const today = new Date().toISOString().split("T")[0];

  const todayAppointments = appointments.filter(a => a.date === today);
  const completed = todayAppointments.filter(a => a.status === "Completed").length;
  const cancelled = todayAppointments.filter(a => a.status === "Cancelled").length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard
        title="Today's Appointments"
        value={todayAppointments.length}
        icon={Calendar}
      />
      <StatCard
        title="Completed"
        value={completed}
        icon={CheckCircle2}
      />
      <StatCard
        title="Cancelled"
        value={cancelled}
        icon={XCircle}
      />
    </div>
  );
}