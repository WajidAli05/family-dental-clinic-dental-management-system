import { Button } from "@/components/ui/button";

const StatusPill = ({ status }) => {
  const map = {
    received: "bg-blue-50 text-blue-700 border-blue-100",
    in_progress: "bg-amber-50 text-amber-700 border-amber-100",
    ready: "bg-emerald-50 text-emerald-700 border-emerald-100",
    dispatched: "bg-purple-50 text-purple-700 border-purple-100",
    delivered: "bg-gray-50 text-gray-700 border-gray-100",
    cancelled: "bg-rose-50 text-rose-700 border-rose-100",
  };
  const cls = map[status] || "bg-gray-50 text-gray-700 border-gray-100";
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>
      {String(status).replaceAll("_", " ")}
    </span>
  );
};

const LabCasesTable = ({ data = [], onView }) => {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-100">
            <th className="py-3 pr-4">Case</th>
            <th className="py-3 pr-4">Date</th>
            <th className="py-3 pr-4">Patient</th>
            <th className="py-3 pr-4">Dentist</th>
            <th className="py-3 pr-4">Lab</th>
            <th className="py-3 pr-4">Sample Type</th>
            <th className="py-3 pr-4">Status</th>
            <th className="py-3 text-right">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-8 text-center text-gray-500">
                No lab cases found.
              </td>
            </tr>
          ) : (
            data.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50/60 transition">
                <td className="py-3 pr-4">
                  <div className="font-semibold text-gray-900">{c.id}</div>
                  <div className="text-xs text-gray-500">{c.notes || "-"}</div>
                </td>
                <td className="py-3 pr-4">{c.createdAt}</td>
                <td className="py-3 pr-4">{c.patientName}</td>
                <td className="py-3 pr-4">{c.dentistName}</td>
                <td className="py-3 pr-4">{c.labName}</td>
                <td className="py-3 pr-4">{c.sampleTypeName}</td>
                <td className="py-3 pr-4">
                  <StatusPill status={c.status} />
                </td>
                <td className="py-3 text-right">
                  <Button variant="outline" className="rounded-xl" onClick={() => onView(c)}>
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

export default LabCasesTable;