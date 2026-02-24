// src/components/owner/inventory/UpdateStockModal.jsx
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30";

const UpdateStockModal = ({ open, item, onClose, onSubmit }) => {
  const [mode, setMode] = useState("set");
  const [qty, setQty] = useState("");

  const title = useMemo(() => (item ? `Update Stock — ${item.name}` : "Update Stock"), [item]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500">Set, add, or subtract inventory quantity</p>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1">Mode</p>
            <select className={inputClass} value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="set">Set</option>
              <option value="add">Add</option>
              <option value="subtract">Subtract</option>
            </select>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1">Quantity</p>
            <input
              className={inputClass}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="e.g. 10"
              inputMode="numeric"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" className="rounded-xl" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-[#2ec4b6] hover:bg-[#26a699] text-white"
              onClick={() => onSubmit?.({ mode, qty: Number(qty) })}
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateStockModal;