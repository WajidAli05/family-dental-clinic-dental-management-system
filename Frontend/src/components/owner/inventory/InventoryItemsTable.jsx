import { Button } from "@/components/ui/button";

const InventoryItemsTable = ({ data = [], onEdit, onUpdateStock, onDelete }) => {
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
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Actions</th>
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-8 text-center text-sm text-gray-500">
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
                  Rs. {Number(i.unitCost || 0).toLocaleString()}
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