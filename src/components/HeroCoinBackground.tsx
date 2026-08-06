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

/** Brighter, glintier gold for protruding embossed lettering. */
const LETTERING = {
  color: "#FFE55C",
  metalness: 0.95,
  roughness: 0.08,
} as const;

const TYPEFACE = "/fonts/helvetiker_bold.typeface.json";

function GoldMaterial() {
  return (
    <meshStandardMaterial color={GOLD.color} metalness={GOLD.metalness} roughness={GOLD.roughness} />
  );
}

function LetteringMaterial() {
  return (
    <meshStandardMaterial
      color={LETTERING.color}
      metalness={LETTERING.metalness}
      roughness={LETTERING.roughness}
    />
  );
}

/**
 * Dual-rim proof border: raised outer lip + subtle inner ring on one face.
 */
function DualRim({ z }: { z: number }) {
  return (
    <group>
      <mesh position={[0, 0, z]} castShadow>
        <torusGeometry args={[2.5, 0.08, 16, 100]} />
        <GoldMaterial />
      </mesh>
      <mesh position={[0, 0, z]} castShadow>
        <torusGeometry args={[2.38, 0.03, 16, 100]} />
        <GoldMaterial />
      </mesh>
    </group>
  );
}

/**
 * Premium MintMark coin: logo-mapped obverse, dual-rim bezels, embossed lettering.
 * CylinderGeometry material slots: 0 = side, 1 = top (+Y → front after rotX), 2 = bottom.
 * Spin is locked to the Y axis (turntable) — no X/Z tumble.
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
    group.rotation.y += 0.008;
  });

  return (
    <Float speed={1.1} rotationIntensity={0} floatIntensity={0.35}>
      <group ref={groupRef} rotation={[0, 0, 0]}>
        {/* Coin blank — logo on the front face only. */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[2.5, 2.5, 0.2, 64]} />
          <meshStandardMaterial
            attach="material-0"
            color={GOLD.color}
            metalness={GOLD.metalness}
            roughness={GOLD.roughness}
          />
          <meshStandardMaterial
            attach="material-1"
            map={logo}
            color={GOLD.color}
            metalness={GOLD.metalness}
            roughness={GOLD.roughness}
            transparent
          />
          <meshStandardMaterial
            attach="material-2"
            color={GOLD.color}
            metalness={GOLD.metalness}
            roughness={GOLD.roughness}
          />
        </mesh>

        {/* Authentic double-struck proof border on both faces */}
        <DualRim z={0.1} />
        <DualRim z={-0.1} />

        {/* Obverse lettering — protruding above the face */}
        <Text3D
          font={TYPEFACE}
          position={[-1.45, 0.85, 0.12]}
          rotation={[0, 0, 0]}
          scale={0.32}
          size={1}
          height={0.1}
          curveSegments={12}
          bevelEnabled
          bevelThickness={0.025}
          bevelSize={0.018}
          bevelOffset={0}
          bevelSegments={4}
        >
          MINTMARK
          <LetteringMaterial />
        </Text3D>

        {/* Reverse — FOUNDED 2026, Y-rotated so it reads correctly while spinning */}
        <Text3D
          font={TYPEFACE}
          position={[-1.55, -0.15, -0.12]}
          rotation={[0, Math.PI, 0]}
          scale={0.38}
          size={1}
          height={0.1}
          curveSegments={12}
          bevelEnabled
          bevelThickness={0.025}
          bevelSize={0.018}
          bevelOffset={0}
          bevelSegments={4}
        >
          FOUNDED 2026
          <LetteringMaterial />
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
      <directionalLight position={[10, 10, 5]} intensity={2.2} />
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
 * - `/public/fonts/helvetiker_bold.typeface.json` — typeface for embossed Text3D
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
