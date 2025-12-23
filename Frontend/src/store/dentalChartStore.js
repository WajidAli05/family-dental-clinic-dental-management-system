import { create } from "zustand";

export const useDentalChartStore = create((set, get) => ({
  selectedTeeth: [], // e.g. ["#11", "#12"]

  toggleTooth: (tooth) => {
    const { selectedTeeth } = get();

    set({
      selectedTeeth: selectedTeeth.includes(tooth)
        ? selectedTeeth.filter((t) => t !== tooth)
        : [...selectedTeeth, tooth],
    });
  },

  resetChart: () => set({ selectedTeeth: [] }),
}));