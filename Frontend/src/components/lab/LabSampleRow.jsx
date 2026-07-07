import { useLabStore } from "@/store/labStore";
import AddNoteDialog from "@/components/lab/AddNoteDialog";

// Lab can only advance to these statuses (approved/rejected are dentist-only)
const LAB_STATUS_OPTIONS = [
  { value: "sent",        label: "Sent" },
  { value: "in-process",  label: "In Process", db: "in_progress" },
  { value: "ready",       label: "Ready" },
  { value: "delivered",   label: "Delivered" },
];

const STATUS_STYLES = {
  "sent":        "bg-blue-50 text-blue-700 border-blue-200",
  "in-process":  "bg-amber-50 text-amber-700 border-amber-200",
  "ready":       "bg-purple-50 text-purple-700 border-purple-200",
  "delivered":   "bg-indigo-50 text-indigo-700 border-indigo-200",
  "approved":    "bg-emerald-50 text-emerald-700 border-emerald-200",
  "rejected":    "bg-rose-50 text-rose-700 border-rose-200",
};

const STATUS_LABELS = {
  "sent":       "Sent",
  "in-process": "In Process",
  "ready":      "Ready",
  "delivered":  "Delivered",
  "approved":   "Approved",
  "rejected":   "Rejected",
};

// Map UI status back to DB status for the API call
const UI_TO_DB = {
  "sent":       "sent",
  "in-process": "in_progress",
  "ready":      "ready",
  "delivered":  "delivered",
};

const FINALIZED = new Set(["approved", "rejected"]);

export default function LabSampleRow({ sample }) {
  const { updateStatus } = useLabStore();
  const finalized = FINALIZED.has(sample.status);

  const handleChange = (e) => {
    const uiVal = e.target.value;
    const dbVal = UI_TO_DB[uiVal] ?? uiVal;
    updateStatus(sample.id, dbVal);
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="font-medium text-gray-900">{sample.id}</td>
      <td className="text-gray-700">{sample.type}</td>
      <td className="font-mono text-gray-700">{sample.tooth}</td>
      <td className="text-gray-600">{sample.date}</td>

      {/* Status badge */}
      <td>
        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[sample.status] || "bg-gray-50 text-gray-700 border-gray-200"}`}>
          {STATUS_LABELS[sample.status] || sample.status}
        </span>
      </td>

      <td className="text-right space-x-2">
        <AddNoteDialog sample={sample} />

        {finalized ? (
          <span className="text-sm text-gray-400 italic">Final</span>
        ) : (
          <select
            value={sample.status}
            onChange={handleChange}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2ec4b6] cursor-pointer"
          >
            {LAB_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )}
      </td>
    </tr>
  );
}
