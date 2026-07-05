import { create } from "zustand";
import { ownerApi } from "@/lib/ownerApi";

const defaultFilters = {
  dateFrom: "",
  dateTo: "",
  dentistId: "all",
  status: "all",
  query: "",
};

export const useOwnerAppointmentsStore = create((set, get) => ({
  initialized: false,

  // --- Filters
  filters: { ...defaultFilters },

  // --- Data
  appointments: [],
  selectedAppointment: null,

  // ✅ optional UX (safe)
  loading: false,
  error: null,
  pagination: { total: 0, page: 1, pages: 1 },

  // --- Demo seed (fallback)
  seedDemoAppointments: () => [
    {
      id: "APT-1001",
      date: "2026-01-15",
      time: "09:30 AM",
      patientName: "Ali Raza",
      patientPhone: "0301-1234567",
      dentistId: 1,
      dentistName: "Dr. Ahmed",
      status: "scheduled",
      reason: "Root canal consultation",
      notes: "Severe pain in lower molar",
    },
    {
      id: "APT-1002",
      date: "2026-01-15",
      time: "10:30 AM",
      patientName: "Ayesha Khan",
      patientPhone: "0321-7654321",
      dentistId: 2,
      dentistName: "Dr. Saif",
      status: "checked_in",
      reason: "Scaling & polishing",
      notes: "Regular cleaning",
    },
  ],

  // ✅ Real fetch
  fetchAppointments: async (params = {}) => {
    try {
      set({ loading: true, error: null });

      const f = get().filters;
      const res = await ownerApi.getAppointments({
        dateFrom: params.dateFrom ?? f.dateFrom,
        dateTo: params.dateTo ?? f.dateTo,
        dentistId: params.dentistId ?? f.dentistId,
        status: params.status ?? f.status,
        q: params.q ?? f.query,
      });

      set({
        appointments: res?.data || [],
        pagination: { total: res?.total ?? 0, page: res?.page ?? 1, pages: res?.pages ?? 1 },
        loading: false,
      });
      return res?.data || [];
    } catch (e) {
      console.error("[ownerAppointmentsStore] fetchAppointments failed:", e);
      set({ appointments: [], loading: false, error: e?.message || "Failed to load appointments" });
      return [];
    }
  },

  // ✅ Idempotent init (StrictMode-safe)
  init: () => {
    if (get().initialized) return;
    set({ initialized: true });
    return get().fetchAppointments();
  },

  // --- Actions
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),

  resetFilters: () => set({ filters: { ...defaultFilters } }),

  openDetails: (appointment) => set({ selectedAppointment: appointment }),
  closeDetails: () => set({ selectedAppointment: null }),
}));