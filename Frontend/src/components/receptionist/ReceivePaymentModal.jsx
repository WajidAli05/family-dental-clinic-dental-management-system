import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFormatMoney } from "@/store/clinicConfigStore";

/**
 * Records a payment against an invoice. Shared by the receptionist billing tab
 * and the owner Billing & Financials tab — there is only one payment modal.
 *
 * The remaining-balance cap here is a UX aid ONLY. The server independently
 * rejects any payment that would exceed the balance (409
 * PAYMENT_EXCEEDS_BALANCE), and that rejection is what actually protects the
 * ledger.
 */
const ReceivePaymentModal = ({ open, onOpenChange, invoice, onSubmit }) => {
  const { t } = useTranslation();
  const money = useFormatMoney();
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("Cash");

  const total = Number(invoice?.totalAmount ?? invoice?.total ?? 0) || 0;
  const paid = useMemo(() => {
    if (invoice?.paidAmount != null) return Number(invoice.paidAmount) || 0;
    if (invoice?.paid != null) return Number(invoice.paid) || 0;
    return (invoice?.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  }, [invoice]);

  const remaining = Math.max(0, total - paid);
  const isVoid = !!invoice?.isVoid;

  useEffect(() => {
    if (open) {
      // Prefill the full balance — settling in full is the common case.
      setAmount(remaining > 0 ? String(remaining) : "");
      setMode("Cash");
    }
  }, [open, remaining]);

  if (!invoice) return null;

  const numericAmount = Number(amount);
  const tooMuch = numericAmount > remaining;
  const invalid =
    isVoid || !numericAmount || numericAmount <= 0 || tooMuch || remaining <= 0;

  const handleConfirm = () => {
    if (invalid) return;
    onSubmit({
      id: `PAY-${Date.now()}`,
      amount: numericAmount,
      mode,
      date: new Date().toISOString().split("T")[0],
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="space-y-4">
        <DialogHeader>
          {/* Patient name is data — never translated. */}
          <DialogTitle>
            {t("invoices.receivePayment")} — {invoice.patientName}
          </DialogTitle>
        </DialogHeader>

        {isVoid ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {t("invoices.voidNoPayments")}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">{t("invoices.colTotal")}</span>
              <span className="font-medium">{money(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t("invoices.colPaid")}</span>
              <span className="font-medium">{money(paid)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 mt-1 pt-1">
              <span className="text-gray-600 font-semibold">{t("invoices.balanceDue")}</span>
              <span className="font-bold text-gray-900">{money(remaining)}</span>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <Label>{t("invoices.amount")}</Label>
          <Input
            type="number"
            min="0"
            max={remaining || undefined}
            step="any"
            placeholder={t("invoices.amount")}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isVoid || remaining <= 0}
          />
          {tooMuch && (
            <p className="text-sm text-red-600">
              {t("invoices.exceedsBalance", { amount: money(remaining) })}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <Label>{t("invoices.method")}</Label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="w-full border rounded-md p-2"
            disabled={isVoid || remaining <= 0}
          >
            <option>Cash</option>
            <option>Card</option>
            <option>Online</option>
          </select>
        </div>

        <Button
          onClick={handleConfirm}
          disabled={invalid}
          className="bg-[#2ec4b6] hover:bg-[#26a699]"
        >
          {t("invoices.confirmPayment")}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default ReceivePaymentModal;
