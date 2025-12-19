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
import { Pencil, Trash2 } from "lucide-react";

const statusStyles = {
  Sent: "bg-blue-100 text-blue-700",
  "In Process": "bg-yellow-100 text-yellow-700",
  Ready: "bg-green-100 text-green-700",
  Delivered: "bg-gray-200 text-gray-700",
};

export default function LabSampleManagementTable({
  data,
  onStatusChange,
  onDeliver,
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
        {data.map((sample) => (
          <TableRow key={sample.id}>
            <TableCell className="font-medium">{sample.id}</TableCell>
            <TableCell>{sample.patientName}</TableCell>
            <TableCell>{sample.lab}</TableCell>

            {/* ✅ SAFE RENDER */}
            <TableCell>
              {Array.isArray(sample.teeth)
                ? sample.teeth.join(", ")
                : "—"}
            </TableCell>

            <TableCell>
              <Badge className={statusStyles[sample.status]}>
                {sample.status}
              </Badge>
            </TableCell>

            <TableCell className="text-right space-x-2">
              <Button
                size="icon"
                variant="outline"
                onClick={() => onEdit(sample)}
              >
                <Pencil size={16} />
              </Button>

              <Button
                size="icon"
                variant="outline"
                onClick={() => onDelete(sample.id)}
              >
                <Trash2 size={16} />
              </Button>

              {sample.status !== "Delivered" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onStatusChange(sample.id, "In Process")
                    }
                  >
                    In Process
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onStatusChange(sample.id, "Ready")
                    }
                  >
                    Ready
                  </Button>

                  <Button
                    size="sm"
                    className="bg-[#2ec4b6] hover:bg-[#26a699]"
                    onClick={() => onDeliver(sample.id)}
                  >
                    Deliver
                  </Button>
                </>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}