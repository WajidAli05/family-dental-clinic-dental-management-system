// src/pages/owner/OwnerLabManagement.jsx
import { useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import OwnerPageHeader from "@/components/owner/OwnerPageHeader";
import TableSkeleton from "@/components/ui/TableSkeleton";
import TablePagination from "@/components/ui/TablePagination";

import OwnerLabTabs from "@/components/owner/OwnerLabTabs";
import OwnerLabFilters from "@/components/owner/OwnerLabFilters";

import LabAccountsTable from "@/components/owner/LabAccountsTable";
import LabCasesTable from "@/components/owner/LabCasesTable";
import SampleTypesTable from "@/components/owner/SampleTypesTable";

import LabAccountModal from "@/components/owner/LabAccountModal";
import SampleTypeModal from "@/components/owner/SampleTypeModal";
import OwnerLabCaseModal from "@/components/owner/OwnerLabCaseModal";
import LabCaseDetailsModal from "@/components/owner/LabCaseDetailsModal";

import OwnerConfirmDialog from "@/components/owner/OwnerConfirmDialog";
import { useOwnerLabManagementStore } from "@/store/ownerLabManagementStore";
import { useDentistStore } from "@/store/dentistStore";

const OwnerLabManagement = () => {
  const { dentists: dentistsFromDentistStore } = useDentistStore();

  const activeTab    = useOwnerLabManagementStore((s) => s.activeTab);
  const setActiveTab = useOwnerLabManagementStore((s) => s.setActiveTab);

  const filters    = useOwnerLabManagementStore((s) => s.filters);
  const setFilter  = useOwnerLabManagementStore((s) => s.setFilter);
  const resetFilters = useOwnerLabManagementStore((s) => s.resetFilters);

  const labAccounts  = useOwnerLabManagementStore((s) => s.labAccounts);
  const sampleTypes  = useOwnerLabManagementStore((s) => s.sampleTypes);
  const labCases     = useOwnerLabManagementStore((s) => s.labCases);
  const loading      = useOwnerLabManagementStore((s) => s.loading);
  const labCasesPagination = useOwnerLabManagementStore((s) => s.labCasesPagination);

  const dentistsFromOwnerStore = useOwnerLabManagementStore((s) => s.dentists);

  const modal   = useOwnerLabManagementStore((s) => s.modal);
  const confirm = useOwnerLabManagementStore((s) => s.confirm);

  const openCreate  = useOwnerLabManagementStore((s) => s.openCreate);
  const openEdit    = useOwnerLabManagementStore((s) => s.openEdit);
  const openDetails = useOwnerLabManagementStore((s) => s.openDetails);
  const closeModal  = useOwnerLabManagementStore((s) => s.closeModal);

  const openConfirm  = useOwnerLabManagementStore((s) => s.openConfirm);
  const closeConfirm = useOwnerLabManagementStore((s) => s.closeConfirm);
  const runConfirm   = useOwnerLabManagementStore((s) => s.runConfirm);

  const addLabAccount      = useOwnerLabManagementStore((s) => s.addLabAccount);
  const updateLabAccount   = useOwnerLabManagementStore((s) => s.updateLabAccount);
  const setLabAccountEnabled = useOwnerLabManagementStore((s) => s.setLabAccountEnabled);

  const addSampleType      = useOwnerLabManagementStore((s) => s.addSampleType);
  const updateSampleType   = useOwnerLabManagementStore((s) => s.updateSampleType);
  const setSampleTypeActive = useOwnerLabManagementStore((s) => s.setSampleTypeActive);

  const addLabCase         = useOwnerLabManagementStore((s) => s.addLabCase);
  const updateLabCase      = useOwnerLabManagementStore((s) => s.updateLabCase);
  const deleteLabCase      = useOwnerLabManagementStore((s) => s.deleteLabCase);
  const updateLabCaseStatus = useOwnerLabManagementStore((s) => s.updateLabCaseStatus);
  const fetchLabCases      = useOwnerLabManagementStore((s) => s.fetchLabCases);

  useEffect(() => {
    useOwnerLabManagementStore.getState().init();
  }, []);

  const labsForDropdown = useMemo(
    () => labAccounts.map((l) => ({ id: l.id, name: l.name })),
    [labAccounts]
  );

  const dentistsForDropdown = useMemo(() => {
    if (Array.isArray(dentistsFromOwnerStore) && dentistsFromOwnerStore.length > 0) {
      return dentistsFromOwnerStore;
    }
    return Array.isArray(dentistsFromDentistStore) ? dentistsFromDentistStore : [];
  }, [dentistsFromOwnerStore, dentistsFromDentistStore]);

  const accountsData = useMemo(() => {
    const { query, status } = filters.accounts;
    const q = String(query || "").trim().toLowerCase();
    return labAccounts.filter((a) => {
      if (status === "enabled" && !a.enabled) return false;
      if (status === "disabled" && a.enabled) return false;
      if (q) {
        const hay = `${a.id} ${a.name} ${a.email} ${a.phone}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [labAccounts, filters.accounts]);

  const casesData = useMemo(() => {
    const { query, labId, dentistId, status, dateFrom, dateTo } = filters.cases;
    const q = String(query || "").trim().toLowerCase();
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to   = dateTo   ? new Date(`${dateTo}T23:59:59`)   : null;

    return labCases.filter((c) => {
      const d = new Date(c.createdAt);
      if (from && d < from) return false;
      if (to   && d > to)   return false;
      if (labId !== "all" && c.labId !== labId) return false;
      if (dentistId !== "all" && String(c.dentistId) !== String(dentistId)) return false;
      if (status !== "all" && c.status !== status) return false;
      if (q) {
        const hay = `${c.id} ${c.patientName} ${c.dentistName} ${c.labName} ${c.sampleTypeName} ${c.status}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [labCases, filters.cases]);

  const sampleTypesData = useMemo(() => {
    const q = String(filters.sampleTypes.query || "").trim().toLowerCase();
    return sampleTypes.filter((s) => {
      if (!q) return true;
      const hay = `${s.id} ${s.name} ${s.description}`.toLowerCase();
      return hay.includes(q);
    });
  }, [sampleTypes, filters.sampleTypes]);

  const handleCasePage = useCallback((pg) => {
    fetchLabCases({ page: pg, limit: 50 });
  }, [fetchLabCases]);

  const primaryActionLabel = useMemo(() => {
    if (activeTab === "accounts")     return "Create Lab Account";
    if (activeTab === "sampleTypes")  return "Add Sample Type";
    if (activeTab === "cases")        return "Add Lab Case";
    return null;
  }, [activeTab]);

  const handlePrimaryAction = () => {
    if (activeTab === "accounts")    openCreate("labAccount");
    else if (activeTab === "sampleTypes") openCreate("sampleType");
    else if (activeTab === "cases")  openCreate("labCase");
  };

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Lab Management"
        subtitle="Manage lab accounts, view lab cases, and maintain sample type master data"
      />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <OwnerLabTabs value={activeTab} onChange={setActiveTab} />

        {primaryActionLabel && (
          <Button
            className="rounded-xl bg-[#2ec4b6] hover:bg-[#26a699] text-white"
            onClick={handlePrimaryAction}
          >
            {primaryActionLabel}
          </Button>
        )}
      </div>

      <OwnerLabFilters
        tab={activeTab}
        filters={filters[activeTab]}
        labs={labsForDropdown}
        dentists={dentistsForDropdown}
        onChange={(key, value) => setFilter(activeTab, key, value)}
        onReset={() => resetFilters(activeTab)}
      />

      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Results</h2>
            <p className="text-sm text-gray-500">
              Showing{" "}
              <span className="font-semibold text-gray-900">
                {activeTab === "accounts"
                  ? accountsData.length
                  : activeTab === "cases"
                  ? casesData.length
                  : sampleTypesData.length}
              </span>
            </p>
          </div>

          {loading ? (
            <TableSkeleton rows={6} cols={5} />
          ) : (
            <>
              {activeTab === "accounts" && (
                <LabAccountsTable
                  data={accountsData}
                  onEdit={(a) => openEdit("labAccount", a)}
                  onToggle={(a) => setLabAccountEnabled(a.id, !a.enabled)}
                />
              )}

              {activeTab === "cases" && (
                <>
                  <LabCasesTable
                    data={casesData}
                    onView={(c) => openDetails(c)}
                    onEdit={(c) => openEdit("labCase", c)}
                    onDelete={(c) =>
                      openConfirm({
                        title: "Delete Lab Case",
                        message: `This will permanently delete case "${c.id}". This cannot be undone.`,
                        onConfirmKey: "deleteLabCase",
                        onConfirmPayload: c.id,
                      })
                    }
                    onStatusChange={(id, status) => updateLabCaseStatus(id, status)}
                  />
                  <TablePagination
                    page={labCasesPagination.page}
                    pages={labCasesPagination.pages}
                    total={labCasesPagination.total}
                    limit={50}
                    onPage={handleCasePage}
                  />
                </>
              )}

              {activeTab === "sampleTypes" && (
                <SampleTypesTable
                  data={sampleTypesData}
                  onEdit={(s) => openEdit("sampleType", s)}
                  onToggle={(s) => setSampleTypeActive(s.id, !s.active)}
                  onDelete={(s) =>
                    openConfirm({
                      title: "Delete Sample Type",
                      message: `This will permanently delete "${s.name}".`,
                      onConfirmKey: "deleteSampleType",
                      onConfirmPayload: s.id,
                    })
                  }
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Lab Account Modal */}
      <LabAccountModal
        open={modal.open && modal.type === "labAccount"}
        mode={modal.mode}
        initial={modal.payload}
        onClose={closeModal}
        onSubmit={async (payload) => {
          if (modal.mode === "edit") await updateLabAccount(modal.payload.id, payload);
          else await addLabAccount(payload);
          closeModal();
        }}
      />

      {/* Sample Type Modal */}
      <SampleTypeModal
        open={modal.open && modal.type === "sampleType"}
        mode={modal.mode}
        initial={modal.payload}
        onClose={closeModal}
        onSubmit={async (payload) => {
          if (modal.mode === "edit") await updateSampleType(modal.payload.id, payload);
          else await addSampleType(payload);
          closeModal();
        }}
      />

      {/* Lab Case Add/Edit Modal */}
      <OwnerLabCaseModal
        open={modal.open && modal.type === "labCase"}
        mode={modal.mode}
        initial={modal.payload}
        labs={labsForDropdown}
        dentists={dentistsForDropdown}
        sampleTypes={sampleTypes}
        onClose={closeModal}
        onSubmit={async (payload) => {
          if (modal.mode === "edit") await updateLabCase(modal.payload.id, payload);
          else await addLabCase(payload);
          closeModal();
        }}
      />

      {/* Lab Case Details Modal */}
      <LabCaseDetailsModal
        open={modal.open && modal.type === "caseDetails"}
        caseItem={modal.payload}
        onClose={closeModal}
        onStatusChange={async (id, status) => {
          await updateLabCaseStatus(id, status);
        }}
      />

      <OwnerConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        onCancel={closeConfirm}
        onConfirm={runConfirm}
      />
    </div>
  );
};

export default OwnerLabManagement;
