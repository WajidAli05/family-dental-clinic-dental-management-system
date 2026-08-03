/**
 * TwoFactorSettings
 *
 * Drop-in card for any profile/settings page. Handles:
 *   - Showing current 2FA status
 *   - Enabling TOTP (scan QR, save backup codes, confirm code)
 *   - Enabling OTP (receive email code, confirm, save backup codes)
 *   - Disabling 2FA (password + current code re-authentication)
 *
 * All strings use i18n t(). RTL-safe (uses logical CSS properties via Tailwind).
 */

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Shield, ShieldCheck, ShieldOff, Copy, Eye, EyeOff } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { twoFactorApi } from "@/lib/twoFactorApi";

// ── Helpers ───────────────────────────────────────────────────────────────────

function copyToClipboard(text) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

// ── Sub-components ────────────────────────────────────────────────────────────

function BackupCodesDisplay({ codes, onDone, t }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    copyToClipboard(codes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-800 mb-2">
          {t("twoFactor.backupCodesTitle")}
        </p>
        <p className="text-xs text-amber-700 mb-3">{t("twoFactor.backupCodesWarning")}</p>
        <div className="grid grid-cols-2 gap-1.5 font-mono text-sm">
          {codes.map((c) => (
            <span key={c} className="bg-white border rounded px-2 py-1 text-center tracking-widest">
              {c}
            </span>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="mt-3 w-full"
          onClick={handleCopy}
        >
          <Copy className="w-3.5 h-3.5 me-1.5" />
          {copied ? t("twoFactor.copied") : t("twoFactor.copyBackupCodes")}
        </Button>
      </div>
      <Button className="w-full bg-[#2ec4b6] hover:bg-[#26b0a3] text-white" onClick={onDone}>
        {t("twoFactor.savedDone")}
      </Button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TwoFactorSettings() {
  const { t } = useTranslation();

  const [status, setStatus]       = useState(null);  // { twoFactorEnabled, twoFactorMethod }
  const [loading, setLoading]     = useState(true);
  const [step, setStep]           = useState("idle"); // idle | choose | qr | otp_wait | backup | disable
  const [method, setMethod]       = useState("totp");
  const [qrData, setQrData]       = useState(null);  // { qrDataUrl, backupCodes }
  const [backupCodes, setBackupCodes] = useState([]);
  const [code, setCode]           = useState("");
  const [password, setPassword]   = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [codeType, setCodeType]   = useState("totp"); // for disable: totp/otp/backup
  const [busy, setBusy]           = useState(false);
  const [err, setErr]             = useState("");

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const json = await twoFactorApi.getStatus();
      setStatus(json.data);
    } catch {
      // Non-fatal — show as disabled
      setStatus({ twoFactorEnabled: false, twoFactorMethod: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  function reset() {
    setStep("idle");
    setCode("");
    setPassword("");
    setQrData(null);
    setBackupCodes([]);
    setErr("");
    setCodeType("totp");
  }

  // ── Enable: Step 1 — choose method ─────────────────────────────────────────

  const handleStartSetup = async (chosenMethod) => {
    setBusy(true);
    setErr("");
    try {
      const json = await twoFactorApi.setup(chosenMethod);
      setMethod(chosenMethod);
      if (chosenMethod === "totp") {
        setQrData({ qrDataUrl: json.data.qrDataUrl, otpauthUrl: json.data.otpauthUrl });
        setBackupCodes(json.data.backupCodes);
        setStep("qr");
      } else {
        // OTP: code was sent to email
        setBackupCodes(json.data.backupCodes);
        setStep("otp_wait");
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  // ── Enable: Step 2 — verify code ────────────────────────────────────────────

  const handleVerifySetup = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setErr("");
    try {
      await twoFactorApi.verifySetup(code.trim());
      toast.success(t("twoFactor.enabledSuccess"));
      setStep("backup"); // show backup codes to save
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  const handleBackupDone = () => {
    reset();
    fetchStatus();
  };

  // ── Send OTP for disable ─────────────────────────────────────────────────────

  const handleSendOtpForDisable = async () => {
    setBusy(true);
    setErr("");
    try {
      await twoFactorApi.sendOtp();
      toast.success(t("twoFactor.otpSent"));
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  // ── Disable ──────────────────────────────────────────────────────────────────

  const handleDisable = async (e) => {
    e.preventDefault();
    if (!password.trim() || !code.trim()) return;
    setBusy(true);
    setErr("");
    try {
      await twoFactorApi.disable(password.trim(), code.trim(), codeType);
      toast.success(t("twoFactor.disabledSuccess"));
      reset();
      fetchStatus();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <p className="text-sm text-gray-400">{t("twoFactor.loading")}</p>
        </CardContent>
      </Card>
    );
  }

  const isEnabled = status?.twoFactorEnabled;
  const currentMethod = status?.twoFactorMethod;

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          {isEnabled
            ? <ShieldCheck className="w-6 h-6 text-[#2ec4b6]" />
            : <Shield className="w-6 h-6 text-gray-400" />}
          <div>
            <h3 className="text-base font-semibold text-gray-900">{t("twoFactor.title")}</h3>
            <p className="text-xs text-gray-500">
              {isEnabled
                ? t("twoFactor.enabledStatus", { method: currentMethod === "otp" ? t("twoFactor.methodOtp") : t("twoFactor.methodTotp") })
                : t("twoFactor.disabledStatus")}
            </p>
          </div>
        </div>

        {/* Error */}
        {err && <p className="text-sm text-red-500">{err}</p>}

        {/* ── IDLE ──────────────────────────────────────────────────────── */}
        {step === "idle" && !isEnabled && (
          <Button
            size="sm"
            className="bg-[#2ec4b6] hover:bg-[#26b0a3] text-white"
            onClick={() => { setErr(""); setStep("choose"); }}
          >
            {t("twoFactor.enableButton")}
          </Button>
        )}

        {step === "idle" && isEnabled && (
          <Button
            size="sm"
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50"
            onClick={() => {
              setErr("");
              setCodeType(currentMethod === "otp" ? "otp" : "totp");
              setStep("disable");
            }}
          >
            <ShieldOff className="w-4 h-4 me-1.5" />
            {t("twoFactor.disableButton")}
          </Button>
        )}

        {/* ── CHOOSE METHOD ─────────────────────────────────────────────── */}
        {step === "choose" && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">{t("twoFactor.chooseMethod")}</p>
            <div className="flex flex-wrap gap-3">
              <Button
                size="sm"
                disabled={busy}
                className="bg-[#2ec4b6] hover:bg-[#26b0a3] text-white"
                onClick={() => handleStartSetup("totp")}
              >
                {busy && method === "totp" ? "…" : t("twoFactor.methodTotpLabel")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => handleStartSetup("otp")}
              >
                {busy && method === "otp" ? "…" : t("twoFactor.methodOtpLabel")}
              </Button>
              <Button size="sm" variant="ghost" onClick={reset}>
                {t("twoFactor.cancel")}
              </Button>
            </div>
          </div>
        )}

        {/* ── TOTP: QR SCAN ─────────────────────────────────────────────── */}
        {step === "qr" && qrData && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{t("twoFactor.scanQr")}</p>
            <img
              src={qrData.qrDataUrl}
              alt="TOTP QR code"
              className="w-48 h-48 border rounded-lg mx-auto"
            />
            <p className="text-xs text-gray-400 text-center">{t("twoFactor.cantScan")}</p>

            <form onSubmit={handleVerifySetup} className="space-y-3">
              <div>
                <Label htmlFor="totp-code">{t("twoFactor.enterCode")}</Label>
                <Input
                  id="totp-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={busy} size="sm"
                  className="bg-[#2ec4b6] hover:bg-[#26b0a3] text-white">
                  {busy ? "…" : t("twoFactor.confirm")}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={reset}>
                  {t("twoFactor.cancel")}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ── OTP: WAITING FOR CODE ─────────────────────────────────────── */}
        {step === "otp_wait" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{t("twoFactor.otpSentSetup")}</p>
            <form onSubmit={handleVerifySetup} className="space-y-3">
              <div>
                <Label htmlFor="otp-code">{t("twoFactor.enterOtp")}</Label>
                <Input
                  id="otp-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={busy} size="sm"
                  className="bg-[#2ec4b6] hover:bg-[#26b0a3] text-white">
                  {busy ? "…" : t("twoFactor.confirm")}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={reset}>
                  {t("twoFactor.cancel")}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ── BACKUP CODES ──────────────────────────────────────────────── */}
        {step === "backup" && backupCodes.length > 0 && (
          <BackupCodesDisplay codes={backupCodes} onDone={handleBackupDone} t={t} />
        )}

        {/* ── DISABLE ───────────────────────────────────────────────────── */}
        {step === "disable" && (
          <form onSubmit={handleDisable} className="space-y-4">
            <p className="text-sm text-gray-600">{t("twoFactor.disableInstructions")}</p>

            {/* Password */}
            <div>
              <Label htmlFor="dis-password">{t("twoFactor.currentPassword")}</Label>
              <div className="relative">
                <Input
                  id="dis-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute end-2 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Code type selector */}
            <div className="flex gap-2 text-xs">
              {["totp", "otp", "backup"].map((ct) => {
                // Only show totp/otp matching current method, plus backup
                if (ct === "totp" && currentMethod !== "totp") return null;
                if (ct === "otp"  && currentMethod !== "otp")  return null;
                return (
                  <button
                    key={ct}
                    type="button"
                    onClick={() => { setCodeType(ct); setCode(""); }}
                    className={`px-2 py-1 rounded border text-xs ${
                      codeType === ct
                        ? "border-[#2ec4b6] text-[#2ec4b6] bg-[#2ec4b6]/10"
                        : "border-gray-200 text-gray-500"
                    }`}
                  >
                    {ct === "backup" ? t("twoFactor.backupCode") : ct.toUpperCase()}
                  </button>
                );
              })}
            </div>

            {/* Send OTP button (for OTP method) */}
            {codeType === "otp" && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={handleSendOtpForDisable}
              >
                {busy ? "…" : t("twoFactor.sendOtp")}
              </Button>
            )}

            {/* Code input */}
            <div>
              <Label htmlFor="dis-code">
                {codeType === "backup" ? t("twoFactor.backupCodeLabel") : t("twoFactor.codeLabel")}
              </Label>
              <Input
                id="dis-code"
                type="text"
                inputMode={codeType === "backup" ? "text" : "numeric"}
                placeholder={codeType === "backup" ? "XXXXXX-XXXXXX" : "000000"}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={busy}
                size="sm"
                variant="destructive"
              >
                {busy ? "…" : t("twoFactor.confirmDisable")}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={reset}>
                {t("twoFactor.cancel")}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
