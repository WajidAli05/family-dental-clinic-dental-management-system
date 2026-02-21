// src/pages/owner/OwnerBilling.jsx
import { useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import OwnerPageHeader from "@/components/owner/OwnerPageHeader";

import OwnerBillingTabs from "@/components/owner/OwnerBillingTabs";
import OwnerBillingFilters from "@/components/owner/OwnerBillingFilters";
import OwnerBillingCharts from "@/components/owner/OwnerBillingCharts";

import DailyCashbookTable from "@/components/owner/DailyCashbookTable";
import RevenueReportsTable from "@/components/owner/RevenueReportsTable";
import LabDuesTable from "@/components/owner/LabDuesTable";
import CommissionsTable from "@/components/owner/CommissionsTable";

import CommissionRuleModal from "@/components/owner/CommissionRuleModal";

import { exportOwnerBillingPdf } from "@/utils/ownerBillingReports";
import { useOwnerBillingStore } from "@/store/ownerBillingStore";

const money = (n) => `PKR ${Number(n || 0).toLocaleString("en-PK")}`;

const KPI = ({ label, value, sub }) => (
  <div className="rounded-2xl border border-gray-100 bg-white p-4">
    <div className="text-xs font-semibold text-gray-500">{label}</div>
    <div className="text-lg font-semibold text-gray-900 mt-1">{value}</div>
    {sub ? <div className="text-xs text-gray-500 mt-1">{sub}</div> : null}
  </div>
);

const OwnerBilling = () => {
  // ✅ store state
  const initialized = useOwnerBillingStore((s) => s.initialized);
  const loading = useOwnerBillingStore((s) => s.loading);
  const error = useOwnerBillingStore((s) => s.error);

  const activeTab = useOwnerBillingStore((s) => s.activeTab);
  const setActiveTab = useOwnerBillingStore((s) => s.setActiveTab);

  const filters = useOwnerBillingStore((s) => s.filters);
  const setFilter = useOwnerBillingStore((s) => s.setFilter);
  const resetFilters = useOwnerBillingStore((s) => s.resetFilters);

  const dentists = useOwnerBillingStore((s) => s.dentists);
  const labs = useOwnerBillingStore((s) => s.labs);

  const modal = useOwnerBillingStore((s) => s.modal);
  const closeModal = useOwnerBillingStore((s) => s.closeModal);

  const commissionRules = useOwnerBillingStore((s) => s.commissionRules);
  const openCommissionRuleModal = useOwnerBillingStore((s) => s.openCommissionRuleModal);
  const setCommissionPercentForDentist = useOwnerBillingStore((s) => s.setCommissionPercentForDentist);

  const arSummary = useOwnerBillingStore((s) => s.arSummary);

  const getSummaryForTab = useOwnerBillingStore((s) => s.getSummaryForTab);

  // ✅ init
  useEffect(() => {
    if (!initialized) {
      useOwnerBillingStore.getState().init?.();
    }
  }, [initialized]);

  // ✅ refresh AR summary when cashbook date filter changes
  useEffect(() => {
    useOwnerBillingStore.getState().fetchARSummary?.().catch(() => {});
  }, [filters.cashbook?.dateFrom, filters.cashbook?.dateTo]);

  // ---- Derived rows (useMemo keeps PDF/export stable)
  const cashbookRows = useMemo(
    () => useOwnerBillingStore.getState().getCashbookRows(),
    [filters.cashbook, useOwnerBillingStore.getState().payments]
  );

  const revenueRows = useMemo(
    () => useOwnerBillingStore.getState().getRevenueRows(),
    [filters.revenue, useOwnerBillingStore.getState().payments]
  );

  const commissionRows = useMemo(
    () => useOwnerBillingStore.getState().getCommissionRows(),
    [filters.commissions, commissionRules, useOwnerBillingStore.getState().payments]
  );

  const labDuesRows = useMemo(
    () => useOwnerBillingStore.getState().getLabDuesRows(),
    [filters.labDues, useOwnerBillingStore.getState().labBills]
  );

  // ---- Charts
  const cashbookChart = useMemo(
    () => useOwnerBillingStore.getState().getCashbookChart(),
    [filters.cashbook, useOwnerBillingStore.getState().payments]
  );

  const revenueByDentist = useMemo(
    () => useOwnerBillingStore.getState().getRevenueByDentistChart(),
    [filters.revenue, useOwnerBillingStore.getState().payments]
  );

  const commissionChart = useMemo(
    () => useOwnerBillingStore.getState().getCommissionChart(),
    [filters.commissions, commissionRules, useOwnerBillingStore.getState().payments]
  );

  const labDuesChart = useMemo(
    () => useOwnerBillingStore.getState().getLabDuesChart(),
    [filters.labDues, useOwnerBillingStore.getState().labBills]
  );

  const summary = useMemo(
    () => getSummaryForTab(),
    [activeTab, filters, commissionRules, arSummary]
  );

  const tableRows = useMemo(() => {
    if (activeTab === "cashbook") return cashbookRows;
    if (activeTab === "revenue") return revenueRows;
    if (activeTab === "commissions") return commissionRows;
    return labDuesRows;
  }, [activeTab, cashbookRows, revenueRows, commissionRows, labDuesRows]);

  const kpis = useMemo(
    () => useOwnerBillingStore.getState().getFinancialKPIs(),
    [
      filters.cashbook,
      filters.revenue,
      filters.commissions,
      filters.labDues,
      commissionRules,
      arSummary,
      useOwnerBillingStore.getState().payments,
      useOwnerBillingStore.getState().labBills,
    ]
  );

  const onExportPdf = useCallback(() => {
    const totals =
      activeTab === "cashbook"
        ? summary
        : activeTab === "revenue"
        ? { total: summary.total }
        : activeTab === "commissions"
        ? summary
        : { total: summary.total };

    exportOwnerBillingPdf({
      tab: activeTab,
      filters: filters[activeTab],
      rows: tableRows,
      totals,
    });
  }, [activeTab, summary, filters, tableRows]);

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Billing, Payments & Financials"
        subtitle="Centralized collections, revenue, commissions, lab payables, A/R, charts + PDF exports"
      />

      {/* status */}
      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <OwnerBillingTabs value={activeTab} onChange={setActiveTab} />

        <Button
          className="rounded-xl bg-[#2ec4b6] hover:bg-[#26a699] text-white"
          onClick={onExportPdf}
          disabled={loading}
        >
          {loading ? "Loading..." : "Export PDF"}
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI
          label="Total Collections"
          value={money(kpis.collections)}
          sub={`Cash: ${money(kpis.collectionsCash)} • Card: ${money(kpis.collectionsCard)}`}
        />
        <KPI
          label="Accounts Receivable (Outstanding)"
          value={money(kpis.totalOutstanding)}
          sub={`Invoices: ${kpis.invoiceCount} • Outstanding: ${kpis.outstandingCount}`}
        />
        <KPI label="Commission Payout" value={money(kpis.commissionPayout)} />
        <KPI label="Lab Payables" value={money(kpis.labPayables)} />
        <KPI label="Total Billed" value={money(kpis.totalBilled)} />
        <KPI label="Total Paid (Invoices)" value={money(kpis.totalPaid)} />
        <KPI
          label="Estimated Net (Collections - Commissions - Lab)"
          value={money(kpis.estimatedNet)}
          sub="Simple profitability view (can be expanded later with expenses)."
        />
        <KPI
          label="Operational Insight"
          value={
            activeTab === "cashbook"
              ? "Daily Collections"
              : activeTab === "revenue"
              ? "Revenue Streams"
              : activeTab === "commissions"
              ? "Dentist Payouts"
              : "Vendor Payables"
          }
        />
      </div>

      <OwnerBillingFilters
        tab={activeTab}
        filters={filters[activeTab]}
        dentists={dentists}
        labs={labs}
        onChange={(key, value) => setFilter(activeTab, key, value)}
        onReset={() => resetFilters(activeTab)}
      />

      {/* Charts */}
      <OwnerBillingCharts
        tab={activeTab}
        cashbookChart={cashbookChart}
        revenueByDentist={revenueByDentist}
        commissionChart={commissionChart}
        labDuesChart={labDuesChart}
      />

      {/* Table */}
      <Card className="rounded-2xl">
        <CardContent className="p-6">
          {activeTab === "cashbook" ? <DailyCashbookTable data={cashbookRows} /> : null}
          {activeTab === "revenue" ? <RevenueReportsTable data={revenueRows} /> : null}
          {activeTab === "commissions" ? (
            <CommissionsTable
              data={commissionRows}
              onEditRule={(row) => {
                const d = (dentists || []).find((x) => String(x.id) === String(row.dentistId));
                openCommissionRuleModal(d || { id: row.dentistId, name: row.dentistName });
              }}
            />
          ) : null}
          {activeTab === "labDues" ? <LabDuesTable data={labDuesRows} /> : null}
        </CardContent>
      </Card>

      {/* Commission rule modal */}
      <CommissionRuleModal
        open={modal.open && modal.type === "commissionRule"}
        dentist={modal.payload}
        defaultPercent={commissionRules.defaultPercent}
        initialPercent={
          modal.payload?.id
            ? commissionRules.byDentist[String(modal.payload.id)] ?? commissionRules.defaultPercent
            : commissionRules.defaultPercent
        }
        onClose={closeModal}
        onSave={(percent) => {
          const id = modal?.payload?.id ?? modal?.payload?.dentistId;
          if (!id) {
            closeModal();
            return;
          }
          setCommissionPercentForDentist(id, percent);
          closeModal();
        }}
      />
    </div>
  );
};

export default OwnerBilling;