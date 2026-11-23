"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ellipsePoints, starfield, traceLoop } from "@/lib/shaders";
import { Sun } from "./Sun";

/** Hero: the OrbitApps Sun with three fine orbit rings and a starfield. */
function Scene({ lowPower }: { lowPower: boolean }) {
  const group = useRef<THREE.Group>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const intro = useRef(0);
  const dpr = useThree((s) => s.viewport.dpr);

  const stars = useMemo(() => starfield(lowPower ? 800 : 1800, 18, 70), [lowPower]);
  const rings = useMemo(
    () => [
      traceLoop(ellipsePoints(3.1, 3.1, 320), "#FFE2B0", 0.32, 1.4, 6),
      traceLoop(ellipsePoints(4.2, 4.2, 360), "#ffffff", 0.2, 1.1, 8),
      traceLoop(ellipsePoints(5.4, 5.4, 400), "#ffffff", 0.1, 0.8, 11),
    ],
    [],
  );
  useEffect(
    () => () => {
      [stars, ...rings].forEach((o) => {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      });
    },
    [stars, rings],
  );
  useEffect(() => {
    const move = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.1);
    const t = state.clock.elapsedTime;
    intro.current = Math.min(1, intro.current + d / 2.4);
    const e = 1 - Math.pow(1 - intro.current, 3);
    const sm = stars.material as THREE.ShaderMaterial;
    sm.uniforms.uTime.value = t;
    sm.uniforms.uPixelRatio.value = dpr;
    rings.forEach((r, i) => {
      const m = r.material as THREE.ShaderMaterial;
      m.uniforms.uHead.value = (t * [0.06, -0.04, 0.03][i]) % 1;
      m.uniforms.uOpacity.value = THREE.MathUtils.smoothstep(intro.current, 0.15 + i * 0.15, 1);
    });
    if (group.current) {
      group.current.scale.setScalar(0.8 + e * 0.2);
      group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, pointer.current.y * 0.12, 2, d);
      group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, pointer.current.x * 0.2, 2, d);
    }
    const cam = state.camera as THREE.PerspectiveCamera;
    const { width, height } = state.size;
    if (width >= 1024) cam.setViewOffset(width, height, -width * 0.22, 0, width, height);
    else cam.setViewOffset(width, height, 0, height * 0.2, width, height);
  });

  return (
    <>
      <primitive object={stars} />
      <group ref={group}>
        <Sun radius={1.5} />
        <group rotation={[1.2, 0, -0.25]}>
          <primitive object={rings[0]} />
        </group>
        <group rotation={[1.35, 0.25, 0.3]}>
          <primitive object={rings[1]} />
        </group>
        <group rotation={[1.1, -0.35, 0.1]}>
          <primitive object={rings[2]} />
        </group>
      </group>
    </>
  );
}

export default function HeroSun({ lowPower, paused }: { lowPower: boolean; paused: boolean }) {
  return (
    <Canvas
      style={{ position: "absolute", inset: 0 }}
      dpr={lowPower ? [1, 1.5] : [1, 2]}
      frameloop={paused ? "never" : "always"}
      gl={{ antialias: true, alpha: true }}
      camera={{ fov: 38, near: 0.1, far: 200, position: [0, 0, 15] }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <Scene lowPower={lowPower} />
    </Canvas>
  );
}
