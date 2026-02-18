import { create } from "zustand";
import { ownerApi } from "@/lib/ownerApi";

const defaultFilters = {
  query: "",
  status: "all",      // active | inactive
  city: "all",
  dentist: "all",
  gender: "all",
  dateFrom: "",       // lastVisit range
  dateTo: "",
};

export const useOwnerPatientsStore = create((set, get) => ({
  initialized: false,
  loading: false,
  error: null,

  filters: { ...defaultFilters },

  patients: [],
  selectedPatient: null,

  // keep your demo seeds (DO NOT remove)
  seedDemoPatients: () => [
    {
      id: "PT-1001",
      name: "Mazhar Iqbal",
      phone: "0335-1234567",
      age: 34,
      gender: "Male",
      city: "Rawalpindi",
      status: "active",
      createdAt: "2025-10-12",
      lastVisit: "2026-01-15",
      dentist: "Dr. Saif",
      pendingLab: 1,
      totalSpent: 13500,
      lastInvoiceAmount: 3500,
      tags: ["Scaling", "Sensitivity"],
    },
    {
      id: "PT-1002",
      name: "Ayesha Khan",
      phone: "0321-7654321",
      age: 27,
      gender: "Female",
      city: "Rawalpindi",
      status: "active",
      createdAt: "2025-11-05",
      lastVisit: "2026-01-16",
      dentist: "Dr. Ahmed",
      pendingLab: 0,
      totalSpent: 22000,
      lastInvoiceAmount: 8000,
      tags: ["RCT", "Pain"],
    },
    {
      id: "PT-1003",
      name: "Hamza Ali",
      phone: "0307-1122334",
      age: 19,
      gender: "Male",
      city: "Islamabad",
      status: "active",
      createdAt: "2025-09-20",
      lastVisit: "2026-01-17",
      dentist: "Dr. Hina",
      pendingLab: 0,
      totalSpent: 9000,
      lastInvoiceAmount: 0,
      tags: ["Ortho", "Braces"],
    },
    {
      id: "PT-1004",
      name: "Sara Noor",
      phone: "0345-4455667",
      age: 41,
      gender: "Female",
      city: "Rawalpindi",
      status: "inactive",
      createdAt: "2024-12-11",
      lastVisit: "2026-01-12",
      dentist: "Dr. Saif",
      pendingLab: 0,
      totalSpent: 4500,
      lastInvoiceAmount: 4500,
      tags: ["Consultation"],
    },
    {
      id: "PT-1005",
      name: "Bilal Ahmed",
      phone: "0300-5544332",
      age: 30,
      gender: "Male",
      city: "Taxila",
      status: "active",
      createdAt: "2025-12-02",
      lastVisit: "2026-01-16",
      dentist: "Dr. Saif",
      pendingLab: 2,
      totalSpent: 16500,
      lastInvoiceAmount: 6000,
      tags: ["Filling", "Pain"],
    },
    {
      id: "PT-1006",
      name: "Zainab Malik",
      phone: "0315-6677889",
      age: 17,
      gender: "Female",
      city: "Rawalpindi",
      status: "active",
      createdAt: "2026-01-01",
      lastVisit: "2026-01-16",
      dentist: "Dr. Hina",
      pendingLab: 0,
      totalSpent: 3000,
      lastInvoiceAmount: 3000,
      tags: ["Ortho", "Consultation"],
    },
  ],

  seedDemoProfile: (patientId) => {
    const profiles = {
      "PT-1001": {
        history: [
          { date: "2026-01-15", type: "Appointment", detail: "Scaling & polishing" },
          { date: "2026-01-15", type: "Treatment", detail: "Scaling (full mouth)" },
          { date: "2026-01-15", type: "Invoice", detail: "INV-3001 • PKR 3,500" },
          { date: "2026-01-16", type: "Lab", detail: "LAB-9001 • OPG • Pending" },
        ],
        invoices: [{ id: "INV-3001", date: "2026-01-15", amount: 3500, status: "paid" }],
        labs: [{ id: "LAB-9001", date: "2026-01-16", type: "OPG", status: "pending" }],
        treatments: [{ id: "TR-7001", date: "2026-01-15", title: "Scaling & Polishing" }],
      },
      "PT-1002": {
        history: [
          { date: "2026-01-16", type: "Appointment", detail: "Toothache evaluation" },
          { date: "2026-01-16", type: "Treatment", detail: "RCT started" },
          { date: "2026-01-16", type: "Invoice", detail: "INV-3002 • PKR 8,000" },
        ],
        invoices: [{ id: "INV-3002", date: "2026-01-16", amount: 8000, status: "partial" }],
        labs: [],
        treatments: [{ id: "TR-7002", date: "2026-01-16", title: "RCT (Session 1)" }],
      },
    };
    return profiles[patientId] || { history: [], invoices: [], labs: [], treatments: [] };
  },

  // ✅ cache for real profiles
  profileCache: {},

  // ✅ init now fetches real patients
  init: async () => {
    if (get().initialized) return;

    set({ initialized: true });
    await get().fetchPatients();
  },

  // ✅ load patients from backend
  fetchPatients: async () => {
    try {
      set({ loading: true, error: null });
      const res = await ownerApi.listPatients();
      set({ patients: res.data || [], loading: false });
    } catch (e) {
      // fallback to demo so UI doesn't go blank
      set((state) => ({
        patients: state.patients?.length ? state.patients : state.seedDemoPatients(),
        loading: false,
        error: e.message,
      }));
    }
  },

  // ✅ load real profile (history/invoices/labs/treatments)
  fetchProfile: async (patientId) => {
    const id = String(patientId || "").trim();
    if (!id) return null;

    // already cached
    const cached = get().profileCache?.[id];
    if (cached) return cached;

    try {
      const res = await ownerApi.getPatientProfile(id);
      const profile = res.data || { history: [], invoices: [], labs: [], treatments: [] };

      set((state) => ({
        profileCache: { ...(state.profileCache || {}), [id]: profile },
      }));

      return profile;
    } catch (e) {
      // fallback to demo profile
      return get().seedDemoProfile(id);
    }
  },

  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),

  resetFilters: () => set({ filters: { ...defaultFilters } }),

  openProfile: (patient) => set({ selectedPatient: patient }),
  closeProfile: () => set({ selectedPatient: null }),

  // keep existing local delete method (DO NOT remove)
  deletePatient: (patientId) =>
    set((state) => ({
      patients: state.patients.filter((p) => p.id !== patientId),
      selectedPatient: state.selectedPatient?.id === patientId ? null : state.selectedPatient,
    })),

  // ✅ NEW: local status update (inactive)
  markPatientInactiveLocal: (patientId) => {
    const id = String(patientId || "").trim();
    if (!id) return;

    set((state) => ({
      patients: (state.patients || []).map((p) =>
        p.id === id ? { ...p, status: "inactive" } : p
      ),
      selectedPatient:
        state.selectedPatient?.id === id
          ? { ...state.selectedPatient, status: "inactive" }
          : state.selectedPatient,
    }));
  },

  // ✅ NEW: call backend delete route (soft delete -> mark inactive)
  markPatientInactive: async (patientId) => {
    const id = String(patientId || "").trim();
    if (!id) return;

    try {
      set({ loading: true, error: null });
      await ownerApi.deletePatient(id); // backend marks inactive
      get().markPatientInactiveLocal(id);
      set({ loading: false });
    } catch (e) {
      set({ loading: false, error: e.message });
      throw e;
    }
  },

  // ✅ keep existing method name (DO NOT remove), but NO browser confirm anymore
  confirmAndDeletePatient: async (patientId) => {
    // now just executes the action (confirmation is handled by UI)
    return get().markPatientInactive(patientId);
  },

  // single “source of truth” filtering here (page just calls this)
  getFilteredPatients: () => {
    const { patients, filters } = get();
    const { query, status, city, dentist, gender, dateFrom, dateTo } = filters;

    const q = String(query || "").trim().toLowerCase();
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59`) : null;

    return patients.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (city !== "all" && p.city !== city) return false;
      if (dentist !== "all" && p.dentist !== dentist) return false;
      if (gender !== "all" && String(p.gender).toLowerCase() !== gender) return false;

      if (from || to) {
        const lv = p.lastVisit ? new Date(`${p.lastVisit}T12:00:00`) : null;
        if (from && lv && lv < from) return false;
        if (to && lv && lv > to) return false;
      }

      if (q) {
        const hay =
          `${p.id} ${p.name} ${p.phone} ${p.city} ${p.dentist} ${p.status} ${(p.tags || []).join(" ")}`
            .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  },

  // Stats helper (use this for cards)
  getStats: (list) => {
    const total = list.length;
    const active = list.filter((p) => p.status === "active").length;
    const inactive = list.filter((p) => p.status === "inactive").length;
    const pendingLabs = list.reduce((sum, p) => sum + (Number(p.pendingLab) || 0), 0);
    const revenue = list.reduce((sum, p) => sum + (Number(p.totalSpent) || 0), 0);
    return { total, active, inactive, pendingLabs, revenue };
  },
}));