const InventoryItemsTable = ({ data = [] }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">SKU</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Item</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Category</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Qty</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Reorder</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Unit Cost</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-8 text-center text-sm text-gray-500">
                No inventory items found
              </td>
            </tr>
          ) : (
            data.map((i) => (
              <tr key={i.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3 text-sm text-gray-800">{i.sku}</td>
                <td className="py-2 px-3 text-sm font-semibold text-gray-900">
                  {i.name}
                </td>
                <td className="py-2 px-3 text-sm capitalize text-gray-700">{i.category}</td>
                <td className="py-2 px-3 text-sm text-gray-800">
                  {i.qty} {i.unit}
                </td>
                <td className="py-2 px-3 text-sm text-gray-800">{i.reorderLevel}</td>
                <td className="py-2 px-3 text-sm text-gray-800">
                  Rs. {i.unitCost.toLocaleString()}
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