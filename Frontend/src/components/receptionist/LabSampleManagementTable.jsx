import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2 } from "lucide-react";

const ALL_STATUSES = ["Sent", "In Process", "Ready", "Delivered", "Approved", "Rejected"];

const statusStyles = {
  Sent: "bg-blue-100 text-blue-700",
  "In Process": "bg-yellow-100 text-yellow-700",
  Ready: "bg-green-100 text-green-700",
  Delivered: "bg-gray-200 text-gray-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-red-100 text-red-700",
};

export default function LabSampleManagementTable({
  data = [],
  onStatusChange,
  onEdit,
  onDelete,
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Sample ID</TableHead>
          <TableHead>Patient</TableHead>
          <TableHead>Lab</TableHead>
          <TableHead>Teeth</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {data.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-gray-500 py-6">
              No lab samples found
            </TableCell>
          </TableRow>
        )}

        {data.map((sample) => {
          const teethDisplay = Array.isArray(sample.teeth)
            ? sample.teeth.filter(Boolean).join(", ")
            : "—";

          return (
            <TableRow key={sample.id}>
              <TableCell className="font-medium">{sample.id}</TableCell>
              <TableCell>{sample.patientName}</TableCell>
              <TableCell>{sample.lab}</TableCell>
              <TableCell>{teethDisplay || "—"}</TableCell>

              {/* Badge shows current status */}
              <TableCell>
                <Badge className={statusStyles[sample.status] || "bg-gray-100 text-gray-600"}>
                  {sample.status}
                </Badge>
              </TableCell>

              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  {/* Status Select — any ↔ any */}
                  <Select
                    value={sample.status}
                    onValueChange={(newStatus) => {
                      if (newStatus !== sample.status) {
                        onStatusChange(sample.id, newStatus);
                      }
                    }}
                  >
                    <SelectTrigger className="w-[130px] h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Edit */}
                  <Button size="icon" variant="outline" onClick={() => onEdit(sample)}>
                    <Pencil size={16} />
                  </Button>

                  {/* Delete */}
                  <Button size="icon" variant="outline" onClick={() => onDelete(sample.id)}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
