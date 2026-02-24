import { Card, CardContent } from "@/components/ui/card";
import { Package, AlertTriangle, DollarSign, ShoppingCart } from "lucide-react";

const StatCard = ({ icon: Icon, label, value, color }) => {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </CardContent>
    </Card>
  );
};

const OwnerInventoryStats = ({ stats }) => {
  const {
    lowStockCount = 0,
    outOfStockCount = 0,
    inventoryValue = 0,
    purchasesTotal = 0,
  } = stats || {};

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={AlertTriangle}
        label="Low Stock Items"
        value={lowStockCount}
        color="bg-yellow-500"
      />

      <StatCard
        icon={Package}
        label="Out of Stock"
        value={outOfStockCount}
        color="bg-red-500"
      />

      <StatCard
        icon={DollarSign}
        label="Inventory Value"
        value={`$${Number(inventoryValue).toLocaleString()}`}
        color="bg-emerald-500"
      />

      <StatCard
        icon={ShoppingCart}
        label="Total Purchases"
        value={`$${Number(purchasesTotal).toLocaleString()}`}
        color="bg-blue-500"
      />
    </div>
  );
};

export default OwnerInventoryStats;