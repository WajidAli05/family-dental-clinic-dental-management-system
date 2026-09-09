import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useFormatMoney } from "@/store/clinicConfigStore";
import PurchaseOrderStatusControl, { STATUS_LABEL } from "@/components/common/PurchaseOrderStatusControl";

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-background text-foreground px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30";

/**
 * Combines viewing a PO, its manual status control, and the RECEIVE action —
 * one modal instead of stacking a second one on top, since receiving only
 * ever happens in the context of looking at this exact PO.
 *
 * RECEIVING is the critical path: qtyReceived/batchNumber/expiryDate per
 * remaining line go straight to receivePurchaseOrderShared, which is the
 * ONLY thing that increments stock (through computeStockAdjustment — the
 * same math the manual stock modal uses).
 */
const PurchaseOrderDetailModal = ({ open, poId, onClose, fetchPo, onStatusChange, onReceive }) => {
  const money = useFormatMoney();
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [receiveLines, setReceiveLines] = useState({});
  const [receiving, setReceiving] = useState(false);

  const load = async () => {
    if (!poId) return;
    setLoading(true);
    try {
      const data = await fetchPo(poId);
      setPo(data);
      setReceiveLines({});
    } catch (e) {
      toast.error(e?.message || "Failed to load purchase order.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
    else setPo(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, poId]);

  const setReceiveField = (itemId, key, value) =>
    setReceiveLines((prev) => ({ ...prev, [itemId]: { ...prev[itemId], [key]: value } }));

  const receivableItems = useMemo(() => (po?.items || []).filter((i) => i.remaining > 0), [po]);

  const handleReceive = async () => {
    const lines = receivableItems
      .map((line) => {
        const input = receiveLines[line.itemId] || {};
        const qty = Number(input.qtyReceived);
        if (!Number.isFinite(qty) || qty <= 0) return null;
        return { itemId: line.itemId, qtyReceived: qty, batchNumber: input.batchNumber || "", expiryDate: input.expiryDate || "" };
      })
      .filter(Boolean);

    if (!lines.length) {
      toast.error("Enter a received quantity for at least one line.");
      return;
    }

    setReceiving(true);
    try {
      await onReceive(poId, { lines });
      toast.success("Receipt recorded — stock updated.");
      await load();
    } catch (e) {
      toast.error(e?.message || "Failed to record receipt.");
    } finally {
      setReceiving(false);
    }
  };

  return (
    <Dialog open={!!open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="sm:max-w-[880px] max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2 flex-wrap">
            Purchase Order {po?.id}
            {po && <Badge>{STATUS_LABEL[po.status] || po.status}</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-4 flex-1 min-h-0 space-y-5">
          {loading ? (
            <p className="text-sm text-gray-500 py-8 text-center">Loading…</p>
          ) : !po ? (
            <p className="text-sm text-gray-500 py-8 text-center">No data.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <Info label="Supplier" value={po.supplierName} />
                <Info label="Order Date" value={po.date} />
                <Info label="Expected Delivery" value={po.expectedDeliveryDate || "—"} />
                <Info label="Total" value={money(po.total)} />
              </div>

              {po.discrepancy > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
                  Discrepancy: {po.discrepancy} unit(s) ordered but not yet received.
                </div>
              )}

              <div>
                <p className="text-sm font-semibold text-gray-800 mb-2">Line Items</p>
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left bg-gray-50">
                        <th className="py-2 px-3 font-semibold text-gray-700">Item</th>
                        <th className="py-2 px-3 font-semibold text-gray-700">Ordered</th>
                        <th className="py-2 px-3 font-semibold text-gray-700">Received</th>
                        <th className="py-2 px-3 font-semibold text-gray-700">Remaining</th>
                        <th className="py-2 px-3 font-semibold text-gray-700">Unit Cost</th>
                        <th className="py-2 px-3 font-semibold text-gray-700">Line Total</th>
                        <th className="py-2 px-3 font-semibold text-gray-700">Batch</th>
                        <th className="py-2 px-3 font-semibold text-gray-700">Expiry</th>
                      </tr>
                    </thead>
                    <tbody>
                      {po.items.map((it) => (
                        <tr key={it.itemId} className="border-b border-gray-50">
                          <td className="py-2 px-3 font-medium text-gray-900">{it.name} <span className="text-gray-400">({it.sku || it.itemId})</span></td>
                          <td className="py-2 px-3">{it.qtyOrdered} {it.unit}</td>
                          <td className="py-2 px-3">{it.qtyReceived}</td>
                          <td className="py-2 px-3">{it.remaining}</td>
                          <td className="py-2 px-3">{money(it.unitCost)}</td>
                          <td className="py-2 px-3">{money(it.lineTotal)}</td>
                          <td className="py-2 px-3">{it.batchNumber || "—"}</td>
                          <td className="py-2 px-3">{it.expiryDate || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {po.canReceive && receivableItems.length > 0 && (
                <div className="rounded-xl border border-gray-100 p-4">
                  <p className="text-sm font-semibold text-gray-800 mb-3">Receive Delivery</p>
                  <div className="space-y-2">
                    {receivableItems.map((line) => (
                      <div key={line.itemId} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-4 text-sm text-gray-700">
                          {line.name} <span className="text-gray-400">(remaining {line.remaining})</span>
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number" min={0} max={line.remaining} placeholder="Qty received"
                            className={inputClass}
                            value={receiveLines[line.itemId]?.qtyReceived || ""}
                            onChange={(e) => setReceiveField(line.itemId, "qtyReceived", e.target.value)}
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            placeholder="Batch number" className={inputClass}
                            value={receiveLines[line.itemId]?.batchNumber || ""}
                            onChange={(e) => setReceiveField(line.itemId, "batchNumber", e.target.value)}
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="date" className={inputClass}
                            value={receiveLines[line.itemId]?.expiryDate || ""}
                            onChange={(e) => setReceiveField(line.itemId, "expiryDate", e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end mt-3">
                    <Button className="rounded-xl bg-[#2ec4b6] hover:bg-[#26a699]" onClick={handleReceive} disabled={receiving}>
                      {receiving ? (<><Loader2 className="w-4 h-4 me-2 animate-spin" />Receiving…</>) : "Submit Receipt"}
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">Status</p>
                <PurchaseOrderStatusControl
                  po={po}
                  onStatusChange={async (id, status) => {
                    await onStatusChange(id, status);
                    await load();
                  }}
                />
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

const Info = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="font-medium text-gray-900">{value}</p>
  </div>
);

export default PurchaseOrderDetailModal;
