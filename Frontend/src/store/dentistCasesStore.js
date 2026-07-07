import { create } from "zustand";
import { dentistApi } from "@/lib/dentistApi";

// Maps the UI action word to the canonical DB status stored locally
// so the optimistic update round-trips through mapBackendStatusToUiTitle correctly.
const ACTION_TO_DB = {
  approved: "approved",
  rejected: "rejected",
  reopened: "in_progress",
};

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

  updateCaseStatus: async (caseId, uiAction) => {
    const { cases } = get();
    const idx = cases.findIndex((c) => c.id === caseId);
    if (idx === -1) return;

    const oldStatus = cases[idx].status;
    const newDbStatus = ACTION_TO_DB[uiAction] ?? uiAction;

    // Optimistic update
    const optimistic = [...cases];
    optimistic[idx] = { ...optimistic[idx], status: newDbStatus };
    set({ cases: optimistic, error: null });

    try {
      await dentistApi.updateCaseStatus(caseId, uiAction);
    } catch (e) {
      // Rollback to previous status
      const rolled = [...get().cases];
      rolled[idx] = { ...rolled[idx], status: oldStatus };
      set({ cases: rolled, error: e.message });
    }
  },
}));
