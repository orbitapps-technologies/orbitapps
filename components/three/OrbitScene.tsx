"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import { PRODUCTS, type Product } from "@/lib/products";
import { glowMaterial, noiseGLSL, starfield, traceLoop } from "@/lib/shaders";
import { iconRegistry, overlay, stage } from "@/lib/universe";
import { Sun } from "./Sun";

const N = PRODUCTS.length;
const TAU = Math.PI * 2;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth01 = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};

/** Every app has its own orbit; outer orbits are slower (Kepler-ish). */
const orbitRadius = (i: number) => 3.4 + i * (9.2 / Math.max(1, N - 1));
const orbitSpeed = (i: number) => 1.1 / Math.pow(orbitRadius(i), 1.5);
const baseSize = (i: number) => 0.34 + ((i * 37) % 5) * 0.045;

/* ---------------- Planet ---------------- */

const planetVertex = /* glsl */ `
  varying vec3 vP; varying vec3 vN; varying vec3 vW;
  void main() {
    vP = position;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const planetFragment = /* glsl */ `
  uniform vec3 uColor; uniform vec3 uDeep; uniform vec3 uGlow; uniform float uTime; uniform float uSeed; uniform float uActive;
  varying vec3 vP; varying vec3 vN; varying vec3 vW;
  ${noiseGLSL}
  void main() {
    vec3 p = normalize(vP);
    float n = fbm(p * 2.6 + vec3(uSeed * 7.0, uTime * 0.02, 0.0));
    float bands = sin(p.y * (8.0 + uSeed * 6.0) + n * 4.0) * 0.5 + 0.5;
    vec3 surf = mix(uDeep * 0.5, uColor * 0.95, bands * 0.55 + n * 0.45);
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vW);
    vec3 L = normalize(-vW);
    float diff = smoothstep(-0.35, 1.0, dot(N, L));
    float fill = pow(max(dot(N, V), 0.0), 1.5) * 0.5;
    float fres = pow(1.0 - max(dot(N, V), 0.0), 2.2);
    vec3 col = surf * (0.14 + diff * 0.75 + fill) + uGlow * fres * (0.9 + uActive * 0.8);
    gl_FragColor = vec4(col, 1.0);
  }
`;

function Planet({ product, index, setRef }: { product: Product; index: number; setRef: (g: THREE.Group | null, m: THREE.ShaderMaterial, h: THREE.Mesh | null) => void }) {
  const body = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  const group = useRef<THREE.Group>(null);
  const { accent, glow: glowColor, deep } = product.identity;
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(accent) },
          uDeep: { value: new THREE.Color(deep) },
          uGlow: { value: new THREE.Color(glowColor) },
          uTime: { value: 0 },
          uSeed: { value: (index * 0.37) % 1 },
          uActive: { value: 0 },
        },
        vertexShader: planetVertex,
        fragmentShader: planetFragment,
        defines: { FBM_OCTAVES: 4 },
      }),
    [accent, deep, glowColor, index],
  );
  const glow = useMemo(() => glowMaterial(accent, 0.5, 2.2), [accent]);
  useEffect(() => {
    setRef(group.current, mat, halo.current);
    return () => {
      mat.dispose();
      glow.dispose();
    };
  }, [mat, glow, setRef]);
  useFrame((state, d) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime;
    if (body.current) body.current.rotation.y += d * 0.25;
  });
  return (
    <group ref={group}>
      <Billboard>
        <mesh material={glow}>
          <planeGeometry args={[4.4, 4.4]} />
        </mesh>
        {/* selection ring */}
        <mesh ref={halo}>
          <ringGeometry args={[1.45, 1.5, 96]} />
          <meshBasicMaterial color={glowColor} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      </Billboard>
      <mesh ref={body} material={mat}>
        <sphereGeometry args={[1, 64, 64]} />
      </mesh>
    </group>
  );
}

/* ---------------- System ---------------- */

function circle(r: number, seg = 300) {
  const pts = new Float32Array(seg * 3);
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * TAU;
    pts.set([Math.sin(a) * r, 0, Math.cos(a) * r], i * 3);
  }
  return pts;
}

type PlanetRefs = { group: THREE.Group | null; mat: THREE.ShaderMaterial | null; halo: THREE.Mesh | null };

function System({ lowPower }: { lowPower: boolean }) {
  const planets = useRef<PlanetRefs[]>(PRODUCTS.map(() => ({ group: null, mat: null, halo: null })));
  const setters = useMemo(
    () =>
      PRODUCTS.map((_, i) => (g: THREE.Group | null, m: THREE.ShaderMaterial, h: THREE.Mesh | null) => {
        planets.current[i] = { group: g, mat: m, halo: h };
      }),
    [],
  );
  const spin = useRef(PRODUCTS.map((_, i) => i * 2.39996 + 0.6));
  const act = useRef(PRODUCTS.map(() => 0)); // 0..1 how "active" each planet is
  const dpr = useThree((s) => s.viewport.dpr);

  const stars = useMemo(() => starfield(lowPower ? 800 : 1800, 40, 120), [lowPower]);
  const rings = useMemo(() => PRODUCTS.map((p, i) => traceLoop(circle(orbitRadius(i)), p.identity.glow, 0.1, 0.7, 6)), []);
  useEffect(
    () => () => {
      [stars, ...rings].forEach((o) => {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      });
    },
    [stars, rings],
  );

  const v = useMemo(
    () => ({
      cur: new THREE.Vector3(0, 6.5, 33),
      curLook: new THREE.Vector3(),
      tmp: new THREE.Vector3(),
      hero: new THREE.Vector3(),
      look: new THREE.Vector3(),
      reveal: stage.reveal,
      zoom: 0,
      px: 0,
      py: 0,
    }),
    [],
  );
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.1);
    const t = state.clock.elapsedTime;
    const { width, height } = state.size;
    const wide = width >= 1024;
    const focus = stage.focus;
    const activeIdx = focus >= 0.5 ? Math.round(focus) - 1 : -1;
    // Frame-rate independent smoothing of the scroll-driven values.
    v.reveal = THREE.MathUtils.damp(v.reveal, stage.reveal, 7, d);
    v.zoom = THREE.MathUtils.damp(v.zoom, clamp01(focus), 5, d);
    const rv = v.reveal;
    const zoom = v.zoom; // 0 overview → 1 touring the apps
    const e = rv * rv * (3 - 2 * rv); // hero → system blend

    const sm = stars.material as THREE.ShaderMaterial;
    sm.uniforms.uTime.value = t;
    sm.uniforms.uPixelRatio.value = dpr;

    // Planets orbit on their own rings; the system slows while touring.
    // Hero: only the three inner worlds are out; the rest unfold from the Sun as you scroll.
    PRODUCTS.forEach((p, i) => {
      const ri = i < 3 ? 1 : smooth01((rv - 0.12 - (i - 3) * 0.06) / 0.4);
      spin.current[i] += d * orbitSpeed(i) * (1 - 0.7 * zoom);
      act.current[i] = THREE.MathUtils.damp(act.current[i], i === activeIdx ? 1 : 0, 5, d);
      const a = act.current[i];
      const r = orbitRadius(i) * (0.25 + 0.75 * ri);
      const ref = planets.current[i];
      if (ref.group) {
        ref.group.position.set(Math.sin(spin.current[i]) * r, 0, Math.cos(spin.current[i]) * r);
        ref.group.scale.setScalar(Math.max(0.0001, baseSize(i) * (1 + a * 1.1) * ri));
        ref.group.visible = ri > 0.001;
      }
      if (ref.mat) ref.mat.uniforms.uActive.value = a;
      if (ref.halo) (ref.halo.material as THREE.MeshBasicMaterial).opacity = a * 0.8;
      const ring = rings[i];
      ring.scale.setScalar(0.25 + 0.75 * ri);
      ring.visible = ri > 0.001;
      const rm = ring.material as THREE.ShaderMaterial;
      rm.uniforms.uBase.value = (0.08 + a * 0.4) * ri;
      rm.uniforms.uTrail.value = (0.5 + a * 0.9) * ri;
      rm.uniforms.uHead.value = (((spin.current[i] / TAU) % 1) + 1) % 1;
    });

    // System camera: calm overview; drifts and zooms gently toward the active planet.
    const activeRef = activeIdx >= 0 ? planets.current[activeIdx].group : null;
    const dist = wide ? 30 : width >= 640 ? 34 : 40;
    const fx = activeRef ? activeRef.position.x * 0.28 : 0;
    const fz = activeRef ? activeRef.position.z * 0.28 : 0;
    const tPos = v.tmp.set(fx, THREE.MathUtils.lerp(6.5, 4.2, zoom), THREE.MathUtils.lerp(dist + 3, dist - 3, zoom) + fz);
    const k = 1 - Math.exp(-2.6 * d);
    v.cur.lerp(tPos, k);
    v.curLook.lerp(v.tmp.set(fx, 0, fz), k);

    // Hero camera: close on the Sun, almost edge-on to the orbits, with pointer parallax.
    v.px = THREE.MathUtils.damp(v.px, pointer.current.x, 3, d);
    v.py = THREE.MathUtils.damp(v.py, pointer.current.y, 3, d);
    const heroDist = wide ? 16 : 19;
    v.hero.set(v.px * 1.1, 2.1 - v.py * 0.7, heroDist);

    // Blend: distance is interpolated on a log scale so the pull-back feels even.
    const cam = state.camera as THREE.PerspectiveCamera;
    const R = Math.exp(THREE.MathUtils.lerp(Math.log(v.hero.length()), Math.log(v.cur.length()), e));
    cam.position.lerpVectors(v.hero, v.cur, e).setLength(R);
    v.look.copy(v.curLook).multiplyScalar(e);
    cam.lookAt(v.look);
    // Hero: Sun on the right (desktop) / upper half (mobile).
    // System: between the list and the card (desktop) / upper part (mobile).
    if (wide) {
      const sys = width * (0.05 * zoom - 0.04 * (1 - zoom));
      cam.setViewOffset(width, height, THREE.MathUtils.lerp(-0.22 * width, sys, e), 0, width, height);
    } else {
      const sys = height * (0.18 + 0.06 * zoom);
      cam.setViewOffset(width, height, 0, THREE.MathUtils.lerp(0.2 * height, sys, e), width, height);
    }
    cam.updateMatrixWorld();
    const iconFade = smooth01((rv - 0.55) / 0.4);

    // DOM overlays: icons above planets, stat beside the active planet.
    PRODUCTS.forEach((p, i) => {
      const el = iconRegistry.get(p.id);
      const ref = planets.current[i];
      if (!el || !ref.group) return;
      const a = act.current[i];
      const s = ref.group.scale.x;
      v.tmp.copy(ref.group.position);
      v.tmp.y += s * 1.35;
      v.tmp.project(cam);
      const x = (v.tmp.x * 0.5 + 0.5) * width;
      const y = (-v.tmp.y * 0.5 + 0.5) * height;
      const behind = ref.group.position.distanceTo(cam.position) > cam.position.length() ? 0.55 : 1;
      const scale = (wide ? 0.5 : 0.42) + a * (wide ? 0.4 : 0.35);
      const visible = v.tmp.z < 1 && x > -60 && x < width + 60 && y > -60 && y < height + 60;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%) scale(${scale.toFixed(3)})`;
      el.style.opacity = visible ? ((activeIdx < 0 ? 0.95 * behind : 0.35 * behind + a * 0.65) * iconFade).toFixed(3) : "0";
      el.style.zIndex = String(10 + Math.round(a * 50) + (behind === 1 ? 5 : 0));
    });
    if (overlay.stat) {
      const ref = activeIdx >= 0 ? planets.current[activeIdx] : null;
      if (ref?.group) {
        v.tmp.copy(ref.group.position);
        v.tmp.project(cam);
        const x = (v.tmp.x * 0.5 + 0.5) * width;
        const y = (-v.tmp.y * 0.5 + 0.5) * height;
        const off = ref.group.scale.x * (wide ? 42 : 30) + 18;
        overlay.stat.style.transform = `translate3d(${(x + off).toFixed(1)}px, ${y.toFixed(1)}px, 0) translateY(-50%)`;
        overlay.stat.style.opacity = "1";
      } else {
        overlay.stat.style.opacity = "0";
      }
    }
  });

  return (
    <>
      <primitive object={stars} />
      <Sun radius={1.55} />
      {rings.map((r, i) => (
        <primitive key={i} object={r} />
      ))}
      {PRODUCTS.map((p, i) => (
        <Planet key={p.id} product={p} index={i} setRef={setters[i]} />
      ))}
    </>
  );
}

export default function OrbitScene({ lowPower, paused }: { lowPower: boolean; paused: boolean }) {
  return (
    <Canvas
      style={{ position: "absolute", inset: 0 }}
      dpr={lowPower ? [1, 1.25] : [1, 1.6]}
      frameloop={paused ? "never" : "always"}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: 30, near: 0.1, far: 400, position: [0, 2.1, 16] }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <System lowPower={lowPower} />
    </Canvas>
  );
}
