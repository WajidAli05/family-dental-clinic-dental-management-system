import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFormatMoney } from "@/store/clinicConfigStore";

const InventoryItemsTable = ({ data = [], onEdit, onUpdateStock, onDelete }) => {
  const money = useFormatMoney();
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">SKU</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Item</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Category</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Supplier</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Qty</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Reorder</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Unit Cost</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Expiry</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Status</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Actions</th>
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={10} className="py-8 text-center text-sm text-gray-500">
                No inventory items found
              </td>
            </tr>
          ) : (
            data.map((i) => (
              <tr key={i.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3 text-sm text-gray-800">{i.sku || "-"}</td>
                <td className="py-2 px-3 text-sm font-semibold text-gray-900">{i.name}</td>
                <td className="py-2 px-3 text-sm capitalize text-gray-700">{i.category}</td>
                <td className="py-2 px-3 text-sm text-gray-700">{i.supplier || "-"}</td>
                <td className="py-2 px-3 text-sm text-gray-800">
                  {i.qty} {i.unit}
                </td>
                <td className="py-2 px-3 text-sm text-gray-800">{i.reorderLevel}</td>
                <td className="py-2 px-3 text-sm text-gray-800">
                  {money(i.unitCost)}
                </td>

                {/* BUG 2: the item's expiryDate was never rendered anywhere —
                    only the derived badge existed, and only in this Status
                    column. The date now has its own column with the badge
                    alongside it; blank when no expiryDate is set. */}
                <td className="py-2 px-3 text-sm text-gray-800">
                  <div className="flex items-center gap-1.5">
                    <span>{i.expiryDate || "—"}</span>
                    {i.expiryState === "expired" && <Badge variant="destructive">Expired</Badge>}
                    {i.expiryState === "near_expiry" && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
                        Soon
                      </Badge>
                    )}
                  </div>
                </td>

                {/*
                  Previously there was no per-row status at all — low-stock
                  only surfaced in the separate LowStockAlerts panel above the
                  table. Flags come from the shared backend mapper (one source
                  of truth with the receptionist table).
                */}
                <td className="py-2 px-3">
                  <div className="flex flex-wrap gap-1">
                    {i.outOfStock && <Badge variant="destructive">Out</Badge>}
                    {!i.outOfStock && i.lowStock && <Badge variant="secondary">Low</Badge>}
                    {!i.outOfStock && !i.lowStock && (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </div>
                </td>

                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => onUpdateStock?.(i)}
                    >
                      Stock
                    </Button>

                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => onEdit?.(i)}
                    >
                      Edit
                    </Button>

                    <Button
                      variant="outline"
                      className="rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => onDelete?.(i)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryItemsTable;