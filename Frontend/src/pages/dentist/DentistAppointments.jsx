import { useEffect, useMemo, useState } from "react";
import Wavify from "react-wavify";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { CalendarPlus } from "lucide-react";

import AppointmentsTable from "@/components/dentist/AppointmentsTable";
import StartPrescriptionModal from "@/components/dentist/StartPrescriptionModal";
import DentistBookAppointmentModal from "@/components/dentist/DentistBookAppointmentModal";
import DentistEditAppointmentModal from "@/components/dentist/DentistEditAppointmentModal";
import { dentistApi } from "@/lib/dentistApi";
import { printPrescription } from "@/utils/printPrescription";
import { localISODate } from "@/utils/localISODate";

const DentistAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [rxByPatient, setRxByPatient] = useState({});
  const [loading, setLoading] = useState(false);

  const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  const [bookOpen, setBookOpen] = useState(false);
  const [editAppt, setEditAppt] = useState(null);

  const [showTodayOnly, setShowTodayOnly] = useState(true);

  const today = localISODate();

  const fetchAllAppointments = async () => {
    try {
      setLoading(true);

      const aptRes = await dentistApi.getAppointments();
      const apts = aptRes?.data || [];

      // Collect unique patient IDs across ALL appointments
      const patientIds = [...new Set(apts.map((a) => a.patientId).filter(Boolean))];

      // Fetch latest prescription per patient — NOT date-scoped so button state
      // is correct on any day, not just today.
      const map = {};
      if (patientIds.length) {
        const rxRes = await dentistApi.getPrescriptionsLatestByPatients(patientIds);
        for (const rx of rxRes?.data || []) {
          if (rx.patientId) map[rx.patientId] = rx;
        }
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
    fetchAllAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tableRows = useMemo(() => {
    const list = Array.isArray(appointments) ? appointments : [];

    const filtered = showTodayOnly
      ? list.filter((a) => String(a?.date || "") === today)
      : list;

    return filtered.map((a) => {
      const original = a?.original || a;

      const patientId =
        a?.patientId ||
        original?.patientId ||
        original?.patient?.publicId ||
        "";

      const prescription = patientId ? rxByPatient[patientId] : null;

      return {
        id: a?.id || original?.publicId || original?._id || "",
        time: a?.time || "",
        patient: a?.patientName || original?.patientName || "",
        type: a?.reason || original?.reason || "Consultation",
        original: a,
        patientId,
        prescription,
      };
    });
  }, [appointments, rxByPatient, showTodayOnly, today]);

  // Let the modal handle store hydration — just pass the appointment + latest prescription.
  const handleStartPrescription = (row) => {
    setSelectedAppointment(row.original);
    setSelectedPrescription(row.prescription || null);
    setIsPrescriptionOpen(true);
  };

  const handleStatusChange = async (row, uiStatus) => {
    const id = row?.id || row?.original?.id;
    if (!id) return;
    try {
      await dentistApi.updateAppointmentStatus(id, uiStatus);
      toast.success(`Appointment ${uiStatus}`);
      fetchAllAppointments();
    } catch (e) {
      toast.error(e.message || "Status update failed");
    }
  };

  const handlePrintFromTable = async (row) => {
    try {
      const rx = row.prescription;
      if (!rx) {
        toast.error("No prescription found to print");
        return;
      }

      printPrescription({
        patientType: rx.patientType,
        selectedTeeth: rx.selectedTeeth || [],
        diagnosis: rx.diagnosis || "",
        treatment: rx.treatment || "",
        clinicalFinding: rx.clinicalFinding || "",
        visualStatus: rx.visualStatus || "none",
        notes: rx.notes || "",
        medications: Array.isArray(rx.medications) ? rx.medications : [],
        toothEntries: Array.isArray(rx.toothEntries) ? rx.toothEntries : [],
        patientId: rx.patientId || "",
        date: rx.date || "",
        patientName: row.patient || row.patientName || "",
        patientAge: row.age ?? "",
        patientGender: row.gender || "",
        dentistName: rx.dentistName || "",
      });
    } catch (e) {
      toast.error(e.message || "Failed to print");
    }
  };

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-white p-6">
        <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
        <p className="text-gray-500">View today's or all appointments</p>

        <Wavify
          fill="#2ec4b6"
          paused={false}
          options={{ height: 20, amplitude: 30, speed: 0.15, points: 3 }}
          className="absolute bottom-0 left-0 w-full opacity-20"
        />
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowTodayOnly(true)}
                className={[
                  "px-3 py-2 rounded-xl text-sm font-semibold border",
                  showTodayOnly
                    ? "bg-[#2ec4b6] text-white border-[#2ec4b6]"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
                ].join(" ")}
              >
                Today Only
              </button>

              <button
                type="button"
                onClick={() => setShowTodayOnly(false)}
                className={[
                  "px-3 py-2 rounded-xl text-sm font-semibold border",
                  !showTodayOnly
                    ? "bg-[#2ec4b6] text-white border-[#2ec4b6]"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
                ].join(" ")}
              >
                All
              </button>
            </div>

            <Button
              onClick={() => setBookOpen(true)}
              className="rounded-xl bg-[#2ec4b6] hover:bg-[#26a699] gap-2"
            >
              <CalendarPlus className="w-4 h-4" /> Book Appointment
            </Button>
          </div>

          {loading ? (
            <TableSkeleton rows={8} cols={5} />
          ) : tableRows.length > 0 ? (
            <AppointmentsTable
              data={tableRows}
              onStartPrescription={handleStartPrescription}
              onPrintPrescription={handlePrintFromTable}
              onEdit={(row) => setEditAppt(row?.original || row)}
              onStatusChange={handleStatusChange}
            />
          ) : (
            <p className="text-gray-500 text-sm">
              {showTodayOnly
                ? "No appointments scheduled for today."
                : "No appointments found."}
            </p>
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
            fetchAllAppointments();
          }
        }}
        appointment={selectedAppointment}
        prescription={selectedPrescription}
      />

      <DentistBookAppointmentModal
        open={bookOpen}
        onOpenChange={setBookOpen}
        onSuccess={() => { setBookOpen(false); fetchAllAppointments(); }}
      />

      <DentistEditAppointmentModal
        open={!!editAppt}
        appointment={editAppt}
        onOpenChange={(v) => { if (!v) setEditAppt(null); }}
        onSuccess={() => { setEditAppt(null); fetchAllAppointments(); }}
      />
    </div>
  );
};

export default DentistAppointments;
