import {
  Table, TableHeader, TableRow, TableHead,
  TableBody, TableCell
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import AppointmentStatusControl from "@/components/appointments/AppointmentStatusControl";
import { typeKey } from "@/lib/appointmentConfig";

/**
 * Status is rendered by the shared AppointmentStatusControl, which offers
 * exactly the transitions the server allows for the current status (including
 * Reopen from completed/cancelled). The previous hardcoded
 * Complete/Cancel/Reopen buttons keyed off literal "Scheduled"/"Completed"
 * strings, so they silently disappeared once the lifecycle statuses landed.
 */
export default function AppointmentManagementTable({
  data,
  onStatusChange,
  onEdit,
}) {
  const { t } = useTranslation();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Patient</TableHead>
          <TableHead>Dentist</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Time</TableHead>
          <TableHead>Type</TableHead>
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
              {a.appointmentType ? t(typeKey(a.appointmentType)) : "—"}
            </TableCell>
            <TableCell>
              <AppointmentStatusControl
                status={a.statusCode || a.status}
                allowedNext={a.allowedNext}
                onChange={onStatusChange ? (next) => onStatusChange(a.id, next) : undefined}
              />
            </TableCell>
            <TableCell>
              {onEdit && (
                <Button size="sm" variant="outline" onClick={() => onEdit(a)}>
                  {t("appointments.edit")}
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
