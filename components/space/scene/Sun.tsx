"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import { WORLD } from "@/lib/space/layout";
import { intro, rt } from "@/lib/space/store";
import { NOISE, damp, glowTexture, ringGeometry } from "./materials";

export const SUN_R = 1.15;

/** Boiling photosphere: granulation, slow convection bands, limb darkening. */
function surfaceMaterial() {
  return new THREE.ShaderMaterial({
    defines: { OCTAVES: 4 },
    uniforms: { uTime: { value: 0 }, uBright: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vW;
      varying vec3 vO;
      void main() {
        vO = normalize(position);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vW = wp.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uBright;
      varying vec3 vN;
      varying vec3 vW;
      varying vec3 vO;
      ${NOISE}
      void main() {
        vec3 p = vO;
        float t = uTime;
        float warp = fbm(p * 2.2 + vec3(0.0, t * 0.035, t * 0.02));
        float cells = fbm(p * 7.5 + warp * 1.8 + vec3(t * 0.05));
        float fine = snoise(p * 26.0 + t * 0.12);
        float heat = 0.5 + 0.5 * cells + fine * 0.08;

        vec3 V = normalize(cameraPosition - vW);
        float mu = clamp(dot(normalize(vN), V), 0.0, 1.0);
        float limb = pow(mu, 0.42);

        vec3 deep = vec3(0.75, 0.16, 0.02);
        vec3 orange = vec3(1.0, 0.48, 0.08);
        vec3 gold = vec3(1.0, 0.66, 0.22);
        vec3 white = vec3(1.0, 0.95, 0.82);
        vec3 col = mix(deep, orange, smoothstep(0.15, 0.5, heat));
        col = mix(col, gold, smoothstep(0.5, 0.85, heat));
        col = mix(col, white, smoothstep(0.82, 1.0, heat) * limb * 0.6);
        col *= mix(0.45, 1.0, limb);
        col += vec3(1.0, 0.45, 0.1) * pow(1.0 - mu, 3.0) * 0.6;   // hot rim
        gl_FragColor = vec4(col * 0.62 * uBright, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

/** Streaming corona and rays on a camera-facing plane around the disc. */
function coronaMaterial() {
  return new THREE.ShaderMaterial({
    defines: { OCTAVES: 3 },
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 }, uR: { value: SUN_R } },
    vertexShader: /* glsl */ `
      varying vec2 vP;
      void main() {
        vP = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uOpacity;
      uniform float uR;
      varying vec2 vP;
      ${NOISE}
      void main() {
        float r = length(vP) / uR;
        if (r < 0.98) discard;
        vec2 d = normalize(vP);
        float flow = r * 1.6 - uTime * 0.18;
        float s = fbm(vec3(d * 2.6, flow));
        float rays = pow(max(0.0, 0.5 + 0.5 * snoise(vec3(d * 7.0, uTime * 0.05))), 3.0);
        float falloff = exp(-(r - 1.0) * 3.2);
        float edge = smoothstep(0.98, 1.02, r);
        float a = edge * falloff * (0.35 + 0.9 * max(s, 0.0) + rays * 0.9 * exp(-(r - 1.0) * 1.2));
        vec3 col = mix(vec3(1.0, 0.82, 0.45), vec3(1.0, 0.38, 0.06), smoothstep(1.0, 2.2, r));
        a *= uOpacity;
        gl_FragColor = vec4(col * a * 1.1, a * 0.8);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/** Arcing prominences that rise and fall along the limb. */
function prominenceGeometry() {
  const pos: number[] = [];
  const seed: number[] = [];
  const t: number[] = [];
  const loops = 7;
  for (let i = 0; i < loops; i++) {
    const a0 = (i / loops) * Math.PI * 2 + i * 0.7;
    const span = 0.22 + (i % 3) * 0.08;
    const h = 0.25 + ((i * 37) % 10) / 30;
    const n = 40;
    for (let k = 0; k < n; k++)
      for (const j of [k, k + 1]) {
        const u = j / n;
        const a = a0 + (u - 0.5) * span;
        const lift = 1 + Math.sin(Math.PI * u) * h;
        pos.push(Math.cos(a) * SUN_R * lift, Math.sin(a) * SUN_R * lift, 0);
        seed.push(i / loops);
        t.push(u);
      }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 1));
  g.setAttribute("aT", new THREE.Float32BufferAttribute(t, 1));
  return g;
}

function prominenceMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 } },
    vertexShader: /* glsl */ `
      uniform float uTime;
      attribute float aSeed;
      attribute float aT;
      varying float vA;
      void main() {
        float life = 0.5 + 0.5 * sin(uTime * (0.25 + aSeed * 0.3) + aSeed * 40.0);
        vec3 p = position;
        float r = length(p.xy);
        float base = ${SUN_R.toFixed(1)};
        p.xy = normalize(p.xy) * (base + (r - base) * life);
        vA = life * sin(aT * 3.14159);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying float vA;
      void main() {
        float a = vA * 0.8 * uOpacity;
        gl_FragColor = vec4(vec3(1.0, 0.5, 0.15) * a * 1.5, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

const glow = (color: string, scale: number, opacity: number, dim = 1) => (
  <sprite scale={scale}>
    <spriteMaterial map={glowTexture()} color={color} transparent opacity={opacity * dim} depthWrite={false} fog={false} blending={THREE.AdditiveBlending} />
  </sprite>
);

/** One product orbit in the hero: a faint ring and a small sunlit planet in the app's colour. */
function HeroOrbit({ radius, rotation, speed, phase, color, size, reducedMotion }: { radius: number; rotation: [number, number, number]; speed: number; phase: number; color: string; size: number; reducedMotion: boolean }) {
  const spin = useRef<THREE.Group>(null);
  const ring = useMemo(() => ringGeometry(radius, 200), [radius]);
  useEffect(() => () => ring.dispose(), [ring]);
  useFrame((_, dt) => {
    if (spin.current) spin.current.rotation.y += Math.min(dt, 1 / 20) * speed * (reducedMotion ? 0.15 : 1);
  });
  return (
    <group rotation={rotation}>
      <lineLoop geometry={ring}>
        <lineBasicMaterial color="#ffd9b0" transparent opacity={0.22} depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineLoop>
      <group ref={spin} rotation={[0, phase, 0]}>
        <mesh position={[radius, 0, 0]}>
          <sphereGeometry args={[size, 24, 16]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} roughness={0.6} metalness={0.1} />
        </mesh>
        <sprite position={[radius, 0, 0]} scale={size * 9}>
          <spriteMaterial map={glowTexture()} color={color} transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      </group>
    </group>
  );
}

const HERO_ORBITS: { radius: number; rotation: [number, number, number]; speed: number; phase: number; size: number }[] = [
  { radius: 2.3, rotation: [0.32, 0, -0.18], speed: 0.42, phase: 0.6, size: 0.13 },
  { radius: 2.95, rotation: [0.2, 0.3, 0.1], speed: -0.3, phase: 2.2, size: 0.17 },
  { radius: 3.6, rotation: [0.42, -0.2, -0.3], speed: 0.22, phase: 4.1, size: 0.15 },
  { radius: 4.25, rotation: [0.12, 0.1, 0.24], speed: -0.16, phase: 1.3, size: 0.2 },
  { radius: 4.9, rotation: [0.28, 0.4, -0.08], speed: 0.11, phase: 5.2, size: 0.14 },
];

/**
 * The hero: the OrbitApps Sun with the products circling it on their own orbits.
 * Same motion as before — unfolds during the launch, follows the pointer, turns as you scroll away.
 */
export function HeroSun({ colors, reducedMotion = false, segments = 64 }: { colors: string[]; reducedMotion?: boolean; segments?: number }) {
  const root = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const look = useRef({ rx: 0, ry: 0 }).current;
  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const inside = rt.inside.home;
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
  });
  return (
    <group ref={root} position={WORLD.core}>
      <Sun reducedMotion={reducedMotion} segments={segments} />
      <group ref={tilt}>
        {HERO_ORBITS.map((o, i) => (
          <HeroOrbit key={i} {...o} color={colors[i % colors.length] ?? "#ffffff"} reducedMotion={reducedMotion} />
        ))}
      </group>
    </group>
  );
}

/** The OrbitApps Sun: photosphere, corona, prominences and glow. */
/** `dim` (0–1) turns down the surface and glow, e.g. behind text. */
export function Sun({ reducedMotion = false, segments = 64, dim = 1 }: { reducedMotion?: boolean; segments?: number; dim?: number }) {
  const body = useRef<THREE.Mesh>(null);
  const surface = useMemo(surfaceMaterial, []);
  const corona = useMemo(coronaMaterial, []);
  const promGeo = useMemo(prominenceGeometry, []);
  const promMat = useMemo(prominenceMaterial, []);
  useEffect(() => () => [surface, corona, promGeo, promMat].forEach((x) => x.dispose()), [surface, corona, promGeo, promMat]);

  useFrame((s, delta) => {
    const k = reducedMotion ? 0.15 : 1;
    const t = s.clock.elapsedTime * k;
    surface.uniforms.uTime.value = t;
    surface.uniforms.uBright.value = 0.35 + 0.65 * dim;
    corona.uniforms.uOpacity.value = dim;
    corona.uniforms.uTime.value = t;
    promMat.uniforms.uTime.value = t;
    if (body.current) body.current.rotation.y += Math.min(delta, 1 / 20) * 0.03 * k;
  });

  return (
    <group>
      <mesh ref={body} material={surface}>
        <sphereGeometry args={[SUN_R, segments, segments]} />
      </mesh>
      <Billboard>
        <mesh material={corona} renderOrder={2}>
          <planeGeometry args={[SUN_R * 6.5, SUN_R * 6.5]} />
        </mesh>
        <lineSegments geometry={promGeo} material={promMat} renderOrder={3} />
      </Billboard>
      {glow("#ffd9a0", SUN_R * 3.6, 0.45, dim)}
      {glow("#ff9a3a", SUN_R * 8, 0.28, dim)}
      {glow("#ff6a1a", SUN_R * 18, 0.1, dim * dim)}
      
      <pointLight color="#ffc58a" intensity={40} distance={40} decay={1.6} />
    </group>
  );
}
