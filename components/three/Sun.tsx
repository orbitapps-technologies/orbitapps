"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import { glowMaterial, noiseGLSL } from "@/lib/shaders";

const vertex = /* glsl */ `
  varying vec3 vP; varying vec3 vN; varying vec3 vV;
  void main() {
    vP = position;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vN = normalize(mat3(modelMatrix) * normal);
    vV = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const fragment = /* glsl */ `
  uniform float uTime;
  varying vec3 vP; varying vec3 vN; varying vec3 vV;
  ${noiseGLSL}
  void main() {
    vec3 p = normalize(vP);
    float n1 = fbm(p * 2.4 + vec3(0.0, uTime * 0.035, uTime * 0.02));
    float n2 = fbm(p * 7.0 - vec3(uTime * 0.05, 0.0, uTime * 0.03));
    float t = clamp(0.55 + n1 * 0.55 + n2 * 0.25, 0.0, 1.0);
    vec3 col = mix(vec3(0.85, 0.32, 0.05), vec3(1.0, 0.7, 0.3), smoothstep(0.15, 0.6, t));
    col = mix(col, vec3(1.0, 0.96, 0.84), smoothstep(0.55, 0.95, t));
    float mu = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
    col *= mix(0.55, 1.15, pow(mu, 0.5));
    col += vec3(1.0, 0.55, 0.15) * pow(1.0 - mu, 2.0) * 0.6;
    gl_FragColor = vec4(col, 1.0);
  }
`;

/** The OrbitApps Sun: a living surface, a warm corona and a soft outer glow. */
export function Sun({ radius = 1.45, glow = 1 }: { radius?: number; glow?: number }) {
  const body = useRef<THREE.Mesh>(null);
  const surface = useMemo(
    () => new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 } }, vertexShader: vertex, fragmentShader: fragment, defines: { FBM_OCTAVES: 4 } }),
    [],
  );
  const inner = useMemo(() => glowMaterial("#FFE2B0", 0.8 * glow, 1.8), [glow]);
  const outer = useMemo(() => glowMaterial("#FF9A3C", 0.3 * glow, 2.6), [glow]);
  useEffect(
    () => () => {
      surface.dispose();
      inner.dispose();
      outer.dispose();
    },
    [surface, inner, outer],
  );
  useFrame((state, d) => {
    const t = state.clock.elapsedTime;
    surface.uniforms.uTime.value = t;
    inner.uniforms.uIntensity.value = (0.8 + Math.sin(t * 1.2) * 0.05) * glow;
    if (body.current) body.current.rotation.y += d * 0.04;
  });
  return (
    <group>
      <Billboard>
        <mesh material={outer}>
          <planeGeometry args={[radius * 10, radius * 10]} />
        </mesh>
        <mesh material={inner}>
          <planeGeometry args={[radius * 3.4, radius * 3.4]} />
        </mesh>
      </Billboard>
      <mesh ref={body} material={surface}>
        <sphereGeometry args={[radius, 96, 96]} />
      </mesh>
    </group>
  );
}
