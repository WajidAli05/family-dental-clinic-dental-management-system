import { Card, CardContent } from "@/components/ui/card";

export default function DentistSchedule({ dentist, appointments }) {
  return (
    <Card className="rounded-xl">
      <CardContent className="p-4">
        <h3 className="font-semibold mb-3">{dentist}</h3>

        {appointments.length === 0 ? (
          <p className="text-sm text-gray-500">No appointments</p>
        ) : (
          appointments.map((a) => (
            <div key={a.id} className="text-sm mb-2">
              {a.time} — {a.patientName}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}