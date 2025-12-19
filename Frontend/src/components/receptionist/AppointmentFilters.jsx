import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

import { useDentistStore } from "@/store/dentistStore";

export default function AppointmentFilters({
  filters,
  onChange,
}) {
  const { dentists } = useDentistStore();

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Date Filter */}
          <div className="space-y-1">
            <Label>Date</Label>
            <Input
              type="date"
              value={filters.date}
              onChange={(e) =>
                onChange({ ...filters, date: e.target.value })
              }
            />
          </div>

          {/* Dentist Filter */}
          <div className="space-y-1">
            <Label>Dentist</Label>
            <Select
              value={filters.dentist}
              onValueChange={(value) =>
                onChange({ ...filters, dentist: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Dentists" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Dentists</SelectItem>
                {dentists.map((doc) => (
                  <SelectItem key={doc.id} value={doc.name}>
                    {doc.name} — {doc.specialization}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <Label>Status</Label>
            <Select
              value={filters.status}
              onValueChange={(value) =>
                onChange({ ...filters, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Scheduled">Scheduled</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}