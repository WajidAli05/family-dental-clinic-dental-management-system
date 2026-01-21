import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const overlay = "fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-3";
const modalBox = "w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden";
const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30";

const CommissionRuleModal = ({
  open,
  dentist,
  initialPercent,
  defaultPercent,
  onClose,
  onSave,
}) => {
  const [percent, setPercent] = useState(initialPercent ?? defaultPercent ?? 20);

  useEffect(() => {
    if (!open) return;
    setPercent(initialPercent ?? defaultPercent ?? 20);
  }, [open, initialPercent, defaultPercent]);

  if (!open) return null;

  const submit = (e) => {
    e.preventDefault();
    const p = Math.max(0, Math.min(100, Number(percent)));
    onSave?.(p);
  };

  return (
    <div className={overlay} onMouseDown={onClose}>
      <div className={modalBox} onMouseDown={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Edit Commission Rule</h3>
          <p className="text-sm text-gray-500 mt-1">
            Dentist: <span className="font-semibold text-gray-900">{dentist?.name || dentist?.dentistName}</span>
          </p>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <div className="text-xs font-semibold text-gray-600 mb-1">Commission %</div>
            <input
              type="number"
              min="0"
              max="100"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              className={inputClass}
              placeholder="e.g., 20"
            />
            <div className="text-xs text-gray-500 mt-1">
              Default: {defaultPercent}%
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-xl bg-[#2ec4b6] hover:bg-[#26a699] text-white">
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CommissionRuleModal;