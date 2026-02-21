// src/store/ownerStaffStore.js
import { create } from "zustand";
import { ownerApi } from "@/lib/ownerApi";

const deepClone = (x) => JSON.parse(JSON.stringify(x || {}));
const deepEqual = (a, b) => JSON.stringify(a || {}) === JSON.stringify(b || {});

export const useOwnerStaffStore = create((set, get) => ({
  initialized: false,
  loading: false,

  activeTab: "directory",

  filters: {
    directory: { role: "all", status: "all", query: "" },
  },

  staff: [],

  // role-based permission matrix
  permissions: {}, // working copy
  savedPermissions: {}, // last saved from server

  modal: { open: false, mode: "create", payload: null },

  confirm: {
    open: false,
    title: "",
    message: "",
    onConfirmKey: null,
    onConfirmPayload: null,
  },

  // --------------------
  // init/load
  // --------------------
init: async () => {
  if (get().initialized) return;

  try {
    const [staffRes, permRes] = await Promise.all([
      ownerApi.listStaff(),
      ownerApi.getPermissions(),
    ]);

    set({
      staff: staffRes?.data || [],
      permissions: permRes?.data || {},
      initialized: true,
    });
  } catch (e) {
    console.error("ownerStaff init failed:", e);
    set({ staff: [], permissions: {}, initialized: true });
  }
},

  fetchStaff: async () => {
    const data = await ownerApi.listStaff();
    set({ staff: Array.isArray(data) ? data : [] });
  },

  fetchPermissions: async () => {
    const data = await ownerApi.getPermissions();
    const safe = data && typeof data === "object" ? data : {};
    set({ permissions: deepClone(safe), savedPermissions: deepClone(safe) });
  },

  // --------------------
  // tabs/filters
  // --------------------
  setActiveTab: (tab) => set({ activeTab: tab }),

  setFilter: (section, key, value) =>
    set((state) => ({
      filters: { ...state.filters, [section]: { ...state.filters[section], [key]: value } },
    })),

  resetFilters: (section) =>
    set((state) => ({
      filters: { ...state.filters, [section]: { role: "all", status: "all", query: "" } },
    })),

  // --------------------
  // modal
  // --------------------
  openCreate: () => set({ modal: { open: true, mode: "create", payload: null } }),
  openEdit: (payload) => set({ modal: { open: true, mode: "edit", payload } }),
  closeModal: () => set({ modal: { open: false, mode: "create", payload: null } }),

  // --------------------
  // confirm
  // --------------------
  openConfirm: ({ title, message, onConfirmKey, onConfirmPayload }) =>
    set({ confirm: { open: true, title, message, onConfirmKey, onConfirmPayload } }),

  closeConfirm: () =>
    set({
      confirm: { open: false, title: "", message: "", onConfirmKey: null, onConfirmPayload: null },
    }),

  runConfirm: async () => {
    const { confirm } = get();
    if (!confirm.onConfirmKey) return;

    const map = {
      deleteStaff: async (id) => {
        await ownerApi.deleteStaff(id);
        await get().fetchStaff();
      },
    };

    const fn = map[confirm.onConfirmKey];
    try {
      if (fn) await fn(confirm.onConfirmPayload);
    } finally {
      get().closeConfirm();
    }
  },

  // --------------------
  // staff CRUD
  // --------------------
  addStaff: async (data) => {
    await ownerApi.createStaff(data);
    await get().fetchStaff();
  },

  updateStaff: async (id, patch) => {
    await ownerApi.updateStaff(id, patch);
    await get().fetchStaff();
  },

  toggleAccountEnabled: async (publicId) => {
    const s = get().staff.find((x) => x.id === publicId);
    if (!s) return;
    await ownerApi.setStaffEnabled(publicId, !s.enabled);
    await get().fetchStaff();
  },

  // --------------------
  // permissions
  // --------------------
  togglePermission: (permKey, roleKey) => {
    // roleKey: "receptionist" | "dentist"
    set((state) => {
      const next = deepClone(state.permissions);
      const row = next[permKey] || { receptionist: false, dentist: false };
      row[roleKey] = !row[roleKey];
      next[permKey] = row;
      return { permissions: next };
    });
  },

  permissionsDirty: () => !deepEqual(get().permissions, get().savedPermissions),

  savePermissions: async () => {
    const perms = get().permissions;
    const saved = await ownerApi.updatePermissions(perms);
    set({ permissions: deepClone(saved), savedPermissions: deepClone(saved) });
  },
}));