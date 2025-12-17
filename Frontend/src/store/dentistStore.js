import { create } from "zustand";

export const useDentistStore = create(() => ({
  dentists: [
    {
      id: 1,
      name: "Dr. Ahmed",
      specialization: "Endodontist",
      available: true,
    },
    {
      id: 2,
      name: "Dr. Saif",
      specialization: "General Dentist",
      available: true,
    },
    {
      id: 3,
      name: "Dr. Hina",
      specialization: "Orthodontist",
      available: false,
    },
  ],

  getActiveDentists: () => {
    return [
      {
        id: 1,
        name: "Dr. Ahmed",
        specialization: "Endodontist",
        available: true,
      },
      {
        id: 2,
        name: "Dr. Saif",
        specialization: "General Dentist",
        available: true,
      },
    ];
  },
}));