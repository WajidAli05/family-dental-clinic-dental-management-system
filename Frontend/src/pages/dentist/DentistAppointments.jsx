import { useEffect, useMemo, useState } from "react";
import Wavify from "react-wavify";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

import AppointmentsTable from "@/components/dentist/AppointmentsTable";
import StartPrescriptionModal from "@/components/dentist/StartPrescriptionModal";
import { dentistApi } from "@/lib/dentistApi";
import { printPrescription } from "@/utils/printPrescription";
import { usePrescriptionStore } from "@/store/prescriptionStore";

const DentistAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [rxByPatient, setRxByPatient] = useState({});
  const [loading, setLoading] = useState(false);

  const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  const today = new Date().toISOString().split("T")[0];

  const rxStore = usePrescriptionStore();

  const fetchToday = async () => {
    try {
      setLoading(true);

      const [aptRes, rxRes] = await Promise.all([
        dentistApi.getAppointments({ date: today }),
        dentistApi.getPrescriptions({ date: today }),
      ]);

      const apts = aptRes?.data || [];
      const rxs = rxRes?.data || [];

      // patientId -> latest prescription (by createdAt)
      const map = {};
      for (const r of rxs) {
        if (!r.patientId) continue;

        if (!map[r.patientId]) {
          map[r.patientId] = r;
          continue;
        }

        const prev = map[r.patientId];
        const prevT = prev.createdAt ? new Date(prev.createdAt).getTime() : 0;
        const curT = r.createdAt ? new Date(r.createdAt).getTime() : 0;
        if (curT >= prevT) map[r.patientId] = r;
      }

      setAppointments(apts);
      setRxByPatient(map);
      setLoading(false);
    } catch (e) {
      setLoading(false);
      toast.error(e.message || "Failed to load appointments");
    }
  };

  useEffect(() => {
    fetchToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build table rows with rx info included
  const todaysAppointments = useMemo(() => {
    return (appointments || []).map((a) => {
      const patientId = a.patientId || a.patient?.publicId || "";
      const prescription = patientId ? rxByPatient[patientId] : null;

      return {
        id: a.id,
        time: a.time,
        patient: a.patientName,
        type: a.reason || "Consultation",
        original: a,
        patientId,
        prescription,
      };
    });
  }, [appointments, rxByPatient]);

  const handleStartPrescription = (row) => {
    const apt = row.original;

    // keep these for modal too (extra reliable)
    setSelectedAppointment(apt);
    setSelectedPrescription(row.prescription || null);

    // ✅ Prefill store immediately for edit
    if (row.prescription) {
      rxStore.hydrateFromBackend(row.prescription);
    } else {
      // ✅ new prescription
      rxStore.reset();
      rxStore.setPatientId(row.patientId || "");
      rxStore.setDate(apt?.date || today);
    }

    setIsPrescriptionOpen(true);
  };

  const handlePrintFromTable = async (row) => {
    try {
      const rx = row.prescription;
      if (!rx) {
        toast.error("No prescription found to print");
        return;
      }

      // printPrescription expects store-like shape; rx matches the same fields
      printPrescription({
        patientType: rx.patientType,
        selectedTeeth: rx.selectedTeeth || [],
        diagnosis: rx.diagnosis || "",
        treatment: rx.treatment || "",
        clinicalFinding: rx.clinicalFinding || "",
        visualStatus: rx.visualStatus || "none",
        notes: rx.notes || "",
        patientId: rx.patientId || "",
        date: rx.date || "",
      });
    } catch (e) {
      toast.error(e.message || "Failed to print");
    }
  };

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-white p-6">
        <h1 className="text-2xl font-bold text-gray-900">Today’s Appointments</h1>
        <p className="text-gray-500">Tap “Prescribe” to begin treatment</p>

        <Wavify
          fill="#2ec4b6"
          paused={false}
          options={{ height: 20, amplitude: 30, speed: 0.15, points: 3 }}
          className="absolute bottom-0 left-0 w-full opacity-20"
        />
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-6">
          {!loading && todaysAppointments.length > 0 ? (
            <AppointmentsTable
              data={todaysAppointments}
              onStartPrescription={handleStartPrescription}
              onPrintPrescription={handlePrintFromTable}
            />
          ) : !loading ? (
            <p className="text-gray-500 text-sm">No appointments scheduled for today.</p>
          ) : (
            <p className="text-gray-500 text-sm">Loading...</p>
          )}
        </CardContent>
      </Card>

      <StartPrescriptionModal
        open={isPrescriptionOpen}
        onOpenChange={(v) => {
          setIsPrescriptionOpen(v);
          if (!v) {
            setSelectedAppointment(null);
            setSelectedPrescription(null);
            fetchToday(); // refresh so table updates Prescribe -> Edit
          }
        }}
        appointment={selectedAppointment}
        prescription={selectedPrescription}   // ✅ important for reliable prefill
      />
    </div>
  );
};

export default DentistAppointments;