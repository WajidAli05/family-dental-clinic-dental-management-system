import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";

const InvoiceFilters = ({ query, setQuery, status, setStatus }) => (
  <div className="flex gap-3">
    <Input
      placeholder="Search invoice / patient"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      className="w-64"
    />

    <Select value={status} onValueChange={setStatus}>
      <SelectTrigger className="w-40">{status}</SelectTrigger>
      <SelectContent>
        <SelectItem value="All">All</SelectItem>
        <SelectItem value="Pending">Pending</SelectItem>
        <SelectItem value="Partial">Partial</SelectItem>
        <SelectItem value="Paid">Paid</SelectItem>
      </SelectContent>
    </Select>
  </div>
);

export default InvoiceFilters;