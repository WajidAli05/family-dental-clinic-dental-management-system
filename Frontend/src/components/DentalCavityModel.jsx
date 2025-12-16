// src/components/DentalChart.jsx
import React, { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function DentalChart({ scale = 1 }) {
  const groupRef = useRef();
  const [selectedTooth, setSelectedTooth] = useState(null);

  // ➤ Smooth dental arch positions, simplified minimal form
  const archCurve = (i, offset, factor = 1) =>
    ({
      x: Math.sin(((i - 7.5) / 7.5) * 1) * 2 * factor * scale,
      z: Math.cos(((i - 7.5) / 7.5) * 1) * 1.6 * factor * scale + offset,
      angle: ((i - 7.5) / 7.5) * 1.1,
    });

  const upper = Array.from({ length: 16 }, (_, i) => archCurve(i, 0.6));
  const lower = Array.from({ length: 16 }, (_, i) => archCurve(i, -0.6, 1));

  // ➤ Smooth rounded tooth geometry (minimalist)
  const toothGeom = useMemo(
    () => new THREE.CapsuleGeometry(0.22 * scale, 0.5 * scale, 12, 24),
    [scale]
  );

  // ➤ Organic gum strip (minimalistic arc)
  const gumGeom = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, 2.35 * scale, 0, Math.PI, true);
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.45 * scale,
      bevelEnabled: true,
      bevelSize: 0.08 * scale,
      bevelThickness: 0.15 * scale,
      bevelSegments: 4,
    });
  }, [scale]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = Math.sin(t * 0.3) * 0.15;
  });

  const enamelMaterial = (id) =>
    new THREE.MeshPhysicalMaterial({
      color: selectedTooth === id ? "#ff4c4c" : "#f9f9f9",
      roughness: 0.18,
      clearcoat: 1,
      clearcoatRoughness: 0.15,
      transmission: 0.2,
      thickness: 0.9,
    });

  const gumMaterial = new THREE.MeshPhysicalMaterial({
    color: "#d88d8d", // realistic but minimal
    roughness: 0.55,
    transmission: 0.35,
    thickness: 1.2,
    clearcoat: 0.4,
  });

  return (
    <group ref={groupRef} position={[0, -0.3, 0]}>
      {/* GUMS - MINIMAL ARCH */}
      <mesh geometry={gumGeom} position={[0, 0.45 * scale, 0]} rotation={[Math.PI, 0, 0]}>
        <meshPhysicalMaterial {...gumMaterial} />
      </mesh>

      <mesh geometry={gumGeom} position={[0, -0.45 * scale, 0]}>
        <meshPhysicalMaterial {...gumMaterial} />
      </mesh>

      {/* TEETH UPPER */}
      {upper.map((t, i) => (
        <mesh
          key={"U" + i}
          geometry={toothGeom}
          position={[t.x, 0.8 * scale, t.z]}
          rotation={[0, t.angle, 0]}
          onClick={() => setSelectedTooth("U" + i)}
          material={enamelMaterial("U" + i)}
        />
      ))}

      {/* TEETH LOWER */}
      {lower.map((t, i) => (
        <mesh
          key={"L" + i}
          geometry={toothGeom}
          position={[t.x, -0.8 * scale, t.z]}
          rotation={[Math.PI, t.angle, 0]}
          onClick={() => setSelectedTooth("L" + i)}
          material={enamelMaterial("L" + i)}
        />
      ))}
    </group>
  );
}