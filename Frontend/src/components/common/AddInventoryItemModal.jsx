import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const UNITS = ["boxes", "pairs", "vials", "tubes", "pieces", "bottles"];

/**
 * Shared Add Item modal — the receptionist's version, generalized as the
 * base for BOTH roles (per an explicit request). The owner had its own
 * separate create UI (folded into EditItemModal's "create" mode); comparing
 * the two field-for-field found no owner-only capability that genuinely
 * existed once `packSize` is set aside — that field was already dead on the
 * receptionist side too (no `packSize` column on the schema; the one place
 * that read it, services/receptionist.service.js's `mapInventoryItem`, is
 * itself unreachable dead code), so it is dropped here rather than carried
 * into a second role.
 *
 * Takes `onSubmit` rather than importing a store directly, so this is truly
 * one component for both roles — each page wires its own store's create
 * action (same pattern as UpdateStockModal / SupplierModal).
 */
const AddInventoryItemModal = ({ open, onOpenChange, suppliers = [], onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    category: "Consumable",
    unit: "boxes",
    stock: "",
    minStock: "",
    maximumStock: "",
    batchNumber: "",
    usedIn: "",
    supplier: "",
    unitCost: "",
    location: "",
    expiryDate: "",
  });

  // Supplier is stored as a plain name string on the item (no schema
  // migration to a ref). When suppliers exist, offer a picker; otherwise fall
  // back to free text so the form still works with an empty Supplier list.
  const supplierNames = useMemo(
    () => (suppliers || []).map((s) => s.name).filter(Boolean),
    [suppliers]
  );

  const reset = () => {
    setIsSubmitting(false);
    setForm({
      name: "",
      category: "Consumable",
      unit: "boxes",
      stock: "",
      minStock: "",
      maximumStock: "",
      batchNumber: "",
      usedIn: "",
      supplier: "",
      unitCost: "",
      location: "",
      expiryDate: "",
    });
  };

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  const usedInArray = useMemo(() => {
    return String(form.usedIn || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }, [form.usedIn]);

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("Item name is required.");
      return;
    }

    const qty = Number(form.stock);
    const reorderLevel = Number(form.minStock);
    if (Number.isNaN(qty) || qty < 0) {
      toast.error("Stock must be 0 or more.");
      return;
    }
    if (Number.isNaN(reorderLevel) || reorderLevel < 0) {
      toast.error("Min stock must be 0 or more.");
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        name: form.name.trim(),
        // sku is always backend-generated — never sent from the client.
        category: form.category,
        unit: form.unit,
        // Canonical schema field names (qty/reorderLevel) — the receptionist
        // service also accepts stock/minStock as aliases, so either backend
        // reads this correctly without per-role branching in the modal.
        qty,
        reorderLevel,
        maximumStock: Math.max(0, Number(form.maximumStock || 0) || 0),
        batchNumber: form.batchNumber.trim(),
        usedIn: usedInArray,
        supplier: form.supplier.trim(),
        unitCost: Number(form.unitCost || 0) || 0,
        location: form.location.trim(),
        expiryDate: form.expiryDate.trim(),
      });

      toast.success("Inventory item added.");
      onOpenChange(false);
    } catch (e) {
      // Modal stays open with the entered data intact so the user can
      // correct and retry — only the submit lock is released.
      toast.error(e.message || "Failed to add item.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isSubmitting && onOpenChange(v)}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Inventory Item</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Item Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Consumable">Consumable</SelectItem>
                <SelectItem value="Material">Material</SelectItem>
                <SelectItem value="Medicine">Medicine</SelectItem>
                <SelectItem value="Equipment">Equipment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Unit</Label>
            <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Initial Quantity *</Label>
            <Input
              type="number"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Min Stock (Reorder Level) *</Label>
            <Input
              type="number"
              value={form.minStock}
              onChange={(e) => setForm({ ...form, minStock: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Maximum Stock (optional)</Label>
            <Input
              type="number"
              placeholder="Upper threshold"
              value={form.maximumStock}
              onChange={(e) => setForm({ ...form, maximumStock: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Batch Number (optional)</Label>
            <Input
              placeholder="For lot tracking / recalls"
              value={form.batchNumber}
              onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Supplier (optional)</Label>
            {supplierNames.length ? (
              <Select
                value={form.supplier}
                onValueChange={(v) => setForm({ ...form, supplier: v === "__none" ? "" : v })}
              >
                <SelectTrigger><SelectValue placeholder="Select a supplier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">—</SelectItem>
                  {supplierNames.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="Supplier name"
                value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>Unit Cost (optional)</Label>
            <Input
              type="number"
              value={form.unitCost}
              onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Location (optional)</Label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>Expiry Date (optional)</Label>
            <Input
              type="date"
              value={form.expiryDate}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Used In (comma separated)</Label>
            <Textarea
              placeholder="Cleaning, Extraction, Root Canal"
              value={form.usedIn}
              onChange={(e) => setForm({ ...form, usedIn: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={isSubmitting}
            onClick={submit}
            className="bg-[#2ec4b6] hover:bg-[#26a699]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Add Item"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddInventoryItemModal;
