import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30";

const Field = ({ label, children }) => (
  <div>
    <p className="text-xs font-semibold text-gray-600 mb-1">{label}</p>
    {children}
  </div>
);

const OwnerLabFilters = ({
  tab,
  filters,
  labs = [],
  dentists = [],
  onChange,
  onReset,
}) => {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 md:p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-gray-900">Search & Filters</h3>
        <Button variant="outline" className="rounded-xl" onClick={onReset}>
          Reset
        </Button>
      </div>

      {/* Accounts */}
      {tab === "accounts" ? (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Search">
            <input
              value={filters.query}
              onChange={(e) => onChange("query", e.target.value)}
              placeholder="Lab name, email, phone, ID..."
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
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
          </Field>
        </div>
      ) : null}

      {/* Cases */}
      {tab === "cases" ? (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Field label="Search">
            <input
              value={filters.query}
              onChange={(e) => onChange("query", e.target.value)}
              placeholder="Patient, case ID, dentist, lab..."
              className={inputClass}
            />
          </Field>

          <Field label="Lab">
            <select
              value={filters.labId}
              onChange={(e) => onChange("labId", e.target.value)}
              className={inputClass}
            >
              <option value="all">All Labs</option>
              {labs.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Dentist">
            <select
              value={filters.dentistId}
              onChange={(e) => onChange("dentistId", e.target.value)}
              className={inputClass}
            >
              <option value="all">All Dentists</option>
              {dentists.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status">
            <select
              value={filters.status}
              onChange={(e) => onChange("status", e.target.value)}
              className={inputClass}
            >
              <option value="all">All</option>
              <option value="received">Received</option>
              <option value="in_progress">In Progress</option>
              <option value="ready">Ready</option>
              <option value="dispatched">Dispatched</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </Field>

          <Field label="From">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onChange("dateFrom", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="To">
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => onChange("dateTo", e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      ) : null}

      {/* Sample Types */}
      {tab === "sampleTypes" ? (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Search">
            <input
              value={filters.query}
              onChange={(e) => onChange("query", e.target.value)}
              placeholder="Name, description, ID..."
              className={inputClass}
            />
          </Field>
        </div>
      ) : null}
    </div>
  );
};

export default OwnerLabFilters;