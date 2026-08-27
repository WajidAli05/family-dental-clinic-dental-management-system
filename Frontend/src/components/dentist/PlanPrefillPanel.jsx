import { useTranslation } from "react-i18next";
import { ClipboardList, CalendarCheck } from "lucide-react";
import { usePrescriptionStore } from "@/store/prescriptionStore";

/**
 * Treatment-plan items carried into this visit.
 *
 * Prefilling writes the item's TREATMENT into that tooth's clinical entry and
 * nothing else — diagnosis, finding and notes stay empty for the dentist. Every
 * row is fully editable through the normal tooth dialog, and nothing here
 * changes the plan until the dentist ticks an item and saves.
 *
 * Items booked onto THIS appointment are listed first and flagged; other
 * accepted items still appear so a treatment cannot silently go missing.
 */
const PlanPrefillPanel = ({ rows = [] }) => {
  const { t } = useTranslation();
  const planCompletions = usePrescriptionStore((s) => s.planCompletions);
  const togglePlanCompletion = usePrescriptionStore((s) => s.togglePlanCompletion);

  if (!rows.length) return null;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-1.5">
          <ClipboardList className="h-3.5 w-3.5 text-[#2ec4b6]" />
          {t("treatmentPlans.fromPlanTitle")}
        </p>
        <p className="text-xs text-gray-500">{t("treatmentPlans.fromPlanHint")}</p>
      </div>

      <div className="space-y-1.5">
        {rows.map((row) => {
          const key = `${row.planId}|${row.itemId}`;
          const checked = !!planCompletions[key];
          return (
            <div
              key={key}
              className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Treatment names are data — never translated. */}
                  <span className="text-sm font-medium text-gray-900">{row.name}</span>
                  <span className="rounded-full border border-[#2ec4b6]/40 bg-[#2ec4b6]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#1f8f85]">
                    {t("treatmentPlans.fromPlanBadge", { id: row.planId })}
                  </span>
                  {row.forThisVisit && (
                    <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                      <CalendarCheck className="h-2.5 w-2.5 me-0.5" />
                      {t("treatmentPlans.forThisVisit")}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {row.toothNumbers.length
                    ? `${t("treatmentPlans.colTeeth")}: ${row.toothNumbers.join(", ")}`
                    : t("treatmentPlans.wholeMouthItem")}
                  {" · "}
                  {t("treatmentPlans.phase", { n: row.phase })}
                </p>
              </div>

              {/* Explicit confirmation — nothing auto-completes. */}
              <label className="flex items-center gap-2 text-xs text-gray-700 whitespace-nowrap cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#2ec4b6]"
                  checked={checked}
                  onChange={() => togglePlanCompletion(row.planId, row.itemId)}
                />
                {t("treatmentPlans.markCompletedOnSave")}
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlanPrefillPanel;
