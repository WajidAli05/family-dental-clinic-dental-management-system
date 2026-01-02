import { usePrescriptionStore } from "@/store/prescriptionStore";

const PrescriptionPreview = () => {
  const {
    patientType,
    selectedTeeth,
    diagnosis,
    treatment,
    notes,
  } = usePrescriptionStore();

  return (
    <div className="border rounded-xl p-4 bg-gray-50 text-sm">
      <p><strong>Patient Type:</strong> {patientType}</p>
      <p><strong>Teeth:</strong> {selectedTeeth.join(", ")}</p>
      <p><strong>Diagnosis:</strong> {diagnosis}</p>
      <p><strong>Treatment:</strong> {treatment}</p>
      <p><strong>Notes:</strong> {notes}</p>
    </div>
  );
};

export default PrescriptionPreview;