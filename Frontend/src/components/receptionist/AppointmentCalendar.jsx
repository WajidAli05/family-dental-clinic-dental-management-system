import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AppointmentCalendar({ appointments }) {
  const grouped = appointments.reduce((acc, a) => {
    acc[a.date] = acc[a.date] || [];
    acc[a.date].push(a);
    return acc;
  }, {});

  return (
    <div className="grid gap-4">
      {Object.entries(grouped).map(([date, items]) => (
        <Card key={date} className="rounded-xl">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">{date}</h3>
            <div className="space-y-2">
              {items.map((a) => (
                <div
                  key={a.id}
                  className="flex justify-between items-center text-sm"
                >
                  <div>
                    <p className="font-medium">{a.patientName}</p>
                    <p className="text-gray-500">
                      {a.time} • {a.dentist}
                    </p>
                  </div>
                  <Badge>{a.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}