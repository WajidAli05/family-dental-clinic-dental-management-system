import { create } from "zustand";

const defaultFilters = {
  items: { category: "all", stock: "all", query: "" },
  suppliers: { query: "" },
  purchases: { dateFrom: "", dateTo: "", supplierId: "all", query: "" },
  consumption: { dateFrom: "", dateTo: "", mode: "byPeriod", query: "" },
};

export const useOwnerInventoryStore = create((set, get) => ({
  initialized: false,
  activeTab: "items",

  filters: { ...defaultFilters },

  items: [],
  suppliers: [],
  purchases: [],
  consumption: [],

  seed: () => ({
    items: [
      { id: "IT-1", sku: "GLV-S", name: "Gloves (Small)", category: "consumables", unit: "box", qty: 4, reorderLevel: 5, unitCost: 900 },
      { id: "IT-2", sku: "MSK", name: "Surgical Masks", category: "consumables", unit: "box", qty: 0, reorderLevel: 6, unitCost: 650 },
      { id: "IT-3", sku: "CMP-F", name: "Composite (Filtek)", category: "materials", unit: "tube", qty: 7, reorderLevel: 3, unitCost: 2200 },
      { id: "IT-4", sku: "ANES", name: "Local Anesthetic", category: "materials", unit: "vial", qty: 2, reorderLevel: 4, unitCost: 1200 },
      { id: "IT-5", sku: "SCAL-TIP", name: "Scaler Tips", category: "equipment", unit: "piece", qty: 10, reorderLevel: 3, unitCost: 800 },
    ],
    suppliers: [
      { id: "SUP-1", name: "Dental Traders PK", phone: "051-8888888", email: "sales@dentaltraders.pk", address: "Saddar, Rawalpindi" },
      { id: "SUP-2", name: "Med Supplies", phone: "051-7777777", email: "info@medsupplies.pk", address: "6th Road, Rawalpindi" },
    ],
    purchases: [
      { id: "PO-1001", date: "2026-01-05", supplierId: "SUP-1", supplierName: "Dental Traders PK", invoiceNo: "INV-7788", total: 24500, notes: "Monthly consumables stock" },
      { id: "PO-1002", date: "2026-01-12", supplierId: "SUP-2", supplierName: "Med Supplies", invoiceNo: "INV-8812", total: 12900, notes: "Anesthetic + gloves" },
    ],
    consumption: [
      { id: "C-1", date: "2026-01-10", itemName: "Gloves (Small)", unit: "box", qtyUsed: 1, treatmentName: "Scaling & Polishing" },
      { id: "C-2", date: "2026-01-10", itemName: "Surgical Masks", unit: "box", qtyUsed: 1, treatmentName: "" },
      { id: "C-3", date: "2026-01-14", itemName: "Composite (Filtek)", unit: "tube", qtyUsed: 1, treatmentName: "Filling" },
      { id: "C-4", date: "2026-01-16", itemName: "Local Anesthetic", unit: "vial", qtyUsed: 1, treatmentName: "Extraction" },
    ],
  }),

  init: () => {
    if (get().initialized) return;
    const demo = get().seed();
    set({
      items: demo.items,
      suppliers: demo.suppliers,
      purchases: demo.purchases,
      consumption: demo.consumption,
      initialized: true,
    });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  setFilter: (section, key, value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [section]: { ...state.filters[section], [key]: value },
      },
    })),

  resetFilters: (section) =>
    set((state) => ({
      filters: { ...state.filters, [section]: { ...defaultFilters[section] } },
    })),
}));