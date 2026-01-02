import { Card, CardContent } from "@/components/ui/card";
import { FlaskConical, Clock, CheckCircle } from "lucide-react";

const Stat = ({ title, value, icon: Icon }) => (
  <Card className="rounded-2xl">
    <CardContent className="p-5 flex items-center gap-4">
      <div className="p-3 rounded-xl bg-[#2ec4b61a]">
        <Icon className="w-5 h-5 text-[#2ec4b6]" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </CardContent>
  </Card>
);

const LabSampleStats = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Stat title="Total Samples" value={stats.total} icon={FlaskConical} />
      <Stat title="In Process" value={stats.inProcess} icon={Clock} />
      <Stat title="Ready" value={stats.ready} icon={CheckCircle} />
      <Stat title="Recent" value={stats.recent} icon={FlaskConical} />
    </div>
  );
};

export default LabSampleStats;