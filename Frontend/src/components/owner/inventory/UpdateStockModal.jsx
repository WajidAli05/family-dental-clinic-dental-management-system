import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-background text-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30 [&>option]:bg-background [&>option]:text-foreground";

/**
 * Stock adjustment modal — shared by owner AND receptionist (FIX 5: no second
 * implementation). Rewritten on the shared Dialog pattern already used by the
 * patient and lab-case modals: scrollable body with a height cap so the
 * action buttons stay reachable, a fixed footer, RTL via logical properties.
 *
 * VALIDATION: previously `Number(qty)` on an empty input silently coerced to
 * `0`, which passed the backend's own validation and — in "Set" mode, the
 * previous default — would silently ZERO OUT the item with no error and no
 * feedback. The Save button is now disabled until a real, non-empty number is
 * entered, and add/subtract require a positive quantity (0 does nothing
 * meaningful in either). Default mode is "add" — the more common action, and
 * the one this bug report is named after.
 *
 * OWNS its own submit lifecycle (loading, toast, close-on-success) rather
 * than leaving each parent page to reimplement that dance — `onSubmit` should
 * be a thin function that just performs the update (e.g. the store action)
 * and rethrows on failure; this modal does the rest. That is also what makes
 * it trivially reusable by a second role without a second implementation.
 */
const UpdateStockModal = ({ open, item, onClose, onSubmit }) => {
  const [mode, setMode] = useState("add");
  const [qty, setQty] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode("add");
    setQty("");
    setSaving(false);
  }, [open, item]);

  const title = useMemo(() => (item ? `Update Stock — ${item.name}` : "Update Stock"), [item]);

  const parsed = qty.trim() === "" ? null : Number(qty);
  const isValidNumber = parsed !== null && Number.isFinite(parsed) && parsed >= 0;
  const isValid = isValidNumber && (mode === "set" || parsed > 0);

  const handleSubmit = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      await onSubmit?.({ mode, qty: parsed });
      toast.success("Stock updated.");
      onClose?.();
    } catch (e) {
      // Modal stays open with the entered values intact so the user can
      // correct and retry.
      toast.error(e?.message || "Failed to update stock.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!open} onOpenChange={(v) => !v && !saving && onClose?.()}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto px-6 py-4 flex-1 min-h-0">
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1">Mode</p>
            <select className={inputClass} value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="add">Add</option>
              <option value="subtract">Subtract</option>
              <option value="set">Set</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {mode === "set"
                ? "Replaces the current quantity entirely."
                : mode === "add"
                ? "Adds to the current quantity."
                : "Removes from the current quantity."}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1">Quantity</p>
            <input
              className={inputClass}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="e.g. 10"
              inputMode="numeric"
              autoFocus
            />
            {qty.trim() !== "" && !isValidNumber && (
              <p className="text-xs text-red-600 mt-1">Enter a valid number, 0 or greater.</p>
            )}
            {qty.trim() !== "" && isValidNumber && mode !== "set" && parsed <= 0 && (
              <p className="text-xs text-red-600 mt-1">
                Quantity must be greater than 0 to {mode === "add" ? "add" : "subtract"}.
              </p>
            )}
          </div>

          {item && (
            <p className="text-xs text-gray-500">
              Current quantity: <span className="font-semibold text-gray-800">{item.qty ?? item.stock ?? 0}</span> {item.unit}
            </p>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-gray-100 shrink-0">
          <Button variant="outline" className="rounded-xl" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            className="rounded-xl bg-[#2ec4b6] hover:bg-[#26a699] text-white"
            onClick={handleSubmit}
            disabled={!isValid || saving}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateStockModal;
