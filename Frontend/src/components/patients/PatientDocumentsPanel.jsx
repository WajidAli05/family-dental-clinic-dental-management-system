import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import TablePagination from "@/components/ui/TablePagination";
import OwnerConfirmDialog from "@/components/owner/OwnerConfirmDialog";
import {
  Loader2, Upload, Trash2, Download, FileText, ImageIcon, FileSignature, Search, ShieldCheck, Ban,
} from "lucide-react";
import { toast } from "sonner";
import { formatBytes } from "@/lib/imageThumb";
import { NESTED_POPOVER } from "@/lib/zLayers";
import ConsentModal from "./ConsentModal";

/**
 * The patient DOCUMENT REPOSITORY — every FileAsset for this patient.
 *
 * A "document" is not a separate entity: it is a FileAsset with a category, so
 * this reads the same paginated endpoint the imaging gallery uses.
 *
 * PAGINATION AND FILTERS ARE SERVER-SIDE. Category, free-text search and the
 * page all go to the API, so `total` reflects the filters and a match on page 4
 * is still found — filtering the current page would silently miss it.
 *
 * WHAT THE UI OFFERS COMES FROM THE SERVER. `file-upload-policy` returns what
 * this role may actually do, so a button is never shown for an action the
 * server will refuse.
 */

const PAGE_SIZE = 10;
const ALL_CATEGORIES = [
  "consent", "xray", "photo", "prescription", "report", "treatment_plan",
  "invoice", "receipt", "referral", "lab_attachment", "document", "other",
];
/** Fallback when the policy endpoint is unavailable — owner/dentist set. */
const DEFAULT_UPLOADABLE = [
  "report", "referral", "prescription", "treatment_plan", "invoice", "receipt", "photo", "other",
];

const CATEGORY_ICON = { consent: FileSignature, xray: ImageIcon, photo: ImageIcon };

const PatientDocumentsPanel = ({ patient, api, appointmentId = "" }) => {
  const { t } = useTranslation();
  const patientId = patient?.id || "";
  const fileInputRef = useRef(null);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);

  const [coverage, setCoverage] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [category, setCategory] = useState("all");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [uploadCategory, setUploadCategory] = useState("");
  const [consentOpen, setConsentOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  // Consent rows need the CONSENT id (CNS-####), which the file row does not
  // carry — map fileId -> consent so the row can offer Withdraw.
  const [consents, setConsents] = useState([]);

  // The server is the authority on what this role may do.
  useEffect(() => {
    if (!api?.getUploadPolicy) return;
    let alive = true;
    api.getUploadPolicy()
      .then((res) => {
        if (!alive) return;
        const p = res?.data || null;
        setPolicy(p);
        const allowed = p?.uploadCategories || DEFAULT_UPLOADABLE;
        setUploadCategory((cur) => cur || allowed[0] || "");
      })
      .catch(() => { if (alive) setPolicy(null); });
    return () => { alive = false; };
  }, [api]);

  // Debounce the search so typing does not fire a request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);

  // Any filter change invalidates the current page.
  useEffect(() => { setPage(1); }, [category, debouncedQ]);

  const load = useCallback(async () => {
    if (!patientId || !api?.listPatientFiles) return;
    setLoading(true);
    try {
      const [filesRes, covRes, consentRes] = await Promise.all([
        api.listPatientFiles(patientId, {
          page,
          limit: PAGE_SIZE,
          category: category === "all" ? undefined : category,
          q: debouncedQ || undefined,
        }),
        api.getConsentCoverage?.(patientId).catch(() => ({ data: [] })) ?? Promise.resolve({ data: [] }),
        api.listPatientConsents?.(patientId, { limit: 200 }).catch(() => ({ data: [] })) ?? Promise.resolve({ data: [] }),
      ]);
      setRows(filesRes?.data || []);
      setTotal(Number(filesRes?.total) || 0);
      setPages(Number(filesRes?.pages) || 1);
      setCoverage(covRes?.data || []);
      setConsents(consentRes?.data || []);
    } catch (e) {
      toast.error(e.message || t("documents.loadError"));
    } finally {
      setLoading(false);
    }
  }, [patientId, api, page, category, debouncedQ, t]);

  useEffect(() => { load(); }, [load]);

  /** Timeline buckets within the current page, newest day first. */
  const timeline = useMemo(() => {
    const byDay = new Map();
    for (const r of rows) {
      const day = String(r.uploadedAt || "").slice(0, 10) || "—";
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day).push(r);
    }
    return [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [rows]);

  const signedProcedures = useMemo(() => (coverage || []).filter((c) => c.consentId), [coverage]);
  const uploadable = policy?.uploadCategories || DEFAULT_UPLOADABLE;
  const canUpload = policy ? !!policy.canUpload : false;
  const canDelete = policy ? !!policy.canDelete : false;
  const canCaptureConsent = policy ? !!policy.canCaptureConsent : false;
  const canWithdrawConsent = policy ? !!policy.canWithdrawConsent : false;

  /** fileId -> consent publicId, so a consent row can be withdrawn by id. */
  const consentByFile = useMemo(() => {
    const m = new Map();
    for (const c of consents) if (c.fileId) m.set(c.fileId, c.id);
    return m;
  }, [consents]);

  const onPick = async (e) => {
    const picked = [...(e.target.files || [])];
    e.target.value = "";
    if (!picked.length) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("category", uploadCategory || uploadable[0] || "other");
      if (appointmentId) form.append("appointmentId", appointmentId);
      for (const f of picked) form.append("file", f, f.name);
      await api.uploadPatientFiles(patientId, form);
      toast.success(t("documents.uploaded"));
      setPage(1);
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

  const confirmDelete = async () => {
    const row = confirmTarget;
    setConfirmTarget(null);
    if (!row) return;
    setBusy(true);
    try {
      const consentId = consentByFile.get(row.id);
      if (consentId) {
        // Withdrawing also soft-deletes the signed PDF server-side; the record
        // and the file are both RETAINED.
        await api.withdrawConsent(consentId, patientId);
        toast.success(t("consent.withdrawn"));
      } else {
        await api.deletePatientFile(row.id);
        toast.success(t("documents.deleted"));
      }
      await load();
    } catch (e) {
      toast.error(e.message || t("documents.actionFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
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
          {canUpload && (
            <>
              <Select value={uploadCategory || undefined} onValueChange={setUploadCategory} disabled={busy}>
                <SelectTrigger className="h-8 w-[150px] text-xs">
                  <SelectValue placeholder={t("documents.filterCategory")} />
                </SelectTrigger>
                <SelectContent className={NESTED_POPOVER}>
                  {uploadable.map((c) => (
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

      {/* Which procedures have signed consent on file. */}
      {signedProcedures.length > 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-900 flex items-start gap-2 flex-wrap">
          <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
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

      {/* Filters — applied SERVER-side */}
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

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("documents.loading")}
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-sm text-gray-500">
          {t("documents.empty")}
        </p>
      ) : (
        <div className="space-y-3">
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
                      {consentByFile.has(row.id)
                        ? canWithdrawConsent && (
                            <Button
                              size="sm" variant="ghost"
                              className="h-7 px-1.5 text-amber-600 hover:bg-amber-50"
                              disabled={busy}
                              title={t("consent.withdraw")}
                              onClick={() => setConfirmTarget(row)}
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          )
                        : canDelete && (
                            <Button
                              size="sm" variant="ghost"
                              className="h-7 px-1.5 text-red-500 hover:bg-red-50"
                              disabled={busy}
                              onClick={() => setConfirmTarget(row)}
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

          <TablePagination page={page} pages={pages} total={total} limit={PAGE_SIZE} onPage={setPage} />
        </div>
      )}

      {/* Nothing is deleted without an explicit confirmation. Consents are
          withdrawn, not destroyed, and the message says so. */}
      <OwnerConfirmDialog
        open={!!confirmTarget}
        title={
          confirmTarget && consentByFile.has(confirmTarget.id)
            ? t("documents.withdrawConsentTitle")
            : t("documents.deleteTitle")
        }
        message={
          confirmTarget && consentByFile.has(confirmTarget.id)
            ? t("documents.withdrawConsentMessage", { name: confirmTarget?.originalName || "" })
            : t("documents.deleteMessage", { name: confirmTarget?.originalName || "" })
        }
        onCancel={() => setConfirmTarget(null)}
        onConfirm={confirmDelete}
      />

      <ConsentModal
        open={consentOpen}
        onOpenChange={setConsentOpen}
        patient={patient}
        api={api}
        appointmentId={appointmentId}
        onSaved={() => { setPage(1); load(); }}
      />
    </div>
  );
};

export default PatientDocumentsPanel;
