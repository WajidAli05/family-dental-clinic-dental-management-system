import { create } from "zustand";

export const usePatientStore = create((set) => ({
  patients: [
    {
      id: "PT-001",
      name: "Ali Raza",
      phone: "+92 300 1112233",
      email: "ali.raza@gmail.com",
      age: 32,
      gender: "Male",
      lastVisit: "2024-06-12",
      status: "Active",
    },
    {
      id: "PT-002",
      name: "Sara Khan",
      phone: "+92 301 4455667",
      email: "sara.khan@gmail.com",
      age: 27,
      gender: "Female",
      lastVisit: "2024-06-10",
      status: "Active",
    },
    {
      id: "PT-003",
      name: "Hassan Ahmed",
      phone: "+92 333 7788990",
      email: "hassan@gmail.com",
      age: 41,
      gender: "Male",
      lastVisit: "2024-05-30",
      status: "Inactive",
    },
  ],

  addPatient: (patient) =>
    set((state) => ({
      patients: [...state.patients, patient],
    })),

  updatePatient: (updatedPatient) =>
    set((state) => ({
      patients: state.patients.map((p) =>
        p.id === updatedPatient.id ? updatedPatient : p
      ),
    })),

  getPatientById: (id) =>
    get().patients.find((p) => p.id === id),
}));