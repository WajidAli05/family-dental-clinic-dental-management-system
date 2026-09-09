// src/store/ownerInventoryStore.js
import { create } from "zustand";
import { ownerApi } from "@/lib/ownerApi";

const defaultFilters = {
  items: { category: "all", stock: "all", supplierId: "all", query: "" },
  suppliers: { query: "" }, // keep (shared), even if owner UI hides tab
  purchases: { dateFrom: "", dateTo: "", supplierId: "all", query: "" },
  consumption: { dateFrom: "", dateTo: "", mode: "byPeriod", query: "" },
};

export const useOwnerInventoryStore = create((set, get) => ({
  initialized: false,
  loading: false,

  activeTab: "items",
  filters: { ...defaultFilters },

  items: [],
  suppliers: [],
  purchases: [],
  consumption: [],

  // modal state
  itemModal: { open: false, mode: "create", payload: null }, // create/edit item
  stockModal: { open: false, payload: null }, // update stock
  purchaseModal: { open: false, purchaseId: null, data: null, loading: false },

  // ---------------- init & fetch ----------------
  init: async () => {
    if (get().initialized) return;
    set({ initialized: true });
    await get().refreshAll();
  },

  refreshAll: async () => {
    set({ loading: true });
    try {
      const [itemsRes, suppliersRes, purchasesRes, consumptionRes] = await Promise.all([
        ownerApi.listInventoryItems(),
        ownerApi.listSuppliers(), // needed for supplier filter + column
        ownerApi.listPurchases(),
        ownerApi.listConsumption(),
      ]);

      set({
        items: Array.isArray(itemsRes?.data) ? itemsRes.data : [],
        suppliers: Array.isArray(suppliersRes?.data) ? suppliersRes.data : [],
        purchases: Array.isArray(purchasesRes?.data) ? purchasesRes.data : [],
        consumption: Array.isArray(consumptionRes?.data) ? consumptionRes.data : [],
      });
    } catch (e) {
      console.error("inventory refreshAll failed:", e);
      set({ items: [], suppliers: [], purchases: [], consumption: [] });
    } finally {
      set({ loading: false });
    }
  },

  fetchItems: async () => {
    try {
      const res = await ownerApi.listInventoryItems();
      set({ items: Array.isArray(res?.data) ? res.data : [] });
    } catch (e) {
      console.error("fetchItems failed", e);
      set({ items: [] });
    }
  },

  fetchPurchases: async () => {
    try {
      const res = await ownerApi.listPurchases();
      set({ purchases: Array.isArray(res?.data) ? res.data : [] });
    } catch (e) {
      console.error("fetchPurchases failed", e);
      set({ purchases: [] });
    }
  },

  // ---------------- ui ----------------
  setActiveTab: (tab) => set({ activeTab: tab }),

  setFilter: (section, key, value) =>
    set((state) => ({
      filters: { ...state.filters, [section]: { ...state.filters[section], [key]: value } },
    })),

  resetFilters: (section) =>
    set((state) => ({
      filters: { ...state.filters, [section]: { ...defaultFilters[section] } },
    })),

  // ---------------- item modals ----------------
  openCreateItem: () => set({ itemModal: { open: true, mode: "create", payload: null } }),
  openEditItem: (item) => set({ itemModal: { open: true, mode: "edit", payload: item } }),
  closeItemModal: () => set({ itemModal: { open: false, mode: "create", payload: null } }),

  openStockModal: (item) => set({ stockModal: { open: true, payload: item } }),
  closeStockModal: () => set({ stockModal: { open: false, payload: null } }),

  // ---------------- purchase modal ----------------
  openPurchaseModal: async (purchaseId) => {
    set({ purchaseModal: { open: true, purchaseId, data: null, loading: true } });
    try {
      const res = await ownerApi.getPurchaseDetails(purchaseId);
      set((s) => ({
        purchaseModal: { ...s.purchaseModal, data: res?.data || null, loading: false },
      }));
    } catch (e) {
      console.error("getPurchaseDetails failed", e);
      set((s) => ({
        purchaseModal: { ...s.purchaseModal, data: null, loading: false },
      }));
    }
  },
  closePurchaseModal: () => set({ purchaseModal: { open: false, purchaseId: null, data: null, loading: false } }),

  // ---------------- CRUD ----------------
  createItem: async (form) => {
    // ✅ DO NOT send sku — always server-generated
    const payload = {
      name: form.name,
      category: form.category,
      unit: form.unit,
      qty: Number(form.qty || 0),
      reorderLevel: Number(form.reorderLevel || 0),
      maximumStock: Number(form.maximumStock || 0),
      unitCost: Number(form.unitCost || 0),
      supplier: form.supplier || "",
      location: form.location || "",
      expiryDate: form.expiryDate || "",
      batchNumber: form.batchNumber || "",
      usedIn: Array.isArray(form.usedIn) ? form.usedIn : [],
    };
    await ownerApi.createInventoryItem(payload);
    await get().fetchItems();
  },

  updateItem: async (id, patch) => {
    // ✅ never send sku updates
    const payload = { ...patch };
    delete payload.sku;
    await ownerApi.updateInventoryItem(id, payload);
    await get().fetchItems();
  },

  deleteItem: async (id) => {
    await ownerApi.deleteInventoryItem(id);
    await get().fetchItems();
  },

  updateStock: async (id, { mode = "set", qty }) => {
    await ownerApi.updateInventoryStock(id, { mode, qty });
    await get().fetchItems();
  },

  // ---------------- suppliers ----------------
  fetchSuppliers: async (params) => {
    const res = await ownerApi.listSuppliers(params);
    set({ suppliers: Array.isArray(res?.data) ? res.data : [] });
    return { rows: res?.data || [], total: res?.total || 0, page: res?.page || 1, pages: res?.pages || 1 };
  },
  createSupplier: async (body) => {
    const res = await ownerApi.createSupplier(body);
    await get().fetchSuppliers();
    return res?.data;
  },
  updateSupplier: async (id, body) => {
    const res = await ownerApi.updateSupplier(id, body);
    await get().fetchSuppliers();
    return res?.data;
  },
  deleteSupplier: async (id) => {
    await ownerApi.deleteSupplier(id);
    await get().fetchSuppliers();
  },
  getSupplierLedger: async (id, params) => {
    const res = await ownerApi.getSupplierLedger(id, params);
    return res?.data;
  },
  recordSupplierPayment: async (id, body) => {
    const res = await ownerApi.recordSupplierPayment(id, body);
    return res?.data;
  },

  // ---------------- purchase orders ----------------
  fetchPurchaseOrders: async (params) => {
    const res = await ownerApi.listPurchases(params);
    const rows = Array.isArray(res?.data) ? res.data : [];
    set({ purchases: rows });
    return { rows, total: res?.total || 0, page: res?.page || 1, pages: res?.pages || 1 };
  },
  getPurchaseOrder: async (id) => {
    const res = await ownerApi.getPurchaseDetails(id);
    return res?.data;
  },
  createPurchaseOrder: async (body) => {
    const res = await ownerApi.createPurchase(body);
    await get().fetchPurchaseOrders();
    return res?.data;
  },
  updatePurchaseOrderStatus: async (id, status) => {
    const res = await ownerApi.updatePurchaseOrderStatus(id, status);
    await get().fetchPurchaseOrders();
    return res?.data;
  },
  receivePurchaseOrder: async (id, body) => {
    const res = await ownerApi.receivePurchaseOrder(id, body);
    await Promise.all([get().fetchPurchaseOrders(), get().fetchItems()]);
    return res?.data;
  },
  deletePurchaseOrder: async (id) => {
    await ownerApi.deletePurchaseOrder(id);
    await get().fetchPurchaseOrders();
  },
}));