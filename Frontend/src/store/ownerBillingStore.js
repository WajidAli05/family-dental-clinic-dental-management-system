// src/store/ownerBillingStore.js
import { create } from "zustand";
import { ownerApi } from "@/lib/ownerApi";

// Default filters per tab
const defaultFilters = {
  cashbook: { dateFrom: "", dateTo: "" },
  revenue: { dateFrom: "", dateTo: "", dentistId: "all" },
  commissions: { month: "", dentistId: "all" },
  labDues: { month: "", labId: "all" },
};

const sum = (arr, fn) => (arr || []).reduce((a, x) => a + (fn ? fn(x) : x), 0);

export const useOwnerBillingStore = create((set, get) => ({
  initialized: false,
  loading: false,
  error: null,

  // UI
  activeTab: "cashbook", // cashbook | revenue | commissions | labDues
  filters: { ...defaultFilters },

  modal: { open: false, type: null, payload: null }, // "commissionRule"

  // ---------- DATA ----------
  dentists: [], // [{id,name}] for dropdowns
  labs: [], // [{id,name}] for dropdowns

  payments: [], // {id, date, method:"cash"|"card", amount, dentistId, dentistName}
  labBills: [], // {id, month:"YYYY-MM", labId, labName, amount, paid?}

  // centralized A/R
  arSummary: {
    totalBilled: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    invoiceCount: 0,
    outstandingCount: 0,
  },

  // Commission rules
  commissionRules: {
    defaultPercent: 20,
    byDentist: {}, // plain object (not Map)
  },

  // ---------- INIT ----------
  init: async () => {
    if (get().initialized) return;

    set({ initialized: true, loading: true, error: null });

    try {
      await Promise.all([
        get().fetchDentists(),
        get().fetchLabs(),
        get().fetchPayments(),
        get().fetchLabBills(),
        get().fetchCommissionRules(),
        get().fetchARSummary(),
      ]);
      set({ loading: false });
    } catch (e) {
      set({ loading: false, error: e?.message || "Failed to load billing data" });
    }
  },

  // ---------- FETCHERS ----------
  fetchDentists: async () => {
    try {
      const res = await ownerApi.getDentists();
      const rows = Array.isArray(res?.data) ? res.data : [];
      // normalize keys
      set({
        dentists: rows.map((d) => ({
          id: d.id ?? d.publicId ?? d._id ?? "",
          name: d.name ?? d.fullName ?? "Dentist",
        })),
      });
    } catch {
      set({ dentists: [] });
    }
  },

  fetchLabs: async () => {
    try {
      const res = await ownerApi.getLabs();
      const rows = Array.isArray(res?.data) ? res.data : [];
      set({
        labs: rows.map((l) => ({
          id: l.id ?? l.publicId ?? l._id ?? "",
          name: l.name ?? l.labName ?? "Lab",
        })),
      });
    } catch {
      set({ labs: [] });
    }
  },

  fetchPayments: async () => {
    const res = await ownerApi.getBillingPayments();
    set({ payments: res?.data || [] });
  },

  fetchLabBills: async () => {
    const res = await ownerApi.getBillingLabBills();
    set({ labBills: res?.data || [] });
  },

  fetchCommissionRules: async () => {
    const res = await ownerApi.getCommissionRules();
    const data = res?.data || { defaultPercent: 20, byDentist: {} };

    // ✅ make sure byDentist is a plain object (backend might send Map-ish)
    const byDentist =
      data?.byDentist && typeof data.byDentist === "object"
        ? Array.isArray(data.byDentist)
          ? {}
          : data.byDentist
        : {};

    set({
      commissionRules: {
        defaultPercent: Number(data?.defaultPercent ?? 20),
        byDentist,
      },
    });
  },

  fetchARSummary: async () => {
    const { dateFrom, dateTo } = get().filters.cashbook || {};
    const res = await ownerApi.getARSummary({ dateFrom, dateTo });

    set({
      arSummary: res?.data || {
        totalBilled: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        invoiceCount: 0,
        outstandingCount: 0,
      },
    });
  },

  // ---------- UI ACTIONS ----------
  setActiveTab: (tab) => set({ activeTab: tab }),

  setFilter: (tab, key, value) =>
    set((state) => ({
      filters: { ...state.filters, [tab]: { ...state.filters[tab], [key]: value } },
    })),

  resetFilters: (tab) =>
    set((state) => ({
      filters: { ...state.filters, [tab]: { ...defaultFilters[tab] } },
    })),

  openCommissionRuleModal: (dentist) =>
    set({ modal: { open: true, type: "commissionRule", payload: dentist } }),

  closeModal: () => set({ modal: { open: false, type: null, payload: null } }),

  // ---------- COMMISSION RULES (persisted) ----------
  setCommissionPercentForDentist: async (dentistId, percent) => {
    const did = String(dentistId ?? "").trim();
    const p = Math.max(0, Math.min(100, Number(percent)));

    // optimistic
    set((state) => ({
      commissionRules: {
        ...state.commissionRules,
        byDentist: { ...(state.commissionRules.byDentist || {}), [did]: p },
      },
    }));

    try {
      await ownerApi.updateCommissionRules({ dentistId: did, percent: p });
    } catch (e) {
      await get().fetchCommissionRules().catch(() => {});
      throw e;
    }
  },

  setDefaultCommissionPercent: async (percent) => {
    const p = Math.max(0, Math.min(100, Number(percent)));

    set((state) => ({
      commissionRules: { ...state.commissionRules, defaultPercent: p },
    }));

    try {
      await ownerApi.updateCommissionRules({ defaultPercent: p });
    } catch (e) {
      await get().fetchCommissionRules().catch(() => {});
      throw e;
    }
  },

  // ---------- HELPERS ----------
  _dateInRange: (date, from, to) => {
    const d = new Date(`${date}T12:00:00`);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  },

  _monthFromDate: (dateISO) => String(dateISO || "").slice(0, 7),

  // ---------- DERIVED: CASHBOOK ----------
  getCashbookRows: () => {
    const { payments, filters } = get();
    const { dateFrom, dateTo } = filters.cashbook;

    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59`) : null;

    const map = new Map();
    (payments || []).forEach((p) => {
      if (!get()._dateInRange(p.date, from, to)) return;
      if (!map.has(p.date)) map.set(p.date, { date: p.date, cash: 0, card: 0 });

      const row = map.get(p.date);
      row[p.method] = (row[p.method] || 0) + Number(p.amount || 0);
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

  // ---------- DERIVED: REVENUE ----------
  getRevenueRows: () => {
    const { payments, filters } = get();
    const { dateFrom, dateTo, dentistId } = filters.revenue;

    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59`) : null;

    const filtered = (payments || []).filter((p) => {
      if (!get()._dateInRange(p.date, from, to)) return false;
      if (dentistId !== "all" && String(p.dentistId) !== String(dentistId)) return false;
      return true;
    });

    return filtered
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((p) => ({
        id: p.id,
        period: p.date,
        dentistName: p.dentistName,
        revenue: Number(p.amount || 0),

        // export shape
        date: p.date,
        dentistId: p.dentistId,
        method: p.method,
        amount: Number(p.amount || 0),
      }));
  },

  getRevenueByDentistChart: () => {
    const rows = get().getRevenueRows();
    const map = new Map();
    rows.forEach((r) => {
      const key = String(r.dentistId || r.dentistName || "");
      if (!map.has(key)) map.set(key, { dentistName: r.dentistName, revenue: 0 });
      map.get(key).revenue += Number(r.amount || 0);
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  },

  // ---------- DERIVED: COMMISSIONS ----------
  getCommissionRows: () => {
    const { payments, filters, commissionRules } = get();
    const { month, dentistId } = filters.commissions;

    const targetMonth = month || "";
    const byDentist = new Map();

    (payments || []).forEach((p) => {
      const m = get()._monthFromDate(p.date);
      if (targetMonth && m !== targetMonth) return;
      if (dentistId !== "all" && String(p.dentistId) !== String(dentistId)) return;

      const key = String(p.dentistId || "");
      if (!byDentist.has(key)) {
        const percent =
          (commissionRules?.byDentist || {})[key] ??
          commissionRules?.defaultPercent ??
          20;

        byDentist.set(key, {
          dentistId: p.dentistId,
          dentistName: p.dentistName,
          month: targetMonth || m,
          revenue: 0,
          percent,
        });
      }

      byDentist.get(key).revenue += Number(p.amount || 0);
    });

    const rows = Array.from(byDentist.values()).map((r) => ({
      ...r,
      commission: Math.round((Number(r.revenue || 0) * Number(r.percent || 0)) / 100),
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

  // ---------- DERIVED: LAB DUES ----------
  getLabDuesRows: () => {
    const { labBills, filters } = get();
    const { month, labId } = filters.labDues;

    return (labBills || [])
      .filter((b) => {
        if (month && b.month !== month) return false;
        if (labId !== "all" && String(b.labId) !== String(labId)) return false;
        return true;
      })
      .map((b) => ({ ...b, paid: !!b.paid }));
  },

  getLabDuesChart: () => {
    const rows = get().getLabDuesRows();
    const map = new Map();
    rows.forEach((r) => {
      const key = String(r.labId);
      if (!map.has(key)) map.set(key, { labName: r.labName, dues: 0 });
      map.get(key).dues += Number(r.amount || 0);
    });
    return Array.from(map.values()).sort((a, b) => b.dues - a.dues);
  },

  // ---------- SUMMARY ----------
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

  // ---------- KPIs ----------
  getFinancialKPIs: () => {
    const cashbookRows = get().getCashbookRows();
    const collectionsCash = sum(cashbookRows, (r) => r.cash);
    const collectionsCard = sum(cashbookRows, (r) => r.card);
    const collections = collectionsCash + collectionsCard;

    const commissionsRows = get().getCommissionRows();
    const commissionPayout = sum(commissionsRows, (r) => r.commission);

    const labDuesRows = get().getLabDuesRows();
    const labPayables = sum(labDuesRows, (r) => r.amount);

    const ar = get().arSummary || {};
    const totalBilled = Number(ar.totalBilled || 0);
    const totalPaid = Number(ar.totalPaid || 0);
    const totalOutstanding = Number(ar.totalOutstanding || 0);

    const estimatedNet = Math.round(collections - commissionPayout - labPayables);

    return {
      collections,
      collectionsCash,
      collectionsCard,
      totalBilled,
      totalPaid,
      totalOutstanding,
      commissionPayout,
      labPayables,
      estimatedNet,
      invoiceCount: Number(ar.invoiceCount || 0),
      outstandingCount: Number(ar.outstandingCount || 0),
    };
  },
}));