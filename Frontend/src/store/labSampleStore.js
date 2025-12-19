import { create } from "zustand";

export const useLabSampleStore = create((set, get) => ({
  samples: [
    {
      id: "LS-1001",
      mr: 1,
      patientName: "Ali Raza",
      dentist: "Dr. Ahmed",
      lab: "Smile Lab",
      teeth: ["14", "15"],
      sentDate: "2024-12-15",
      receivedDate: null,
      status: "Sent",
      paymentStatus: "Pending",
      comments: "Shade A2",
    },
    {
      id: "LS-1002",
      mr: 3,
      patientName: "Hina Malik",
      dentist: "Dr. Saif",
      lab: "Dental Tech",
      teeth: ["26"],
      sentDate: "2024-12-12",
      receivedDate: null,
      status: "In Process",
      paymentStatus: "Paid",
      comments: "",
    },
  ],

addSample: (sample) =>
  set((state) => ({
    samples: [...state.samples, sample],
  })),

  updateStatus: (id, status) =>
    set((state) => ({
      samples: state.samples.map((s) =>
        s.id === id ? { ...s, status } : s
      ),
    })),

  markDelivered: (id) =>
    set((state) => ({
      samples: state.samples.map((s) =>
        s.id === id
          ? {
              ...s,
              status: "Delivered",
              receivedDate: new Date().toISOString().split("T")[0],
            }
          : s
      ),
    })),

  getStats: () => {
    const samples = get().samples;
    return {
      total: samples.length,
      sent: samples.filter((s) => s.status === "Sent").length,
      inProcess: samples.filter((s) => s.status === "In Process").length,
      ready: samples.filter((s) => s.status === "Ready").length,
    };
  },

  updateSample: (id, updates) =>
  set((state) => ({
    samples: state.samples.map((s) =>
      s.id === id ? { ...s, ...updates } : s
    ),
  })),

deleteSample: (id) =>
  set((state) => ({
    samples: state.samples.filter((s) => s.id !== id),
  })),
}));