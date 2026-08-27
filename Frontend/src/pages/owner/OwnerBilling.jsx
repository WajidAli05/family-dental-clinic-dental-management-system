import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import OwnerPageHeader from "@/components/owner/OwnerPageHeader";
import OwnerBillingTabs from "@/components/owner/OwnerBillingTabs";
import OwnerBillingFilters from "@/components/owner/OwnerBillingFilters";
import OwnerBillingCharts from "@/components/owner/OwnerBillingCharts";
import DailyCashbookTable from "@/components/owner/DailyCashbookTable";
import OwnerInvoicesTable from "@/components/owner/OwnerInvoicesTable";
import OwnerConfirmDialog from "@/components/owner/OwnerConfirmDialog";
import CreateInvoiceModal from "@/components/receptionist/CreateInvoiceModal";
import ReceivePaymentModal from "@/components/receptionist/ReceivePaymentModal";
import VoidInvoiceModal from "@/components/owner/VoidInvoiceModal";
import { ownerApi } from "@/lib/ownerApi";
import CommissionsTable from "@/components/owner/CommissionsTable";
import LabDuesTable from "@/components/owner/LabDuesTable";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { useOwnerBillingStore } from "@/store/ownerBillingStore";

import { useFormatMoney } from "@/store/clinicConfigStore";

const KPI = ({ label, value, sub, highlight }) => (
  <div className={`rounded-2xl border p-4 ${highlight ? "border-[#2ec4b6]/30 bg-[#f0fdfc]" : "border-gray-100 bg-white"}`}>
    <div className="text-xs font-semibold text-gray-500">{label}</div>
    <div className={`text-lg font-bold mt-1 ${highlight ? "text-[#2ec4b6]" : "text-gray-900"}`}>{value}</div>
    {sub ? <div className="text-xs text-gray-500 mt-1">{sub}</div> : null}
  </div>
);

// ── Record Payment Modal ──────────────────────────────────────────────────────
const RecordPaymentModal = ({ open, modal, onClose, onSubmit }) => {
  const money = useFormatMoney();
  const [form, setForm] = useState({ amount: "", method: "cash", date: "", note: "" });
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().slice(0, 10);
      setForm({ amount: "", method: "cash", date: today, note: "" });
      setErr("");
    }
  }, [open]);

  if (!open) return null;

  const label = modal.type === "commission"
    ? `Pay Commission — ${modal.dentist?.name}`
    : `Record Lab Payment — ${modal.lab?.name}`;

  const maxAmount = modal.type === "commission"
    ? Number(modal.dentist?.remaining || 0)
    : Number(modal.lab?.remaining || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    const amt = Number(form.amount);
    if (!amt || amt <= 0) { setErr("Enter a valid amount"); return; }
    if (amt > maxAmount + 0.01) { setErr(`Amount exceeds remaining balance (${money(maxAmount)})`); return; }
    if (modal.type === "commission" && !["cash", "card"].includes(form.method)) {
      setErr("Method must be cash or card"); return;
    }
    try {
      if (modal.type === "commission") {
        await onSubmit({
          dentistId: modal.dentist.publicId, dentistName: modal.dentist.name,
          amount: amt, method: form.method, date: form.date,
        });
      } else {
        await onSubmit({
          labId: modal.lab.labId, labName: modal.lab.name,
          amount: amt, method: form.method, date: form.date, note: form.note,
        });
      }
      onClose();
    } catch (e2) {
      setErr(e2.message || "Payment failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">{label}</h2>
        <p className="text-xs text-gray-500 mb-4">Remaining: <span className="font-semibold text-orange-600">{money(maxAmount)}</span></p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Amount</label>
            <input type="number" min="1" max={maxAmount} value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30"
              placeholder="Enter amount" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Method</label>
            <select value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30">
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              {modal.type === "lab" && <option value="online">Online Transfer</option>}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30" />
          </div>
          {modal.type === "lab" && (
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Note (optional)</label>
              <input type="text" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30" />
            </div>
          )}
          {err && <p className="text-xs text-red-600">{err}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1 rounded-xl bg-[#2ec4b6] hover:bg-[#26a699] text-white" disabled={modal.loading}>
              {modal.loading ? "Saving…" : "Record Payment"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Drawers ───────────────────────────────────────────────────────────────────
const Drawer = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md h-full shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const INVOICES_PAGE_SIZE = 25;

const OwnerBilling = () => {
  const money = useFormatMoney();
  const { t } = useTranslation();

  // ── Invoices tab (owner create / edit / soft-delete) ──
  const [invoices, setInvoices] = useState([]);
  const [invLoading, setInvLoading] = useState(false);
  const [invSchedules, setInvSchedules] = useState([]);
  const [invModalOpen, setInvModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [payTarget, setPayTarget] = useState(null);
  const [voidTarget, setVoidTarget] = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);

  const [invTotal, setInvTotal] = useState(0);
  const [invPages, setInvPages] = useState(1);

  /**
   * Server-side filtered + paginated. The date range goes to the API, so a
   * match on page 7 is still found — filtering the already-fetched page would
   * silently miss it, and `total` would be wrong.
   */
  const loadInvoices = useCallback(async () => {
    const f = useOwnerBillingStore.getState().filters.invoices || {};
    setInvLoading(true);
    try {
      const [invRes, schRes] = await Promise.all([
        ownerApi.listInvoices({
          dateFrom: f.from || undefined,
          dateTo: f.to || undefined,
          q: f.q || undefined,
          status: f.status && f.status !== "All" ? f.status : undefined,
          page: f.page || 1,
          limit: INVOICES_PAGE_SIZE,
        }),
        ownerApi.getInvoiceFeeSchedules().catch(() => ({ data: [] })),
      ]);
      setInvoices(invRes?.data || []);
      setInvTotal(Number(invRes?.total) || 0);
      setInvPages(Number(invRes?.pages) || 1);
      setInvSchedules(schRes?.data || []);
    } catch (e) {
      toast.error(e.message || t("invoices.loadError"));
    } finally {
      setInvLoading(false);
    }
  }, [t]);

  const scheduleNameOf = useMemo(
    () => (id) => invSchedules.find((x) => x.id === id)?.name || "",
    [invSchedules]
  );

  const activeTab      = useOwnerBillingStore((s) => s.activeTab);
  const setActiveTab   = useOwnerBillingStore((s) => s.setActiveTab);
  const filters        = useOwnerBillingStore((s) => s.filters);
  const setFilter      = useOwnerBillingStore((s) => s.setFilter);
  const setQuickRange  = useOwnerBillingStore((s) => s.setQuickRange);

  const cashbook       = useOwnerBillingStore((s) => s.cashbook);
  const commissions    = useOwnerBillingStore((s) => s.commissions);
  const ownerPayments  = useOwnerBillingStore((s) => s.ownerPayments);
  const labDues        = useOwnerBillingStore((s) => s.labDues);
  const labBills       = useOwnerBillingStore((s) => s.labBills);
  const labBillsLoading = useOwnerBillingStore((s) => s.labBillsLoading);

  const recordPaymentModal    = useOwnerBillingStore((s) => s.recordPaymentModal);
  const billsDrawer           = useOwnerBillingStore((s) => s.billsDrawer);
  const ownerPaymentsDrawer   = useOwnerBillingStore((s) => s.ownerPaymentsDrawer);

  const fetchCashbook        = useOwnerBillingStore((s) => s.fetchCashbook);
  const fetchCommissions     = useOwnerBillingStore((s) => s.fetchCommissions);
  const fetchLabDues         = useOwnerBillingStore((s) => s.fetchLabDues);

  const openRecordPaymentModal   = useOwnerBillingStore((s) => s.openRecordPaymentModal);
  const closeRecordPaymentModal  = useOwnerBillingStore((s) => s.closeRecordPaymentModal);
  const recordOwnerPayment       = useOwnerBillingStore((s) => s.recordOwnerPayment);
  const recordLabPayment         = useOwnerBillingStore((s) => s.recordLabPayment);

  const openBillsDrawer          = useOwnerBillingStore((s) => s.openBillsDrawer);
  const closeBillsDrawer         = useOwnerBillingStore((s) => s.closeBillsDrawer);
  const openOwnerPaymentsDrawer  = useOwnerBillingStore((s) => s.openOwnerPaymentsDrawer);
  const closeOwnerPaymentsDrawer = useOwnerBillingStore((s) => s.closeOwnerPaymentsDrawer);

  // initial load
  useEffect(() => { fetchCashbook(); }, []);
  const invFilters = useOwnerBillingStore((s) => s.filters.invoices);
  useEffect(() => {
    if (activeTab !== "invoices") return;
    loadInvoices();
  }, [activeTab, loadInvoices, invFilters.from, invFilters.to, invFilters.q, invFilters.status, invFilters.page]);
  useEffect(() => { if (activeTab === "commissions") fetchCommissions(); }, [activeTab]);
  useEffect(() => { if (activeTab === "labDues") fetchLabDues(); }, [activeTab]);

  // re-fetch cashbook when filter changes
  const cbFilters = filters.cashbook;
  useEffect(() => { if (activeTab === "cashbook") fetchCashbook(); }, [cbFilters.from, cbFilters.to, cbFilters.q]);
  const cmFilters = filters.commissions;
  useEffect(() => { if (activeTab === "commissions") fetchCommissions(); }, [cmFilters.from, cmFilters.to]);

  const handleTabChange = useCallback((tab) => { setActiveTab(tab); }, [setActiveTab]);

  // Clears every key the ACTIVE tab owns — driven by the store's own bucket so
  // a new tab can never be forgotten here again.
  const handleFilterReset = useCallback(() => {
    const bucket = useOwnerBillingStore.getState().filters[activeTab];
    if (!bucket) return;
    Object.keys(bucket).forEach((key) => {
      setFilter(activeTab, key, key === "page" ? 1 : key === "status" ? "All" : "");
    });
  }, [activeTab, setFilter]);

  // ── Cashbook KPIs ──
  const cbStats = cashbook.stats || {};
  const cbTxns  = cashbook.transactions || { rows: [], total: 0 };

  // ── Commissions KPIs ──
  const commRows = commissions.rows || [];
  const earnedInPeriod  = commRows.reduce((s, r) => s + Number(r.earned || 0), 0);
  const paidAllTime     = commRows.reduce((s, r) => s + Number(r.paid || 0), 0);
  const remainingAllTime = commRows.reduce((s, r) => s + Number(r.remaining || 0), 0);

  // ── Lab Dues KPIs ──
  const labRows = labDues.rows || [];
  const labTotalBilled   = labRows.reduce((s, r) => s + Number(r.totalBilled || 0), 0);
  const labTotalPaid     = labRows.reduce((s, r) => s + Number(r.paid || 0), 0);
  const labTotalRemaining = labRows.reduce((s, r) => s + Number(r.remaining || 0), 0);

  const isLoading = cashbook.loading || commissions.loading || labDues.loading;

  // CSV export for cashbook
  const handleExportCSV = () => {
    const rows = cbTxns.rows || [];
    if (!rows.length) return;
    const header = "Date,Invoice,Patient,Dentist,Mode,Amount";
    const body = rows.map((r) => `${r.date},${r.invoiceId},${r.patientName},${r.dentistName},${r.mode},${r.amount}`).join("\n");
    const blob = new Blob([header + "\n" + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `cashbook-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Billing & Financials"
        subtitle="Daily cashbook, dentist commissions, and lab dues"
      />

      {/* Tabs + actions row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <OwnerBillingTabs value={activeTab} onChange={handleTabChange} />
        {activeTab === "cashbook" && (
          <Button variant="outline" className="rounded-xl" onClick={handleExportCSV} disabled={!cbTxns.rows?.length}>
            Export CSV
          </Button>
        )}
        {activeTab === "invoices" && (
          <Button
            className="rounded-xl bg-[#2ec4b6] hover:bg-[#26a699] text-white"
            onClick={() => { setEditingInvoice(null); setInvModalOpen(true); }}
          >
            {t("invoices.create")}
          </Button>
        )}
      </div>

      {/* Filters */}
      <OwnerBillingFilters
        tab={activeTab}
        filters={filters[activeTab] || {}}
        onChange={(key, value) => setFilter(activeTab, key, value)}
        onReset={handleFilterReset}
        onQuickRange={(range) => setQuickRange(range, activeTab)}
      />

      {/* KPI cards */}
      {activeTab === "cashbook" && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KPI label="Total Collected"    value={money(cbStats.totalCollected)}    highlight />
          <KPI label="Cash"               value={money(cbStats.Cash)} />
          <KPI label="Card"               value={money(cbStats.Card)} />
          {Number(cbStats["Online Transfer"]) > 0 && <KPI label="Online Transfer" value={money(cbStats["Online Transfer"])} />}
          <KPI label="Invoices"           value={Number(cbStats.invoiceCount  || 0).toLocaleString()} />
          <KPI label="Outstanding Added"  value={money(cbStats.outstandingAdded)} sub="new AR in period" />
        </div>
      )}

      {activeTab === "commissions" && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <KPI label="Earned This Period"   value={money(earnedInPeriod)}   highlight />
          <KPI label="Total Paid (all-time)" value={money(paidAllTime)}    sub="OwnerPayments sum" />
          <KPI label="Remaining Balance"    value={money(remainingAllTime)} sub="All dentists combined" />
        </div>
      )}

      {activeTab === "labDues" && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <KPI label="Total Billed"   value={money(labTotalBilled)} />
          <KPI label="Total Paid"     value={money(labTotalPaid)}  highlight />
          <KPI label="Total Remaining" value={money(labTotalRemaining)} sub="Across all labs" />
        </div>
      )}

      {/* Charts */}
      <OwnerBillingCharts
        tab={activeTab}
        trendData={cashbook.trend}
        commissionRows={commRows}
        labDuesRows={labRows}
        invoiceRows={invoices}
      />

      {/* Table */}
      <Card className="rounded-2xl">
        <CardContent className="p-6">
          {isLoading ? (
            <TableSkeleton rows={8} cols={5} />
          ) : (
            <>
              {activeTab === "cashbook" && (
                <DailyCashbookTable data={cbTxns.rows || []} />
              )}
              {activeTab === "invoices" && (
                invLoading ? <TableSkeleton rows={8} cols={8} /> : (
                  <>
                    <OwnerInvoicesTable
                      data={invoices}
                      scheduleNameOf={scheduleNameOf}
                      onEdit={(inv) => { setEditingInvoice(inv); setInvModalOpen(true); }}
                      onDelete={(inv) => setDeleteTarget(inv)}
                      onPay={(inv) => setPayTarget(inv)}
                      onVoid={(inv) => setVoidTarget(inv)}
                      onRestore={(inv) => setRestoreTarget(inv)}
                    />

                    {/* `total` comes from the server and reflects the active
                        filters, so it is the honest match count. */}
                    <div className="flex items-center justify-between gap-3 flex-wrap mt-4">
                      <p className="text-sm text-gray-500">
                        {t("billingFilters.matches", { count: invTotal })}
                      </p>
                      {invPages > 1 && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline" size="sm" className="rounded-xl"
                            disabled={(invFilters.page || 1) <= 1}
                            onClick={() => setFilter("invoices", "page", (invFilters.page || 1) - 1)}
                          >
                            {t("billingFilters.prev")}
                          </Button>
                          <span className="text-sm text-gray-600">
                            {t("billingFilters.pageOf", { page: invFilters.page || 1, pages: invPages })}
                          </span>
                          <Button
                            variant="outline" size="sm" className="rounded-xl"
                            disabled={(invFilters.page || 1) >= invPages}
                            onClick={() => setFilter("invoices", "page", (invFilters.page || 1) + 1)}
                          >
                            {t("billingFilters.next")}
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )
              )}
              {activeTab === "commissions" && (
                <CommissionsTable
                  data={commRows}
                  onRecordPayment={(row) => openRecordPaymentModal("commission", row)}
                  onViewHistory={(row) => openOwnerPaymentsDrawer(row)}
                />
              )}
              {activeTab === "labDues" && (
                <LabDuesTable
                  data={labRows}
                  onRecordPayment={(row) => openRecordPaymentModal("lab", row)}
                  onViewBills={(row) => openBillsDrawer(row)}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        open={recordPaymentModal.open}
        modal={recordPaymentModal}
        onClose={closeRecordPaymentModal}
        onSubmit={recordPaymentModal.type === "commission" ? recordOwnerPayment : recordLabPayment}
      />

      {/* Bills Drawer (Lab Dues) */}
      <Drawer
        open={billsDrawer.open}
        onClose={closeBillsDrawer}
        title={`Bills — ${billsDrawer.lab?.name || ""}`}
      >
        {labBillsLoading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <div className="space-y-3">
            {(labBills[billsDrawer.lab?.labId] || []).length === 0 ? (
              <p className="text-sm text-gray-500">No bills found.</p>
            ) : (labBills[billsDrawer.lab?.labId] || []).map((b) => {
              const age = b.month ? Math.floor((new Date() - new Date(b.month + "-01")) / (1000 * 60 * 60 * 24 * 30)) : 0;
              const agingLabel = age >= 90 ? "90+ days" : age >= 60 ? "60–90 days" : age >= 30 ? "30–60 days" : "< 30 days";
              const agingColor = age >= 90 ? "text-red-600" : age >= 60 ? "text-orange-500" : age >= 30 ? "text-yellow-600" : "text-green-600";
              return (
                <div key={b.id} className={`rounded-xl border p-3 ${b.fullyPaid ? "border-green-100 bg-green-50" : "border-gray-100 bg-white"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">{b.month}</span>
                    <span className={`text-xs font-medium ${agingColor}`}>{agingLabel}</span>
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-gray-600">
                    <span>Billed: {money(b.amount)}</span>
                    <span>Paid: {money(b.paid)}</span>
                    <span className={b.remaining > 0 ? "text-orange-600 font-semibold" : "text-green-600"}>
                      Remaining: {money(b.remaining)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Drawer>

      {/* Owner Payments History Drawer (Commissions) */}
      <Drawer
        open={ownerPaymentsDrawer.open}
        onClose={closeOwnerPaymentsDrawer}
        title={`Payment History — ${ownerPaymentsDrawer.dentist?.name || ""}`}
      >
        {ownerPayments.loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <div className="space-y-3">
            {(ownerPayments.rows || []).length === 0 ? (
              <p className="text-sm text-gray-500">No payments recorded yet.</p>
            ) : (ownerPayments.rows || []).map((p) => (
              <div key={p.id} className="rounded-xl border border-gray-100 bg-white p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">{money(p.amount)}</span>
                  <span className="text-xs text-gray-400">{p.date}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1 capitalize">{p.method}</div>
              </div>
            ))}
          </div>
        )}
      </Drawer>

      {/* The SAME modal the receptionist uses — `api` swaps the role client and
          `invoice` puts it in edit mode. No second invoice form exists. */}
      <CreateInvoiceModal
        open={invModalOpen}
        onOpenChange={(v) => { setInvModalOpen(v); if (!v) setEditingInvoice(null); }}
        api={ownerApi}
        invoice={editingInvoice}
        onSaved={loadInvoices}
      />

      {/* The SAME payment modal the receptionist uses. */}
      <ReceivePaymentModal
        open={!!payTarget}
        onOpenChange={(v) => { if (!v) setPayTarget(null); }}
        invoice={payTarget}
        onSubmit={async (payment) => {
          const target = payTarget;
          setPayTarget(null);
          try {
            await ownerApi.addInvoicePayment(target.id, {
              amount: payment.amount, mode: payment.mode, date: payment.date,
            });
            toast.success(t("invoices.paymentRecorded"));
            await loadInvoices();
          } catch (e) {
            // 409 PAYMENT_EXCEEDS_BALANCE surfaces here with the server text.
            toast.error(e.message || t("invoices.actionFailed"));
          }
        }}
      />

      <VoidInvoiceModal
        open={!!voidTarget}
        invoice={voidTarget}
        onOpenChange={(v) => { if (!v) setVoidTarget(null); }}
        onConfirm={async (reason) => {
          const target = voidTarget;
          setVoidTarget(null);
          try {
            await ownerApi.voidInvoice(target.id, reason);
            toast.success(t("invoices.voided"));
            await loadInvoices();
          } catch (e) {
            toast.error(e.message || t("invoices.actionFailed"));
          }
        }}
      />

      {/* Un-void — status is re-derived server-side from the payments the
          void preserved, so no status is assumed here. */}
      <OwnerConfirmDialog
        open={!!restoreTarget}
        title={t("invoices.restoreTitle")}
        message={t("invoices.restoreMessage", {
          id: restoreTarget?.id || "",
          reason: restoreTarget?.voidReason || "—",
        })}
        onCancel={() => setRestoreTarget(null)}
        onConfirm={async () => {
          const target = restoreTarget;
          setRestoreTarget(null);
          try {
            const res = await ownerApi.restoreInvoice(target.id);
            toast.success(t("invoices.restored", { status: res?.data?.status || "" }));
            await loadInvoices();
          } catch (e) {
            toast.error(e.message || t("invoices.actionFailed"));
          }
        }}
      />

      <OwnerConfirmDialog
        open={!!deleteTarget}
        title={t("invoices.deleteTitle")}
        message={t("invoices.deleteMessage", { id: deleteTarget?.id || "" })}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          const target = deleteTarget;
          setDeleteTarget(null);
          try {
            await ownerApi.deleteInvoice(target.id);
            toast.success(t("invoices.deleted"));
            await loadInvoices();
          } catch (e) {
            // Server blocks deleting an invoice that carries payments (409).
            toast.error(e.message || t("invoices.actionFailed"));
          }
        }}
      />
    </div>
  );
};

export default OwnerBilling;
