import { create } from "zustand";

const today = new Date().toISOString().split("T")[0];

export const useAppointmentStore = create((set, get) => ({
  appointments: [
    {
      id: 1,
      mr: 1,
      patientName: "Ali Raza",
      dentist: "Dr. Ahmed",
      date: today,
      time: "10:30",
      reason: "Follow-up",
      status: "Scheduled",
    },
    {
      id: 2,
      mr: 2,
      patientName: "Sara Khan",
      dentist: "Dr. Ahmed",
      date: today,
      time: "11:15",
      reason: "Tooth Pain",
      status: "Scheduled",
    },
    {
      id: 3,
      mr: 3,
      patientName: "Usman Tariq",
      dentist: "Dr. Ahmed",
      date: today,
      time: "12:00",
      reason: "Scaling",
      status: "Scheduled",
    },
    {
      id: 4,
      mr: 4,
      patientName: "Ayesha Malik",
      dentist: "Dr. Ahmed",
      date: today,
      time: "12:45",
      reason: "Consultation",
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

  getTodayAppointmentsByDentist: (dentist) => {
    const today = new Date().toISOString().split("T")[0];
    return get().appointments.filter(
      (a) =>
        a.date === today &&
        a.status === "Scheduled" &&
        a.dentist === dentist
    );
  },

  getByDentist: (dentist) =>
    get().appointments.filter((a) => a.dentist === dentist),
}));