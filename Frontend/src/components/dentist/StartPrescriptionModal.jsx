import { useEffect, useState } from "react";
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

const fmtDate = (d) => {
  if (!d) return "—";
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-PK"); } catch { return d; }
};

const StartPrescriptionModal = ({ open, onOpenChange, appointment, prescription }) => {
  const store = usePrescriptionStore();
  const saving   = usePrescriptionStore((s) => s.saving);
  const error    = usePrescriptionStore((s) => s.error);
  const storeId  = usePrescriptionStore((s) => s._id);

  const [history, setHistory] = useState([]);

  const patientId = appointment?.patientId || appointment?.patient?.publicId || "";

  // On open: hydrate or reset; fetch history.
  // On close: reset store and clear history so the next patient starts clean.
  useEffect(() => {
    if (!open) {
      store.reset();
      setHistory([]);
      return;
    }

    if (prescription) {
      store.hydrateFromBackend(prescription);
    } else {
      store.reset();
      store.setPatientId(patientId);
      store.setDate(appointment?.date || new Date().toISOString().slice(0, 10));
    }

    if (patientId) {
      dentistApi
        .getPatientPrescriptionHistory(patientId)
        .then((res) => setHistory(res?.data || []))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Reset store and start a blank prescription for this patient/date.
  const handleNewPrescription = () => {
    store.reset();
    store.setPatientId(patientId);
    store.setDate(appointment?.date || new Date().toISOString().slice(0, 10));
  };

  const handleSave = async () => {
    try {
      const isNew = !storeId;
      await store.saveOrUpdate({
        patientId,
        date: appointment?.date || "",
      });

      toast.success(isNew ? "Prescription saved" : "Prescription updated");
      onOpenChange(false);
    } catch (e) {
      toast.error(e.message || "Failed to save prescription");
    }
  };

  const handlePrint = () => {
    printPrescription({
      ...store,
      patientName:
        appointment?.patientName ||
        appointment?.patient?.name ||
        appointment?.patient ||
        "",
    });
  };

  const modalTitle = store.patientType
    ? (storeId ? "Edit Prescription" : "New Prescription")
    : "Select Patient Type";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
        </DialogHeader>

        {/* ── Patient history panel ── */}
        {history.length > 0 && (
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Patient History
            </p>

            <div className="space-y-0.5">
              {history.map((rx) => {
                const rxId   = rx._id || rx.id;
                const active = storeId === rxId;
                return (
                  <button
                    key={rxId}
                    type="button"
                    onClick={() => store.hydrateFromBackend(rx)}
                    className={[
                      "w-full rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                      active
                        ? "bg-[#2ec4b6] text-white"
                        : "text-gray-600 hover:bg-white hover:text-gray-900",
                    ].join(" ")}
                  >
                    <span className="font-semibold">{fmtDate(rx.date)}</span>
                    {rx.diagnosis && (
                      <span className={active ? "ml-2 opacity-80" : "ml-2 text-gray-400"}>
                        {rx.diagnosis.length > 50
                          ? rx.diagnosis.slice(0, 50) + "…"
                          : rx.diagnosis}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleNewPrescription}
              className="mt-2 block text-xs font-medium text-[#2ec4b6] hover:text-[#26a699]"
            >
              + New Prescription
            </button>
          </div>
        )}

        {/* ── Main form ── */}
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
                {saving ? "Saving…" : storeId ? "Update Prescription" : "Save Prescription"}
              </Button>

              <Button variant="outline" className="flex-1" onClick={handlePrint}>
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
