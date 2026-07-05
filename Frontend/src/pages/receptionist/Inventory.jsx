import { useEffect, useMemo, useState, useCallback } from "react";
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

import TablePagination from "@/components/ui/TablePagination";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { usePagination } from "@/hooks/usePagination";

const Inventory = () => {
  const {
    items,
    fetchItems,
    stats: serverStats,
    fetchStats,
    loading,
    error,
    pagination,
    getStats,
    deleteItem,
  } = useInventoryStore();

  const { page, limit, setPage, resetPage } = usePagination(50);
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
        await fetchItems({ q: query, stockFilter, page, limit });
      }
      if (typeof fetchStats === "function") await fetchStats();
    };
    run();
  }, [fetchItems, fetchStats, query, stockFilter, page, limit]);

  const handleQueryChange = (q) => { setQuery(q); resetPage(); };
  const handleStockFilterChange = (s) => { setStockFilter(s); resetPage(); };

  // fallback local stats
  const stats = serverStats || getStats();

  // fallback local filter
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
        <div className="relative z-10 p-6">
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-gray-500">View clinic supplies and stock levels</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-50 text-red-700 p-3 text-sm">{error}</div>
      ) : null}

      <InventoryStats stats={stats} />

      <Card className="rounded-2xl">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <InventoryFilters
              query={query}
              setQuery={handleQueryChange}
              stockFilter={stockFilter}
              setStockFilter={handleStockFilterChange}
            />

            <Button
              onClick={() => setAddOpen(true)}
              className="bg-[#2ec4b6] hover:bg-[#26a699] w-full lg:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>

          {loading ? (
            <TableSkeleton rows={8} cols={5} />
          ) : (
            <InventoryTable
              data={filtered}
              onEdit={(item) => setEditItem(item)}
              onDelete={(item) => {
                setDeleteTarget(item);
                setConfirmOpen(true);
              }}
            />
          )}

          <TablePagination
            page={pagination?.page ?? page}
            pages={pagination?.pages ?? 1}
            total={pagination?.total ?? 0}
            limit={limit}
            onPage={setPage}
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