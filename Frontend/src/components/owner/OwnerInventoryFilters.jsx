// src/components/owner/OwnerInventoryFilters.jsx
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30";

const OwnerInventoryFilters = ({ tab, filters, supplierOptions = [], onChange, onReset }) => {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          <Button variant="outline" className="rounded-xl" onClick={onReset}>
            Reset
          </Button>
        </div>

        {/* ITEMS */}
        {tab === "items" ? (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Field label="Category">
              <select value={filters.category} onChange={(e) => onChange("category", e.target.value)} className={inputClass}>
                <option value="all">All</option>
                <option value="consumables">Consumables</option>
                <option value="materials">Materials</option>
                <option value="equipment">Equipment</option>
              </select>
            </Field>

            <Field label="Stock">
              <select value={filters.stock} onChange={(e) => onChange("stock", e.target.value)} className={inputClass}>
                <option value="all">All</option>
                <option value="low">Low Stock</option>
                <option value="out">Out of Stock</option>
              </select>
            </Field>

            <Field label="Search">
              <input
                value={filters.query}
                onChange={(e) => onChange("query", e.target.value)}
                placeholder="Name, SKU..."
                className={inputClass}
              />
            </Field>
          </div>
        ) : null}

        {/* PURCHASES */}
        {tab === "purchases" ? (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Field label="From">
              <input type="date" value={filters.dateFrom} onChange={(e) => onChange("dateFrom", e.target.value)} className={inputClass} />
            </Field>

            <Field label="To">
              <input type="date" value={filters.dateTo} onChange={(e) => onChange("dateTo", e.target.value)} className={inputClass} />
            </Field>

            <Field label="Supplier">
              <select value={filters.supplierId} onChange={(e) => onChange("supplierId", e.target.value)} className={inputClass}>
                <option value="all">All</option>
                {supplierOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Search">
              <input
                value={filters.query}
                onChange={(e) => onChange("query", e.target.value)}
                placeholder="Invoice, notes..."
                className={inputClass}
              />
            </Field>
          </div>
        ) : null}

        {/* CONSUMPTION */}
        {tab === "consumption" ? (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Field label="From">
              <input type="date" value={filters.dateFrom} onChange={(e) => onChange("dateFrom", e.target.value)} className={inputClass} />
            </Field>

            <Field label="To">
              <input type="date" value={filters.dateTo} onChange={(e) => onChange("dateTo", e.target.value)} className={inputClass} />
            </Field>

            <Field label="Mode">
              <select value={filters.mode} onChange={(e) => onChange("mode", e.target.value)} className={inputClass}>
                <option value="byPeriod">By Period</option>
                <option value="byTreatment">By Procedure</option>
              </select>
            </Field>

            <Field label="Search">
              <input
                value={filters.query}
                onChange={(e) => onChange("query", e.target.value)}
                placeholder="Item, treatment..."
                className={inputClass}
              />
            </Field>
          </div>
        ) : null}
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

export default OwnerInventoryFilters;