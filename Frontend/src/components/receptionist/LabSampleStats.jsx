import StatCard from "./StatCard";
import { TestTube, Truck, Cog, CheckCircle } from "lucide-react";

export default function LabSampleStats({ stats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
      <StatCard title="Total Samples" value={stats.total} icon={TestTube} />
      <StatCard title="Sent" value={stats.sent} icon={Truck} />
      <StatCard title="In Process" value={stats.inProcess} icon={Cog} />
      <StatCard title="Ready" value={stats.ready} icon={CheckCircle} />
    </div>
  );
}