import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30";

const normalizeStr = (v) => String(v ?? "").trim();

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const categories = [
  { value: "consumables", label: "Consumables" },
  { value: "materials", label: "Materials" },
  { value: "equipment", label: "Equipment" },
];

const EditItemModal = ({ open, item, supplierOptions = [], onClose, onSubmit, loading }) => {
  const [form, setForm] = useState({
    name: "",
    category: "consumables",
    unit: "",
    reorderLevel: 0,
    unitCost: 0,
    supplier: "", // stored as supplier name string
    location: "",
    expiryDate: "",
    usedIn: "", // comma-separated
  });

  // Convert supplierOptions -> names (since InventoryItem.supplier is a STRING in your model)
  const supplierNames = useMemo(
    () => (supplierOptions || []).map((s) => s.name).filter(Boolean),
    [supplierOptions]
  );

  useEffect(() => {
    if (!open) return;

    setForm({
      name: item?.name || "",
      category: item?.category || "consumables",
      unit: item?.unit || "",
      reorderLevel: toNum(item?.reorderLevel),
      unitCost: toNum(item?.unitCost),
      supplier: item?.supplier || "",
      location: item?.location || "",
      expiryDate: item?.expiryDate || "",
      usedIn: Array.isArray(item?.usedIn) ? item.usedIn.join(", ") : "",
    });
  }, [open, item]);

  const setField = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const handleSave = async () => {
    const payload = {
      name: normalizeStr(form.name),
      category: normalizeStr(form.category),
      unit: normalizeStr(form.unit),
      reorderLevel: Math.max(0, toNum(form.reorderLevel)),
      unitCost: Math.max(0, toNum(form.unitCost)),
      supplier: normalizeStr(form.supplier), // ✅ keep supplier as string (name)
      location: normalizeStr(form.location),
      expiryDate: normalizeStr(form.expiryDate),
      usedIn: normalizeStr(form.usedIn)
        ? normalizeStr(form.usedIn)
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean)
        : [],
    };

    if (!payload.name) return;

    await onSubmit?.(payload);
  };

  return (
    <Dialog open={!!open} onOpenChange={(v) => (!v ? onClose?.() : null)}>
      <DialogContent className="sm:max-w-[760px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Edit Item {item?.sku ? `• ${item.sku}` : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <Field label="Name *">
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="e.g., Surgical Gloves"
            />
          </Field>

          <Field label="Category">
            <select
              className={inputClass}
              value={form.category}
              onChange={(e) => setField("category", e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Unit">
            <input
              className={inputClass}
              value={form.unit}
              onChange={(e) => setField("unit", e.target.value)}
              placeholder="box, vial, piece..."
            />
          </Field>

          <Field label="Supplier">
            {/* ✅ still keep filter + column; tab removed */}
            {supplierNames.length ? (
              <select
                className={inputClass}
                value={form.supplier}
                onChange={(e) => setField("supplier", e.target.value)}
              >
                <option value="">—</option>
                {supplierNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className={inputClass}
                value={form.supplier}
                onChange={(e) => setField("supplier", e.target.value)}
                placeholder="Supplier name"
              />
            )}
          </Field>

          <Field label="Reorder Level">
            <input
              type="number"
              className={inputClass}
              value={form.reorderLevel}
              onChange={(e) => setField("reorderLevel", e.target.value)}
              min={0}
            />
          </Field>

          <Field label="Unit Cost (PKR)">
            <input
              type="number"
              className={inputClass}
              value={form.unitCost}
              onChange={(e) => setField("unitCost", e.target.value)}
              min={0}
            />
          </Field>

          <Field label="Location">
            <input
              className={inputClass}
              value={form.location}
              onChange={(e) => setField("location", e.target.value)}
              placeholder="Shelf A / Store Room..."
            />
          </Field>

          <Field label="Expiry Date">
            <input
              type="date"
              className={inputClass}
              value={form.expiryDate}
              onChange={(e) => setField("expiryDate", e.target.value)}
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Used In (comma separated)">
              <input
                className={inputClass}
                value={form.usedIn}
                onChange={(e) => setField("usedIn", e.target.value)}
                placeholder="Cleaning, Extraction, Filling..."
              />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-5">
          <Button variant="outline" className="rounded-xl" onClick={onClose} disabled={!!loading}>
            Cancel
          </Button>
          <Button
            className="rounded-xl bg-[#2ec4b6] hover:bg-[#29b3a7]"
            onClick={handleSave}
            disabled={!!loading || !normalizeStr(form.name)}
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
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

export default EditItemModal;