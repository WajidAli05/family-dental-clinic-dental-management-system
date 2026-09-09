import { useState } from "react";
import { Button } from "@/components/ui/button";

const inputClass =
  "rounded-lg border border-gray-200 bg-background text-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30 [&>option]:bg-background [&>option]:text-foreground";

const STATUS_LABEL = {
  draft: "Draft", sent: "Sent", confirmed: "Confirmed",
  partially_received: "Partially Received", received: "Received",
  closed: "Closed", cancelled: "Cancelled",
};

/**
 * Offers ONLY the manual transitions the shared backend allows
 * (services/shared/purchaseOrders.js PO_TRANSITIONS) — "partially_received"
 * and "received" are deliberately never offered here; those are set only by
 * actually receiving stock, never by a manual status pick. The backend
 * re-validates regardless — this is a usability layer, not the boundary.
 */
const PurchaseOrderStatusControl = ({ po, onStatusChange, disabled = false }) => {
  const [next, setNext] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const options = po?.allowedNext || [];
  if (!options.length) {
    return <span className="text-sm text-gray-400 italic">No further status changes</span>;
  }

  const apply = async () => {
    if (!next) return;
    setErr(""); setSaving(true);
    try {
      await onStatusChange(po.id, next);
      setNext("");
    } catch (e) {
      setErr(e?.message || "Failed to update status.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap">
        <select value={next} disabled={disabled || saving} onChange={(e) => setNext(e.target.value)} className={inputClass}>
          <option value="">Change status…</option>
          {options.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s] || s}</option>
          ))}
        </select>
        <Button size="sm" className="rounded-xl bg-[#2ec4b6] hover:bg-[#26a699]" disabled={disabled || saving || !next} onClick={apply}>
          {saving ? "Saving…" : "Apply"}
        </Button>
      </div>
      {err && <p className="text-sm text-red-600 mt-1">{err}</p>}
    </div>
  );
};

export { STATUS_LABEL };
export default PurchaseOrderStatusControl;
