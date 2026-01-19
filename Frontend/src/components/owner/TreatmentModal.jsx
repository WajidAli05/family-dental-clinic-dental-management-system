import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30";

const TreatmentModal = ({ open, mode, initial, onClose, onSubmit }) => {
  const [form, setForm] = useState({ name: "", code: "", fee: "", notes: "", active: true });

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setForm({
        name: initial.name || "",
        code: initial.code || "",
        fee: String(initial.fee ?? ""),
        notes: initial.notes || "",
        active: !!initial.active,
      });
    } else {
      setForm({ name: "", code: "", fee: "", notes: "", active: true });
    }
  }, [open, mode, initial]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-gray-100 shadow-xl overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            {mode === "edit" ? "Edit Treatment" : "Add Treatment"}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage treatment master data used by dentists.
          </p>
        </div>

        <div className="p-5 space-y-4">
          <Field label="Treatment Name">
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Code (optional)">
              <input className={inputClass} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </Field>
            <Field label="Fee (PKR)">
              <input
                type="number"
                className={inputClass}
                value={form.fee}
                onChange={(e) => setForm({ ...form, fee: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Notes (optional)">
            <textarea className={inputClass} rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Active
          </label>
        </div>

        <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
          <Button variant="outline" className="rounded-xl" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="rounded-xl bg-[#2ec4b6] hover:bg-[#26a699] text-white"
            onClick={() => onSubmit(form)}
            disabled={!form.name.trim()}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, children }) => (
  <div>
    <p className="text-xs font-semibold text-gray-600 mb-1">{label}</p>
    {children}
  </div>
);

export default TreatmentModal;