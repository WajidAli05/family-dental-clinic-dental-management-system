import { create } from "zustand";
import { receptionistInventoryApi } from "@/lib/receptionistInventoryApi";

export const useInventoryStore = create((set, get) => ({
  items: [],
  loading: false,
  error: null,
  stats: null,
  suppliers: [],
  pagination: { total: 0, page: 1, pages: 1 },

  getStats: () => {
    const items = get().items || [];
    return {
      totalItems: items.length,
      lowStock: items.filter((i) => i.stock <= i.minStock && i.stock > 0).length,
      outOfStock: items.filter((i) => i.stock === 0).length,
      expiring: items.filter((i) => !!i.expiryState).length,
    };
  },

  fetchItems: async ({ q, stockFilter, page, limit, sortBy, sortDir } = {}) => {
    try {
      set({ loading: true, error: null });
      const params = {};
      if (q) params.q = q;
      if (stockFilter && stockFilter !== "All") params.stockFilter = stockFilter;
      if (page) params.page = page;
      if (limit) params.limit = limit;
      if (sortBy) params.sortBy = sortBy;
      if (sortDir) params.sortDir = sortDir;
      const res = await receptionistInventoryApi.list(params);
      set({
        items: res.data || [],
        pagination: { total: res.total ?? 0, page: res.page ?? 1, pages: res.pages ?? 1 },
        loading: false,
      });
      return res.data || [];
    } catch (e) {
      set({ loading: false, error: e.message });
      return [];
    }
  },

  fetchStats: async () => {
    try {
      const res = await receptionistInventoryApi.stats();
      set({ stats: res.data });
      return res.data;
    } catch (e) {
      set({ error: e.message });
      return null;
    }
  },

  // Was missing entirely — the front desk had no way to see existing
  // suppliers, so Add/Edit modals fell back to a free-text field.
  fetchSuppliers: async (params) => {
    try {
      const res = await receptionistInventoryApi.listSuppliers(params);
      set({ suppliers: Array.isArray(res.data) ? res.data : [] });
      return { rows: res.data || [], total: res.total || 0, page: res.page || 1, pages: res.pages || 1 };
    } catch {
      set({ suppliers: [] });
      return { rows: [], total: 0, page: 1, pages: 1 };
    }
  },

  createSupplier: async (body) => {
    const res = await receptionistInventoryApi.createSupplier(body);
    await get().fetchSuppliers();
    return res?.data;
  },
  updateSupplier: async (id, body) => {
    const res = await receptionistInventoryApi.updateSupplier(id, body);
    await get().fetchSuppliers();
    return res?.data;
  },
  deleteSupplier: async (id) => {
    await receptionistInventoryApi.deleteSupplier(id);
    await get().fetchSuppliers();
  },
  getSupplierLedger: async (id, params) => {
    const res = await receptionistInventoryApi.getSupplierLedger(id, params);
    return res?.data;
  },

  // ---------------- purchase orders ----------------
  purchaseOrders: [],
  fetchPurchaseOrders: async (params) => {
    const res = await receptionistInventoryApi.listPurchaseOrders(params);
    const rows = Array.isArray(res?.data) ? res.data : [];
    set({ purchaseOrders: rows });
    return { rows, total: res?.total || 0, page: res?.page || 1, pages: res?.pages || 1 };
  },
  getPurchaseOrder: async (id) => {
    const res = await receptionistInventoryApi.getPurchaseOrder(id);
    return res?.data;
  },
  createPurchaseOrder: async (body) => {
    const res = await receptionistInventoryApi.createPurchaseOrder(body);
    await get().fetchPurchaseOrders();
    return res?.data;
  },
  updatePurchaseOrderStatus: async (id, status) => {
    const res = await receptionistInventoryApi.updatePurchaseOrderStatus(id, status);
    await get().fetchPurchaseOrders();
    return res?.data;
  },
  receivePurchaseOrder: async (id, body) => {
    const res = await receptionistInventoryApi.receivePurchaseOrder(id, body);
    await Promise.all([get().fetchPurchaseOrders(), get().fetchItems()]);
    return res?.data;
  },

  createItem: async (payload) => {
    const res = await receptionistInventoryApi.create(payload);
    set((state) => ({ items: [res.data, ...(state.items || [])] }));
    return res.data;
  },

  updateItem: async (id, payload) => {
    const res = await receptionistInventoryApi.update(id, payload);
    set((state) => ({
      items: (state.items || []).map((x) => (x.id === id ? res.data : x)),
    }));
    return res.data;
  },

  // Parity with the owner's stock adjustment — same shared backend math, so
  // the resulting quantity can never diverge between the two roles.
  updateStock: async (id, { mode = "set", qty }) => {
    const res = await receptionistInventoryApi.updateStock(id, { mode, qty });
    set((state) => ({
      items: (state.items || []).map((x) => (x.id === id ? res.data : x)),
    }));
    return res.data;
  },

  deleteItem: async (id) => {
    await receptionistInventoryApi.remove(id);
    set((state) => ({ items: (state.items || []).filter((x) => x.id !== id) }));
    return true;
  },
}));