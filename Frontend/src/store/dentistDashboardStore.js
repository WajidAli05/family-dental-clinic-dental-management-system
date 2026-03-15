// src/store/dentistDashboardStore.js
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
        // ✅ only date is guaranteed; backend may ignore others
        dentistApi.getAppointments({ date: today }),
      ]);

      const appointments = (apptRes.data || []).map((a) => {
        const original = a?.original || a;

        return {
          // existing keys (keep)
          id: a?.id || original?.publicId || original?._id || "",
          time: a?.time || original?.time || "",
          patient: a?.patient || a?.patientName || original?.patientName || "",
          type: a?.type || a?.reason || original?.reason || "Consultation",

          // ✅ add extra keys (tables often expect these)
          patientName: a?.patientName || original?.patientName || "",
          reason: a?.reason || original?.reason || "",
          date: a?.date || original?.date || "",
          status: a?.status || original?.status || "",
          mr: a?.mr ?? original?.mr ?? null,
          patientId:
            a?.patientId ||
            original?.patientId ||
            original?.patient?.publicId ||
            "",

          original,
        };
      });

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