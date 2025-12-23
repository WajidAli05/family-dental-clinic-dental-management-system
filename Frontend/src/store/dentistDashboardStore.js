import { create } from "zustand";

export const useDentistDashboardStore = create(() => ({
  stats: {
    appointmentsToday: 6,
    patientsSeen: 4,
    pendingLab: 3,
    prescriptionsToday: 5,
  },

  appointments: [
    {
      id: "APT-01",
      time: "10:00 AM",
      patient: "Ali Raza",
      type: "Consultation",
    },
    {
      id: "APT-02",
      time: "11:30 AM",
      patient: "Sara Khan",
      type: "Root Canal",
    },
  ],
}));