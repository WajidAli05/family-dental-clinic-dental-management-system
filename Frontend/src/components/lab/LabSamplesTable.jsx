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
  const { samples } = useLabStore();

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Assigned Samples
        </h2>
        <LabSearch />
      </div>

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
          {samples.map((sample) => (
            <LabSampleRow key={sample.id} sample={sample} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}