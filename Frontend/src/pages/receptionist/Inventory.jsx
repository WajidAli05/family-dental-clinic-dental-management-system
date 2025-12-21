import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Wavify from "react-wavify";

import { useInventoryStore } from "@/store/inventoryStore";

import InventoryStats from "@/components/receptionist/InventoryStats";
import InventoryFilters from "@/components/receptionist/InventoryFilters";
import InventoryTable from "@/components/receptionist/InventoryTable";

const Inventory = () => {
  const { items, getStats } = useInventoryStore();
  const stats = getStats();

  const [query, setQuery] = useState("");
  const [stockFilter, setStockFilter] = useState("All");

const filtered = items.filter((i) => {
  const matchesQuery = i.name
    .toLowerCase()
    .includes(query.toLowerCase());

  let matchesStock = true;

  if (stockFilter === "Low") {
    matchesStock = i.stock <= i.minStock && i.stock > 0;
  } else if (stockFilter === "Out") {
    matchesStock = i.stock === 0;
  } else if (stockFilter === "InStock") {
    matchesStock = i.stock > i.minStock;
  }

  return matchesQuery && matchesStock;
});
  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-white">
        <Wavify
          fill="#2ec4b6"
          paused={false}
          options={{ height: 20, amplitude: 30, speed: 0.15, points: 3 }}
          className="absolute bottom-0 left-0 w-full opacity-20"
        />
        <div className="relative z-10 p-6">
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-gray-500">
            View clinic supplies and stock levels
          </p>
        </div>
      </div>

      {/* Stats */}
      <InventoryStats stats={stats} />

      {/* Table */}
      <Card className="rounded-2xl">
        <CardContent className="p-6 space-y-4">
        <InventoryFilters
          query={query}
          setQuery={setQuery}
          stockFilter={stockFilter}
          setStockFilter={setStockFilter}
        />

          <InventoryTable data={filtered} />
        </CardContent>
      </Card>
    </div>
  );
};

export default Inventory;