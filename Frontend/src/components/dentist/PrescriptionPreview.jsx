import { usePrescriptionStore } from "@/store/prescriptionStore";

const FOOD_LABEL = { before: "before food", after: "after food", with: "with food", any: "" };

const PrescriptionPreview = () => {
  const {
    patientType,
    selectedTeeth,
    diagnosis,
    treatment,
    notes,
    medications,
  } = usePrescriptionStore();

  return (
    <div className="border rounded-xl p-4 bg-gray-50 text-sm space-y-1">
      <p><strong>Patient Type:</strong> {patientType || "—"}</p>
      <p><strong>Teeth:</strong> {selectedTeeth.length ? selectedTeeth.join(", ") : "—"}</p>
      <p><strong>Diagnosis:</strong> {diagnosis || "—"}</p>
      <p><strong>Treatment:</strong> {treatment || "—"}</p>
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