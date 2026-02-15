// pages/receptionist/Billing.jsx
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Wavify from "react-wavify";

import { useBillingStore } from "@/store/billingStore";

import BillingStats from "@/components/receptionist/BillingStats";
import InvoiceFilters from "@/components/receptionist/InvoiceFilters";
import InvoiceTable from "@/components/receptionist/InvoiceTable";
import ReceivePaymentModal from "@/components/receptionist/ReceivePaymentModal";
import PaymentHistory from "@/components/receptionist/PaymentHistory";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import CreateInvoiceModal from "@/components/receptionist/CreateInvoiceModal";

import { printInvoice } from "@/utils/printInvoice";

/**
 * ✅ Compute stats from live invoices so cards update immediately
 * Keeps labTotal/month values from backend stats if present.
 */
const computeInvoiceStats = (rows = [], merged = null) => {
  let pending = 0;
  let partial = 0;
  let paid = 0;
  let outstanding = 0;

  for (const inv of rows) {
    const total = Number(inv.total ?? inv.totalAmount ?? 0) || 0;

    const paidAmt =
      Number(inv.paid ?? inv.paidAmount ?? 0) ||
      (Array.isArray(inv.payments)
        ? inv.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
        : 0);

    const status =
      inv.status || (paidAmt >= total ? "Paid" : paidAmt > 0 ? "Partial" : "Pending");

    if (status === "Pending") pending += 1;
    else if (status === "Partial") partial += 1;
    else if (status === "Paid") paid += 1;

    outstanding += Math.max(0, total - paidAmt);
  }

  const labTotal = Number(merged?.labTotal ?? 0) || 0;

  return {
    ...(merged || {}),
    pending,
    partial,
    paid,
    outstanding,
    labTotal,
    grandOutstanding: outstanding + labTotal,
  };
};

const Billing = () => {
  const {
    invoices,

    // ✅ local actions (keep)
    addPayment,
    updatePayment,
    deletePayment,
    getStats,

    // ✅ backend actions (added in store)
    fetchInvoices,
    fetchBillingStats,
    fetchLabBills,
    createPayment,
    editPayment,
    removePayment,
    createInvoice,
    stats: mergedStats,

    loading,
    error,
  } = useBillingStore();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");

  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const [deletePaymentId, setDeletePaymentId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);

  // ✅ Fetch from backend (if wired). If not, UI still works locally.
  useEffect(() => {
    const run = async () => {
      try {
        if (typeof fetchInvoices === "function") {
          await fetchInvoices({
            q: query,
            status,
          });
        }

        if (typeof fetchBillingStats === "function") {
          await fetchBillingStats();
        }

        if (typeof fetchLabBills === "function") {
          await fetchLabBills();
        }
      } catch {
        // store already sets error
      }
    };

    run();
  }, [fetchInvoices, fetchBillingStats, fetchLabBills, query, status]);

  // ✅ Normalize invoices for InvoiceTable:
  // It expects { total, paid } but backend provides totalAmount/paidAmount
  const normalizedInvoices = useMemo(() => {
    return (invoices || []).map((inv) => {
      const total = Number(inv.total ?? inv.totalAmount ?? 0) || 0;

      const paid =
        Number(inv.paid ?? inv.paidAmount ?? 0) ||
        (Array.isArray(inv.payments)
          ? inv.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
          : 0);

      const statusVal =
        inv.status || (paid >= total ? "Paid" : paid > 0 ? "Partial" : "Pending");

      return {
        ...inv,
        total,
        paid,
        status: statusVal,
      };
    });
  }, [invoices]);

  const filtered = useMemo(() => {
    const q = String(query || "").toLowerCase();
    return normalizedInvoices.filter((i) => {
      const okStatus = status === "All" || i.status === status;
      const okQuery =
        !q ||
        String(i.patientName || "").toLowerCase().includes(q) ||
        String(i.id || "").toLowerCase().includes(q);

      return okStatus && okQuery;
    });
  }, [normalizedInvoices, query, status]);

  const selectedInvoice = useMemo(() => {
    return normalizedInvoices.find((i) => i.id === selectedInvoiceId) || null;
  }, [normalizedInvoices, selectedInvoiceId]);

  /**
   * ✅ IMPORTANT:
   * Use LIVE invoices to compute stats (instant UI updates),
   * but keep labTotal etc from mergedStats if present.
   */
  const stats = useMemo(() => {
    // If store has no backend stats at all, fallback to getStats (if your store has it).
    const baseMerged = mergedStats || null;
    const live = computeInvoiceStats(invoices || [], baseMerged);

    // If store's getStats exists and returns extra fields you want, merge them safely:
    // (Optional; harmless if getStats returns basic counts only)
    try {
      const local = typeof getStats === "function" ? getStats() : null;
      return { ...(local || {}), ...live };
    } catch {
      return live;
    }
  }, [invoices, mergedStats, getStats]);

  // helper to resync after backend mutations
  const refetchAll = async () => {
    if (typeof fetchInvoices === "function") await fetchInvoices({ q: query, status });
    if (typeof fetchBillingStats === "function") await fetchBillingStats();
    if (typeof fetchLabBills === "function") await fetchLabBills();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-white">
        <Wavify
          fill="#2ec4b6"
          paused={false}
          options={{
            height: 20,
            amplitude: 30,
            speed: 0.15,
            points: 3,
          }}
          className="absolute bottom-0 left-0 w-full opacity-20"
        />
        <div className="relative z-10 p-6">
          <h1 className="text-2xl font-bold">Billing & Payments</h1>
          <p className="text-gray-500">Manage invoices, payments and receipts</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-50 text-red-700 p-3 text-sm">{error}</div>
      ) : null}

      {loading ? (
        <div className="rounded-xl bg-white p-3 text-sm text-gray-600">
          Loading invoices...
        </div>
      ) : null}

      {/* Stats */}
      <BillingStats stats={stats} />

      {/* Invoices */}
      <Card className="rounded-2xl">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <InvoiceFilters
              query={query}
              setQuery={setQuery}
              status={status}
              setStatus={setStatus}
            />

            {/* ✅ Create Invoice */}
            <Button
              onClick={() => setIsCreateInvoiceOpen(true)}
              className="bg-[#2ec4b6] hover:bg-[#26a699]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </div>

          <InvoiceTable
            data={filtered}
            onPay={(inv) => {
              setSelectedInvoiceId(inv.id);
              setIsPaymentOpen(true);
            }}
            onPrint={(inv) => printInvoice(inv)}
          />

          {selectedInvoice && (
            <PaymentHistory
              invoice={selectedInvoice}
              onEdit={async (paymentId, amount) => {
                if (!selectedInvoice) return;

                // ✅ optimistic update first (instant stats change)
                updatePayment(selectedInvoice.id, paymentId, amount);

                if (typeof editPayment === "function") {
                  try {
                    await editPayment(selectedInvoice.id, paymentId, amount);
                    await refetchAll();
                  } catch (e) {
                    // rollback by refetch
                    await refetchAll();
                    throw e;
                  }
                }
              }}
              onDelete={(paymentId) => {
                setDeletePaymentId(paymentId);
                setConfirmOpen(true);
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Receive Payment */}
      <ReceivePaymentModal
        open={isPaymentOpen}
        onOpenChange={setIsPaymentOpen}
        invoice={selectedInvoice}
        onSubmit={async (payment) => {
          if (!selectedInvoice) return;

          // ✅ optimistic: add temp payment immediately
          const tempPayment = { id: `tmp-${Date.now()}`, ...payment };
          addPayment(selectedInvoice.id, tempPayment);

          if (typeof createPayment === "function") {
            try {
              await createPayment(selectedInvoice.id, {
                amount: payment.amount,
                mode: payment.mode,
                date: payment.date,
              });

              // ✅ sync to replace temp + update backend stats
              await refetchAll();
            } catch (e) {
              // rollback by refetch
              await refetchAll();
              throw e;
            }
          }
        }}
      />

      {/* Confirm Delete */}
      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Payment?"
        description="This payment will be permanently removed. Are you sure?"
        onConfirm={async () => {
          if (!selectedInvoice || !deletePaymentId) return;

          // ✅ optimistic delete first (instant stats change)
          deletePayment(selectedInvoice.id, deletePaymentId);

          if (typeof removePayment === "function") {
            try {
              await removePayment(selectedInvoice.id, deletePaymentId);
              await refetchAll();
            } catch (e) {
              // rollback by refetch
              await refetchAll();
              throw e;
            }
          }

          setDeletePaymentId(null);
        }}
      />

      {/* ✅ Create Invoice Modal */}
      <CreateInvoiceModal
        open={isCreateInvoiceOpen}
        onOpenChange={async (open) => {
          setIsCreateInvoiceOpen(open);

          // refresh after close (backend)
          if (!open) {
            await refetchAll();
          }
        }}
      />
    </div>
  );
};

export default Billing;