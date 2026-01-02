import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

const AppointmentsTable = ({ data, onStartPrescription }) => {
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
        {data.map((apt) => (
          <TableRow key={apt.id}>
            <TableCell>{apt.time}</TableCell>
            <TableCell>{apt.patient}</TableCell>
            <TableCell>{apt.type}</TableCell>
            <TableCell>
              <Button
                size="sm"
                onClick={() => onStartPrescription(apt)}
                className="bg-[#2ec4b6] hover:bg-[#26a699]"
              >
                Prescribe
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default AppointmentsTable;