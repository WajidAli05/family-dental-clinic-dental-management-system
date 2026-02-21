// src/components/owner/StaffAccountModal.jsx
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30";

const StaffAccountModal = ({ open, mode = "create", initial, onClose, onSubmit }) => {
  const isEdit = mode === "edit";

  const [form, setForm] = useState({
    name: "",
    role: "dentist", // dentist | receptionist | lab
    email: "",
    phone: "",
    password: "",
    commission: "", // dentist only
    enabled: true,
  });

  useEffect(() => {
    if (!open) return;

    if (isEdit && initial) {
      setForm({
        name: initial.name || "",
        role: initial.role || "dentist",
        email: initial.email || "",
        phone: initial.phone || "",
        password: "", // optional on edit
        commission: initial.role === "dentist" ? String(initial.commission ?? "") : "",
        enabled: initial.enabled ?? true,
      });
    } else {
      setForm({
        name: "",
        role: "dentist",
        email: "",
        phone: "",
        password: "",
        commission: "",
        enabled: true,
      });
    }
  }, [open, isEdit, initial]);

  const showCommission = useMemo(() => form.role === "dentist", [form.role]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const canSubmit = useMemo(() => {
    const nameOk = !!String(form.name || "").trim();
    const emailOk = !!String(form.email || "").trim();
    const pwOk = isEdit ? true : String(form.password || "").trim().length >= 6;
    return nameOk && emailOk && pwOk;
  }, [form.name, form.email, form.password, isEdit]);

  const handleSubmit = () => {
    const name = String(form.name || "").trim();
    const email = String(form.email || "").trim();
    const phone = String(form.phone || "").trim();

    if (!name || !email) return;

    const payload = {
      name,
      role: form.role,
      email,
      phone,
      enabled: !!form.enabled,
    };

    // password: required for create, optional for edit
    if (!isEdit) payload.password = String(form.password || "").trim();
    else if (String(form.password || "").trim()) payload.password = String(form.password || "").trim();

    if (form.role === "dentist") {
      const c = Number(form.commission || 0);
      payload.commission = Number.isFinite(c) ? c : 0;
    }

    onSubmit?.(payload);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose?.() : null)}>
      <DialogContent className="sm:max-w-[560px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {isEdit ? "Edit Staff Account" : "Add Staff Account"}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Full Name *">
              <input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Dr. Ahmed"
                className={inputClass}
              />
            </Field>

            <Field label="Role *">
              <select
                value={form.role}
                onChange={(e) => update("role", e.target.value)}
                className={inputClass}
                disabled={isEdit} // role change is usually not desired; remove if you want it editable
              >
                <option value="dentist">Dentist</option>
                <option value="receptionist">Receptionist</option>
                <option value="lab">Lab</option>
              </select>
            </Field>

            <Field label="Email *">
              <input
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="name@clinic.com"
                className={inputClass}
              />
            </Field>

            <Field label="Phone">
              <input
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="03xx-xxxxxxx"
                className={inputClass}
              />
            </Field>

            <Field label={isEdit ? "Password (leave blank to keep)" : "Password * (min 6 chars)"}>
              <input
                type="password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder={isEdit ? "••••••••" : "Create a password"}
                className={inputClass}
              />
            </Field>

            {showCommission ? (
              <Field label="Commission % (Dentist)">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.commission}
                  onChange={(e) => update("commission", e.target.value)}
                  placeholder="e.g. 30"
                  className={inputClass}
                />
              </Field>
            ) : (
              <div />
            )}

            {isEdit ? (
              <Field label="Account Status">
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={!!form.enabled}
                    onChange={(e) => update("enabled", e.target.checked)}
                    className="h-4 w-4 accent-[#2ec4b6]"
                  />
                  <span className="text-sm text-gray-700">{form.enabled ? "Enabled" : "Disabled"}</span>
                </div>
              </Field>
            ) : (
              <div />
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" className="rounded-xl" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-[#2ec4b6] hover:bg-[#26a699] text-white"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {isEdit ? "Save Changes" : "Create Account"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Field = ({ label, children }) => (
  <div>
    <p className="text-xs font-semibold text-gray-600 mb-1">{label}</p>
    {children}
  </div>
);

export default StaffAccountModal;