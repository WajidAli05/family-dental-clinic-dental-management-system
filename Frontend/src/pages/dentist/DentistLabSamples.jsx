import { useState } from "react";
import Wavify from "react-wavify";
import { Card, CardContent } from "@/components/ui/card";

// Store
import { useLabSampleStore } from "@/store/labSampleStore";

// Components
import LabSampleStats from "@/components/receptionist/LabSampleStats";
import LabSamplesTable from "@/components/dentist/LabSamplesTable";
import LabSampleFilters from "@/components/dentist/LabSampleFilters";

const DentistLabSamples = () => {
  const { samples, updateSample, getStats } = useLabSampleStore();
  const stats = getStats();

  const [filter, setFilter] = useState("all");

  // ⚠️ Replace later with real logged-in dentist
  const loggedInDentist = "Dr. Ahmed";

  const filteredSamples = samples.filter((s) => {
    if (s.dentist !== loggedInDentist) return false;
    if (filter === "all") return true;
    return s.status === filter;
  });

  const handleApprove = (id) => {
    updateSample(id, { status: "Approved" });
  };

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-white p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Lab Samples
        </h1>
        <p className="text-gray-500">
          Track and approve lab work
        </p>

        <Wavify
          fill="#2ec4b6"
          paused={false}
          options={{
            height: 20,
            amplitude: 30,
            speed: 0.15,
            points: 3,
          }}
          className="absolute bottom-0 left-0 w-full opacity-20"
        />
      </div>

      {/* Stats (REUSED COMPONENT ✅) */}
      <LabSampleStats
        stats={{
          ...stats,
          recent: samples.slice(-5).length,
        }}
      />

      {/* Table */}
      <Card className="rounded-2xl">
        <CardContent className="p-6 space-y-4">

          <LabSampleFilters
            active={filter}
            onChange={setFilter}
          />

          {filteredSamples.length > 0 ? (
            <LabSamplesTable
              data={filteredSamples}
              onApprove={handleApprove}
            />
          ) : (
            <p className="text-sm text-gray-500">
              No samples found.
            </p>
          )}

        </CardContent>
      </Card>

    </div>
  );
};

export default DentistLabSamples;