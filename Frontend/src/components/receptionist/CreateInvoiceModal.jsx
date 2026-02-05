import { useEffect, useMemo, useState } from "react";

// UI
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Stores
import { usePatientStore } from "@/store/patientStore";
import { useBillingStore } from "@/store/billingStore";

// Icons
import {
  Search,
  Loader2,
  User,
  Phone,
  CheckCircle2,
  XCircle,
  ReceiptText,
} from "lucide-react";

const normalizePhone = (s) => String(s || "").replace(/[^\d+]/g, "");

const CreateInvoiceModal = ({ open, onOpenChange }) => {
  const { patients } = usePatientStore();

  const {
    // ✅ optional backend method (we will add it in store below)
    createInvoice: createInvoiceBackend,

    // local state fallback (existing)
    invoices,
  } = useBillingStore();

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [patient, setPatient] = useState(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    totalAmount: "",
  });

  const [notification, setNotification] = useState(null);

  const resetState = () => {
    setQuery("");
    setSearching(false);
    setIsSubmitting(false);
    setPatient(null);
    setError("");
    setForm({
      date: new Date().toISOString().slice(0, 10),
      totalAmount: "",
    });
    setNotification(null);
  };

  useEffect(() => {
    if (!open) resetState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSearch = () => {
    setNotification(null);
    setError("");
    setPatient(null);

    if (!query.trim()) return;

    setSearching(true);

    // Same style as appointment (fake delay)
    setTimeout(() => {
      const q = query.trim();
      const qPhone = normalizePhone(q);

      const found = (patients || []).find((p) => {
        const mrMatch = String(p.mr ?? "") === q;
        const phoneMatch =
          normalizePhone(p.phone) === qPhone ||
          normalizePhone(p.phone).replace(/\s/g, "") === qPhone.replace(/\s/g, "");
        return mrMatch || phoneMatch;
      });

      if (!found) {
        setError("Patient not found. Please register patient first.");
      } else {
        setPatient(found);
      }

      setSearching(false);
    }, 900);
  };

  const validate = () => {
    if (!patient) {
      setNotification({
        type: "error",
        message: "Please search and select a patient first.",
      });
      return false;
    }

    const amt = Number(form.totalAmount);
    if (!amt || amt <= 0) {
      setNotification({
        type: "error",
        message: "Total amount must be greater than 0.",
      });
      return false;
    }

    if (!form.date) {
      setNotification({
        type: "error",
        message: "Please select invoice date.",
      });
      return false;
    }

    return true;
  };

  const handleCreate = async () => {
    setNotification(null);
    setError("");

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      // ✅ Prefer backend
      if (typeof createInvoiceBackend === "function") {
        await createInvoiceBackend({
          // backend supports: patientId or mr
          patientId: patient.publicId || undefined,
          mr: patient.mr || undefined,
          date: form.date,
          totalAmount: Number(form.totalAmount),
        });
      } else {
        // ✅ local fallback insert (won’t break app)
        const nextNo = (invoices?.length || 0) + 1001;
        const newId = `INV-${nextNo}`;
        useBillingStore.setState((state) => ({
          invoices: [
            {
              id: newId,
              mr: patient.mr,
              patientName: patient.name,
              date: form.date,
              totalAmount: Number(form.totalAmount),
              status: "Pending",
              payments: [],
            },
            ...(state.invoices || []),
          ],
        }));
      }

      setNotification({
        type: "success",
        message: `Invoice created successfully for ${patient.name}.`,
      });

      setTimeout(() => {
        setIsSubmitting(false);
        onOpenChange(false);
      }, 1000);
    } catch (e) {
      setIsSubmitting(false);
      setNotification({
        type: "error",
        message: e?.message || "Failed to create invoice. Please try again.",
      });
    }
  };

  const canSearch = useMemo(() => !!query.trim() && !searching, [query, searching]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ReceiptText className="w-5 h-5 text-[#2ec4b6]" />
            Create Invoice
          </DialogTitle>
        </DialogHeader>

        {/* Search Patient */}
        <div className="space-y-2">
          <Label>Search Patient (MR or Phone)</Label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. 1 or +923001234567"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              disabled={isSubmitting}
            />
            <Button
              onClick={handleSearch}
              disabled={!canSearch || isSubmitting}
              className="bg-[#2ec4b6] hover:bg-[#26a699]"
            >
              {searching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          {!patients?.length ? (
            <p className="text-xs text-gray-500">
              Note: patient list is empty in store. Make sure patients are being fetched from backend on Patients page.
            </p>
          ) : null}
        </div>

        {/* Patient Found */}
        {patient && (
          <>
            <Card className="p-4 bg-gray-50 border">
              <div className="flex gap-4">
                <User className="text-[#2ec4b6]" />
                <div className="text-sm">
                  <p className="font-semibold">{patient.name}</p>
                  <p className="text-gray-500">
                    MR: {patient.mr} • {patient.gender}, {patient.age}
                  </p>
                  <p className="text-gray-500 flex gap-1 items-center">
                    <Phone size={14} />
                    {patient.phone}
                  </p>
                </div>
              </div>
            </Card>

            {/* Invoice Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1">
                <Label>Total Amount (PKR)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 15000"
                  value={form.totalAmount}
                  onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Notification */}
            {notification && (
              <Alert
                className={`${
                  notification.type === "success"
                    ? "bg-green-50 border-green-200 text-green-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
              >
                {notification.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className="ml-2">
                  {notification.message}
                </AlertDescription>
              </Alert>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                disabled={isSubmitting}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>

              <Button
                onClick={handleCreate}
                disabled={isSubmitting}
                className="bg-[#2ec4b6] hover:bg-[#26a699]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <ReceiptText className="w-4 h-4 mr-2" />
                    Create Invoice
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateInvoiceModal;