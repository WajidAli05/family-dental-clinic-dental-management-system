import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smile, FileText, Calendar } from "lucide-react";

const QuickActions = () => {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold mb-4">
          Quick Actions
        </h2>

        <div className="flex flex-wrap gap-3">
          <Button className="bg-[#2ec4b6] text-white">
            <Smile className="w-4 h-4 mr-2" />
            Start Treatment
          </Button>

          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            View Prescriptions
          </Button>

          <Button variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            Today’s Appointments
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;