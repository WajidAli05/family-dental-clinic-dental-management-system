import StatCard from "./StatCard";
import { Calendar, CheckCircle2, XCircle } from "lucide-react";

export default function AppointmentStats({ appointments }) {
  const rows = appointments || [];
  const completed = rows.filter((a) => a.status === "Completed").length;
  const cancelled = rows.filter((a) => a.status === "Cancelled").length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard
        title="Appointments"
        value={rows.length}
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
