import { useEffect, useMemo, useState } from "react";
import Wavify from "react-wavify";
import { Card, CardContent } from "@/components/ui/card";

import { useDentistCasesStore } from "@/store/dentistCasesStore";
import LabSampleStats from "@/components/receptionist/LabSampleStats";
import LabSamplesTable from "@/components/dentist/LabSamplesTable";
import LabSampleFilters from "@/components/dentist/LabSampleFilters";

const mapBackendStatusToUiTitle = (s) => {
  const v = String(s || "").toLowerCase();
  if (v === "received" || v === "sent") return "Sent";
  if (v === "in_progress" || v === "in-process") return "In Process";
  if (v === "ready") return "Ready";
  if (v === "delivered") return "Delivered";
  if (v === "approved") return "Approved";
  if (v === "rejected") return "Rejected";
  return "Sent";
};

const mapFilterToBackend = (filter) => {
  if (filter === "all") return "all";
  const f = String(filter).toLowerCase();
  if (f === "sent") return "sent";
  if (f === "in process" || f === "in-process") return "in_progress";
  if (f === "ready") return "ready";
  if (f === "delivered") return "delivered";
  if (f === "approved") return "approved";
  if (f === "rejected") return "rejected";
  return "all";
};

const DentistLabSamples = () => {
  const { cases, fetchCases, approveCase, loading, error } = useDentistCasesStore();
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchCases({ status: "all" });
  }, [fetchCases]);

  useEffect(() => {
    fetchCases({ status: mapFilterToBackend(filter) });
  }, [filter, fetchCases]);

  const normalized = useMemo(() => {
    return (cases || []).map((c) => ({
      ...c,
      status: mapBackendStatusToUiTitle(c.status),
    }));
  }, [cases]);

  const stats = useMemo(() => {
    const total = normalized.length;
    const sent = normalized.filter((x) => x.status === "Sent").length;
    const inProcess = normalized.filter((x) => x.status === "In Process").length;
    const ready = normalized.filter((x) => x.status === "Ready").length;

    return { total, sent, inProcess, ready };
  }, [normalized]);

  const handleApprove = async (id) => {
    await approveCase(id);
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
          <LabSampleFilters active={filter} onChange={setFilter} />

          {error && <p className="text-sm text-red-600">{error}</p>}

          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : normalized.length > 0 ? (
            <LabSamplesTable data={normalized} onApprove={handleApprove} />
          ) : (
            <p className="text-sm text-gray-500">No samples found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DentistLabSamples;