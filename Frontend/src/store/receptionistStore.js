import { create } from "zustand";

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
}));