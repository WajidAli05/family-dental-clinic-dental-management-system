import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Package, Wallet, Truck } from "lucide-react";

const Stat = ({ title, value, icon: Icon }) => (
  <Card className="rounded-2xl">
    <CardContent className="p-5 flex items-center gap-3">
      <div className="h-10 w-10 rounded-2xl bg-[#2ec4b6]/10 flex items-center justify-center">
        <Icon className="h-5 w-5 text-[#2ec4b6]" />
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500">{title}</p>
        <p className="text-lg font-bold text-gray-900">{value}</p>
      </div>
    </CardContent>
  </Card>
);

const OwnerInventoryStats = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <Stat title="Low Stock Items" value={stats.lowStockCount} icon={AlertTriangle} />
      <Stat title="Out of Stock" value={stats.outOfStockCount} icon={Package} />
      <Stat title="Inventory Value (PKR)" value={`Rs. ${stats.inventoryValue.toLocaleString()}`} icon={Wallet} />
      <Stat title="Purchases Total" value={`Rs. ${stats.purchasesTotal.toLocaleString()}`} icon={Truck} />
      <Stat title="Top Supplier" value={stats.topSupplier} icon={Truck} />
    </div>
  );
};

export default OwnerInventoryStats;