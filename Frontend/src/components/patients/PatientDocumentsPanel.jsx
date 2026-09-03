import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, Upload, Trash2, Download, FileText, ImageIcon, FileSignature, Search, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { formatBytes } from "@/lib/imageThumb";
import { NESTED_POPOVER } from "@/lib/zLayers";
import ConsentModal from "./ConsentModal";

/**
 * The patient DOCUMENT REPOSITORY — every FileAsset for this patient, in one
 * chronological timeline, with a category filter and free-text search.
 *
 * A "document" is not a separate entity: it is a FileAsset with a category, so
 * this reads the same paginated listFiles endpoint the imaging gallery uses.
 * The imaging panel remains separate because it carries genuinely
 * imaging-specific clinical logic (tooth tagging, outstanding x-ray requests);
 * this panel is the general repository and does not duplicate that.
 */

/** Categories staff may upload directly. Consent is produced by the signing flow. */
const UPLOADABLE = ["report", "referral", "prescription", "treatment_plan", "invoice", "receipt", "photo", "other"];
const ALL_CATEGORIES = ["consent", ...UPLOADABLE, "xray", "lab_attachment", "document"];

const CATEGORY_ICON = {
  consent: FileSignature,
  xray: ImageIcon,
  photo: ImageIcon,
};

const PatientDocumentsPanel = ({ patient, api, canEdit = false, canCaptureConsent = false, appointmentId = "" }) => {
  const { t } = useTranslation();
  const patientId = patient?.id || "";
  const fileInputRef = useRef(null);

  const [rows, setRows] = useState([]);
  const [coverage, setCoverage] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState("all");
  const [uploadCategory, setUploadCategory] = useState("report");
  const [q, setQ] = useState("");
  const [consentOpen, setConsentOpen] = useState(false);

  const load = useCallback(async () => {
    if (!patientId || !api?.listPatientFiles) return;
    setLoading(true);
    try {
      const [filesRes, covRes] = await Promise.all([
        api.listPatientFiles(patientId, { limit: 200 }),
        api.getConsentCoverage?.(patientId).catch(() => ({ data: [] })) ?? Promise.resolve({ data: [] }),
      ]);
      setRows(filesRes?.data || []);
      setCoverage(covRes?.data || []);
    } catch (e) {
      toast.error(e.message || t("documents.loadError"));
    } finally {
      setLoading(false);
    }
  }, [patientId, api, t]);

  useEffect(() => { load(); }, [load]);

  /** Filter + search, newest first — the server already sorts by createdAt. */
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (category !== "all" && r.category !== category) return false;
      if (!needle) return true;
      return `${r.originalName} ${r.note || ""}`.toLowerCase().includes(needle);
    });
  }, [rows, category, q]);

  /** Timeline buckets by date, so the repository reads chronologically. */
  const timeline = useMemo(() => {
    const byDay = new Map();
    for (const r of filtered) {
      const day = String(r.uploadedAt || "").slice(0, 10) || "—";
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day).push(r);
    }
    return [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const signedProcedures = useMemo(
    () => (coverage || []).filter((c) => c.consentId),
    [coverage]
  );

  const onPick = async (e) => {
    const picked = [...(e.target.files || [])];
    e.target.value = "";
    if (!picked.length) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("category", uploadCategory);
      if (appointmentId) form.append("appointmentId", appointmentId);
      for (const f of picked) form.append("file", f, f.name);
      await api.uploadPatientFiles(patientId, form);
      toast.success(t("documents.uploaded"));
      await load();
    } catch (err) {
      toast.error(err.message || t("documents.uploadFailed"));
    } finally {
      setBusy(false);
    }
  };

  const download = async (row) => {
    try {
      const blob = await api.fetchFileBlob(row.id, { download: true });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = row.originalName || row.id;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e.message || t("documents.loadError"));
    }
  };

  const remove = async (row) => {
    setBusy(true);
    try {
      await api.deletePatientFile(row.id);
      toast.success(t("documents.deleted"));
      await load();
    } catch (e) {
      toast.error(e.message || t("documents.actionFailed"));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("documents.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-[#2ec4b6]" />
          {t("documents.title")}
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          {canCaptureConsent && (
            <Button size="sm" variant="outline" onClick={() => setConsentOpen(true)} disabled={busy}>
              <FileSignature className="h-4 w-4 me-1" />
              {t("consent.newConsent")}
            </Button>
          )}
          {canEdit && (
            <>
              <Select value={uploadCategory} onValueChange={setUploadCategory} disabled={busy}>
                <SelectTrigger className="h-8 w-[150px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={NESTED_POPOVER}>
                  {UPLOADABLE.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">
                      {t(`documents.category.${c}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                multiple
                className="hidden"
                onChange={onPick}
              />
              <Button
                size="sm"
                className="bg-[#2ec4b6] hover:bg-[#26a699]"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
              >
                {busy ? <Loader2 className="h-4 w-4 me-1 animate-spin" /> : <Upload className="h-4 w-4 me-1" />}
                {t("documents.upload")}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Which procedures have signed consent on file — the query a stored PDF
          alone could not answer. */}
      {signedProcedures.length > 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 flex items-start gap-2 flex-wrap">
          <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            {t("consent.onFile")}:{" "}
            {signedProcedures.map((c, i) => (
              <span key={c.procedureType} className="font-semibold">
                {i > 0 ? ", " : ""}
                {t(`consent.procedure.${c.procedureType}`)}
                {c.templateSuperseded ? ` (${t("consent.supersededShort")})` : ""}
              </span>
            ))}
          </span>
        </div>
      )}

      {/* Filter + search */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">{t("documents.filterCategory")}</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className={NESTED_POPOVER}>
              <SelectItem value="all" className="text-xs">{t("documents.allCategories")}</SelectItem>
              {ALL_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c} className="text-xs">{t(`documents.category.${c}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("documents.search")}</Label>
          <div className="relative">
            <Search className="absolute top-2 start-2 h-4 w-4 text-gray-400" />
            <Input
              className="h-8 ps-8 text-xs"
              placeholder={t("documents.searchPlaceholder")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-sm text-gray-500">
          {t("documents.empty")}
        </p>
      ) : (
        <div className="space-y-4">
          {timeline.map(([day, items]) => (
            <div key={day} className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-100 pb-1">
                {day}
              </p>
              {items.map((row) => {
                const Icon = CATEGORY_ICON[row.category] || FileText;
                return (
                  <div key={row.id} className="flex items-start gap-3 rounded-lg border border-gray-200 p-2.5">
                    <Icon className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      {/* Filenames are data — never translated. */}
                      <p className="text-sm font-medium text-gray-900 truncate" title={row.originalName}>
                        {row.originalName}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {t(`documents.category.${row.category}`)} · {formatBytes(row.sizeBytes)}
                        {row.uploadedByName ? ` · ${row.uploadedByName}` : ""}
                      </p>
                      {(row.toothNumber || row.appointmentId || row.note) && (
                        <p className="text-[11px] text-gray-500 truncate">
                          {[
                            row.toothNumber ? `${t("patients.tooth")} ${row.toothNumber}` : "",
                            row.appointmentId || "",
                            row.note || "",
                          ].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => download(row)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      {canEdit && (
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 px-1.5 text-red-500 hover:bg-red-50"
                          disabled={busy}
                          onClick={() => remove(row)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <ConsentModal
        open={consentOpen}
        onOpenChange={setConsentOpen}
        patient={patient}
        api={api}
        appointmentId={appointmentId}
        onSaved={load}
      />
    </div>
  );
};

export default PatientDocumentsPanel;
