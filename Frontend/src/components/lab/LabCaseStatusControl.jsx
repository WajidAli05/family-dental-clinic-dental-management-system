import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { canonicalStatus, allowedNextStatuses, STATUS_LABEL_KEY } from "@/lib/labCaseConfig";

/**
 * Status control offering ONLY the steps this role may legally take next.
 *
 * The options come from the case's server-computed `allowedNext` whenever the
 * API provides it, so the dropdown can never offer a transition the backend
 * will reject. The backend re-validates regardless — this is a usability
 * layer, not the security boundary.
 */
const LabCaseStatusControl = ({ labCase, role, onStatusChange, disabled = false }) => {
  const { t } = useTranslation();
  const [next, setNext] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const current = canonicalStatus(labCase?.status);
  const options = allowedNextStatuses(current, role, labCase?.allowedNext);

  if (!options.length) {
    return (
      <p className="text-sm text-gray-500">
        {t("labCase.noTransitions", { status: t(STATUS_LABEL_KEY[current] || "labCase.status.requested") })}
      </p>
    );
  }

  const apply = async () => {
    if (!next) return;
    setErr(""); setSaving(true);
    try {
      await onStatusChange(labCase.id, next);
      setNext("");
    } catch (e) {
      setErr(e.message || t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={next}
          disabled={disabled || saving}
          onChange={(e) => setNext(e.target.value)}
          /*
           * bg-background / text-foreground are explicit on purpose. The lab
           * dashboard paints its <main> with `text-white`, which this select
           * inherited — white text on the control's light background made
           * every option unreadable. The <option> children are set too because
           * some browsers do not inherit the select's colour into the popup.
           * Design tokens, so this stays correct in dark mode as well.
           */
          className="rounded-lg border border-gray-200 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#2ec4b6] disabled:opacity-60 [&>option]:bg-background [&>option]:text-foreground"
        >
          <option value="">{t("labCase.selectNextStatus")}</option>
          {options.map((s) => (
            <option key={s} value={s}>{t(STATUS_LABEL_KEY[s] || s)}</option>
          ))}
        </select>
        <Button
          className="bg-[#2ec4b6] hover:bg-[#26a699] text-white rounded-xl"
          disabled={disabled || saving || !next}
          onClick={apply}
        >
          {saving ? t("common.saving") : t("common.apply")}
        </Button>
      </div>
      {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
    </div>
  );
};

export default LabCaseStatusControl;
