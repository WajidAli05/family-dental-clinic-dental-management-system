import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

import OwnerPageHeader from "@/components/owner/OwnerPageHeader";
import OwnerInventoryTabs from "@/components/owner/OwnerInventoryTabs";
import OwnerInventoryFilters from "@/components/owner/OwnerInventoryFilters";

import OwnerInventoryStats from "@/components/owner/inventory/OwnerInventoryStats";
import LowStockAlerts from "@/components/owner/inventory/LowStockAlerts";
import InventoryItemsTable from "@/components/owner/inventory/InventoryItemsTable";
import PurchasesTable from "@/components/owner/inventory/PurchasesTable";
import ConsumptionTable from "@/components/owner/inventory/ConsumptionTable";

import UpdateStockModal from "@/components/owner/inventory/UpdateStockModal";
import PurchaseDetailsModal from "@/components/owner/inventory/PurchaseDetailsModal";

import EditItemModal from "@/components/owner/inventory/EditItemModal";
import DeleteConfirmDialog from "@/components/owner/inventory/DeleteConfirmDialog";

import { useOwnerInventoryStore } from "@/store/ownerInventoryStore";

const OwnerInventory = () => {
  const activeTab = useOwnerInventoryStore((s) => s.activeTab);
  const setActiveTab = useOwnerInventoryStore((s) => s.setActiveTab);

  const filters = useOwnerInventoryStore((s) => s.filters);
  const setFilter = useOwnerInventoryStore((s) => s.setFilter);
  const resetFilters = useOwnerInventoryStore((s) => s.resetFilters);

  const items = useOwnerInventoryStore((s) => s.items);
  const suppliers = useOwnerInventoryStore((s) => s.suppliers);
  const purchases = useOwnerInventoryStore((s) => s.purchases);
  const consumption = useOwnerInventoryStore((s) => s.consumption);

  const openStockModal = useOwnerInventoryStore((s) => s.openStockModal);
  const closeStockModal = useOwnerInventoryStore((s) => s.closeStockModal);
  const stockModal = useOwnerInventoryStore((s) => s.stockModal);
  const updateStock = useOwnerInventoryStore((s) => s.updateStock);

  const openPurchaseModal = useOwnerInventoryStore((s) => s.openPurchaseModal);
  const closePurchaseModal = useOwnerInventoryStore((s) => s.closePurchaseModal);
  const purchaseModal = useOwnerInventoryStore((s) => s.purchaseModal);

  // ✅ these must exist in your store (owner inventory store)
  const updateItem = useOwnerInventoryStore((s) => s.updateItem);
  const deleteItem = useOwnerInventoryStore((s) => s.deleteItem);

  useEffect(() => {
    useOwnerInventoryStore.getState().init();
  }, []);

  // ✅ local UI state (owner-only)
  const [editOpen, setEditOpen] = useState(false);
  const [editItemRow, setEditItemRow] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Supplier options for filters (keep even though suppliers tab removed)
  const supplierOptions = useMemo(
    () => (suppliers || []).map((s) => ({ id: s.id, name: s.name })),
    [suppliers]
  );

  // ---------- derived datasets per tab ----------
  const itemsData = useMemo(() => {
    const f = filters.items || {};
    const q = String(f.query || "").trim().toLowerCase();

    const category = f.category || "all";
    const stock = f.stock || "all"; // all | low | out

    // supplierId is Supplier.publicId, but items store supplier as supplier name (string)
    const supplierId = f.supplierId || "all";
    const selectedSupplierName =
      supplierId === "all"
        ? ""
        : (suppliers || []).find((s) => s.id === supplierId)?.name || "";

    return (items || []).filter((x) => {
      if (category !== "all" && x.category !== category) return false;

      const qty = Number(x.qty || 0);
      const reorder = Number(x.reorderLevel || 0);

      if (stock === "low" && !(qty <= reorder && qty > 0)) return false;
      if (stock === "out" && qty !== 0) return false;

      if (selectedSupplierName && String(x.supplier || "") !== selectedSupplierName) return false;

      if (q) {
        const hay = `${x.sku || ""} ${x.name || ""} ${x.category || ""} ${x.unit || ""} ${
          x.supplier || ""
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [items, suppliers, filters.items]);

  const purchasesData = useMemo(() => {
    const f = filters.purchases || {};
    const q = String(f.query || "").trim().toLowerCase();
    const supplierId = f.supplierId || "all";
    const from = f.dateFrom ? new Date(`${f.dateFrom}T00:00:00`) : null;
    const to = f.dateTo ? new Date(`${f.dateTo}T23:59:59`) : null;

    return (purchases || []).filter((p) => {
      const d = new Date(`${p.date}T12:00:00`);
      if (from && d < from) return false;
      if (to && d > to) return false;

      if (supplierId !== "all" && p.supplierId !== supplierId) return false;

      if (q) {
        const hay = `${p.id || ""} ${p.supplierName || ""} ${p.invoiceNo || ""} ${p.notes || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [purchases, filters.purchases]);

  const consumptionData = useMemo(() => {
    const f = filters.consumption || {};
    const q = String(f.query || "").trim().toLowerCase();
    const mode = f.mode || "byPeriod";
    const from = f.dateFrom ? new Date(`${f.dateFrom}T00:00:00`) : null;
    const to = f.dateTo ? new Date(`${f.dateTo}T23:59:59`) : null;

    return (consumption || []).filter((c) => {
      const d = new Date(`${c.date}T12:00:00`);
      if (from && d < from) return false;
      if (to && d > to) return false;

      if (mode === "byTreatment" && !c.treatmentName) return false;

      if (q) {
        const hay = `${c.itemName || ""} ${c.treatmentName || ""} ${c.unit || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [consumption, filters.consumption]);

  // ---------- header stats ----------
  const stats = useMemo(() => {
    const list = items || [];
    const low = list.filter((i) => Number(i.qty || 0) <= Number(i.reorderLevel || 0) && Number(i.qty || 0) > 0).length;
    const out = list.filter((i) => Number(i.qty || 0) === 0).length;

    const totalValue = list.reduce((sum, i) => sum + Number(i.qty || 0) * Number(i.unitCost || 0), 0);
    const purchasesTotal = (purchases || []).reduce((sum, p) => sum + Number(p.total || 0), 0);

    return {
      lowStockCount: low,
      outOfStockCount: out,
      inventoryValue: Math.round(totalValue),
      purchasesTotal: Math.round(purchasesTotal),
    };
  }, [items, purchases]);

  const lowStockList = useMemo(
    () =>
      (items || [])
        .filter((i) => Number(i.qty || 0) <= Number(i.reorderLevel || 0))
        .sort((a, b) => Number(a.qty || 0) - Number(b.qty || 0)),
    [items]
  );

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Inventory"
        subtitle="Owner visibility: low stock, purchases, and consumption insights"
      />

      {/* ✅ Stats cards below header */}
      <OwnerInventoryStats stats={stats} />

      {lowStockList.length ? <LowStockAlerts data={lowStockList.slice(0, 6)} /> : null}

      {/* ✅ Tabs shown ONCE */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <OwnerInventoryTabs value={activeTab} onChange={setActiveTab} />
      </div>

      <OwnerInventoryFilters
        tab={activeTab}
        filters={filters[activeTab]}
        supplierOptions={supplierOptions}
        onChange={(key, value) => setFilter(activeTab, key, value)}
        onReset={() => resetFilters(activeTab)}
      />

      <Card className="rounded-2xl">
        <CardContent className="p-6">
          {activeTab === "items" ? (
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
          ) : null}

          {activeTab === "purchases" ? (
            <PurchasesTable data={purchasesData} onView={(p) => openPurchaseModal(p.id)} />
          ) : null}

          {activeTab === "consumption" ? (
            <ConsumptionTable mode={filters.consumption.mode} data={consumptionData} />
          ) : null}
        </CardContent>
      </Card>

      {/* Stock modal (existing) */}
      <UpdateStockModal
        open={stockModal.open}
        item={stockModal.payload}
        onClose={closeStockModal}
        onSubmit={async ({ mode, qty }) => {
          if (!stockModal.payload?.id) return;
          await updateStock(stockModal.payload.id, { mode, qty });
          closeStockModal();
        }}
      />

      {/* Purchase details modal (existing) */}
      <PurchaseDetailsModal
        open={purchaseModal.open}
        loading={purchaseModal.loading}
        data={purchaseModal.data}
        onClose={closePurchaseModal}
      />

      {/* ✅ Edit item modal (new) */}
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

      {/* ✅ Custom delete confirm dialog (new) */}
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