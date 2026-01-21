import { useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import OwnerPageHeader from "@/components/owner/OwnerPageHeader";
import OwnerInventoryTabs from "@/components/owner/OwnerInventoryTabs";
import OwnerInventoryFilters from "@/components/owner/OwnerInventoryFilters";

import OwnerInventoryStats from "@/components/owner/inventory/OwnerInventoryStats";
import LowStockAlerts from "@/components/owner/inventory/LowStockAlerts";
import InventoryItemsTable from "@/components/owner/inventory/InventoryItemsTable";
import SuppliersTable from "@/components/owner/inventory/SuppliersTable";
import PurchasesTable from "@/components/owner/inventory/PurchasesTable";
import ConsumptionTable from "@/components/owner/inventory/ConsumptionTable";

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

  useEffect(() => {
    useOwnerInventoryStore.getState().init();
  }, []);

  // ---------- derived datasets per tab ----------
  const itemsData = useMemo(() => {
    const f = filters.items;
    const q = String(f.query || "").trim().toLowerCase();
    const category = f.category;
    const stock = f.stock; // all | low | out

    return items.filter((x) => {
      if (category !== "all" && x.category !== category) return false;

      if (stock === "low" && !(x.qty <= x.reorderLevel && x.qty > 0)) return false;
      if (stock === "out" && x.qty !== 0) return false;

      if (q) {
        const hay = `${x.sku} ${x.name} ${x.category} ${x.unit}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, filters.items]);

  const suppliersData = useMemo(() => {
    const q = String(filters.suppliers.query || "").trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s) => {
      const hay = `${s.name} ${s.phone} ${s.email} ${s.address}`.toLowerCase();
      return hay.includes(q);
    });
  }, [suppliers, filters.suppliers]);

  const purchasesData = useMemo(() => {
    const f = filters.purchases;
    const q = String(f.query || "").trim().toLowerCase();
    const supplierId = f.supplierId;
    const from = f.dateFrom ? new Date(`${f.dateFrom}T00:00:00`) : null;
    const to = f.dateTo ? new Date(`${f.dateTo}T23:59:59`) : null;

    return purchases.filter((p) => {
      const d = new Date(`${p.date}T12:00:00`);
      if (from && d < from) return false;
      if (to && d > to) return false;

      if (supplierId !== "all" && p.supplierId !== supplierId) return false;

      if (q) {
        const hay = `${p.id} ${p.supplierName} ${p.invoiceNo} ${p.notes}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [purchases, filters.purchases]);

  const consumptionData = useMemo(() => {
    const f = filters.consumption;
    const q = String(f.query || "").trim().toLowerCase();
    const mode = f.mode; // byPeriod | byTreatment
    const from = f.dateFrom ? new Date(`${f.dateFrom}T00:00:00`) : null;
    const to = f.dateTo ? new Date(`${f.dateTo}T23:59:59`) : null;

    return consumption.filter((c) => {
      const d = new Date(`${c.date}T12:00:00`);
      if (from && d < from) return false;
      if (to && d > to) return false;

      if (mode === "byTreatment" && !c.treatmentName) return false;

      if (q) {
        const hay = `${c.itemName} ${c.treatmentName || ""} ${c.unit}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [consumption, filters.consumption]);

  // ---------- header stats ----------
  const stats = useMemo(() => {
    const low = items.filter((i) => i.qty <= i.reorderLevel && i.qty > 0).length;
    const out = items.filter((i) => i.qty === 0).length;
    const totalValue = items.reduce((sum, i) => sum + i.qty * i.unitCost, 0);

    const purchasesMonth = purchases.reduce((sum, p) => sum + p.total, 0);
    const topSupplier = (() => {
      const map = new Map();
      purchases.forEach((p) => map.set(p.supplierName, (map.get(p.supplierName) || 0) + p.total));
      let best = { name: "-", total: 0 };
      map.forEach((v, k) => {
        if (v > best.total) best = { name: k, total: v };
      });
      return best.name;
    })();

    return {
      lowStockCount: low,
      outOfStockCount: out,
      inventoryValue: Math.round(totalValue),
      purchasesTotal: Math.round(purchasesMonth),
      topSupplier,
    };
  }, [items, purchases]);

  const lowStockList = useMemo(
    () => items.filter((i) => i.qty <= i.reorderLevel).sort((a, b) => a.qty - b.qty),
    [items]
  );

  const supplierOptions = useMemo(
    () => suppliers.map((s) => ({ id: s.id, name: s.name })),
    [suppliers]
  );

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Inventory"
        subtitle="Owner visibility: low stock, suppliers, purchases, and consumption insights"
      />

      <OwnerInventoryStats stats={stats} />

      {lowStockList.length ? <LowStockAlerts data={lowStockList.slice(0, 6)} /> : null}

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
          {activeTab === "items" ? <InventoryItemsTable data={itemsData} /> : null}
          {activeTab === "suppliers" ? <SuppliersTable data={suppliersData} /> : null}
          {activeTab === "purchases" ? <PurchasesTable data={purchasesData} /> : null}
          {activeTab === "consumption" ? (
            <ConsumptionTable mode={filters.consumption.mode} data={consumptionData} />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerInventory;