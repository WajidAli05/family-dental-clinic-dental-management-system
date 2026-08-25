// src/pages/owner/OwnerClinicalMaster.jsx
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import OwnerPageHeader from "@/components/owner/OwnerPageHeader";
import OwnerClinicalTabs from "@/components/owner/OwnerClinicalTabs";
import OwnerConfirmDialog from "@/components/owner/OwnerConfirmDialog";
import OwnerClinicalFilters from "@/components/owner/OwnerClinicalFilters";

import TreatmentsTable from "@/components/owner/TreatmentsTable";
import FeeScheduleBar from "@/components/owner/FeeScheduleBar";
import SimpleTemplatesTable from "@/components/owner/SimpleTemplatesTable";

import TreatmentModal from "@/components/owner/TreatmentModal";
import SimpleTemplateModal from "@/components/owner/SimpleTemplateModal";

import { useOwnerClinicalMasterStore } from "@/store/ownerClinicalMasterStore";

// ✅ stable helper
const filterList = (category, filters, data) => {
  const q = String(filters.query || "").trim().toLowerCase();
  const status = filters.status;

  const includesQ = (text) => {
    if (!q) return true;
    return String(text || "").toLowerCase().includes(q);
  };

  if (category === "treatments") {
    return (data || []).filter((t) => {
      const okQuery = includesQ(`${t.id} ${t.name} ${t.code} ${t.notes} ${t.fee}`);
      if (!okQuery) return false;
      if (status === "active" && !t.active) return false;
      if (status === "inactive" && t.active) return false;
      return true;
    });
  }

  // diagnosis/findings
  return (data || []).filter((x) => {
    const okQuery = includesQ(`${x.id} ${x.title} ${x.description}`);
    if (!okQuery) return false;
    if (status === "active" && !x.active) return false;
    if (status === "inactive" && x.active) return false;
    return true;
  });
};

const OwnerClinicalMaster = () => {
  const { t } = useTranslation();
  const activeCategory = useOwnerClinicalMasterStore((s) => s.activeCategory);
  const setActiveCategory = useOwnerClinicalMasterStore((s) => s.setActiveCategory);

  const loading = useOwnerClinicalMasterStore((s) => s.loading);
  const error = useOwnerClinicalMasterStore((s) => s.error);

  // raw lists
  const treatments = useOwnerClinicalMasterStore((s) => s.treatments);
  const diagnosis = useOwnerClinicalMasterStore((s) => s.diagnosisTemplates);
  const findings = useOwnerClinicalMasterStore((s) => s.clinicalFindingTemplates);

  // filters
  const filters = useOwnerClinicalMasterStore((s) => s.filters);
  const setFilter = useOwnerClinicalMasterStore((s) => s.setFilter);
  const resetFilters = useOwnerClinicalMasterStore((s) => s.resetFilters);

  // ui state
  const modal = useOwnerClinicalMasterStore((s) => s.modal);
  const confirm = useOwnerClinicalMasterStore((s) => s.confirm);

  const openCreate = useOwnerClinicalMasterStore((s) => s.openCreate);
  const openEdit = useOwnerClinicalMasterStore((s) => s.openEdit);
  const closeModal = useOwnerClinicalMasterStore((s) => s.closeModal);

  const openConfirm = useOwnerClinicalMasterStore((s) => s.openConfirm);
  const closeConfirm = useOwnerClinicalMasterStore((s) => s.closeConfirm);
  const runConfirm = useOwnerClinicalMasterStore((s) => s.runConfirm);

  // crud
  // fee schedules — one selector per field (a selector returning a new object
  // literal re-renders forever under zustand v5 + React 19).
  const feeSchedules = useOwnerClinicalMasterStore((s) => s.feeSchedules);
  const activeScheduleId = useOwnerClinicalMasterStore((s) => s.activeScheduleId);
  const defaultScheduleId = useOwnerClinicalMasterStore((s) => s.defaultScheduleId);
  const setActiveSchedule = useOwnerClinicalMasterStore((s) => s.setActiveSchedule);
  const createFeeSchedule = useOwnerClinicalMasterStore((s) => s.createFeeSchedule);
  const renameFeeSchedule = useOwnerClinicalMasterStore((s) => s.renameFeeSchedule);
  const setDefaultFeeSchedule = useOwnerClinicalMasterStore((s) => s.setDefaultFeeSchedule);
  const setTreatmentPrice = useOwnerClinicalMasterStore((s) => s.setTreatmentPrice);
  const clearTreatmentPrice = useOwnerClinicalMasterStore((s) => s.clearTreatmentPrice);

  const addTreatment = useOwnerClinicalMasterStore((s) => s.addTreatment);
  const updateTreatment = useOwnerClinicalMasterStore((s) => s.updateTreatment);
  const toggleTreatmentActive = useOwnerClinicalMasterStore((s) => s.toggleTreatmentActive);

  const addDiagnosis = useOwnerClinicalMasterStore((s) => s.addDiagnosis);
  const updateDiagnosis = useOwnerClinicalMasterStore((s) => s.updateDiagnosis);

  const addFinding = useOwnerClinicalMasterStore((s) => s.addFinding);
  const updateFinding = useOwnerClinicalMasterStore((s) => s.updateFinding);

  useEffect(() => {
    useOwnerClinicalMasterStore.getState().init();
  }, []);

  const pageTitle = useMemo(() => "Clinical Master", []);
  const subtitle = useMemo(() => "Owner manages treatments, diagnoses and findings used by dentists", []);

  const primaryActionLabel = useMemo(() => {
    if (activeCategory === "treatments") return "Add Treatment";
    if (activeCategory === "diagnosis") return "Add Clinical Diagnosis";
    return "Add Clinical Finding";
  }, [activeCategory]);

  const activeData = useMemo(() => {
    if (activeCategory === "treatments") return treatments;
    if (activeCategory === "diagnosis") return diagnosis;
    return findings;
  }, [activeCategory, treatments, diagnosis, findings]);

  const filtered = useMemo(() => filterList(activeCategory, filters, activeData), [activeCategory, filters, activeData]);

  return (
    <div className="space-y-6">
      <OwnerPageHeader title={pageTitle} subtitle={subtitle} />

      {/* small status banner */}
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <OwnerClinicalTabs value={activeCategory} onChange={setActiveCategory} />

        <Button
          className="rounded-xl bg-[#2ec4b6] hover:bg-[#26a699] text-white"
          onClick={() => openCreate(activeCategory)}
          disabled={loading}
        >
          {loading ? "Loading..." : primaryActionLabel}
        </Button>
      </div>

      {activeCategory === "treatments" ? (
        <FeeScheduleBar
          schedules={feeSchedules}
          activeScheduleId={activeScheduleId}
          defaultScheduleId={defaultScheduleId}
          disabled={loading}
          onSelect={setActiveSchedule}
          onCreate={createFeeSchedule}
          onRename={renameFeeSchedule}
          onSetDefault={setDefaultFeeSchedule}
          onDelete={(s) =>
            openConfirm({
              title: t("feeSchedules.deleteTitle"),
              message: t("feeSchedules.deleteMessage", { name: s.name }),
              onConfirmKey: "deleteFeeSchedule",
              onConfirmPayload: s.id,
            })
          }
        />
      ) : null}

      <OwnerClinicalFilters category={activeCategory} filters={filters} onChange={setFilter} onReset={resetFilters} />

      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Results</h2>
            <p className="text-sm text-gray-500">
              Showing <span className="font-semibold text-gray-900">{filtered.length}</span>
            </p>
          </div>

          {activeCategory === "treatments" ? (
            <TreatmentsTable
              data={filtered}
              activeScheduleId={activeScheduleId}
              defaultScheduleId={defaultScheduleId}
              onSetPrice={setTreatmentPrice}
              onClearPrice={clearTreatmentPrice}
              onEdit={(t) => openEdit("treatments", t)}
              onToggle={(t) => toggleTreatmentActive(t.id)}
              onDelete={(t) =>
                openConfirm({
                  title: "Delete Treatment",
                  message: `This will permanently delete "${t.name}".`,
                  onConfirmKey: "deleteTreatment",
                  onConfirmPayload: t.id,
                })
              }
            />
          ) : null}

          {activeCategory === "diagnosis" ? (
            <SimpleTemplatesTable
              typeLabel="Clinical Diagnosis"
              data={filtered}
              onEdit={(x) => openEdit("diagnosis", x)}
              onToggle={(x) => updateDiagnosis(x.id, { active: !x.active })}
              onDelete={(x) =>
                openConfirm({
                  title: "Delete Clinical Diagnosis",
                  message: `This will permanently delete "${x.title}".`,
                  onConfirmKey: "deleteDiagnosis",
                  onConfirmPayload: x.id,
                })
              }
            />
          ) : null}

          {activeCategory === "findings" ? (
            <SimpleTemplatesTable
              typeLabel="Clinical Finding"
              data={filtered}
              onEdit={(x) => openEdit("findings", x)}
              onToggle={(x) => updateFinding(x.id, { active: !x.active })}
              onDelete={(x) =>
                openConfirm({
                  title: "Delete Clinical Finding",
                  message: `This will permanently delete "${x.title}".`,
                  onConfirmKey: "deleteFinding",
                  onConfirmPayload: x.id,
                })
              }
            />
          ) : null}
        </CardContent>
      </Card>

      {/* Modals */}
      <TreatmentModal
        open={modal.open && modal.category === "treatments"}
        mode={modal.mode}
        initial={modal.payload}
        onClose={closeModal}
        onSubmit={async (form) => {
          if (modal.mode === "edit") await updateTreatment(modal.payload.id, form);
          else await addTreatment(form);
          closeModal();
        }}
      />

      <SimpleTemplateModal
        open={modal.open && modal.category === "diagnosis"}
        mode={modal.mode}
        initial={modal.payload}
        title="Clinical Diagnosis"
        onClose={closeModal}
        onSubmit={async (form) => {
          if (modal.mode === "edit") await updateDiagnosis(modal.payload.id, form);
          else await addDiagnosis(form);
          closeModal();
        }}
      />

      <SimpleTemplateModal
        open={modal.open && modal.category === "findings"}
        mode={modal.mode}
        initial={modal.payload}
        title="Clinical Finding"
        onClose={closeModal}
        onSubmit={async (form) => {
          if (modal.mode === "edit") await updateFinding(modal.payload.id, form);
          else await addFinding(form);
          closeModal();
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

export default OwnerClinicalMaster;