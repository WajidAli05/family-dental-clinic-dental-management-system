import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30";

const OwnerStaffFilters = ({ filters, onChange, onReset }) => {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          <Button variant="outline" className="rounded-xl" onClick={onReset}>
            Reset
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Field label="Role">
            <select
              value={filters.role}
              onChange={(e) => onChange("role", e.target.value)}
              className={inputClass}
            >
              <option value="all">All Roles</option>
              <option value="dentist">Dentists</option>
              <option value="receptionist">Receptionists</option>
              <option value="lab">Labs</option>
            </select>
          </Field>

          <Field label="Status">
            <select
              value={filters.status}
              onChange={(e) => onChange("status", e.target.value)}
              className={inputClass}
            >
              <option value="all">All</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
          </Field>

          <Field label="Search">
            <input
              value={filters.query}
              onChange={(e) => onChange("query", e.target.value)}
              placeholder="Name, email, phone..."
              className={inputClass}
            />
          </Field>

          {/* spacer for alignment */}
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

export default OwnerStaffFilters;