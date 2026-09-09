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
import { Pencil, Trash2, PackagePlus } from "lucide-react";

const InventoryTable = ({ data, onEdit, onDelete, onUpdateStock }) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>SKU</TableHead>
          <TableHead>Item</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Stock</TableHead>
          <TableHead>Min Stock</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Expiry</TableHead>
          <TableHead>Used In</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {data.map((item) => {
          return (
            <TableRow key={item.id}>
              <TableCell className="text-sm text-gray-800">{item.sku || "-"}</TableCell>
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
                {/*
                  Reads the flags the backend now computes once (see
                  services/shared/inventory.js) instead of re-deriving the
                  same qty<=reorderLevel threshold here — one source of truth.
                */}
                <Badge
                  variant={
                    item.outOfStock ? "destructive" : item.lowStock ? "secondary" : "default"
                  }
                >
                  {item.outOfStock ? "Out" : item.lowStock ? "Low" : "OK"}
                </Badge>
              </TableCell>
              <TableCell>
                {item.expiryState === "expired" && (
                  <Badge variant="destructive">Expired</Badge>
                )}
                {item.expiryState === "near_expiry" && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
                    Expiring soon
                  </Badge>
                )}
                {!item.expiryState && <span className="text-sm text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-sm text-gray-500">
                {(item.usedIn || []).length > 0 ? item.usedIn.join(", ") : "—"}
              </TableCell>

              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {onUpdateStock && (
                    <Button
                      size="icon"
                      variant="outline"
                      title="Update stock"
                      onClick={() => onUpdateStock(item)}
                    >
                      <PackagePlus className="w-4 h-4" />
                    </Button>
                  )}
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