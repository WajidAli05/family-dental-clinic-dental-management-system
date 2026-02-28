// src/components/owner/settings/ClinicInfoForm.jsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30";

const ClinicInfoForm = ({ value, onSave, loading }) => {
  const [form, setForm] = useState(value || {});
  const [status, setStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    setForm(value || {});
  }, [value]);

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    setStatus({ type: "", message: "" });

    const payload = {
      name: String(form.name || "").trim(),
      logoUrl: String(form.logoUrl || "").trim(),
      phone: String(form.phone || "").trim(),
      whatsapp: String(form.whatsapp || "").trim(),
      address: String(form.address || "").trim(),
    };

    if (!payload.name) {
      setStatus({ type: "error", message: "Clinic name is required." });
      return;
    }

    try {
      await onSave?.(payload);
      setStatus({ type: "success", message: "Clinic information updated successfully." });
    } catch (e) {
      setStatus({ type: "error", message: e?.message || "Failed to update clinic information." });
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
        <p className="text-sm text-gray-500">
          Update clinic name, branding and contact details.
        </p>
      </div>

      {status.message ? (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            status.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
              : "bg-rose-50 text-rose-700 border border-rose-100"
          }`}
        >
          {status.message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Clinic Name">
          <input
            value={form.name || ""}
            onChange={(e) => update("name", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Logo URL (optional)">
          <input
            value={form.logoUrl || ""}
            onChange={(e) => update("logoUrl", e.target.value)}
            placeholder="https://..."
            className={inputClass}
          />
        </Field>

        <Field label="Phone">
          <input
            value={form.phone || ""}
            onChange={(e) => update("phone", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="WhatsApp">
          <input
            value={form.whatsapp || ""}
            onChange={(e) => update("whatsapp", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Address" className="md:col-span-2">
          <input
            value={form.address || ""}
            onChange={(e) => update("address", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="flex justify-end">
        <Button
          disabled={!!loading}
          className="rounded-xl bg-[#2ec4b6] hover:bg-[#26a699] text-white"
          onClick={submit}
        >
          {loading ? "Saving..." : "Save Changes"}
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