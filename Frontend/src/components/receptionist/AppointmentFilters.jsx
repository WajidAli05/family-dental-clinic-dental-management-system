import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useDentistStore } from "@/store/dentistStore";

export default function AppointmentFilters({ filters, onChange }) {
  const { dentists } = useDentistStore();

  return (
    <>
      {/* Dentist */}
      <Select
        value={filters.dentist}
        onValueChange={(value) => onChange({ ...filters, dentist: value })}
      >
        <SelectTrigger className="h-9 text-sm w-36 shrink-0">
          <SelectValue placeholder="All Dentists" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Dentists</SelectItem>
          {dentists.map((doc) => (
            <SelectItem key={doc.id} value={doc.id}>
              {doc.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status */}
      <Select
        value={filters.status}
        onValueChange={(value) => onChange({ ...filters, status: value })}
      >
        <SelectTrigger className="h-9 text-sm w-32 shrink-0">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Statuses</SelectItem>
          <SelectItem value="Scheduled">Scheduled</SelectItem>
          <SelectItem value="Completed">Completed</SelectItem>
          <SelectItem value="Cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>
    </>
  );
}
