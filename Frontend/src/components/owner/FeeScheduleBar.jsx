import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Star, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

/**
 * The SCHEDULE dimension for the treatments table.
 *
 * Selecting a schedule re-prices the ONE existing treatment list (the server
 * resolves each price through getTreatmentFee) — it never renders a second
 * list per schedule. The default schedule is starred and cannot be deleted;
 * the server enforces both, this only mirrors it.
 */
const FeeScheduleBar = ({
  schedules = [],
  activeScheduleId,
  defaultScheduleId,
  onSelect,
  onCreate,
  onRename,
  onSetDefault,
  onDelete,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    setBusy(true);
    try { await fn(); }
    catch (e) { toast.error(e.message || t("feeSchedules.actionFailed")); }
    finally { setBusy(false); }
  };

  const submitCreate = async () => {
    const name = draft.trim();
    if (!name) return;
    await run(async () => {
      await onCreate(name);
      toast.success(t("feeSchedules.created"));
      setCreating(false);
      setDraft("");
    });
  };

  const submitRename = async (id) => {
    const name = draft.trim();
    if (!name) return;
    await run(async () => {
      await onRename(id, name);
      toast.success(t("feeSchedules.renamed"));
      setRenamingId("");
      setDraft("");
    });
  };

  const cancelEdit = () => { setCreating(false); setRenamingId(""); setDraft(""); };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">{t("feeSchedules.title")}</p>
          <p className="text-xs text-gray-500">{t("feeSchedules.subtitle")}</p>
        </div>

        {!creating && (
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={disabled || busy}
            onClick={() => { setCreating(true); setRenamingId(""); setDraft(""); }}
          >
            <Plus className="h-4 w-4 me-2" />
            {t("feeSchedules.add")}
          </Button>
        )}
      </div>

      {creating && (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={draft}
            placeholder={t("feeSchedules.namePlaceholder")}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitCreate();
              if (e.key === "Escape") cancelEdit();
            }}
            disabled={busy}
          />
          <Button className="rounded-xl bg-[#2ec4b6] hover:bg-[#26a699] text-white" disabled={busy || !draft.trim()} onClick={submitCreate}>
            <Check className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="rounded-xl" disabled={busy} onClick={cancelEdit}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {schedules.map((s) => {
          const isActive = s.id === activeScheduleId;
          const isDefault = s.id === defaultScheduleId;

          if (renamingId === s.id) {
            return (
              <div key={s.id} className="flex items-center gap-2">
                <Input
                  autoFocus
                  className="h-9 w-44"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitRename(s.id);
                    if (e.key === "Escape") cancelEdit();
                  }}
                  disabled={busy}
                />
                <Button size="sm" className="rounded-xl bg-[#2ec4b6] hover:bg-[#26a699] text-white" disabled={busy || !draft.trim()} onClick={() => submitRename(s.id)}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" className="rounded-xl" disabled={busy} onClick={cancelEdit}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          }

          return (
            <div
              key={s.id}
              className={`flex items-center gap-1 rounded-xl border px-3 py-1.5 transition ${
                isActive
                  ? "border-[#2ec4b6] bg-[#2ec4b6]/10"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              <button
                type="button"
                className="text-sm font-medium text-gray-900 disabled:opacity-50"
                disabled={disabled || busy}
                onClick={() => onSelect(s.id)}
              >
                {/* Schedule names are user data — never translated. */}
                {s.name}
              </button>

              {isDefault && (
                <span
                  title={t("feeSchedules.isDefault")}
                  className="ms-1 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
                >
                  <Star className="h-3 w-3 me-0.5 fill-amber-500 text-amber-500" />
                  {t("feeSchedules.defaultBadge")}
                </span>
              )}

              <button
                type="button"
                title={t("feeSchedules.rename")}
                className="ms-1 text-gray-400 hover:text-gray-700 disabled:opacity-40"
                disabled={disabled || busy}
                onClick={() => { setRenamingId(s.id); setCreating(false); setDraft(s.name); }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>

              {!isDefault && (
                <>
                  <button
                    type="button"
                    title={t("feeSchedules.makeDefault")}
                    className="text-gray-400 hover:text-amber-600 disabled:opacity-40"
                    disabled={disabled || busy}
                    onClick={() => run(async () => { await onSetDefault(s.id); toast.success(t("feeSchedules.defaultChanged")); })}
                  >
                    <Star className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title={t("feeSchedules.delete")}
                    className="text-gray-400 hover:text-red-600 disabled:opacity-40"
                    disabled={disabled || busy}
                    onClick={() => onDelete(s)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FeeScheduleBar;
