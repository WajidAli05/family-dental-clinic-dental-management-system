// src/components/ToothProcedural.jsx
import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function ToothProcedural({ scale = 1.2 }) {
  const meshRef = useRef();

  const geometry = useMemo(() => {
    const crownPts = [];
    const neckPts = [];
    const rootPts = [];

    // Crown (top bulb)
    for (let i = 0; i < 12; i++) {
      const y = 0.6 - i * 0.05;
      const r =
        0.45 -
        Math.pow(i * 0.04, 2) + // curvature gives cusp shape
        Math.sin(i * 0.5) * 0.03;
      crownPts.push(new THREE.Vector2(r * scale, y * scale));
    }

    // Neck / Cervix narrowing
    for (let i = 0; i < 8; i++) {
      const y = 0.0 - i * 0.06;
      const r = 0.32 - i * 0.015; // tight constriction
      neckPts.push(new THREE.Vector2(r * scale, y * scale));
    }

    // Dual roots tapering
    for (let i = 0; i < 16; i++) {
      const y = -0.5 - i * 0.08;
      const r = 0.20 - i * 0.01 + Math.sin(i * 0.3) * 0.005;
      rootPts.push(new THREE.Vector2(Math.max(r, 0.01) * scale, y * scale));
    }

    const fullProfile = [...crownPts, ...neckPts, ...rootPts];
    const lathe = new THREE.LatheGeometry(fullProfile, 128);

    lathe.computeVertexNormals();
    return lathe;
  }, [scale]);

  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        roughness: 0.1,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        transmission: 0.15,
        thickness: 1.2,
        reflectivity: 0.85,
      }),
    []
  );

  // Gentle idle animation
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    meshRef.current.rotation.y = t * 0.25;
    meshRef.current.position.y = Math.sin(t * 0.8) * 0.05;
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      castShadow
      receiveShadow
    />
  );
}