import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Check, X, CornerDownRight } from "lucide-react";
import OwnerStatusPill from "@/components/owner/OwnerStatusPill";
import { useFormatMoney } from "@/store/clinicConfigStore";

/**
 * ONE treatment list, priced for whichever fee schedule is active.
 *
 * `t.fee` arrives already resolved by the server (getTreatmentFee) and
 * `t.inherited` says whether that number was set on THIS schedule or fell back
 * to the default — an inherited price is labelled rather than silently shown
 * as if it were the schedule's own.
 */
const TreatmentsTable = ({
  data,
  onEdit,
  onDelete,
  onToggle,
  activeScheduleId,
  defaultScheduleId,
  onSetPrice,
  onClearPrice,
}) => {
  const { t: tr } = useTranslation();
  const money = useFormatMoney();
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const isDefaultSchedule = !activeScheduleId || activeScheduleId === defaultScheduleId;
  const canPrice = typeof onSetPrice === "function";

  const startEdit = (row) => { setEditingId(row.id); setDraft(String(row.fee ?? "")); };
  const cancelEdit = () => { setEditingId(""); setDraft(""); };

  const save = async (row) => {
    const value = Number(draft);
    if (!Number.isFinite(value) || value < 0) return;
    setBusy(true);
    try { await onSetPrice(row.id, value); cancelEdit(); }
    finally { setBusy(false); }
  };

  const clear = async (row) => {
    setBusy(true);
    try { await onClearPrice(row.id); cancelEdit(); }
    finally { setBusy(false); }
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-start text-gray-500 border-b border-gray-100">
            <th className="py-3 pe-4 text-start">Treatment</th>
            <th className="py-3 pe-4 text-start">Code</th>
            <th className="py-3 pe-4 text-start">{tr("feeSchedules.feeColumn")}</th>
            <th className="py-3 pe-4 text-start">Status</th>
            <th className="py-3 pe-4 text-start">Notes</th>
            <th className="py-3 text-end">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-8 text-center text-gray-500">
                No treatments found.
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50/60 transition">
                <td className="py-3 pe-4">
                  <div className="font-semibold text-gray-900">{row.name}</div>
                  <div className="text-xs text-gray-500">{row.id}</div>
                </td>
                <td className="py-3 pe-4">{row.code || "-"}</td>

                {/* Price for the ACTIVE schedule */}
                <td className="py-3 pe-4">
                  {editingId === row.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        autoFocus
                        type="number"
                        min="0"
                        className="h-8 w-28"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") save(row);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        disabled={busy}
                      />
                      <Button size="sm" className="h-8 rounded-lg bg-[#2ec4b6] hover:bg-[#26a699] text-white" disabled={busy} onClick={() => save(row)}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 rounded-lg" disabled={busy} onClick={cancelEdit}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                      {/* Only a non-default schedule can fall back to inheriting. */}
                      {!isDefaultSchedule && !row.inherited && (
                        <Button
                          size="sm" variant="outline"
                          className="h-8 rounded-lg text-xs"
                          disabled={busy}
                          title={tr("feeSchedules.resetToInheritedHint")}
                          onClick={() => clear(row)}
                        >
                          {tr("feeSchedules.resetToInherited")}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="group inline-flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 -mx-1.5 hover:bg-gray-100 disabled:hover:bg-transparent"
                      disabled={!canPrice}
                      onClick={() => canPrice && startEdit(row)}
                    >
                      <span className={row.inherited ? "text-gray-500" : "text-gray-900"}>
                        {money(row.fee)}
                      </span>
                      {row.inherited && (
                        <span
                          title={tr("feeSchedules.inheritedHint")}
                          className="inline-flex items-center rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500"
                        >
                          <CornerDownRight className="h-3 w-3 me-0.5" />
                          {tr("feeSchedules.inherited")}
                        </span>
                      )}
                      {canPrice && <Pencil className="h-3 w-3 text-gray-300 group-hover:text-gray-500" />}
                    </button>
                  )}
                </td>

                <td className="py-3 pe-4">
                  <OwnerStatusPill enabled={!!row.active} onToggle={() => onToggle(row)} labelOn="Active" labelOff="Inactive" />
                </td>
                <td className="py-3 pe-4 text-gray-700">{row.notes || "-"}</td>
                <td className="py-3 text-end">
                  <div className="inline-flex gap-2">
                    <Button variant="outline" className="rounded-xl" onClick={() => onEdit(row)}>
                      <Pencil className="h-4 w-4 me-2" />
                      Edit
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={() => onDelete(row)}>
                      <Trash2 className="h-4 w-4 me-2" />
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TreatmentsTable;
