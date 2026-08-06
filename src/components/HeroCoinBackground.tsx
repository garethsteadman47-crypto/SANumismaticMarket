"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Text3D } from "@react-three/drei";
import type { Group } from "three";

const GOLD_MATERIAL = {
  color: "#FFD700",
  metalness: 0.9,
  roughness: 0.1,
} as const;

const TYPEFACE = "/fonts/helvetiker_bold.typeface.json";

/**
 * Shared gold look for the blank and embossed mint surfaces —
 * so "MINTMARK" / "SA. 2026" read as raised metal from the same blank.
 */
function GoldMaterial() {
  return <meshStandardMaterial color={GOLD_MATERIAL.color} metalness={GOLD_MATERIAL.metalness} roughness={GOLD_MATERIAL.roughness} />;
}

/**
 * Gently rotating Krugerrand-inspired gold coin for the homepage hero.
 * Cylinder blank + Text3D embossing on both faces.
 */
function SpinningGoldCoin() {
  const groupRef = useRef<Group>(null);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    group.rotation.y += 0.005;
    group.rotation.x += 0.002;
  });

  return (
    <Float speed={1.2} rotationIntensity={0.35} floatIntensity={0.55}>
      <group ref={groupRef} rotation={[0.25, 0.35, 0.08]}>
        {/* Cylinder height along Z so flat faces sit at ±0.1 for embossing. */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[2.5, 2.5, 0.2, 64]} />
          <GoldMaterial />
        </mesh>

        {/* Obverse — MintMark brand raised on the front face. */}
        <Text3D
          font={TYPEFACE}
          position={[-1.8, -0.2, 0.11]}
          scale={0.5}
          size={1}
          height={0.05}
          curveSegments={12}
          bevelEnabled
          bevelThickness={0.02}
          bevelSize={0.015}
          bevelOffset={0}
          bevelSegments={4}
        >
          MINTMARK
          <GoldMaterial />
        </Text3D>

        {/* Reverse — year mark, mirrored so it reads correctly when the coin spins. */}
        <Text3D
          font={TYPEFACE}
          position={[1.8, -0.2, -0.11]}
          rotation={[0, Math.PI, 0]}
          scale={0.5}
          size={1}
          height={0.05}
          curveSegments={12}
          bevelEnabled
          bevelThickness={0.02}
          bevelSize={0.015}
          bevelOffset={0}
          bevelSegments={4}
        >
          SA. 2026
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
 * Client-only (guards against SSR) and pointer-events-none so CTAs stay clickable.
 *
 * Font: place `helvetiker_bold.typeface.json` at `/public/fonts/`
 * (Three.js typeface format — see three.js `examples/fonts/`).
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
