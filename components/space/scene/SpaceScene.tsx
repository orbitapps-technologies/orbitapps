"use client";

import { Suspense, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor, Preload } from "@react-three/drei";
import * as THREE from "three";
import { APPS, MODULES } from "@/lib/space/data";
import { advanceIntro } from "@/lib/space/engine";
import { WORLD } from "@/lib/space/layout";
import { ui } from "@/lib/space/store";
import { AppWorlds } from "./AppWorlds";
import { CameraRig } from "./CameraRig";
import { Proximity } from "./Core";
import { HeroSun } from "./Sun";
import { Gyro, Horizon, Station } from "./Landmarks";
import { Ship } from "./Ship";
import { Nebula, Stars } from "./Sky";

const HERO_COLORS = APPS.map((a) => a.accent);

type Tier = "high" | "medium" | "low";

function detectTier(): Tier {
  const w = window.innerWidth;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const cores = navigator.hardwareConcurrency || 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 8;
  if (w < 768 || (coarse && w < 1024)) return "low";
  if (w < 1200 || coarse || cores <= 4 || mem <= 4) return "medium";
  return "high";
}

const TIERS = {
  high: { dpr: 1.75, stars: 6500, farStars: 2600, sphereSegments: 64, nebulaOctaves: 5, planetNodes: 1400, pointerParallax: true },
  medium: { dpr: 1.5, stars: 4000, farStars: 1800, sphereSegments: 48, nebulaOctaves: 4, planetNodes: 900, pointerParallax: true },
  low: { dpr: 1.35, stars: 2200, farStars: 1100, sphereSegments: 32, nebulaOctaves: 3, planetNodes: 500, pointerParallax: false },
} as const;

const reducedQuery = (cb: () => void) => {
  const m = window.matchMedia("(prefers-reduced-motion: reduce)");
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

/** Advances the launch timeline with the render loop, and reports "ready" after the first frames. */
function Pulse() {
  const frames = useRef(0);
  useFrame((_, dt) => {
    advanceIntro(dt);
    frames.current += 1;
    if (frames.current === 4) ui.set({ ready: true });
  });
  return null;
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.15} color="#b9bcc2" />
      <directionalLight position={[8, 10, 6]} intensity={1.8} color="#f1f2f4" />
      <directionalLight position={[-10, -4, -12]} intensity={0.8} color="#8c9097" />
    </>
  );
}

function Studio() {
  return (
    <Environment resolution={64} frames={1}>
      <Lightformer form="rect" intensity={2.2} position={[0, 6, -6]} scale={[12, 2, 1]} />
      <Lightformer form="rect" intensity={1.2} color="#ffffff" position={[-6, 1, 3]} scale={[3, 8, 1]} />
      <Lightformer form="ring" intensity={1.6} position={[6, 3, 5]} scale={2.5} />
    </Environment>
  );
}

export default function SpaceScene() {
  const reduced = useSyncExternalStore(
    reducedQuery,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  const tier = useMemo(detectTier, []);
  const cfg = TIERS[tier];
  const [degrade, setDegrade] = useState(0);
  const dpr = degrade >= 1 ? Math.min(cfg.dpr, 1.25) : cfg.dpr;
  const eventSource = useMemo(() => document.getElementById("space-root") ?? undefined, []);

  return (
    <Canvas
      dpr={[1, degrade >= 3 ? 1 : dpr]}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: false, stencil: false, toneMapping: THREE.ACESFilmicToneMapping }}
      camera={{ fov: 40, near: 0.1, far: 2200, position: [0, 3.8, 25.6] }}
      eventSource={eventSource}
      eventPrefix="client"
      onCreated={({ gl }) => gl.setClearColor("#000000", 1)}
    >
      <PerformanceMonitor flipflops={3} onDecline={() => setDegrade((d) => Math.min(d + 1, 3))} onFallback={() => setDegrade(3)} />
      <fogExp2 attach="fog" args={["#000000", 0.02]} />
      <Lights />
      <Suspense fallback={null}>
        <Studio />
      </Suspense>
      <CameraRig parallax={cfg.pointerParallax && !reduced} reducedMotion={reduced} />
      <Nebula octaves={cfg.nebulaOctaves} />
      <Stars count={cfg.stars} farCount={cfg.farStars} reducedMotion={reduced} />
      <Proximity center={WORLD.core} range={120}>
        <HeroSun colors={HERO_COLORS} reducedMotion={reduced} segments={cfg.sphereSegments} />
      </Proximity>
      <Proximity center={WORLD.apps.center} range={170}>
        <AppWorlds apps={APPS} lite={tier === "low"} segments={cfg.sphereSegments} reducedMotion={reduced} />
      </Proximity>
      <Proximity center={WORLD.station} range={110}>
        <Station count={MODULES.length} reducedMotion={reduced} />
      </Proximity>
      <Proximity center={WORLD.gyro} range={110}>
        <Gyro reducedMotion={reduced} segments={cfg.sphereSegments} />
      </Proximity>
      <Proximity center={[0, -36, -320]} range={200}>
        <Horizon nodes={cfg.planetNodes} segments={cfg.sphereSegments * 2} />
      </Proximity>
      <Ship lite={tier === "low"} />
      <Preload all />
      <Pulse />
    </Canvas>
  );
}
