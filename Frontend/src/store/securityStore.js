import { create } from "zustand";
import { securityApi } from "@/lib/securityApi";

export const useSecurityStore = create((set) => ({
  lockedAccounts: [],
  loading:        false,
  error:          null,

  fetchLockedAccounts: async () => {
    set({ loading: true, error: null });
    try {
      const json = await securityApi.getLockedAccounts();
      set({ lockedAccounts: json.data || [], loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  unlock: async (userId) => {
    await securityApi.unlock(userId);
    // Remove the unlocked user from the local list immediately
    set((s) => ({
      lockedAccounts: s.lockedAccounts.filter((u) => u.id !== userId),
    }));
  },
}));
