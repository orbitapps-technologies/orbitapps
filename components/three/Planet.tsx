"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Billboard, Html } from "@react-three/drei";
import * as THREE from "three";
import { noiseGLSL } from "@/lib/shaders/noise";
import type { Product } from "@/lib/products";
import { hoverProduct, planetRegistry, runtime, selectProduct, useUniverse } from "@/lib/universe";

const vertex = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vWorldPos;
  varying vec3 vNormalW;
  void main() {
    vPos = position;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const surfaceFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uDeep;
  uniform vec3 uGlow;
  uniform float uTime;
  uniform float uHover;
  varying vec3 vPos;
  varying vec3 vWorldPos;
  varying vec3 vNormalW;
  ${noiseGLSL}
  void main() {
    vec3 p = normalize(vPos);
    float swirl = fbm(p * 3.2 + vec3(uTime * 0.025, 0.0, uTime * 0.01));
    float bands = sin(p.y * 8.0 + swirl * 3.2);
    float t = 0.5 + bands * 0.28 + swirl * 0.45;
    vec3 col = mix(uDeep, uColor, smoothstep(0.15, 0.85, t));
    col = mix(col, uGlow, smoothstep(0.78, 1.05, t) * 0.55);

    vec3 N = normalize(vNormalW);
    vec3 L = normalize(-vWorldPos);              // the Sun sits at the origin
    vec3 V = normalize(cameraPosition - vWorldPos);
    float ndl = dot(N, L);
    float diff = smoothstep(-0.2, 1.0, ndl);

    // Night side: a sparse field of softly pulsing location pings.
    vec2 uv = vec2(atan(p.z, p.x) / 6.2831853 + 0.5, acos(clamp(p.y, -1.0, 1.0)) / 3.14159);
    vec2 grid = uv * vec2(46.0, 23.0);
    vec2 cell = floor(grid);
    vec2 f = fract(grid) - 0.5;
    float rnd = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
    float ping = step(0.9, rnd) * smoothstep(0.2, 0.0, length(f)) * (0.5 + 0.5 * sin(uTime * 2.0 + rnd * 40.0));
    float night = 1.0 - smoothstep(-0.25, 0.15, ndl);

    vec3 lit = col * (0.05 + diff * 1.05);
    lit += uGlow * ping * night * 0.9;
    lit += pow(max(dot(reflect(-L, N), V), 0.0), 28.0) * 0.22 * step(0.0, ndl);
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    lit += uGlow * fres * (0.3 + 0.7 * clamp(ndl + 0.35, 0.0, 1.0)) * (0.55 + uHover * 0.9);
    gl_FragColor = vec4(lit, 1.0);
  }
`;

const atmosphereFragment = /* glsl */ `
  uniform vec3 uGlow;
  uniform float uHover;
  varying vec3 vWorldPos;
  varying vec3 vNormalW;
  void main() {
    vec3 V = normalize(cameraPosition - vWorldPos);
    float rim = pow(clamp(-dot(normalize(vNormalW), V), 0.0, 1.0), 1.7);
    gl_FragColor = vec4(uGlow, rim * (0.75 + uHover * 0.8));
  }
`;

export function Planet({ product, lowPower }: { product: Product; lowPower: boolean }) {
  const { look } = product;
  const body = useRef<THREE.Mesh>(null);
  const anchor = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const selected = useUniverse((s) => s.selectedId === product.id);
  const legendHover = useUniverse((s) => s.hoveredId === product.id);
  const active = hovered || legendHover;

  const surface = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(look.color) },
          uDeep: { value: new THREE.Color(look.deep) },
          uGlow: { value: new THREE.Color(look.glow) },
          uTime: { value: 0 },
          uHover: { value: 0 },
        },
        vertexShader: vertex,
        fragmentShader: surfaceFragment,
        defines: { FBM_OCTAVES: lowPower ? 3 : 4 },
      }),
    [look, lowPower],
  );

  const atmosphere = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uGlow: { value: new THREE.Color(look.glow) }, uHover: { value: 0 } },
        vertexShader: vertex,
        fragmentShader: atmosphereFragment,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [look],
  );

  const hitMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
    [],
  );

  useEffect(() => {
    const node = anchor.current;
    if (node) planetRegistry.set(product.id, node);
    return () => {
      planetRegistry.delete(product.id);
      surface.dispose();
      atmosphere.dispose();
      hitMaterial.dispose();
    };
  }, [product.id, surface, atmosphere, hitMaterial]);

  useFrame((state, delta) => {
    const target = active || selected ? 1 : 0;
    const h = THREE.MathUtils.damp(surface.uniforms.uHover.value, target, 6, delta);
    surface.uniforms.uHover.value = h;
    atmosphere.uniforms.uHover.value = h;
    surface.uniforms.uTime.value = state.clock.elapsedTime;
    if (body.current) {
      body.current.rotation.y += delta * (runtime.reducedMotion ? 0.05 : 0.22);
      const s = 1 + h * 0.12;
      body.current.scale.setScalar(s);
    }
    if (halo.current) {
      const m = halo.current.material as THREE.MeshBasicMaterial;
      const pulse = 0.75 + Math.sin(state.clock.elapsedTime * 2.4) * 0.25;
      m.opacity = THREE.MathUtils.damp(m.opacity, selected ? 0.7 * pulse : active ? 0.35 : 0, 5, delta);
    }
  });

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    hoverProduct(product.id);
    document.body.style.cursor = "pointer";
  };
  const onOut = () => {
    setHovered(false);
    hoverProduct(null);
    document.body.style.cursor = "";
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return; // that was a drag, not a click
    selectProduct(product.id);
  };

  return (
    <group ref={anchor}>
      <group rotation={[0, 0, 0.41]}>
        <mesh ref={body} material={surface}>
          <sphereGeometry args={[look.size, lowPower ? 40 : 64, lowPower ? 40 : 64]} />
        </mesh>
      </group>
      <mesh material={atmosphere} scale={1.24}>
        <sphereGeometry args={[look.size, 48, 48]} />
      </mesh>
      {/* Generous invisible hit area so the planet is easy to tap */}
      <mesh
        material={hitMaterial}
        onPointerOver={onOver}
        onPointerOut={onOut}
        onClick={onClick}
      >
        <sphereGeometry args={[look.size * 1.9, 16, 16]} />
      </mesh>
      <Billboard>
        <mesh ref={halo}>
          <ringGeometry args={[look.size * 1.55, look.size * 1.6, 96]} />
          <meshBasicMaterial
            color={look.glow}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </Billboard>
      <Html center position={[0, look.size * 2.15, 0]} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <div
          className="flex select-none flex-col items-center gap-1 whitespace-nowrap transition-all duration-500"
          style={{ opacity: selected ? 0 : 1, transform: `translateY(${active ? -4 : 0}px)` }}
          aria-hidden
        >
          <span
            className="font-wide text-[13px] tracking-[0.28em] text-sky-200 transition-[text-shadow] duration-500"
            style={{ textShadow: active ? "0 0 18px rgba(56,189,248,0.9)" : "0 0 10px rgba(56,189,248,0.35)" }}
          >
            {product.name.toUpperCase()}
          </span>
          <span
            className="text-[11px] text-slate-300 transition-opacity duration-300"
            style={{ opacity: active ? 1 : 0 }}
          >
            Tap to explore
          </span>
        </div>
      </Html>
    </group>
  );
}
