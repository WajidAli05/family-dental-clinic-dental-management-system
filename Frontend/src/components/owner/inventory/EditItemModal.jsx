import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useClinicConfig } from "@/store/clinicConfigStore";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-background text-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30 [&>option]:bg-background [&>option]:text-foreground";

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

/**
 * BUG 1 FIX: this modal was edit-only — no initial-quantity field, and no
 * owner screen ever rendered it in "create" mode (`openCreateItem` /
 * `createItem` existed in the store, unused). The backend create endpoint
 * always worked; the owner simply had no button that reached it. Now serves
 * both modes off one `mode` prop, matching the pattern already proven for
 * the shared UpdateStockModal: scrollable body with a fixed footer so Save
 * stays reachable, loading spinner during submit.
 */
const EditItemModal = ({ open, mode = "edit", item, supplierOptions = [], onClose, onSubmit, loading }) => {
  const { currency } = useClinicConfig();
  const isCreate = mode === "create";
  const [form, setForm] = useState({
    name: "",
    category: "consumables",
    unit: "",
    qty: 0,
    reorderLevel: 0,
    maximumStock: 0,
    unitCost: 0,
    supplier: "", // stored as supplier name string
    location: "",
    expiryDate: "",
    batchNumber: "",
    usedIn: "", // comma-separated
  });

  // Convert supplierOptions -> names (since InventoryItem.supplier is a STRING
  // in the model). The item's current supplier is appended if it doesn't
  // match any Supplier record, so an existing value stays visible/selected
  // instead of the picker showing nothing for it.
  const supplierNames = useMemo(() => {
    const names = (supplierOptions || []).map((s) => s.name).filter(Boolean);
    const current = String(item?.supplier || "").trim();
    return current && !names.includes(current) ? [current, ...names] : names;
  }, [supplierOptions, item]);

  useEffect(() => {
    if (!open) return;

    setForm({
      name: item?.name || "",
      category: item?.category || "consumables",
      unit: item?.unit || "",
      qty: toNum(item?.qty),
      reorderLevel: toNum(item?.reorderLevel),
      maximumStock: toNum(item?.maximumStock),
      unitCost: toNum(item?.unitCost),
      supplier: item?.supplier || "",
      location: item?.location || "",
      expiryDate: item?.expiryDate || "",
      batchNumber: item?.batchNumber || "",
      usedIn: Array.isArray(item?.usedIn) ? item.usedIn.join(", ") : "",
    });
  }, [open, item]);

  const setField = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const isValid = normalizeStr(form.name).length > 0;

  const handleSave = async () => {
    if (!isValid) return;
    const payload = {
      name: normalizeStr(form.name),
      category: normalizeStr(form.category),
      unit: normalizeStr(form.unit),
      reorderLevel: Math.max(0, toNum(form.reorderLevel)),
      maximumStock: Math.max(0, toNum(form.maximumStock)),
      unitCost: Math.max(0, toNum(form.unitCost)),
      supplier: normalizeStr(form.supplier), // ✅ keep supplier as string (name)
      location: normalizeStr(form.location),
      expiryDate: normalizeStr(form.expiryDate),
      batchNumber: normalizeStr(form.batchNumber),
      usedIn: normalizeStr(form.usedIn)
        ? normalizeStr(form.usedIn)
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean)
        : [],
    };
    if (isCreate) payload.qty = Math.max(0, toNum(form.qty));

    await onSubmit?.(payload);
  };

  return (
    <Dialog open={!!open} onOpenChange={(v) => (!v && !loading ? onClose?.() : null)}>
      <DialogContent className="sm:max-w-[760px] max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <DialogTitle className="text-lg font-semibold">
            {isCreate ? "Add Inventory Item" : `Edit Item ${item?.sku ? `• ${item.sku}` : ""}`}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto px-6 py-4 flex-1 min-h-0">
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

          {isCreate && (
            <Field label="Initial Quantity">
              <input
                type="number"
                className={inputClass}
                value={form.qty}
                onChange={(e) => setField("qty", e.target.value)}
                min={0}
              />
            </Field>
          )}

          <Field label="Supplier">
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

          <Field label="Maximum Stock">
            <input
              type="number"
              className={inputClass}
              value={form.maximumStock}
              onChange={(e) => setField("maximumStock", e.target.value)}
              min={0}
              placeholder="Upper threshold"
            />
          </Field>

          <Field label="Batch Number">
            <input
              className={inputClass}
              value={form.batchNumber}
              onChange={(e) => setField("batchNumber", e.target.value)}
              placeholder="For lot tracking / recalls"
            />
          </Field>

          <Field label={`Unit Cost (${currency})`}>
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

        <DialogFooter className="px-6 py-4 border-t border-gray-100 shrink-0">
          <Button variant="outline" className="rounded-xl" onClick={onClose} disabled={!!loading}>
            Cancel
          </Button>
          <Button
            className="rounded-xl bg-[#2ec4b6] hover:bg-[#29b3a7]"
            onClick={handleSave}
            disabled={!!loading || !isValid}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
                Saving…
              </>
            ) : isCreate ? (
              "Create Item"
            ) : (
              "Save Changes"
            )}
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

export default EditItemModal;
