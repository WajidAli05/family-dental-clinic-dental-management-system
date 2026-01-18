import { Button } from "@/components/ui/button";

const badgeClass = (status) => {
  switch (status) {
    case "scheduled":
      return "bg-blue-50 text-blue-700 border-blue-100";
    case "checked_in":
      return "bg-amber-50 text-amber-700 border-amber-100";
    case "completed":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "cancelled":
      return "bg-rose-50 text-rose-700 border-rose-100";
    default:
      return "bg-gray-50 text-gray-700 border-gray-100";
  }
};

const statusText = (s) =>
  ({
    scheduled: "Scheduled",
    checked_in: "Checked-in",
    completed: "Completed",
    cancelled: "Cancelled",
  }[s] || s);

const OwnerAppointmentsTable = ({ data = [], onView }) => {
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
            data.map((a) => (
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
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(
                      a.status
                    )}`}
                  >
                    {statusText(a.status)}
                  </span>
                </td>

                <td className="py-3 pr-4 max-w-[280px] truncate text-gray-700">
                  {a.reason}
                </td>

                <td className="py-3 text-right">
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => onView(a)}
                  >
                    View
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default OwnerAppointmentsTable;