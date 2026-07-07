import { useEffect, useCallback, useState } from "react";
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

const STATUS_FILTERS = [
  { key: "all",         label: "All" },
  { key: "sent",        label: "Sent" },
  { key: "in_progress", label: "In Process" },
  { key: "ready",       label: "Ready" },
  { key: "delivered",   label: "Delivered" },
  { key: "approved",    label: "Approved" },
  { key: "rejected",    label: "Rejected" },
];

export default function LabSamplesTable() {
  const { samples, fetchSamples, loadingSamples, error, pagination } = useLabStore();
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
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => handleStatusFilter(f.key)}
            className={`px-3 py-1 rounded-full border text-xs font-semibold transition-colors ${
              statusFilter === f.key
                ? "bg-[#2ec4b6] text-white border-[#2ec4b6]"
                : "bg-white text-gray-600 border-gray-200 hover:border-[#2ec4b6] hover:text-[#2ec4b6]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? <p className="text-red-600 text-sm">{error}</p> : null}

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
              samples.map((sample) => <LabSampleRow key={sample.id} sample={sample} />)
            )}
          </TableBody>
        </Table>
      )}

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
