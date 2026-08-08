import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const CONDITIONS = [
  "healthy", "caries", "filled", "missing", "crown",
  "implant", "root_canal", "extraction_needed", "bridge",
];

const CONDITION_COLORS = {
  healthy:            "bg-white border-gray-300 text-gray-400",
  caries:              "bg-red-500 border-red-600 text-white",
  filled:              "bg-blue-500 border-blue-600 text-white",
  missing:             "bg-gray-200 border-gray-300 text-gray-400 line-through",
  crown:               "bg-amber-400 border-amber-500 text-white",
  implant:             "bg-purple-500 border-purple-600 text-white",
  root_canal:          "bg-orange-500 border-orange-600 text-white",
  extraction_needed:   "bg-red-800 border-red-900 text-white",
  bridge:              "bg-[#2ec4b6] border-[#26a699] text-white",
};

const CONDITION_LABEL_KEYS = {
  healthy:            "patients.toothHealthy",
  caries:              "patients.toothCaries",
  filled:              "patients.toothFilled",
  missing:             "patients.toothMissing",
  crown:               "patients.toothCrown",
  implant:             "patients.toothImplant",
  root_canal:          "patients.toothRootCanal",
  extraction_needed:   "patients.toothExtractionNeeded",
  bridge:              "patients.toothBridge",
};

// FDI (ISO-3950) numbering, dentist's-eye chart layout:
// Q1 upper-right (18→11 toward midline) | Q2 upper-left (21→28 away from midline)
// Q4 lower-right (48→41 toward midline) | Q3 lower-left (31→38 away from midline)
const QUADRANTS = [
  { key: "Q1", teeth: ["18", "17", "16", "15", "14", "13", "12", "11"] },
  { key: "Q2", teeth: ["21", "22", "23", "24", "25", "26", "27", "28"] },
  { key: "Q4", teeth: ["48", "47", "46", "45", "44", "43", "42", "41"] },
  { key: "Q3", teeth: ["31", "32", "33", "34", "35", "36", "37", "38"] },
];

/**
 * Reusable FDI-numbered odontogram — renders as a read-only chart when
 * `editable` is false, or click-to-annotate (condition + note) when true.
 * `onSave(toothNumber, {condition, note})` persists one tooth at a time.
 */
const Odontogram = ({ odontogram = [], editable = false, onSave }) => {
  const { t } = useTranslation();
  const [activeTooth, setActiveTooth] = useState(null);
  const [form, setForm] = useState({ condition: "healthy", note: "" });
  const [saving, setSaving] = useState(false);

  const byTooth = new Map((odontogram || []).map((e) => [e.toothNumber, e]));

  const openTooth = (tooth) => {
    if (!editable) return;
    const existing = byTooth.get(tooth);
    setForm({ condition: existing?.condition || "healthy", note: existing?.note || "" });
    setActiveTooth(tooth);
  };

  const handleSave = async () => {
    if (!activeTooth) return;
    setSaving(true);
    try {
      await onSave?.(activeTooth, { condition: form.condition, note: form.note.trim() });
      setActiveTooth(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        {QUADRANTS.map((q) => (
          <div key={q.key} className="flex flex-wrap gap-1.5">
            {q.teeth.map((tooth) => {
              const entry = byTooth.get(tooth);
              const cond = entry?.condition || "healthy";
              return (
                <button
                  key={tooth}
                  type="button"
                  onClick={() => openTooth(tooth)}
                  disabled={!editable}
                  title={entry?.note || t(CONDITION_LABEL_KEYS[cond])}
                  className={[
                    "h-9 w-9 rounded-lg border-2 text-[11px] font-semibold flex items-center justify-center transition",
                    CONDITION_COLORS[cond],
                    editable ? "cursor-pointer hover:opacity-80" : "cursor-default",
                  ].join(" ")}
                >
                  {tooth}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-3 border-t border-gray-100">
        {CONDITIONS.map((c) => (
          <span key={c} className="inline-flex items-center gap-1.5 text-xs text-gray-600">
            <span className={`h-3 w-3 rounded border-2 ${CONDITION_COLORS[c]}`} />
            {t(CONDITION_LABEL_KEYS[c])}
          </span>
        ))}
      </div>

      {/* Tooth edit dialog */}
      {activeTooth && (
        <div
          className="fixed inset-0 z-[80] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !saving && setActiveTooth(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white shadow-xl border border-gray-100 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-gray-900 mb-3">
              {t("patients.tooth")} {activeTooth}
            </p>

            <div className="space-y-3">
              <Select
                value={form.condition}
                onValueChange={(v) => setForm((f) => ({ ...f, condition: v }))}
                disabled={saving}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                {/* Portaled content defaults to z-50, which renders BEHIND this
                    dialog's z-[80] backdrop — bump it above so the dropdown is
                    actually visible/clickable instead of hidden under the overlay. */}
                <SelectContent className="z-[90]">
                  {CONDITIONS.map((c) => (
                    <SelectItem key={c} value={c}>{t(CONDITION_LABEL_KEYS[c])}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Textarea
                placeholder={t("patients.toothNote")}
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                disabled={saving}
                className="min-h-[70px]"
              />
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setActiveTooth(null)} disabled={saving}>
                {t("patients.toothCancel")}
              </Button>
              <Button onClick={handleSave} disabled={saving} className="bg-[#2ec4b6] hover:bg-[#26a699]">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("patients.toothSave")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Odontogram;
