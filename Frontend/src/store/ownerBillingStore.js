import { create } from "zustand";

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// Default filters per tab
const defaultFilters = {
  cashbook: { dateFrom: "", dateTo: "" },
  revenue: { dateFrom: "", dateTo: "", dentistId: "all" },
  commissions: { month: "", dentistId: "all" },
  labDues: { month: "", labId: "all" },
};

const sum = (arr, fn) => arr.reduce((a, x) => a + (fn ? fn(x) : x), 0);

export const useOwnerBillingStore = create((set, get) => ({
  initialized: false,

  // UI
  activeTab: "cashbook", // cashbook | revenue | commissions | labDues
  filters: { ...defaultFilters },

  modal: {
    open: false,
    type: null, // "commissionRule"
    payload: null,
  },

  // ---------- DATA (DEMO) ----------
  // Payments are the source of truth to build reports
  payments: [], // {id, date, method: "cash"|"card", amount, dentistId, dentistName}
  labBills: [], // {id, month:"YYYY-MM", labId, labName, amount}

  // Commission rules: configurable per dentist
  commissionRules: {
    defaultPercent: 20,
    byDentist: {
      // dentistId: percent
      1: 20,
      2: 18,
      3: 22,
    },
  },

  // ---------- SEED ----------
  seed: () => ({
    payments: [
      // 2026-01-15
      { id: uid(), date: "2026-01-15", method: "cash", amount: 9500, dentistId: 1, dentistName: "Dr. Ahmed" },
      { id: uid(), date: "2026-01-15", method: "card", amount: 7200, dentistId: 2, dentistName: "Dr. Saif" },
      { id: uid(), date: "2026-01-15", method: "cash", amount: 9000, dentistId: 1, dentistName: "Dr. Ahmed" },

      // 2026-01-16
      { id: uid(), date: "2026-01-16", method: "cash", amount: 12400, dentistId: 1, dentistName: "Dr. Ahmed" },
      { id: uid(), date: "2026-01-16", method: "card", amount: 9300, dentistId: 3, dentistName: "Dr. Hina" },
      { id: uid(), date: "2026-01-16", method: "cash", amount: 9000, dentistId: 1, dentistName: "Dr. Ahmed" },

      // 2026-01-17
      { id: uid(), date: "2026-01-17", method: "cash", amount: 7600, dentistId: 2, dentistName: "Dr. Saif" },
      { id: uid(), date: "2026-01-17", method: "card", amount: 8100, dentistId: 1, dentistName: "Dr. Ahmed" },
      { id: uid(), date: "2026-01-17", method: "cash", amount: 10000, dentistId: 3, dentistName: "Dr. Hina" },
    ],
    labBills: [
      { id: uid(), month: "2026-01", labId: "LAB-1", labName: "Smile Lab", amount: 28000 },
      { id: uid(), month: "2026-01", labId: "LAB-2", labName: "Precision Dental", amount: 19500 },
      { id: uid(), month: "2026-02", labId: "LAB-1", labName: "Smile Lab", amount: 31000 },
    ],
  }),

  init: () => {
    if (get().initialized) return;
    const demo = get().seed();
    set({
      payments: demo.payments,
      labBills: demo.labBills,
      initialized: true,
    });
  },

  // ---------- UI ACTIONS ----------
  setActiveTab: (tab) => set({ activeTab: tab }),

  setFilter: (tab, key, value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [tab]: { ...state.filters[tab], [key]: value },
      },
    })),

  resetFilters: (tab) =>
    set((state) => ({
      filters: { ...state.filters, [tab]: { ...defaultFilters[tab] } },
    })),

  openCommissionRuleModal: (dentist) =>
    set({
      modal: { open: true, type: "commissionRule", payload: dentist },
    }),

  closeModal: () =>
    set({
      modal: { open: false, type: null, payload: null },
    }),

  // ---------- COMMISSION RULES ----------
  setCommissionPercentForDentist: (dentistId, percent) =>
    set((state) => ({
      commissionRules: {
        ...state.commissionRules,
        byDentist: {
          ...state.commissionRules.byDentist,
          [dentistId]: Number(percent),
        },
      },
    })),

  setDefaultCommissionPercent: (percent) =>
    set((state) => ({
      commissionRules: { ...state.commissionRules, defaultPercent: Number(percent) },
    })),

  // ---------- HELPERS ----------
  _dateInRange: (date, from, to) => {
    const d = new Date(`${date}T12:00:00`);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  },

  _monthFromDate: (dateISO) => String(dateISO || "").slice(0, 7),

  // ---------- DERIVED: CASHBOOK (table + chart) ----------
  getCashbookRows: () => {
    const { payments, filters } = get();
    const { dateFrom, dateTo } = filters.cashbook;

    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59`) : null;

    const map = new Map();
    payments.forEach((p) => {
      if (!get()._dateInRange(p.date, from, to)) return;
      if (!map.has(p.date)) map.set(p.date, { date: p.date, cash: 0, card: 0 });
      const row = map.get(p.date);
      row[p.method] += p.amount;
      map.set(p.date, row);
    });

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  },

  getCashbookChart: () => {
    const rows = get().getCashbookRows();
    return rows.map((r) => ({
      date: r.date,
      cash: r.cash,
      card: r.card,
      total: r.cash + r.card,
    }));
  },

  // ---------- DERIVED: REVENUE (table + chart) ----------
  getRevenueRows: () => {
    const { payments, filters } = get();
    const { dateFrom, dateTo, dentistId } = filters.revenue;

    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59`) : null;

    const filtered = payments.filter((p) => {
      if (!get()._dateInRange(p.date, from, to)) return false;
      if (dentistId !== "all" && String(p.dentistId) !== String(dentistId)) return false;
      return true;
    });

    // table: keep row-level payments (simple)
    return filtered
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((p) => ({
        id: p.id,
        date: p.date,
        dentistId: p.dentistId,
        dentistName: p.dentistName,
        method: p.method,
        amount: p.amount,
      }));
  },

  getRevenueByDentistChart: () => {
    const rows = get().getRevenueRows();
    const map = new Map();
    rows.forEach((r) => {
      const key = String(r.dentistId);
      if (!map.has(key)) map.set(key, { dentistName: r.dentistName, revenue: 0 });
      map.get(key).revenue += r.amount;
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  },

  // ---------- DERIVED: COMMISSIONS (rules + payouts) ----------
  getCommissionRows: () => {
    const { payments, filters, commissionRules } = get();
    const { month, dentistId } = filters.commissions;

    const targetMonth = month || ""; // empty => all months
    const byDentist = new Map();

    payments.forEach((p) => {
      const m = get()._monthFromDate(p.date);
      if (targetMonth && m !== targetMonth) return;
      if (dentistId !== "all" && String(p.dentistId) !== String(dentistId)) return;

      const key = String(p.dentistId);
      if (!byDentist.has(key)) {
        const percent =
          commissionRules.byDentist[p.dentistId] ?? commissionRules.defaultPercent;

        byDentist.set(key, {
          dentistId: p.dentistId,
          dentistName: p.dentistName,
          month: targetMonth || m,
          revenue: 0,
          percent,
        });
      }

      byDentist.get(key).revenue += p.amount;
    });

    const rows = Array.from(byDentist.values()).map((r) => ({
      ...r,
      commission: Math.round((r.revenue * r.percent) / 100),
    }));

    return rows.sort((a, b) => b.commission - a.commission);
  },

  getCommissionChart: () => {
    const rows = get().getCommissionRows();
    return rows.map((r) => ({
      dentistName: r.dentistName,
      commission: r.commission,
      revenue: r.revenue,
      percent: r.percent,
    }));
  },

  // ---------- DERIVED: LAB DUES (table + chart) ----------
  getLabDuesRows: () => {
    const { labBills, filters } = get();
    const { month, labId } = filters.labDues;

    return labBills.filter((b) => {
      if (month && b.month !== month) return false;
      if (labId !== "all" && b.labId !== labId) return false;
      return true;
    });
  },

  getLabDuesChart: () => {
    const rows = get().getLabDuesRows();
    const map = new Map();
    rows.forEach((r) => {
      const key = r.labId;
      if (!map.has(key)) map.set(key, { labName: r.labName, dues: 0 });
      map.get(key).dues += r.amount;
    });
    return Array.from(map.values()).sort((a, b) => b.dues - a.dues);
  },

  // ---------- SUMMARY CARDS (optional) ----------
  getSummaryForTab: () => {
    const tab = get().activeTab;

    if (tab === "cashbook") {
      const rows = get().getCashbookRows();
      const cash = sum(rows, (r) => r.cash);
      const card = sum(rows, (r) => r.card);
      return { a: cash, b: card, total: cash + card };
    }

    if (tab === "revenue") {
      const rows = get().getRevenueRows();
      const total = sum(rows, (r) => r.amount);
      return { total, count: rows.length };
    }

    if (tab === "commissions") {
      const rows = get().getCommissionRows();
      const payout = sum(rows, (r) => r.commission);
      const revenue = sum(rows, (r) => r.revenue);
      return { payout, revenue };
    }

    if (tab === "labDues") {
      const rows = get().getLabDuesRows();
      const total = sum(rows, (r) => r.amount);
      return { total, count: rows.length };
    }

    return {};
  },
}));