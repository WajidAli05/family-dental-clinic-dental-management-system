import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30";

const Field = ({ label, children }) => (
  <div>
    <p className="text-xs font-semibold text-gray-600 mb-1">{label}</p>
    {children}
  </div>
);

const OwnerBillingFilters = ({ tab, filters, onChange, onReset, onQuickRange }) => {
  const { t } = useTranslation();
  if (tab === "labDues") return null;

  // Tabs that carry a free-text search box.
  const hasSearch = tab === "cashbook" || tab === "invoices";

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <h2 className="text-sm font-semibold text-gray-900">{t("billingFilters.title")}</h2>
          <div className="flex gap-2">
            {(tab === "cashbook" || tab === "invoices") && onQuickRange && (
              <>
                <button type="button" onClick={() => onQuickRange("today")}  className="px-3 py-1 rounded-lg text-xs border border-gray-200 hover:bg-gray-50 text-gray-600">{t("billingFilters.today")}</button>
                <button type="button" onClick={() => onQuickRange("week")}   className="px-3 py-1 rounded-lg text-xs border border-gray-200 hover:bg-gray-50 text-gray-600">{t("billingFilters.thisWeek")}</button>
                <button type="button" onClick={() => onQuickRange("month")}  className="px-3 py-1 rounded-lg text-xs border border-gray-200 hover:bg-gray-50 text-gray-600">{t("billingFilters.thisMonth")}</button>
              </>
            )}
            <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={onReset}>{t("billingFilters.reset")}</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Field label={t("billingFilters.from")}>
            <input type="date" value={filters?.from || ""} onChange={(e) => onChange("from", e.target.value)} className={inputClass} />
          </Field>
          <Field label={t("billingFilters.to")}>
            <input type="date" value={filters?.to || ""} onChange={(e) => onChange("to", e.target.value)} className={inputClass} />
          </Field>
          {hasSearch && (
            <Field label={t("billingFilters.search")}>
              <input
                type="text"
                placeholder={t("billingFilters.searchPlaceholder")}
                value={filters?.q || ""}
                onChange={(e) => onChange("q", e.target.value)}
                className={inputClass}
              />
            </Field>
          )}

          {/* Status narrows the invoice list alongside the date range. */}
          {tab === "invoices" && (
            <Field label={t("billingFilters.status")}>
              <select
                value={filters?.status || "All"}
                onChange={(e) => onChange("status", e.target.value)}
                className={inputClass}
              >
                <option value="All">{t("billingFilters.statusAll")}</option>
                <option value="Paid">{t("invoices.status.paid")}</option>
                <option value="Partial">{t("invoices.status.partial")}</option>
                <option value="Pending">{t("invoices.status.pending")}</option>
                <option value="Void">{t("invoices.status.void")}</option>
              </select>
            </Field>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default OwnerBillingFilters;
