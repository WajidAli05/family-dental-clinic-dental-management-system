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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useInventoryStore } from "@/store/inventoryStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const UNITS = ["boxes", "pairs", "vials", "tubes", "pieces", "bottles"];

const AddInventoryModal = ({ open, onOpenChange }) => {
  const { createItem } = useInventoryStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    category: "Consumable",
    unit: "boxes",
    packSize: "",
    stock: "",
    minStock: "",
    usedIn: "",
    supplier: "",
    unitCost: "",
    location: "",
    expiryDate: "",
  });

  const reset = () => {
    setIsSubmitting(false);
    setNotification(null);
    setForm({
      name: "",
      sku: "",
      category: "Consumable",
      unit: "boxes",
      packSize: "",
      stock: "",
      minStock: "",
      usedIn: "",
      supplier: "",
      unitCost: "",
      location: "",
      expiryDate: "",
    });
  };

  useEffect(() => {
    if (!open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const usedInArray = useMemo(() => {
    return String(form.usedIn || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }, [form.usedIn]);

  const submit = async () => {
    if (!form.name.trim()) {
      setNotification({ type: "error", message: "Item name is required." });
      return;
    }

    const stock = Number(form.stock);
    const minStock = Number(form.minStock);
    if (Number.isNaN(stock) || stock < 0) {
      setNotification({ type: "error", message: "Stock must be 0 or more." });
      return;
    }
    if (Number.isNaN(minStock) || minStock < 0) {
      setNotification({ type: "error", message: "Min stock must be 0 or more." });
      return;
    }

    setIsSubmitting(true);
    setNotification(null);

    try {
      await createItem({
        name: form.name.trim(),
        sku: form.sku.trim(),
        category: form.category,
        unit: form.unit,
        packSize: Number(form.packSize || 0) || 0,
        stock,
        minStock,
        usedIn: usedInArray,
        supplier: form.supplier.trim(),
        unitCost: Number(form.unitCost || 0) || 0,
        location: form.location.trim(),
        expiryDate: form.expiryDate.trim(),
      });

      setNotification({ type: "success", message: "Inventory item added." });
      setTimeout(() => {
        onOpenChange(false);
      }, 800);
    } catch (e) {
      setNotification({ type: "error", message: e.message || "Failed to add item." });
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
            <Label>SKU (optional)</Label>
            <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
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
            <Label>Pack Size (optional)</Label>
            <Input
              type="number"
              placeholder="e.g. 100 gloves per box"
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
            <Label>Min Stock (Reorder Level) *</Label>
            <Input
              type="number"
              value={form.minStock}
              onChange={(e) => setForm({ ...form, minStock: e.target.value })}
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

          <div className="space-y-2">
            <Label>Supplier (optional)</Label>
            <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
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
        </div>

        {notification && (
          <Alert
            className={
              notification.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }
          >
            {notification.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className="ml-2">{notification.message}</AlertDescription>
          </Alert>
        )}

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

export default AddInventoryModal;