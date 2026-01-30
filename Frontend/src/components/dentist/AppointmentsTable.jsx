import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

const AppointmentsTable = ({ data, onStartPrescription, onPrintPrescription }) => {
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

          return (
            <TableRow key={apt.id}>
              <TableCell>{apt.time}</TableCell>
              <TableCell>{apt.patient}</TableCell>
              <TableCell>{apt.type}</TableCell>
              <TableCell>
                <div className="flex gap-2 justify-end">
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