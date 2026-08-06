"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import type { Mesh } from "three";

/**
 * Gently rotating Krugerrand-inspired gold coin for the homepage hero.
 * Rendered inside a full-bleed R3F canvas behind the hero copy.
 */
function SpinningGoldCoin() {
  const meshRef = useRef<Mesh>(null);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.rotation.y += 0.005;
    mesh.rotation.x += 0.002;
  });

  return (
    <Float speed={1.2} rotationIntensity={0.35} floatIntensity={0.55}>
      <mesh ref={meshRef} rotation={[Math.PI / 2.4, 0.35, 0.1]} castShadow>
        <cylinderGeometry args={[2.5, 2.5, 0.2, 64]} />
        <meshStandardMaterial color="#FFD700" metalness={0.8} roughness={0.2} />
      </mesh>
    </Float>
  );
}

function HeroCoinScene() {
  return (
    <>
      <color attach="background" args={["#020617"]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={2} />
      <directionalLight position={[-6, -4, 2]} intensity={0.45} color="#fbbf24" />
      <SpinningGoldCoin />
    </>
  );
}

/**
 * Absolute, full-bleed Three.js layer for the homepage hero.
 * Client-only (guards against SSR) and pointer-events-none so CTAs stay clickable.
 */
export function HeroCoinBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        aria-hidden
        className="absolute inset-0 z-0 bg-slate-950"
      />
    );
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
