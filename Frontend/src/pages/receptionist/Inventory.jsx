import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Wavify from "react-wavify";

import { useInventoryStore } from "@/store/inventoryStore";

import InventoryStats from "@/components/receptionist/InventoryStats";
import InventoryFilters from "@/components/receptionist/InventoryFilters";
import InventoryTable from "@/components/receptionist/InventoryTable";
import AddInventoryModal from "@/components/receptionist/AddInventoryModal";
import EditInventoryModal from "@/components/receptionist/EditInventoryModal";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";

const Inventory = () => {
  const {
    items,
    fetchItems,
    stats: serverStats,
    fetchStats,
    loading,
    error,
    getStats,
    deleteItem,
  } = useInventoryStore();

  const [query, setQuery] = useState("");
  const [stockFilter, setStockFilter] = useState("All");

  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // fetch from backend
  useEffect(() => {
    const run = async () => {
      if (typeof fetchItems === "function") {
        await fetchItems({ q: query, stockFilter });
      }
      if (typeof fetchStats === "function") {
        await fetchStats();
      }
    };
    run();
  }, [fetchItems, fetchStats, query, stockFilter]);

  // fallback local stats
  const stats = serverStats || getStats();

  // fallback local filter (still useful)
  const filtered = useMemo(() => {
    const q = String(query || "").toLowerCase();
    return (items || []).filter((i) => {
      const matchesQuery = String(i.name || "").toLowerCase().includes(q);

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
  }, [items, query, stockFilter]);

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
        <div className="relative z-10 p-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Inventory</h1>
            <p className="text-gray-500">View clinic supplies and stock levels</p>
          </div>

          <Button
            onClick={() => setAddOpen(true)}
            className="bg-[#2ec4b6] hover:bg-[#26a699]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-50 text-red-700 p-3 text-sm">{error}</div>
      ) : null}

      {loading ? (
        <div className="rounded-xl bg-white p-3 text-sm text-gray-600">Loading inventory...</div>
      ) : null}

      {/* Stats */}
      <InventoryStats stats={stats} />

      {/* Filters + Table */}
      <Card className="rounded-2xl">
        <CardContent className="p-6 space-y-4">
          <InventoryFilters
            query={query}
            setQuery={setQuery}
            stockFilter={stockFilter}
            setStockFilter={setStockFilter}
          />

          <InventoryTable
            data={filtered}
            onEdit={(item) => setEditItem(item)}
            onDelete={(item) => {
              setDeleteTarget(item);
              setConfirmOpen(true);
            }}
          />
        </CardContent>
      </Card>

      {/* Modals */}
      <AddInventoryModal open={addOpen} onOpenChange={setAddOpen} />

      <EditInventoryModal
        open={!!editItem}
        item={editItem}
        onOpenChange={(v) => {
          if (!v) setEditItem(null);
        }}
      />

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete inventory item?"
        description="This item will be permanently removed."
        onConfirm={async () => {
          if (!deleteTarget?.id) return;
          await deleteItem(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
};

export default Inventory;