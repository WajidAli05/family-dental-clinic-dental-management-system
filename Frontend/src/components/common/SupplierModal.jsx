import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-background text-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30 [&>option]:bg-background [&>option]:text-foreground";

const normalizeStr = (v) => String(v ?? "").trim();

/**
 * Suppliers had NO create path anywhere in the codebase before this session.
 * Shared by owner + receptionist — one component, `onSubmit` is the only
 * thing that differs between roles (which store action it calls).
 */
const SupplierModal = ({ open, supplier, onClose, onSubmit }) => {
  const isEdit = !!supplier;
  const [form, setForm] = useState({
    name: "", contactPerson: "", phone: "", email: "", address: "", paymentTerms: "", notes: "", active: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: supplier?.name || "",
      contactPerson: supplier?.contactPerson || "",
      phone: supplier?.phone || "",
      email: supplier?.email || "",
      address: supplier?.address || "",
      paymentTerms: supplier?.paymentTerms || "",
      notes: supplier?.notes || "",
      active: supplier?.active !== false,
    });
    setSaving(false);
  }, [open, supplier]);

  const setField = (key, value) => setForm((p) => ({ ...p, [key]: value }));
  const isValid = normalizeStr(form.name).length > 0;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      await onSubmit?.({
        name: normalizeStr(form.name),
        contactPerson: normalizeStr(form.contactPerson),
        phone: normalizeStr(form.phone),
        email: normalizeStr(form.email),
        address: normalizeStr(form.address),
        paymentTerms: normalizeStr(form.paymentTerms),
        notes: normalizeStr(form.notes),
        active: !!form.active,
      });
      toast.success(isEdit ? "Supplier updated." : "Supplier created.");
      onClose?.();
    } catch (e) {
      toast.error(e?.message || "Failed to save supplier.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!open} onOpenChange={(v) => (!v && !saving ? onClose?.() : null)}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <DialogTitle className="text-lg font-semibold">
            {isEdit ? `Edit Supplier ${supplier?.id ? `• ${supplier.id}` : ""}` : "Add Supplier"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto px-6 py-4 flex-1 min-h-0">
          <Field label="Name *">
            <input className={inputClass} value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="e.g., Al-Falah Medical Supplies" />
          </Field>
          <Field label="Contact Person">
            <input className={inputClass} value={form.contactPerson} onChange={(e) => setField("contactPerson", e.target.value)} />
          </Field>
          <Field label="Phone">
            <input className={inputClass} value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
          </Field>
          <Field label="Email">
            <input type="email" className={inputClass} value={form.email} onChange={(e) => setField("email", e.target.value)} />
          </Field>
          <Field label="Payment Terms">
            <input className={inputClass} value={form.paymentTerms} onChange={(e) => setField("paymentTerms", e.target.value)} placeholder="e.g., net30" />
          </Field>
          <Field label="Active">
            <select className={inputClass} value={form.active ? "yes" : "no"} onChange={(e) => setField("active", e.target.value === "yes")}>
              <option value="yes">Active</option>
              <option value="no">Inactive</option>
            </select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Address">
              <input className={inputClass} value={form.address} onChange={(e) => setField("address", e.target.value)} />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Notes">
              <input className={inputClass} value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
            </Field>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-gray-100 shrink-0">
          <Button variant="outline" className="rounded-xl" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button className="rounded-xl bg-[#2ec4b6] hover:bg-[#26a699]" onClick={handleSave} disabled={saving || !isValid}>
            {saving ? (<><Loader2 className="w-4 h-4 me-2 animate-spin" />Saving…</>) : isEdit ? "Save Changes" : "Create Supplier"}
          </Button>
        </DialogFooter>
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

export default SupplierModal;
