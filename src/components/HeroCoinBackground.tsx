"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Text3D, useTexture } from "@react-three/drei";
import type { Group } from "three";

const GOLD = {
  color: "#FFD700",
  metalness: 0.8,
  roughness: 0.2,
} as const;

const TYPEFACE = "/fonts/helvetiker_bold.typeface.json";

/**
 * Shared polished-gold look for the blank, bezel rims, and embossed reverse text.
 */
function GoldMaterial() {
  return (
    <meshStandardMaterial color={GOLD.color} metalness={GOLD.metalness} roughness={GOLD.roughness} />
  );
}

/**
 * Premium MintMark coin: logo-mapped obverse, raised torus bezels, embossed reverse.
 * CylinderGeometry material slots: 0 = side, 1 = top (+Y → front after rotX), 2 = bottom.
 */
function SpinningGoldCoin() {
  const groupRef = useRef<Group>(null);
  const logo = useTexture("/mintmark-logo.png");

  useEffect(() => {
    logo.colorSpace = THREE.SRGBColorSpace;
    logo.anisotropy = 8;
    logo.wrapS = THREE.ClampToEdgeWrapping;
    logo.wrapT = THREE.ClampToEdgeWrapping;
    logo.needsUpdate = true;
  }, [logo]);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    group.rotation.y += 0.005;
    group.rotation.x += 0.002;
  });

  return (
    <Float speed={1.2} rotationIntensity={0.35} floatIntensity={0.55}>
      <group ref={groupRef} rotation={[0.25, 0.35, 0.08]}>
        {/* Coin blank — logo on the front face only. */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[2.5, 2.5, 0.2, 64]} />
          {/* Side / edge */}
          <meshStandardMaterial
            attach="material-0"
            color={GOLD.color}
            metalness={GOLD.metalness}
            roughness={GOLD.roughness}
          />
          {/* Obverse (top → +Z after rotX) — MintMark logo texture */}
          <meshStandardMaterial
            attach="material-1"
            map={logo}
            color={GOLD.color}
            metalness={GOLD.metalness}
            roughness={GOLD.roughness}
            transparent
          />
          {/* Reverse face — polished gold */}
          <meshStandardMaterial
            attach="material-2"
            color={GOLD.color}
            metalness={GOLD.metalness}
            roughness={GOLD.roughness}
          />
        </mesh>

        {/* Raised metallic bezels on both faces */}
        <mesh position={[0, 0, 0.1]} castShadow>
          <torusGeometry args={[2.5, 0.12, 32, 100]} />
          <GoldMaterial />
        </mesh>
        <mesh position={[0, 0, -0.1]} castShadow>
          <torusGeometry args={[2.5, 0.12, 32, 100]} />
          <GoldMaterial />
        </mesh>

        {/* Reverse — FOUNDED 2026, Y-rotated so it reads correctly while spinning */}
        <Text3D
          font={TYPEFACE}
          position={[-1.6, -0.15, -0.11]}
          rotation={[0, Math.PI, 0]}
          scale={0.4}
          size={1}
          height={0.05}
          curveSegments={12}
          bevelEnabled
          bevelThickness={0.02}
          bevelSize={0.015}
          bevelOffset={0}
          bevelSegments={4}
        >
          FOUNDED 2026
          <GoldMaterial />
        </Text3D>
      </group>
    </Float>
  );
}

function HeroCoinScene() {
  return (
    <>
      <color attach="background" args={["#020617"]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={2} />
      <directionalLight position={[-6, -4, 2]} intensity={0.55} color="#fbbf24" />
      <Suspense fallback={null}>
        <Environment preset="city" />
        <SpinningGoldCoin />
      </Suspense>
    </>
  );
}

/**
 * Absolute, full-bleed Three.js layer for the homepage hero.
 *
 * Assets:
 * - `/public/mintmark-logo.png` — high-res transparent MintMark mark for the obverse
 * - `/public/fonts/helvetiker_bold.typeface.json` — typeface for reverse Text3D
 */
export function HeroCoinBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div aria-hidden className="absolute inset-0 z-0 bg-slate-950" />;
  }

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
      <Canvas
        className="h-full w-full"
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 8], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
      >
        <HeroCoinScene />
      </Canvas>
    </div>
  );
}
