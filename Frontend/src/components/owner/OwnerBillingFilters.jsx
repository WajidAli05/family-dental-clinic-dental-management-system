import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30";

const OwnerBillingFilters = ({ tab, filters, dentists, onChange, onReset }) => {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          <Button variant="outline" className="rounded-xl" onClick={onReset}>
            Reset
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {(tab === "cashbook" || tab === "revenue") && (
            <>
              <Field label="From">
                <input
                  type="date"
                  value={filters.dateFrom || ""}
                  onChange={(e) => onChange("dateFrom", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="To">
                <input
                  type="date"
                  value={filters.dateTo || ""}
                  onChange={(e) => onChange("dateTo", e.target.value)}
                  className={inputClass}
                />
              </Field>
            </>
          )}

          {(tab === "revenue" || tab === "commissions") && (
            <Field label="Dentist">
              <select
                value={filters.dentistId || "all"}
                onChange={(e) => onChange("dentistId", e.target.value)}
                className={inputClass}
              >
                <option value="all">All Dentists</option>
                {dentists?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {(tab === "commissions" || tab === "labDues") && (
            <Field label="Month">
              <input
                type="month"
                value={filters.month || ""}
                onChange={(e) => onChange("month", e.target.value)}
                className={inputClass}
              />
            </Field>
          )}

          {/* Optional extra filter input to keep layout consistent */}
          <Field label=" ">
            <div className="hidden md:block" />
          </Field>
        </div>
      </CardContent>
    </Card>
  );
};

const Field = ({ label, children }) => (
  <div>
    <p className="text-xs font-semibold text-gray-600 mb-1">{label}</p>
    {children}
  </div>
);

export default OwnerBillingFilters;