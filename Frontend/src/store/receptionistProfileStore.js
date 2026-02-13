import { create } from "zustand";
import { receptionistApi } from "@/lib/receptionistApi";

export const useReceptionistProfileStore = create((set, get) => ({
  profile: {
    name: "",
    email: "",
    phone: "",
    role: "receptionist",
  },

  // optional stats (if you want later). Keeping it for UI compatibility.
  stats: null,

  loading: false,
  error: null,

  // ✅ Load current receptionist profile
  fetchProfile: async () => {
    try {
      set({ loading: true, error: null });
      const res = await receptionistApi.getMe(); // { success, data }
      set({
        profile: {
          name: res?.data?.name || "",
          email: res?.data?.email || "",
          phone: res?.data?.phone || "",
          role: res?.data?.role || "receptionist",
          id: res?.data?.publicId || res?.data?._id || "",
          original: res?.data,
        },
        loading: false,
      });
      return res?.data;
    } catch (e) {
      set({ loading: false, error: e.message || "Failed to load profile" });
      return null;
    }
  },

  // ✅ Update profile (name/email/phone)
  updateProfile: async (payload) => {
    try {
      set({ loading: true, error: null });

      const body = {
        name: payload?.name,
        email: payload?.email,
        phone: payload?.phone,
      };

      const res = await receptionistApi.updateMe(body);

      set({
        profile: {
          ...get().profile,
          name: res?.data?.name || "",
          email: res?.data?.email || "",
          phone: res?.data?.phone || "",
          original: res?.data,
        },
        loading: false,
      });

      return res?.data;
    } catch (e) {
      set({ loading: false, error: e.message || "Failed to update profile" });
      throw e;
    }
  },

  // ✅ Change password
  changePassword: async ({ currentPassword, newPassword }) => {
    try {
      set({ loading: true, error: null });

      if (!currentPassword || !newPassword) {
        throw new Error("Current password and new password are required");
      }

      await receptionistApi.changePassword({ currentPassword, newPassword });

      set({ loading: false });
      return true;
    } catch (e) {
      set({ loading: false, error: e.message || "Failed to change password" });
      throw e;
    }
  },
}));