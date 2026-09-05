import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { canonicalStatus, STATUS_LABEL_KEY } from "@/lib/labCaseConfig";
import { LabCaseBadges } from "@/components/lab/LabCaseBadges";
import LabCaseStatusControl from "@/components/lab/LabCaseStatusControl";
import LabCaseAttachments from "@/components/lab/LabCaseAttachments";

const overlay =
  "fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-3";
const modalBox =
  "w-full max-w-3xl rounded-2xl bg-white shadow-xl overflow-hidden max-h-[85vh] flex flex-col";

const LabCaseDetailsModal = ({ open, caseItem, onClose, onStatusChange, role = "owner" }) => {
  const { t } = useTranslation();

  if (!open) return null;

  const timeline = Array.isArray(caseItem?.timeline) ? caseItem.timeline : [];

  return (
    <div className={overlay} onMouseDown={onClose}>
      <div className={modalBox} onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{t("labCase.detailsTitle")}</h3>
            <p className="text-sm text-gray-500 mt-1">View timeline · change status as owner</p>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={onClose}>Close</Button>
        </div>

        {/* Scrollable body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Summary */}
          <div className="rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-sm font-semibold text-gray-900">{caseItem?.id}</div>
                <div className="text-xs text-gray-500">
                  Created: {caseItem?.createdAt ? new Date(caseItem.createdAt).toLocaleDateString("en-PK") : "-"}
                </div>
              </div>
              <LabCaseBadges labCase={caseItem} />
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <Info label="Patient" value={caseItem?.patientName} />
              <Info label="Dentist" value={caseItem?.dentistName} />
              <Info label="Lab" value={caseItem?.labName} />
              <Info label="Sample Type" value={caseItem?.sampleTypeName} />
              <Info label={t("labCase.teeth")} value={Array.isArray(caseItem?.teeth) ? caseItem.teeth.join(", ") : (caseItem?.teeth || "-")} />
              <Info label={t("labCase.material")} value={caseItem?.material} />
              <Info label={t("labCase.shade")} value={caseItem?.shade} />
              <Info label={t("labCase.dueDate")} value={caseItem?.dueDate} />
              <div className="md:col-span-2">
                <Info label={t("labCase.instructions")} value={caseItem?.instructions || "-"} />
              </div>
              <div className="md:col-span-2">
                <Info label="Notes" value={caseItem?.notes || "-"} />
              </div>
            </div>
          </div>

          {/* Status: only legal next steps for this role */}
          {onStatusChange && (
            <div className="rounded-2xl border border-gray-100 p-4">
              <div className="text-sm font-semibold text-gray-900 mb-3">{t("labCase.changeStatus")}</div>
              <LabCaseStatusControl labCase={caseItem} role={role} onStatusChange={onStatusChange} />
            </div>
          )}

          <LabCaseAttachments caseId={caseItem?.id} role={role} />

          {/* Timeline */}
          <div className="rounded-2xl border border-gray-100 p-4">
            <div className="text-sm font-semibold text-gray-900">Timeline</div>
            <div className="text-xs text-gray-500 mt-1">Latest updates appear at the bottom.</div>

            <div className="mt-4 space-y-3">
              {timeline.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-500">{t("labCase.noTimeline")}</div>
              ) : (
                timeline.map((entry, idx) => (
                  <div key={`${entry.at}-${idx}`} className="flex gap-3">
                    <div className="pt-1">
                      <span className="block h-2.5 w-2.5 rounded-full bg-[#2ec4b6]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {t(STATUS_LABEL_KEY[canonicalStatus(entry.status)] || "labCase.status.requested")}
                        </div>
                        <div className="text-xs text-gray-500">
                          {entry.at ? new Date(entry.at).toLocaleString() : "-"}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">{entry.note || "-"}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Info = ({ label, value }) => (
  <div className="rounded-xl bg-gray-50 px-3 py-2 border border-gray-100">
    <div className="text-xs font-semibold text-gray-500">{label}</div>
    <div className="text-sm font-medium text-gray-900">{value || "-"}</div>
  </div>
);

export default LabCaseDetailsModal;
