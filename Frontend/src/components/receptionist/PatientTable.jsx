import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Eye } from "lucide-react";

export default function PatientTable({ patients, onEdit, onView }) {
  const { t } = useTranslation();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Age</TableHead>
          <TableHead>Last Visit</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {patients.map((patient) => (
          <TableRow key={patient.id}>
            <TableCell className="font-medium">{patient.id}</TableCell>
            <TableCell>{patient.name}</TableCell>
            <TableCell>{patient.phone}</TableCell>
            <TableCell>{patient.age}</TableCell>
            <TableCell>{patient.lastVisit}</TableCell>
            <TableCell>
              <Badge
                className={
                  patient.status === "active"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-200 text-gray-600"
                }
              >
                {patient.status === "active" ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="inline-flex gap-2">
                {/* Opening the record was only reachable behind an "Edit"
                    pencil, which reads as demographics editing — so the front
                    desk never found documents or consent. */}
                <Button
                  size="sm"
                  className="bg-[#2ec4b6] hover:bg-[#26a699] text-white"
                  onClick={() => (onView || onEdit)?.(patient)}
                >
                  <Eye className="w-3.5 h-3.5 me-1" />
                  {t("patients.view")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit?.(patient)}
                >
                  <Pencil className="w-3.5 h-3.5 me-1" />
                  {t("patients.edit")}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}