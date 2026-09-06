import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Paperclip } from "lucide-react";
import { useLabStore } from "@/store/labStore";
import AddNoteDialog from "@/components/lab/AddNoteDialog";
import LabCaseStatusControl from "@/components/lab/LabCaseStatusControl";
import { LabStatusBadge, LabPriorityBadge, LabDueBadge } from "@/components/lab/LabCaseBadges";
import { STATUS_LABEL_KEY } from "@/lib/labCaseConfig";

/**
 * One lab case row.
 *
 * The old version kept its own status option list, style map and label map in
 * UI-only spellings ("in-process"), which disagreed with every other
 * dashboard and left the select showing a stale value after a change. It now
 * renders the shared badge and the shared, role-aware status control.
 */
export default function LabSampleRow({ sample, onOpenFiles, todayISO = "" }) {
  const { t } = useTranslation();
  const { updateStatus } = useLabStore();

  const handleChange = async (id, next) => {
    // Rethrows are caught by LabCaseStatusControl; toast here so the lab sees
    // one confirmation per action and nothing renders inline.
    await updateStatus(id, next);
    toast.success(t("labCase.statusUpdated", { status: t(STATUS_LABEL_KEY[next] || next) }));
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="font-medium text-gray-900">{sample.id}</td>
      <td className="text-gray-700">{sample.type}</td>
      <td className="font-mono text-gray-700">{sample.tooth}</td>
      <td className="text-gray-600">{sample.date}</td>

      <td>
        <div className="flex items-center gap-1.5 flex-wrap">
          <LabStatusBadge status={sample.status} />
          <LabPriorityBadge priority={sample.priority} />
          <LabDueBadge labCase={sample} todayISO={todayISO} />
        </div>
      </td>

      <td className="text-end">
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {onOpenFiles && (
            <Button
              size="sm"
              variant="ghost"
              title={t("labCase.attachments")}
              onClick={() => onOpenFiles(sample)}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
          )}
          <AddNoteDialog sample={sample} />
          <LabCaseStatusControl labCase={sample} role="lab" onStatusChange={handleChange} />
        </div>
      </td>
    </tr>
  );
}
