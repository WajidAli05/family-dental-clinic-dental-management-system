import { create } from "zustand";
import { dentistApi } from "@/lib/dentistApi";

export const useDentistCasesStore = create((set, get) => ({
  loading: false,
  error: null,
  cases: [],

  fetchCases: async (params = {}) => {
    try {
      set({ loading: true, error: null });
      const res = await dentistApi.getCases(params);
      set({ cases: res.data || [], loading: false });
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