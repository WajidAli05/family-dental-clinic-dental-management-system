import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30";

const PaymentModesManager = ({ modes = [], onUpsert, onDelete, onToggle }) => {
  const [draft, setDraft] = useState({ key: "", label: "" });

  const canAdd = useMemo(
    () => String(draft.key || "").trim() && String(draft.label || "").trim(),
    [draft]
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Payment Modes</h2>
        <p className="text-sm text-gray-500">
          Configure payment labels used in billing (cash/card/online etc.).
        </p>
      </div>

      {/* Add new */}
      <div className="rounded-2xl border border-gray-100 p-4 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <Field label="Key (unique)">
            <input
              value={draft.key}
              onChange={(e) => setDraft((p) => ({ ...p, key: e.target.value }))}
              placeholder="e.g. cash"
              className={inputClass}
            />
          </Field>

          <Field label="Label">
            <input
              value={draft.label}
              onChange={(e) => setDraft((p) => ({ ...p, label: e.target.value }))}
              placeholder="e.g. Cash"
              className={inputClass}
            />
          </Field>

          <Button
            className="rounded-xl bg-[#2ec4b6] hover:bg-[#26a699] text-white"
            disabled={!canAdd}
            onClick={() => {
              onUpsert?.({ key: draft.key, label: draft.label, active: true });
              setDraft({ key: "", label: "" });
            }}
          >
            Add
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left border-b border-gray-200">
              <th className="py-2 px-3 text-sm font-semibold text-gray-700">Key</th>
              <th className="py-2 px-3 text-sm font-semibold text-gray-700">Label</th>
              <th className="py-2 px-3 text-sm font-semibold text-gray-700">Active</th>
              <th className="py-2 px-3 text-sm font-semibold text-gray-700 text-right">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {modes.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm text-gray-500">
                  No payment modes configured
                </td>
              </tr>
            ) : (
              modes.map((m) => (
                <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 text-sm text-gray-800">{m.key}</td>
                  <td className="py-2 px-3 text-sm text-gray-800">{m.label}</td>
                  <td className="py-2 px-3 text-sm">
                    <input
                      type="checkbox"
                      checked={!!m.active}
                      onChange={() => onToggle?.(m.id)}
                      className="h-4 w-4 accent-[#2ec4b6]"
                    />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <Button
                      variant="destructive"
                      className="rounded-xl"
                      onClick={() => onDelete?.(m.id)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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

export default PaymentModesManager;