import { useEffect, useMemo } from "react";
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

import { useDentistStore } from "@/store/dentistStore";

const OwnerBilling = () => {
  const { dentists } = useDentistStore();

  const activeTab = useOwnerBillingStore((s) => s.activeTab);
  const setActiveTab = useOwnerBillingStore((s) => s.setActiveTab);

  const filters = useOwnerBillingStore((s) => s.filters);
  const setFilter = useOwnerBillingStore((s) => s.setFilter);
  const resetFilters = useOwnerBillingStore((s) => s.resetFilters);

  const modal = useOwnerBillingStore((s) => s.modal);
  const closeModal = useOwnerBillingStore((s) => s.closeModal);

  const commissionRules = useOwnerBillingStore((s) => s.commissionRules);
  const openCommissionRuleModal = useOwnerBillingStore((s) => s.openCommissionRuleModal);
  const setCommissionPercentForDentist = useOwnerBillingStore((s) => s.setCommissionPercentForDentist);

  const getSummaryForTab = useOwnerBillingStore((s) => s.getSummaryForTab);

  useEffect(() => {
    useOwnerBillingStore.getState().init();
  }, []);

  // ---- Derived rows (stable via useMemo)
  const cashbookRows = useMemo(
    () => useOwnerBillingStore.getState().getCashbookRows(),
    [filters.cashbook]
  );
  const revenueRows = useMemo(
    () => useOwnerBillingStore.getState().getRevenueRows(),
    [filters.revenue]
  );
  const commissionRows = useMemo(
    () => useOwnerBillingStore.getState().getCommissionRows(),
    [filters.commissions, commissionRules]
  );
  const labDuesRows = useMemo(
    () => useOwnerBillingStore.getState().getLabDuesRows(),
    [filters.labDues]
  );

  // ---- Charts
  const cashbookChart = useMemo(
    () => useOwnerBillingStore.getState().getCashbookChart(),
    [filters.cashbook]
  );
  const revenueByDentist = useMemo(
    () => useOwnerBillingStore.getState().getRevenueByDentistChart(),
    [filters.revenue]
  );
  const commissionChart = useMemo(
    () => useOwnerBillingStore.getState().getCommissionChart(),
    [filters.commissions, commissionRules]
  );
  const labDuesChart = useMemo(
    () => useOwnerBillingStore.getState().getLabDuesChart(),
    [filters.labDues]
  );

  const summary = useMemo(() => getSummaryForTab(), [activeTab, filters, commissionRules]);

  const tableRows = useMemo(() => {
    if (activeTab === "cashbook") return cashbookRows;
    if (activeTab === "revenue") return revenueRows;
    if (activeTab === "commissions") return commissionRows;
    return labDuesRows;
  }, [activeTab, cashbookRows, revenueRows, commissionRows, labDuesRows]);

  const onExportPdf = () => {
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
  };

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Billing, Payments & Financials"
        subtitle="Cashbook, reports, commissions, and lab dues with charts + PDF exports"
      />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <OwnerBillingTabs value={activeTab} onChange={setActiveTab} />

        <Button
          className="rounded-xl bg-[#2ec4b6] hover:bg-[#26a699] text-white"
          onClick={onExportPdf}
        >
          Export PDF
        </Button>
      </div>

      <OwnerBillingFilters
        tab={activeTab}
        filters={filters[activeTab]}
        dentists={dentists}
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
                // map to dentist store object shape for modal
                const d = dentists.find((x) => Number(x.id) === Number(row.dentistId));
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
            ? commissionRules.byDentist[modal.payload.id]
            : commissionRules.defaultPercent
        }
        onClose={closeModal}
        onSave={(percent) => {
          setCommissionPercentForDentist(modal.payload.id, percent);
          closeModal();
        }}
      />
    </div>
  );
};

export default OwnerBilling;