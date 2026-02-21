// src/store/ownerStaffStore.js
import { create } from "zustand";
import { ownerApi } from "@/lib/ownerApi";

const deepClone = (x) => JSON.parse(JSON.stringify(x ?? {}));

const ROLE_LABELS = {
  dentist: "Dentist",
  receptionist: "Receptionist",
  lab: "Lab",
};

const PERMISSION_KEYS = [
  // receptionist tabs
  "tab_receptionist_dashboard",
  "tab_receptionist_patients",
  "tab_receptionist_appointments",
  "tab_receptionist_lab_samples",
  "tab_receptionist_billing",
  "tab_receptionist_inventory",
  "tab_receptionist_profile",

  // dentist tabs
  "tab_dentist_dashboard",
  "tab_dentist_appointments",
  "tab_dentist_lab_samples",
  "tab_dentist_profile",
];

// permissions stored as { [permKey]: { receptionist: boolean, dentist: boolean } }
const normalizePermissions = (raw) => {
  const base = {};
  PERMISSION_KEYS.forEach((k) => (base[k] = { receptionist: false, dentist: false }));

  if (!raw || typeof raw !== "object") return base;

  // accept either:
  // A) {permKey:{receptionist:true,dentist:false}}
  // B) {permKey:["receptionist","dentist"]}
  // C) legacy: {permKey:["S-1","S-2"]} -> ignore (owner matrix no longer per-staff)
  Object.entries(raw).forEach(([k, v]) => {
    if (!base[k]) return;

    if (Array.isArray(v)) {
      base[k] = {
        receptionist: v.includes("receptionist"),
        dentist: v.includes("dentist"),
      };
      return;
    }

    if (v && typeof v === "object") {
      base[k] = {
        receptionist: !!v.receptionist,
        dentist: !!v.dentist,
      };
    }
  });

  return base;
};

export const useOwnerStaffStore = create((set, get) => ({
  initialized: false,
  loadingStaff: false,
  loadingPermissions: false,

  activeTab: "directory",

  filters: {
    directory: {
      role: "all",
      status: "all",
      query: "",
    },
  },

  staff: [],

  // editable permissions in UI
  permissions: normalizePermissions({}),
  // snapshot for change detection
  permissionsSaved: normalizePermissions({}),
  permissionsDirty: false,

  modal: {
    open: false,
    mode: "create",
    payload: null,
  },

  confirm: {
    open: false,
    title: "",
    message: "",
    onConfirmKey: null,
    onConfirmPayload: null,
  },

  // ---------- INIT / FETCH ----------
  init: async () => {
    if (get().initialized) return;
    set({ initialized: true });
    await Promise.all([get().fetchStaff(), get().fetchPermissions()]);
  },

  fetchStaff: async () => {
    set({ loadingStaff: true });
    try {
      const res = await ownerApi.listStaff();
      set({ staff: Array.isArray(res?.data) ? res.data : [] });
    } catch (e) {
      console.error("fetchStaff failed", e);
      set({ staff: [] });
    } finally {
      set({ loadingStaff: false });
    }
  },

  fetchPermissions: async () => {
    set({ loadingPermissions: true });
    try {
      const res = await ownerApi.getPermissions();
      const normalized = normalizePermissions(res?.data || {});
      set({
        permissions: normalized,
        permissionsSaved: deepClone(normalized),
        permissionsDirty: false,
      });
    } catch (e) {
      console.error("fetchPermissions failed", e);
      const normalized = normalizePermissions({});
      set({
        permissions: normalized,
        permissionsSaved: deepClone(normalized),
        permissionsDirty: false,
      });
    } finally {
      set({ loadingPermissions: false });
    }
  },

  // ---------- UI STATE ----------
  setActiveTab: (tab) => set({ activeTab: tab }),

  setFilter: (section, key, value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [section]: { ...state.filters[section], [key]: value },
      },
    })),

  resetFilters: (section) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [section]: { role: "all", status: "all", query: "" },
      },
    })),

  openCreate: () =>
    set({
      modal: { open: true, mode: "create", payload: null },
    }),

  openEdit: (payload) =>
    set({
      modal: { open: true, mode: "edit", payload },
    }),

  closeModal: () =>
    set({
      modal: { open: false, mode: "create", payload: null },
    }),

  openConfirm: ({ title, message, onConfirmKey, onConfirmPayload }) =>
    set({
      confirm: { open: true, title, message, onConfirmKey, onConfirmPayload },
    }),

  closeConfirm: () =>
    set({
      confirm: { open: false, title: "", message: "", onConfirmKey: null, onConfirmPayload: null },
    }),

  runConfirm: async () => {
    const { confirm } = get();
    if (!confirm.onConfirmKey) return;

    const map = {
      deleteStaff: async (id) => get().deleteStaff(id),
    };

    const fn = map[confirm.onConfirmKey];
    if (fn) await fn(confirm.onConfirmPayload);
    get().closeConfirm();
  },

  // ---------- CRUD (STAFF) ----------
  addStaff: async (form) => {
    // optimistic insert to avoid empty table / reload requirement
    const tempId = `TEMP-${Date.now()}`;
    const optimistic = {
      id: tempId,
      name: form.name,
      role: form.role,
      email: form.email,
      phone: form.phone,
      enabled: true,
      commission: form.role === "dentist" ? Number(form.commission || 0) : undefined,
      roleLabel: ROLE_LABELS[form.role] || form.role,
      _optimistic: true,
    };

    set((s) => ({ staff: [optimistic, ...s.staff] }));

    try {
      const res = await ownerApi.createStaff(form);
      const created = res?.data;

      // replace temp with real record
      set((s) => ({
        staff: s.staff.map((x) => (x.id === tempId ? created : x)).filter(Boolean),
      }));
    } catch (e) {
      console.error("addStaff failed", e);
      // rollback optimistic insert
      set((s) => ({ staff: s.staff.filter((x) => x.id !== tempId) }));
      throw e;
    } finally {
      // ensure consistency
      await get().fetchStaff();
    }
  },

  updateStaff: async (id, patch) => {
    // optimistic update
    set((s) => ({
      staff: s.staff.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));

    try {
      await ownerApi.updateStaff(id, patch);
    } catch (e) {
      console.error("updateStaff failed", e);
      // refetch to restore truth
      await get().fetchStaff();
      throw e;
    } finally {
      await get().fetchStaff();
    }
  },

  deleteStaff: async (id) => {
    // optimistic remove
    const prev = get().staff;
    set((s) => ({ staff: s.staff.filter((x) => x.id !== id) }));

    try {
      await ownerApi.deleteStaff(id);
    } catch (e) {
      console.error("deleteStaff failed", e);
      // rollback
      set({ staff: prev });
      throw e;
    } finally {
      await get().fetchStaff();
    }
  },

  toggleAccountEnabled: async (id) => {
    const row = get().staff.find((x) => x.id === id);
    if (!row) return;

    const next = !row.enabled;

    // optimistic
    set((s) => ({
      staff: s.staff.map((x) => (x.id === id ? { ...x, enabled: next } : x)),
    }));

    try {
      await ownerApi.toggleStaffEnabled(id, next);
    } catch (e) {
      console.error("toggleAccountEnabled failed", e);
      // revert
      set((s) => ({
        staff: s.staff.map((x) => (x.id === id ? { ...x, enabled: !next } : x)),
      }));
      throw e;
    } finally {
      await get().fetchStaff();
    }
  },

  // ---------- PERMISSIONS (ROLE MATRIX) ----------
  togglePermission: (permKey, roleKey) => {
    // roleKey: "receptionist" | "dentist"
    set((s) => {
      const next = deepClone(s.permissions);
      if (!next[permKey]) next[permKey] = { receptionist: false, dentist: false };
      next[permKey][roleKey] = !next[permKey][roleKey];

      const dirty = JSON.stringify(next) !== JSON.stringify(s.permissionsSaved);

      return { permissions: next, permissionsDirty: dirty };
    });
  },

  savePermissions: async () => {
    const { permissions, permissionsSaved } = get();
    const dirty = JSON.stringify(permissions) !== JSON.stringify(permissionsSaved);
    if (!dirty) return;

    set({ loadingPermissions: true });
    try {
      const res = await ownerApi.updatePermissions({ permissions });
      const normalized = normalizePermissions(res?.data || permissions);

      set({
        permissions: normalized,
        permissionsSaved: deepClone(normalized),
        permissionsDirty: false,
      });
    } catch (e) {
      console.error("savePermissions failed", e);
      // keep dirty state; user can retry
      throw e;
    } finally {
      set({ loadingPermissions: false });
    }
  },
}));