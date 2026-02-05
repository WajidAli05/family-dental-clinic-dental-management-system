import { create } from "zustand";
import { dentistApi } from "@/lib/dentistApi";
import { receptionistApi } from "@/lib/receptionistApi";

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

    // ✅ ADD: keep existing UI expectations
  addAppointment: (row) =>
    set((state) => ({
      appointments: [row, ...state.appointments],
    })),

  // ✅ ADD: create in DB (used by receptionist)
  createAppointment: async (payload) => {
    try {
      set({ loading: true, error: null });
      const res = await receptionistApi.createAppointment(payload); // { success, data }
      set((state) => ({
        appointments: [res.data, ...state.appointments],
        loading: false,
      }));
      return res.data;
    } catch (e) {
      set({ loading: false, error: e.message });
      throw e;
    }
  },
}));