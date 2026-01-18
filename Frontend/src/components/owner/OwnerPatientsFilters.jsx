import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Field = ({ label, children }) => (
  <div>
    <p className="text-xs font-semibold text-gray-600 mb-1">{label}</p>
    {children}
  </div>
);

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30";

const OwnerPatientsFilters = ({
  filters,
  dentists = [],
  cities = [],
  onChange,
  onReset,
}) => {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          <Button variant="outline" className="rounded-xl" onClick={onReset}>
            Reset
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Field label="Search">
            <input
              value={filters.query}
              onChange={(e) => onChange("query", e.target.value)}
              placeholder="Name, phone, ID, city, tags..."
              className={inputClass}
            />
          </Field>

          <Field label="Status">
            <select
              value={filters.status}
              onChange={(e) => onChange("status", e.target.value)}
              className={inputClass}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>

          <Field label="City">
            <select
              value={filters.city}
              onChange={(e) => onChange("city", e.target.value)}
              className={inputClass}
            >
              <option value="all">All</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Dentist">
            <select
              value={filters.dentist}
              onChange={(e) => onChange("dentist", e.target.value)}
              className={inputClass}
            >
              <option value="all">All</option>
              {dentists.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Gender">
            <select
              value={filters.gender}
              onChange={(e) => onChange("gender", e.target.value)}
              className={inputClass}
            >
              <option value="all">All</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </Field>

          <Field label="Last Visit From">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onChange("dateFrom", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Last Visit To">
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => onChange("dateTo", e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </CardContent>
    </Card>
  );
};

export default OwnerPatientsFilters;