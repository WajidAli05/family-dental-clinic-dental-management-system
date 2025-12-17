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

  getTodayAppointments: () => {
    const today = new Date().toISOString().split("T")[0];
    return get().appointments.filter((a) => a.date === today);
  },
}));