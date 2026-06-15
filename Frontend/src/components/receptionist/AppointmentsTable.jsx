import {
  Table, TableHeader, TableRow, TableHead,
  TableBody, TableCell
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AppointmentManagementTable({
  data,
  onComplete,
  onCancel,
  onReopen,
}) {
  const statusColor = {
    Scheduled: "bg-blue-100 text-blue-700",
    Completed: "bg-green-100 text-green-700",
    Cancelled: "bg-red-100 text-red-700",
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Patient</TableHead>
          <TableHead>Dentist</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Time</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {data.map((a) => (
          <TableRow key={a.id}>
            <TableCell>{a.patientName}</TableCell>
            <TableCell>{a.dentist}</TableCell>
            <TableCell>{a.date}</TableCell>
            <TableCell>{a.time}</TableCell>
            <TableCell>
              <Badge className={statusColor[a.status]}>
                {a.status}
              </Badge>
            </TableCell>
            <TableCell className="flex gap-2">
              {a.status === "Scheduled" && (
                <>
                  <Button size="sm" onClick={() => onComplete(a.id)}>
                    Complete
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onCancel(a.id)}
                  >
                    Cancel
                  </Button>
                </>
              )}
              {(a.status === "Completed" || a.status === "Cancelled") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReopen(a.id)}
                >
                  Reopen
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}