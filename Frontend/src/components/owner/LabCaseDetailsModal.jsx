import { useState } from "react";
import { Button } from "@/components/ui/button";

const overlay =
  "fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-3";
const modalBox =
  "w-full max-w-3xl rounded-2xl bg-white shadow-xl overflow-hidden max-h-[85vh] flex flex-col";

const STATUS_OPTIONS = [
  { value: "sent",        label: "Sent" },
  { value: "in_progress", label: "In Process" },
  { value: "ready",       label: "Ready" },
  { value: "delivered",   label: "Delivered" },
  { value: "approved",    label: "Approved" },
  { value: "rejected",    label: "Rejected" },
];

const STATUS_STYLES = {
  sent:        "bg-gray-50 text-gray-700 border-gray-100",
  received:    "bg-blue-50 text-blue-700 border-blue-100",
  in_progress: "bg-amber-50 text-amber-700 border-amber-100",
  ready:       "bg-emerald-50 text-emerald-700 border-emerald-100",
  delivered:   "bg-gray-50 text-gray-700 border-gray-100",
  approved:    "bg-emerald-50 text-emerald-700 border-emerald-100",
  rejected:    "bg-rose-50 text-rose-700 border-rose-100",
};

const StatusPill = ({ status }) => {
  const cls = STATUS_STYLES[status] || "bg-gray-50 text-gray-700 border-gray-100";
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>
      {String(status || "").replaceAll("_", " ")}
    </span>
  );
};

const LabCaseDetailsModal = ({ open, caseItem, onClose, onStatusChange }) => {
  const [newStatus, setNewStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  if (!open) return null;

  const timeline = Array.isArray(caseItem?.timeline) ? caseItem.timeline : [];

  const handleStatusChange = async () => {
    if (!newStatus || newStatus === caseItem?.status) return;
    setErr(""); setSaving(true);
    try {
      await onStatusChange(caseItem.id, newStatus);
      setNewStatus("");
      onClose();
    } catch (e) {
      setErr(e.message || "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={overlay} onMouseDown={onClose}>
      <div className={modalBox} onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Lab Case Details</h3>
            <p className="text-sm text-gray-500 mt-1">View timeline · change status as owner</p>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={onClose}>Close</Button>
        </div>

        {/* Scrollable body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Summary */}
          <div className="rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-sm font-semibold text-gray-900">{caseItem?.id}</div>
                <div className="text-xs text-gray-500">
                  Created: {caseItem?.createdAt ? new Date(caseItem.createdAt).toLocaleDateString("en-PK") : "-"}
                </div>
              </div>
              <StatusPill status={caseItem?.status} />
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <Info label="Patient" value={caseItem?.patientName} />
              <Info label="Dentist" value={caseItem?.dentistName} />
              <Info label="Lab" value={caseItem?.labName} />
              <Info label="Sample Type" value={caseItem?.sampleTypeName} />
              <Info label="Teeth" value={Array.isArray(caseItem?.teeth) ? caseItem.teeth.join(", ") : (caseItem?.teeth || "-")} />
              <div className="md:col-span-2">
                <Info label="Notes" value={caseItem?.notes || "-"} />
              </div>
            </div>
          </div>

          {/* Owner status change */}
          {onStatusChange && (
            <div className="rounded-2xl border border-gray-100 p-4">
              <div className="text-sm font-semibold text-gray-900 mb-3">Change Status</div>
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  value={newStatus || caseItem?.status || ""}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2ec4b6]"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <Button
                  className="bg-[#2ec4b6] hover:bg-[#26a699] text-white rounded-xl"
                  disabled={saving || !newStatus || newStatus === caseItem?.status}
                  onClick={handleStatusChange}
                >
                  {saving ? "Saving…" : "Apply"}
                </Button>
              </div>
              {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
            </div>
          )}

          {/* Timeline */}
          <div className="rounded-2xl border border-gray-100 p-4">
            <div className="text-sm font-semibold text-gray-900">Timeline</div>
            <div className="text-xs text-gray-500 mt-1">Latest updates appear at the bottom.</div>

            <div className="mt-4 space-y-3">
              {timeline.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-500">No timeline entries available.</div>
              ) : (
                timeline.map((t, idx) => (
                  <div key={`${t.at}-${idx}`} className="flex gap-3">
                    <div className="pt-1">
                      <span className="block h-2.5 w-2.5 rounded-full bg-[#2ec4b6]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {String(t.status || "").replaceAll("_", " ")}
                        </div>
                        <div className="text-xs text-gray-500">
                          {t.at ? new Date(t.at).toLocaleString() : "-"}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">{t.note || "-"}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Info = ({ label, value }) => (
  <div className="rounded-xl bg-gray-50 px-3 py-2 border border-gray-100">
    <div className="text-xs font-semibold text-gray-500">{label}</div>
    <div className="text-sm font-medium text-gray-900">{value || "-"}</div>
  </div>
);

export default LabCaseDetailsModal;
