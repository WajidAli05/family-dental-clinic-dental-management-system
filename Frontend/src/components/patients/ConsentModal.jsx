import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, FileSignature, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { NESTED_DIALOG, NESTED_POPOVER } from "@/lib/zLayers";
import SignaturePad from "./SignaturePad";
import { buildConsentPdf } from "@/utils/buildConsentPdf";

/**
 * Digital consent capture.
 *
 * The wording comes from the SERVER's templates and is re-resolved server-side
 * on submit, so the signed record can never claim wording the patient was not
 * shown. This component only renders it, captures the signature, and builds
 * the PDF artifact.
 */
const ConsentModal = ({ open, onOpenChange, patient, api, appointmentId = "", onSaved }) => {
  const { t, i18n } = useTranslation();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [procedureType, setProcedureType] = useState("");
  const [signedByName, setSignedByName] = useState("");
  const [signedByRole, setSignedByRole] = useState("patient");
  const [method, setMethod] = useState("drawn");
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);

  const lang = i18n.language?.slice(0, 2) || "en";

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setProcedureType(""); setSignedByName(patient?.name || "");
    setSignedByRole("patient"); setMethod("drawn"); setSignatureDataUrl(null);
    setLoading(true);
    // Fetch in the UI language AND English — the PDF must print English.
    Promise.all([api.getConsentTemplates(lang), api.getConsentTemplates("en")])
      .then(([shown, english]) => {
        if (!alive) return;
        const en = new Map((english?.data || []).map((x) => [x.procedureType, x.text]));
        setTemplates((shown?.data || []).map((x) => ({ ...x, englishText: en.get(x.procedureType) || x.text })));
      })
      .catch((e) => { if (alive) toast.error(e.message || t("consent.loadError")); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [open, api, lang, patient, t]);

  const selected = useMemo(
    () => templates.find((x) => x.procedureType === procedureType) || null,
    [templates, procedureType]
  );

  const canSubmit =
    !!selected && !!signedByName.trim() && !saving &&
    (method === "typed" || !!signatureDataUrl);

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const pdf = buildConsentPdf({
        clinicPatientName: patient?.name || "",
        patientId: patient?.id || "",
        patientDob: patient?.dateOfBirth || "",
        procedureLabel: t(`consent.procedure.${selected.procedureType}`),
        consentText: selected.text,
        englishText: selected.englishText,
        displayLanguage: selected.language,
        signedByName: signedByName.trim(),
        signedByRole,
        signatureMethod: method,
        signatureDataUrl,
        witnessName: "", // stamped server-side from the authenticated actor
        signedAt: new Date(),
      });

      const form = new FormData();
      form.append("file", pdf, "consent.pdf");
      form.append("procedureType", selected.procedureType);
      form.append("displayLanguage", selected.language);
      form.append("signedByName", signedByName.trim());
      form.append("signedByRole", signedByRole);
      form.append("signatureMethod", method);
      if (appointmentId) form.append("appointmentId", appointmentId);

      await api.createConsent(patient.id, form);
      toast.success(t("consent.recorded"));
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e.message || t("consent.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (!open || !patient) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v); }}>
      <DialogContent
        className={`max-w-2xl max-h-[92vh] overflow-y-auto ${NESTED_DIALOG}`}
        overlayClassName={NESTED_DIALOG}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-[#2ec4b6]" />
            {t("consent.title")}
          </DialogTitle>
          {/* Patient names are data — never translated. */}
          <DialogDescription>
            {patient.name} {patient.id ? `(${patient.id})` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>{t("consent.procedureLabel")}</Label>
            <Select value={procedureType || undefined} onValueChange={setProcedureType} disabled={loading || saving}>
              <SelectTrigger>
                <SelectValue placeholder={loading ? t("consent.loading") : t("consent.procedureLabel")} />
              </SelectTrigger>
              <SelectContent className={NESTED_POPOVER}>
                {templates.map((x) => (
                  <SelectItem key={x.procedureType} value={x.procedureType}>
                    {t(`consent.procedure.${x.procedureType}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selected && (
            <>
              <div className="space-y-1">
                <Label>{t("consent.textLabel")}</Label>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm leading-relaxed text-gray-800">
                  {selected.text}
                </div>
                <p className="text-[11px] text-gray-500">
                  {t("consent.version", { n: selected.version })}
                </p>
              </div>

              {/* The signed PDF is English-only (jsPDF cannot render Urdu or
                  Arabic glyphs), so staff are told what the artifact contains. */}
              {selected.language !== "en" && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{t("consent.pdfEnglishNotice")}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{t("consent.signedByName")}</Label>
                  <Input
                    value={signedByName}
                    onChange={(e) => setSignedByName(e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("consent.signedByRole")}</Label>
                  <Select value={signedByRole} onValueChange={setSignedByRole} disabled={saving}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className={NESTED_POPOVER}>
                      <SelectItem value="patient">{t("consent.rolePatient")}</SelectItem>
                      <SelectItem value="guardian">{t("consent.roleGuardian")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="me-auto">{t("consent.signature")}</Label>
                  <Button
                    type="button" size="sm"
                    variant={method === "drawn" ? "default" : "outline"}
                    className={method === "drawn" ? "bg-[#2ec4b6] hover:bg-[#26a699] h-7 text-xs" : "h-7 text-xs"}
                    onClick={() => setMethod("drawn")}
                    disabled={saving}
                  >
                    {t("consent.methodDrawn")}
                  </Button>
                  <Button
                    type="button" size="sm"
                    variant={method === "typed" ? "default" : "outline"}
                    className={method === "typed" ? "bg-[#2ec4b6] hover:bg-[#26a699] h-7 text-xs" : "h-7 text-xs"}
                    onClick={() => setMethod("typed")}
                    disabled={saving}
                  >
                    {t("consent.methodTyped")}
                  </Button>
                </div>

                {method === "drawn" ? (
                  <SignaturePad onChange={setSignatureDataUrl} disabled={saving} />
                ) : (
                  <div className="rounded-lg border-2 border-dashed border-gray-300 p-4 text-center">
                    <p className="font-serif italic text-xl text-gray-900">{signedByName || "—"}</p>
                    <p className="text-[11px] text-gray-500 mt-1">{t("consent.typedNotice")}</p>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-gray-500">{t("consent.witnessNotice")}</p>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                  {t("consent.cancel")}
                </Button>
                <Button className="bg-[#2ec4b6] hover:bg-[#26a699]" disabled={!canSubmit} onClick={submit}>
                  {saving ? <Loader2 className="h-4 w-4 me-1 animate-spin" /> : <FileSignature className="h-4 w-4 me-1" />}
                  {t("consent.submit")}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConsentModal;
