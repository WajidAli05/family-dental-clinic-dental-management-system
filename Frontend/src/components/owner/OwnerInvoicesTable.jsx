import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { useFormatMoney } from "@/store/clinicConfigStore";
import PrintInvoiceButton from "@/components/receptionist/PrintInvoiceButton";

const STATUS_CLASS = {
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
const OwnerInvoicesTable = ({ data = [], onEdit, onDelete, scheduleNameOf }) => {
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
              return (
                <tr key={inv.id} className="hover:bg-gray-50/60 transition">
                  <td className="py-3 pe-4 font-semibold text-gray-900">{inv.id}</td>
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
                      <Button size="sm" variant="outline" onClick={() => onEdit(inv)}>
                        <Pencil className="h-4 w-4 me-2" />
                        {t("invoices.edit")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-40"
                        disabled={hasPayments}
                        title={hasPayments ? t("invoices.deleteBlockedHint") : undefined}
                        onClick={() => onDelete(inv)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
