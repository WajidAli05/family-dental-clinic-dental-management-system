import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import AppointmentStatusControl from "@/components/appointments/AppointmentStatusControl";
import { typeKey } from "@/lib/appointmentConfig";

const AppointmentsTable = ({
  data,
  onStartPrescription,
  onPrintPrescription,
  onEdit,
  onStatusChange,
}) => {
  const { t } = useTranslation();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Time</TableHead>
          <TableHead>Patient</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
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
              <TableCell>
                {apt.appointmentType
                  ? t(typeKey(apt.appointmentType))
                  : (apt.type || "—")}
              </TableCell>
              <TableCell>
                <AppointmentStatusControl
                  status={apt.original?.statusCode || apt.original?.status || apt.status}
                  allowedNext={apt.original?.allowedNext}
                  onChange={onStatusChange ? (next) => onStatusChange(apt, next) : undefined}
                />
              </TableCell>
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