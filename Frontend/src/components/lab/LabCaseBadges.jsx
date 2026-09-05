import { useTranslation } from "react-i18next";
import {
  canonicalStatus, STATUS_LABEL_KEY, STATUS_BADGE,
  PRIORITY_LABEL_KEY, PRIORITY_BADGE, isOverdue,
} from "@/lib/labCaseConfig";

const pill = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold";

/** Canonical status pill — a legacy "sent" row renders as "Requested". */
export const LabStatusBadge = ({ status, className = "" }) => {
  const { t } = useTranslation();
  const s = canonicalStatus(status);
  return (
    <span className={`${pill} ${STATUS_BADGE[s] || "bg-gray-100 text-gray-700 border-gray-200"} ${className}`}>
      {t(STATUS_LABEL_KEY[s] || "labCase.status.requested")}
    </span>
  );
};

/** Normal priority is the default and stays unlabelled to reduce noise. */
export const LabPriorityBadge = ({ priority, showNormal = false }) => {
  const { t } = useTranslation();
  const p = String(priority || "normal").toLowerCase();
  if (p === "normal" && !showNormal) return null;
  return (
    <span className={`${pill} ${PRIORITY_BADGE[p] || PRIORITY_BADGE.normal}`}>
      {t(PRIORITY_LABEL_KEY[p] || PRIORITY_LABEL_KEY.normal)}
    </span>
  );
};

/** Only shown for cases still open — a delivered case cannot be late. */
export const LabOverdueBadge = ({ labCase, todayISO = "" }) => {
  const { t } = useTranslation();
  if (!isOverdue(labCase, todayISO)) return null;
  return (
    <span className={`${pill} bg-red-100 text-red-700 border-red-200`}>
      {t("labCase.overdue")}
    </span>
  );
};

export const LabCaseBadges = ({ labCase, todayISO = "" }) => (
  <div className="flex items-center gap-1.5 flex-wrap">
    <LabStatusBadge status={labCase?.status} />
    <LabPriorityBadge priority={labCase?.priority} />
    <LabOverdueBadge labCase={labCase} todayISO={todayISO} />
  </div>
);

export default LabCaseBadges;
