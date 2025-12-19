import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export default function LabSampleFilters({
  query,
  setQuery,
  status,
  setStatus,
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <Input
        placeholder="Search by patient or MR"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-64"
      />

      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All</SelectItem>
          <SelectItem value="Sent">Sent</SelectItem>
          <SelectItem value="In Process">In Process</SelectItem>
          <SelectItem value="Ready">Ready</SelectItem>
          <SelectItem value="Delivered">Delivered</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}