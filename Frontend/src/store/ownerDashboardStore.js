import { create } from "zustand";
import { ownerApi } from "@/lib/ownerApi";

// ✅ local date helper (same idea you used elsewhere)
const localISODate = (d = new Date()) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export const useOwnerDashboardStore = create((set, get) => ({
  stats: {
    activePatients: 0,
    pendingLabSamples: 0,
    revenueToday: 0,
    revenueThisMonth: 0,
  },

  appointmentsSummary: {
    total: 0,
    scheduled: 0,
    checkedIn: 0,
    completed: 0,
    cancelled: 0,
  },

  loading: false,
  error: null,

  seedDemoData: () => ({
    stats: {
      activePatients: 284,
      pendingLabSamples: 12,
      revenueToday: 18500,
      revenueThisMonth: 342000,
    },
    appointmentsSummary: {
      total: 18,
      scheduled: 9,
      checkedIn: 3,
      completed: 5,
      cancelled: 1,
    },
  }),

  fetchOverview: async (params = {}) => {
    try {
      set({ loading: true, error: null });

      const date = params?.date || localISODate();
      const res = await ownerApi.getDashboardOverview({ date }); // { success, data }

      set({
        stats: res?.data?.stats || get().stats,
        appointmentsSummary: res?.data?.appointmentsSummary || get().appointmentsSummary,
        loading: false,
      });

      return res?.data;
    } catch (e) {
      // fallback demo so UI still looks fine during dev
      const demo = get().seedDemoData();
      set({
        stats: demo.stats,
        appointmentsSummary: demo.appointmentsSummary,
        loading: false,
        error: e.message || "Failed to load overview",
      });
      return null;
    }
  },

  init: async () => {
    return get().fetchOverview();
  },
}));