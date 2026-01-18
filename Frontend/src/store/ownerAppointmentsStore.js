import { create } from "zustand";

// Owner view should show everything by default.
// Date filters are optional (empty = no filter).
const defaultFilters = {
  dateFrom: "",
  dateTo: "",
  dentistId: "all",
  status: "all",
  query: "",
};

export const useOwnerAppointmentsStore = create((set, get) => ({
  initialized: false,

  // --- Filters
  filters: { ...defaultFilters },

  // --- Data
  appointments: [],
  selectedAppointment: null,

  // --- Demo seed (replace with API fetch later)
  seedDemoAppointments: () => [
    {
      id: "APT-1001",
      date: "2026-01-15",
      time: "09:30 AM",
      patientName: "Ali Raza",
      patientPhone: "0301-1234567",
      dentistId: 1,
      dentistName: "Dr. Ahmed",
      status: "scheduled",
      reason: "Root canal consultation",
      notes: "Severe pain in lower molar",
    },
    {
      id: "APT-1002",
      date: "2026-01-15",
      time: "10:30 AM",
      patientName: "Ayesha Khan",
      patientPhone: "0321-7654321",
      dentistId: 2,
      dentistName: "Dr. Saif",
      status: "checked_in",
      reason: "Scaling & polishing",
      notes: "Regular cleaning",
    },
    {
      id: "APT-1003",
      date: "2026-01-15",
      time: "11:45 AM",
      patientName: "Usman Tariq",
      patientPhone: "0333-9988776",
      dentistId: 3,
      dentistName: "Dr. Hina",
      status: "completed",
      reason: "Orthodontic follow-up",
      notes: "Braces tightening",
    },
    {
      id: "APT-1004",
      date: "2026-01-15",
      time: "01:00 PM",
      patientName: "Sara Noor",
      patientPhone: "0345-4455667",
      dentistId: 2,
      dentistName: "Dr. Saif",
      status: "cancelled",
      reason: "Initial consultation",
      notes: "Patient cancelled due to illness",
    },
    {
      id: "APT-1005",
      date: "2026-01-16",
      time: "09:00 AM",
      patientName: "Hamza Ali",
      patientPhone: "0307-1122334",
      dentistId: 1,
      dentistName: "Dr. Ahmed",
      status: "scheduled",
      reason: "Tooth extraction",
      notes: "Upper wisdom tooth",
    },
    {
      id: "APT-1006",
      date: "2026-01-16",
      time: "10:15 AM",
      patientName: "Zainab Malik",
      patientPhone: "0315-6677889",
      dentistId: 3,
      dentistName: "Dr. Hina",
      status: "scheduled",
      reason: "Braces consultation",
      notes: "Teenage patient",
    },
    {
      id: "APT-1007",
      date: "2026-01-16",
      time: "12:00 PM",
      patientName: "Bilal Ahmed",
      patientPhone: "0300-5544332",
      dentistId: 2,
      dentistName: "Dr. Saif",
      status: "completed",
      reason: "Filling",
      notes: "Composite filling on premolar",
    },
    {
      id: "APT-1008",
      date: "2026-01-17",
      time: "09:45 AM",
      patientName: "Hira Sheikh",
      patientPhone: "0331-8899001",
      dentistId: 1,
      dentistName: "Dr. Ahmed",
      status: "checked_in",
      reason: "Crown fitting",
      notes: "Temporary crown placed last visit",
    },
    {
      id: "APT-1009",
      date: "2026-01-17",
      time: "11:00 AM",
      patientName: "Farhan Qureshi",
      patientPhone: "0322-3344556",
      dentistId: 2,
      dentistName: "Dr. Saif",
      status: "scheduled",
      reason: "Dental checkup",
      notes: "Routine examination",
    },
    {
      id: "APT-1010",
      date: "2026-01-17",
      time: "01:30 PM",
      patientName: "Maryam Iftikhar",
      patientPhone: "0340-7788990",
      dentistId: 3,
      dentistName: "Dr. Hina",
      status: "completed",
      reason: "Retainer adjustment",
      notes: "Post-braces retention",
    },
  ],

  // ✅ Idempotent init (safe with StrictMode)
  init: () => {
    const { initialized } = get();
    if (initialized) return;

    set((state) => ({
      appointments: state.seedDemoAppointments(),
      initialized: true,
    }));
  },

  // --- Actions
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),

  resetFilters: () => set({ filters: { ...defaultFilters } }),

  openDetails: (appointment) => set({ selectedAppointment: appointment }),
  closeDetails: () => set({ selectedAppointment: null }),
}));