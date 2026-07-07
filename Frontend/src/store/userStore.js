import { create } from "zustand";
import { usePermissionsStore } from "./permissionsStore";

export const useUserStore = create((set) => ({
  currentUser: JSON.parse(localStorage.getItem("user")) || null,
  token: localStorage.getItem("token") || null,
  error: null,

  login: async (email, password) => {
    try {
      const res = await fetch("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();

      if (!json.success) {
        set({ error: json.message || "Login failed" });
        return false;
      }

      const { token, user } = json.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      set({ token, currentUser: user, error: null });

      // Fetch fresh permissions immediately so the sidebar and PermissionRoute
      // reflect the current DB state without needing a hard refresh.
      usePermissionsStore.getState().fetchMyPermissions();

      return true;
    } catch {
      set({ error: "Server unreachable" });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ token: null, currentUser: null, error: null });
    // Clear stale permissions so they don't leak into the next login session.
    usePermissionsStore.getState().reset();
  },
}));