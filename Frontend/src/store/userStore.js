import { create } from "zustand";
import { usePermissionsStore } from "./permissionsStore";
import { twoFactorApi } from "@/lib/twoFactorApi";

function finalizeLogin(set, token, user) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
  set({ token, currentUser: user, error: null, twoFactorChallenge: null });
  usePermissionsStore.getState().fetchMyPermissions();
}

export const useUserStore = create((set, get) => ({
  currentUser:        JSON.parse(localStorage.getItem("user")) || null,
  token:              localStorage.getItem("token") || null,
  error:              null,
  // Set when password is correct but 2FA code is still required
  twoFactorChallenge: null, // { challengeToken, method }

  login: async (email, password) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();

      if (!json.success) {
        set({ error: json.message || "Login failed" });
        return false;
      }

      // 2FA challenge — password was correct but code is required
      if (json.twoFactorRequired) {
        set({
          error: null,
          twoFactorChallenge: {
            challengeToken: json.challengeToken,
            method:         json.method,
          },
        });
        return "2fa_required";
      }

      finalizeLogin(set, json.data.token, json.data.user);
      return true;
    } catch {
      set({ error: "Server unreachable" });
      return false;
    }
  },

  // Complete the 2FA step after the challenge
  verify2faLogin: async (code, codeType = "totp") => {
    const challenge = get().twoFactorChallenge;
    if (!challenge) {
      set({ error: "No pending 2FA challenge" });
      return false;
    }
    try {
      const json = await twoFactorApi.verify2faLogin(challenge.challengeToken, code, codeType);
      finalizeLogin(set, json.data.token, json.data.user);
      return true;
    } catch (err) {
      set({ error: err.message || "Invalid code" });
      return false;
    }
  },

  clearTwoFactorChallenge: () => set({ twoFactorChallenge: null, error: null }),

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ token: null, currentUser: null, error: null, twoFactorChallenge: null });
    // Clear stale permissions so they don't leak into the next login session.
    usePermissionsStore.getState().reset();
  },
}));