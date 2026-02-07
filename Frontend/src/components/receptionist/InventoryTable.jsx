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

const InventoryTable = ({ data, onEdit, onDelete }) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Stock</TableHead>
          <TableHead>Min Stock</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Used In</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {data.map((item) => {
          return (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>{item.category}</TableCell>
              <TableCell>
                {item.stock} {item.unit}
                {item.packSize ? (
                  <span className="text-xs text-gray-500 ml-2">
                    (pack {item.packSize})
                  </span>
                ) : null}
              </TableCell>
              <TableCell>{item.minStock}</TableCell>
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
                {(item.usedIn || []).join(", ")}
              </TableCell>

              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button size="icon" variant="outline" onClick={() => onEdit(item)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="destructive" onClick={() => onDelete(item)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default InventoryTable;