"use client";

/**
 * The detail layer around each app planet. Five looks, picked by `theme` in lib/products.ts:
 * celestial (constellations + zodiac dial), sacred (mandala + embers), financial (payment network + sound wave),
 * audio (equaliser ring + pulses), network (location globe + arcs).
 */

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import {
  circlePoints,
  disposeAll,
  focusOpacity,
  glowTexture,
  pointsGeometry,
  seeded,
  sparkMaterial,
  syncMaterials,
  traceGeometry,
  traceMaterial,
  type P3,
} from "./materials";

export interface ThemeProps {
  accent: string;
  accent2?: string;
  focus: RefObject<number>;
  radius: number;
  lite: boolean;
  reducedMotion: boolean;
}

const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending } as const;

/* ------------------------------ celestial ------------------------------ */

function zodiacMaterial(color: string, inner: number, outer: number) {
  return new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0 }, uColor: { value: new THREE.Color(color) }, uInner: { value: inner }, uOuter: { value: outer } },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      uniform vec3 uColor;
      uniform float uInner;
      uniform float uOuter;
      varying vec3 vPos;
      void main() {
        float a01 = atan(vPos.y, vPos.x) / 6.28318 + 0.5;
        float r = (length(vPos.xy) - uInner) / (uOuter - uInner);
        float sector = step(fract(a01 * 12.0), 0.004);
        float minor = step(fract(a01 * 72.0), 0.04) * step(0.62, r);
        float rims = (1.0 - smoothstep(0.0, 0.07, r)) + smoothstep(0.93, 1.0, r);
        float cell = fract(a01 * 12.0);
        float dot = 1.0 - smoothstep(0.0, 0.05, length(vec2((cell - 0.5) * 0.9, r - 0.32)));
        float alpha = sector * 0.9 + minor * 0.35 + rims * 0.45 + dot * 0.8;
        gl_FragColor = vec4(uColor * alpha * uOpacity * 1.3, alpha * uOpacity);
      }
    `,
    ...additive,
    side: THREE.DoubleSide,
  });
}

export function Celestial({ accent, focus, radius, lite, reducedMotion }: ThemeProps) {
  const spin = useRef<THREE.Group>(null);
  const zodiac = useRef<THREE.Mesh>(null);
  const scan = useRef<THREE.LineSegments>(null);
  const r = useMemo(() => {
    const rnd = seeded(21);
    const up = new THREE.Vector3(0, 1, 0);
    const lines: { points: P3[]; seed: number }[] = [];
    const stars: { p: P3; size: number; phase: number }[] = [];
    const n = lite ? 4 : 6;
    for (let c = 0; c < n; c++) {
      const a = (c / n) * Math.PI * 2 + rnd() * 0.5;
      const dir = new THREE.Vector3(Math.cos(a), -0.35 + rnd() * 0.7, Math.sin(a)).normalize();
      const dist = 3.2 + rnd() * 0.9;
      const u = new THREE.Vector3().crossVectors(dir, up).normalize();
      const v = new THREE.Vector3().crossVectors(u, dir).normalize();
      const count = 4 + Math.floor(rnd() * 3);
      let du = -0.6;
      let dv = (rnd() - 0.5) * 0.4;
      const pts: P3[] = [];
      for (let k = 0; k < count; k++) {
        const p = dir.clone().multiplyScalar(dist).addScaledVector(u, du).addScaledVector(v, dv);
        pts.push(p.toArray() as P3);
        stars.push({ p: p.toArray() as P3, size: k === 0 ? 2.6 : 1.3 + rnd(), phase: rnd() });
        du += 0.3 + rnd() * 0.35;
        dv += (rnd() - 0.5) * 0.75;
      }
      lines.push({ points: pts, seed: -1 });
    }
    for (let k = 0, m = lite ? 40 : 110; k < m; k++) {
      const p = new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize();
      stars.push({ p: p.multiplyScalar(2.2 + rnd() * 3).toArray() as P3, size: 0.4 + rnd() * 0.6, phase: rnd() });
    }
    return {
      lineGeo: traceGeometry(lines),
      starGeo: pointsGeometry(stars),
      scanGeo: traceGeometry([{ points: circlePoints(1, 96), seed: -1 }]),
      lineMat: traceMaterial({ color: accent, base: 0.45 }),
      starMat: sparkMaterial({ color: "#f3e7cf", scale: 34, twinkle: reducedMotion ? 0 : 0.45 }),
      scanMat: traceMaterial({ color: accent, base: 0.9 }),
      zodiacMat: zodiacMaterial(accent, 2.3, 2.62),
    };
  }, [accent, lite, reducedMotion]);
  useEffect(() => () => disposeAll(r), [r]);

  useFrame((s) => {
    const f = focus.current;
    const t = s.clock.elapsedTime * (reducedMotion ? 0.15 : 1);
    syncMaterials([r.lineMat, r.starMat, r.zodiacMat], { time: t, opacity: focusOpacity(f), pixelRatio: s.gl.getPixelRatio() });
    r.scanMat.uniforms.uOpacity.value = 0.06 + f * 0.4;
    if (spin.current) spin.current.rotation.y = t * 0.02;
    if (zodiac.current) zodiac.current.rotation.z = t * 0.03;
    if (scan.current) {
      const y = Math.sin(t * 0.9) * radius * 0.9;
      const w = Math.sqrt(Math.max(radius * radius - y * y, 1e-4)) * 1.05;
      scan.current.position.y = y;
      scan.current.scale.set(w, 1, w);
    }
  });

  return (
    <group>
      <group ref={spin}>
        <lineSegments geometry={r.lineGeo} material={r.lineMat} />
        <points geometry={r.starGeo} material={r.starMat} />
      </group>
      <mesh ref={zodiac} material={r.zodiacMat} rotation={[Math.PI / 2 - 0.5, 0.25, 0]}>
        <ringGeometry args={[2.3, 2.62, 192, 1]} />
      </mesh>
      <lineSegments ref={scan} geometry={r.scanGeo} material={r.scanMat} />
    </group>
  );
}

/* ------------------------------ sacred ------------------------------ */

function petals(base: number, amp: number, n: number, phase = 0, steps = 360): P3[] {
  const out: P3[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const r = base + amp * Math.abs(Math.cos((n / 2) * a + phase));
    out.push([Math.cos(a) * r, 0, Math.sin(a) * r]);
  }
  return out;
}

function emberMaterial(color: string) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uPixelRatio: { value: 1 }, uColor: { value: new THREE.Color(color) } },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uPixelRatio;
      attribute float aSize;
      attribute float aPhase;
      varying float vA;
      void main() {
        float speed = 0.05 + fract(aPhase * 7.3) * 0.05;
        float ph = fract(aPhase + uTime * speed);
        float ang = aPhase * 6.2831 + ph * 0.9;
        float rad = position.x;
        vec3 p = vec3(cos(ang) * rad, mix(-1.6, 2.8, ph), sin(ang) * rad);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vA = sin(ph * 3.14159);
        gl_PointSize = clamp(aSize * 30.0 / -mv.z, 1.0, 10.0) * uPixelRatio;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      uniform vec3 uColor;
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = pow(smoothstep(0.5, 0.0, d), 2.0) * vA * uOpacity;
        gl_FragColor = vec4(uColor * a * 1.5, a);
      }
    `,
    ...additive,
  });
}

export function Sacred({ accent, focus, lite, reducedMotion }: ThemeProps) {
  const inner = useRef<THREE.Group>(null);
  const outer = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Sprite>(null);
  const r = useMemo(() => {
    const rnd = seeded(8);
    const innerLines = [
      { points: petals(1.9, 0.34, 12), seed: -1 },
      { points: circlePoints(1.72, 160), seed: 0.21 },
      { points: circlePoints(2.32, 180), seed: 0.63 },
    ];
    const outerLines: { points: P3[]; seed: number }[] = [
      { points: petals(2.55, 0.26, 8, Math.PI / 8), seed: -1 },
      { points: circlePoints(3.05, 200), seed: 0.42 },
    ];
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const r0 = i % 3 === 0 ? 2.92 : 2.98;
      outerLines.push({ points: [[Math.cos(a) * r0, 0, Math.sin(a) * r0], [Math.cos(a) * 3.12, 0, Math.sin(a) * 3.12]], seed: -1 });
    }
    const dots: { p: P3; size: number; phase: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      dots.push({ p: [Math.cos(a) * 2.24, 0, Math.sin(a) * 2.24], size: 1.8, phase: i / 12 });
    }
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2 + 0.13;
      dots.push({ p: [Math.cos(a) * 3.3, 0, Math.sin(a) * 3.3], size: 1.1, phase: rnd() });
    }
    const embers: { p: P3; size: number; phase: number }[] = [];
    for (let i = 0, n = lite ? 30 : 70; i < n; i++) embers.push({ p: [1.5 + rnd() * 2.2, 0, 0], size: 0.8 + rnd() * 1.4, phase: rnd() });
    return {
      innerGeo: traceGeometry(innerLines),
      outerGeo: traceGeometry(outerLines),
      dotGeo: pointsGeometry(dots),
      emberGeo: pointsGeometry(embers),
      lineMat: traceMaterial({ color: accent, pulse: "#fff1d6", base: 0.42, speed: 0.06, density: 1, trail: 6 }),
      dotMat: sparkMaterial({ color: "#ffe2b0", scale: 30, twinkle: reducedMotion ? 0 : 0.3 }),
      emberMat: emberMaterial("#ffc06e"),
    };
  }, [accent, lite, reducedMotion]);
  useEffect(() => () => disposeAll(r), [r]);

  useFrame((s) => {
    const f = focus.current;
    const t = s.clock.elapsedTime * (reducedMotion ? 0.15 : 1);
    syncMaterials([r.lineMat, r.dotMat, r.emberMat], { time: t, opacity: focusOpacity(f), pixelRatio: s.gl.getPixelRatio() });
    if (inner.current) inner.current.rotation.y = t * 0.05;
    if (outer.current) outer.current.rotation.y = -t * 0.03;
    if (halo.current) (halo.current.material as THREE.SpriteMaterial).opacity = 0.03 + f * 0.08;
  });

  return (
    <group>
      <group rotation={[0.42, 0, 0.08]}>
        <group ref={inner}>
          <lineSegments geometry={r.innerGeo} material={r.lineMat} />
          <points geometry={r.dotGeo} material={r.dotMat} />
        </group>
        <group ref={outer}>
          <lineSegments geometry={r.outerGeo} material={r.lineMat} />
        </group>
      </group>
      <points geometry={r.emberGeo} material={r.emberMat} frustumCulled={false} />
      <sprite ref={halo} scale={7.5} renderOrder={-1}>
        <spriteMaterial map={glowTexture()} color={accent} transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  );
}

/* ------------------------------ financial ------------------------------ */

const PING = 3.2;

function waveMaterial(color: string) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uColor: { value: new THREE.Color(color) }, uRadius: { value: 1.85 } },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uRadius;
      attribute float aT;
      varying float vEnv;
      void main() {
        float ang = aT * 6.2831;
        float env = exp(-mod(uTime, ${PING.toFixed(1)}) * 1.5);
        float wave = sin(ang * 28.0 + uTime * 7.0) * (0.5 + 0.5 * sin(ang * 3.0 - uTime * 1.3));
        float r = uRadius + wave * (0.03 + env * 0.22);
        vEnv = env;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(cos(ang) * r, 0.0, sin(ang) * r, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      uniform vec3 uColor;
      varying float vEnv;
      void main() {
        float a = (0.45 + vEnv * 0.9) * uOpacity;
        gl_FragColor = vec4(mix(uColor, vec3(1.0), vEnv * 0.5) * a, a);
      }
    `,
    ...additive,
  });
}

function inflowMaterial(color: string) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uPixelRatio: { value: 1 }, uColor: { value: new THREE.Color(color) } },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uPixelRatio;
      attribute float aSize;
      attribute float aPhase;
      varying float vA;
      void main() {
        float ph = fract(aPhase + uTime * 0.16);
        float r = mix(4.4, 1.3, ph);
        float ang = aPhase * 6.2831 + ph * 2.2;
        vec3 p = vec3(cos(ang) * r, position.y * (1.0 - ph), sin(ang) * r);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vA = sin(ph * 3.14159);
        gl_PointSize = clamp(aSize * 28.0 / -mv.z, 1.0, 8.0) * uPixelRatio;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      uniform vec3 uColor;
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.1, d) * vA * uOpacity;
        gl_FragColor = vec4(uColor * a * 1.4, a);
      }
    `,
    ...additive,
  });
}

export function Financial({ accent, focus, radius, lite, reducedMotion }: ThemeProps) {
  const wave = useRef<THREE.LineSegments>(null);
  const ping = useRef<THREE.LineSegments>(null);
  const r = useMemo(() => {
    const rnd = seeded(5);
    const nodes: THREE.Vector3[] = [];
    const n = lite ? 9 : 14;
    while (nodes.length < n) {
      const v = new THREE.Vector3(rnd() * 2 - 1, rnd() * 1.25 - 0.8, rnd() * 2 - 1);
      if (v.lengthSq() < 0.05) continue;
      nodes.push(v.normalize().multiplyScalar(2.5 + rnd() * 0.9));
    }
    const links: { points: P3[]; seed: number }[] = [];
    const seen = new Set<string>();
    nodes.forEach((a, i) => {
      nodes
        .map((b, j) => ({ j, d: a.distanceTo(b) }))
        .filter(({ j }) => j !== i)
        .sort((x, y) => x.d - y.d)
        .slice(0, 2)
        .forEach(({ j }) => {
          const key = i < j ? `${i}-${j}` : `${j}-${i}`;
          if (seen.has(key)) return;
          seen.add(key);
          links.push({ points: [a.toArray() as P3, nodes[j].toArray() as P3], seed: rnd() });
        });
    });
    nodes.slice(0, lite ? 3 : 5).forEach((a) => links.push({ points: [a.toArray() as P3, a.clone().setLength(radius * 1.06).toArray() as P3], seed: rnd() }));
    const inflow: { p: P3; size: number; phase: number }[] = [];
    for (let i = 0, m = lite ? 22 : 48; i < m; i++) inflow.push({ p: [0, (rnd() - 0.5) * 2.4, 0], size: 0.8 + rnd(), phase: rnd() });
    const ts: number[] = [];
    for (let i = 0; i < 256; i++) ts.push(i / 256, (i + 1) / 256);
    const waveGeo = new THREE.BufferGeometry();
    waveGeo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(ts.length * 3), 3));
    waveGeo.setAttribute("aT", new THREE.Float32BufferAttribute(ts, 1));
    return {
      netGeo: traceGeometry(links),
      nodeGeo: pointsGeometry(nodes.map((p, i) => ({ p: p.toArray() as P3, size: 2 + (i % 3) * 0.5, phase: rnd() }))),
      inflowGeo: pointsGeometry(inflow),
      waveGeo,
      pingGeo: traceGeometry([{ points: circlePoints(1, 128), seed: -1 }]),
      netMat: traceMaterial({ color: accent, pulse: "#ffffff", base: 0.3, speed: 0.35, density: 0.75 }),
      nodeMat: sparkMaterial({ color: "#e6ddff", scale: 30, twinkle: reducedMotion ? 0 : 0.5 }),
      inflowMat: inflowMaterial(accent),
      waveMat: waveMaterial(accent),
      pingMat: traceMaterial({ color: accent, base: 1 }),
    };
  }, [accent, lite, radius, reducedMotion]);
  useEffect(() => () => disposeAll(r), [r]);

  useFrame((s) => {
    const f = focus.current;
    const t = s.clock.elapsedTime * (reducedMotion ? 0.15 : 1);
    syncMaterials([r.netMat, r.nodeMat, r.inflowMat, r.waveMat], { time: t, opacity: focusOpacity(f), pixelRatio: s.gl.getPixelRatio() });
    const p = (t % PING) / PING;
    if (ping.current) ping.current.scale.setScalar(1.9 + p * 2.4);
    r.pingMat.uniforms.uOpacity.value = (1 - p) ** 2 * focusOpacity(f) * 0.6;
    if (wave.current) wave.current.rotation.y = t * 0.05;
  });

  return (
    <group>
      <lineSegments geometry={r.netGeo} material={r.netMat} />
      <points geometry={r.nodeGeo} material={r.nodeMat} />
      <points geometry={r.inflowGeo} material={r.inflowMat} frustumCulled={false} />
      <group rotation={[0.38, 0, -0.1]}>
        <lineSegments ref={wave} geometry={r.waveGeo} material={r.waveMat} frustumCulled={false} />
        <lineSegments ref={ping} geometry={r.pingGeo} material={r.pingMat} />
      </group>
    </group>
  );
}

/* ------------------------------ audio ------------------------------ */

const BEAT = 0.6;

function barMaterial(c1: string, c2: string) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uColor: { value: new THREE.Color(c1) }, uColor2: { value: new THREE.Color(c2) } },
    vertexShader: /* glsl */ `
      uniform float uTime;
      attribute float aIndex;
      varying float vH;
      void main() {
        float s = 0.5 + 0.5 * sin(aIndex * 0.9 + uTime * 3.0) * sin(aIndex * 0.37 - uTime * 1.9);
        float beat = 0.55 + 0.45 * exp(-mod(uTime, ${BEAT.toFixed(2)}) * 5.0);
        float h = 0.08 + s * beat * 0.85;
        vec3 p = position;
        p.x *= h;
        vH = position.x;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      uniform vec3 uColor;
      uniform vec3 uColor2;
      varying float vH;
      void main() {
        vec3 col = mix(uColor, uColor2, smoothstep(0.2, 1.0, vH));
        float a = (0.3 + 0.5 * vH) * uOpacity;
        gl_FragColor = vec4(col * a, a);
      }
    `,
    ...additive,
  });
}

function waveDotsMaterial(color: string) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uPixelRatio: { value: 1 }, uColor: { value: new THREE.Color(color) } },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uPixelRatio;
      varying float vA;
      void main() {
        float ang = position.x;
        float y = sin(ang * 6.0 - uTime * 2.4) * 0.22;
        vec3 p = vec3(cos(ang) * 2.85, y, sin(ang) * 2.85);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vA = 0.5 + 0.5 * (y / 0.22);
        gl_PointSize = clamp(34.0 / -mv.z, 1.0, 6.0) * uPixelRatio;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      uniform vec3 uColor;
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.1, d) * (0.35 + 0.65 * vA) * uOpacity;
        gl_FragColor = vec4(uColor * a * 1.4, a);
      }
    `,
    ...additive,
  });
}

export function AudioWaves({ accent, accent2 = accent, focus, radius, lite, reducedMotion }: ThemeProps) {
  const rings = useRef<(THREE.LineSegments | null)[]>([]);
  const spin = useRef<THREE.Group>(null);
  const r = useMemo(() => {
    const bars = lite ? 32 : 56;
    const barGeo = new THREE.BoxGeometry(1, 0.035, 0.035).translate(0.5, 0, 0);
    const idx = new Float32Array(bars);
    for (let i = 0; i < bars; i++) idx[i] = i;
    barGeo.setAttribute("aIndex", new THREE.InstancedBufferAttribute(idx, 1));
    const barMat = barMaterial(accent, accent2);
    const barMesh = new THREE.InstancedMesh(barGeo, barMat, bars);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const one = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < bars; i++) {
      const a = (i / bars) * Math.PI * 2;
      q.setFromAxisAngle(up, -a);
      barMesh.setMatrixAt(i, m.compose(new THREE.Vector3(Math.cos(a) * 1.72, 0, Math.sin(a) * 1.72), q, one));
    }
    barMesh.frustumCulled = false;
    const dots = lite ? 48 : 96;
    const dp = new Float32Array(dots * 3);
    for (let i = 0; i < dots; i++) dp[i * 3] = (i / dots) * Math.PI * 2;
    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute("position", new THREE.BufferAttribute(dp, 3));
    return {
      barGeo,
      barMat,
      barMesh,
      dotGeo,
      dotMat: waveDotsMaterial(accent2),
      ringGeo: traceGeometry([{ points: circlePoints(1, 128).map(([x, , z]) => [x, z, 0] as P3), seed: -1 }]),
      ringMats: Array.from({ length: 4 }, () => traceMaterial({ color: accent, base: 1 })),
    };
  }, [accent, accent2, lite]);
  useEffect(
    () => () => {
      r.ringMats.forEach((m) => m.dispose());
      r.barMesh.dispose();
      disposeAll({ a: r.barGeo, b: r.barMat, c: r.dotGeo, d: r.dotMat, e: r.ringGeo });
    },
    [r],
  );

  useFrame((s) => {
    const op = focusOpacity(focus.current);
    const t = s.clock.elapsedTime * (reducedMotion ? 0.15 : 1);
    syncMaterials([r.barMat, r.dotMat], { time: t, opacity: op, pixelRatio: s.gl.getPixelRatio() });
    for (let i = 0; i < 4; i++) {
      const p = (t / (BEAT * 4) + i / 4) % 1;
      rings.current[i]?.scale.setScalar(radius * 1.12 + p * 2.9);
      r.ringMats[i].uniforms.uOpacity.value = (1 - p) ** 1.6 * op * 0.4;
    }
    if (spin.current) spin.current.rotation.y = t * 0.04;
  });

  return (
    <group>
      <Billboard>
        {r.ringMats.map((m, i) => (
          <lineSegments key={i} ref={(el) => void (rings.current[i] = el)} geometry={r.ringGeo} material={m} />
        ))}
      </Billboard>
      <group rotation={[0.36, 0, 0.06]}>
        <group ref={spin}>
          <primitive object={r.barMesh} />
        </group>
        <points geometry={r.dotGeo} material={r.dotMat} frustumCulled={false} />
      </group>
    </group>
  );
}

/* ------------------------------ network ------------------------------ */

function pulseMaterial(color: string) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uPixelRatio: { value: 1 }, uColor: { value: new THREE.Color(color) } },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uPixelRatio;
      attribute float aPhase;
      varying float vPh;
      void main() {
        vPh = fract(uTime * 0.45 + aPhase);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = clamp((0.15 + vPh * 1.1) * 260.0 / -mv.z, 2.0, 64.0) * uPixelRatio;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      uniform vec3 uColor;
      varying float vPh;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float ring = 1.0 - smoothstep(0.0, 0.12, abs(d - 0.85));
        float a = ring * pow(1.0 - vPh, 1.5) * uOpacity;
        gl_FragColor = vec4(uColor * a, a);
      }
    `,
    ...additive,
  });
}

const slerpDir = (a: THREE.Vector3, b: THREE.Vector3, t: number) => new THREE.Vector3().copy(a).lerp(b, t).normalize();

export function Network({ accent, focus, radius, lite, reducedMotion }: ThemeProps) {
  const r = useMemo(() => {
    const rnd = seeded(36);
    const R = radius * 1.035;
    const grid: { points: P3[]; seed: number }[] = [];
    [-60, -30, 0, 30, 60].forEach((deg) => {
      const lat = THREE.MathUtils.degToRad(deg);
      grid.push({ points: circlePoints(R * Math.cos(lat), 96, R * Math.sin(lat)), seed: -1 });
    });
    for (let i = 0; i < 12; i++) {
      const lon = (i / 12) * Math.PI * 2;
      const pts: P3[] = [];
      for (let k = 0; k <= 48; k++) {
        const lat = -Math.PI / 2 + (k / 48) * Math.PI;
        pts.push([R * Math.cos(lat) * Math.cos(lon), R * Math.sin(lat), R * Math.cos(lat) * Math.sin(lon)]);
      }
      grid.push({ points: pts, seed: -1 });
    }
    const pins: THREE.Vector3[] = [];
    const n = lite ? 6 : 9;
    while (pins.length < n) {
      const v = new THREE.Vector3(rnd() * 2 - 1, rnd() * 1.6 - 0.9, rnd() * 2 - 1);
      if (v.lengthSq() < 0.05) continue;
      v.normalize();
      if (v.y > 0.75) continue;
      pins.push(v);
    }
    const arcs: { points: P3[]; seed: number }[] = [];
    pins.forEach((a, i) => {
      const b = pins[(i + 1 + (i % 2)) % pins.length];
      const ang = a.angleTo(b);
      const pts: P3[] = [];
      for (let k = 0; k <= 40; k++) {
        const t = k / 40;
        const h = R + Math.sin(Math.PI * t) * (0.25 + ang * 0.45);
        pts.push(slerpDir(a, b, t).multiplyScalar(h).toArray() as P3);
      }
      arcs.push({ points: pts, seed: rnd() });
    });
    const orbits = [
      { points: circlePoints(2.35, 160), seed: 0.17 },
      { points: circlePoints(2.85, 180), seed: 0.71 },
    ];
    const locs = pins.map((p) => ({ p: p.clone().multiplyScalar(R * 1.01).toArray() as P3, size: 2.2, phase: rnd() }));
    return {
      gridGeo: traceGeometry(grid),
      arcGeo: traceGeometry(arcs),
      orbitGeo: traceGeometry(orbits),
      locGeo: pointsGeometry(locs),
      gridMat: traceMaterial({ color: accent, base: 0.2 }),
      arcMat: traceMaterial({ color: accent, pulse: "#ffffff", base: 0.4, speed: 0.3, density: 1 }),
      orbitMat: traceMaterial({ color: accent, pulse: "#ffffff", base: 0.18, speed: 0.05, density: 1, trail: 40 }),
      locMat: sparkMaterial({ color: "#ffffff", scale: 30, twinkle: 0 }),
      pulseMat: pulseMaterial(accent),
    };
  }, [accent, lite, radius]);
  useEffect(() => () => disposeAll(r), [r]);

  useFrame((s) => {
    const t = s.clock.elapsedTime * (reducedMotion ? 0.15 : 1);
    syncMaterials([r.gridMat, r.arcMat, r.orbitMat, r.locMat, r.pulseMat], { time: t, opacity: focusOpacity(focus.current), pixelRatio: s.gl.getPixelRatio() });
  });

  return (
    <group>
      <lineSegments geometry={r.gridGeo} material={r.gridMat} />
      <lineSegments geometry={r.arcGeo} material={r.arcMat} />
      <points geometry={r.locGeo} material={r.locMat} />
      <points geometry={r.locGeo} material={r.pulseMat} />
      <group rotation={[0.5, 0, 0.35]}>
        <lineSegments geometry={r.orbitGeo} material={r.orbitMat} />
      </group>
      <group rotation={[-0.62, 0.4, -0.2]} scale={0.94}>
        <lineSegments geometry={r.orbitGeo} material={r.orbitMat} />
      </group>
    </group>
  );
}

export const THEMES = { celestial: Celestial, sacred: Sacred, financial: Financial, audio: AudioWaves, network: Network };
