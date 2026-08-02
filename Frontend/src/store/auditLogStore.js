import { create } from "zustand";
import { auditApi } from "@/lib/auditApi";

export const useAuditLogStore = create((set) => ({
  rows:    [],
  total:   0,
  page:    1,
  pages:   1,
  loading: false,
  error:   null,

  fetch: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const res  = await auditApi.getLogs(params);
      const data = res?.data ?? {};
      set({
        rows:  data.rows  ?? [],
        total: data.total ?? 0,
        page:  data.page  ?? 1,
        pages: data.pages ?? 1,
      });
    } catch (e) {
      set({ error: e.message, rows: [] });
    } finally {
      set({ loading: false });
    }
  },
}));
