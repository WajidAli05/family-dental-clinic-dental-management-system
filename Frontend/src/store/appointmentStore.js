import { create } from "zustand";

export const useAppointmentStore = create((set, get) => ({
  appointments: [
    {
      id: 1,
      mr: 1,
      patientName: "Ali Raza",
      dentist: "Dr. Ahmed",
      date: "2024-12-18",
      time: "10:30",
      reason: "Follow-up",
      status: "Scheduled",
    },
  ],

  addAppointment: (appointment) =>
    set((state) => ({
      appointments: [
        ...state.appointments,
        {
          id: state.appointments.length + 1,
          status: "Scheduled",
          ...appointment,
        },
      ],
    })),

  updateAppointment: (id, updates) =>
    set((state) => ({
      appointments: state.appointments.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    })),

  updateAppointmentStatus: (id, status) =>
    set((state) => ({
      appointments: state.appointments.map((a) =>
        a.id === id ? { ...a, status } : a
      ),
    })),

  /* 📊 DASHBOARD DERIVED STATS */
  getStats: () => {
    const today = new Date().toISOString().split("T")[0];
    const appointments = get().appointments;

    return {
      appointmentsToday: appointments.filter(a => a.date === today).length,
      completedToday: appointments.filter(
        a => a.date === today && a.status === "Completed"
      ).length,
      cancelledToday: appointments.filter(
        a => a.date === today && a.status === "Cancelled"
      ).length,
    };
  },

  getTodayAppointmentsByDentist: () => {
  const today = new Date().toISOString().split("T")[0];
  return get().appointments.filter(
    (a) => a.date === today && a.status === "Scheduled"
  );
},

  /* 👨‍⚕️ DENTIST-WISE */
  getByDentist: (dentist) =>
    get().appointments.filter((a) => a.dentist === dentist),
}));