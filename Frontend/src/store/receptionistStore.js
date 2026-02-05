import { create } from "zustand";
import { receptionistApi } from "@/lib/receptionistApi";

export const useReceptionistStore = create(() => ({
  stats: {
    appointmentsToday: 18,
    activePatients: 124,
    pendingLabSamples: 6,
    todayRevenue: 85000,
  },

  appointments: [
    {
      patient: "Ali Raza",
      dentist: "Dr. Ahmed",
      time: "10:30 AM",
      status: "Scheduled",
    },
    {
      patient: "Sara Khan",
      dentist: "Dr. Saif",
      time: "11:00 AM",
      status: "Completed",
    },
  ],

  labSamples: [
    {
      patient: "Hina Malik",
      sample: "Zirconia Crown",
      lab: "Smile Lab",
      status: "In Process",
    },
  ],

    // ✅ ADD (no removals)
  loading: false,
  error: null,

  stats: {
    totalPatients: 0,
    activePatients: 0,
    pendingLabSamples: 0,
    pendingInvoices: 0,
    totalRevenue: 0,
  },


  fetchDashboard: async ({ date } = {}) => {
    try {
      set({ loading: true, error: null });

      const d = date || new Date().toISOString().slice(0, 10);

      const [statsRes, apptRes, labRes] = await Promise.all([
        receptionistApi.getStats({ date: d }),
        receptionistApi.getAppointments({ date: d }),
        receptionistApi.getLabSamples({ date: d }),
      ]);

      set({
        stats: statsRes.data || get().stats,
        appointments: apptRes.data || [],
        labSamples: labRes.data || [],
        loading: false,
      });
    } catch (e) {
      set({ loading: false, error: e.message || "Failed to load dashboard" });
    }
  },

  fetchPatients: async ({ q } = {}) => {
    try {
      set({ loading: true, error: null });

      const res = await receptionistApi.getPatients(q ? { q } : undefined);
      // backend returns { success, data: [] }
      set({ patients: res.data || [], loading: false });
      return res.data || [];
    } catch (e) {
      set({ error: e.message, loading: false });
      return [];
    }
  },

  fetchPatientStats: async () => {
    try {
      const res = await receptionistApi.getPatientStats();
      set({ stats: res.data || get().stats });
      return res.data;
    } catch (e) {
      set({ error: e.message });
      return null;
    }
  },
}));