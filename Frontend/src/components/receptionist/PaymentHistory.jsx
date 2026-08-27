import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Ban } from "lucide-react";
import { useTranslation } from "react-i18next";
import EditPaymentModal from "@/components/receptionist/EditPaymentModal";
import { useState } from "react";
import { useFormatMoney } from "@/store/clinicConfigStore";

const PaymentHistory = ({ invoice, onEdit, onDelete }) => {
  const { t } = useTranslation();
  const money = useFormatMoney();
  const [editOpen, setEditOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  if (!invoice) return null;

  const total = Number(invoice.totalAmount ?? invoice.total ?? 0) || 0;
  const paid = Number(invoice.paidAmount ?? invoice.paid ?? 0) || 0;
  const balance = Math.max(0, total - paid);
  const isVoid = !!invoice.isVoid;

  return (
    <div className="space-y-3">
      {/* Invoice meta — the detail view previously showed payments only, with
          no invoice context at all (no fee schedule, no balance). */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm space-y-1">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="font-semibold text-gray-900">{invoice.id}</span>
          {isVoid && (
            <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">
              <Ban className="h-3 w-3 me-1" />
              {t("invoices.void")}
            </span>
          )}
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">{t("invoices.feeSchedule")}</span>
          {/* Schedule names are data. Legacy invoices fall back to Default. */}
          <span className="text-gray-800">
            {invoice.feeScheduleName || t("invoices.defaultSchedule")}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">{t("invoices.colTotal")}</span>
          <span className="text-gray-800">{money(total)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">{t("invoices.colPaid")}</span>
          <span className="text-gray-800">{money(paid)}</span>
        </div>
        <div className="flex justify-between border-t border-gray-200 pt-1">
          <span className="font-semibold text-gray-600">{t("invoices.balanceDue")}</span>
          <span className={`font-bold ${balance > 0 ? "text-red-600" : "text-green-600"}`}>
            {money(balance)}
          </span>
        </div>
        {isVoid && invoice.voidReason && (
          <p className="text-xs text-red-700 border-t border-red-100 pt-1">
            {t("invoices.voidReason")}: {invoice.voidReason}
          </p>
        )}
      </div>

      {invoice.payments.length === 0 && (
        <p className="text-sm text-gray-500">{t("invoices.noPayments")}</p>
      )}

      {invoice.payments.map((p) => (
        <div
          key={p.id}
          className="flex justify-between items-center border p-3 rounded"
        >
          <div>
            <p className="font-medium">
              {money(p.amount)} — {p.mode}
            </p>
            <p className="text-sm text-gray-500">{p.date}</p>
          </div>

          <div className="flex gap-2">
            {/* EDIT */}
            <Button
              size="icon"
              variant="outline"
              onClick={() => {
                setSelectedPayment(p);
                setEditOpen(true);
              }}
            >
              <Pencil className="w-4 h-4" />
            </Button>

            {/* DELETE (NO CONFIRM HERE) */}
            <Button
              size="icon"
              variant="destructive"
              onClick={() => onDelete(p.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}

      {/* EDIT PAYMENT MODAL */}
      <EditPaymentModal
        open={editOpen}
        onOpenChange={setEditOpen}
        payment={selectedPayment}
        onSave={(amount) => {
          onEdit(selectedPayment.id, amount);
        }}
      />
    </div>
  );
};

export default PaymentHistory;