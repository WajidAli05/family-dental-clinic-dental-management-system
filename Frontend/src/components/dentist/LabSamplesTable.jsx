import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

const statusStyles = {
  Sent: "bg-gray-100 text-gray-700",
  "In Process": "bg-yellow-100 text-yellow-700",
  Ready: "bg-blue-100 text-blue-700",
  Delivered: "bg-green-100 text-green-700",
  Approved: "bg-emerald-100 text-emerald-700",
};

const LabSamplesTable = ({ data, onApprove }) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Patient</TableHead>
          <TableHead>Lab</TableHead>
          <TableHead>Teeth</TableHead>
          <TableHead>Sent</TableHead>
          <TableHead>Status</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {data.map((s) => (
          <TableRow key={s.id}>
            <TableCell className="font-medium">{s.id}</TableCell>
            <TableCell>{s.patientName}</TableCell>
            <TableCell>{s.lab}</TableCell>
            <TableCell>#{s.teeth.join(", ")}</TableCell>
            <TableCell>{s.sentDate}</TableCell>
            <TableCell>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  statusStyles[s.status]
                }`}
              >
                {s.status}
              </span>
            </TableCell>

            <TableCell>
              {s.status === "Delivered" && (
                <Button
                  size="sm"
                  className="bg-[#2ec4b6] hover:bg-[#26a699]"
                  onClick={() => onApprove(s.id)}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default LabSamplesTable;