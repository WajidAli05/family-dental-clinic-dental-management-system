import { Card, CardContent } from "@/components/ui/card";
import CountUp from "react-countup";

export default function StatCard({ title, value, icon: Icon }) {
  return (
    <Card className="rounded-2xl shadow-sm group">
      <CardContent className="p-6 flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-3xl font-bold mt-2">
            <CountUp end={value} duration={2} separator="," />
          </p>
        </div>

        <Icon
          size={48}
          className="text-[#2ec4b6] opacity-80 animate-float group-hover:scale-110 transition"
        />
      </CardContent>
    </Card>
  );
}