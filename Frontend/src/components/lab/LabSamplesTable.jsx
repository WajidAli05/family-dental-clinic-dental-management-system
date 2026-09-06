import { useEffect, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useLabStore } from "@/store/labStore";
import LabSampleRow from "./LabSampleRow";
import LabSearch from "./LabSearch";
import TablePagination from "@/components/ui/TablePagination";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { usePagination } from "@/hooks/usePagination";
import LabCaseAttachments from "@/components/lab/LabCaseAttachments";
import { CANONICAL_STATUSES, STATUS_LABEL_KEY, sortByAttention } from "@/lib/labCaseConfig";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Filters come from the shared canonical list. The lab never acts on
// approved/rejected, but it must still be able to FILTER by them to see
// decisions that came back.
const FILTER_KEYS = ["all", ...CANONICAL_STATUSES];

export default function LabSamplesTable() {
  const { t } = useTranslation();
  const { samples, fetchSamples, loadingSamples, error, pagination } = useLabStore();
  const [filesCase, setFilesCase] = useState(null);
  const todayISO = new Date().toISOString().slice(0, 10);
  const { page, limit, setPage, resetPage } = usePagination(50);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQ, setSearchQ] = useState("");

  const load = useCallback(() => {
    fetchSamples({
      page,
      limit,
      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      ...(searchQ.trim() ? { q: searchQ.trim() } : {}),
    });
  }, [fetchSamples, page, limit, statusFilter, searchQ]);

  useEffect(() => { load(); }, [load]);

  // Store-level failures become a toast. Keyed on the message so a single
  // failure toasts once rather than on every re-render.
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const handleStatusFilter = (key) => {
    setStatusFilter(key);
    resetPage();
  };

  const handleSearch = useCallback((val) => {
    setSearchQ(val);
    resetPage();
  }, [resetPage]);

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-900">Assigned Samples</h2>
        <LabSearch value={searchQ} onChange={handleSearch} />
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        {FILTER_KEYS.map((key) => ({ key })).map((f) => (
          <button
            key={f.key}
            onClick={() => handleStatusFilter(f.key)}
            className={`px-3 py-1 rounded-full border text-xs font-semibold transition-colors ${
              statusFilter === f.key
                ? "bg-[#2ec4b6] text-white border-[#2ec4b6]"
                : "bg-white text-gray-600 border-gray-200 hover:border-[#2ec4b6] hover:text-[#2ec4b6]"
            }`}
          >
            {f.key === "all" ? t("common.all") : t(STATUS_LABEL_KEY[f.key] || f.key)}
          </button>
        ))}
      </div>

      {loadingSamples ? (
        <TableSkeleton rows={6} cols={6} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sample ID</TableHead>
              <TableHead>Sample Type</TableHead>
              <TableHead>Tooth No</TableHead>
              <TableHead>Sent Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {samples.length === 0 ? (
              <TableRow>
                <td className="p-4 text-gray-600" colSpan={6}>No assigned samples found.</td>
              </TableRow>
            ) : (
              sortByAttention(samples, todayISO).map((sample) => (
                <LabSampleRow
                  key={sample.id}
                  sample={sample}
                  onOpenFiles={setFilesCase}
                  todayISO={todayISO}
                />
              ))
            )}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!filesCase} onOpenChange={(o) => !o && setFilesCase(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("labCase.attachments")} — {filesCase?.id}</DialogTitle>
          </DialogHeader>
          {filesCase && <LabCaseAttachments caseId={filesCase.id} role="lab" />}
        </DialogContent>
      </Dialog>

      <TablePagination
        page={pagination?.page ?? page}
        pages={pagination?.pages ?? 1}
        total={pagination?.total ?? 0}
        limit={limit}
        onPage={setPage}
      />
    </div>
  );
}
