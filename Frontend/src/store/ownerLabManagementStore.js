import { create } from "zustand";

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const defaultFilters = {
  accounts: { query: "", status: "all" }, // all | enabled | disabled
  cases: {
    query: "",
    labId: "all",
    dentistId: "all",
    status: "all", // sent | received | in_progress | ready | delivered | approved | rejected
    dateFrom: "",
    dateTo: "",
  },
  sampleTypes: { query: "" },
};

const baseURL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

function buildUrl(path, params) {
  const url = new URL(baseURL + path);
  if (params && typeof params === "object") {
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

async function request(path, { method = "GET", params, body } = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(buildUrl(path, params), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || `Request failed: ${res.status}`);
  }
  return json; // { success, data }
}

export const useOwnerLabManagementStore = create((set, get) => ({
  initialized: false,
  loading: false,
  error: null,

  activeTab: "accounts", // accounts | cases | sampleTypes

  // ---------- DATA ----------
  labAccounts: [],
  sampleTypes: [],
  labCases: [],
  dentists: [], // ✅ NEW (for cases filtering dropdown)

  // ---------- UI ----------
  filters: { ...defaultFilters },

  modal: { open: false, type: null, mode: "create", payload: null }, // labAccount | sampleType | caseDetails
  confirm: {
    open: false,
    title: "",
    message: "",
    onConfirmKey: null,
    onConfirmPayload: null,
  },

  // ---------- SEED (keep) ----------
  seed: () => ({
    labAccounts: [
      {
        id: "LAB-USER-1",
        name: "Dental Lab Rawalpindi",
        email: "lab.rwp@example.com",
        phone: "051-5551234",
        enabled: true,
        forcePasswordChange: false,
        createdAt: "2025-10-01",
      },
      {
        id: "LAB-USER-2",
        name: "Smile Craft Lab",
        email: "smilecraft@example.com",
        phone: "051-7778899",
        enabled: true,
        forcePasswordChange: true,
        createdAt: "2025-12-10",
      },
      {
        id: "LAB-USER-3",
        name: "Ortho Lab PK",
        email: "ortholab@example.com",
        phone: "051-4447766",
        enabled: false,
        forcePasswordChange: false,
        createdAt: "2026-01-02",
      },
    ],
    sampleTypes: [
      { id: "ST-1", name: "Impression", description: "Alginate / silicone impression sample", active: true, price: 0 },
      { id: "ST-2", name: "Crown", description: "Crown case type", active: true, price: 0 },
      { id: "ST-3", name: "Bridge", description: "Bridge case type", active: true, price: 0 },
      { id: "ST-4", name: "Denture", description: "Complete/partial denture", active: true, price: 0 },
    ],
    labCases: [
      {
        id: "CASE-2001",
        createdAt: "2026-01-15",
        patientName: "Ali Raza",
        dentistId: "D-1",
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
    ],
  }),

  // ---------- INIT ----------
  init: async () => {
    if (get().initialized) return;

    set({ initialized: true, loading: true, error: null });

    // instant demo so UI isn't empty
    const demo = get().seed();
    set({
      labAccounts: demo.labAccounts,
      sampleTypes: demo.sampleTypes,
      labCases: demo.labCases,
    });

    try {
      await Promise.all([
        get().fetchLabAccounts(),
        get().fetchSampleTypes(),
        get().fetchLabCases(),
        get().fetchDentists(), // ✅ NEW
      ]);
      set({ loading: false });
    } catch (e) {
      set({ loading: false, error: e.message });
    }
  },

  // ---------- FETCHERS ----------
  fetchLabAccounts: async () => {
    const res = await request("/owner/labs");
    set({ labAccounts: res.data || [] });
  },

  fetchSampleTypes: async () => {
    const res = await request("/owner/sample-types");
    set({ sampleTypes: res.data || [] });
  },

  fetchLabCases: async () => {
    const res = await request("/owner/lab-cases");
    set({ labCases: res.data || [] });
  },

  // ✅ NEW: dentists for cases filter (expects [{id,name}] or similar)
  fetchDentists: async () => {
    try {
      const res = await request("/owner/dentists");
      set({ dentists: res.data || [] });
    } catch {
      // do not break page if endpoint isn't ready yet
      set({ dentists: [] });
    }
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
  closeConfirm: () =>
    set({ confirm: { open: false, title: "", message: "", onConfirmKey: null, onConfirmPayload: null } }),

  runConfirm: async () => {
    const { confirm } = get();
    if (!confirm.onConfirmKey) return;

    const map = {
      deleteSampleType: async (id) => get().deleteSampleType(id),
    };

    const fn = map[confirm.onConfirmKey];
    try {
      if (fn) await fn(confirm.onConfirmPayload);
    } finally {
      get().closeConfirm();
    }
  },

  // ---------- LAB ACCOUNTS CRUD (REAL) ----------
  addLabAccount: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await request("/owner/labs", { method: "POST", body: data });
      const created = res.data;
      set((state) => ({
        labAccounts: [created, ...(state.labAccounts || [])],
        loading: false,
      }));
    } catch (e) {
      set({ loading: false, error: e.message });
      throw e;
    }
  },

  updateLabAccount: async (id, patch) => {
    set({ loading: true, error: null });
    try {
      const res = await request(`/owner/labs/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: patch,
      });
      const updated = res.data;
      set((state) => ({
        labAccounts: (state.labAccounts || []).map((x) => (x.id === id ? updated : x)),
        loading: false,
      }));
    } catch (e) {
      set({ loading: false, error: e.message });
      throw e;
    }
  },

  setLabAccountEnabled: async (id, enabled) => {
    set({ loading: true, error: null });
    try {
      const res = await request(`/owner/labs/${encodeURIComponent(id)}/enabled`, {
        method: "PATCH",
        body: { enabled: !!enabled },
      });
      const updated = res.data;
      set((state) => ({
        labAccounts: (state.labAccounts || []).map((x) => (x.id === id ? updated : x)),
        loading: false,
      }));
    } catch (e) {
      set({ loading: false, error: e.message });
      throw e;
    }
  },

  // kept for compatibility with page (but UI may remove it later)
  resetLabPassword: async (_id) => {
    return;
  },

  // ---------- SAMPLE TYPES CRUD (REAL) ----------
  addSampleType: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await request("/owner/sample-types", { method: "POST", body: data });
      const created = res.data;
      set((state) => ({
        sampleTypes: [created, ...(state.sampleTypes || [])],
        loading: false,
      }));
    } catch (e) {
      set({ loading: false, error: e.message });
      throw e;
    }
  },

  updateSampleType: async (id, patch) => {
    set({ loading: true, error: null });
    try {
      const res = await request(`/owner/sample-types/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: patch,
      });
      const updated = res.data;
      set((state) => ({
        sampleTypes: (state.sampleTypes || []).map((x) => (x.id === id ? updated : x)),
        loading: false,
      }));
    } catch (e) {
      set({ loading: false, error: e.message });
      throw e;
    }
  },

  setSampleTypeActive: async (id, active) => {
    return get().updateSampleType(id, { active: !!active });
  },

  deleteSampleType: async (id) => {
    set({ loading: true, error: null });
    try {
      await request(`/owner/sample-types/${encodeURIComponent(id)}`, { method: "DELETE" });
      set((state) => ({
        sampleTypes: (state.sampleTypes || []).filter((x) => x.id !== id),
        loading: false,
      }));
    } catch (e) {
      set({ loading: false, error: e.message });
      throw e;
    }
  },

  // ---------- FILTERED LISTS (kept) ----------
  getFilteredAccounts: () => {
    const { labAccounts, filters } = get();
    const { query, status } = filters.accounts;
    const q = String(query || "").trim().toLowerCase();

    return (labAccounts || []).filter((a) => {
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
    return (sampleTypes || []).filter((s) => {
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

    return (labCases || []).filter((c) => {
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