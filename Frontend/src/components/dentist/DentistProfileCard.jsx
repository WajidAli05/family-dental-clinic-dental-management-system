import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";

const DentistProfileCard = ({ dentist }) => {
  if (!dentist) return null;

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-[#2ec4b61a]">
            <User className="w-6 h-6 text-[#2ec4b6]" />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {dentist.name}
            </h2>
            <p className="text-gray-500 text-sm">
              {dentist.specialization}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Status:</span>
          <Badge
            className={
              dentist.available
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            }
          >
            {dentist.available ? "Available" : "Unavailable"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default DentistProfileCard;