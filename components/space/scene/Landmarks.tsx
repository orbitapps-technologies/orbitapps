"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { serviceSide, serviceY, WORLD } from "@/lib/space/layout";
import { rt, ui } from "@/lib/space/store";
import { NOISE, damp, easeOutCubic, glowTexture, rimMaterial, seeded } from "./materials";

const additiveSprite = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending } as const;

/* ================================================================== */
/* Station — one docked module per service                            */
/* ================================================================== */

function trussGeometry(top: number, bottom: number) {
  const h = 0.32;
  const corners: [number, number][] = [
    [h, h],
    [-h, h],
    [-h, -h],
    [h, -h],
  ];
  const pos: number[] = [];
  corners.forEach(([x, z]) => pos.push(x, top, z, x, bottom, z));
  const step = 0.9;
  for (let y = bottom; y < top - 0.9; y += step)
    for (let i = 0; i < 4; i++) {
      const [x0, z0] = corners[i];
      const [x1, z1] = corners[(i + 1) % 4];
      pos.push(x0, y, z0, x1, y + step, z1);
      pos.push(x0, y, z0, x1, y, z1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

function panelTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#0d0e10";
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = "rgba(190,194,200,0.3)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= 256; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, 128);
    ctx.stroke();
  }
  for (let y = 0; y <= 128; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(256, y + 0.5);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function StationModule({ index, metal, hull, reducedMotion }: { index: number; metal: THREE.Material; hull: THREE.Material; reducedMotion: boolean }) {
  const beacon = useRef<THREE.Sprite>(null);
  const lit = useRef(0);
  const band = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color("#e6e8eb"), toneMapped: false }), []);
  useEffect(() => () => band.dispose(), [band]);
  useFrame((s, delta) => {
    const dt = Math.min(delta, 1 / 20);
    lit.current = damp(lit.current, ui.get().service === index ? 1 : 0, 3, dt);
    const u = lit.current;
    const flicker = reducedMotion ? 1 : 0.85 + 0.15 * Math.sin(s.clock.elapsedTime * 2.4);
    band.color.setRGB(0.4 + u * 2.2 * flicker, 0.41 + u * 2.2 * flicker, 0.43 + u * 2.25 * flicker);
    if (beacon.current) (beacon.current.material as THREE.SpriteMaterial).opacity = 0.15 + u * 0.6;
  });
  return (
    <group position={[0, serviceY(index), 0]} rotation={[0, serviceSide(index) > 0 ? 0 : Math.PI, 0]}>
      <mesh material={metal}>
        <boxGeometry args={[1.1, 1.1, 1.1]} />
      </mesh>
      <mesh material={hull} position={[2.45, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.72, 0.72, 3.4, 40, 1]} />
      </mesh>
      <mesh material={metal} position={[4.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.55, 0.72, 0.25, 40, 1]} />
      </mesh>
      {[0.85, 4.05].map((x) => (
        <mesh key={x} material={metal} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.74, 0.05, 10, 48]} />
        </mesh>
      ))}
      <mesh material={band} position={[2.45, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.735, 0.735, 0.1, 40, 1, true]} />
      </mesh>
      <sprite ref={beacon} position={[4.45, 0, 0]} scale={2.2}>
        <spriteMaterial map={glowTexture()} color="#e4e6ea" opacity={0.15} {...additiveSprite} />
      </sprite>
    </group>
  );
}

export function Station({ count = 3, reducedMotion = false }: { count?: number; reducedMotion?: boolean }) {
  const root = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Group>(null);
  const blinks = useRef<(THREE.Sprite | null)[]>([]);
  const lowest = serviceY(Math.max(count - 1, 2));
  const bottom = lowest - 7;
  const top = 11;
  const truss = useMemo(() => trussGeometry(top, bottom), [bottom]);
  const tex = useMemo(panelTexture, []);
  const metal = useMemo(() => new THREE.MeshStandardMaterial({ color: "#30353d", metalness: 0.9, roughness: 0.35 }), []);
  const hull = useMemo(() => new THREE.MeshStandardMaterial({ color: "#8b9099", metalness: 0.7, roughness: 0.42 }), []);
  const solar = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, color: "#d0d3d8", metalness: 0.75, roughness: 0.25, emissive: "#101113", emissiveIntensity: 0.6 }), [tex]);
  const line = useMemo(() => new THREE.LineBasicMaterial({ color: "#8c9097", transparent: true, opacity: 0.55, depthWrite: false }), []);
  useEffect(() => () => [truss, tex, metal, hull, solar, line].forEach((x) => x.dispose()), [truss, tex, metal, hull, solar, line]);

  useFrame((s, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const t = s.clock.elapsedTime;
    const k = reducedMotion ? 0.1 : 1;
    if (root.current) root.current.rotation.y = 0.45 + Math.sin(t * 0.08 * k) * 0.18 + rt.inside.build * 0.5;
    if (ring.current) ring.current.rotation.y += dt * 0.12 * k;
    blinks.current.forEach((b, i) => {
      if (b) (b.material as THREE.SpriteMaterial).opacity = reducedMotion ? 0.5 : 0.15 + 0.75 * Math.max(0, Math.sin(t * 1.6 + i * 1.7)) ** 8;
    });
  });

  const spineH = 11.6 - bottom;
  const lights: [number, number, number][] = [
    [3.9, 8, 0],
    [-3.9, 8, 0],
    [0, bottom, 0],
    [0, 11.6, 0],
  ];
  return (
    <group position={WORLD.station}>
      <group ref={root}>
        <lineSegments geometry={truss} material={line} />
        <mesh material={metal} position={[0, (11.6 + bottom) / 2, 0]}>
          <boxGeometry args={[0.18, spineH, 0.18]} />
        </mesh>
        {Array.from({ length: count }, (_, i) => (
          <StationModule key={i} index={i} metal={metal} hull={hull} reducedMotion={reducedMotion} />
        ))}
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 4, 8, 0]} rotation={[0.35, 0, 0]}>
            <mesh material={solar}>
              <boxGeometry args={[5.6, 0.04, 1.9]} />
            </mesh>
            <mesh material={metal} position={[-side * 3.1, 0, 0]}>
              <boxGeometry args={[0.6, 0.08, 0.08]} />
            </mesh>
          </group>
        ))}
        <group ref={ring} position={[0, 9.8, 0]}>
          <mesh material={hull} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[3, 0.16, 16, 96]} />
          </mesh>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} material={metal} rotation={[0, (i * Math.PI) / 4, Math.PI / 2]}>
              <cylinderGeometry args={[0.04, 0.04, 6, 6]} />
            </mesh>
          ))}
        </group>
        {[-1, 1].map((side) => (
          <mesh key={side} material={hull} position={[side * 1.7, lowest - 5, 0]}>
            <boxGeometry args={[2.4, 1.4, 0.03]} />
          </mesh>
        ))}
        {lights.map((p, i) => (
          <sprite key={i} ref={(el) => void (blinks.current[i] = el)} position={p} scale={0.9}>
            <spriteMaterial map={glowTexture()} color="#eceef1" opacity={0.5} {...additiveSprite} />
          </sprite>
        ))}
      </group>
    </group>
  );
}

/* ================================================================== */
/* Gyroscope — About                                                  */
/* ================================================================== */

const GIMBALS = [
  { r: 1.45, tube: 0.022, axis: [1, 0.2, 0], speed: 0.42, start: [0.4, 0, 0] },
  { r: 1.95, tube: 0.016, axis: [0, 1, 0.3], speed: -0.3, start: [1.2, 0.4, 0] },
  { r: 2.45, tube: 0.014, axis: [0.3, 0, 1], speed: 0.22, start: [0.2, 1.1, 0.6] },
  { r: 2.95, tube: 0.012, axis: [1, 1, 0], speed: -0.15, start: [1.4, 0, 0.9] },
] as const;

export function Gyro({ reducedMotion = false, segments = 48 }: { reducedMotion?: boolean; segments?: number }) {
  const root = useRef<THREE.Group>(null);
  const rings = useRef<(THREE.Group | null)[]>([]);
  const dial = useRef<THREE.Group>(null);
  const chrome = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d5dae3", metalness: 1, roughness: 0.28, envMapIntensity: 1.2 }), []);
  const bead = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 1.9, 1.95), toneMapped: false }), []);
  const axes = useMemo(() => GIMBALS.map((g) => new THREE.Vector3(...g.axis).normalize()), []);
  const ticks = useMemo(() => {
    const n = 120;
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.12, 0.012), new THREE.MeshBasicMaterial({ color: "#9da1a8", transparent: true, opacity: 0.5 }), n);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const z = new THREE.Vector3(0, 0, 1);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      p.set(Math.cos(a) * 3.55, Math.sin(a) * 3.55, 0);
      q.setFromAxisAngle(z, a - Math.PI / 2);
      s.set(1, i % 10 === 0 ? 2.4 : 1, 1);
      mesh.setMatrixAt(i, m.compose(p, q, s));
    }
    return mesh;
  }, []);
  useEffect(
    () => () => {
      chrome.dispose();
      bead.dispose();
      ticks.geometry.dispose();
      (ticks.material as THREE.Material).dispose();
    },
    [chrome, bead, ticks],
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const a = easeOutCubic(rt.arrive.about);
    const k = reducedMotion ? 0.1 : 1;
    const boost = 1 + (1 - a) * 2.5;
    rings.current.forEach((g, i) => {
      if (!g) return;
      g.rotateOnAxis(axes[i], dt * GIMBALS[i].speed * k * boost);
      g.scale.setScalar(0.55 + a * 0.45);
    });
    if (dial.current) dial.current.rotation.z += dt * 0.02 * k;
    if (root.current) root.current.rotation.y = (1 - a) * -0.9 + rt.inside.about * 0.4;
  });

  return (
    <group position={WORLD.gyro}>
      <group ref={root}>
        <mesh>
          <sphereGeometry args={[0.42, segments, segments]} />
          <meshPhysicalMaterial color="#07090c" metalness={0.6} roughness={0.2} clearcoat={1} />
        </mesh>
        <sprite scale={4.5}>
          <spriteMaterial map={glowTexture()} color="#9a9ea6" opacity={0.22} {...additiveSprite} />
        </sprite>
        {GIMBALS.map((g, i) => (
          <group key={i} ref={(el) => void (rings.current[i] = el)} rotation={g.start as unknown as [number, number, number]}>
            <mesh material={chrome}>
              <torusGeometry args={[g.r, g.tube, 12, 160]} />
            </mesh>
            <mesh position={[g.r, 0, 0]} material={bead}>
              <sphereGeometry args={[0.05, 12, 10]} />
            </mesh>
          </group>
        ))}
        <group ref={dial} rotation={[0.12, 0, 0]}>
          <primitive object={ticks} />
        </group>
      </group>
    </group>
  );
}

/* ================================================================== */
/* Horizon — the planet and the sunrise behind Contact                */
/* ================================================================== */

export function Horizon({ nodes = 1000, segments = 96 }: { nodes?: number; segments?: number }) {
  const { center, radius } = WORLD.planet;
  const planet = useRef<THREE.Group>(null);
  const sun = useRef<THREE.Sprite>(null);
  const sunGroup = useRef<THREE.Group>(null);
  const flare = useRef<THREE.Sprite>(null);
  const sunPos = useMemo(() => new THREE.Vector3(WORLD.sun.x, WORLD.sun.yHidden, WORLD.sun.z), []);

  const ground = useMemo(
    () =>
      new THREE.ShaderMaterial({
        defines: { OCTAVES: 4 },
        uniforms: { uSun: { value: sunPos }, uRise: { value: 0 }, uAtmo: { value: new THREE.Color("#7f95c4") } },
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
          uniform vec3 uSun;
          uniform float uRise;
          uniform vec3 uAtmo;
          varying vec3 vN;
          varying vec3 vW;
          varying vec3 vO;
          ${NOISE}
          void main() {
            vec3 N = normalize(vN);
            vec3 V = normalize(cameraPosition - vW);
            vec3 L = normalize(uSun - vW);
            float ndl = dot(N, L);
            float n = fbm(vO * 9.0);
            float m = fbm(vO * 34.0 + 4.0);
            vec3 ground = mix(vec3(0.0015, 0.0017, 0.0024), vec3(0.006, 0.0068, 0.009), smoothstep(-0.3, 0.6, n));
            ground *= 0.8 + 0.4 * m;
            float day = smoothstep(-0.12, 0.4, ndl);
            vec3 col = ground * (0.25 + day * 0.7);
            float fres = pow(1.0 - max(dot(N, V), 0.0), 16.0);
            float toward = smoothstep(-0.6, 0.5, ndl);
            // thin cool atmosphere line, warming toward the rising Sun
            col += uAtmo * fres * (0.05 + 0.3 * toward * (0.35 + 0.65 * uRise));
            col += vec3(1.0, 0.62, 0.28) * fres * toward * toward * uRise * 0.9;
            // warm sunrise wash along the horizon, strongest under the Sun
            float limb = pow(1.0 - max(dot(N, V), 0.0), 12.0);
            col += vec3(1.0, 0.55, 0.22) * limb * pow(max(dot(normalize(vec3(L.x, 0.0, L.z)), normalize(vec3(-V.x, 0.0, -V.z))), 0.0), 6.0) * uRise * 0.5;
            gl_FragColor = vec4(col, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
      }),
    [sunPos],
  );
  const atmo = useMemo(() => rimMaterial({ color: "#8aa0d0", intensity: 0.35, edge: 0.12, power: 2.2 }), []);
  const cities = useMemo(() => {
    const r = seeded(99);
    const facing = new THREE.Vector3(0, -28, -262).sub(new THREE.Vector3(...center)).normalize();
    const pos: number[] = [];
    const v = new THREE.Vector3();
    let guard = 0;
    while (pos.length / 3 < nodes && guard++ < nodes * 40) {
      v.set(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize();
      if (v.dot(facing) < 0.82) continue;
      if (Math.sin(v.x * 40) * Math.sin(v.z * 37) + Math.sin(v.y * 23 + v.x * 11) < 0.6 + r() * 0.6) continue;
      v.multiplyScalar(radius * 1.0015);
      pos.push(v.x, v.y, v.z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: new THREE.Color("#ffd7a3"), size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.35, fog: false, depthWrite: false, blending: THREE.AdditiveBlending });
    return { geo, mat };
  }, [nodes, radius, center]);
  useEffect(
    () => () => {
      ground.dispose();
      atmo.dispose();
      cities.geo.dispose();
      cities.mat.dispose();
    },
    [ground, atmo, cities],
  );

  useFrame((s) => {
    const a = easeOutCubic(rt.arrive.contact);
    if (planet.current) {
      planet.current.position.y = center[1] - (1 - a) * 170;
      planet.current.visible = a > 0.001;
    }
    const rise = easeOutCubic(Math.min(1, rt.arrive.contact * 0.7 + rt.inside.contact * 0.6));
    sunPos.y = THREE.MathUtils.lerp(WORLD.sun.yHidden, WORLD.sun.yRisen, rise);
    ground.uniforms.uRise.value = rise;
    atmo.uniforms.uIntensity.value = 0.18 + rise * 0.3;
    if (sunGroup.current) {
      sunGroup.current.position.copy(sunPos);
      sunGroup.current.visible = a > 0.01;
    }
    if (sun.current) (sun.current.material as THREE.SpriteMaterial).opacity = a;
    sunGroup.current?.children.slice(1).forEach((c) => ((c as THREE.Sprite).material.opacity = (c === sunGroup.current?.children[1] ? 0.55 : 0.2) * a * (0.5 + 0.5 * rise)));
    if (flare.current) {
      flare.current.position.copy(sunPos);
      (flare.current.material as THREE.SpriteMaterial).opacity = (0.05 + rise * 0.18) * a;
    }
    cities.mat.size = 1.4 * s.gl.getPixelRatio();
  });

  return (
    <>
      <group ref={planet} position={center}>
        <mesh material={ground}>
          <sphereGeometry args={[radius, segments, Math.round(segments * 0.66)]} />
        </mesh>
        <mesh material={atmo} scale={radius * 1.035}>
          <sphereGeometry args={[1, segments, Math.round(segments * 0.66)]} />
        </mesh>
        <points geometry={cities.geo} material={cities.mat} />
      </group>
      <group ref={sunGroup}>
        <sprite ref={sun} scale={90}>
          <spriteMaterial map={glowTexture()} color={new THREE.Color(2.4, 2.0, 1.5)} transparent toneMapped={false} fog={false} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
        <sprite scale={280}>
          <spriteMaterial map={glowTexture()} color="#ffb04a" transparent opacity={0.55} fog={false} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
        <sprite scale={620}>
          <spriteMaterial map={glowTexture()} color="#ff7a1f" transparent opacity={0.2} fog={false} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      </group>
      <sprite ref={flare} scale={[700, 16, 1]}>
        <spriteMaterial map={glowTexture()} color="#ffb870" transparent opacity={0.1} fog={false} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </>
  );
}
