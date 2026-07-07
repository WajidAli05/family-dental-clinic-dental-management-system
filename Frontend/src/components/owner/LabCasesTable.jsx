import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "sent",        label: "Sent" },
  { value: "in_progress", label: "In Process" },
  { value: "ready",       label: "Ready" },
  { value: "delivered",   label: "Delivered" },
  { value: "approved",    label: "Approved" },
  { value: "rejected",    label: "Rejected" },
];

const STATUS_STYLES = {
  sent:        "bg-gray-50 text-gray-700 border-gray-200",
  received:    "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  ready:       "bg-emerald-50 text-emerald-700 border-emerald-200",
  delivered:   "bg-gray-50 text-gray-700 border-gray-200",
  approved:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected:    "bg-rose-50 text-rose-700 border-rose-200",
};

const LabCasesTable = ({ data = [], onView, onEdit, onDelete, onStatusChange }) => {
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
                  <div className="text-xs text-gray-500 max-w-[120px] truncate">{c.notes || "-"}</div>
                </td>
                <td className="py-3 pr-4 whitespace-nowrap">
                  {c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-PK") : "-"}
                </td>
                <td className="py-3 pr-4">{c.patientName}</td>
                <td className="py-3 pr-4">{c.dentistName}</td>
                <td className="py-3 pr-4">{c.labName}</td>
                <td className="py-3 pr-4">{c.sampleTypeName}</td>

                {/* Inline status dropdown */}
                <td className="py-3 pr-4">
                  <select
                    value={c.status}
                    onChange={(e) => onStatusChange && onStatusChange(c.id, e.target.value)}
                    className={`rounded-full border px-2 py-1 text-xs font-semibold cursor-pointer focus:outline-none ${STATUS_STYLES[c.status] || "bg-gray-50 text-gray-700 border-gray-200"}`}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </td>

                <td className="py-3 text-right space-x-1 whitespace-nowrap">
                  <Button variant="outline" size="sm" className="rounded-lg" onClick={() => onView && onView(c)}>
                    View
                  </Button>
                  {onEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => onEdit(c)}
                    >
                      <Pencil size={13} />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => onDelete(c)}
                    >
                      <Trash2 size={13} />
                    </Button>
                  )}
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
