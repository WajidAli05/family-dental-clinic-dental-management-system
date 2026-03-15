// import { useEffect, useMemo, useState } from "react";
// import Wavify from "react-wavify";
// import { Card, CardContent } from "@/components/ui/card";
// import { toast } from "sonner";

// import AppointmentsTable from "@/components/dentist/AppointmentsTable";
// import StartPrescriptionModal from "@/components/dentist/StartPrescriptionModal";
// import { dentistApi } from "@/lib/dentistApi";
// import { printPrescription } from "@/utils/printPrescription";
// import { usePrescriptionStore } from "@/store/prescriptionStore";

// const DentistAppointments = () => {
//   const [appointments, setAppointments] = useState([]);
//   const [rxByPatient, setRxByPatient] = useState({});
//   const [loading, setLoading] = useState(false);

//   const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);
//   const [selectedAppointment, setSelectedAppointment] = useState(null);
//   const [selectedPrescription, setSelectedPrescription] = useState(null);

//   const today = new Date().toISOString().split("T")[0];

//   const rxStore = usePrescriptionStore();

//   const fetchToday = async () => {
//     try {
//       setLoading(true);

//       const [aptRes, rxRes] = await Promise.all([
//         dentistApi.getAppointments({ date: today }),
//         dentistApi.getPrescriptions({ date: today }),
//       ]);

//       const apts = aptRes?.data || [];
//       const rxs = rxRes?.data || [];

//       // patientId -> latest prescription (by createdAt)
//       const map = {};
//       for (const r of rxs) {
//         if (!r.patientId) continue;

//         if (!map[r.patientId]) {
//           map[r.patientId] = r;
//           continue;
//         }

//         const prev = map[r.patientId];
//         const prevT = prev.createdAt ? new Date(prev.createdAt).getTime() : 0;
//         const curT = r.createdAt ? new Date(r.createdAt).getTime() : 0;
//         if (curT >= prevT) map[r.patientId] = r;
//       }

//       setAppointments(apts);
//       setRxByPatient(map);
//       setLoading(false);
//     } catch (e) {
//       setLoading(false);
//       toast.error(e.message || "Failed to load appointments");
//     }
//   };

//   useEffect(() => {
//     fetchToday();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // Build table rows with rx info included
//   const todaysAppointments = useMemo(() => {
//     return (appointments || []).map((a) => {
//       const patientId = a.patientId || a.patient?.publicId || "";
//       const prescription = patientId ? rxByPatient[patientId] : null;

//       return {
//         id: a.id,
//         time: a.time,
//         patient: a.patientName,
//         type: a.reason || "Consultation",
//         original: a,
//         patientId,
//         prescription,
//       };
//     });
//   }, [appointments, rxByPatient]);

//   const handleStartPrescription = (row) => {
//     const apt = row.original;

//     // keep these for modal too (extra reliable)
//     setSelectedAppointment(apt);
//     setSelectedPrescription(row.prescription || null);

//     // ✅ Prefill store immediately for edit
//     if (row.prescription) {
//       rxStore.hydrateFromBackend(row.prescription);
//     } else {
//       // ✅ new prescription
//       rxStore.reset();
//       rxStore.setPatientId(row.patientId || "");
//       rxStore.setDate(apt?.date || today);
//     }

//     setIsPrescriptionOpen(true);
//   };

//   const handlePrintFromTable = async (row) => {
//     try {
//       const rx = row.prescription;
//       if (!rx) {
//         toast.error("No prescription found to print");
//         return;
//       }

//       // printPrescription expects store-like shape; rx matches the same fields
//       printPrescription({
//         patientType: rx.patientType,
//         selectedTeeth: rx.selectedTeeth || [],
//         diagnosis: rx.diagnosis || "",
//         treatment: rx.treatment || "",
//         clinicalFinding: rx.clinicalFinding || "",
//         visualStatus: rx.visualStatus || "none",
//         notes: rx.notes || "",
//         patientId: rx.patientId || "",
//         date: rx.date || "",
//       });
//     } catch (e) {
//       toast.error(e.message || "Failed to print");
//     }
//   };

//   return (
//     <div className="space-y-8">
//       <div className="relative overflow-hidden rounded-2xl bg-white p-6">
//         <h1 className="text-2xl font-bold text-gray-900">Today’s Appointments</h1>
//         <p className="text-gray-500">Tap “Prescribe” to begin treatment</p>

//         <Wavify
//           fill="#2ec4b6"
//           paused={false}
//           options={{ height: 20, amplitude: 30, speed: 0.15, points: 3 }}
//           className="absolute bottom-0 left-0 w-full opacity-20"
//         />
//       </div>

//       <Card className="rounded-2xl">
//         <CardContent className="p-6">
//           {!loading && todaysAppointments.length > 0 ? (
//             <AppointmentsTable
//               data={todaysAppointments}
//               onStartPrescription={handleStartPrescription}
//               onPrintPrescription={handlePrintFromTable}
//             />
//           ) : !loading ? (
//             <p className="text-gray-500 text-sm">No appointments scheduled for today.</p>
//           ) : (
//             <p className="text-gray-500 text-sm">Loading...</p>
//           )}
//         </CardContent>
//       </Card>

//       <StartPrescriptionModal
//         open={isPrescriptionOpen}
//         onOpenChange={(v) => {
//           setIsPrescriptionOpen(v);
//           if (!v) {
//             setSelectedAppointment(null);
//             setSelectedPrescription(null);
//             fetchToday(); // refresh so table updates Prescribe -> Edit
//           }
//         }}
//         appointment={selectedAppointment}
//         prescription={selectedPrescription}   // ✅ important for reliable prefill
//       />
//     </div>
//   );
// };

// export default DentistAppointments;

// src/pages/dentist/DentistAppointments.jsx
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

  // ✅ UI toggle: filter client-side
  const [showTodayOnly, setShowTodayOnly] = useState(true);

  const today = new Date().toISOString().split("T")[0];
  const rxStore = usePrescriptionStore();

  // ✅ Fetch ALL appointments, but only today's prescriptions (workflow)
  const fetchAllAppointments = async () => {
    try {
      setLoading(true);

      const [aptRes, rxRes] = await Promise.all([
        dentistApi.getAppointments(), // ✅ ALL
        dentistApi.getPrescriptions({ date: today }), // ✅ TODAY only
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
    fetchAllAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Build rows for table (supports both today-only and all)
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

  const handleStartPrescription = (row) => {
    const apt = row.original;

    setSelectedAppointment(apt);
    setSelectedPrescription(row.prescription || null);

    // ✅ Prefill store immediately for edit
    if (row.prescription) {
      rxStore.hydrateFromBackend(row.prescription);
    } else {
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
      {/* ✅ Header (no buttons inside) */}
      <div className="relative overflow-hidden rounded-2xl bg-white p-6">
        <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
        <p className="text-gray-500">View today’s or all appointments</p>

        <Wavify
          fill="#2ec4b6"
          paused={false}
          options={{ height: 20, amplitude: 30, speed: 0.15, points: 3 }}
          className="absolute bottom-0 left-0 w-full opacity-20"
        />
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-6">
          {/* ✅ Buttons ABOVE the table */}
          <div className="flex items-center gap-2 mb-4">
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

          {!loading && tableRows.length > 0 ? (
            <AppointmentsTable
              data={tableRows}
              onStartPrescription={handleStartPrescription}
              onPrintPrescription={handlePrintFromTable}
            />
          ) : !loading ? (
            <p className="text-gray-500 text-sm">
              {showTodayOnly
                ? "No appointments scheduled for today."
                : "No appointments found."}
            </p>
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
            fetchAllAppointments(); // ✅ refresh after save/edit
          }
        }}
        appointment={selectedAppointment}
        prescription={selectedPrescription}
      />
    </div>
  );
};

export default DentistAppointments;