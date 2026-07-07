// src/store/ownerBillingStore.js
import { create } from "zustand";
import { ownerApi } from "@/lib/ownerApi";

const localISODate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

const startOfWeek = () => {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

const startOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`;
};

export const useOwnerBillingStore = create((set, get) => ({
  activeTab: "cashbook",

  filters: {
    cashbook: { from: "", to: "", q: "", page: 1 },
    commissions: { from: "", to: "" },
  },

  // --- Cashbook ---
  cashbook: { stats: null, transactions: { rows: [], total: 0, page: 1, pages: 1 }, trend: [], loading: false, error: null },

  // --- Commissions ---
  commissions: { rows: [], loading: false, error: null },
  ownerPayments: { rows: [], total: 0, page: 1, pages: 1, loading: false },

  // --- Lab Dues ---
  labDues: { rows: [], loading: false, error: null },
  labBills: {},
  labBillsLoading: false,

  // --- Modals & Drawers ---
  recordPaymentModal: { open: false, type: null, dentist: null, lab: null, loading: false, error: null },
  billsDrawer: { open: false, lab: null },
  ownerPaymentsDrawer: { open: false, dentist: null },

  // =====================================================
  // ACTIONS
  // =====================================================

  setActiveTab: (tab) => set({ activeTab: tab }),

  setFilter: (tab, key, value) =>
    set((s) => ({ filters: { ...s.filters, [tab]: { ...s.filters[tab], [key]: value } } })),

  setQuickRange: (range) => {
    const today = localISODate();
    const from =
      range === "today"  ? today :
      range === "week"   ? startOfWeek() :
      range === "month"  ? startOfMonth() : "";
    set((s) => ({ filters: { ...s.filters, cashbook: { ...s.filters.cashbook, from, to: today } } }));
  },

  // --- Cashbook ---
  fetchCashbook: async () => {
    const { from, to, q, page } = get().filters.cashbook;
    set((s) => ({ cashbook: { ...s.cashbook, loading: true, error: null } }));
    try {
      const res = await ownerApi.getFinanceCashbook({ from: from || undefined, to: to || undefined, q: q || undefined, page: page || 1, limit: 50 });
      set({ cashbook: { stats: res.data?.stats || null, transactions: res.data?.transactions || { rows: [], total: 0, page: 1, pages: 1 }, trend: res.data?.trend || [], loading: false, error: null } });
    } catch (e) {
      set((s) => ({ cashbook: { ...s.cashbook, loading: false, error: e.message } }));
    }
  },

  // --- Commissions ---
  fetchCommissions: async () => {
    const { from, to } = get().filters.commissions;
    set((s) => ({ commissions: { ...s.commissions, loading: true, error: null } }));
    try {
      const res = await ownerApi.getFinanceCommissions({ from: from || undefined, to: to || undefined });
      set({ commissions: { rows: Array.isArray(res.data) ? res.data : [], loading: false, error: null } });
    } catch (e) {
      set((s) => ({ commissions: { ...s.commissions, loading: false, error: e.message } }));
    }
  },

  fetchOwnerPayments: async (dentistId) => {
    set((s) => ({ ownerPayments: { ...s.ownerPayments, loading: true } }));
    try {
      const res = await ownerApi.getFinanceOwnerPayments({ dentistId: dentistId || undefined, limit: 100 });
      set({ ownerPayments: { rows: res.data || [], total: res.total || 0, page: res.page || 1, pages: res.pages || 1, loading: false } });
    } catch {
      set((s) => ({ ownerPayments: { ...s.ownerPayments, loading: false } }));
    }
  },

  recordOwnerPayment: async (body) => {
    set((s) => ({ recordPaymentModal: { ...s.recordPaymentModal, loading: true, error: null } }));
    try {
      await ownerApi.recordOwnerPayment(body);
      set((s) => ({ recordPaymentModal: { ...s.recordPaymentModal, loading: false } }));
      await get().fetchCommissions();
      const dentistId = get().ownerPaymentsDrawer.dentist?.publicId;
      if (dentistId) await get().fetchOwnerPayments(dentistId);
    } catch (e) {
      set((s) => ({ recordPaymentModal: { ...s.recordPaymentModal, loading: false, error: e.message } }));
      throw e;
    }
  },

  // --- Lab Dues ---
  fetchLabDues: async () => {
    set((s) => ({ labDues: { ...s.labDues, loading: true, error: null } }));
    try {
      const res = await ownerApi.getFinanceLabDues();
      set({ labDues: { rows: Array.isArray(res.data) ? res.data : [], loading: false, error: null } });
    } catch (e) {
      set((s) => ({ labDues: { ...s.labDues, loading: false, error: e.message } }));
    }
  },

  fetchLabBillsByLab: async (labId) => {
    set({ labBillsLoading: true });
    try {
      const res = await ownerApi.getFinanceLabBillsByLab(labId, { limit: 100 });
      set((s) => ({ labBills: { ...s.labBills, [labId]: res.data || [] }, labBillsLoading: false }));
    } catch {
      set({ labBillsLoading: false });
    }
  },

  recordLabPayment: async (body) => {
    set((s) => ({ recordPaymentModal: { ...s.recordPaymentModal, loading: true, error: null } }));
    try {
      await ownerApi.recordLabPayment(body);
      set((s) => ({ recordPaymentModal: { ...s.recordPaymentModal, loading: false } }));
      await get().fetchLabDues();
      const labId = get().billsDrawer.lab?.labId;
      if (labId) await get().fetchLabBillsByLab(labId);
    } catch (e) {
      set((s) => ({ recordPaymentModal: { ...s.recordPaymentModal, loading: false, error: e.message } }));
      throw e;
    }
  },

  // --- Modal/Drawer helpers ---
  openRecordPaymentModal: (type, data) =>
    set({ recordPaymentModal: { open: true, type, dentist: type === "commission" ? data : null, lab: type === "lab" ? data : null, loading: false, error: null } }),

  closeRecordPaymentModal: () =>
    set({ recordPaymentModal: { open: false, type: null, dentist: null, lab: null, loading: false, error: null } }),

  openBillsDrawer: (lab) => {
    get().fetchLabBillsByLab(lab.labId);
    set({ billsDrawer: { open: true, lab } });
  },
  closeBillsDrawer: () => set({ billsDrawer: { open: false, lab: null } }),

  openOwnerPaymentsDrawer: (dentist) => {
    get().fetchOwnerPayments(dentist.publicId);
    set({ ownerPaymentsDrawer: { open: true, dentist } });
  },
  closeOwnerPaymentsDrawer: () => set({ ownerPaymentsDrawer: { open: false, dentist: null } }),
}));
