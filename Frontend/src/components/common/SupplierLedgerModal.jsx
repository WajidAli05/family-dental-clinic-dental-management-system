import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useFormatMoney } from "@/store/clinicConfigStore";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-background text-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30";

const STATUS_LABEL = {
  partially_received: "Partially Received", received: "Received", closed: "Closed",
};

/**
 * Reuses the SAME billed/paid/outstanding + FIFO-allocated-history shape the
 * lab-dues ledger already established (services/shared/finance.js) — no new
 * financial logic. `canRecordPayment` is false for receptionist: recording a
 * payment is money out, owner-only, per the brief's explicit recommendation.
 */
const SupplierLedgerModal = ({ open, supplierId, canRecordPayment, onClose, fetchLedger, onRecordPayment }) => {
  const money = useFormatMoney();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({ amount: "", date: new Date().toISOString().slice(0, 10), method: "cash", reference: "" });
  const [paying, setPaying] = useState(false);

  const load = async () => {
    if (!supplierId) return;
    setLoading(true);
    try {
      const res = await fetchLedger(supplierId);
      setData(res);
    } catch (e) {
      toast.error(e?.message || "Failed to load ledger.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
    else { setData(null); setPayOpen(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, supplierId]);

  const handleRecordPayment = async () => {
    const amount = Number(payForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid payment amount greater than 0.");
      return;
    }
    setPaying(true);
    try {
      await onRecordPayment(supplierId, { ...payForm, amount });
      toast.success("Payment recorded.");
      setPayOpen(false);
      setPayForm({ amount: "", date: new Date().toISOString().slice(0, 10), method: "cash", reference: "" });
      await load();
    } catch (e) {
      toast.error(e?.message || "Failed to record payment.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <Dialog open={!!open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="sm:max-w-[820px] max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <DialogTitle className="text-lg font-semibold">
            Supplier Ledger {data?.supplier?.name ? `• ${data.supplier.name}` : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-4 flex-1 min-h-0 space-y-5">
          {loading ? (
            <p className="text-sm text-gray-500 py-8 text-center">Loading…</p>
          ) : !data ? (
            <p className="text-sm text-gray-500 py-8 text-center">No data.</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Total Billed" value={money(data.totalBilled)} />
                <Stat label="Total Paid" value={money(data.totalPaid)} tone="text-emerald-600" />
                <Stat label="Outstanding" value={money(data.outstanding)} tone={data.outstanding > 0 ? "text-red-600" : "text-gray-600"} />
              </div>

              {canRecordPayment && (
                <div className="flex justify-end">
                  <Button size="sm" className="rounded-xl bg-[#2ec4b6] hover:bg-[#26a699]" onClick={() => setPayOpen((v) => !v)}>
                    Record Payment
                  </Button>
                </div>
              )}

              {payOpen && (
                <div className="rounded-xl border border-gray-100 p-4 grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">Amount</p>
                    <input type="number" min={0} className={inputClass} value={payForm.amount} onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">Date</p>
                    <input type="date" className={inputClass} value={payForm.date} onChange={(e) => setPayForm((p) => ({ ...p, date: e.target.value }))} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">Method</p>
                    <select className={inputClass} value={payForm.method} onChange={(e) => setPayForm((p) => ({ ...p, method: e.target.value }))}>
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cheque">Cheque</option>
                      <option value="card">Card</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">Reference</p>
                    <input className={inputClass} value={payForm.reference} onChange={(e) => setPayForm((p) => ({ ...p, reference: e.target.value }))} placeholder="Cheque # / Txn ID" />
                  </div>
                  <div className="col-span-2 md:col-span-4 flex justify-end">
                    <Button size="sm" className="rounded-xl bg-[#2ec4b6] hover:bg-[#26a699]" onClick={handleRecordPayment} disabled={paying}>
                      {paying ? (<><Loader2 className="w-4 h-4 me-2 animate-spin" />Saving…</>) : "Save Payment"}
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm font-semibold text-gray-800 mb-2">Billed Purchase Orders</p>
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left bg-gray-50">
                        <th className="py-2 px-3 font-semibold text-gray-700">PO</th>
                        <th className="py-2 px-3 font-semibold text-gray-700">Date</th>
                        <th className="py-2 px-3 font-semibold text-gray-700">Status</th>
                        <th className="py-2 px-3 font-semibold text-gray-700">Amount</th>
                        <th className="py-2 px-3 font-semibold text-gray-700">Paid (FIFO)</th>
                        <th className="py-2 px-3 font-semibold text-gray-700">Remaining</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.purchaseOrders?.rows || []).length === 0 ? (
                        <tr><td colSpan={6} className="py-6 text-center text-gray-500">No billed purchase orders yet.</td></tr>
                      ) : (
                        data.purchaseOrders.rows.map((po) => (
                          <tr key={po.id} className="border-b border-gray-50">
                            <td className="py-2 px-3">{po.id}</td>
                            <td className="py-2 px-3">{po.date}</td>
                            <td className="py-2 px-3">
                              <Badge variant={po.fullyPaid ? "default" : "secondary"}>{STATUS_LABEL[po.status] || po.status}</Badge>
                            </td>
                            <td className="py-2 px-3">{money(po.amount)}</td>
                            <td className="py-2 px-3">{money(po.paid)}</td>
                            <td className="py-2 px-3">{money(po.remaining)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-800 mb-2">Payment History</p>
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left bg-gray-50">
                        <th className="py-2 px-3 font-semibold text-gray-700">Date</th>
                        <th className="py-2 px-3 font-semibold text-gray-700">Amount</th>
                        <th className="py-2 px-3 font-semibold text-gray-700">Method</th>
                        <th className="py-2 px-3 font-semibold text-gray-700">Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.payments || []).length === 0 ? (
                        <tr><td colSpan={4} className="py-6 text-center text-gray-500">No payments recorded yet.</td></tr>
                      ) : (
                        data.payments.map((p) => (
                          <tr key={p.id} className="border-b border-gray-50">
                            <td className="py-2 px-3">{p.date}</td>
                            <td className="py-2 px-3">{money(p.amount)}</td>
                            <td className="py-2 px-3 capitalize">{p.method}</td>
                            <td className="py-2 px-3">{p.reference || "—"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-gray-100 shrink-0">
          <Button variant="outline" className="rounded-xl" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Stat = ({ label, value, tone = "text-gray-900" }) => (
  <div className="rounded-xl border border-gray-100 p-3">
    <p className="text-xs text-gray-500">{label}</p>
    <p className={`text-lg font-bold ${tone}`}>{value}</p>
  </div>
);

export default SupplierLedgerModal;
