// src/components/owner/OwnerInventoryFilters.jsx
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30";

/**
 * `action` is an optional slot for the tab's primary button (currently only
 * "Add Item" on the items tab). Reset + action sit in the SAME row as the
 * filter fields now (one row, per the fix) rather than a separate header row
 * above them — a Field-shaped invisible label spacer keeps their button
 * bottom-aligned with the inputs' bottom edge, matching every other cell in
 * the row. `ms-auto` (not `ml-auto`) pushes the group to the end so it mirrors
 * correctly under RTL.
 */
const OwnerInventoryFilters = ({ tab, filters, supplierOptions = [], onChange, onReset, action }) => {
  const buttonGroup = (
    <div className="flex flex-col ms-auto">
      <p aria-hidden="true" className="text-xs font-semibold mb-1 invisible select-none">Actions</p>
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" className="rounded-xl" onClick={onReset}>
          Reset
        </Button>
        {action}
      </div>
    </div>
  );

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold text-gray-900">Filters</h2>

        {/* ITEMS */}
        {tab === "items" ? (
          <div className="mt-4 flex flex-wrap items-end gap-4">
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
                <option value="expiring">Near/Expired</option>
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

            {buttonGroup}
          </div>
        ) : null}

        {/* PURCHASES */}
        {tab === "purchases" ? (
          <div className="mt-4 flex flex-wrap items-end gap-4">
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

            {buttonGroup}
          </div>
        ) : null}

        {/* CONSUMPTION */}
        {tab === "consumption" ? (
          <div className="mt-4 flex flex-wrap items-end gap-4">
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

            {buttonGroup}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

// Fixed width now that the row is flex, not grid — grid tracks used to size
// these automatically; flex needs an explicit width or each field collapses
// to its input's intrinsic minimum.
const Field = ({ label, children }) => (
  <div className="w-full sm:w-48">
    <p className="text-xs font-semibold text-gray-600 mb-1">{label}</p>
    {children}
  </div>
);

export default OwnerInventoryFilters;