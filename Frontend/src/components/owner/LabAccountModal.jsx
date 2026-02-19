import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const overlay =
  "fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-3";
const modalBox =
  "w-full max-w-xl rounded-2xl bg-white shadow-xl overflow-hidden";
const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30";

const LabAccountModal = ({ open, mode = "create", initial, onClose, onSubmit }) => {
  const isEdit = mode === "edit";

  const empty = useMemo(
    () => ({
      name: "",
      email: "",
      phone: "",
      enabled: true,
    }),
    []
  );

  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (!open) return;
    if (isEdit && initial) {
      setForm({
        name: initial.name || "",
        email: initial.email || "",
        phone: initial.phone || "",
        enabled: initial.enabled ?? true,
      });
    } else {
      setForm(empty);
    }
  }, [open, isEdit, initial, empty]);

  if (!open) return null;

  const submit = (e) => {
    e.preventDefault();
    onSubmit?.({
      name: String(form.name || "").trim(),
      email: String(form.email || "").trim(),
      phone: String(form.phone || "").trim(),
      enabled: !!form.enabled,
    });
  };

  return (
    <div className={overlay} onMouseDown={onClose}>
      <div className={modalBox} onMouseDown={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEdit ? "Edit Lab Account" : "Create Lab Account"}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Lab role user for portal access.
          </p>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <Field label="Lab Name *">
            <input
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              className={inputClass}
              placeholder="e.g., Smile Craft Lab"
              required
            />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Email *">
              <input
                value={form.email}
                onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                className={inputClass}
                placeholder="lab@example.com"
                type="email"
                required
              />
            </Field>

            <Field label="Phone">
              <input
                value={form.phone}
                onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                className={inputClass}
                placeholder="051-xxxxxxx"
              />
            </Field>
          </div>

          <Card className="rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">Account Enabled</div>
                <div className="text-xs text-gray-500">
                  Disable to block login access.
                </div>
              </div>

              <Toggle
                checked={!!form.enabled}
                onChange={(v) => setForm((s) => ({ ...s, enabled: v }))}
              />
            </div>
          </Card>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-xl bg-[#2ec4b6] hover:bg-[#26a699] text-white">
              {isEdit ? "Save Changes" : "Create Account"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Field = ({ label, children }) => (
  <div>
    <div className="text-xs font-semibold text-gray-600 mb-1">{label}</div>
    {children}
  </div>
);

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
      checked ? "bg-[#2ec4b6]" : "bg-gray-200"
    }`}
    aria-pressed={checked}
  >
    <span
      className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
        checked ? "translate-x-5" : "translate-x-1"
      }`}
    />
  </button>
);

export default LabAccountModal;