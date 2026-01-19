import { useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import OwnerPageHeader from "@/components/owner/OwnerPageHeader";
import OwnerClinicalTabs from "@/components/owner/OwnerClinicalTabs";
import OwnerConfirmDialog from "@/components/owner/OwnerConfirmDialog";
import OwnerClinicalFilters from "@/components/owner/OwnerClinicalFilters";

import TreatmentsTable from "@/components/owner/TreatmentsTable";
import SimpleTemplatesTable from "@/components/owner/SimpleTemplatesTable";
import DocTemplatesTable from "@/components/owner/DocTemplatesTable";

import TreatmentModal from "@/components/owner/TreatmentModal";
import SimpleTemplateModal from "@/components/owner/SimpleTemplateModal";
import DocTemplateBuilderModal from "@/components/owner/DocTemplateBuilderModal";

import { useOwnerClinicalMasterStore } from "@/store/ownerClinicalMasterStore";

// ✅ stable pure helper (no store access)
const filterList = (category, filters, data) => {
  const q = String(filters.query || "").trim().toLowerCase();
  const status = filters.status;

  const includesQ = (text) => {
    if (!q) return true;
    return String(text || "").toLowerCase().includes(q);
  };

  if (category === "treatments") {
    return data.filter((t) => {
      const okQuery = includesQ(`${t.id} ${t.name} ${t.code} ${t.notes} ${t.fee}`);
      if (!okQuery) return false;
      if (status === "active" && !t.active) return false;
      if (status === "inactive" && t.active) return false;
      return true;
    });
  }

  if (category === "diagnosis" || category === "findings") {
    return data.filter((x) => {
      const okQuery = includesQ(`${x.id} ${x.title} ${x.description}`);
      if (!okQuery) return false;
      if (status === "active" && !x.active) return false;
      if (status === "inactive" && x.active) return false;
      return true;
    });
  }

  // docs
  return data.filter((t) => {
    const sectionsCount = t.sections?.length || 0;
    const fieldsCount = (t.sections || []).reduce((sum, s) => sum + (s.fields?.length || 0), 0);

    const okQuery = includesQ(`${t.id} ${t.name} ${sectionsCount} ${fieldsCount}`);
    if (!okQuery) return false;

    if (status === "enabled" && !t.enabled) return false;
    if (status === "disabled" && t.enabled) return false;

    return true;
  });
};

const OwnerClinicalMaster = () => {
  const activeCategory = useOwnerClinicalMasterStore((s) => s.activeCategory);
  const setActiveCategory = useOwnerClinicalMasterStore((s) => s.setActiveCategory);

  // raw lists
  const treatments = useOwnerClinicalMasterStore((s) => s.treatments);
  const diagnosis = useOwnerClinicalMasterStore((s) => s.diagnosisTemplates);
  const findings = useOwnerClinicalMasterStore((s) => s.clinicalFindingTemplates);
  const docs = useOwnerClinicalMasterStore((s) => s.documentationTemplates);

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

  // crud actions
  const addTreatment = useOwnerClinicalMasterStore((s) => s.addTreatment);
  const updateTreatment = useOwnerClinicalMasterStore((s) => s.updateTreatment);
  const toggleTreatmentActive = useOwnerClinicalMasterStore((s) => s.toggleTreatmentActive);

  const addDiagnosis = useOwnerClinicalMasterStore((s) => s.addDiagnosis);
  const updateDiagnosis = useOwnerClinicalMasterStore((s) => s.updateDiagnosis);

  const addFinding = useOwnerClinicalMasterStore((s) => s.addFinding);
  const updateFinding = useOwnerClinicalMasterStore((s) => s.updateFinding);

  const addDocTemplate = useOwnerClinicalMasterStore((s) => s.addDocTemplate);
  const updateDocTemplate = useOwnerClinicalMasterStore((s) => s.updateDocTemplate);
  const toggleDocTemplateEnabled = useOwnerClinicalMasterStore((s) => s.toggleDocTemplateEnabled);

  useEffect(() => {
    useOwnerClinicalMasterStore.getState().init();
  }, []);

  const pageTitle = useMemo(() => "Treatments & Clinical Documentation", []);
  const subtitle = useMemo(() => "Owner manages master data and templates used by dentists", []);

  const primaryActionLabel = useMemo(() => {
    if (activeCategory === "treatments") return "Add Treatment";
    if (activeCategory === "diagnosis") return "Add Diagnosis Template";
    if (activeCategory === "findings") return "Add Clinical Finding";
    return "Add Documentation Template";
  }, [activeCategory]);

  const activeData = useMemo(() => {
    if (activeCategory === "treatments") return treatments;
    if (activeCategory === "diagnosis") return diagnosis;
    if (activeCategory === "findings") return findings;
    return docs;
  }, [activeCategory, treatments, diagnosis, findings, docs]);

  // ✅ filtered list computed in component (stable, no subscription loop)
  const filtered = useMemo(
    () => filterList(activeCategory, filters, activeData),
    [activeCategory, filters, activeData]
  );

  return (
    <div className="space-y-6">
      <OwnerPageHeader title={pageTitle} subtitle={subtitle} />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <OwnerClinicalTabs value={activeCategory} onChange={setActiveCategory} />

        <Button
          className="rounded-xl bg-[#2ec4b6] hover:bg-[#26a699] text-white"
          onClick={() => openCreate(activeCategory)}
        >
          {primaryActionLabel}
        </Button>
      </div>

      {/* ✅ Search & Filters */}
      <OwnerClinicalFilters
        category={activeCategory}
        filters={filters}
        onChange={setFilter}
        onReset={resetFilters}
      />

      {/* Content */}
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
              typeLabel="Diagnosis"
              data={filtered}
              onEdit={(x) => openEdit("diagnosis", x)}
              onToggle={(x) => updateDiagnosis(x.id, { active: !x.active })}
              onDelete={(x) =>
                openConfirm({
                  title: "Delete Diagnosis Template",
                  message: `This will permanently delete "${x.title}".`,
                  onConfirmKey: "deleteDiagnosis",
                  onConfirmPayload: x.id,
                })
              }
            />
          ) : null}

          {activeCategory === "findings" ? (
            <SimpleTemplatesTable
              typeLabel="Finding"
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

          {activeCategory === "docs" ? (
            <DocTemplatesTable
              data={filtered}
              onEdit={(t) => openEdit("docs", t)}
              onToggle={(t) => toggleDocTemplateEnabled(t.id)}
              onDelete={(t) =>
                openConfirm({
                  title: "Delete Documentation Template",
                  message: `This will permanently delete "${t.name}".`,
                  onConfirmKey: "deleteDocTemplate",
                  onConfirmPayload: t.id,
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
        onSubmit={(form) => {
          if (modal.mode === "edit") updateTreatment(modal.payload.id, form);
          else addTreatment(form);
          closeModal();
        }}
      />

      <SimpleTemplateModal
        open={modal.open && modal.category === "diagnosis"}
        mode={modal.mode}
        initial={modal.payload}
        title="Diagnosis Template"
        onClose={closeModal}
        onSubmit={(form) => {
          if (modal.mode === "edit") updateDiagnosis(modal.payload.id, form);
          else addDiagnosis(form);
          closeModal();
        }}
      />

      <SimpleTemplateModal
        open={modal.open && modal.category === "findings"}
        mode={modal.mode}
        initial={modal.payload}
        title="Clinical Finding"
        onClose={closeModal}
        onSubmit={(form) => {
          if (modal.mode === "edit") updateFinding(modal.payload.id, form);
          else addFinding(form);
          closeModal();
        }}
      />

      <DocTemplateBuilderModal
        open={modal.open && modal.category === "docs"}
        mode={modal.mode}
        initial={modal.payload}
        onClose={closeModal}
        onCreate={(payload) => addDocTemplate(payload)}
        onUpdate={(id, payload) => updateDocTemplate(id, payload)}
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