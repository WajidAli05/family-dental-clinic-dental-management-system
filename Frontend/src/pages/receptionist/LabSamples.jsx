import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import Wavify from "react-wavify";

// Store
import {
  useLabSampleStore,
} from "@/store/labSampleStore";

// Components
import LabSampleStats from "@/components/receptionist/LabSampleStats";
import LabSampleFilters from "@/components/receptionist/LabSampleFilters";
import LabSampleManagementTable from "@/components/receptionist/LabSampleManagementTable";
import AddLabSampleModal from "@/components/receptionist/AddLabSampleModal";

const LabSamples = () => {
  const {
    samples,
    updateStatus,
    markDelivered,
    getStats,
  } = useLabSampleStore();

  const stats = getStats();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredSamples = samples.filter((s) => {
    const matchesQuery =
      s.patientName.toLowerCase().includes(query.toLowerCase()) ||
      s.mr?.toString().includes(query);

    const matchesStatus =
      status === "All" || s.status === status;

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
          <h1 className="text-2xl font-bold text-gray-900">
            Lab Samples
          </h1>
          <p className="text-gray-500">
            Track and manage lab work
          </p>
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
              onClick={() => setIsModalOpen(true)}
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
          />
        </CardContent>
      </Card>

      {/* Add Sample Modal */}
      <AddLabSampleModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
};

export default LabSamples;