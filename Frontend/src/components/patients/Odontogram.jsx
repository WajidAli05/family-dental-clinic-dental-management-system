import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Stethoscope } from "lucide-react";

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

const EMPTY_CLINICAL = {
  diagnosis: "", treatment: "", clinicalFinding: "",
  note: "", xrayRequested: false, xrayNote: "",
};

/**
 * Reusable FDI-numbered odontogram.
 *
 * Chart mode (owner profile, receptionist read-only): pass `odontogram` and
 * optionally `editable` + `onSave(toothNumber, {condition, note})`.
 *
 * Clinical mode (prescribing): additionally pass `clinical`, `toothEntries`
 * and `onClinicalChange(toothNumber, entry)` to capture the per-tooth
 * prescription record (diagnosis / treatment / finding / note / x-ray) in the
 * same tooth dialog — one tooth UI, no second selector.
 *
 * Any tooth can always be OPENED to read its existing status/note; `editable`
 * only controls whether the fields can be changed and saved.
 */
const Odontogram = ({
  odontogram = [],
  editable = false,
  onSave,
  clinical = false,
  toothEntries = [],
  onClinicalChange,
  clinicalOptions = { diagnosis: [], treatment: [], clinicalFinding: [] },
}) => {
  const { t } = useTranslation();
  const [activeTooth, setActiveTooth] = useState(null);
  const [form, setForm] = useState({ condition: "healthy", note: "" });
  const [clin, setClin] = useState(EMPTY_CLINICAL);
  const [saving, setSaving] = useState(false);

  const byTooth = new Map((odontogram || []).map((e) => [e.toothNumber, e]));
  const clinicalByTooth = new Map((toothEntries || []).map((e) => [e.toothNumber, e]));

  // Readable by everyone who can see the chart; only saving is gated.
  const openTooth = (tooth) => {
    const existing = byTooth.get(tooth);
    setForm({ condition: existing?.condition || "healthy", note: existing?.note || "" });
    setClin({ ...EMPTY_CLINICAL, ...(clinicalByTooth.get(tooth) || {}) });
    setActiveTooth(tooth);
  };

  const handleSave = async () => {
    if (!activeTooth || !editable) return;
    setSaving(true);
    try {
      // Per-tooth clinical entry is local prescription state — no request.
      if (clinical) onClinicalChange?.(activeTooth, clin);
      // Tooth status/note persists to Patient.odontogram via the caller.
      await onSave?.(activeTooth, { condition: form.condition, note: form.note.trim() });
      setActiveTooth(null);
    } finally {
      setSaving(false);
    }
  };

  const activeHasClinical = Boolean(clinicalByTooth.get(activeTooth));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        {QUADRANTS.map((q) => (
          <div key={q.key} className="flex flex-wrap gap-1.5">
            {q.teeth.map((tooth) => {
              const entry = byTooth.get(tooth);
              const cond = entry?.condition || "healthy";
              const clinEntry = clinicalByTooth.get(tooth);
              const titleParts = [t(CONDITION_LABEL_KEYS[cond])];
              if (entry?.note) titleParts.push(entry.note);
              if (clinEntry?.diagnosis) titleParts.push(clinEntry.diagnosis);
              return (
                <div key={tooth} className="relative">
                  <button
                    type="button"
                    onClick={() => openTooth(tooth)}
                    title={titleParts.join(" — ")}
                    className={[
                      "h-9 w-9 rounded-lg border-2 text-[11px] font-semibold flex items-center justify-center transition cursor-pointer hover:opacity-80",
                      CONDITION_COLORS[cond],
                      clinEntry ? "ring-2 ring-offset-1 ring-[#2ec4b6]" : "",
                    ].join(" ")}
                  >
                    {tooth}
                  </button>
                  {clinEntry?.xrayRequested && (
                    <span
                      title={t("patients.xrayRequested")}
                      className="absolute -top-1 -end-1 rounded-full bg-indigo-600 px-1 text-[8px] font-bold leading-tight text-white"
                    >
                      X
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Included-teeth indicator (clinical mode) */}
      {clinical && (
        <div className="rounded-lg bg-[#2ec4b6]/5 border border-[#2ec4b6]/20 px-3 py-2">
          <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
            <Stethoscope className="h-3.5 w-3.5 text-[#2ec4b6]" />
            {t("patients.teethInPrescription", { count: toothEntries.length })}
          </p>
          {toothEntries.length > 0 && (
            <p className="mt-1 text-xs text-gray-600">
              {toothEntries
                .map((e) => e.toothNumber + (e.xrayRequested ? " (X-ray)" : ""))
                .join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-3 border-t border-gray-100">
        {CONDITIONS.map((c) => (
          <span key={c} className="inline-flex items-center gap-1.5 text-xs text-gray-600">
            <span className={`h-3 w-3 rounded border-2 ${CONDITION_COLORS[c]}`} />
            {t(CONDITION_LABEL_KEYS[c])}
          </span>
        ))}
        {clinical && (
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
            <span className="h-3 w-3 rounded border-2 border-[#2ec4b6] ring-1 ring-[#2ec4b6]" />
            {t("patients.toothHasClinicalEntry")}
          </span>
        )}
      </div>

      {/* Tooth dialog */}
      {activeTooth && (
        <div
          className="fixed inset-0 z-[80] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !saving && setActiveTooth(null)}
        >
          <div
            className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-xl border border-gray-100 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-gray-900 mb-1">
              {t("patients.tooth")} {activeTooth}
            </p>
            {!editable && (
              <p className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
                {t("patients.toothReadOnly")}
              </p>
            )}

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">{t("patients.toothStatus")}</label>
                <Select
                  value={form.condition}
                  onValueChange={(v) => setForm((f) => ({ ...f, condition: v }))}
                  disabled={saving || !editable}
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
              </div>

              <Textarea
                placeholder={t("patients.toothNote")}
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                disabled={saving || !editable}
                className="min-h-[60px]"
              />

              {clinical && (
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    {t("patients.toothClinicalForVisit")}
                  </p>

                  <ClinicalField
                    label={t("patients.toothDiagnosis")}
                    value={clin.diagnosis}
                    options={clinicalOptions.diagnosis}
                    onChange={(v) => setClin((c) => ({ ...c, diagnosis: v }))}
                    disabled={saving || !editable}
                  />
                  <ClinicalField
                    label={t("patients.toothTreatment")}
                    value={clin.treatment}
                    options={clinicalOptions.treatment}
                    onChange={(v) => setClin((c) => ({ ...c, treatment: v }))}
                    disabled={saving || !editable}
                  />
                  <ClinicalField
                    label={t("patients.toothFinding")}
                    value={clin.clinicalFinding}
                    options={clinicalOptions.clinicalFinding}
                    onChange={(v) => setClin((c) => ({ ...c, clinicalFinding: v }))}
                    disabled={saving || !editable}
                  />

                  <Textarea
                    placeholder={t("patients.toothClinicalNote")}
                    value={clin.note}
                    onChange={(e) => setClin((c) => ({ ...c, note: e.target.value }))}
                    disabled={saving || !editable}
                    className="min-h-[60px]"
                  />

                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={clin.xrayRequested}
                      onChange={(e) => setClin((c) => ({ ...c, xrayRequested: e.target.checked }))}
                      disabled={saving || !editable}
                      className="accent-[#2ec4b6]"
                    />
                    {t("patients.xrayRequest")}
                  </label>

                  {clin.xrayRequested && (
                    <Input
                      placeholder={t("patients.xrayNote")}
                      value={clin.xrayNote}
                      onChange={(e) => setClin((c) => ({ ...c, xrayNote: e.target.value }))}
                      disabled={saving || !editable}
                    />
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setActiveTooth(null)} disabled={saving}>
                {editable ? t("patients.toothCancel") : t("patients.toothClose")}
              </Button>
              {editable && clinical && activeHasClinical && (
                <Button
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  disabled={saving}
                  onClick={() => { onClinicalChange?.(activeTooth, null); setActiveTooth(null); }}
                >
                  {t("patients.toothRemoveEntry")}
                </Button>
              )}
              {editable && (
                <Button onClick={handleSave} disabled={saving} className="bg-[#2ec4b6] hover:bg-[#26a699]">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("patients.toothSave")}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/** Dropdown when the clinic has templates configured, free text otherwise —
 * so prescribing still works before the clinical library is populated. */
const ClinicalField = ({ label, value, options = [], onChange, disabled }) => (
  <div className="space-y-1">
    <label className="text-xs font-medium text-gray-500">{label}</label>
    {options.length > 0 ? (
      <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger><SelectValue placeholder={label} /></SelectTrigger>
        <SelectContent className="z-[90]">
          {options.map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : (
      <Input
        placeholder={label}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    )}
  </div>
);

export default Odontogram;
