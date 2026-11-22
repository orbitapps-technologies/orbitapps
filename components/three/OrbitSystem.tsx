"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { eccentricAnomaly, orbitPoint, type ResolvedOrbit } from "@/lib/orbits";
import { runtime, useUniverse } from "@/lib/universe";
import { Planet } from "./Planet";

const TAU = Math.PI * 2;

const ringVertex = /* glsl */ `
  attribute float aT;
  varying float vT;
  void main() {
    vT = aT;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ringFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uHead;
  uniform float uBase;
  uniform float uTrail;
  uniform float uDash;
  varying float vT;
  void main() {
    float d = fract(uHead - vT);                 // 0 at the planet, grows behind it
    float trail = exp(-d * 9.0) * uTrail;
    float dash = mix(1.0, step(0.5, fract(vT * 180.0)), uDash);
    float a = uBase * dash + trail;
    gl_FragColor = vec4(uColor + trail * 0.35, a);
  }
`;

const dustVertex = /* glsl */ `
  attribute float aOff;
  attribute vec3 aJit;
  uniform float uHead;
  uniform float uA;
  uniform float uB;
  uniform float uE;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSpread;
  varying float vAlpha;
  void main() {
    float E = (uHead - aOff * 0.075) * 6.2831853;
    vec3 pos = vec3(uA * (cos(E) - uE), 0.0, -uB * sin(E));
    pos += aJit * (0.04 + aOff * uSpread) * (0.8 + 0.2 * sin(uTime * 1.5 + aOff * 20.0));
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (1.2 + (1.0 - aOff) * 3.2) * uPixelRatio * (22.0 / -mv.z);
    vAlpha = pow(1.0 - aOff, 1.6) * 0.85;
  }
`;

const dustFragment = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    gl_FragColor = vec4(uColor, smoothstep(0.5, 0.0, d) * vAlpha);
  }
`;

export function OrbitSystem({ orbit, lowPower }: { orbit: ResolvedOrbit; lowPower: boolean }) {
  const isProduct = orbit.product !== null;
  const carrier = useRef<THREE.Group>(null);
  const clock = useRef(0);
  const dpr = useThree((s) => s.viewport.dpr);
  const hovered = useUniverse((s) => s.hoveredId === orbit.key || s.selectedId === orbit.key);

  const ring = useMemo(() => {
    const segments = 320;
    const pos = new Float32Array(segments * 3);
    const t = new Float32Array(segments);
    const p = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < segments; i++) {
      orbitPoint(orbit, (i / segments) * TAU, p);
      pos.set([p.x, p.y, p.z], i * 3);
      t[i] = i / segments;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aT", new THREE.BufferAttribute(t, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(orbit.color) },
        uHead: { value: 0 },
        uBase: { value: isProduct ? 0.32 : 0.14 },
        uTrail: { value: isProduct ? 0.9 : 0.35 },
        uDash: { value: isProduct ? 0 : 1 },
      },
      vertexShader: ringVertex,
      fragmentShader: ringFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.LineLoop(geo, mat);
  }, [orbit, isProduct]);

  const dustCount = lowPower ? 26 : 64;
  const dust = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const off = new Float32Array(dustCount);
    const jit = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      off[i] = i / dustCount;
      jit.set([Math.random() * 2 - 1, (Math.random() * 2 - 1) * 0.5, Math.random() * 2 - 1], i * 3);
    }
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(dustCount * 3), 3));
    geo.setAttribute("aOff", new THREE.BufferAttribute(off, 1));
    geo.setAttribute("aJit", new THREE.BufferAttribute(jit, 3));
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(isProduct ? orbit.product!.look.glow : "#A78BFA") },
        uHead: { value: 0 },
        uA: { value: orbit.radius },
        uB: { value: orbit.minor },
        uE: { value: orbit.eccentricity },
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uSpread: { value: isProduct ? 0.45 : 0.2 },
      },
      vertexShader: dustVertex,
      fragmentShader: dustFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    return pts;
  }, [orbit, isProduct, dustCount]);

  useEffect(
    () => () => {
      ring.geometry.dispose();
      (ring.material as THREE.Material).dispose();
      dust.geometry.dispose();
      (dust.material as THREE.Material).dispose();
    },
    [ring, dust],
  );

  const tmp = useMemo(() => ({ x: 0, y: 0, z: 0 }), []);

  useFrame((state, delta) => {
    clock.current += Math.min(delta, 0.1) * runtime.timeScale;
    const M = (((orbit.phase + clock.current / orbit.period) % 1) + 1) % 1;
    const E = eccentricAnomaly(M * TAU, orbit.eccentricity);
    const head = (((E / TAU) % 1) + 1) % 1;

    const rm = ring.material as THREE.ShaderMaterial;
    rm.uniforms.uHead.value = head;
    const baseTarget = (isProduct ? 0.32 : 0.14) * (hovered ? 1.8 : 1);
    rm.uniforms.uBase.value = THREE.MathUtils.damp(rm.uniforms.uBase.value, baseTarget, 5, delta);

    const dm = dust.material as THREE.ShaderMaterial;
    dm.uniforms.uHead.value = head;
    dm.uniforms.uTime.value = state.clock.elapsedTime;
    dm.uniforms.uPixelRatio.value = dpr;

    if (carrier.current) {
      orbitPoint(orbit, E, tmp);
      carrier.current.position.set(tmp.x, tmp.y, tmp.z);
    }
  });

  return (
    <group rotation={[0, orbit.node, 0]}>
      <group rotation={[orbit.inclination, 0, 0]}>
        <primitive object={ring} />
        <primitive object={dust} />
        <group ref={carrier}>
          {orbit.product ? (
            <Planet product={orbit.product} lowPower={lowPower} />
          ) : (
            <mesh>
              <sphereGeometry args={[0.07, 12, 12]} />
              <meshBasicMaterial color="#C4B5FD" transparent opacity={0.8} />
            </mesh>
          )}
        </group>
      </group>
    </group>
  );
}
