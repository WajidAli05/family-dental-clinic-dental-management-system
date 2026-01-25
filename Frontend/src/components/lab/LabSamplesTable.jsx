import { useEffect } from "react";
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

export default function LabSamplesTable() {
  const { samples, fetchSamples, loadingSamples, error } = useLabStore();

  useEffect(() => {
    fetchSamples();
  }, [fetchSamples]);

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-900">Assigned Samples</h2>
        <LabSearch />
      </div>

      {error ? <p className="text-red-600 text-sm">{error}</p> : null}

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
          {loadingSamples ? (
            <TableRow>
              <td className="p-4 text-gray-600" colSpan={6}>
                Loading samples...
              </td>
            </TableRow>
          ) : samples.length === 0 ? (
            <TableRow>
              <td className="p-4 text-gray-600" colSpan={6}>
                No assigned samples found.
              </td>
            </TableRow>
          ) : (
            samples.map((sample) => <LabSampleRow key={sample.id} sample={sample} />)
          )}
        </TableBody>
      </Table>
    </div>
  );
}