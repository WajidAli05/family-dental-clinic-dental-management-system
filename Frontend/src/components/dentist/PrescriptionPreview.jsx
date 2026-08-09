import { useTranslation } from "react-i18next";
import { usePrescriptionStore } from "@/store/prescriptionStore";

const FOOD_LABEL_KEYS = {
  before: "rx.foodBefore",
  after: "rx.foodAfter",
  with: "rx.foodWith",
};

const doseTriplet = (med) => {
  const parts = String(med.dose || "0+0+0").split("+");
  const m = med.m !== undefined ? (med.m | 0) : parseInt(parts[0]) || 0;
  const n = med.n !== undefined ? (med.n | 0) : parseInt(parts[1]) || 0;
  const e = med.e !== undefined ? (med.e | 0) : parseInt(parts[2]) || 0;
  return `${m}+${n}+${e}`;
};

/**
 * On-screen mirror of the printed prescription, following the same standard
 * dental Rx structure: clinical section (per-tooth, FDI) kept visually
 * distinct from the Rx / medications block. Labels are translated; patient
 * and clinical VALUES are never translated.
 */
const PrescriptionPreview = () => {
  const { t } = useTranslation();
  const patientType     = usePrescriptionStore((s) => s.patientType);
  const selectedTeeth   = usePrescriptionStore((s) => s.selectedTeeth);
  const toothEntries    = usePrescriptionStore((s) => s.toothEntries);
  const diagnosis       = usePrescriptionStore((s) => s.diagnosis);
  const treatment       = usePrescriptionStore((s) => s.treatment);
  const clinicalFinding = usePrescriptionStore((s) => s.clinicalFinding);
  const notes           = usePrescriptionStore((s) => s.notes);
  const medications     = usePrescriptionStore((s) => s.medications);

  const entries = Array.isArray(toothEntries) ? toothEntries : [];
  const meds = Array.isArray(medications) ? medications : [];
  const xrayTeeth = entries.filter((e) => e.xrayRequested);

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden text-sm">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          {t("rx.previewTitle")}
        </p>
        {patientType && (
          <span className="rounded-full bg-white border border-gray-200 px-2 py-0.5 text-[11px] text-gray-600">
            {patientType}
          </span>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* ── Clinical section ── */}
        <section>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#14468C] border-b border-[#14468C]/30 pb-1">
            {entries.length ? t("rx.clinicalFdi") : t("rx.clinical")}
          </p>

          {entries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500">
                    <th className="text-start font-semibold py-1.5 px-2 whitespace-nowrap">{t("rx.colTooth")}</th>
                    <th className="text-start font-semibold py-1.5 px-2">{t("rx.colDiagnosis")}</th>
                    <th className="text-start font-semibold py-1.5 px-2">{t("rx.colTreatment")}</th>
                    <th className="text-start font-semibold py-1.5 px-2">{t("rx.colFinding")}</th>
                    <th className="text-start font-semibold py-1.5 px-2 whitespace-nowrap">{t("rx.colXray")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.map((e) => (
                    <tr key={e.toothNumber} className="align-top">
                      <td className="py-1.5 px-2 font-bold text-gray-900 whitespace-nowrap">{e.toothNumber}</td>
                      <td className="py-1.5 px-2 text-gray-700">{e.diagnosis || "—"}</td>
                      <td className="py-1.5 px-2 text-gray-700">{e.treatment || "—"}</td>
                      <td className="py-1.5 px-2 text-gray-700">
                        {[e.clinicalFinding, e.note].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="py-1.5 px-2 whitespace-nowrap">
                        {e.xrayRequested
                          ? <span className="font-bold text-[#14468C]">{t("rx.yes")}</span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {xrayTeeth.length > 0 && (
                <p className="mt-2 text-xs">
                  <span className="font-semibold text-[#14468C]">{t("rx.xrayRequested")}: </span>
                  <span className="text-gray-700">
                    {xrayTeeth.map((e) => e.toothNumber + (e.xrayNote ? ` (${e.xrayNote})` : "")).join(", ")}
                  </span>
                </p>
              )}
            </div>
          ) : (
            // Legacy fallback — pre-tooth-based prescriptions
            <div className="space-y-1 text-xs">
              <Row label={t("rx.colDiagnosis")} value={diagnosis} />
              <Row label={t("rx.colTreatment")} value={treatment} />
              <Row label={t("rx.colFinding")} value={clinicalFinding} />
              {selectedTeeth?.length > 0 && <Row label={t("rx.teeth")} value={selectedTeeth.join(", ")} />}
            </div>
          )}
        </section>

        {/* ── Rx / medications (general, patient-level) ── */}
        <section>
          <div className="mb-2 flex items-baseline gap-2 border-b border-[#14468C]/30 pb-1">
            <span className="font-serif italic font-bold text-xl leading-none text-[#14468C]">Rx</span>
            <span className="text-[11px] font-bold uppercase tracking-wide text-[#14468C]">
              {t("rx.medications")}
            </span>
          </div>

          {meds.length === 0 ? (
            <p className="text-xs text-gray-500">{t("rx.noMedications")}</p>
          ) : (
            <ol className="space-y-2">
              {meds.map((med, idx) => {
                const sig = [
                  `${t("rx.sig")}: ${doseTriplet(med)}`,
                  med.durationDays ? t("rx.forDays", { count: med.durationDays }) : "",
                  FOOD_LABEL_KEYS[med.withFood] ? t(FOOD_LABEL_KEYS[med.withFood]) : "",
                  med.instructions || "",
                ].filter(Boolean).join("  ·  ");
                return (
                  <li key={idx} className="text-xs">
                    <p className="font-semibold text-gray-900">
                      {idx + 1}. {med.name}
                      {med.strength && <span className="text-gray-600"> {med.strength}</span>}
                      {med.form && <span className="text-gray-400"> ({med.form})</span>}
                    </p>
                    <p className="text-gray-600 ms-4">{sig}</p>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {notes && (
          <section>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[#14468C] border-b border-[#14468C]/30 pb-1">
              {t("rx.advice")}
            </p>
            <p className="text-xs text-gray-700 whitespace-pre-line">{notes}</p>
          </section>
        )}
      </div>
    </div>
  );
};

const Row = ({ label, value }) => (
  <p>
    <span className="text-gray-500">{label}: </span>
    <span className="font-medium text-gray-900">{value || "—"}</span>
  </p>
);

export default PrescriptionPreview;
