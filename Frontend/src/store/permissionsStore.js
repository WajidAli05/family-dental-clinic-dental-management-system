import { create } from "zustand";
import { permissionsApi } from "@/lib/permissionsApi";

export const usePermissionsStore = create((set, get) => ({
  // ✅ existing (keep)
  permissions: {
    owner: {
      patients: {
        canDelete: false,
      },
    },
  },
  canOwnerDeletePatients: () => false,

  // ✅ NEW (additive)
  rolePermissions: null,     // { key: { dentist: bool, receptionist: bool } }
  role: null,               // "dentist" | "receptionist" | ...
  loading: false,
  error: null,

  fetchMyPermissions: async () => {
    try {
      set({ loading: true, error: null });
      const res = await permissionsApi.getMy();
      set({
        rolePermissions: res?.data?.permissions || {},
        role: res?.data?.role || null,
        loading: false,
      });
      return true;
    } catch (e) {
      set({ loading: false, error: e.message || "Failed to load permissions" });
      return false;
    }
  },

  canAccessTab: (permKey) => {
    const role = get().role || JSON.parse(localStorage.getItem("user") || "null")?.role;
    const permissions = get().rolePermissions;

    // fail-open while not loaded (prevents breaking existing flows)
    if (!permKey || !permissions) return true;

    const row = permissions[permKey];
    if (!row || typeof row !== "object") return true;

    if (role === "receptionist") return !!row.receptionist;
    if (role === "dentist") return !!row.dentist;
    return true;
  },
}));