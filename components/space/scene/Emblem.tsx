"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { WORLD } from "@/lib/space/layout";
import { rt } from "@/lib/space/store";
import { damp, easeOutCubic, glowTexture, ringGeometry, seeded } from "./materials";
import { Sun } from "./Sun";

/** The OrbitApps mark, in 3D: a dark planet, its tilted ring and the moon riding it. */
const RING_R = 3.4;
const RING_TILT: [number, number, number] = [1.2, 0, -0.42];

/** One moon per principle (About). */
const MOONS = [
  { r: 2.3, tilt: [0.5, 0.2, 0.3] as [number, number, number], speed: 0.5, phase: 0.4, size: 0.13, color: "#ffb86b" },
  { r: 4.4, tilt: [-0.35, 0.6, -0.2] as [number, number, number], speed: -0.3, phase: 2.1, size: 0.17, color: "#8fd3ff" },
  { r: 5.3, tilt: [0.25, -0.4, 0.55] as [number, number, number], speed: 0.2, phase: 4.2, size: 0.15, color: "#c7a6ff" },
];

function PrincipleMoon({ index, r, tilt, speed, phase, size, color, reducedMotion }: (typeof MOONS)[number] & { index: number; reducedMotion: boolean }) {
  const spin = useRef<THREE.Group>(null);
  const moon = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Sprite>(null);
  const lineMat = useRef<THREE.LineBasicMaterial>(null);
  const lit = useRef(0);
  const ring = useMemo(() => ringGeometry(r, 200), [r]);
  useEffect(() => () => ring.dispose(), [ring]);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20);
    lit.current = damp(lit.current, rt.pillar === index ? 1 : 0, 4, dt);
    const u = lit.current;
    if (spin.current) spin.current.rotation.y += dt * speed * (reducedMotion ? 0.15 : 1) * (1 + u * 0.6);
    moon.current?.scale.setScalar(1 + u * 0.8);
    if (glow.current) (glow.current.material as THREE.SpriteMaterial).opacity = 0.18 + u * 0.7;
    if (lineMat.current) lineMat.current.opacity = 0.1 + u * 0.5;
  });
  return (
    <group rotation={tilt}>
      <lineLoop geometry={ring}>
        <lineBasicMaterial ref={lineMat} color={color} transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineLoop>
      <group ref={spin} rotation={[0, phase, 0]}>
        <mesh ref={moon} position={[r, 0, 0]}>
          <sphereGeometry args={[size, 24, 16]} />
          <meshBasicMaterial color={new THREE.Color(color).multiplyScalar(1.4)} toneMapped={false} />
        </mesh>
        <sprite ref={glow} position={[r, 0, 0]} scale={size * 12}>
          <spriteMaterial map={glowTexture()} color={color} transparent opacity={0.2} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      </group>
    </group>
  );
}

export function Emblem({ reducedMotion = false, segments = 48 }: { reducedMotion?: boolean; segments?: number }) {
  const root = useRef<THREE.Group>(null);
  const moonOrbit = useRef<THREE.Group>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const halo = useMemo(() => {
    const r = seeded(51);
    const pos: number[] = [];
    for (let i = 0; i < 500; i++) {
      const v = new THREE.Vector3(r() * 2 - 1, (r() * 2 - 1) * 0.35, r() * 2 - 1).normalize().multiplyScalar(6 + r() * 5);
      pos.push(v.x, v.y, v.z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    return { geo: g, mat: new THREE.PointsMaterial({ color: "#cfd6e6", size: 0.04, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }) };
  }, []);
  useEffect(() => () => [halo.geo, halo.mat].forEach((x) => x.dispose()), [halo]);

  useFrame((s, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const k = reducedMotion ? 0.15 : 1;
    const a = easeOutCubic(rt.arrive.about);
    if (root.current) {
      root.current.scale.setScalar(0.55 + a * 0.45);
      root.current.rotation.y = (1 - a) * -1.1 + s.clock.elapsedTime * 0.03 * k;
    }
    if (moonOrbit.current) moonOrbit.current.rotation.y += dt * 0.35 * k;
    if (ringMat.current) ringMat.current.opacity = 0.2 + a * 0.35;
  });

  return (
    <group position={WORLD.gyro}>
      <group ref={root}>
        {/* the OrbitApps Sun at the heart of the mark */}
        <group scale={1.05}>
          <Sun reducedMotion={reducedMotion} segments={segments} />
        </group>
        {/* the logo ring and its moon */}
        <group rotation={RING_TILT}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[RING_R, 0.007, 8, 260]} />
            <meshBasicMaterial ref={ringMat} color="#ffd9a8" transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
          <group ref={moonOrbit}>
            <mesh position={[RING_R, 0, 0]}>
              <sphereGeometry args={[0.16, 24, 16]} />
              <meshBasicMaterial color={new THREE.Color(1.3, 1.25, 1.15)} toneMapped={false} />
            </mesh>
            <sprite position={[RING_R, 0, 0]} scale={1.6}>
              <spriteMaterial map={glowTexture()} color="#ffe6c2" transparent opacity={0.45} depthWrite={false} blending={THREE.AdditiveBlending} />
            </sprite>
          </group>
        </group>
        {MOONS.map((m, i) => (
          <PrincipleMoon key={i} index={i} {...m} reducedMotion={reducedMotion} />
        ))}
        <points geometry={halo.geo} material={halo.mat} />
      </group>
    </group>
  );
}
