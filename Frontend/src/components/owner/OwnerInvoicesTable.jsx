import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Ban, Wallet, RotateCcw } from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFormatMoney } from "@/store/clinicConfigStore";
import PrintInvoiceButton from "@/components/receptionist/PrintInvoiceButton";

const STATUS_CLASS = {
  Void: "bg-gray-200 text-gray-700 border-gray-300",
  Paid: "bg-green-100 text-green-700 border-green-200",
  Partial: "bg-amber-100 text-amber-700 border-amber-200",
  Pending: "bg-red-100 text-red-700 border-red-200",
};

/**
 * Owner invoice list with edit / soft-delete / itemised PDF.
 *
 * Delete is blocked server-side once payments exist (soft-deleting would drop
 * that money out of the billing aggregates), so the button is disabled here
 * too rather than offering an action that will 409.
 */
/**
 * A disabled <button> fires no pointer events, so a tooltip attached to it
 * never opens. The trigger is therefore a focusable <span> WRAPPING the button
 * — the span stays enabled and receives the hover/focus that opens the tip.
 */
const HintWrap = ({ hint, children }) => {
  if (!hint) return children;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* inline-flex keeps the button's own layout; tabIndex makes the
              hint reachable by keyboard too. */}
          <span tabIndex={0} className="inline-flex cursor-not-allowed">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px] text-center">
          {hint}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const OwnerInvoicesTable = ({ data = [], onEdit, onDelete, onVoid, onRestore, onPay, scheduleNameOf }) => {
  const { t } = useTranslation();
  const money = useFormatMoney();

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-start text-gray-500 border-b border-gray-100">
            <th className="py-3 pe-4 text-start">{t("invoices.colInvoice")}</th>
            <th className="py-3 pe-4 text-start">{t("invoices.colPatient")}</th>
            <th className="py-3 pe-4 text-start">{t("invoices.colDate")}</th>
            <th className="py-3 pe-4 text-start">{t("invoices.colSchedule")}</th>
            <th className="py-3 pe-4 text-end">{t("invoices.colTotal")}</th>
            <th className="py-3 pe-4 text-end">{t("invoices.colPaid")}</th>
            <th className="py-3 pe-4 text-start">{t("invoices.colStatus")}</th>
            <th className="py-3 text-end">{t("invoices.colActions")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-8 text-center text-gray-500">
                {t("invoices.empty")}
              </td>
            </tr>
          ) : (
            data.map((inv) => {
              const hasPayments = Number(inv.paidAmount) > 0;
              const isVoid = !!inv.isVoid;
              const settled = Number(inv.paidAmount) >= Number(inv.totalAmount);
              return (
                <tr key={inv.id} className="hover:bg-gray-50/60 transition">
                  <td className="py-3 pe-4 font-semibold text-gray-900">
                    {inv.id}
                    {isVoid && (
                      <span className="ms-2 inline-flex items-center rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                        <Ban className="h-2.5 w-2.5 me-0.5" />
                        {t("invoices.void")}
                      </span>
                    )}
                    {isVoid && inv.voidReason && (
                      <div className="text-[11px] font-normal text-gray-500 mt-0.5">{inv.voidReason}</div>
                    )}
                  </td>
                  <td className="py-3 pe-4">
                    {/* Patient data is never translated. */}
                    <div className="text-gray-900">{inv.patientName || "—"}</div>
                    <div className="text-xs text-gray-500">{inv.patientId || ""}</div>
                  </td>
                  <td className="py-3 pe-4 text-gray-700">{inv.date}</td>
                  <td className="py-3 pe-4 text-gray-600">
                    {scheduleNameOf?.(inv.feeScheduleId) || t("invoices.defaultSchedule")}
                  </td>
                  <td className="py-3 pe-4 text-end font-semibold text-gray-900 whitespace-nowrap">
                    {money(inv.totalAmount)}
                  </td>
                  <td className="py-3 pe-4 text-end text-gray-700 whitespace-nowrap">
                    {money(inv.paidAmount)}
                  </td>
                  <td className="py-3 pe-4">
                    <span
                      className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                        STATUS_CLASS[inv.status] || STATUS_CLASS.Pending
                      }`}
                    >
                      {t(`invoices.status.${String(inv.status || "Pending").toLowerCase()}`)}
                    </span>
                  </td>
                  <td className="py-3 text-end">
                    <div className="inline-flex gap-2">
                      <PrintInvoiceButton invoice={inv} />

                      {/* Payments: owner parity with the receptionist. */}
                      <HintWrap
                        hint={
                          isVoid ? t("invoices.voidNoPayments")
                            : settled ? t("invoices.alreadySettled")
                            : ""
                        }
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          className="disabled:pointer-events-none"
                          disabled={isVoid || settled}
                          onClick={() => onPay(inv)}
                        >
                          <Wallet className="h-4 w-4 me-2" />
                          {t("invoices.pay")}
                        </Button>
                      </HintWrap>

                      <HintWrap hint={isVoid ? t("invoices.editVoidHint") : ""}>
                        <Button
                          size="sm" variant="outline"
                          className="disabled:pointer-events-none"
                          disabled={isVoid}
                          onClick={() => onEdit(inv)}
                        >
                          <Pencil className="h-4 w-4 me-2" />
                          {t("invoices.edit")}
                        </Button>
                      </HintWrap>

                      {/* Un-void: puts the invoice back into active revenue
                          with its status re-derived from its payments. */}
                      {isVoid && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          onClick={() => onRestore(inv)}
                        >
                          <RotateCcw className="h-4 w-4 me-2" />
                          {t("invoices.restoreAction")}
                        </Button>
                      )}

                      {/* VOID is the correct retirement for a PAID invoice —
                          it keeps the record and the payments. */}
                      {!isVoid && hasPayments && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-amber-700 border-amber-200 hover:bg-amber-50"
                          onClick={() => onVoid(inv)}
                        >
                          <Ban className="h-4 w-4 me-2" />
                          {t("invoices.voidAction")}
                        </Button>
                      )}

                      <HintWrap
                        hint={
                          hasPayments ? t("invoices.deleteBlockedHint")
                            : isVoid ? t("invoices.deleteVoidHint")
                            : ""
                        }
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-40 disabled:pointer-events-none"
                          disabled={hasPayments || isVoid}
                          onClick={() => onDelete(inv)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </HintWrap>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default OwnerInvoicesTable;
