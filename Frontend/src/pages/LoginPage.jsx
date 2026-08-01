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

// Zustand store
import { useUserStore } from "../store/userStore";

export default function LoginPage() {
  const { t } = useTranslation();
  const toothRef = useRef();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [inlineError, setInlineError] = useState("");

  // Zustand actions + state
  const { login, error } = useUserStore();

  useEffect(() => {
    if (!error) return;

    const msg = String(error || "");

    if (msg.toLowerCase().includes("invalid credentials")) {
      toast.error("Invalid credentials");
      setInlineError("");
    } else {
      setInlineError(msg);
    }
  }, [error]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setInlineError("");

    const ok = await login(email, password);

    if (!ok) return;

    const storedUser = JSON.parse(localStorage.getItem("user"));

    switch (storedUser?.role) {
      case "owner":
        navigate("/owner-dashboard");
        break;
      case "dentist":
        navigate("/dentist-dashboard");
        break;
      case "receptionist":
        navigate("/receptionist-dashboard");
        break;
      case "lab":
        navigate("/lab-dashboard");
        break;
      default:
        navigate("/login");
    }
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
        <div className="form-box">
          <h2 className="signin-title">{t("auth.signIn")}</h2>
          <p className="signin-subtitle">{t("auth.subtitle")}</p>

          <form onSubmit={handleLogin}>
            {/* EMAIL */}
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

            {/* PASSWORD */}
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
      </div>
    </div>
  );
}
