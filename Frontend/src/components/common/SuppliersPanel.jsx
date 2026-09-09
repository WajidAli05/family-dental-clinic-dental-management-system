import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import SupplierModal from "@/components/common/SupplierModal";
import SupplierLedgerModal from "@/components/common/SupplierLedgerModal";
import DeleteConfirmDialog from "@/components/owner/inventory/DeleteConfirmDialog";

/**
 * Shared by owner + receptionist — one table, one set of modals. Each page
 * passes its OWN store-bound functions so this component holds no store
 * coupling of its own (the same pattern as InventoryAlertRibbon / the shared
 * UpdateStockModal).
 */
const SuppliersPanel = ({ fetchSuppliers, createSupplier, updateSupplier, deleteSupplier, fetchLedger, recordPayment, canRecordPayment }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerSupplierId, setLedgerSupplierId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchSuppliers({ q });
      setRows(res?.rows || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <Input placeholder="Search suppliers..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Button
          className="bg-[#2ec4b6] hover:bg-[#26a699] text-white rounded-xl shrink-0"
          onClick={() => { setEditRow(null); setModalOpen(true); }}
        >
          <Plus className="w-4 h-4 me-1" /> Add Supplier
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left bg-gray-50">
              <th className="py-2 px-3 font-semibold text-gray-700">ID</th>
              <th className="py-2 px-3 font-semibold text-gray-700">Name</th>
              <th className="py-2 px-3 font-semibold text-gray-700">Contact</th>
              <th className="py-2 px-3 font-semibold text-gray-700">Phone</th>
              <th className="py-2 px-3 font-semibold text-gray-700">Terms</th>
              <th className="py-2 px-3 font-semibold text-gray-700">Status</th>
              <th className="py-2 px-3 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-8 text-center text-gray-500">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-gray-500">No suppliers found.</td></tr>
            ) : (
              rows.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 text-gray-700">{s.id}</td>
                  <td className="py-2 px-3 font-semibold text-gray-900">{s.name}</td>
                  <td className="py-2 px-3 text-gray-700">{s.contactPerson || "-"}</td>
                  <td className="py-2 px-3 text-gray-700">{s.phone || "-"}</td>
                  <td className="py-2 px-3 text-gray-700">{s.paymentTerms || "-"}</td>
                  <td className="py-2 px-3">
                    <Badge variant={s.active ? "default" : "secondary"}>{s.active ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="outline" title="Ledger" onClick={() => { setLedgerSupplierId(s.id); setLedgerOpen(true); }}>
                        <BookOpen className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="outline" title="Edit" onClick={() => { setEditRow(s); setModalOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" title="Delete" onClick={() => { setDeleteRow(s); setDeleteOpen(true); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <SupplierModal
        open={modalOpen}
        supplier={editRow}
        onClose={() => { setModalOpen(false); setEditRow(null); }}
        onSubmit={async (body) => {
          if (editRow) await updateSupplier(editRow.id, body);
          else await createSupplier(body);
          await load();
        }}
      />

      <SupplierLedgerModal
        open={ledgerOpen}
        supplierId={ledgerSupplierId}
        canRecordPayment={canRecordPayment}
        onClose={() => setLedgerOpen(false)}
        fetchLedger={fetchLedger}
        onRecordPayment={recordPayment}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        title="Delete supplier?"
        description={
          deleteRow?.name
            ? `"${deleteRow.name}" will be removed from the active list. Its purchase and payment history is kept.`
            : "This supplier will be removed. Its history is kept."
        }
        loading={deleting}
        onCancel={() => { setDeleteOpen(false); setDeleteRow(null); }}
        onConfirm={async () => {
          if (!deleteRow?.id) return;
          setDeleting(true);
          try {
            await deleteSupplier(deleteRow.id);
            toast.success("Supplier deleted.");
            setDeleteOpen(false);
            setDeleteRow(null);
            await load();
          } catch (e) {
            toast.error(e?.message || "Failed to delete supplier.");
          } finally {
            setDeleting(false);
          }
        }}
      />
    </div>
  );
};

export default SuppliersPanel;
