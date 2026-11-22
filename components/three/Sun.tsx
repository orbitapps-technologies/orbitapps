"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Billboard, Html } from "@react-three/drei";
import * as THREE from "three";
import { noiseGLSL } from "@/lib/shaders/noise";
import { SUN_RADIUS } from "@/lib/orbits";
import { runtime, selectProduct, useUniverse } from "@/lib/universe";

const surfaceVertex = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vNormalV;
  varying vec3 vViewPos;
  void main() {
    vPos = position;
    vNormalV = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const surfaceFragment = /* glsl */ `
  uniform float uTime;
  uniform float uPulse;
  varying vec3 vPos;
  varying vec3 vNormalV;
  varying vec3 vViewPos;
  ${noiseGLSL}
  void main() {
    vec3 p = normalize(vPos);
    float n1 = fbm(p * 2.2 + vec3(0.0, uTime * 0.04, uTime * 0.02));
    float n2 = fbm(p * 6.5 + vec3(uTime * 0.07, -uTime * 0.05, 0.0));
    float cells = 1.0 - abs(snoise(p * 12.0 + uTime * 0.12));
    float t = clamp(0.5 + n1 * 0.6 + n2 * 0.3, 0.0, 1.0);

    vec3 deep = vec3(0.80, 0.24, 0.02);
    vec3 gold = vec3(1.00, 0.70, 0.28);
    vec3 hot  = vec3(1.00, 0.94, 0.76);
    vec3 col = mix(deep, gold, smoothstep(0.12, 0.62, t));
    col = mix(col, hot, smoothstep(0.62, 0.95, t) * 0.8);
    col += gold * pow(cells, 6.0) * 0.22;

    float mu = clamp(dot(normalize(vNormalV), normalize(-vViewPos)), 0.0, 1.0);
    col *= mix(0.6, 1.12, pow(mu, 0.5));                       // limb darkening
    col += vec3(1.0, 0.52, 0.12) * pow(1.0 - mu, 2.5) * 0.5;   // warm rim
    gl_FragColor = vec4(col * uPulse, 1.0);
  }
`;

const coronaVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const coronaFragment = /* glsl */ `
  uniform float uTime;
  uniform float uInner;
  uniform float uIntensity;
  uniform float uRayScale;
  uniform vec3 uColor;
  varying vec2 vUv;
  ${noiseGLSL}
  void main() {
    vec2 c = vUv - 0.5;
    float d = length(c) * 2.0;
    float ang = atan(c.y, c.x);
    vec2 ring = vec2(cos(ang), sin(ang));
    float rays  = 0.5 + 0.5 * snoise(vec3(ring * uRayScale, uTime * 0.12));
    float rays2 = 0.5 + 0.5 * snoise(vec3(ring * uRayScale * 2.7, uTime * 0.21 + 4.0));
    float g = clamp((1.0 - d) / (1.0 - uInner), 0.0, 1.0);
    float glow = pow(g, 2.8) * (0.5 + 0.5 * rays) + pow(g, 7.0) * (0.4 + 0.6 * rays2);
    gl_FragColor = vec4(uColor, glow * uIntensity);
  }
`;

const flareVertex = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uRadius;
  uniform float uPixelRatio;
  varying float vAlpha;
  void main() {
    float life = fract(uTime * 0.05 * (0.6 + aSeed) + aSeed * 7.0);
    vec3 dir = normalize(position);
    vec3 pos = dir * uRadius * (1.03 + life * 0.85);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (2.0 + aSeed * 3.5) * uPixelRatio * (20.0 / -mv.z);
    vAlpha = sin(life * 3.14159) * 0.75;
  }
`;

const flareFragment = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vAlpha;
    gl_FragColor = vec4(1.0, 0.74, 0.38, a);
  }
`;

function makeCorona(size: number, color: string, intensity: number, rayScale: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uInner: { value: (SUN_RADIUS * 0.92) / (size / 2) },
      uIntensity: { value: intensity },
      uRayScale: { value: rayScale },
      uColor: { value: new THREE.Color(color) },
    },
    vertexShader: coronaVertex,
    fragmentShader: coronaFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    defines: { FBM_OCTAVES: 1 },
  });
}

export function Sun({ lowPower }: { lowPower: boolean }) {
  const surfaceRef = useRef<THREE.Mesh>(null);
  const dpr = useThree((s) => s.viewport.dpr);
  const focused = useUniverse((s) => s.selectedId !== null);

  const surface = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uPulse: { value: 1 } },
        vertexShader: surfaceVertex,
        fragmentShader: surfaceFragment,
        defines: { FBM_OCTAVES: lowPower ? 3 : 5 },
      }),
    [lowPower],
  );

  const innerSize = SUN_RADIUS * 3.4;
  const outerSize = SUN_RADIUS * 7.5;
  const inner = useMemo(() => makeCorona(innerSize, "#FFB347", 0.85, 2.4), [innerSize]);
  const outer = useMemo(() => makeCorona(outerSize, "#FF7A1A", 0.32, 1.6), [outerSize]);

  const flareCount = lowPower ? 160 : 420;
  const flares = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(flareCount * 3);
    const seed = new Float32Array(flareCount);
    for (let i = 0; i < flareCount; i++) {
      const u = Math.random() * 2 - 1;
      const th = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      pos.set([r * Math.cos(th), u, r * Math.sin(th)], i * 3);
      seed[i] = Math.random();
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uRadius: { value: SUN_RADIUS },
        uPixelRatio: { value: 1 },
      },
      vertexShader: flareVertex,
      fragmentShader: flareFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    return points;
  }, [flareCount]);

  useEffect(
    () => () => {
      surface.dispose();
      inner.dispose();
      outer.dispose();
      flares.geometry.dispose();
      (flares.material as THREE.Material).dispose();
    },
    [surface, inner, outer, flares],
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const pulse = 1 + Math.sin(t * 1.3) * 0.035;
    surface.uniforms.uTime.value = t;
    surface.uniforms.uPulse.value = pulse;
    inner.uniforms.uTime.value = t;
    outer.uniforms.uTime.value = t * 0.7;
    inner.uniforms.uIntensity.value = 0.85 * (0.94 + Math.sin(t * 1.3) * 0.06);
    outer.uniforms.uIntensity.value = 0.32 * (0.9 + Math.sin(t * 0.6 + 1) * 0.1);
    const fm = flares.material as THREE.ShaderMaterial;
    fm.uniforms.uTime.value = t;
    fm.uniforms.uPixelRatio.value = dpr;
    if (surfaceRef.current) {
      surfaceRef.current.rotation.y += delta * (runtime.reducedMotion ? 0.01 : 0.035);
    }
  });

  return (
    <group>
      <mesh
        ref={surfaceRef}
        material={surface}
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta < 6) selectProduct(null);
        }}
      >
        <sphereGeometry args={[SUN_RADIUS, lowPower ? 48 : 96, lowPower ? 48 : 96]} />
      </mesh>
      <Billboard>
        <mesh material={outer} renderOrder={1}>
          <planeGeometry args={[outerSize, outerSize]} />
        </mesh>
        <mesh material={inner} renderOrder={2}>
          <planeGeometry args={[innerSize, innerSize]} />
        </mesh>
      </Billboard>
      <primitive object={flares} />
      <Html center position={[0, -SUN_RADIUS * 1.55, 0]} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
        <div
          className="font-wide select-none whitespace-nowrap text-center text-[11px] tracking-[0.32em] text-solar/80 transition-opacity duration-700"
          style={{ opacity: focused ? 0 : 1 }}
          aria-hidden
        >
          OrbitApps
        </div>
      </Html>
    </group>
  );
}
