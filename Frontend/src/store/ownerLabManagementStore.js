import { create } from "zustand";

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const defaultFilters = {
  accounts: { query: "", status: "all" }, // all | enabled | disabled
  cases: {
    query: "",
    labId: "all",
    dentistId: "all",
    status: "all", // received | in_progress | ready | dispatched | delivered | cancelled
    dateFrom: "",
    dateTo: "",
  },
  sampleTypes: { query: "" },
};

export const useOwnerLabManagementStore = create((set, get) => ({
  initialized: false,
  activeTab: "accounts", // accounts | cases | sampleTypes

  // ---------- DATA ----------
  labAccounts: [],
  sampleTypes: [],
  labCases: [],

  // ---------- UI ----------
  filters: { ...defaultFilters },

  modal: { open: false, type: null, mode: "create", payload: null }, // type: labAccount | sampleType | caseDetails
  confirm: { open: false, title: "", message: "", onConfirmKey: null, onConfirmPayload: null },

  // ---------- SEED ----------
  seed: () => ({
    labAccounts: [
      { id: "LAB-USER-1", name: "Dental Lab Rawalpindi", email: "lab.rwp@example.com", phone: "051-5551234", enabled: true, forcePasswordChange: false, createdAt: "2025-10-01" },
      { id: "LAB-USER-2", name: "Smile Craft Lab", email: "smilecraft@example.com", phone: "051-7778899", enabled: true, forcePasswordChange: true, createdAt: "2025-12-10" },
      { id: "LAB-USER-3", name: "Ortho Lab PK", email: "ortholab@example.com", phone: "051-4447766", enabled: false, forcePasswordChange: false, createdAt: "2026-01-02" },
    ],
    sampleTypes: [
      { id: "ST-1", name: "Impression", description: "Alginate / silicone impression sample", active: true },
      { id: "ST-2", name: "Crown", description: "Crown case type", active: true },
      { id: "ST-3", name: "Bridge", description: "Bridge case type", active: true },
      { id: "ST-4", name: "Denture", description: "Complete/partial denture", active: true },
    ],
    labCases: [
      {
        id: "CASE-2001",
        createdAt: "2026-01-15",
        patientName: "Ali Raza",
        dentistId: 1,
        dentistName: "Dr. Ahmed",
        labId: "LAB-USER-1",
        labName: "Dental Lab Rawalpindi",
        sampleTypeId: "ST-2",
        sampleTypeName: "Crown",
        status: "in_progress",
        notes: "Shade A2, upper right molar",
        timeline: [
          { at: "2026-01-15 10:10", status: "received", note: "Case received from clinic" },
          { at: "2026-01-15 13:05", status: "in_progress", note: "Work started" },
        ],
      },
      {
        id: "CASE-2002",
        createdAt: "2026-01-16",
        patientName: "Ayesha Khan",
        dentistId: 2,
        dentistName: "Dr. Saif",
        labId: "LAB-USER-2",
        labName: "Smile Craft Lab",
        sampleTypeId: "ST-1",
        sampleTypeName: "Impression",
        status: "received",
        notes: "Impression for braces planning",
        timeline: [{ at: "2026-01-16 09:20", status: "received", note: "Case logged" }],
      },
      {
        id: "CASE-2003",
        createdAt: "2026-01-17",
        patientName: "Hamza Ali",
        dentistId: 3,
        dentistName: "Dr. Hina",
        labId: "LAB-USER-1",
        labName: "Dental Lab Rawalpindi",
        sampleTypeId: "ST-4",
        sampleTypeName: "Denture",
        status: "ready",
        notes: "Partial denture, lower arch",
        timeline: [
          { at: "2026-01-17 11:00", status: "received", note: "Received" },
          { at: "2026-01-17 14:40", status: "in_progress", note: "Fabrication started" },
          { at: "2026-01-18 10:15", status: "ready", note: "Ready for dispatch" },
        ],
      },
    ],
  }),

  init: () => {
    if (get().initialized) return;
    const demo = get().seed();
    set({
      labAccounts: demo.labAccounts,
      sampleTypes: demo.sampleTypes,
      labCases: demo.labCases,
      initialized: true,
    });
  },

  // ---------- TABS ----------
  setActiveTab: (tab) => set({ activeTab: tab }),

  // ---------- FILTERS ----------
  setFilter: (tab, key, value) =>
    set((state) => ({
      filters: { ...state.filters, [tab]: { ...state.filters[tab], [key]: value } },
    })),

  resetFilters: (tab) =>
    set((state) => ({
      filters: { ...state.filters, [tab]: { ...defaultFilters[tab] } },
    })),

  // ---------- MODALS ----------
  openCreate: (type) => set({ modal: { open: true, type, mode: "create", payload: null } }),
  openEdit: (type, payload) => set({ modal: { open: true, type, mode: "edit", payload } }),
  openDetails: (payload) => set({ modal: { open: true, type: "caseDetails", mode: "view", payload } }),
  closeModal: () => set({ modal: { open: false, type: null, mode: "create", payload: null } }),

  // ---------- CONFIRM ----------
  openConfirm: ({ title, message, onConfirmKey, onConfirmPayload }) =>
    set({ confirm: { open: true, title, message, onConfirmKey, onConfirmPayload } }),
  closeConfirm: () => set({ confirm: { open: false, title: "", message: "", onConfirmKey: null, onConfirmPayload: null } }),

  runConfirm: () => {
    const { confirm } = get();
    if (!confirm.onConfirmKey) return;

    const map = {
      deleteSampleType: (id) => get().deleteSampleType(id),
      disableLabAccount: (id) => get().setLabAccountEnabled(id, false),
    };

    const fn = map[confirm.onConfirmKey];
    if (fn) fn(confirm.onConfirmPayload);
    get().closeConfirm();
  },

  // ---------- LAB ACCOUNTS CRUD ----------
  addLabAccount: (data) =>
    set((state) => ({
      labAccounts: [
        ...state.labAccounts,
        {
          id: `LAB-USER-${uid()}`,
          name: data.name?.trim() || "New Lab",
          email: (data.email || "").trim(),
          phone: (data.phone || "").trim(),
          enabled: data.enabled ?? true,
          forcePasswordChange: data.forcePasswordChange ?? true,
          createdAt: new Date().toISOString().slice(0, 10),
        },
      ],
    })),

  updateLabAccount: (id, patch) =>
    set((state) => ({
      labAccounts: state.labAccounts.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    })),

  setLabAccountEnabled: (id, enabled) =>
    set((state) => ({
      labAccounts: state.labAccounts.map((x) => (x.id === id ? { ...x, enabled } : x)),
    })),

  resetLabPassword: (id) =>
    // demo: just mark force change on next login
    set((state) => ({
      labAccounts: state.labAccounts.map((x) =>
        x.id === id ? { ...x, forcePasswordChange: true } : x
      ),
    })),

  // ---------- SAMPLE TYPES CRUD ----------
  addSampleType: (data) =>
    set((state) => ({
      sampleTypes: [
        ...state.sampleTypes,
        {
          id: `ST-${uid()}`,
          name: data.name?.trim() || "New Sample Type",
          description: data.description || "",
          active: data.active ?? true,
        },
      ],
    })),

  updateSampleType: (id, patch) =>
    set((state) => ({
      sampleTypes: state.sampleTypes.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    })),

  deleteSampleType: (id) =>
    set((state) => ({
      sampleTypes: state.sampleTypes.filter((x) => x.id !== id),
    })),

  // ---------- FILTERED LISTS ----------
  getFilteredAccounts: () => {
    const { labAccounts, filters } = get();
    const { query, status } = filters.accounts;
    const q = String(query || "").trim().toLowerCase();

    return labAccounts.filter((a) => {
      if (status === "enabled" && !a.enabled) return false;
      if (status === "disabled" && a.enabled) return false;

      if (q) {
        const hay = `${a.id} ${a.name} ${a.email} ${a.phone}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  },

  getFilteredSampleTypes: () => {
    const { sampleTypes, filters } = get();
    const q = String(filters.sampleTypes.query || "").trim().toLowerCase();
    return sampleTypes.filter((s) => {
      if (!q) return true;
      const hay = `${s.id} ${s.name} ${s.description}`.toLowerCase();
      return hay.includes(q);
    });
  },

  getFilteredCases: () => {
    const { labCases, filters } = get();
    const { query, labId, dentistId, status, dateFrom, dateTo } = filters.cases;

    const q = String(query || "").trim().toLowerCase();
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59`) : null;

    return labCases.filter((c) => {
      const d = new Date(`${c.createdAt}T12:00:00`);
      if (from && d < from) return false;
      if (to && d > to) return false;

      if (labId !== "all" && c.labId !== labId) return false;
      if (dentistId !== "all" && String(c.dentistId) !== String(dentistId)) return false;
      if (status !== "all" && c.status !== status) return false;

      if (q) {
        const hay =
          `${c.id} ${c.patientName} ${c.dentistName} ${c.labName} ${c.sampleTypeName} ${c.status}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  },
}));