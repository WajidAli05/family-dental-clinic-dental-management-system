// src/components/owner/OwnerClinicalFilters.jsx
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30";

const Field = ({ label, children }) => (
  <div>
    <p className="text-xs font-semibold text-gray-600 mb-1">{label}</p>
    {children}
  </div>
);

const OwnerClinicalFilters = ({ category, filters, onChange, onReset }) => {
  const statusOptions = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

  const placeholder =
    category === "treatments"
      ? "Search: name, code, fee, notes..."
      : category === "diagnosis"
      ? "Search: diagnosis title, description..."
      : "Search: finding title, description...";

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 md:p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-gray-900">Search & Filters</h3>
        <Button variant="outline" className="rounded-xl" onClick={onReset}>
          Reset
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Search">
          <input
            value={filters.query}
            onChange={(e) => onChange("query", e.target.value)}
            placeholder={placeholder}
            className={inputClass}
          />
        </Field>

        <Field label="Active Status">
          <select
            value={filters.status}
            onChange={(e) => onChange("status", e.target.value)}
            className={inputClass}
          >
            {statusOptions.map((x) => (
              <option key={x.value} value={x.value}>
                {x.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="flex items-end">
          <p className="text-xs text-gray-500">Tip: Keep templates consistent to help dentists chart faster.</p>
        </div>
      </div>
    </div>
  );
};

export default OwnerClinicalFilters;