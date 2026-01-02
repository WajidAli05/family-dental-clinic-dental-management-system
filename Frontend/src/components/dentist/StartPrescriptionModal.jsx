import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { usePrescriptionStore } from "@/store/prescriptionStore";
import { printPrescription } from "@/utils/printPrescription";

import PatientTypeSelector from "./PatientTypeSelector";
import DentalChart2D from "./DentalChart2D";
import PrescriptionForm from "./PrescriptionForm";
import PrescriptionPreview from "./PrescriptionPreview";

const StartPrescriptionModal = ({ open, onOpenChange }) => {
  const store = usePrescriptionStore();

  const handleSave = () => {
    // later → API call
    alert("Prescription saved successfully");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {store.patientType ? "Create Prescription" : "Select Patient Type"}
          </DialogTitle>
        </DialogHeader>

        {!store.patientType ? (
          <PatientTypeSelector onSelect={store.setPatientType} />
        ) : (
          <div className="space-y-6">
            <DentalChart2D />
            <PrescriptionForm />
            <PrescriptionPreview />

            <div className="flex gap-3">
              <Button className="flex-1 bg-[#2ec4b6]" onClick={handleSave}>
                Save Prescription
              </Button>

              <Button
                variant="outline"
                className="flex-1"
                onClick={() => printPrescription(store)}
              >
                Print
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StartPrescriptionModal;