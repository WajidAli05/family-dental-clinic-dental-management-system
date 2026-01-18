import { create } from "zustand";

export const useOwnerDashboardStore = create((set) => ({
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

  init: () =>
    set((state) => {
      const demo = state.seedDemoData();
      return {
        stats: demo.stats,
        appointmentsSummary: demo.appointmentsSummary,
      };
    }),
}));