import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30";

const LabSettingsForm = ({ value, onSave }) => {
  const [form, setForm] = useState(value);

  useEffect(() => setForm(value), [value]);

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Lab Management Settings</h2>
        <p className="text-sm text-gray-500">
          Configure defaults for lab cases (turnaround, urgent, initial status).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Default Turnaround (days)">
          <input
            type="number"
            min={0}
            value={form.defaultTurnaroundDays}
            onChange={(e) => update("defaultTurnaroundDays", Number(e.target.value || 0))}
            className={inputClass}
          />
        </Field>

        <Field label="Default Status">
          <select
            value={form.defaultStatus}
            onChange={(e) => update("defaultStatus", e.target.value)}
            className={inputClass}
          >
            <option value="created">Created</option>
            <option value="picked">Picked</option>
            <option value="in_progress">In Progress</option>
            <option value="ready">Ready</option>
            <option value="delivered">Delivered</option>
          </select>
        </Field>

        <Field label="Allow Urgent Cases">
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2">
            <input
              type="checkbox"
              checked={!!form.allowUrgent}
              onChange={(e) => update("allowUrgent", e.target.checked)}
              className="h-4 w-4 accent-[#2ec4b6]"
            />
            <span className="text-sm text-gray-700">
              {form.allowUrgent ? "Enabled" : "Disabled"}
            </span>
          </div>
        </Field>

        <Field label="Urgent Fee (PKR)">
          <input
            type="number"
            min={0}
            value={form.urgentFee}
            onChange={(e) => update("urgentFee", Number(e.target.value || 0))}
            className={inputClass}
            disabled={!form.allowUrgent}
          />
        </Field>
      </div>

      <div className="flex justify-end">
        <Button
          className="rounded-xl bg-[#2ec4b6] hover:bg-[#26a699] text-white"
          onClick={() => onSave?.(form)}
        >
          Save Changes
        </Button>
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

export default LabSettingsForm;