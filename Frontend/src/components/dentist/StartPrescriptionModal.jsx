import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { usePrescriptionStore } from "@/store/prescriptionStore";
import { printPrescription } from "@/utils/printPrescription";

import PatientTypeSelector from "./PatientTypeSelector";
import DentalChart2D from "./DentalChart2D";
import PrescriptionForm from "./PrescriptionForm";
import PrescriptionPreview from "./PrescriptionPreview";

import { dentistApi } from "@/lib/dentistApi";

const StartPrescriptionModal = ({ open, onOpenChange, appointment, prescription }) => {
  const store = usePrescriptionStore();
  const saving = usePrescriptionStore((s) => s.saving);
  const error = usePrescriptionStore((s) => s.error);

  // ✅ When modal opens:
  // - if editing: hydrate from backend prescription
  // - if new: reset and prefill patientId/date
  useEffect(() => {
    if (!open) return;

    if (prescription) {
      store.hydrateFromBackend(prescription);
    } else {
      store.reset();
      store.setPatientId(appointment?.patient?.publicId || appointment?.patientId || "");
      store.setDate(appointment?.date || new Date().toISOString().slice(0, 10));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ✅ Reset on close to avoid leaking data between patients
  useEffect(() => {
    if (!open) store.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

const handleSave = async () => {
  try {
    await store.saveOrUpdate({
      patientId:
        appointment?.patient?.publicId ||
        appointment?.patientId ||
        "",
      date: appointment?.date || "",
    });

    toast.success(
      store._id
        ? "Prescription updated successfully"
        : "Prescription saved successfully"
    );

    onOpenChange(false);
  } catch (e) {
    toast.error(e.message || "Failed to save prescription");
  }
};


  const handlePrint = () => {
    // prints current values (same as modal print)
    printPrescription(store);
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

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3">
              <Button
                className="flex-1 bg-[#2ec4b6]"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : store._id ? "Update Prescription" : "Save Prescription"}
              </Button>

              <Button
                variant="outline"
                className="flex-1"
                onClick={handlePrint}
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