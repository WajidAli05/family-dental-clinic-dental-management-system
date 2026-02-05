import { create } from "zustand";
import { receptionistBillingApi } from "@/lib/receptionistBillingApi";

export const useBillingStore = create((set, get) => ({
  invoices: [
    {
      id: "INV-1001",
      mr: 1,
      patientName: "Ali Raza",
      date: "2024-12-15",
      totalAmount: 15000,
      status: "Partial",
      payments: [
        {
          id: "PAY-1",
          amount: 5000,
          mode: "Cash",
          date: "2024-12-15",
        },
      ],
    },
  ],

  /* ➕ ADD PAYMENT */
  addPayment: (invoiceId, payment) =>
    set((state) => ({
      invoices: state.invoices.map((inv) => {
        if (inv.id !== invoiceId) return inv;

        const updatedPayments = [...inv.payments, payment];
        const paid = updatedPayments.reduce(
          (sum, p) => sum + p.amount,
          0
        );

        return {
          ...inv,
          payments: updatedPayments,
          status:
            paid >= inv.totalAmount
              ? "Paid"
              : paid > 0
              ? "Partial"
              : "Pending",
        };
      }),
    })),

  /* ✏️ EDIT / REVERT PAYMENT */
  updatePayment: (invoiceId, paymentId, updatedAmount) =>
    set((state) => ({
      invoices: state.invoices.map((inv) => {
        if (inv.id !== invoiceId) return inv;

        const updatedPayments = inv.payments.map((p) =>
          p.id === paymentId
            ? { ...p, amount: updatedAmount }
            : p
        );

        const paid = updatedPayments.reduce(
          (sum, p) => sum + p.amount,
          0
        );

        return {
          ...inv,
          payments: updatedPayments,
          status:
            paid >= inv.totalAmount
              ? "Paid"
              : paid > 0
              ? "Partial"
              : "Pending",
        };
      }),
    })),

  /* ❌ REMOVE PAYMENT (FULL REVERT) */
  deletePayment: (invoiceId, paymentId) =>
    set((state) => ({
      invoices: state.invoices.map((inv) => {
        if (inv.id !== invoiceId) return inv;

        const updatedPayments = inv.payments.filter(
          (p) => p.id !== paymentId
        );

        const paid = updatedPayments.reduce(
          (sum, p) => sum + p.amount,
          0
        );

        return {
          ...inv,
          payments: updatedPayments,
          status:
            paid >= inv.totalAmount
              ? "Paid"
              : paid > 0
              ? "Partial"
              : "Pending",
        };
      }),
    })),

  /* 📊 STATS */
  getStats: () => {
    const invoices = get().invoices;
    return {
      pending: invoices.filter((i) => i.status === "Pending").length,
      partial: invoices.filter((i) => i.status === "Partial").length,
      paid: invoices.filter((i) => i.status === "Paid").length,
      outstanding: invoices.reduce(
        (sum, i) =>
          sum +
          (i.totalAmount -
            i.payments.reduce((p, c) => p + c.amount, 0)),
        0
      ),
    };
  },

  getPaymentsByInvoice: (invoiceId) => {
  const invoice = get().invoices.find(
    (inv) => inv.id === invoiceId
  );
  return invoice ? invoice.payments : [];
},

  /* ✅ NEW backend state */
  loading: false,
  error: null,
  stats: null,          // merged stats (invoice + lab)
  labBills: null,       // { month, rows, total }

  fetchInvoices: async ({ q, status } = {}) => {
    try {
      set({ loading: true, error: null });
      const res = await receptionistBillingApi.listInvoices({
        q,
        status: status && status !== "All" ? status : undefined,
      });
      set({ invoices: res.data || [], loading: false });
      return res.data || [];
    } catch (e) {
      set({ loading: false, error: e.message });
      return [];
    }
  },

  fetchBillingStats: async ({ month } = {}) => {
    try {
      const res = await receptionistBillingApi.getStats(month ? { month } : undefined);
      set({ stats: res.data });
      return res.data;
    } catch (e) {
      set({ error: e.message });
      return null;
    }
  },

  fetchLabBills: async ({ month } = {}) => {
    try {
      const res = await receptionistBillingApi.listLabBills(month ? { month } : undefined);
      set({ labBills: res.data });
      return res.data;
    } catch (e) {
      set({ error: e.message });
      return null;
    }
  },

  // backend payment ops update the invoice in place
  createPayment: async (invoiceId, payment) => {
    const res = await receptionistBillingApi.addPayment(invoiceId, payment);
    set((state) => ({
      invoices: state.invoices.map((inv) => (inv.id === invoiceId ? res.data : inv)),
    }));
    return res.data;
  },

  editPayment: async (invoiceId, paymentId, amount) => {
    const res = await receptionistBillingApi.updatePayment(invoiceId, paymentId, { amount });
    set((state) => ({
      invoices: state.invoices.map((inv) => (inv.id === invoiceId ? res.data : inv)),
    }));
    return res.data;
  },

  removePayment: async (invoiceId, paymentId) => {
    const res = await receptionistBillingApi.deletePayment(invoiceId, paymentId);
    set((state) => ({
      invoices: state.invoices.map((inv) => (inv.id === invoiceId ? res.data : inv)),
    }));
    return res.data;
  },

  createInvoice: async (payload) => {
  try {
    set({ loading: true, error: null });
    const res = await receptionistBillingApi.createInvoice(payload); // { success, data }

    // insert new invoice at top
    set((state) => ({
      invoices: [res.data, ...(state.invoices || [])],
      loading: false,
    }));

    return res.data;
  } catch (e) {
    set({ loading: false, error: e.message });
    throw e;
  }
},
}));