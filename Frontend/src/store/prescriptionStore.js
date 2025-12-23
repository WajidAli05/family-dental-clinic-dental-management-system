import { create } from "zustand";

export const usePrescriptionStore = create((set) => ({
  prescription: {
    teeth: [],
    procedure: "",
    notes: "",
  },

  setTeeth: (teeth) =>
    set((state) => ({
      prescription: { ...state.prescription, teeth },
    })),

  setProcedure: (procedure) =>
    set((state) => ({
      prescription: { ...state.prescription, procedure },
    })),

  setNotes: (notes) =>
    set((state) => ({
      prescription: { ...state.prescription, notes },
    })),

  resetPrescription: () =>
    set({
      prescription: {
        teeth: [],
        procedure: "",
        notes: "",
      },
    }),
}));