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
// FIX 5: reuse the owner's stock modal rather than a second implementation —
// this codebase has repeatedly suffered from divergent per-role copies.
import UpdateStockModal from "@/components/owner/inventory/UpdateStockModal";
import InventoryAlertRibbon from "@/components/common/InventoryAlertRibbon";
import SuppliersPanel from "@/components/common/SuppliersPanel";
import PurchaseOrdersPanel from "@/components/common/PurchaseOrdersPanel";

import TablePagination from "@/components/ui/TablePagination";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { usePagination } from "@/hooks/usePagination";

const TABS = [
  { key: "items", label: "Items" },
  { key: "suppliers", label: "Suppliers" },
  { key: "purchases", label: "Purchase Orders" },
];

const Inventory = () => {
  const {
    items,
    fetchItems,
    stats: serverStats,
    fetchStats,
    suppliers,
    fetchSuppliers,
    loading,
    error,
    pagination,
    getStats,
    deleteItem,
    updateStock,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    getSupplierLedger,
    fetchPurchaseOrders,
    getPurchaseOrder,
    createPurchaseOrder,
    updatePurchaseOrderStatus,
    receivePurchaseOrder,
  } = useInventoryStore();

  const { page, limit, setPage, resetPage } = usePagination(50);
  const [query, setQuery] = useState("");
  const [stockFilter, setStockFilter] = useState("All");
  const [uiTab, setUiTab] = useState("items");

  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [stockItem, setStockItem] = useState(null);

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

  // Suppliers only need loading once — powers the Add/Edit supplier picker.
  useEffect(() => {
    if (typeof fetchSuppliers === "function") fetchSuppliers();
  }, [fetchSuppliers]);

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
      } else if (stockFilter === "Expiring") {
        matchesStock = !!i.expiryState;
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

      {/* Tabs — mirrors the owner's Inventory / Suppliers / Purchase Orders
          layout so both roles share one mental model of the module. */}
      <div className="flex gap-2 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setUiTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              uiTab === t.key
                ? "border-[#2ec4b6] text-[#2ec4b6]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {uiTab === "items" && (
        <>
          {/* FIX 6a — visible, actionable alert ribbon; click-through filters
              the table via the existing Stock Level filter. */}
          <InventoryAlertRibbon
            outOfStock={stats.outOfStock}
            lowStock={stats.lowStock}
            expiring={stats.expiring}
            onFilterOutOfStock={() => handleStockFilterChange("Out")}
            onFilterLowStock={() => handleStockFilterChange("Low")}
            onFilterExpiring={() => handleStockFilterChange("Expiring")}
          />

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
                  onUpdateStock={(item) => setStockItem(item)}
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
        </>
      )}

      {uiTab === "suppliers" && (
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <SuppliersPanel
              fetchSuppliers={fetchSuppliers}
              createSupplier={createSupplier}
              updateSupplier={updateSupplier}
              deleteSupplier={deleteSupplier}
              fetchLedger={getSupplierLedger}
              recordPayment={null}
              canRecordPayment={false}
            />
          </CardContent>
        </Card>
      )}

      {uiTab === "purchases" && (
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <PurchaseOrdersPanel
              suppliers={suppliers}
              items={items}
              fetchPurchaseOrders={fetchPurchaseOrders}
              fetchPurchaseOrder={getPurchaseOrder}
              createPurchaseOrder={createPurchaseOrder}
              updatePurchaseOrderStatus={updatePurchaseOrderStatus}
              receivePurchaseOrder={receivePurchaseOrder}
              deletePurchaseOrder={null}
              canDelete={false}
            />
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <UpdateStockModal
        open={!!stockItem}
        item={stockItem}
        onClose={() => setStockItem(null)}
        onSubmit={({ mode, qty }) => {
          if (!stockItem?.id) throw new Error("No item selected");
          return updateStock(stockItem.id, { mode, qty });
        }}
      />

      <AddInventoryModal open={addOpen} onOpenChange={setAddOpen} suppliers={suppliers} />

      <EditInventoryModal
        open={!!editItem}
        item={editItem}
        suppliers={suppliers}
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