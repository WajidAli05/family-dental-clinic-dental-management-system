import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import AppointmentStatusControl from "@/components/appointments/AppointmentStatusControl";
import { typeKey } from "@/lib/appointmentConfig";

const OwnerAppointmentsTable = ({
  data = [],
  onView,
  onEdit,
  onStatusChange,
  onDelete,
}) => {
  const { t } = useTranslation();
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-100">
            <th className="py-3 pr-4">Time</th>
            <th className="py-3 pr-4">Patient</th>
            <th className="py-3 pr-4">Dentist</th>
            <th className="py-3 pr-4">Status</th>
            <th className="py-3 pr-4">Reason</th>
            <th className="py-3 text-right">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-8 text-center text-gray-500">
                No appointments found for the selected filters.
              </td>
            </tr>
          ) : (
            data.map((a) => {
              return (
                <tr key={a.id} className="hover:bg-gray-50/60 transition">
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <div className="font-semibold text-gray-900">{a.time}</div>
                    <div className="text-xs text-gray-500">{a.date}</div>
                  </td>

                  <td className="py-3 pr-4">
                    <div className="font-semibold text-gray-900">{a.patientName}</div>
                    <div className="text-xs text-gray-500">{a.patientPhone}</div>
                  </td>

                  <td className="py-3 pr-4">{a.dentistName}</td>

                  <td className="py-3 pr-4">
                    <AppointmentStatusControl
                      status={a.status}
                      allowedNext={a.allowedNext}
                      onChange={onStatusChange ? (next) => onStatusChange(a, next) : undefined}
                    />
                  </td>

                  <td className="py-3 pr-4 max-w-[200px] text-gray-700">
                    {a.appointmentType && (
                      <span className="mb-0.5 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
                        {t(typeKey(a.appointmentType))}
                      </span>
                    )}
                    <div className="truncate">{a.reason}</div>
                  </td>

                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1 flex-wrap">
                      <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => onView?.(a)}>
                        View
                      </Button>
                      {onEdit && (
                        <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => onEdit(a)}>
                          Edit
                        </Button>
                      )}
                      {onDelete && (
                        <Button size="sm" variant="outline" className="rounded-xl text-xs text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => onDelete(a)}>
                          Delete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default OwnerAppointmentsTable;