// src/store/dentistFinanceStore.js
import { create } from "zustand";
import { dentistApi } from "@/lib/dentistApi";

export const useDentistFinanceStore = create((set) => ({
  loading: false,
  error: null,
  data: null,

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const res = await dentistApi.getFinance();
      set({ data: res.data || null, loading: false });
    } catch (e) {
      set({ error: e.message || "Failed to load finance data", loading: false });
    }
  },
}));
