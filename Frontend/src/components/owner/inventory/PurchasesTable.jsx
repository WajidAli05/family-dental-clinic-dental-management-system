// src/components/owner/inventory/PurchasesTable.jsx
import { Button } from "@/components/ui/button";

const PurchasesTable = ({ data = [], onView }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Date</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">PO</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Supplier</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Invoice</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Total</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700">Notes</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-700 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-8 text-center text-sm text-gray-500">
                No purchases found
              </td>
            </tr>
          ) : (
            data.map((p) => (
              <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3 text-sm text-gray-800">{p.date}</td>
                <td className="py-2 px-3 text-sm font-semibold text-gray-900">{p.id}</td>
                <td className="py-2 px-3 text-sm text-gray-800">{p.supplierName}</td>
                <td className="py-2 px-3 text-sm text-gray-800">{p.invoiceNo}</td>
                <td className="py-2 px-3 text-sm font-semibold text-gray-900">Rs. {Number(p.total || 0).toLocaleString()}</td>
                <td className="py-2 px-3 text-sm text-gray-700">{p.notes}</td>
                <td className="py-2 px-3 text-right">
                  <Button variant="outline" className="rounded-xl" onClick={() => onView?.(p)}>
                    View Details
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PurchasesTable;