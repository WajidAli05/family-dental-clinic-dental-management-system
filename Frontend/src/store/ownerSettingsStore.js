import { create } from "zustand";

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const useOwnerSettingsStore = create((set, get) => ({
  initialized: false,
  activeTab: "clinic",

  clinic: {
    name: "Family Dental Clinic",
    logoUrl: "",
    phone: "051-1234567",
    whatsapp: "0301-1234567",
    address: "Harley Street, Saddar, Rawalpindi",
    timings: {
      monToSat: "10:00 AM – 09:00 PM",
      sunday: "Closed",
    },
  },

  paymentModes: [],
  labSettings: {
    defaultTurnaroundDays: 3,
    allowUrgent: true,
    urgentFee: 500,
    defaultStatus: "created",
  },

  commissionSettings: {
    defaultDentistCommissionPercent: 30,
    allowCustomOverrides: true,
    rounding: "nearest", // nearest | floor | ceil
  },

  seed: () => ({
    paymentModes: [
      { id: "PM-1", key: "cash", label: "Cash", active: true },
      { id: "PM-2", key: "card", label: "Card", active: true },
      { id: "PM-3", key: "online", label: "Online Transfer", active: true },
    ],
  }),

  init: () => {
    if (get().initialized) return;
    const demo = get().seed();
    set({
      paymentModes: demo.paymentModes,
      initialized: true,
    });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  // ---- Clinic Info
  updateClinic: (patch) =>
    set((state) => ({
      clinic: { ...state.clinic, ...patch },
    })),

  // ---- Payment Modes
  upsertPaymentMode: (mode) => {
    const m = {
      id: mode.id || `PM-${uid()}`,
      key: String(mode.key || "").trim(),
      label: String(mode.label || "").trim(),
      active: mode.active ?? true,
    };

    if (!m.key || !m.label) return;

    set((state) => {
      const exists = state.paymentModes.some((x) => x.id === m.id);
      if (exists) {
        return {
          paymentModes: state.paymentModes.map((x) => (x.id === m.id ? { ...x, ...m } : x)),
        };
      }
      // prevent duplicate keys
      if (state.paymentModes.some((x) => x.key === m.key)) return state;

      return { paymentModes: [...state.paymentModes, m] };
    });
  },

  deletePaymentMode: (id) =>
    set((state) => ({
      paymentModes: state.paymentModes.filter((x) => x.id !== id),
    })),

  togglePaymentMode: (id) =>
    set((state) => ({
      paymentModes: state.paymentModes.map((x) =>
        x.id === id ? { ...x, active: !x.active } : x
      ),
    })),

  // ---- Lab settings
  updateLabSettings: (patch) =>
    set((state) => ({
      labSettings: { ...state.labSettings, ...patch },
    })),

  // ---- Commission settings
  updateCommissionSettings: (patch) =>
    set((state) => ({
      commissionSettings: { ...state.commissionSettings, ...patch },
    })),
}));