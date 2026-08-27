import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Ban } from "lucide-react";
import { useFormatMoney } from "@/store/clinicConfigStore";

/**
 * VOID an invoice — the owner's alternative to deleting one that has payments.
 *
 * Voiding keeps the invoice and every payment record intact and simply removes
 * the invoice from active revenue/outstanding. That is why it is safe where
 * deletion is not: deleting would orphan the payments and silently rewrite the
 * cashbook. The reason is required and is audit-logged.
 */
const VoidInvoiceModal = ({ open, onOpenChange, invoice, onConfirm }) => {
  const { t } = useTranslation();
  const money = useFormatMoney();
  const [reason, setReason] = useState("");

  useEffect(() => { if (open) setReason(""); }, [open]);

  if (!open || !invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <Ban className="h-5 w-5" />
            {t("invoices.voidTitle")}
          </DialogTitle>
          <DialogDescription>{t("invoices.voidSubtitle")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">{t("invoices.colInvoice")}</span>
              {/* Invoice id and patient name are data — never translated. */}
              <span className="font-semibold text-gray-900">{invoice.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t("invoices.colPatient")}</span>
              <span className="text-gray-800">{invoice.patientName || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t("invoices.colTotal")}</span>
              <span className="text-gray-800">{money(invoice.totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t("invoices.colPaid")}</span>
              <span className="text-gray-800">{money(invoice.paidAmount)}</span>
            </div>
          </div>

          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {t("invoices.voidExplainer")}
          </p>

          <div className="space-y-1">
            <Label>
              {t("invoices.voidReason")} <span className="text-red-500">*</span>
            </Label>
            <Input
              autoFocus
              value={reason}
              placeholder={t("invoices.voidReasonPlaceholder")}
              onChange={(e) => setReason(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && reason.trim()) onConfirm(reason.trim()); }}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("invoices.cancel")}
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={!reason.trim()}
              onClick={() => onConfirm(reason.trim())}
            >
              <Ban className="h-4 w-4 me-2" />
              {t("invoices.voidAction")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoidInvoiceModal;
