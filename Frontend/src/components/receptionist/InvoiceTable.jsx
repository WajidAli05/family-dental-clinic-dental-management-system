import {
  Table, TableHeader, TableRow, TableHead,
  TableBody, TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer, Mail } from "lucide-react";

const colors = {
  Pending: "bg-red-100 text-red-700",
  Partial: "bg-yellow-100 text-yellow-700",
  Paid: "bg-green-100 text-green-700",
};

const InvoiceTable = ({ data, onPay, onPrint }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Invoice</TableHead>
        <TableHead>Patient</TableHead>
        <TableHead>Total</TableHead>
        <TableHead>Paid</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Actions</TableHead>
      </TableRow>
    </TableHeader>

    <TableBody>
      {data.map(inv => (
        <TableRow key={inv.id}>
          <TableCell>{inv.id}</TableCell>
          <TableCell>{inv.patientName}</TableCell>
          <TableCell>{inv.total}</TableCell>
          <TableCell>{inv.paid}</TableCell>
          <TableCell>
            <Badge className={colors[inv.status]}>{inv.status}</Badge>
          </TableCell>
          <TableCell className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onPrint(inv)}>
              <Printer className="w-4 h-4" />
            </Button>
            {inv.status !== "Paid" && (
              <Button size="sm" onClick={() => onPay(inv)}>
                Pay
              </Button>
            )}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

export default InvoiceTable;