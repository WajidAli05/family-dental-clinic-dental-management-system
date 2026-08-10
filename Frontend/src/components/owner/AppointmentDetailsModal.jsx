import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Loader2, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ownerApi } from "@/lib/ownerApi";
import Odontogram from "@/components/patients/Odontogram";

const statusLabel = (s) => {
  switch (s) {
    case "scheduled":
      return "Scheduled";
    case "checked_in":
      return "Checked-in";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return s || "-";
  }
};

const FOOD_LABEL = { before: "before food", after: "after food", with: "with food", any: "" };

const AppointmentDetailsModal = ({ open, onClose, appointment }) => {
  const { t } = useTranslation();
  const [clinical, setClinical] = useState(null);
  const [loading, setLoading] = useState(false);

  const apptId = appointment?.id;

  // Pull the visit's clinical record (prescription + tooth chart). The owner
  // is authorized to read PHI, so the server decrypts for this view.
  useEffect(() => {
    let alive = true;
    if (!open || !apptId) { setClinical(null); return; }

    setLoading(true);
    ownerApi
      .getAppointmentClinical(apptId)
      .then((res) => { if (alive) setClinical(res?.data || null); })
      .catch(() => { if (alive) setClinical(null); })
      .finally(() => { if (alive) setLoading(false); });

    return () => { alive = false; };
  }, [open, apptId]);

  if (!open || !appointment) return null;

  const rx = clinical?.prescription || null;
  const toothEntries = Array.isArray(rx?.toothEntries) ? rx.toothEntries : [];
  const meds = Array.isArray(rx?.medications) ? rx.medications : [];
  const hasLegacyBlock = Boolean(rx?.diagnosis || rx?.treatment || rx?.clinicalFinding);

  return (
    <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              Appointment Details
            </h3>
            <p className="text-xs text-gray-500">
              {appointment.id} • {appointment.date} • {appointment.time}
            </p>
          </div>

          <Button variant="ghost" className="rounded-xl" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Info label="Patient" value={appointment.patientName} />
            <Info label="Phone" value={appointment.patientPhone} />
            <Info label="Dentist" value={appointment.dentistName} />
            <Info label="Status" value={statusLabel(appointment.status)} />
          </div>

          <div className="grid grid-cols-1 gap-3">
            <Info label="Reason" value={appointment.reason} />
            <Info label="Notes" value={appointment.notes || "-"} />
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading clinical record…
            </div>
          )}

          {!loading && !rx && (
            <div className="rounded-xl bg-gray-50 p-4 text-xs text-gray-600">
              No prescription has been recorded for this visit yet — showing booking
              information only. This view is <span className="font-semibold">read-only</span>.
            </div>
          )}

          {!loading && rx && (
            <>
              <div className="flex items-center gap-2 pt-1">
                <Stethoscope className="h-4 w-4 text-[#2ec4b6]" />
                <h4 className="text-sm font-semibold text-gray-900">Clinical Record</h4>
                <span className="text-xs text-gray-400">
                  by {rx.dentistName || "—"} · {rx.date || "—"}
                </span>
              </div>

              {/* Per-tooth clinical entries (tooth-based model) */}
              {toothEntries.length > 0 && (
                <div className="rounded-xl border border-gray-100 p-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Per-Tooth Findings
                  </p>
                  <div className="space-y-2">
                    {toothEntries.map((e) => (
                      <div key={e.toothNumber} className="rounded-lg bg-gray-50 p-2.5 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">Tooth {e.toothNumber}</span>
                          {e.xrayRequested && (
                            <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                              {t("patients.xrayRequested").toUpperCase()}
                              {e.xrayNote ? `: ${e.xrayNote}` : ""}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-0.5 text-xs text-gray-600">
                          {e.diagnosis && <span><span className="text-gray-400">Dx:</span> {e.diagnosis}</span>}
                          {e.treatment && <span><span className="text-gray-400">Tx:</span> {e.treatment}</span>}
                          {e.clinicalFinding && <span><span className="text-gray-400">Finding:</span> {e.clinicalFinding}</span>}
                        </div>
                        {e.note && <p className="mt-1 text-xs text-gray-500">{e.note}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Legacy single-block clinical data (older prescriptions) */}
              {hasLegacyBlock && (
                <div className="rounded-xl border border-gray-100 p-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Info label="Diagnosis" value={rx.diagnosis || "-"} />
                  <Info label="Treatment" value={rx.treatment || "-"} />
                  <Info label="Clinical Finding" value={rx.clinicalFinding || "-"} />
                </div>
              )}

              {rx.notes && (
                <div className="rounded-xl border border-gray-100 p-3">
                  <p className="text-xs text-gray-500">Prescription Notes</p>
                  <p className="mt-1 text-sm text-gray-800">{rx.notes}</p>
                </div>
              )}

              {/* General medications — one list per prescription */}
              <div className="rounded-xl border border-gray-100 p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Medications
                </p>
                {meds.length === 0 ? (
                  <p className="text-sm text-gray-500">None recorded.</p>
                ) : (
                  <ol className="list-decimal list-inside space-y-1">
                    {meds.map((m, i) => (
                      <li key={i} className="text-xs leading-relaxed">
                        <span className="font-medium">{m.name}</span>
                        {m.strength && <span className="text-gray-500"> {m.strength}</span>}
                        {m.form && <span className="text-gray-400 capitalize"> ({m.form})</span>}
                        {m.dose && <span className="text-gray-600"> — {m.dose}</span>}
                        {m.durationDays ? <span className="text-gray-600"> × {m.durationDays} days</span> : null}
                        {FOOD_LABEL[m.withFood] ? <span className="text-gray-500">, {FOOD_LABEL[m.withFood]}</span> : null}
                        {m.instructions && <span className="text-gray-500"> — {m.instructions}</span>}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </>
          )}

          {/* Patient tooth chart at time of viewing — read-only for owner here */}
          {!loading && clinical?.odontogram?.length > 0 && (
            <div className="rounded-xl border border-gray-100 p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                {t("patients.sectionOdontogram")}
              </p>
              <Odontogram odontogram={clinical.odontogram} editable={false} chartClinical />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 flex items-center justify-end gap-2">
          <Button variant="outline" className="rounded-xl" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

const Info = ({ label, value }) => (
  <div className="rounded-xl border border-gray-100 p-3">
    <p className="text-xs text-gray-500">{label}</p>
    <p className="mt-1 text-sm font-semibold text-gray-900">{value}</p>
  </div>
);

export default AppointmentDetailsModal;
