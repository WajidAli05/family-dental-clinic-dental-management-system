import StatCard from "@/components/receptionist/StatCard";
import { Boxes, AlertTriangle, XCircle } from "lucide-react";

const InventoryStats = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard
        title="Total Items"
        value={stats.totalItems}
        icon={Boxes}
      />
      <StatCard
        title="Low Stock"
        value={stats.lowStock}
        icon={AlertTriangle}
      />
      <StatCard
        title="Out of Stock"
        value={stats.outOfStock}
        icon={XCircle}
      />
    </div>
  );
};

export default InventoryStats;