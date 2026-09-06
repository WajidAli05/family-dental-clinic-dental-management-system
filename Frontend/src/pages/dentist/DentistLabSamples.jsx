import { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import Wavify from "react-wavify";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import { useDentistCasesStore } from "@/store/dentistCasesStore";
import LabSampleStats from "@/components/receptionist/LabSampleStats";
import LabSamplesTable from "@/components/dentist/LabSamplesTable";
import LabSampleFilters from "@/components/dentist/LabSampleFilters";
import DentistAddLabSampleModal from "@/components/dentist/DentistAddLabSampleModal";

import TablePagination from "@/components/ui/TablePagination";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { usePagination } from "@/hooks/usePagination";
import LabCaseAttachments from "@/components/lab/LabCaseAttachments";
import { canonicalStatus, sortByAttention, STATUS_LABEL_KEY } from "@/lib/labCaseConfig";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Filter values are canonical now — the API accepts canonical AND legacy
 * spellings, so no translation table is needed here any more. The two local
 * status maps that used to live in this file produced Title Case labels that
 * disagreed with every other dashboard.
 */
const mapFilterToBackend = (filter) =>
  !filter || filter === "all" ? "all" : canonicalStatus(filter);

const DentistLabSamples = () => {
  const { t } = useTranslation();
  const { cases, fetchCases, updateCaseStatus, loading, pagination } = useDentistCasesStore();
  const [filesCase, setFilesCase] = useState(null);
  const { page, limit, setPage, resetPage } = usePagination(50);
  const [filter, setFilter] = useState("all");
  const [addModalOpen, setAddModalOpen] = useState(false);

  const load = useCallback(() => {
    fetchCases({ status: mapFilterToBackend(filter), page, limit });
  }, [fetchCases, filter, page, limit]);

  useEffect(() => { load(); }, [load]);

  const handleFilterChange = (f) => { setFilter(f); resetPage(); };

  // Server already returns canonical status + dueState; only ordering is added,
  // so overdue / due-soon / urgent cases surface at the top.
  const todayISO = new Date().toISOString().slice(0, 10);
  const normalized = useMemo(
    () => sortByAttention(cases || [], todayISO),
    [cases, todayISO]
  );

  const stats = useMemo(() => {
    const total     = normalized.length;
    const sent      = normalized.filter((x) => canonicalStatus(x.status) === "requested").length;
    const inProcess = normalized.filter((x) => canonicalStatus(x.status) === "in_production").length;
    const ready     = normalized.filter((x) => canonicalStatus(x.status) === "ready").length;
    return { total, sent, inProcess, ready };
  }, [normalized]);

  // Success and failure both surface as toasts — one mechanism, app-wide.
  const handleStatusChange = async (id, next) => {
    try {
      await updateCaseStatus(id, next);
      toast.success(t("labCase.statusUpdated", { status: t(STATUS_LABEL_KEY[next] || next) }));
      load();
    } catch (e) {
      toast.error(e?.message || t("common.error"));
    }
  };

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-white p-6">
        <h1 className="text-2xl font-bold text-gray-900">Lab Samples</h1>
        <p className="text-gray-500">Track and approve lab work</p>

        <Wavify
          fill="#2ec4b6"
          paused={false}
          options={{ height: 20, amplitude: 30, speed: 0.15, points: 3 }}
          className="absolute bottom-0 left-0 w-full opacity-20"
        />
      </div>

      <LabSampleStats
        stats={{
          total: stats.total,
          sent: stats.sent,
          inProcess: stats.inProcess,
          ready: stats.ready,
          recent: Math.min(5, normalized.length),
        }}
      />

      <Card className="rounded-2xl">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <LabSampleFilters active={filter} onChange={handleFilterChange} />
            <Button
              className="bg-[#2ec4b6] hover:bg-[#26a699] text-white rounded-xl shrink-0"
              onClick={() => setAddModalOpen(true)}
            >
              <Plus size={16} className="mr-1" />
              Add Sample
            </Button>
          </div>

          {loading ? (
            <TableSkeleton rows={6} cols={5} />
          ) : normalized.length > 0 ? (
            <LabSamplesTable data={normalized} onStatusChange={handleStatusChange} onOpenFiles={setFilesCase} todayISO={todayISO} />
          ) : (
            <p className="text-sm text-gray-500">No samples found.</p>
          )}

          <TablePagination
            page={pagination?.page ?? page}
            pages={pagination?.pages ?? 1}
            total={pagination?.total ?? 0}
            limit={limit}
            onPage={setPage}
          />
        </CardContent>
      </Card>

      {/* Attachments — the SAME component the owner screen uses. */}
      <Dialog open={!!filesCase} onOpenChange={(o) => !o && setFilesCase(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("labCase.attachments")} — {filesCase?.id}</DialogTitle>
          </DialogHeader>
          {filesCase && <LabCaseAttachments caseId={filesCase.id} role="dentist" />}
        </DialogContent>
      </Dialog>

      <DentistAddLabSampleModal
        open={addModalOpen}
        onClose={() => { setAddModalOpen(false); load(); }}
      />
    </div>
  );
};

export default DentistLabSamples;
