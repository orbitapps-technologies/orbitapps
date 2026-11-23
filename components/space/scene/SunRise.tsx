"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { rt } from "@/lib/space/store";
import { easeOutCubic, glowTexture, ringGeometry } from "./materials";
import { Sun, SUN_R } from "./Sun";

/** Where the giant Sun sits behind Contact: its top peeks up from the bottom of the screen. */
const CENTER = new THREE.Vector3(0, -138, -372);
const RADIUS = 80;
const HIDDEN_DROP = 90;

/** Orbits arcing over the Sun, each with a small moon riding it. */
const ORBITS = [
  { r: 104, tilt: [0.86, 0.25, 0] as [number, number, number], speed: 0.05, phase: 2.0, size: 1.4, color: "#ffcf9a" },
  { r: 124, tilt: [0.96, -0.35, 0] as [number, number, number], speed: -0.035, phase: 2.6, size: 1.9, color: "#9fc2ff" },
  { r: 148, tilt: [1.05, 0.1, 0] as [number, number, number], speed: 0.025, phase: 1.5, size: 1.6, color: "#d1b2ff" },
];

function Orbit({ r, tilt, speed, phase, size, color, reducedMotion }: (typeof ORBITS)[number] & { reducedMotion: boolean }) {
  const spin = useRef<THREE.Group>(null);
  const ring = useMemo(() => ringGeometry(r, 360), [r]);
  useEffect(() => () => ring.dispose(), [ring]);
  useFrame((_, dt) => {
    if (spin.current) spin.current.rotation.y += Math.min(dt, 1 / 20) * speed * (reducedMotion ? 0.15 : 1);
  });
  return (
    <group rotation={tilt}>
      <lineLoop geometry={ring}>
        <lineBasicMaterial color="#ffd9b0" transparent opacity={0.22} depthWrite={false} fog={false} blending={THREE.AdditiveBlending} />
      </lineLoop>
      <group ref={spin} rotation={[0, phase, 0]}>
        <mesh position={[r, 0, 0]}>
          <sphereGeometry args={[size, 24, 16]} />
          <meshBasicMaterial color={new THREE.Color(color).multiplyScalar(1.3)} toneMapped={false} fog={false} />
        </mesh>
        <sprite position={[r, 0, 0]} scale={size * 10}>
          <spriteMaterial map={glowTexture()} color={color} transparent opacity={0.4} depthWrite={false} fog={false} blending={THREE.AdditiveBlending} />
        </sprite>
      </group>
    </group>
  );
}

/** Contact / footer: the OrbitApps Sun rises from below, orbits arcing over it. */
export function SunRise({ reducedMotion = false, segments = 64 }: { reducedMotion?: boolean; segments?: number }) {
  const root = useRef<THREE.Group>(null);
  useFrame(() => {
    const a = easeOutCubic(rt.arrive.contact);
    const rise = easeOutCubic(Math.min(1, rt.arrive.contact * 0.7 + rt.inside.contact * 0.6));
    if (root.current) {
      root.current.visible = a > 0.002;
      root.current.position.set(CENTER.x, CENTER.y - (1 - rise) * HIDDEN_DROP, CENTER.z);
    }
  });
  return (
    <group ref={root} position={CENTER} visible={false}>
      <group scale={RADIUS / SUN_R}>
        <Sun reducedMotion={reducedMotion} segments={segments} dim={0.45} />
      </group>
      {ORBITS.map((o, i) => (
        <Orbit key={i} {...o} reducedMotion={reducedMotion} />
      ))}
    </group>
  );
}
