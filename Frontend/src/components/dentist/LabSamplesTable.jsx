import { useTranslation } from "react-i18next";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, RotateCcw, Paperclip } from "lucide-react";
import { useFormatMoney } from "@/store/clinicConfigStore";
import { allowedNextStatuses, STATUS_LABEL_KEY } from "@/lib/labCaseConfig";
import { LabStatusBadge, LabPriorityBadge, LabDueBadge } from "@/components/lab/LabCaseBadges";

/**
 * Dentist lab-case table.
 *
 * Actions are derived from the SHARED allowedNext for this (status, role)
 * pair — never a hardcoded button list. Previously this rendered Approve and
 * Reject for anything that was not already approved/rejected, so a case the
 * lab had not even accepted yet already offered a clinical sign-off.
 *
 * The buttons the dentist gets are the intersection of what the lifecycle
 * permits and what this role may set, so they cannot offer a call the server
 * would refuse.
 */
const ACTION_META = {
  approved:      { icon: CheckCircle, variant: "primary" },
  rejected:      { icon: XCircle,     variant: "destructive" },
  in_production: { icon: RotateCcw,   variant: "outline" },
  received:      { icon: CheckCircle, variant: "outline" },
  fitted:        { icon: CheckCircle, variant: "outline" },
};

const LabSamplesTable = ({ data, onStatusChange, onOpenFiles, todayISO = "" }) => {
  const { t } = useTranslation();
  const money = useFormatMoney();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("labCase.col.id")}</TableHead>
          <TableHead>{t("labCase.col.patient")}</TableHead>
          <TableHead>{t("labCase.col.lab")}</TableHead>
          <TableHead>{t("labCase.col.sampleType")}</TableHead>
          <TableHead>{t("labCase.col.teeth")}</TableHead>
          <TableHead>{t("labCase.col.sent")}</TableHead>
          <TableHead>{t("labCase.col.status")}</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>

      <TableBody>
        {data.map((s) => {
          // The single source of truth for what this dentist may do next.
          const actions = allowedNextStatuses(s.status, "dentist", s.allowedNext);
          return (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.id}</TableCell>
              <TableCell>{s.patientName}</TableCell>
              <TableCell>{s.lab || s.labName}</TableCell>
              <TableCell>
                <span className="text-sm">{s.type || "—"}</span>
                {s.sampleTypePrice > 0 && (
                  <span className="ms-1 text-xs text-gray-500">{money(s.sampleTypePrice)}</span>
                )}
              </TableCell>
              <TableCell>#{(s.teeth || []).join(", ")}</TableCell>
              <TableCell>{s.sentDate}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <LabStatusBadge status={s.status} />
                  <LabPriorityBadge priority={s.priority} />
                  <LabDueBadge labCase={s} todayISO={todayISO} />
                </div>
              </TableCell>

              <TableCell>
                <div className="flex gap-1 flex-wrap items-center justify-end">
                  {onOpenFiles && (
                    <Button
                      size="sm"
                      variant="ghost"
                      title={t("labCase.attachments")}
                      onClick={() => onOpenFiles(s)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>
                  )}
                  {actions.length === 0 ? (
                    <span className="text-xs text-gray-400 italic">{t("labCase.noActions")}</span>
                  ) : (
                    actions.map((next) => {
                      const meta = ACTION_META[next] || { icon: CheckCircle, variant: "outline" };
                      const Icon = meta.icon;
                      return (
                        <Button
                          key={next}
                          size="sm"
                          variant={meta.variant === "primary" ? "default" : meta.variant}
                          className={meta.variant === "primary" ? "bg-[#2ec4b6] hover:bg-[#26a699]" : ""}
                          onClick={() => onStatusChange(s.id, next)}
                        >
                          <Icon className="w-4 h-4 me-1" />
                          {t(STATUS_LABEL_KEY[next] || next)}
                        </Button>
                      );
                    })
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default LabSamplesTable;
