import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const InventoryTable = ({ data }) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Stock</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Used In</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {data.map((item) => {
          const low = item.stock <= item.minStock;
          return (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                {item.name}
              </TableCell>
              <TableCell>{item.category}</TableCell>
              <TableCell>
                {item.stock} {item.unit}
              </TableCell>
              <TableCell>
                    <Badge
                    variant={
                        item.stock === 0
                        ? "destructive"
                        : item.stock <= item.minStock
                        ? "secondary"
                        : "default"
                    }
                    >
                    {item.stock === 0
                        ? "Out"
                        : item.stock <= item.minStock
                        ? "Low"
                        : "OK"}
                    </Badge>
              </TableCell>
              <TableCell className="text-sm text-gray-500">
                {item.usedIn.join(", ")}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default InventoryTable;