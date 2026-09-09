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
import { useInventoryStore } from "@/store/inventoryStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const UNITS = ["boxes", "pairs", "vials", "tubes", "pieces", "bottles"];

const EditInventoryModal = ({ open, onOpenChange, item, suppliers = [] }) => {
  const { updateItem } = useInventoryStore();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    category: "Consumable",
    unit: "boxes",
    packSize: "",
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

  // Supplier stays backward-compatible: an item's stored supplier name may not
  // match any current Supplier record (renamed, removed, or entered as free
  // text before this selector existed). Appending it as an extra option keeps
  // it visible and selected instead of the picker silently showing blank.
  const supplierNames = useMemo(() => {
    const names = (suppliers || []).map((s) => s.name).filter(Boolean);
    const current = String(item?.supplier || "").trim();
    return current && !names.includes(current) ? [current, ...names] : names;
  }, [suppliers, item]);

  useEffect(() => {
    if (!item) return;
    setIsSubmitting(false);

    setForm({
      name: item.name || "",
      category: item.category || "Consumable",
      unit: item.unit || "boxes",
      packSize: String(item.packSize || ""),
      stock: String(item.stock ?? ""),
      minStock: String(item.minStock ?? ""),
      maximumStock: String(item.maximumStock || ""),
      batchNumber: item.batchNumber || "",
      usedIn: Array.isArray(item.usedIn) ? item.usedIn.join(", ") : "",
      supplier: item.supplier || "",
      unitCost: String(item.unitCost || ""),
      location: item.location || "",
      expiryDate: item.expiryDate || "",
    });
  }, [item]);

  const usedInArray = useMemo(() => {
    return String(form.usedIn || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }, [form.usedIn]);

  const submit = async () => {
    if (!item?.id) return;

    if (!form.name.trim()) {
      toast.error("Item name is required.");
      return;
    }

    const stock = Number(form.stock);
    const minStock = Number(form.minStock);
    if (Number.isNaN(stock) || stock < 0) {
      toast.error("Stock must be 0 or more.");
      return;
    }
    if (Number.isNaN(minStock) || minStock < 0) {
      toast.error("Min stock must be 0 or more.");
      return;
    }

    setIsSubmitting(true);

    try {
      await updateItem(item.id, {
        name: form.name.trim(),
        // sku is backend-generated and never editable from the client.
        category: form.category,
        unit: form.unit,
        packSize: Number(form.packSize || 0) || 0,
        stock,
        minStock,
        maximumStock: Math.max(0, Number(form.maximumStock || 0) || 0),
        batchNumber: form.batchNumber.trim(),
        usedIn: usedInArray,
        supplier: form.supplier.trim(),
        unitCost: Number(form.unitCost || 0) || 0,
        location: form.location.trim(),
        expiryDate: form.expiryDate.trim(),
      });

      toast.success("Inventory item updated.");
      onOpenChange(false);
    } catch (e) {
      // Modal stays open with the entered data intact so the user can
      // correct and retry — only the submit lock is released.
      toast.error(e.message || "Failed to update item.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !isSubmitting && onOpenChange(v)}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit Inventory Item — {item.name}
            {item.sku ? <span className="text-sm font-normal text-gray-500"> ({item.sku})</span> : null}
          </DialogTitle>
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
            <Label>Pack Size</Label>
            <Input
              type="number"
              value={form.packSize}
              onChange={(e) => setForm({ ...form, packSize: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Stock *</Label>
            <Input
              type="number"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Min Stock *</Label>
            <Input
              type="number"
              value={form.minStock}
              onChange={(e) => setForm({ ...form, minStock: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Maximum Stock</Label>
            <Input
              type="number"
              placeholder="Upper threshold"
              value={form.maximumStock}
              onChange={(e) => setForm({ ...form, maximumStock: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Batch Number</Label>
            <Input
              placeholder="For lot tracking / recalls"
              value={form.batchNumber}
              onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Used In</Label>
            <Textarea value={form.usedIn} onChange={(e) => setForm({ ...form, usedIn: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>Supplier</Label>
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
              <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
            )}
          </div>

          <div className="space-y-2">
            <Label>Unit Cost</Label>
            <Input
              type="number"
              value={form.unitCost}
              onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>Expiry Date</Label>
            <Input
              type="date"
              value={form.expiryDate}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
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
                Updating...
              </>
            ) : (
              "Update Item"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditInventoryModal;