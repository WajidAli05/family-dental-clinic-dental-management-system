import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import OwnerPageHeader from "@/components/owner/OwnerPageHeader";
import OwnerInventoryFilters from "@/components/owner/OwnerInventoryFilters";

import OwnerInventoryStats from "@/components/owner/inventory/OwnerInventoryStats";
import LowStockAlerts from "@/components/owner/inventory/LowStockAlerts";
import InventoryAlertRibbon from "@/components/common/InventoryAlertRibbon";
import InventoryItemsTable from "@/components/owner/inventory/InventoryItemsTable";

import UpdateStockModal from "@/components/owner/inventory/UpdateStockModal";
import EditItemModal from "@/components/owner/inventory/EditItemModal";
import DeleteConfirmDialog from "@/components/owner/inventory/DeleteConfirmDialog";
import SuppliersPanel from "@/components/common/SuppliersPanel";
import PurchaseOrdersPanel from "@/components/common/PurchaseOrdersPanel";

import { useOwnerInventoryStore } from "@/store/ownerInventoryStore";
import TableSkeleton from "@/components/ui/TableSkeleton";

const TABS = [
  { key: "items", label: "Items" },
  { key: "suppliers", label: "Suppliers" },
  { key: "purchases", label: "Purchase Orders" },
];

const OwnerInventory = () => {
  const setActiveTab = useOwnerInventoryStore((s) => s.setActiveTab);
  const activeTab = "items"; // ✅ owner filters always use items
  const [uiTab, setUiTab] = useState("items");

  const filters = useOwnerInventoryStore((s) => s.filters);
  const setFilter = useOwnerInventoryStore((s) => s.setFilter);
  const resetFilters = useOwnerInventoryStore((s) => s.resetFilters);

  const items = useOwnerInventoryStore((s) => s.items);
  const suppliers = useOwnerInventoryStore((s) => s.suppliers);
  const loading = useOwnerInventoryStore((s) => s.loading);

  const openStockModal = useOwnerInventoryStore((s) => s.openStockModal);
  const closeStockModal = useOwnerInventoryStore((s) => s.closeStockModal);
  const stockModal = useOwnerInventoryStore((s) => s.stockModal);
  const updateStock = useOwnerInventoryStore((s) => s.updateStock);

  const createItem = useOwnerInventoryStore((s) => s.createItem);
  const updateItem = useOwnerInventoryStore((s) => s.updateItem);
  const deleteItem = useOwnerInventoryStore((s) => s.deleteItem);

  // Suppliers + purchase orders — one shared panel component, this page just
  // hands it its own store-bound functions.
  const fetchSuppliers = useOwnerInventoryStore((s) => s.fetchSuppliers);
  const createSupplier = useOwnerInventoryStore((s) => s.createSupplier);
  const updateSupplier = useOwnerInventoryStore((s) => s.updateSupplier);
  const deleteSupplier = useOwnerInventoryStore((s) => s.deleteSupplier);
  const getSupplierLedger = useOwnerInventoryStore((s) => s.getSupplierLedger);
  const recordSupplierPayment = useOwnerInventoryStore((s) => s.recordSupplierPayment);

  const fetchPurchaseOrders = useOwnerInventoryStore((s) => s.fetchPurchaseOrders);
  const getPurchaseOrder = useOwnerInventoryStore((s) => s.getPurchaseOrder);
  const createPurchaseOrder = useOwnerInventoryStore((s) => s.createPurchaseOrder);
  const updatePurchaseOrderStatus = useOwnerInventoryStore((s) => s.updatePurchaseOrderStatus);
  const receivePurchaseOrder = useOwnerInventoryStore((s) => s.receivePurchaseOrder);
  const deletePurchaseOrder = useOwnerInventoryStore((s) => s.deletePurchaseOrder);

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
      if (stock === "expiring" && !x.expiryState) return false;

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
    const expiring = list.filter((i) => !!i.expiryState).length;
    const totalValue = list.reduce((sum, i) => sum + Number(i.qty || 0) * Number(i.unitCost || 0), 0);

    return {
      lowStockCount: low,
      outOfStockCount: out,
      expiringCount: expiring,
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
  const [editMode, setEditMode] = useState("edit"); // "edit" | "create" — BUG 1 fix
  const [editItemRow, setEditItemRow] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Inventory"
        subtitle="Owner visibility: low stock, suppliers and purchasing"
      />

      {/* Suppliers/Purchase Orders were scaffolded (activeTab/setActiveTab)
          but never built — this revives that design instead of new routes. */}
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
          {/* FIX 6a: visible, actionable alert ribbon — clicking a segment
              filters the table to those items via the existing Stock filter. */}
          <InventoryAlertRibbon
            outOfStock={stats.outOfStockCount}
            lowStock={stats.lowStockCount}
            expiring={stats.expiringCount}
            onFilterOutOfStock={() => setFilter("items", "stock", "out")}
            onFilterLowStock={() => setFilter("items", "stock", "low")}
            onFilterExpiring={() => setFilter("items", "stock", "expiring")}
          />

          {/* ✅ Stats cards below header */}
          <OwnerInventoryStats stats={stats} />

          {lowStockList.length ? <LowStockAlerts data={lowStockList.slice(0, 6)} /> : null}

          {/* ✅ Filters (items only) */}
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <OwnerInventoryFilters
              tab={activeTab}
              filters={filters?.items || {}}
              supplierOptions={supplierOptions}
              onChange={(key, value) => setFilter("items", key, value)}
              onReset={() => resetFilters("items")}
            />
            {/* BUG 1: this button — and the create-mode EditItemModal it opens —
                was entirely missing. openCreateItem/createItem already existed
                in the store, unused; the backend endpoint always worked. */}
            <Button
              className="bg-[#2ec4b6] hover:bg-[#26a699] text-white rounded-xl shrink-0"
              onClick={() => {
                setEditMode("create");
                setEditItemRow(null);
                setEditOpen(true);
              }}
            >
              <Plus className="w-4 h-4 me-1" />
              Add Item
            </Button>
          </div>

          <Card className="rounded-2xl">
            <CardContent className="p-6">
              {loading ? <TableSkeleton rows={8} cols={6} /> : (
                <InventoryItemsTable
                  data={itemsData}
                  onUpdateStock={(item) => openStockModal(item)}
                  onEdit={(item) => {
                    setEditMode("edit");
                    setEditItemRow(item);
                    setEditOpen(true);
                  }}
                  onDelete={(item) => {
                    setDeleteRow(item);
                    setDeleteOpen(true);
                  }}
                />
              )}
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
              recordPayment={recordSupplierPayment}
              canRecordPayment
            />
          </CardContent>
        </Card>
      )}

      {uiTab === "purchases" && (
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <PurchaseOrdersPanel
              suppliers={supplierOptions}
              items={items}
              fetchPurchaseOrders={fetchPurchaseOrders}
              fetchPurchaseOrder={getPurchaseOrder}
              createPurchaseOrder={createPurchaseOrder}
              updatePurchaseOrderStatus={updatePurchaseOrderStatus}
              receivePurchaseOrder={receivePurchaseOrder}
              deletePurchaseOrder={deletePurchaseOrder}
              canDelete
            />
          </CardContent>
        </Card>
      )}

      {/* Stock modal — owns its own toast/loading/close lifecycle now, so
          this just performs the update. */}
      <UpdateStockModal
        open={stockModal?.open}
        item={stockModal?.payload}
        onClose={closeStockModal}
        onSubmit={({ mode, qty }) => {
          if (!stockModal?.payload?.id) throw new Error("No item selected");
          return updateStock(stockModal.payload.id, { mode, qty });
        }}
      />

      {/* Add / Edit item modal — one component, two modes */}
      <EditItemModal
        open={editOpen}
        mode={editMode}
        item={editItemRow}
        supplierOptions={supplierOptions}
        loading={editSaving}
        onClose={() => {
          setEditOpen(false);
          setEditItemRow(null);
        }}
        onSubmit={async (patch) => {
          if (editMode === "edit" && !editItemRow?.id) return;
          setEditSaving(true);
          try {
            if (editMode === "create") {
              await createItem(patch);
              toast.success("Item created.");
            } else {
              await updateItem(editItemRow.id, patch);
              toast.success("Item updated.");
            }
            setEditOpen(false);
            setEditItemRow(null);
          } catch (e) {
            toast.error(e?.message || "Failed to save item.");
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
            toast.success("Item deleted.");
            setDeleteOpen(false);
            setDeleteRow(null);
          } catch (e) {
            toast.error(e?.message || "Failed to delete item.");
          } finally {
            setDeleteLoading(false);
          }
        }}
      />
    </div>
  );
};

export default OwnerInventory;