import { create } from "zustand";
import { dentistApi } from "@/lib/dentistApi";

export const useAppointmentStore = create((set, get) => ({
  loading: false,
  error: null,

  // keep same UI shape
  appointments: [],

  fetchToday: async () => {
    try {
      set({ loading: true, error: null });
      const today = new Date().toISOString().slice(0, 10);

      const res = await dentistApi.getAppointments({ date: today });

      // res = { success, data }
      const rows = (res.data || []).map((a) => ({
        id: a.id,
        mr: a.mr,
        patientName: a.patientName,
        date: a.date,
        time: a.time,
        reason: a.reason,
        status: a.status, // scheduled/completed...
        original: a.original,
      }));

      set({ appointments: rows, loading: false });
    } catch (e) {
      set({ error: e.message, loading: false });
    }
  },
}));