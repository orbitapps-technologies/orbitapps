"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LAB, labSatellites, WORLD, type LabSatellite } from "@/lib/space/layout";
import { rt, ui } from "@/lib/space/store";
import { NOISE, damp, easeOutCubic, glowTexture, seeded } from "./materials";

const SUN_DIR = new THREE.Vector3(-0.55, 0.45, 0.7).normalize();

/** Banded gas giant, lit from the front-left, with a soft blue atmosphere. */
function planetMaterial() {
  return new THREE.ShaderMaterial({
    defines: { OCTAVES: 4 },
    uniforms: { uTime: { value: 0 }, uSun: { value: SUN_DIR }, uGlow: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vO;
      varying vec3 vW;
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
      uniform vec3 uSun;
      uniform float uGlow;
      varying vec3 vN;
      varying vec3 vO;
      varying vec3 vW;
      ${NOISE}
      void main() {
        vec3 N = normalize(vN);
        vec3 V = normalize(cameraPosition - vW);
        float lat = vO.y;
        float turb = fbm(vec3(vO.x * 2.0 + uTime * 0.01, lat * 7.0, vO.z * 2.0));
        float bands = 0.5 + 0.5 * sin(lat * 22.0 + turb * 3.5);
        vec3 a = vec3(0.10, 0.13, 0.20);
        vec3 b = vec3(0.36, 0.42, 0.55);
        vec3 c = vec3(0.78, 0.80, 0.86);
        vec3 col = mix(a, b, bands);
        col = mix(col, c, smoothstep(0.65, 0.95, bands) * 0.5);
        float lit = smoothstep(-0.2, 0.8, dot(N, uSun));
        col *= 0.05 + lit * 0.8;
        float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        col += vec3(0.45, 0.62, 1.0) * fres * (0.25 + 0.5 * lit + uGlow * 0.4);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

/** Flat ring with fine radial bands and a Cassini-style gap. */
function ringMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uIn: { value: LAB.ringIn }, uOut: { value: LAB.ringOut }, uOpacity: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vP;
      void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uIn;
      uniform float uOut;
      uniform float uOpacity;
      varying vec2 vP;
      float h(float x) { return fract(sin(x * 127.1) * 43758.5453); }
      void main() {
        float r = (length(vP) - uIn) / (uOut - uIn);
        float fine = 0.55 + 0.45 * h(floor(r * 120.0));
        float gap = smoothstep(0.55, 0.57, r) * (1.0 - smoothstep(0.6, 0.62, r));
        float edge = smoothstep(0.0, 0.06, r) * (1.0 - smoothstep(0.9, 1.0, r));
        float a = edge * fine * (1.0 - gap * 0.9) * 0.55 * uOpacity;
        vec3 col = mix(vec3(0.62, 0.66, 0.74), vec3(0.95, 0.9, 0.82), r);
        gl_FragColor = vec4(col * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

/** A beam from the active satellite down to the planet, with pulses travelling along it. */
function beamMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float aT;
      varying float vT;
      void main() { vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uOpacity;
      varying float vT;
      void main() {
        float pulse = pow(fract(vT * 3.0 - uTime * 0.9), 6.0);
        float a = (0.25 + pulse * 1.4) * uOpacity;
        gl_FragColor = vec4(vec3(0.75, 0.88, 1.0) * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

function orbitLine(sat: LabSatellite) {
  const pts: number[] = [];
  const k = new THREE.Vector3(Math.cos(sat.node), 0, Math.sin(sat.node));
  const v = new THREE.Vector3();
  for (let i = 0; i <= 200; i++) {
    const a = (i / 200) * Math.PI * 2;
    v.set(Math.cos(a) * sat.radius, 0, Math.sin(a) * sat.radius).applyAxisAngle(k, sat.incl);
    pts.push(v.x, v.y, v.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

function Satellite({ sat, index, reducedMotion }: { sat: LabSatellite; index: number; reducedMotion: boolean }) {
  const body = useRef<THREE.Group>(null);
  const beacon = useRef<THREE.Sprite>(null);
  const halo = useRef<THREE.Sprite>(null);
  const orbitMat = useRef<THREE.LineBasicMaterial>(null);
  const lit = useRef(0);
  const c = WORLD.station;
  const local = useMemo<[number, number, number]>(() => [sat.position[0] - c[0], sat.position[1] - c[1], sat.position[2] - c[2]], [sat, c]);
  const orbit = useMemo(() => orbitLine(sat), [sat]);
  const beamGeo = useMemo(() => {
    const p = new THREE.Vector3(...local);
    const surface = p.clone().setLength(LAB.planetR * 1.02);
    const g = new THREE.BufferGeometry();
    const pos: number[] = [];
    const t: number[] = [];
    for (let i = 0; i <= 40; i++) {
      const u = i / 40;
      const q = p.clone().lerp(surface, u);
      pos.push(q.x, q.y, q.z);
      t.push(u);
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("aT", new THREE.Float32BufferAttribute(t, 1));
    return g;
  }, [local]);
  const beam = useMemo(beamMaterial, []);
  const line = useMemo(() => new THREE.Line(beamGeo, beam), [beamGeo, beam]);
  const hull = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c9ced8", metalness: 0.85, roughness: 0.3 }), []);
  const panel = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1b2a4a", metalness: 0.6, roughness: 0.25, emissive: "#0c1a36", emissiveIntensity: 0.6 }), []);
  useEffect(() => () => [orbit, beamGeo, beam, hull, panel].forEach((x) => x.dispose()), [orbit, beamGeo, beam, hull, panel]);

  useFrame((s, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const t = s.clock.elapsedTime * (reducedMotion ? 0.15 : 1);
    const active = ui.get().service;
    lit.current = damp(lit.current, active === index ? 1 : 0, 3, dt);
    const u = lit.current;
    if (body.current) {
      body.current.rotation.y = t * 0.35 + index;
      body.current.rotation.z = Math.sin(t * 0.6 + index) * 0.12;
      body.current.scale.setScalar(1 + u * 0.35);
    }
    if (beacon.current) (beacon.current.material as THREE.SpriteMaterial).opacity = 0.25 + u * 0.75 * (0.75 + 0.25 * Math.sin(t * 4));
    if (halo.current) (halo.current.material as THREE.SpriteMaterial).opacity = u * 0.22;
    if (orbitMat.current) orbitMat.current.opacity = 0.12 + u * 0.45;
    beam.uniforms.uTime.value = t;
    beam.uniforms.uOpacity.value = u;
  });

  return (
    <group>
      <lineLoop geometry={orbit}>
        <lineBasicMaterial ref={orbitMat} color="#bcd0ff" transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineLoop>
      <primitive object={line} frustumCulled={false} />
      <group position={local}>
        <group ref={body}>
          <mesh material={hull}>
            <boxGeometry args={[0.5, 0.5, 0.7]} />
          </mesh>
          {[-1, 1].map((side) => (
            <group key={side} position={[side * 0.95, 0, 0]}>
              <mesh material={panel}>
                <boxGeometry args={[1.2, 0.03, 0.55]} />
              </mesh>
              <mesh material={hull} position={[-side * 0.62, 0, 0]}>
                <boxGeometry args={[0.1, 0.04, 0.04]} />
              </mesh>
            </group>
          ))}
          <mesh material={hull} position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.5, 6]} />
          </mesh>
          <mesh material={hull} position={[0, 0, 0.45]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.22, 0.2, 24, 1, true]} />
          </mesh>
        </group>
        <sprite ref={beacon} position={[0, 0.72, 0]} scale={0.8}>
          <spriteMaterial map={glowTexture()} color="#cfe0ff" transparent opacity={0.3} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
        <sprite ref={halo} scale={6}>
          <spriteMaterial map={glowTexture()} color="#7aa2ff" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      </group>
    </group>
  );
}

/** "What we build": the OrbitApps Lab — a ringed planet with one satellite per capability. */
export function Lab({ count = 4, reducedMotion = false, segments = 64 }: { count?: number; reducedMotion?: boolean; segments?: number }) {
  const root = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const sats = useMemo(() => labSatellites(count), [count]);
  const planet = useMemo(planetMaterial, []);
  const ring = useMemo(ringMaterial, []);
  const dust = useMemo(() => {
    const r = seeded(77);
    const pos: number[] = [];
    for (let i = 0; i < 900; i++) {
      const a = r() * Math.PI * 2;
      const rad = LAB.ringIn + r() * (LAB.ringOut - LAB.ringIn);
      pos.push(Math.cos(a) * rad, Math.sin(a) * rad, (r() - 0.5) * 0.08);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    return { geo: g, mat: new THREE.PointsMaterial({ color: "#dfe6f2", size: 0.035, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }) };
  }, []);
  useEffect(() => () => [planet, ring, dust.geo, dust.mat].forEach((x) => x.dispose()), [planet, ring, dust]);

  useFrame((s, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const k = reducedMotion ? 0.1 : 1;
    const arrive = easeOutCubic(rt.arrive.build);
    planet.uniforms.uTime.value = s.clock.elapsedTime * k;
    planet.uniforms.uGlow.value = ui.get().service >= 0 ? 1 : 0;
    if (spin.current) spin.current.rotation.y += dt * 0.04 * k;
    if (ringRef.current) ringRef.current.rotation.z += dt * 0.015 * k;
    if (root.current) {
      // rises into place as the section arrives, then turns slowly while you read
      root.current.scale.setScalar(0.6 + arrive * 0.4);
      root.current.rotation.y = (1 - arrive) * 0.8 + rt.inside.build * 0.25;
    }
  });

  return (
    <group position={WORLD.station}>
      <group ref={root}>
        <mesh ref={spin} material={planet}>
          <sphereGeometry args={[LAB.planetR, segments, segments]} />
        </mesh>
        <group rotation={LAB.ringTilt}>
          <mesh ref={ringRef} material={ring} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[LAB.ringIn, LAB.ringOut, 256, 1]} />
          </mesh>
          <points geometry={dust.geo} material={dust.mat} rotation={[-Math.PI / 2, 0, 0]} />
        </group>
        <sprite scale={LAB.planetR * 5}>
          <spriteMaterial map={glowTexture()} color="#5d7fc4" transparent opacity={0.18} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      </group>
      {sats.map((sat, i) => (
        <Satellite key={i} sat={sat} index={i} reducedMotion={reducedMotion} />
      ))}
    </group>
  );
}
