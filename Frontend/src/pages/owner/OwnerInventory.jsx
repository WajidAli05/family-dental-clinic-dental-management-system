import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

import OwnerPageHeader from "@/components/owner/OwnerPageHeader";
import OwnerInventoryFilters from "@/components/owner/OwnerInventoryFilters";

import OwnerInventoryStats from "@/components/owner/inventory/OwnerInventoryStats";
import LowStockAlerts from "@/components/owner/inventory/LowStockAlerts";
import InventoryItemsTable from "@/components/owner/inventory/InventoryItemsTable";

import UpdateStockModal from "@/components/owner/inventory/UpdateStockModal";
import EditItemModal from "@/components/owner/inventory/EditItemModal";
import DeleteConfirmDialog from "@/components/owner/inventory/DeleteConfirmDialog";

import { useOwnerInventoryStore } from "@/store/ownerInventoryStore";

const OwnerInventory = () => {
  const setActiveTab = useOwnerInventoryStore((s) => s.setActiveTab);
  const activeTab = "items"; // ✅ owner always uses items

  const filters = useOwnerInventoryStore((s) => s.filters);
  const setFilter = useOwnerInventoryStore((s) => s.setFilter);
  const resetFilters = useOwnerInventoryStore((s) => s.resetFilters);

  const items = useOwnerInventoryStore((s) => s.items);
  const suppliers = useOwnerInventoryStore((s) => s.suppliers);

  const openStockModal = useOwnerInventoryStore((s) => s.openStockModal);
  const closeStockModal = useOwnerInventoryStore((s) => s.closeStockModal);
  const stockModal = useOwnerInventoryStore((s) => s.stockModal);
  const updateStock = useOwnerInventoryStore((s) => s.updateStock);

  const updateItem = useOwnerInventoryStore((s) => s.updateItem);
  const deleteItem = useOwnerInventoryStore((s) => s.deleteItem);

  useEffect(() => {
    // ✅ ensure store is initialized and force items as active
    useOwnerInventoryStore.getState().init?.();
    setActiveTab?.("items");
  }, [setActiveTab]);

  // Supplier options for filter dropdown (keep: you said keep supplier column + filter)
  const supplierOptions = useMemo(
    () => (suppliers || []).map((s) => ({ id: s.id, name: s.name })),
    [suppliers]
  );

  // ---------- derived items dataset ----------
  const itemsData = useMemo(() => {
    const f = filters?.items || {};
    const q = String(f.query || "").trim().toLowerCase();

    const category = f.category || "all";
    const stock = f.stock || "all";
    const supplierId = f.supplierId || "all";

    // items store supplier as supplier NAME string (not supplierId)
    const selectedSupplierName =
      supplierId === "all" ? "" : (suppliers || []).find((s) => s.id === supplierId)?.name || "";

    return (items || []).filter((x) => {
      if (category !== "all" && x.category !== category) return false;

      const qty = Number(x.qty || 0);
      const reorder = Number(x.reorderLevel || 0);

      if (stock === "low" && !(qty <= reorder && qty > 0)) return false;
      if (stock === "out" && qty !== 0) return false;

      if (selectedSupplierName && String(x.supplier || "") !== selectedSupplierName) return false;

      if (q) {
        const hay = `${x.sku || ""} ${x.name || ""} ${x.category || ""} ${x.unit || ""} ${x.supplier || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [items, suppliers, filters?.items]);

  // ---------- stats ----------
  const stats = useMemo(() => {
    const list = items || [];
    const low = list.filter(
      (i) => Number(i.qty || 0) <= Number(i.reorderLevel || 0) && Number(i.qty || 0) > 0
    ).length;
    const out = list.filter((i) => Number(i.qty || 0) === 0).length;
    const totalValue = list.reduce((sum, i) => sum + Number(i.qty || 0) * Number(i.unitCost || 0), 0);

    return {
      lowStockCount: low,
      outOfStockCount: out,
      inventoryValue: Math.round(totalValue),
      purchasesTotal: 0, // ✅ not used anymore, but component expects it
    };
  }, [items]);

  const lowStockList = useMemo(
    () =>
      (items || [])
        .filter((i) => Number(i.qty || 0) <= Number(i.reorderLevel || 0))
        .sort((a, b) => Number(a.qty || 0) - Number(b.qty || 0)),
    [items]
  );

  // ---------- local UI state ----------
  const [editOpen, setEditOpen] = useState(false);
  const [editItemRow, setEditItemRow] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Inventory"
        subtitle="Owner visibility: low stock and item management"
      />

      {/* ✅ Stats cards below header */}
      <OwnerInventoryStats stats={stats} />

      {lowStockList.length ? <LowStockAlerts data={lowStockList.slice(0, 6)} /> : null}

      {/* ✅ Filters (items only) */}
      <OwnerInventoryFilters
        tab={activeTab}
        filters={filters?.items || {}}
        supplierOptions={supplierOptions}
        onChange={(key, value) => setFilter("items", key, value)}
        onReset={() => resetFilters("items")}
      />

      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <InventoryItemsTable
            data={itemsData}
            onUpdateStock={(item) => openStockModal(item)}
            onEdit={(item) => {
              setEditItemRow(item);
              setEditOpen(true);
            }}
            onDelete={(item) => {
              setDeleteRow(item);
              setDeleteOpen(true);
            }}
          />
        </CardContent>
      </Card>

      {/* Stock modal */}
      <UpdateStockModal
        open={stockModal?.open}
        item={stockModal?.payload}
        onClose={closeStockModal}
        onSubmit={async ({ mode, qty }) => {
          if (!stockModal?.payload?.id) return;
          await updateStock(stockModal.payload.id, { mode, qty });
          closeStockModal();
        }}
      />

      {/* Edit item modal */}
      <EditItemModal
        open={editOpen}
        item={editItemRow}
        supplierOptions={supplierOptions}
        loading={editSaving}
        onClose={() => {
          setEditOpen(false);
          setEditItemRow(null);
        }}
        onSubmit={async (patch) => {
          if (!editItemRow?.id) return;
          setEditSaving(true);
          try {
            await updateItem(editItemRow.id, patch);
            setEditOpen(false);
            setEditItemRow(null);
          } finally {
            setEditSaving(false);
          }
        }}
      />

      {/* Custom delete confirm */}
      <DeleteConfirmDialog
        open={deleteOpen}
        title="Delete inventory item?"
        description={
          deleteRow?.name
            ? `This will permanently delete "${deleteRow.name}". This cannot be undone.`
            : "This item will be permanently deleted. This cannot be undone."
        }
        loading={deleteLoading}
        onCancel={() => {
          setDeleteOpen(false);
          setDeleteRow(null);
        }}
        onConfirm={async () => {
          if (!deleteRow?.id) return;
          setDeleteLoading(true);
          try {
            await deleteItem(deleteRow.id);
            setDeleteOpen(false);
            setDeleteRow(null);
          } finally {
            setDeleteLoading(false);
          }
        }}
      />
    </div>
  );
};

export default OwnerInventory;