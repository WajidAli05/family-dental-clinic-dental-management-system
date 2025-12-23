import { Card, CardContent } from "@/components/ui/card";

const StatCard = ({ title, value, icon: Icon }) => {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="p-3 rounded-xl bg-[#2ec4b6]/10">
          <Icon className="w-6 h-6 text-[#2ec4b6]" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;