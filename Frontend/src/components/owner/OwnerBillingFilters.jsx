import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30";

const Field = ({ label, children }) => (
  <div>
    <p className="text-xs font-semibold text-gray-600 mb-1">{label}</p>
    {children}
  </div>
);

const OwnerBillingFilters = ({ tab, filters, onChange, onReset, onQuickRange }) => {
  if (tab === "labDues") return null;

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Filters</h2>
          <div className="flex gap-2">
            {tab === "cashbook" && onQuickRange && (
              <>
                <button type="button" onClick={() => onQuickRange("today")}  className="px-3 py-1 rounded-lg text-xs border border-gray-200 hover:bg-gray-50 text-gray-600">Today</button>
                <button type="button" onClick={() => onQuickRange("week")}   className="px-3 py-1 rounded-lg text-xs border border-gray-200 hover:bg-gray-50 text-gray-600">This Week</button>
                <button type="button" onClick={() => onQuickRange("month")}  className="px-3 py-1 rounded-lg text-xs border border-gray-200 hover:bg-gray-50 text-gray-600">This Month</button>
              </>
            )}
            <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={onReset}>Reset</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Field label="From">
            <input type="date" value={filters?.from || ""} onChange={(e) => onChange("from", e.target.value)} className={inputClass} />
          </Field>
          <Field label="To">
            <input type="date" value={filters?.to || ""} onChange={(e) => onChange("to", e.target.value)} className={inputClass} />
          </Field>
          {tab === "cashbook" && (
            <Field label="Search">
              <input type="text" placeholder="Invoice, patient, dentist…" value={filters?.q || ""} onChange={(e) => onChange("q", e.target.value)} className={inputClass} />
            </Field>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default OwnerBillingFilters;
