import React, { useRef, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Float } from "@react-three/drei";
import Wavify from "react-wavify";
import { FaEye, FaEyeSlash } from "react-icons/fa";

import DentalChart from "../components/DentalCavityModel";

// Zustand store
import { useUserStore } from "../store/userStore";

export default function LoginPage() {
  const toothRef = useRef();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Zustand actions + state
  const { login, error } = useUserStore();

  // const handleLogin = (e) => {
  //   e.preventDefault();

  //   // Attempt login through zustand store
  //   login(email, password);

  //   const storedUser = JSON.parse(localStorage.getItem("user"));

  //   // If login fails → error is already handled by store
  //   if (!storedUser) return;

  //   // Redirect based on role
  //   switch (storedUser.role) {
  //     case "owner":
  //       navigate("/owner-dashboard");
  //       break;
  //     case "dentist":
  //       navigate("/dentist-dashboard");
  //       break;
  //     case "receptionist":
  //       navigate("/receptionist-dashboard");
  //       break;
  //     case "lab":
  //       navigate("/lab-dashboard");
  //       break;
  //     default:
  //       navigate("/login");
  //   }
  // };

const handleLogin = async (e) => {
  e.preventDefault();

  const ok = await login(email, password);
  if (!ok) return;

  const storedUser = JSON.parse(localStorage.getItem("user"));

  switch (storedUser.role) {
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

        <h1 className="welcome-title">Welcome to FDC</h1>
        <p className="welcome-text">
          The future of dental practice management. Streamlined, efficient, and secure.
        </p>

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
          <h2 className="signin-title">Sign In</h2>
          <p className="signin-subtitle">Enter your credentials to access your account.</p>

          <form onSubmit={handleLogin}>

            {/* EMAIL */}
            <div className="input-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* PASSWORD */}
            <div className="input-group" style={{ position: "relative" }}>
              <label>Password</label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
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

            {/* ERROR */}
            {error && <p className="error-text">{error}</p>}

            {/* SUBMIT */}
            <button className="login-btn" type="submit">Sign In</button>

          </form>
        </div>
      </div>
    </div>
  );
}