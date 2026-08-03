import { create } from "zustand";
import { securityApi } from "@/lib/securityApi";

export const useNotificationsStore = create((set, get) => ({
  notifications: [],
  unreadCount:   0,
  loading:       false,

  fetch: async () => {
    set({ loading: true });
    try {
      const json = await securityApi.getNotifications();
      set({
        notifications: json.data        || [],
        unreadCount:   json.unreadCount ?? 0,
        loading:       false,
      });
    } catch {
      set({ loading: false });
    }
  },

  markRead: async (id) => {
    await securityApi.markRead(id).catch(() => {});
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n._id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }));
  },

  markAllRead: async () => {
    await securityApi.markAllRead().catch(() => {});
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount:   0,
    }));
  },
}));
