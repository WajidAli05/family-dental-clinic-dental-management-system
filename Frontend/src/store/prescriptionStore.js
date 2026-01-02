import { create } from "zustand";

export const usePrescriptionStore = create((set) => ({
  patientType: null,

  selectedTeeth: [],

  diagnosis: "",
  treatment: "",
  clinicalFinding: "",
  visualStatus: "none", // none | planned | progress | completed | urgent

  notes: "",

  setPatientType: (type) => set({ patientType: type }),

  toggleTooth: (tooth) =>
    set((state) => ({
      selectedTeeth: state.selectedTeeth.includes(tooth)
        ? state.selectedTeeth.filter((t) => t !== tooth)
        : [...state.selectedTeeth, tooth],
    })),

  setDiagnosis: (val) => set({ diagnosis: val }),
  setTreatment: (val) => set({ treatment: val }),
  setClinicalFinding: (val) => set({ clinicalFinding: val }),
  setVisualStatus: (val) => set({ visualStatus: val }),
  setNotes: (val) => set({ notes: val }),

  reset: () =>
    set({
      patientType: null,
      selectedTeeth: [],
      diagnosis: "",
      treatment: "",
      clinicalFinding: "",
      visualStatus: "none",
      notes: "",
    }),
}));