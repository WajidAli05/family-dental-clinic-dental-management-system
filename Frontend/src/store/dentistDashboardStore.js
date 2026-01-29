import { create } from "zustand";
import { dentistApi } from "@/lib/dentistApi";

export const useDentistDashboardStore = create((set) => ({
  loading: false,
  error: null,

  stats: {
    appointmentsToday: 0,
    patientsSeen: 0,
    pendingLab: 0,
    prescriptionsToday: 0,
  },

  appointments: [],

  fetchDashboard: async () => {
    try {
      set({ loading: true, error: null });

      const today = new Date().toISOString().split("T")[0];

      const [statsRes, apptRes] = await Promise.all([
        dentistApi.getStats(),
        dentistApi.getAppointments({ date: today, status: "scheduled" }),
      ]);

      const appointments = (apptRes.data || []).map((a) => ({
        id: a.id,
        time: a.time,
        patient: a.patientName,
        type: a.reason || "Consultation",
        original: a,
      }));

      set({
        stats: statsRes.data,
        appointments,
        loading: false,
      });
    } catch (e) {
      set({ error: e.message, loading: false });
    }
  },
}));