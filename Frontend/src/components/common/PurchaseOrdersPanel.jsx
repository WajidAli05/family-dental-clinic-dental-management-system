import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFormatMoney } from "@/store/clinicConfigStore";
import CreatePurchaseOrderModal from "@/components/common/CreatePurchaseOrderModal";
import PurchaseOrderDetailModal from "@/components/common/PurchaseOrderDetailModal";
import DeleteConfirmDialog from "@/components/owner/inventory/DeleteConfirmDialog";
import { STATUS_LABEL } from "@/components/common/PurchaseOrderStatusControl";

const inputClass =
  "rounded-xl border border-gray-200 bg-background text-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30 [&>option]:bg-background [&>option]:text-foreground";

const STATUS_FILTERS = ["all", "draft", "sent", "confirmed", "partially_received", "received", "closed", "cancelled"];

/**
 * Shared by owner + receptionist. `canDelete` gates the delete button
 * (owner-only per the brief); both roles get create/receive.
 */
const PurchaseOrdersPanel = ({
  suppliers = [], items = [],
  fetchPurchaseOrders, fetchPurchaseOrder, createPurchaseOrder, updatePurchaseOrderStatus, receivePurchaseOrder, deletePurchaseOrder,
  canDelete,
}) => {
  const money = useFormatMoney();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchPurchaseOrders({ supplierId: supplierFilter, status: statusFilter });
      setRows(res?.rows || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [supplierFilter, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          <select className={inputClass} value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)}>
            <option value="all">All Suppliers</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className={inputClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>{s === "all" ? "All Statuses" : (STATUS_LABEL[s] || s)}</option>
            ))}
          </select>
        </div>
        <Button className="bg-[#2ec4b6] hover:bg-[#26a699] text-white rounded-xl shrink-0" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 me-1" /> New Purchase Order
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left bg-gray-50">
              <th className="py-2 px-3 font-semibold text-gray-700">PO</th>
              <th className="py-2 px-3 font-semibold text-gray-700">Date</th>
              <th className="py-2 px-3 font-semibold text-gray-700">Supplier</th>
              <th className="py-2 px-3 font-semibold text-gray-700">Expected</th>
              <th className="py-2 px-3 font-semibold text-gray-700">Status</th>
              <th className="py-2 px-3 font-semibold text-gray-700">Total</th>
              <th className="py-2 px-3 font-semibold text-gray-700">Discrepancy</th>
              <th className="py-2 px-3 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="py-8 text-center text-gray-500">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center text-gray-500">No purchase orders found.</td></tr>
            ) : (
              rows.map((po) => (
                <tr key={po.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 font-medium text-gray-900">{po.id}</td>
                  <td className="py-2 px-3 text-gray-700">{po.date}</td>
                  <td className="py-2 px-3 text-gray-700">{po.supplierName}</td>
                  <td className="py-2 px-3 text-gray-700">{po.expectedDeliveryDate || "—"}</td>
                  <td className="py-2 px-3"><Badge variant={po.status === "cancelled" ? "destructive" : "default"}>{STATUS_LABEL[po.status] || po.status}</Badge></td>
                  <td className="py-2 px-3">{money(po.total)}</td>
                  <td className="py-2 px-3">{po.discrepancy > 0 ? <span className="text-amber-700 font-semibold">{po.discrepancy}</span> : "—"}</td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="outline" title="View" onClick={() => setDetailId(po.id)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {canDelete && (
                        <Button size="icon" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" title="Delete" onClick={() => { setDeleteRow(po); setDeleteOpen(true); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CreatePurchaseOrderModal
        open={createOpen}
        suppliers={suppliers}
        items={items}
        onClose={() => setCreateOpen(false)}
        onSubmit={async (body) => { await createPurchaseOrder(body); await load(); }}
      />

      <PurchaseOrderDetailModal
        open={!!detailId}
        poId={detailId}
        onClose={() => { setDetailId(null); load(); }}
        fetchPo={fetchPurchaseOrder}
        onStatusChange={updatePurchaseOrderStatus}
        onReceive={receivePurchaseOrder}
      />

      {canDelete && (
        <DeleteConfirmDialog
          open={deleteOpen}
          title="Delete purchase order?"
          description={deleteRow?.id ? `"${deleteRow.id}" will be permanently deleted. This cannot be undone.` : undefined}
          loading={deleting}
          onCancel={() => { setDeleteOpen(false); setDeleteRow(null); }}
          onConfirm={async () => {
            if (!deleteRow?.id) return;
            setDeleting(true);
            try {
              await deletePurchaseOrder(deleteRow.id);
              toast.success("Purchase order deleted.");
              setDeleteOpen(false);
              setDeleteRow(null);
              await load();
            } catch (e) {
              toast.error(e?.message || "Failed to delete purchase order.");
            } finally {
              setDeleting(false);
            }
          }}
        />
      )}
    </div>
  );
};

export default PurchaseOrdersPanel;
