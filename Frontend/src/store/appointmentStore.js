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
  // createAppointment: async (payload) => {
  //   try {
  //     set({ loading: true, error: null });
  //     const res = await receptionistApi.createAppointment(payload); // { success, data }
  //     set((state) => ({
  //       appointments: [res.data, ...state.appointments],
  //       loading: false,
  //     }));
  //     return res.data;
  //   } catch (e) {
  //     set({ loading: false, error: e.message });
  //     throw e;
  //   }
  // },

    // ✅ ADD: create appointment in DB (used by modal)
  createAppointment: async (payload) => {
    try {
      set({ loading: true, error: null });
      const res = await receptionistApi.createAppointment(payload);
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

  // ✅ ADD: keep UI compatibility if any component uses it
  addAppointment: (row) =>
    set((state) => ({
      appointments: [row, ...state.appointments],
    })),

    // ✅ ADD: receptionist fetch list (supports filters)
  fetchAppointments: async (filters = {}) => {
    try {
      set({ loading: true, error: null });
      const res = await receptionistApi.getAppointments(filters);
      set({ appointments: res.data || [], loading: false });
      return res.data || [];
    } catch (e) {
      set({ error: e.message, loading: false });
      return [];
    }
  },

  // ✅ ADD: update status (optimistic + DB)
  updateAppointmentStatus: async (id, status) => {
    // optimistic update
    set((state) => ({
      appointments: state.appointments.map((a) =>
        a.id === id ? { ...a, status } : a
      ),
    }));

    try {
      const res = await receptionistApi.updateAppointmentStatus(id, { status });
      // reconcile with backend response
      set((state) => ({
        appointments: state.appointments.map((a) =>
          a.id === id ? { ...a, ...res.data } : a
        ),
      }));
      return res.data;
    } catch (e) {
      // rollback by refetching list (safe)
      const currentFilters = {}; // keep simple; page can refetch
      await get().fetchAppointments(currentFilters).catch(() => {});
      set({ error: e.message });
      throw e;
    }
  },
}));