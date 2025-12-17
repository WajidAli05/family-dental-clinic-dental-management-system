import StatCard from "./StatCard";
import { Users, UserCheck, UserX } from "lucide-react";

export default function PatientStats({ patients }) {
  const total = patients?.length;
  const active = patients?.filter(p => p.status === "Active").length;
  const inactive = patients?.filter(p => p.status === "Inactive").length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard title="Total Patients" value={total} icon={Users} />
      <StatCard title="Active Patients" value={active} icon={UserCheck} />
      <StatCard title="Inactive Patients" value={inactive} icon={UserX} />
    </div>
  );
}