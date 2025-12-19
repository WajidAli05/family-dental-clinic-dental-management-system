import { useState } from "react";
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

const LabSamples = () => {
  const {
    samples,
    updateStatus,
    markDelivered,
    deleteSample,
    getStats,
  } = useLabSampleStore();

  const stats = getStats();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSample, setEditingSample] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const filteredSamples = samples.filter((s) => {
    const matchesQuery =
      s.patientName.toLowerCase().includes(query.toLowerCase()) ||
      s.mr?.toString().includes(query);

    const matchesStatus = status === "All" || s.status === status;

    return matchesQuery && matchesStatus;
  });

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

      {/* Stats */}
      <LabSampleStats stats={stats} />

      {/* Table */}
      <Card className="rounded-2xl">
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <LabSampleFilters
              query={query}
              setQuery={setQuery}
              status={status}
              setStatus={setStatus}
            />

            <Button
              onClick={() => setIsAddOpen(true)}
              className="bg-[#2ec4b6] hover:bg-[#26a699]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Sample
            </Button>
          </div>

          <LabSampleManagementTable
            data={filteredSamples}
            onStatusChange={updateStatus}
            onDeliver={markDelivered}
            onEdit={(sample) => setEditingSample(sample)}
            onDelete={(id) => setDeletingId(id)}
          />
        </CardContent>
      </Card>

      {/* Add */}
      <AddLabSampleModal open={isAddOpen} onOpenChange={setIsAddOpen} />

      {/* Edit */}
      <EditLabSampleModal
        open={!!editingSample}
        sample={editingSample}
        onOpenChange={(open) => {
          if (!open) setEditingSample(null);
        }}
      />

      {/* Delete */}
      <DeleteConfirmModal
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => {
          deleteSample(deletingId);
          setDeletingId(null);
        }}
      />
    </div>
  );
};

export default LabSamples;