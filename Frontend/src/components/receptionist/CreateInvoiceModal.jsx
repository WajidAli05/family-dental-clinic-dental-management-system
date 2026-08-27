import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { usePatientStore } from "@/store/patientStore";
import { useBillingStore } from "@/store/billingStore";
import { useCatalogStore } from "@/store/catalogStore";
import { useOwnerSettingsStore } from "@/store/ownerSettingsStore";
import { receptionistApi } from "@/lib/receptionistApi";
import { receptionistBillingApi } from "@/lib/receptionistBillingApi";
import { useFormatMoney } from "@/store/clinicConfigStore";

import {
  Search,
  Loader2,
  User,
  Phone,
  CheckCircle2,
  XCircle,
  ReceiptText,
  Plus,
  Trash2,
} from "lucide-react";

const todayISO = () => new Date().toISOString().slice(0, 10);

const KIND_BADGE = {
  consultation: "bg-blue-100 text-blue-700",
  treatment: "bg-teal-100 text-teal-700",
  lab_sample: "bg-purple-100 text-purple-700",
};
const KIND_LABEL = {
  consultation: "Consult",
  treatment: "Treatment",
  lab_sample: "Lab",
};

/**
 * Shared invoice modal — used by BOTH the receptionist billing tab and the
 * owner Billing & Financials tab. `api` swaps the role-scoped client and
 * `invoice` puts it in edit mode; everything else is identical, so there is
 * exactly one invoice form in the app.
 *
 * Prices are never computed here beyond line totals for display: treatment
 * unit prices come from the server's getTreatmentFee for the selected fee
 * schedule, and the server re-resolves them on submit.
 */
const CreateInvoiceModal = ({ open, onOpenChange, api = null, invoice = null, onSaved }) => {
  const isEdit = !!invoice;
  const { t } = useTranslation();
  const PKR = useFormatMoney();
  const { lookupPatient } = usePatientStore();
  const { createInvoice } = useBillingStore();

  const treatments = useCatalogStore((s) => s.treatments);
  const sampleTypes = useCatalogStore((s) => s.sampleTypes);
  const catalogLoading = useCatalogStore((s) => s.loading);
  const fetchCatalogAsReceptionist = useCatalogStore((s) => s.fetchAsReceptionist);

  const billing = useOwnerSettingsStore((s) => s.billing);
  const initSettings = useOwnerSettingsStore((s) => s.init);

  // ── Patient search ──
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [patient, setPatient] = useState(null);
  const [patientError, setPatientError] = useState("");

  // ── Invoice fields ──
  const [date, setDate] = useState(todayISO());
  const [dentistId, setDentistId] = useState("");
  const [dentists, setDentists] = useState([]);
  const [dentistLoading, setDentistLoading] = useState(false);

  // ── Line items ──
  const [items, setItems] = useState([]);
  const [feeScheduleId, setFeeScheduleId] = useState("");
  const [schedules, setSchedules] = useState([]);
  const [pendingTreatment, setPendingTreatment] = useState("");
  const [pendingSampleType, setPendingSampleType] = useState("");

  // ── Submission ──
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  const defaultFee = Number(billing?.defaultConsultationFee) || 0;
  const runningTotal = useMemo(
    () => items.reduce((sum, it) => sum + (Number(it.lineTotal) || 0), 0),
    [items]
  );

  const resetState = useCallback(() => {
    setQuery("");
    setSearching(false);
    setPatient(null);
    setPatientError("");
    setDate(todayISO());
    setDentistId("");
    setItems([]);
    setPendingTreatment("");
    setPendingSampleType("");
    setFeeScheduleId("");
    setIsSubmitting(false);
    setNotification(null);
  }, []);

  // Load catalog + settings + dentists when modal opens
  useEffect(() => {
    if (!open) {
      resetState();
      return;
    }
    initSettings();
    fetchCatalogAsReceptionist();

    setDentistLoading(true);
    receptionistApi
      .getDentists()
      .then((res) => setDentists(res?.data || []))
      .catch(() => {})
      .finally(() => setDentistLoading(false));

    // Price lists available to quote from; the default is preselected.
    const loadSchedules = api?.getInvoiceFeeSchedules
      ? api.getInvoiceFeeSchedules()
      : receptionistBillingApi.getFeeSchedules();
    loadSchedules
      .then((res) => {
        const list = res?.data || [];
        setSchedules(list);
        setFeeScheduleId((cur) => cur || invoice?.feeScheduleId || list.find((x) => x.isDefault)?.id || "");
      })
      .catch(() => setSchedules([]));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // EDIT MODE — hydrate the form from the invoice being edited.
  useEffect(() => {
    if (!open || !invoice) return;
    setPatient({
      id: invoice.patientId || "",
      name: invoice.patientName || "",
      mr: invoice.mr,
      phone: invoice.patientPhone || "",
    });
    setDate(invoice.date || todayISO());
    setDentistId(invoice.dentistId || "");
    setFeeScheduleId(invoice.feeScheduleId || "");
    setItems(
      (invoice.items || []).map((it) => ({
        kind: it.kind,
        refId: it.refId || "",
        name: it.name,
        unitPrice: Number(it.unitPrice) || 0,
        qty: Number(it.qty) || 1,
        lineTotal: Number(it.lineTotal) || 0,
        priceOverridden: !!it.priceOverridden,
      }))
    );
  }, [open, invoice]);

  /**
   * Re-price treatment lines when the fee schedule changes.
   * Lines the user typed a price into (priceOverridden) are left alone — the
   * manual override wins. Consultation and lab lines are not schedule-priced.
   */
  useEffect(() => {
    if (!open || !feeScheduleId) return;
    let alive = true;
    const client = api?.getCatalogTreatments
      ? api.getCatalogTreatments({ limit: 500, scheduleId: feeScheduleId })
      : receptionistBillingApi.getCatalogTreatments({ limit: 500, scheduleId: feeScheduleId });

    client
      .then((res) => {
        if (!alive) return;
        const priced = new Map((res?.data || res?.rows || []).map((t) => [t.id, Number(t.fee) || 0]));
        setItems((prev) =>
          prev.map((it) => {
            if (it.kind !== "treatment" || it.priceOverridden) return it;
            if (!priced.has(it.refId)) return it;
            const unitPrice = priced.get(it.refId);
            return { ...it, unitPrice, lineTotal: unitPrice * (Number(it.qty) || 1) };
          })
        );
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [open, feeScheduleId, api]);

  // Add consultation line when patient is found (create mode only — an edit
  // hydrates its own lines and must not have them replaced).
  useEffect(() => {
    if (!patient || isEdit) return;
    setItems([
      {
        kind: "consultation",
        refId: "",
        name: "Consultation",
        unitPrice: defaultFee,
        qty: 1,
        lineTotal: defaultFee,
      },
    ]);
  }, [patient]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = async () => {
    setPatientError("");
    setPatient(null);
    if (!query.trim()) return;
    setSearching(true);
    try {
      const found = await lookupPatient(query);
      setPatient(found);
    } catch (e) {
      setPatientError(e?.message || "Patient not found.");
    } finally {
      setSearching(false);
    }
  };

  const updateItem = (index, field, rawVal) => {
    setItems((prev) => {
      const next = [...prev];
      const it = { ...next[index] };
      if (field === "unitPrice") {
        it.unitPrice = Math.max(0, Number(rawVal) || 0);
        it.lineTotal = it.unitPrice * (Number(it.qty) || 1);
        // A hand-typed price wins for this line and survives schedule switches.
        it.priceOverridden = true;
      } else if (field === "qty") {
        it.qty = Math.max(1, Number(rawVal) || 1);
        it.lineTotal = (Number(it.unitPrice) || 0) * it.qty;
      }
      next[index] = it;
      return next;
    });
  };

  const removeItem = (index) =>
    setItems((prev) => prev.filter((_, i) => i !== index));

  const addTreatment = () => {
    if (!pendingTreatment) return;
    const t = treatments.find((x) => x.id === pendingTreatment);
    if (!t) return;
    setItems((prev) => [
      ...prev,
      {
        kind: "treatment",
        refId: t.id,
        name: t.name,
        // Resolved by the server for the active schedule; re-prices on switch
        // until the user edits it (which sets priceOverridden).
        unitPrice: Number(t.fee) || 0,
        qty: 1,
        lineTotal: Number(t.fee) || 0,
        priceOverridden: false,
      },
    ]);
    setPendingTreatment("");
  };

  const addSampleType = () => {
    if (!pendingSampleType) return;
    const s = sampleTypes.find((x) => x.id === pendingSampleType);
    if (!s) return;
    setItems((prev) => [
      ...prev,
      {
        kind: "lab_sample",
        refId: s.id,
        name: s.name,
        unitPrice: Number(s.price) || 0,
        qty: 1,
        lineTotal: Number(s.price) || 0,
      },
    ]);
    setPendingSampleType("");
  };

  const handleCreate = async () => {
    setNotification(null);
    if (!patient) {
      setNotification({ type: "error", message: "Please search and select a patient first." });
      return;
    }
    if (items.length === 0) {
      setNotification({ type: "error", message: "Add at least one line item." });
      return;
    }
    if (runningTotal <= 0) {
      setNotification({ type: "error", message: "Invoice total must be greater than 0." });
      return;
    }
    if (!date) {
      setNotification({ type: "error", message: "Please select invoice date." });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        patientId: patient.id || patient.publicId,
        dentistId: dentistId || undefined,
        date,
        feeScheduleId: feeScheduleId || undefined,
        items: items.map((it) => ({
          kind: it.kind,
          refId: it.refId || "",
          name: it.name,
          unitPrice: Number(it.unitPrice) || 0,
          qty: Number(it.qty) || 1,
          lineTotal: Number(it.lineTotal) || 0,
          priceOverridden: !!it.priceOverridden,
        })),
      };

      // Totals are recomputed server-side either way — the running total here
      // is only a preview.
      if (isEdit) await api.updateInvoice(invoice.id, payload);
      else if (api) await api.createInvoice(payload);
      else await createInvoice(payload);

      onSaved?.();
      setNotification({
        type: "success",
        message: isEdit ? `Invoice ${invoice.id} updated.` : `Invoice created for ${patient.name}.`,
      });
      setTimeout(() => {
        setIsSubmitting(false);
        onOpenChange(false);
      }, 1000);
    } catch (e) {
      setIsSubmitting(false);
      setNotification({ type: "error", message: e?.message || "Failed to create invoice." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ReceiptText className="w-5 h-5 text-[#2ec4b6]" />
            {isEdit ? `Edit Invoice ${invoice.id}` : "Create Invoice"}
          </DialogTitle>
        </DialogHeader>

        {/* Patient Search */}
        <div className="space-y-2">
          <Label>Search Patient (MR / PT-0001 / Phone)</Label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. 1 or PT-0001 or 03001234567"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              disabled={isSubmitting}
            />
            <Button
              onClick={handleSearch}
              disabled={!query.trim() || searching || isSubmitting}
              className="bg-[#2ec4b6] hover:bg-[#26a699]"
            >
              {searching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
          {patientError && <p className="text-sm text-red-500">{patientError}</p>}
        </div>

        {patient && (
          <>
            {/* Patient card */}
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

            {/* Date + Dentist + Fee schedule */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-1">
                <Label>Dentist (optional)</Label>
                <Select
                  value={dentistId}
                  onValueChange={setDentistId}
                  disabled={dentistLoading || isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={dentistLoading ? "Loading..." : "Select dentist"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {dentists.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                        {d.specialization ? ` — ${d.specialization}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fee schedule — treatment lines re-price from this. */}
              <div className="space-y-1">
                <Label>{t("invoices.feeSchedule")}</Label>
                <Select
                  value={feeScheduleId || undefined}
                  onValueChange={setFeeScheduleId}
                  disabled={isSubmitting || schedules.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("invoices.feeSchedule")} />
                  </SelectTrigger>
                  <SelectContent>
                    {schedules.map((sch) => (
                      <SelectItem key={sch.id} value={sch.id}>
                        {/* Schedule names are user data — never translated. */}
                        {sch.name}
                        {sch.isDefault ? ` (${t("invoices.defaultSchedule")})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Line items */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Line Items</h3>

              {/* Add Treatment */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select
                    value={pendingTreatment}
                    onValueChange={setPendingTreatment}
                    disabled={catalogLoading || isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          catalogLoading ? "Loading treatments..." : "Add Treatment"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {treatments.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                          {t.code ? ` (${t.code})` : ""} — {PKR(t.fee)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={addTreatment}
                  disabled={!pendingTreatment || isSubmitting}
                  className="bg-teal-500 hover:bg-teal-600 text-white"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Add Lab Sample */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select
                    value={pendingSampleType}
                    onValueChange={setPendingSampleType}
                    disabled={catalogLoading || isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          catalogLoading ? "Loading sample types..." : "Add Lab Sample"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {sampleTypes.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} — {PKR(s.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={addSampleType}
                  disabled={!pendingSampleType || isSubmitting}
                  className="bg-purple-500 hover:bg-purple-600 text-white"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Items table */}
              {items.length > 0 && (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Type</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="w-28">Unit Price</TableHead>
                        <TableHead className="w-16">Qty</TableHead>
                        <TableHead className="w-28 text-end">Total</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((it, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                KIND_BADGE[it.kind] || ""
                              }`}
                            >
                              {KIND_LABEL[it.kind] || it.kind}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{it.name}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={it.unitPrice}
                              onChange={(e) => updateItem(i, "unitPrice", e.target.value)}
                              disabled={isSubmitting}
                              className="h-7 w-24 text-sm"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={it.qty}
                              onChange={(e) => updateItem(i, "qty", e.target.value)}
                              disabled={isSubmitting}
                              className="h-7 w-14 text-sm"
                            />
                          </TableCell>
                          <TableCell className="text-end text-sm font-medium">
                            {PKR(it.lineTotal)}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-red-500 hover:text-red-700"
                              onClick={() => removeItem(i)}
                              disabled={isSubmitting}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Running total */}
              <div className="flex justify-end pt-1">
                <div className="text-end">
                  <p className="text-xs text-gray-500">Invoice Total</p>
                  <p className="text-2xl font-bold text-gray-900">{PKR(runningTotal)}</p>
                </div>
              </div>
            </div>

            {/* Notification */}
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
                <AlertDescription className="ms-2">
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
                    <Loader2 className="w-4 h-4 me-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <ReceiptText className="w-4 h-4 me-2" />
                    {isEdit ? `Edit Invoice ${invoice.id}` : "Create Invoice"}
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
