import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

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

const AppointmentDetailsModal = ({ open, onClose, appointment }) => {
  if (!open || !appointment) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden">
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

          <Button
            variant="ghost"
            className="rounded-xl"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
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

          <div className="rounded-xl bg-gray-50 p-4 text-xs text-gray-600">
            This view is currently <span className="font-semibold">read-only</span>.
            Editing will be enabled via the Permissions tab later.
          </div>
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