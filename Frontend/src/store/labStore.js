import { create } from "zustand";

export const useLabStore = create((set) => ({
  stats: {
    total: 124,
    inProcess: 45,
    ready: 72,
    recent: 7,
  },

  samples: [
    {
      id: "SMP-882-ZC",
      type: "Zirconia Crown",
      tooth: "#14, #15",
      date: "Oct 24, 2023",
      status: "in-process",
      note: "",
    },
    {
      id: "SMP-883-EM",
      type: "E-Max Veneer",
      tooth: "#8, #9",
      date: "Oct 25, 2023",
      status: "ready",
      note: "",
    },
    {
      id: "SMP-889-IMP",
      type: "Implant Abutment",
      tooth: "#30",
      date: "Oct 27, 2023",
      status: "queued",
      note: "",
    },
  ],

  addNote: (id, note) =>
    set((state) => ({
      samples: state.samples.map((s) =>
        s.id === id ? { ...s, note } : s
      ),
    })),

  markReady: (id) =>
    set((state) => ({
      samples: state.samples.map((s) =>
        s.id === id ? { ...s, status: "ready" } : s
      ),
    })),

  startWork: (id) =>
    set((state) => ({
      samples: state.samples.map((s) =>
        s.id === id ? { ...s, status: "in-process" } : s
      ),
    })),
}));