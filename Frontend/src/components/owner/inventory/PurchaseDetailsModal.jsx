// src/components/owner/inventory/PurchaseDetailsModal.jsx
import { Button } from "@/components/ui/button";

const PurchaseDetailsModal = ({ open, loading, data, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Purchase Details</h3>
            <p className="text-xs text-gray-500">View invoice, supplier, and items snapshot</p>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="p-5">
          {loading ? (
            <p className="text-sm text-gray-600">Loading...</p>
          ) : !data ? (
            <p className="text-sm text-gray-600">No details available</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Info label="PO" value={data.id} />
                <Info label="Date" value={data.date} />
                <Info label="Invoice" value={data.invoiceNo || "-"} />
                <Info label="Total" value={`Rs. ${Number(data.total || 0).toLocaleString()}`} />
              </div>

              <div className="rounded-2xl border border-gray-100 p-4">
                <p className="text-sm font-semibold text-gray-900">Supplier</p>
                <p className="text-sm text-gray-700 mt-1">
                  {data.supplier?.name || "-"}
                  {data.supplier?.phone ? ` • ${data.supplier.phone}` : ""}
                  {data.supplier?.email ? ` • ${data.supplier.email}` : ""}
                </p>
                {data.supplier?.address ? <p className="text-sm text-gray-600 mt-1">{data.supplier.address}</p> : null}
              </div>

              <div className="rounded-2xl border border-gray-100 p-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">Items</p>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-left">
                        <th className="py-2 px-3 text-sm font-semibold text-gray-700">SKU</th>
                        <th className="py-2 px-3 text-sm font-semibold text-gray-700">Item</th>
                        <th className="py-2 px-3 text-sm font-semibold text-gray-700">Qty</th>
                        <th className="py-2 px-3 text-sm font-semibold text-gray-700">Unit Cost</th>
                        <th className="py-2 px-3 text-sm font-semibold text-gray-700">Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(data.items) && data.items.length ? (
                        data.items.map((it, idx) => (
                          <tr key={`${it.itemId}-${idx}`} className="border-b border-gray-100">
                            <td className="py-2 px-3 text-sm text-gray-800">{it.sku || "-"}</td>
                            <td className="py-2 px-3 text-sm font-semibold text-gray-900">{it.name || "-"}</td>
                            <td className="py-2 px-3 text-sm text-gray-800">
                              {Number(it.qty || 0)} {it.unit || ""}
                            </td>
                            <td className="py-2 px-3 text-sm text-gray-800">Rs. {Number(it.unitCost || 0).toLocaleString()}</td>
                            <td className="py-2 px-3 text-sm text-gray-900 font-semibold">
                              Rs. {Number(it.lineTotal || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-sm text-gray-500">
                            No item lines saved for this purchase
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {data.notes ? (
                <div className="rounded-2xl border border-gray-100 p-4">
                  <p className="text-sm font-semibold text-gray-900">Notes</p>
                  <p className="text-sm text-gray-700 mt-1">{data.notes}</p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Info = ({ label, value }) => (
  <div className="rounded-2xl border border-gray-100 p-3">
    <p className="text-xs font-semibold text-gray-500">{label}</p>
    <p className="text-sm font-semibold text-gray-900 mt-1">{value}</p>
  </div>
);

export default PurchaseDetailsModal;