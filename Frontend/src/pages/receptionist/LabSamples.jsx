import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Wavify from "react-wavify";

import { useLabSampleStore } from "@/store/labSampleStore";

import LabSampleStats from "@/components/receptionist/LabSampleStats";
import LabSampleFilters from "@/components/receptionist/LabSampleFilters";
import LabSampleManagementTable from "@/components/receptionist/LabSampleManagementTable";
import AddLabSampleModal from "@/components/receptionist/AddLabSampleModal";
import EditLabSampleModal from "@/components/receptionist/EditLabSampleModal";
import DeleteConfirmModal from "@/components/receptionist/DeleteConfirmModal";

import TablePagination from "@/components/ui/TablePagination";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { usePagination } from "@/hooks/usePagination";

const LabSamples = () => {
  const {
    samples,
    fetchSamples,
    loading,
    error,
    pagination,
    updateStatus,
    markDelivered,
    deleteSample,
    getStats,
  } = useLabSampleStore();

  const stats = getStats();
  const { page, limit, setPage, resetPage } = usePagination(50);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSample, setEditingSample] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(() => {
    if (typeof fetchSamples !== "function") return;
    const params = { page, limit };
    if (query) params.q = query;
    if (status && status !== "All") params.status = status;
    fetchSamples(params);
  }, [fetchSamples, query, status, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const handleQueryChange = (q) => { setQuery(q); resetPage(); };
  const handleStatusChange = (s) => { setStatus(s); resetPage(); };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-white">
        <Wavify
          fill="#2ec4b6"
          paused={false}
          options={{ height: 20, amplitude: 30, speed: 0.15, points: 3 }}
          className="absolute bottom-0 left-0 w-full opacity-20"
        />
        <div className="relative z-10 p-6">
          <h1 className="text-2xl font-bold">Lab Samples</h1>
          <p className="text-gray-500">Track and manage lab work</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-50 text-red-700 p-3 text-sm">{error}</div>
      ) : null}

      <LabSampleStats stats={stats} />

      <Card className="rounded-2xl">
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <LabSampleFilters
              query={query}
              setQuery={handleQueryChange}
              status={status}
              setStatus={handleStatusChange}
            />

            <Button
              onClick={() => setIsAddOpen(true)}
              className="bg-[#2ec4b6] hover:bg-[#26a699]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Sample
            </Button>
          </div>

          {loading ? (
            <TableSkeleton rows={8} cols={6} />
          ) : (
            <LabSampleManagementTable
              data={samples}
              onStatusChange={updateStatus}
              onDeliver={markDelivered}
              onEdit={(sample) => setEditingSample(sample)}
              onDelete={(id) => setDeletingId(id)}
            />
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

      <AddLabSampleModal open={isAddOpen} onOpenChange={setIsAddOpen} />

      <EditLabSampleModal
        open={!!editingSample}
        sample={editingSample}
        onOpenChange={(open) => { if (!open) setEditingSample(null); }}
      />

      <DeleteConfirmModal
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={async () => {
          await deleteSample(deletingId);
          setDeletingId(null);
        }}
      />
    </div>
  );
};

export default LabSamples;
