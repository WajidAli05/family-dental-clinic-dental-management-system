import { Card, CardContent } from "@/components/ui/card";
import { useLabStore } from "@/store/labStore";
import CountUp from "react-countup";
import {
  ClipboardList,
  RefreshCcw,
  CheckCircle,
  Clock,
} from "lucide-react";

export default function LabStats() {
  const { stats } = useLabStore();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard title="Total Assigned" value={stats.total} icon={ClipboardList} />
      <StatCard title="In Process" value={stats.inProcess} icon={RefreshCcw} />
      <StatCard title="Ready" value={stats.ready} icon={CheckCircle} />
      <StatCard title="Recently Updated" value={stats.recent} icon={Clock} />
    </div>
  );
}

const StatCard = ({ title, value, icon: Icon }) => (
  <Card className="rounded-2xl shadow-sm group">
    <CardContent className="p-6 flex items-center justify-between">
      
      {/* Left content */}
      <div className="text-left">
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-2">
          <CountUp end={value ?? 0} duration={2} separator="," />
        </p>
      </div>

      {/* Animated icon */}
      <Icon
        size={48}
        className="
          text-[#2ec4b6]
          opacity-80
          animate-float
          transition-transform duration-300
          group-hover:scale-110
        "
      />
    </CardContent>
  </Card>
);