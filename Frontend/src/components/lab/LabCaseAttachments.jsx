import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Paperclip, Upload, Download } from "lucide-react";
import { listLabCaseFiles, uploadLabCaseFiles, downloadLabCaseFile, labCaseFilePolicy } from "@/lib/labCaseFilesApi";
import { toast } from "sonner";

/**
 * Attachments for a lab case — prescription scans, shade photos, QC images.
 *
 * Reuses the existing file-storage layer (ownerType "labcase", category
 * "lab_attachment"); nothing new is stored or served here. Access is decided
 * server-side per case, so a lab sees only its own cases' files.
 */
const LabCaseAttachments = ({ caseId, role }) => {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  // Controls are driven by the policy, so nothing renders that would 403.
  const policy = labCaseFilePolicy(role);
  const canUpload = policy.canUpload;

  const load = async () => {
    if (!caseId) return;
    setLoading(true); setErr("");
    try {
      const res = await listLabCaseFiles(role, caseId, { page: 1, limit: 50 });
      setRows(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setErr(e.message || t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  // `load` is recreated every render; depending on it would loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [caseId, role]);

  const onPick = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBusy(true); setErr("");
    try {
      await uploadLabCaseFiles(role, caseId, files);
      await load();
    } catch (ex) {
      setErr(ex.message || t("common.error"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = ""; // allow re-picking the same file
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          {t("labCase.attachments")}
          <span className="text-xs font-normal text-gray-500">({rows.length})</span>
        </div>
        {canUpload && (
          <>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={onPick}
            />
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-4 w-4 me-1" />
              {busy ? t("common.saving") : t("labCase.addAttachment")}
            </Button>
          </>
        )}
      </div>

      {err && <p className="text-sm text-red-600 mt-2">{err}</p>}

      <div className="mt-3">
        {loading ? (
          <p className="text-sm text-gray-500 py-4 text-center">{t("common.loading")}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">{t("labCase.noAttachments")}</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rows.map((f) => (
              <li key={f.id} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{f.originalName || f.id}</div>
                  <div className="text-xs text-gray-500">
                    {f.mimeType} · {Math.max(1, Math.round((f.sizeBytes || 0) / 1024))} KB
                    {f.uploadedAt ? ` · ${new Date(f.uploadedAt).toLocaleDateString()}` : ""}
                  </div>
                </div>
                {policy.canDownload && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg shrink-0"
                    onClick={async () => {
                      try {
                        await downloadLabCaseFile(role, f.id, f.originalName || f.id);
                      } catch (ex) {
                        toast.error(ex.message || t("common.error"));
                      }
                    }}
                  >
                    <Download className="h-3.5 w-3.5 me-1" />
                    {t("labCase.download")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default LabCaseAttachments;
