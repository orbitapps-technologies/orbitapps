"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { NOISE, seeded } from "./materials";

/** Graphite galactic band, dust lanes and one distant spiral galaxy, on a sphere that follows the camera. */
export function Nebula({ octaves = 4 }: { octaves?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        defines: { OCTAVES: octaves },
        uniforms: { uIntensity: { value: 0.55 } },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uIntensity;
          varying vec3 vDir;
          ${NOISE}
          void main() {
            vec3 d = normalize(vDir);
            vec3 bandN = normalize(vec3(0.42, 1.0, 0.18));
            float h = dot(d, bandN);
            float band = exp(-h * h / 0.05);
            float halo = exp(-h * h / 0.35);

            float n1 = fbm(d * 2.4);
            float n2 = fbm(d * 5.5 + 3.0);
            float clouds = smoothstep(-0.25, 0.75, n1);

            vec3 deep = vec3(0.012, 0.012, 0.014);
            vec3 slate = vec3(0.017, 0.017, 0.018);
            vec3 teal = vec3(0.009, 0.010, 0.011);

            vec3 col = mix(deep, slate, smoothstep(-0.4, 0.5, n2)) * clouds * band * 1.4;
            col += teal * smoothstep(0.25, 0.85, n1) * band;
            col *= 1.0 - smoothstep(0.05, 0.55, n2) * 0.6 * band;
            col += vec3(0.004, 0.004, 0.005) * halo;

            vec3 gDir = normalize(vec3(-0.6, 0.34, -0.72));
            float gd = dot(d, gDir);
            if (gd > 0.97) {
              vec3 gu = normalize(cross(gDir, vec3(0.0, 1.0, 0.0)));
              vec3 gv = cross(gu, gDir);
              vec2 q = vec2(dot(d, gu), dot(d, gv)) / 0.035;
              float ca = cos(0.6), sa = sin(0.6);
              q = mat2(ca, -sa, sa, ca) * q;
              q.y *= 2.6;
              float r = length(q);
              float th = atan(q.y, q.x);
              float arms = 0.5 + 0.5 * cos(2.0 * th - 5.0 * log(r + 0.08));
              float g = exp(-r * 2.4) * (0.25 + 0.75 * pow(arms, 3.0)) + exp(-r * 14.0) * 1.5;
              col += vec3(0.36, 0.36, 0.38) * g * 0.14;
            }

            col *= uIntensity;
            col += (hash12(gl_FragCoord.xy) - 0.5) / 255.0;
            gl_FragColor = vec4(max(col, 0.0), 1.0);
          }
        `,
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
      }),
    [octaves],
  );
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ camera }) => ref.current?.position.copy(camera.position));
  return (
    <mesh ref={ref} material={material} renderOrder={-100} frustumCulled={false}>
      <sphereGeometry args={[900, 48, 32]} />
    </mesh>
  );
}

/** Approximate camera path (z → y), so no star sits right in front of the lens. */
const PATH: [number, number][] = [
  [20, 0],
  [-72, -4],
  [-150, -14],
  [-205, -30],
  [-300, -29],
];
function pathY(z: number) {
  for (let i = 0; i < PATH.length - 1; i++) {
    const [z0, y0] = PATH[i];
    const [z1, y1] = PATH[i + 1];
    if (z <= z0 && z >= z1) return y0 + ((z - z0) / (z1 - z0)) * (y1 - y0);
  }
  return z > 0 ? 0 : -29;
}
function starTint(r: () => number): [number, number, number] {
  const t = r();
  return t < 0.68 ? [1, 1, 1] : t < 0.9 ? [0.78, 0.86, 1] : [1, 0.9, 0.8];
}

const NEAR_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uTwinkle;
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float dist = -mv.z;
    float s = aSize * 140.0 / max(dist, 0.001);
    float tw = 0.7 + 0.3 * sin(uTime * (0.5 + fract(aPhase * 7.13) * 1.6) + aPhase * 6.2831);
    float twinkle = mix(1.0, tw, uTwinkle * step(0.55, fract(aPhase * 3.7)));
    vAlpha = twinkle * clamp(s, 0.25, 1.0) * smoothstep(2.0, 14.0, dist) * (1.0 - smoothstep(300.0, 460.0, dist));
    vColor = aColor;
    gl_PointSize = clamp(s, 1.0, 3.4) * uPixelRatio;
    gl_Position = projectionMatrix * mv;
  }
`;
const FAR_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uTwinkle;
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float tw = 0.75 + 0.25 * sin(uTime * (0.3 + fract(aPhase * 5.1)) + aPhase * 6.2831);
    vAlpha = mix(1.0, tw, uTwinkle * step(0.5, fract(aPhase * 2.3)));
    vColor = aColor;
    gl_PointSize = aSize * uPixelRatio;
    gl_Position = projectionMatrix * mv;
  }
`;
const STAR_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = pow(smoothstep(0.5, 0.0, d), 1.7) * vAlpha;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vColor * a, a);
  }
`;
const starMaterial = (vert: string, reduced: boolean) =>
  new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 }, uTwinkle: { value: reduced ? 0 : 1 } },
    vertexShader: vert,
    fragmentShader: STAR_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

/** A field of near stars you fly through, plus a far shell that follows the camera. */
export function Stars({ count = 5000, farCount = 2000, reducedMotion = false }: { count?: number; farCount?: number; reducedMotion?: boolean }) {
  const gl = useThree((s) => s.gl);
  const far = useRef<THREE.Points>(null);

  const near = useMemo(() => {
    const r = seeded(1337);
    const pos: number[] = [];
    const size: number[] = [];
    const phase: number[] = [];
    const color: number[] = [];
    let guard = 0;
    while (size.length < count && guard++ < count * 4) {
      const x = (r() - 0.5) * 320;
      const y = (r() - 0.5) * 220 - 12;
      const z = 70 - r() * 540;
      if (Math.hypot(x, y - pathY(z)) < 9) continue;
      pos.push(x, y, z);
      size.push(0.5 + r() ** 3 * 2.2);
      phase.push(r());
      const [cr, cg, cb] = starTint(r);
      const b = 0.45 + r() ** 2 * 1.1;
      color.push(cr * b, cg * b, cb * b);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("aSize", new THREE.Float32BufferAttribute(size, 1));
    geo.setAttribute("aPhase", new THREE.Float32BufferAttribute(phase, 1));
    geo.setAttribute("aColor", new THREE.Float32BufferAttribute(color, 3));
    return { geo, mat: starMaterial(NEAR_VERT, reducedMotion) };
  }, [count, reducedMotion]);

  const shell = useMemo(() => {
    const r = seeded(7331);
    const pos = new Float32Array(farCount * 3);
    const size = new Float32Array(farCount);
    const phase = new Float32Array(farCount);
    const color = new Float32Array(farCount * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < farCount; i++) {
      v.set(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1);
      if (v.lengthSq() > 1 || v.lengthSq() < 0.01) {
        i--;
        continue;
      }
      v.normalize().multiplyScalar(800);
      pos.set([v.x, v.y, v.z], i * 3);
      size[i] = 0.8 + r() ** 4 * 1.6;
      phase[i] = r();
      const [cr, cg, cb] = starTint(r);
      const b = 0.2 + r() ** 2.5 * 0.85;
      color.set([cr * b, cg * b, cb * b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
    geo.setAttribute("aColor", new THREE.BufferAttribute(color, 3));
    return { geo, mat: starMaterial(FAR_VERT, reducedMotion) };
  }, [farCount, reducedMotion]);

  useEffect(() => () => {
    near.geo.dispose();
    near.mat.dispose();
  }, [near]);
  useEffect(() => () => {
    shell.geo.dispose();
    shell.mat.dispose();
  }, [shell]);

  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    const pr = gl.getPixelRatio();
    near.mat.uniforms.uTime.value = t;
    near.mat.uniforms.uPixelRatio.value = pr;
    shell.mat.uniforms.uTime.value = t;
    shell.mat.uniforms.uPixelRatio.value = pr;
    far.current?.position.copy(camera.position);
  });

  return (
    <>
      <points geometry={near.geo} material={near.mat} frustumCulled={false} />
      <points ref={far} geometry={shell.geo} material={shell.mat} frustumCulled={false} renderOrder={-50} />
    </>
  );
}
