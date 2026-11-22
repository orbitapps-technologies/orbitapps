"use client";

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { noiseGLSL } from "@/lib/shaders/noise";
import { runtime } from "@/lib/universe";

const starVertex = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float tw = 0.65 + 0.35 * sin(uTime * (0.6 + aSeed * 1.8) + aSeed * 60.0);
    gl_PointSize = aSize * uPixelRatio * (140.0 / -mv.z);
    vAlpha = tw;
    vColor = aColor;
  }
`;

const starFragment = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float core = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor, core * core * vAlpha);
  }
`;

export function Starfield({ count }: { count: number }) {
  const dpr = useThree((s) => s.viewport.dpr);
  const points = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const seed = new Float32Array(count);
    const color = new Float32Array(count * 3);
    const palette = [new THREE.Color("#F8FAFC"), new THREE.Color("#BAE6FD"), new THREE.Color("#FDE3B5"), new THREE.Color("#C4B5FD")];
    for (let i = 0; i < count; i++) {
      const u = Math.random() * 2 - 1;
      const th = Math.random() * Math.PI * 2;
      const r = 90 + Math.random() * 150;
      const s = Math.sqrt(1 - u * u);
      pos.set([r * s * Math.cos(th), r * u, r * s * Math.sin(th)], i * 3);
      size[i] = Math.pow(Math.random(), 3) * 2.6 + 0.6;
      seed[i] = Math.random();
      const c = palette[Math.random() < 0.7 ? 0 : 1 + Math.floor(Math.random() * 3)];
      color.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    geo.setAttribute("aColor", new THREE.BufferAttribute(color, 3));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
      vertexShader: starVertex,
      fragmentShader: starFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const p = new THREE.Points(geo, mat);
    p.frustumCulled = false;
    return p;
  }, [count]);

  useEffect(
    () => () => {
      points.geometry.dispose();
      (points.material as THREE.Material).dispose();
    },
    [points],
  );

  useFrame((state, delta) => {
    const m = points.material as THREE.ShaderMaterial;
    m.uniforms.uTime.value = state.clock.elapsedTime;
    m.uniforms.uPixelRatio.value = dpr;
    points.rotation.y += delta * (runtime.reducedMotion ? 0.001 : 0.006);
  });

  return <primitive object={points} />;
}

const nebulaVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const nebulaFragment = /* glsl */ `
  uniform float uTime;
  varying vec3 vDir;
  ${noiseGLSL}
  void main() {
    vec3 d = normalize(vDir);
    float n = fbm(d * 2.1 + vec3(0.0, uTime * 0.004, 0.0));
    float m = fbm(d * 4.3 - vec3(uTime * 0.003, 0.0, 0.0) + 7.0);
    vec3 bg = vec3(0.012, 0.02, 0.05);
    vec3 purple = vec3(0.427, 0.29, 1.0);
    vec3 blue = vec3(0.22, 0.74, 0.97);
    float pa = smoothstep(0.05, 0.75, n) * 0.16;
    float ba = smoothstep(0.15, 0.85, m) * 0.08;
    // Keep the band of the galaxy roughly behind the system.
    float band = exp(-pow(d.y * 2.2 + 0.25, 2.0));
    vec3 col = bg + purple * pa * band + blue * ba * band;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function Nebula({ lowPower }: { lowPower: boolean }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: nebulaVertex,
        fragmentShader: nebulaFragment,
        side: THREE.BackSide,
        depthWrite: false,
        defines: { FBM_OCTAVES: lowPower ? 3 : 4 },
      }),
    [lowPower],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame((state) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime;
  });
  return (
    <mesh material={mat} renderOrder={-10}>
      <sphereGeometry args={[320, 32, 32]} />
    </mesh>
  );
}
