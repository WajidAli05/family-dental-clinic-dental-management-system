import { useState } from "react";
import { AlertTriangle, PackageX, CalendarClock, X } from "lucide-react";

/**
 * FIX 6a — a critical stock/expiry threshold shouldn't produce a buried
 * alert; it should be visible and actionable. Shared by owner + receptionist
 * (one component, not a per-role copy) — each page passes its own counts and
 * its own filter callbacks, since the two pages keep different filter-state
 * shapes.
 *
 * Dismissible for the current page view only (not persisted) — a real new
 * crisis on the next load should never stay hidden because of a stale
 * dismissal from days ago.
 */
const Segment = ({ icon: Icon, count, label, onClick, tone }) => {
  if (!count) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${tone} ${
        onClick ? "cursor-pointer hover:opacity-80" : "cursor-default"
      }`}
    >
      <Icon className="h-4 w-4" />
      {count} {label}
    </button>
  );
};

const InventoryAlertRibbon = ({
  outOfStock = 0,
  lowStock = 0,
  expiring = 0,
  onFilterOutOfStock,
  onFilterLowStock,
  onFilterExpiring,
}) => {
  const [dismissed, setDismissed] = useState(false);

  const total = outOfStock + lowStock + expiring;
  if (dismissed || total === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
        <Segment
          icon={PackageX}
          count={outOfStock}
          label={outOfStock === 1 ? "item out of stock" : "items out of stock"}
          onClick={onFilterOutOfStock}
          tone="bg-red-100 text-red-800"
        />
        <Segment
          icon={AlertTriangle}
          count={lowStock}
          label={lowStock === 1 ? "item low on stock" : "items low on stock"}
          onClick={onFilterLowStock}
          tone="bg-amber-100 text-amber-800"
        />
        <Segment
          icon={CalendarClock}
          count={expiring}
          label={expiring === 1 ? "item near/expired" : "items near/expired"}
          onClick={onFilterExpiring}
          tone="bg-orange-100 text-orange-800"
        />
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="text-amber-600 hover:text-amber-800 shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default InventoryAlertRibbon;
