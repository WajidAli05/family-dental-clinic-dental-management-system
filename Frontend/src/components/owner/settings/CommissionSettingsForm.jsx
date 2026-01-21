import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30";

const CommissionSettingsForm = ({ value, onSave }) => {
  const [form, setForm] = useState(value);

  useEffect(() => setForm(value), [value]);

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Commission Settings</h2>
        <p className="text-sm text-gray-500">
          Configure default commission and rounding rules (overrides managed in Staff tab).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Default Dentist Commission %">
          <input
            type="number"
            min={0}
            max={100}
            value={form.defaultDentistCommissionPercent}
            onChange={(e) =>
              update("defaultDentistCommissionPercent", Number(e.target.value || 0))
            }
            className={inputClass}
          />
        </Field>

        <Field label="Allow Custom Overrides">
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2">
            <input
              type="checkbox"
              checked={!!form.allowCustomOverrides}
              onChange={(e) => update("allowCustomOverrides", e.target.checked)}
              className="h-4 w-4 accent-[#2ec4b6]"
            />
            <span className="text-sm text-gray-700">
              {form.allowCustomOverrides ? "Enabled" : "Disabled"}
            </span>
          </div>
        </Field>

        <Field label="Rounding">
          <select
            value={form.rounding}
            onChange={(e) => update("rounding", e.target.value)}
            className={inputClass}
          >
            <option value="nearest">Nearest</option>
            <option value="floor">Floor</option>
            <option value="ceil">Ceil</option>
          </select>
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

export default CommissionSettingsForm;