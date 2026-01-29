import { create } from "zustand";
import { dentistApi } from "@/lib/dentistApi";

export const useDentistStore = create((set) => ({
  loading: false,
  error: null,
  dentists: [], // keep your UI logic intact

  fetchMe: async () => {
    try {
      set({ loading: true, error: null });
      const res = await dentistApi.getMe();
      set({ dentists: [res.data], loading: false });
    } catch (e) {
      set({ error: e.message, loading: false });
    }
  },

  updateMe: async (payload) => {
    try {
      set({ loading: true, error: null });
      const res = await dentistApi.updateMe(payload);
      set({ dentists: [res.data], loading: false });
    } catch (e) {
      set({ error: e.message, loading: false });
    }
  },

  changePassword: async ({ currentPassword, newPassword }) => {
    await dentistApi.changePassword({ currentPassword, newPassword });
  },
}));