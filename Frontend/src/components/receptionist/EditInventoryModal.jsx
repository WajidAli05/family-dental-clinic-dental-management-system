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

const EditInventoryModal = ({ open, onOpenChange, item }) => {
  const { updateItem } = useInventoryStore();

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

  useEffect(() => {
    if (!item) return;
    setNotification(null);
    setIsSubmitting(false);

    setForm({
      name: item.name || "",
      sku: item.sku || "",
      category: item.category || "Consumable",
      unit: item.unit || "boxes",
      packSize: String(item.packSize || ""),
      stock: String(item.stock ?? ""),
      minStock: String(item.minStock ?? ""),
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
      await updateItem(item.id, {
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

      setNotification({ type: "success", message: "Inventory item updated." });
      setTimeout(() => onOpenChange(false), 700);
    } catch (e) {
      setNotification({ type: "error", message: e.message || "Failed to update item." });
      setIsSubmitting(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !isSubmitting && onOpenChange(v)}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Inventory Item — {item.name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Item Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>SKU</Label>
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

          <div className="space-y-2 md:col-span-2">
            <Label>Used In</Label>
            <Textarea value={form.usedIn} onChange={(e) => setForm({ ...form, usedIn: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>Supplier</Label>
            <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
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