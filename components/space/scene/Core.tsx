"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { WORLD } from "@/lib/space/layout";
import { intro, rt, type Vec3 } from "@/lib/space/store";
import { damp, glowTexture, rimMaterial, ringGeometry, seeded } from "./materials";

/** Renders its children only while the camera is near `center`. */
export function Proximity({ center, range = 150, children }: { center: Vec3; range?: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const c = useMemo(() => new THREE.Vector3(...center), [center]);
  useFrame(({ camera }) => {
    if (ref.current) ref.current.visible = camera.position.distanceTo(c) < range;
  });
  return <group ref={ref}>{children}</group>;
}

/* ------------------------------------------------------------------ */
/* Lattice sphere — a glossy black core wrapped in pulsing light wires */
/* ------------------------------------------------------------------ */

function latticeGeometry({ wires = 30, segments = 110, radius = 1.66 } = {}) {
  const r = seeded(42);
  const pos: number[] = [];
  const t: number[] = [];
  const seed: number[] = [];
  const twist = Math.PI * 0.85;
  const at = (lon: number, v: number): [number, number, number] => {
    const lat = (-0.5 + v) * Math.PI * 0.94;
    return [radius * Math.cos(lat) * Math.cos(lon), radius * Math.sin(lat), radius * Math.cos(lat) * Math.sin(lon)];
  };
  for (let w = 0; w < wires; w++) {
    const s = r();
    const lon0 = (w / wires) * Math.PI * 2;
    const dir = w % 2 === 0 ? 1 : -1;
    for (let k = 0; k < segments; k++)
      for (const j of [k, k + 1]) {
        const v = j / segments;
        pos.push(...at(lon0 + dir * twist * (v - 0.5), v));
        t.push(v);
        seed.push(s);
      }
  }
  [-0.55, -0.28, 0, 0.28, 0.55].forEach((lat) => {
    const rr = radius * Math.cos(lat);
    const y = radius * Math.sin(lat);
    for (let k = 0; k < 160; k++)
      for (const j of [k, k + 1]) {
        const a = (j / 160) * Math.PI * 2;
        pos.push(rr * Math.cos(a), y, rr * Math.sin(a));
        t.push(j / 160);
        seed.push(-1);
      }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aT", new THREE.Float32BufferAttribute(t, 1));
  g.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 1));
  return g;
}

function latticeMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uBase: { value: new THREE.Color("#d4d7dc") }, uPulse: { value: new THREE.Color("#ffffff") }, uOpacity: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aT;
      attribute float aSeed;
      varying float vT;
      varying float vSeed;
      varying float vFacing;
      void main() {
        vT = aT;
        vSeed = aSeed;
        vec3 n = normalize(normalMatrix * normalize(position));
        vFacing = 0.25 + 0.75 * pow(clamp(n.z, 0.0, 1.0), 0.7);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uBase;
      uniform vec3 uPulse;
      uniform float uOpacity;
      varying float vT;
      varying float vSeed;
      varying float vFacing;
      void main() {
        float trail = 0.0;
        if (vSeed >= 0.0) {
          float speed = 0.05 + fract(vSeed * 17.3) * 0.09;
          float t = fract(vSeed * 7.1) > 0.5 ? vT : 1.0 - vT;
          float head = fract(uTime * speed + vSeed * 9.7);
          float d = head - t;
          trail = d >= 0.0 ? exp(-d * 26.0) : 0.0;
          trail *= step(0.45, fract(vSeed * 13.7));
        }
        float base = vSeed >= 0.0 ? 0.5 : 0.22;
        vec3 col = uBase * base * vFacing + uPulse * trail * 2.6 * vFacing;
        float a = (base * vFacing + trail) * uOpacity;
        gl_FragColor = vec4(col, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/** Ring with a dashed track and a sweeping highlight (mode 0), or a graduated dial (mode 1). */
export function dialMaterial(mode: number, inner: number, outer: number, color = "#d5d8dd") {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uMode: { value: mode }, uInner: { value: inner }, uOuter: { value: outer }, uOpacity: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uMode;
      uniform float uInner;
      uniform float uOuter;
      uniform float uOpacity;
      varying vec3 vPos;
      void main() {
        float a01 = atan(vPos.y, vPos.x) / 6.28318 + 0.5;
        float r = (length(vPos.xy) - uInner) / (uOuter - uInner);
        float alpha;
        if (uMode < 0.5) {
          float dash = step(0.55, fract(a01 * 120.0));
          float s = fract(a01 - uTime * 0.025);
          float sweep = smoothstep(0.0, 0.015, s) * (1.0 - smoothstep(0.12, 0.22, s));
          alpha = 0.3 * dash + sweep * 0.9;
        } else {
          float minor = step(fract(a01 * 90.0), 0.14) * step(0.55, r);
          float major = step(fract(a01 * 12.0), 0.012);
          alpha = minor * 0.32 + major * 0.8;
        }
        gl_FragColor = vec4(uColor * alpha * 1.4 * uOpacity, alpha * uOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

function OrbitMarker({ radius, rotation, speed, phase = 0, reducedMotion }: { radius: number; rotation: Vec3; speed: number; phase?: number; reducedMotion: boolean }) {
  const spin = useRef<THREE.Group>(null);
  const geo = useMemo(() => ringGeometry(radius, 180), [radius]);
  useEffect(() => () => geo.dispose(), [geo]);
  useFrame((_, dt) => {
    if (spin.current) spin.current.rotation.y += dt * speed * (reducedMotion ? 0.15 : 1);
  });
  return (
    <group rotation={rotation}>
      <lineLoop geometry={geo}>
        <lineBasicMaterial color="#cdd0d5" transparent opacity={0.14} depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineLoop>
      <group ref={spin} rotation={[0, phase, 0]}>
        <mesh position={[radius, 0, 0]}>
          <octahedronGeometry args={[0.065, 0]} />
          <meshBasicMaterial color={[1.3, 1.4, 1.7]} toneMapped={false} />
        </mesh>
        <sprite position={[radius, 0, 0]} scale={0.7}>
          <spriteMaterial map={glowTexture()} color="#e4e6ea" transparent opacity={0.22} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      </group>
    </group>
  );
}

export function GlassCore({ reducedMotion = false, segments = 64, spinSpeed = 0.07 }: { reducedMotion?: boolean; segments?: number; spinSpeed?: number }) {
  const spin = useRef<THREE.Group>(null);
  const geo = useMemo(() => latticeGeometry(), []);
  const mat = useMemo(latticeMaterial, []);
  const rim = useMemo(() => rimMaterial({ color: "#c9cdd4", intensity: 0.2, edge: 0.4, power: 3.4 }), []);
  useEffect(() => () => [geo, mat, rim].forEach((x) => x.dispose()), [geo, mat, rim]);
  useFrame((s, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const k = reducedMotion ? 0.15 : 1;
    mat.uniforms.uTime.value = s.clock.elapsedTime * k;
    if (spin.current) spin.current.rotation.y += dt * spinSpeed * k;
  });
  return (
    <>
      <group ref={spin}>
        <mesh>
          <sphereGeometry args={[1.58, segments, segments]} />
          <meshPhysicalMaterial color="#05070a" metalness={0.55} roughness={0.22} clearcoat={1} clearcoatRoughness={0.15} envMapIntensity={0.55} />
        </mesh>
        <lineSegments geometry={geo} material={mat} />
      </group>
      <mesh material={rim} scale={1.72}>
        <sphereGeometry args={[1, segments, segments]} />
      </mesh>
    </>
  );
}

/** The OrbitApps core — what the hero looks at. Unfolds during the launch, turns as you scroll away. */
export function Core({ reducedMotion = false, segments = 64 }: { reducedMotion?: boolean; segments?: number }) {
  const root = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  const look = useRef({ rx: 0, ry: 0 }).current;
  const dash = useMemo(() => dialMaterial(0, 2.28, 2.33), []);
  const dial = useMemo(() => dialMaterial(1, 2.82, 2.98), []);
  useEffect(() => () => {
    dash.dispose();
    dial.dispose();
  }, [dash, dial]);

  useFrame((s, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const k = reducedMotion ? 0.15 : 1;
    const inside = rt.inside.home;
    dash.uniforms.uTime.value = s.clock.elapsedTime * k;
    if (ring1.current) ring1.current.rotation.z += dt * 0.05 * k;
    if (ring2.current) ring2.current.rotation.z -= dt * 0.025 * k;
    look.rx = damp(look.rx, -rt.pointer.y * 0.12, 2, dt);
    look.ry = damp(look.ry, rt.pointer.x * 0.18, 2, dt);
    const rev = intro.reveal;
    if (root.current) {
      root.current.visible = rev > 0.002;
      root.current.scale.setScalar(Math.max(rev, 0.001));
    }
    if (tilt.current) {
      tilt.current.rotation.x = look.rx + inside * 0.25;
      tilt.current.rotation.y = look.ry + inside * 1.2 + (1 - rev) * 1.4;
      tilt.current.scale.setScalar(1 + inside * 0.14);
    }
    dash.uniforms.uOpacity.value = 1 - inside * 0.6;
    dial.uniforms.uOpacity.value = 1 - inside * 0.6;
  });

  return (
    <group ref={root} position={WORLD.core}>
      <group ref={tilt}>
        <group rotation={[0.2, 0, -0.14]}>
          <GlassCore reducedMotion={reducedMotion} segments={segments} />
          <mesh ref={ring1} material={dash} rotation={[Math.PI / 2 - 0.62, 0, 0]}>
            <ringGeometry args={[2.28, 2.33, 256, 1]} />
          </mesh>
          <mesh ref={ring2} material={dial} rotation={[Math.PI / 2 - 0.62, 0, 0]}>
            <ringGeometry args={[2.82, 2.98, 256, 1]} />
          </mesh>
        </group>
        <OrbitMarker radius={3.7} rotation={[1.12, 0.2, 0.42]} speed={0.22} reducedMotion={reducedMotion} />
        <OrbitMarker radius={4.5} rotation={[-0.92, 0.1, -0.58]} speed={-0.13} phase={2.4} reducedMotion={reducedMotion} />
      </group>
      <sprite scale={11} renderOrder={-1}>
        <spriteMaterial map={glowTexture()} color="#3a3d43" transparent opacity={0.14} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  );
}
