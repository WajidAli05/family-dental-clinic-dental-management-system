import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30";

const ClinicInfoForm = ({ value, onSave }) => {
  const [form, setForm] = useState(value);

  useEffect(() => setForm(value), [value]);

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const updateTiming = (k, v) =>
    setForm((p) => ({ ...p, timings: { ...p.timings, [k]: v } }));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Clinic Info</h2>
        <p className="text-sm text-gray-500">
          Manage clinic name, branding, contact and timings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Clinic Name">
          <input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Logo URL (optional)">
          <input
            value={form.logoUrl}
            onChange={(e) => update("logoUrl", e.target.value)}
            placeholder="https://..."
            className={inputClass}
          />
        </Field>

        <Field label="Phone">
          <input
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="WhatsApp">
          <input
            value={form.whatsapp}
            onChange={(e) => update("whatsapp", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Address" className="md:col-span-2">
          <input
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Mon–Sat Timings">
          <input
            value={form.timings.monToSat}
            onChange={(e) => updateTiming("monToSat", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Sunday Timings">
          <input
            value={form.timings.sunday}
            onChange={(e) => updateTiming("sunday", e.target.value)}
            className={inputClass}
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

const Field = ({ label, children, className = "" }) => (
  <div className={className}>
    <p className="text-xs font-semibold text-gray-600 mb-1">{label}</p>
    {children}
  </div>
);

export default ClinicInfoForm;