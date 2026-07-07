import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

const AppointmentsTable = ({
  data,
  onStartPrescription,
  onPrintPrescription,
  onEdit,
  onStatusChange,
}) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Time</TableHead>
          <TableHead>Patient</TableHead>
          <TableHead>Treatment</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {data.map((apt) => {
          const hasRx = !!apt.prescription;
          const rawStatus = apt.original?.status || "";
          const canComplete = rawStatus === "scheduled" || rawStatus === "checked_in";
          const canCancel   = rawStatus === "scheduled" || rawStatus === "checked_in";
          const canReopen   = rawStatus === "completed"  || rawStatus === "cancelled";

          return (
            <TableRow key={apt.id}>
              <TableCell>{apt.time}</TableCell>
              <TableCell>{apt.patient}</TableCell>
              <TableCell>{apt.type}</TableCell>
              <TableCell>
                <div className="flex gap-2 justify-end flex-wrap">
                  <Button
                    size="sm"
                    onClick={() => onStartPrescription(apt)}
                    className="bg-[#2ec4b6] hover:bg-[#26a699]"
                  >
                    {hasRx ? "Edit Prescription" : "Prescribe"}
                  </Button>

                  {hasRx && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onPrintPrescription(apt)}
                    >
                      Print
                    </Button>
                  )}

                  {onEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(apt)}
                    >
                      Edit
                    </Button>
                  )}

                  {onStatusChange && canComplete && (
                    <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white"
                      onClick={() => onStatusChange(apt, "completed")}>
                      Complete
                    </Button>
                  )}

                  {onStatusChange && canCancel && (
                    <Button size="sm" variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50"
                      onClick={() => onStatusChange(apt, "cancelled")}>
                      Cancel
                    </Button>
                  )}

                  {onStatusChange && canReopen && (
                    <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={() => onStatusChange(apt, "scheduled")}>
                      Reopen
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default AppointmentsTable;