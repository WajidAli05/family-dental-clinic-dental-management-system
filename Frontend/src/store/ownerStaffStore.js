import { create } from "zustand";

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const useOwnerStaffStore = create((set, get) => ({
  initialized: false,

  activeTab: "directory",

  filters: {
    directory: {
      role: "all",
      status: "all",
      query: "",
    },
  },

  staff: [],

  permissions: {},

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

  seed: () => ({
    staff: [
      { id: "S-1", name: "Dr. Ahmed", role: "dentist", email: "ahmed@test.com", phone: "0301-1111111", enabled: true, commission: 30 },
      { id: "S-2", name: "Dr. Saif", role: "dentist", email: "saif@test.com", phone: "0302-2222222", enabled: true, commission: 35 },
      { id: "S-3", name: "Ayesha", role: "receptionist", email: "ayesha@test.com", phone: "0303-3333333", enabled: true },
      { id: "S-4", name: "Lab ABC", role: "lab", email: "lab@test.com", phone: "0304-4444444", enabled: true },
    ],

    permissions: {
      manage_patients: ["S-3"],
      manage_appointments: ["S-3"],
      view_billing: ["S-1", "S-2"],
      manage_lab_cases: ["S-4"],
      edit_prescriptions: ["S-1", "S-2"],
    },
  }),

  init: () => {
    if (get().initialized) return;
    const demo = get().seed();
    set({
      staff: demo.staff,
      permissions: demo.permissions,
      initialized: true,
    });
  },

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

  runConfirm: () => {
    const { confirm } = get();
    if (!confirm.onConfirmKey) return;

    const map = {
      deleteStaff: (id) => get().deleteStaff(id),
    };

    const fn = map[confirm.onConfirmKey];
    if (fn) fn(confirm.onConfirmPayload);
    get().closeConfirm();
  },

  addStaff: (data) =>
    set((state) => ({
      staff: [
        ...state.staff,
        {
          id: `S-${uid()}`,
          name: data.name.trim(),
          role: data.role,
          email: data.email,
          phone: data.phone,
          enabled: true,
          commission: Number(data.commission || 0),
        },
      ],
    })),

  updateStaff: (id, patch) =>
    set((state) => ({
      staff: state.staff.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    })),

  deleteStaff: (id) =>
    set((state) => ({
      staff: state.staff.filter((s) => s.id !== id),
    })),

  toggleAccountEnabled: (id) =>
    set((state) => ({
      staff: state.staff.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
    })),

  togglePermission: (permKey, staffId) => {
    const perms = get().permissions;
    const current = perms[permKey] || [];

    const updated = current.includes(staffId)
      ? current.filter((id) => id !== staffId)
      : [...current, staffId];

    set({
      permissions: { ...perms, [permKey]: updated },
    });
  },
}));