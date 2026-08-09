import { usePrescriptionStore } from "@/store/prescriptionStore";

const FOOD_LABEL = { before: "before food", after: "after food", with: "with food", any: "" };

const PrescriptionPreview = () => {
  const {
    patientType,
    selectedTeeth,
    toothEntries,
    diagnosis,
    treatment,
    notes,
    medications,
  } = usePrescriptionStore();

  return (
    <div className="border rounded-xl p-4 bg-gray-50 text-sm space-y-1">
      <p><strong>Patient Type:</strong> {patientType || "—"}</p>

      {/* Per-tooth clinical record (new). Falls back to the legacy single
          diagnosis/treatment block for older prescriptions. */}
      {toothEntries?.length > 0 ? (
        <div className="pt-1">
          <p className="font-semibold mb-1">Per-tooth findings:</p>
          <ul className="space-y-1">
            {toothEntries.map((e) => (
              <li key={e.toothNumber} className="text-xs leading-relaxed">
                <span className="font-semibold">Tooth {e.toothNumber}</span>
                {e.diagnosis && <span className="text-gray-600"> — Dx: {e.diagnosis}</span>}
                {e.treatment && <span className="text-gray-600"> · Tx: {e.treatment}</span>}
                {e.clinicalFinding && <span className="text-gray-600"> · Finding: {e.clinicalFinding}</span>}
                {e.note && <span className="text-gray-500"> · {e.note}</span>}
                {e.xrayRequested && (
                  <span className="ml-1 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                    X-RAY{e.xrayNote ? `: ${e.xrayNote}` : ""}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <p><strong>Teeth:</strong> {selectedTeeth.length ? selectedTeeth.join(", ") : "—"}</p>
          <p><strong>Diagnosis:</strong> {diagnosis || "—"}</p>
          <p><strong>Treatment:</strong> {treatment || "—"}</p>
        </>
      )}

      <p><strong>Notes:</strong> {notes || "—"}</p>

      {medications && medications.length > 0 && (
        <div className="pt-2 border-t border-gray-200 mt-2">
          <p className="font-semibold mb-1">Rx:</p>
          <ol className="list-decimal list-inside space-y-1">
            {medications.map((med, idx) => {
              const dose = `${med.m || 0}+${med.n || 0}+${med.e || 0}`;
              const food = FOOD_LABEL[med.withFood] || "";
              const dur  = med.durationDays ? `× ${med.durationDays} days` : "";
              const instr = med.instructions ? ` — ${med.instructions}` : "";
              return (
                <li key={idx} className="text-xs leading-relaxed">
                  <span className="font-medium">{med.name}</span>
                  {med.strength && <span className="text-gray-500"> {med.strength}</span>}
                  {med.form && <span className="text-gray-400 capitalize"> ({med.form})</span>}
                  <span className="text-gray-600"> — {dose}</span>
                  {dur && <span className="text-gray-600"> {dur}</span>}
                  {food && <span className="text-gray-500">, {food}</span>}
                  {instr && <span className="text-gray-500">{instr}</span>}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
};

export default PrescriptionPreview;