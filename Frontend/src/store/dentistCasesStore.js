import { create } from "zustand";
import { dentistApi } from "@/lib/dentistApi";

export const useDentistCasesStore = create((set, get) => ({
  loading: false,
  error: null,
  cases: [],
  pagination: { total: 0, page: 1, pages: 1 },

  fetchCases: async (params = {}) => {
    try {
      set({ loading: true, error: null });
      const res = await dentistApi.getCases(params);
      set({
        cases: res.data || [],
        pagination: { total: res.total ?? 0, page: res.page ?? 1, pages: res.pages ?? 1 },
        loading: false,
      });
    } catch (e) {
      set({ error: e.message, loading: false });
    }
  },

  approveCase: async (caseId) => {
    try {
      set({ error: null });
      await dentistApi.approveCase(caseId);
      await get().fetchCases({ status: "all" });
    } catch (e) {
      set({ error: e.message });
    }
  },
}));