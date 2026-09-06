import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Paperclip } from "lucide-react";
import { useTranslation } from "react-i18next";
import { allowedNextStatuses, STATUS_LABEL_KEY } from "@/lib/labCaseConfig";
import { LabStatusBadge, LabPriorityBadge, LabDueBadge } from "@/components/lab/LabCaseBadges";

/**
 * Statuses and transitions come from the shared config. This table used to
 * offer "any ↔ any" from a Title-Case list of its own, which both disagreed
 * with the other dashboards and offered moves the server refuses.
 */
export default function LabSampleManagementTable({
  data = [],
  onStatusChange,
  onEdit,
  onDelete,
  onOpenFiles,
  todayISO = "",
}) {
  const { t } = useTranslation();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Sample ID</TableHead>
          <TableHead>Patient</TableHead>
          <TableHead>Lab</TableHead>
          <TableHead>Teeth</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {data.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-gray-500 py-6">
              No lab samples found
            </TableCell>
          </TableRow>
        )}

        {data.map((sample) => {
          const teethDisplay = Array.isArray(sample.teeth)
            ? sample.teeth.filter(Boolean).join(", ")
            : "—";

          const nextOptions = allowedNextStatuses(sample.status, "receptionist", sample.allowedNext);
          return (
            <TableRow key={sample.id}>
              <TableCell className="font-medium">{sample.id}</TableCell>
              <TableCell>{sample.patientName}</TableCell>
              <TableCell>{sample.lab}</TableCell>
              <TableCell>{teethDisplay || "—"}</TableCell>

              <TableCell>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <LabStatusBadge status={sample.status} />
                  <LabPriorityBadge priority={sample.priority} />
                  <LabDueBadge labCase={sample} todayISO={todayISO} />
                </div>
              </TableCell>

              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  {/* Only the steps the front desk may legally take next. */}
                  <Select
                    value=""
                    onValueChange={(newStatus) => onStatusChange(sample.id, newStatus)}
                    disabled={nextOptions.length === 0}
                  >
                    <SelectTrigger className="w-[150px] h-8 text-sm">
                      <SelectValue placeholder={t("labCase.selectNextStatus")} />
                    </SelectTrigger>
                    <SelectContent>
                      {nextOptions.map((st) => (
                        <SelectItem key={st} value={st}>
                          {t(STATUS_LABEL_KEY[st] || st)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Attachments — read-only for the front desk */}
                  {onOpenFiles && (
                    <Button size="icon" variant="outline" className="text-muted-foreground hover:text-foreground" title={t("labCase.attachments")} onClick={() => onOpenFiles(sample)}>
                      <Paperclip size={16} />
                    </Button>
                  )}

                  {/* Edit */}
                  <Button size="icon" variant="outline" onClick={() => onEdit(sample)}>
                    <Pencil size={16} />
                  </Button>

                  {/* Delete */}
                  <Button size="icon" variant="outline" onClick={() => onDelete(sample.id)}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
