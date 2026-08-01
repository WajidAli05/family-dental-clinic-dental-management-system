import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { useFormatMoney } from "@/store/clinicConfigStore";

const statusStyles = {
  Sent: "bg-gray-100 text-gray-700",
  "In Process": "bg-yellow-100 text-yellow-700",
  Ready: "bg-blue-100 text-blue-700",
  Delivered: "bg-green-100 text-green-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-red-100 text-red-700",
};

// Finalized = no further approve/reject allowed without reopening first
const FINALIZED = new Set(["Approved", "Rejected"]);
// Reopenable = dentist can send back to lab
const REOPENABLE = new Set(["Approved", "Rejected", "Delivered"]);

const LabSamplesTable = ({ data, onStatusChange }) => {
  const money = useFormatMoney();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Patient</TableHead>
          <TableHead>Lab</TableHead>
          <TableHead>Sample Type</TableHead>
          <TableHead>Teeth</TableHead>
          <TableHead>Sent</TableHead>
          <TableHead>Status</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {data.map((s) => {
          const finalized = FINALIZED.has(s.status);
          const reopenable = REOPENABLE.has(s.status);
          return (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.id}</TableCell>
              <TableCell>{s.patientName}</TableCell>
              <TableCell>{s.lab}</TableCell>
              <TableCell>
                <span className="text-sm">{s.type || "—"}</span>
                {s.sampleTypePrice > 0 && (
                  <span className="ml-1 text-xs text-gray-500">
                    {money(s.sampleTypePrice)}
                  </span>
                )}
              </TableCell>
              <TableCell>#{s.teeth.join(", ")}</TableCell>
              <TableCell>{s.sentDate}</TableCell>
              <TableCell>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    statusStyles[s.status] || "bg-gray-100 text-gray-700"
                  }`}
                >
                  {s.status}
                </span>
              </TableCell>

              <TableCell>
                <div className="flex gap-1 flex-wrap">
                  {!finalized && (
                    <>
                      <Button
                        size="sm"
                        className="bg-[#2ec4b6] hover:bg-[#26a699]"
                        onClick={() => onStatusChange(s.id, "approved")}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onStatusChange(s.id, "rejected")}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}
                  {reopenable && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onStatusChange(s.id, "reopened")}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
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

export default LabSamplesTable;
