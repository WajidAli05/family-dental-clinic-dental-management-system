import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function LabSamplesTable({ data }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Patient</TableHead>
          <TableHead>Sample</TableHead>
          <TableHead>Lab</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {data.map((item, i) => (
          <TableRow key={i}>
            <TableCell>{item.patient}</TableCell>
            <TableCell>{item.sample}</TableCell>
            <TableCell>{item.lab}</TableCell>
            <TableCell>
              <Badge className="bg-yellow-100 text-yellow-700">
                {item.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}