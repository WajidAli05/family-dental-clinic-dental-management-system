import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, Trash2, Download, ImageIcon, FileText, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { makeThumbnail, formatBytes } from "@/lib/imageThumb";
import { NESTED_DIALOG } from "@/lib/zLayers";

/**
 * Patient imaging gallery (x-rays and photos).
 *
 * `api` is the caller's role-scoped client, so one component serves owner,
 * dentist and receptionist. `canEdit=false` renders view-only — which is the
 * receptionist case; the receptionist router mounts no write routes at all, so
 * the server refuses regardless.
 *
 * Bytes never come from a public URL: every thumbnail and full view is an
 * authenticated fetch that is turned into a short-lived object URL.
 */
const PatientImagingPanel = ({ patientId, api, canEdit = false, xrayRequestedTeeth = [], appointmentId = "" }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);

  const [rows, setRows] = useState([]);
  const [xrayTeeth, setXrayTeeth] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tooth, setTooth] = useState("");
  const [viewing, setViewing] = useState(null); // { id, url, originalName }

  // Authenticated blob URLs, keyed by file id. Revoked on unmount so a long
  // session does not leak object URLs holding PHI in memory.
  const [thumbUrls, setThumbUrls] = useState({});
  const urlsRef = useRef({});

  const load = useCallback(async () => {
    if (!patientId || !api?.listPatientFiles) return;
    setLoading(true);
    try {
      const [filesRes, teethRes] = await Promise.all([
        api.listPatientFiles(patientId, { category: "xray", limit: 100 }),
        api.listPatientXrayTeeth?.(patientId).catch(() => ({ data: [] })) ?? Promise.resolve({ data: [] }),
      ]);
      setRows(filesRes?.data || []);
      setXrayTeeth(teethRes?.data || []);
    } catch (e) {
      toast.error(e.message || t("imaging.loadError"));
    } finally {
      setLoading(false);
    }
  }, [patientId, api, t]);

  useEffect(() => { load(); }, [load]);

  // Fetch thumbnails through the authenticated route.
  useEffect(() => {
    let alive = true;
    (async () => {
      for (const row of rows) {
        if (!row.isImage || urlsRef.current[row.id]) continue;
        try {
          const blob = await api.fetchFileBlob(row.id, { thumb: row.hasThumb });
          if (!alive) return;
          const url = URL.createObjectURL(blob);
          urlsRef.current[row.id] = url;
          setThumbUrls((prev) => ({ ...prev, [row.id]: url }));
        } catch { /* a missing preview must not break the gallery */ }
      }
    })();
    return () => { alive = false; };
  }, [rows, api]);

  useEffect(() => () => {
    Object.values(urlsRef.current).forEach((u) => URL.revokeObjectURL(u));
    urlsRef.current = {};
  }, []);

  /** Teeth the dentist asked for a radiograph on that still have none on file. */
  const outstanding = useMemo(
    () => (xrayRequestedTeeth || []).filter((x) => !xrayTeeth.includes(x)),
    [xrayRequestedTeeth, xrayTeeth]
  );

  const onPick = async (e) => {
    const picked = [...(e.target.files || [])];
    e.target.value = ""; // allow re-picking the same file
    if (!picked.length) return;

    setBusy(true);
    try {
      const form = new FormData();
      form.append("category", "xray");
      if (tooth) form.append("toothNumber", tooth);
      if (appointmentId) form.append("appointmentId", appointmentId);

      for (const f of picked) {
        form.append("file", f, f.name);
        // Downscaled preview so the gallery never loads full-size originals.
        const thumb = await makeThumbnail(f);
        if (thumb) form.append("thumb", thumb, "thumb.jpg");
      }

      await api.uploadPatientFiles(patientId, form);
      toast.success(t("imaging.uploaded"));
      setTooth("");
      await load();
    } catch (err) {
      // Size/type rejections arrive from the server with a clear message.
      toast.error(err.message || t("imaging.uploadFailed"));
    } finally {
      setBusy(false);
    }
  };

  const openFull = async (row) => {
    try {
      const blob = await api.fetchFileBlob(row.id, { thumb: false });
      setViewing({ id: row.id, url: URL.createObjectURL(blob), originalName: row.originalName });
    } catch (e) {
      toast.error(e.message || t("imaging.loadError"));
    }
  };

  const closeViewer = () => {
    if (viewing?.url) URL.revokeObjectURL(viewing.url);
    setViewing(null);
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
      toast.error(e.message || t("imaging.loadError"));
    }
  };

  const remove = async (row) => {
    setBusy(true);
    try {
      await api.deletePatientFile(row.id);
      toast.success(t("imaging.deleted"));
      await load();
    } catch (e) {
      toast.error(e.message || t("imaging.actionFailed"));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("imaging.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-1.5">
          <ImageIcon className="h-3.5 w-3.5 text-[#2ec4b6]" />
          {t("imaging.title")}
        </p>

        {canEdit && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Optional tooth tag — turns an upload into the fulfilment of a
                per-tooth x-ray request from prescribing. */}
            <Select value={tooth || undefined} onValueChange={setTooth} disabled={busy}>
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <SelectValue placeholder={t("imaging.tagTooth")} />
              </SelectTrigger>
              <SelectContent className={NESTED_DIALOG}>
                {(outstanding.length ? outstanding : xrayRequestedTeeth).map((x) => (
                  <SelectItem key={x} value={x} className="text-xs">
                    {t("patients.tooth")} {x}
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
              {t("imaging.upload")}
            </Button>
          </div>
        )}
      </div>

      {/* Outstanding requests from the prescribing flow — an indicator, not a
          separate workflow. */}
      {outstanding.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            {t("imaging.outstandingRequests")}:{" "}
            <span className="font-semibold">{outstanding.join(", ")}</span>
          </span>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-sm text-gray-500">
          {t("imaging.empty")}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {rows.map((row) => (
            <div key={row.id} className="rounded-xl border border-gray-200 overflow-hidden bg-white">
              <button
                type="button"
                className="block w-full h-28 bg-gray-50 flex items-center justify-center overflow-hidden"
                onClick={() => row.isImage && openFull(row)}
                title={row.originalName}
              >
                {row.isImage && thumbUrls[row.id] ? (
                  <img
                    src={thumbUrls[row.id]}
                    alt={row.originalName}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : row.isImage ? (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-300" />
                ) : (
                  <FileText className="h-8 w-8 text-gray-300" />
                )}
              </button>

              <div className="p-2 space-y-1">
                {/* Filenames and patient data are never translated. */}
                <p className="text-[11px] font-medium text-gray-900 truncate" title={row.originalName}>
                  {row.originalName}
                </p>
                <p className="text-[10px] text-gray-500">
                  {String(row.uploadedAt || "").slice(0, 10)} · {formatBytes(row.sizeBytes)}
                </p>
                {(row.toothNumber || row.appointmentId) && (
                  <p className="text-[10px] text-gray-500 truncate">
                    {row.toothNumber ? `${t("patients.tooth")} ${row.toothNumber}` : ""}
                    {row.toothNumber && row.appointmentId ? " · " : ""}
                    {row.appointmentId || ""}
                  </p>
                )}
                {row.uploadedByName && (
                  <p className="text-[10px] text-gray-400 truncate">{row.uploadedByName}</p>
                )}

                <div className="flex items-center gap-1 pt-1">
                  <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => download(row)}>
                    <Download className="h-3 w-3" />
                  </Button>
                  {canEdit && (
                    <Button
                      size="sm" variant="ghost"
                      className="h-6 px-1.5 text-red-500 hover:bg-red-50"
                      disabled={busy}
                      onClick={() => remove(row)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full-size viewer */}
      {viewing && (
        <div
          className={`fixed inset-0 ${NESTED_DIALOG} bg-black/80 flex items-center justify-center p-4`}
          onClick={closeViewer}
        >
          <button
            type="button"
            className="absolute top-4 end-4 text-white/80 hover:text-white"
            onClick={closeViewer}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={viewing.url}
            alt={viewing.originalName}
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default PatientImagingPanel;
