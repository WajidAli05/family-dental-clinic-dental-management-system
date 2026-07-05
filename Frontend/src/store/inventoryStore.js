import { create } from "zustand";
import { receptionistInventoryApi } from "@/lib/receptionistInventoryApi";

export const useInventoryStore = create((set, get) => ({
  items: [],
  loading: false,
  error: null,
  stats: null,
  pagination: { total: 0, page: 1, pages: 1 },

  getStats: () => {
    const items = get().items || [];
    return {
      totalItems: items.length,
      lowStock: items.filter((i) => i.stock <= i.minStock && i.stock > 0).length,
      outOfStock: items.filter((i) => i.stock === 0).length,
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

  deleteItem: async (id) => {
    await receptionistInventoryApi.remove(id);
    set((state) => ({ items: (state.items || []).filter((x) => x.id !== id) }));
    return true;
  },
}));