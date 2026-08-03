import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Float } from "@react-three/drei";
import Wavify from "react-wavify";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { toast } from "sonner";

import DentalChart from "../components/DentalCavityModel";
import LoginLanguageSwitcher from "../components/login/LoginLanguageSwitcher";

import { useUserStore } from "../store/userStore";

function navigateByRole(navigate, role) {
  switch (role) {
    case "owner":        navigate("/owner-dashboard");        break;
    case "dentist":      navigate("/dentist-dashboard");      break;
    case "receptionist": navigate("/receptionist-dashboard"); break;
    case "lab":          navigate("/lab-dashboard");          break;
    default:             navigate("/login");
  }
}

// ── 2FA code-entry step ───────────────────────────────────────────────────────
function TwoFactorStep({ method, onBack }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { verify2faLogin, error } = useUserStore();

  const [code,       setCode]       = useState("");
  const [useBackup,  setUseBackup]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inlineErr,  setInlineErr]  = useState("");

  useEffect(() => {
    if (!error) return;
    const msg = String(error).toLowerCase();
    // Known wrong-code patterns → friendly retry message; anything else passes through
    if (msg.includes("invalid 2fa") || msg.includes("invalid code") || msg.includes("invalid or expired")) {
      setInlineErr(t("auth.twoFactor.invalidCode"));
    } else {
      setInlineErr(error);
    }
  }, [error, t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setInlineErr("");
    if (!code.trim()) return;

    setSubmitting(true);
    const codeType = useBackup ? "backup" : method;
    const ok = await verify2faLogin(code.trim(), codeType);
    setSubmitting(false);

    if (ok) {
      const stored = JSON.parse(localStorage.getItem("user"));
      navigateByRole(navigate, stored?.role);
    } else if (!error) {
      // verify2faLogin returned false but store error wasn't set (shouldn't happen, but guard it)
      setInlineErr(t("auth.twoFactor.invalidCode"));
    }
    // When error IS set, the useEffect above will fire and show the friendly message
  };

  return (
    <div className="form-box">
      <h2 className="signin-title">{t("auth.twoFactor.title")}</h2>
      <p className="signin-subtitle">
        {useBackup
          ? t("auth.twoFactor.backupSubtitle")
          : method === "otp"
            ? t("auth.twoFactor.otpSubtitle")
            : t("auth.twoFactor.totpSubtitle")}
      </p>

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label>
            {useBackup ? t("auth.twoFactor.backupCodeLabel") : t("auth.twoFactor.codeLabel")}
          </label>
          <input
            type="text"
            inputMode={useBackup ? "text" : "numeric"}
            autoComplete="one-time-code"
            placeholder={useBackup ? "XXXXXX-XXXXXX" : "000000"}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            autoFocus
          />
        </div>

        {inlineErr && <p className="error-text">{inlineErr}</p>}

        <button className="login-btn" type="submit" disabled={submitting}>
          {submitting ? t("auth.twoFactor.verifying") : t("auth.twoFactor.verify")}
        </button>
      </form>

      <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center" }}>
        <button
          type="button"
          onClick={() => { setUseBackup((p) => !p); setCode(""); setInlineErr(""); }}
          style={{ background: "none", border: "none", color: "#2ec4b6", cursor: "pointer", fontSize: "0.85rem" }}
        >
          {useBackup ? t("auth.twoFactor.useAppCode") : t("auth.twoFactor.useBackupCode")}
        </button>
        <button
          type="button"
          onClick={onBack}
          style={{ background: "none", border: "none", color: "#999", cursor: "pointer", fontSize: "0.8rem" }}
        >
          {t("auth.twoFactor.back")}
        </button>
      </div>

      <LoginLanguageSwitcher />
    </div>
  );
}

// ── Main login page ───────────────────────────────────────────────────────────
export default function LoginPage() {
  const { t } = useTranslation();
  const toothRef = useRef();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inlineError, setInlineError] = useState("");

  const { login, error, twoFactorChallenge, clearTwoFactorChallenge } = useUserStore();

  useEffect(() => {
    if (!error) return;
    const msg = String(error || "");
    if (msg.toLowerCase().includes("invalid credentials")) {
      toast.error(t("auth.invalidCredentials"));
      setInlineError("");
    } else {
      setInlineError(msg);
    }
  }, [error]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setInlineError("");

    const result = await login(email, password);

    if (!result) return;           // false → error already set
    if (result === "2fa_required") return; // twoFactorChallenge set in store

    const storedUser = JSON.parse(localStorage.getItem("user"));
    navigateByRole(navigate, storedUser?.role);
  };

  const handleBack = () => {
    clearTwoFactorChallenge();
    setPassword("");
    setInlineError("");
  };

  return (
    <div className="login-container">
      {/* LEFT SECTION */}
      <div className="left-side">
        <div className="tooth-3d-wrapper">
          <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
            <ambientLight intensity={0.7} />
            <directionalLight position={[3, 3, 3]} intensity={1} />
            <Float speed={2} rotationIntensity={1} floatIntensity={1}>
              <group ref={toothRef}>
                <DentalChart scale={0.7} />
              </group>
            </Float>
            <Environment preset="studio" />
            <OrbitControls enableZoom={false} autoRotate />
          </Canvas>
        </div>

        <h1 className="welcome-title">{t("auth.welcomeTitle")}</h1>
        <p className="welcome-text">{t("auth.welcomeText")}</p>

        <div className="wave-wrapper">
          <Wavify
            className="wave-svg"
            fill="rgba(255, 255, 255, 0.45)"
            paused={false}
            options={{ height: 50, amplitude: 30, speed: 0.1, points: 6 }}
          />
        </div>
      </div>

      {/* RIGHT SECTION */}
      <div className="right-side">
        {twoFactorChallenge ? (
          <TwoFactorStep method={twoFactorChallenge.method} onBack={handleBack} />
        ) : (
          <div className="form-box">
            <h2 className="signin-title">{t("auth.signIn")}</h2>
            <p className="signin-subtitle">{t("auth.subtitle")}</p>

            <form onSubmit={handleLogin}>
              <div className="input-group">
                <label>{t("auth.emailLabel")}</label>
                <input
                  type="email"
                  placeholder={t("auth.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="input-group" style={{ position: "relative" }}>
                <label>{t("auth.passwordLabel")}</label>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={t("auth.passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <span
                  className="show-password-span"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>

              {inlineError && <p className="error-text">{inlineError}</p>}

              <button className="login-btn" type="submit">
                {t("auth.loginButton")}
              </button>
            </form>

            <LoginLanguageSwitcher />
          </div>
        )}
      </div>
    </div>
  );
}
