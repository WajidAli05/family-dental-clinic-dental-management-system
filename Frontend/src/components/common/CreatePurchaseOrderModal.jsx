import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2 } from "lucide-react";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-background text-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30 [&>option]:bg-background [&>option]:text-foreground";

const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyLine = () => ({ itemId: "", qty: "", unitCost: "" });

/**
 * Creating a PO no longer touches stock — that is exclusively the RECEIVE
 * action's job now (the point of the module). Line items are priced from the
 * item's own unitCost by default, editable per line.
 */
const CreatePurchaseOrderModal = ({ open, suppliers = [], items = [], onClose, onSubmit }) => {
  const [supplierId, setSupplierId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([emptyLine()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSupplierId(""); setDate(todayISO()); setExpectedDeliveryDate(""); setNotes("");
    setLines([emptyLine()]);
    setSaving(false);
  }, [open]);

  const setLine = (idx, patch) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const onPickItem = (idx, itemId) => {
    const item = items.find((i) => i.id === itemId);
    setLine(idx, { itemId, unitCost: item ? String(item.unitCost || 0) : "" });
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const validLines = lines.filter((l) => l.itemId && Number(l.qty) > 0);
  const isValid = !!supplierId && validLines.length > 0;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      await onSubmit?.({
        supplierId,
        date,
        expectedDeliveryDate,
        notes,
        items: validLines.map((l) => ({ itemId: l.itemId, qty: Number(l.qty), unitCost: Number(l.unitCost || 0) })),
      });
      toast.success("Purchase order created.");
      onClose?.();
    } catch (e) {
      toast.error(e?.message || "Failed to create purchase order.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!open} onOpenChange={(v) => (!v && !saving ? onClose?.() : null)}>
      <DialogContent className="sm:max-w-[820px] max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <DialogTitle className="text-lg font-semibold">New Purchase Order</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-4 flex-1 min-h-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Supplier *">
              <select className={inputClass} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">Select supplier…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Order Date">
              <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Expected Delivery">
              <input type="date" className={inputClass} value={expectedDeliveryDate} onChange={(e) => setExpectedDeliveryDate(e.target.value)} />
            </Field>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Line Items *</p>
            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-6">
                    <select className={inputClass} value={line.itemId} onChange={(e) => onPickItem(idx, e.target.value)}>
                      <option value="">Select item…</option>
                      {items.map((i) => (
                        <option key={i.id} value={i.id}>{i.name} ({i.sku || i.id})</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input type="number" min={0} placeholder="Qty" className={inputClass} value={line.qty} onChange={(e) => setLine(idx, { qty: e.target.value })} />
                  </div>
                  <div className="col-span-3">
                    <input type="number" min={0} placeholder="Unit cost" className={inputClass} value={line.unitCost} onChange={(e) => setLine(idx, { unitCost: e.target.value })} />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <Button size="icon" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => removeLine(idx)} disabled={lines.length === 1}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="rounded-xl mt-2" onClick={addLine}>
              <Plus className="w-4 h-4 me-1" /> Add Line
            </Button>
          </div>

          <Field label="Notes">
            <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-gray-100 shrink-0">
          <Button variant="outline" className="rounded-xl" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button className="rounded-xl bg-[#2ec4b6] hover:bg-[#26a699]" onClick={handleSave} disabled={saving || !isValid}>
            {saving ? (<><Loader2 className="w-4 h-4 me-2 animate-spin" />Creating…</>) : "Create Purchase Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Field = ({ label, children }) => (
  <div>
    <p className="text-xs font-semibold text-gray-600 mb-1">{label}</p>
    {children}
  </div>
);

export default CreatePurchaseOrderModal;
