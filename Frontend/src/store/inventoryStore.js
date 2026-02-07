import { create } from "zustand";
import { receptionistInventoryApi } from "@/lib/receptionistInventoryApi";

export const useInventoryStore = create((set, get) => ({
  items: [],
  loading: false,
  error: null,
  stats: null,

  getStats: () => {
    const items = get().items || [];
    return {
      totalItems: items.length,
      lowStock: items.filter((i) => i.stock <= i.minStock && i.stock > 0).length,
      outOfStock: items.filter((i) => i.stock === 0).length,
    };
  },

  fetchItems: async ({ q, stockFilter } = {}) => {
    try {
      set({ loading: true, error: null });
      const res = await receptionistInventoryApi.list({
        q,
        stockFilter: stockFilter && stockFilter !== "All" ? stockFilter : undefined,
      });
      set({ items: res.data || [], loading: false });
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