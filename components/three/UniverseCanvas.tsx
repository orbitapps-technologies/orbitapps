"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr } from "@react-three/drei";
import * as THREE from "three";
import { gsap } from "gsap";
import { ORBITS } from "@/lib/orbits";
import { PRODUCTS } from "@/lib/products";
import { planetRegistry, runtime, selectProduct, universeStore } from "@/lib/universe";
import { Sun } from "./Sun";
import { OrbitSystem } from "./OrbitSystem";
import { Nebula, Starfield } from "./Backdrop";

const OVERVIEW = new THREE.Vector3(0, 8.5, 25);
const INTRO_FROM = new THREE.Vector3(0, 34, 82);
const UP = new THREE.Vector3(0, 1, 0);
const FOV = 42;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smoothstep = (a: number, b: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Tilt + yaw of the whole system, driven by drag/touch with inertia and limits. */
function useDragRotation() {
  const gl = useThree((s) => s.gl);
  const state = useRef({ yaw: 0, pitch: 0, targetYaw: 0, targetPitch: 0, down: false, lastX: 0, lastY: 0, vel: 0 });

  useEffect(() => {
    const el = gl.domElement;
    const s = state.current;
    const onDown = (e: PointerEvent) => {
      s.down = true;
      s.lastX = e.clientX;
      s.lastY = e.clientY;
      s.vel = 0;
      runtime.dragDistance = 0;
    };
    const onMove = (e: PointerEvent) => {
      runtime.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      runtime.pointerY = -((e.clientY / window.innerHeight) * 2 - 1);
      if (!s.down) return;
      const dx = e.clientX - s.lastX;
      const dy = e.clientY - s.lastY;
      s.lastX = e.clientX;
      s.lastY = e.clientY;
      runtime.dragDistance += Math.abs(dx) + Math.abs(dy);
      s.vel = dx * 0.004;
      s.targetYaw = THREE.MathUtils.clamp(s.targetYaw + dx * 0.004, -0.95, 0.95);
      if (e.pointerType === "mouse") {
        s.targetPitch = THREE.MathUtils.clamp(s.targetPitch + dy * 0.0025, -0.22, 0.32);
      }
    };
    const onUp = () => {
      s.down = false;
    };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [gl]);

  return state;
}

function Universe({ lowPower }: { lowPower: boolean }) {
  const system = useRef<THREE.Group>(null);
  const drag = useDragRotation();
  const focus = useRef(0);
  const lastFocusId = useRef<string | null>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const tmp = useMemo(
    () => ({
      planet: new THREE.Vector3(),
      outward: new THREE.Vector3(),
      tangent: new THREE.Vector3(),
      focusPos: new THREE.Vector3(),
      basePos: new THREE.Vector3(),
      look: new THREE.Vector3(),
      baseLook: new THREE.Vector3(0, 0.3, 0),
    }),
    [],
  );

  // Cinematic reveal: the camera glides in from deep space.
  useEffect(() => {
    if (runtime.reducedMotion) {
      runtime.intro = 1;
      return;
    }
    runtime.intro = 0;
    const tween = gsap.to(runtime, { intro: 1, duration: 3.6, delay: 0.15, ease: "power2.inOut" });
    return () => {
      tween.kill();
    };
  }, []);

  useFrame((state, delta) => {
    const cam = state.camera as THREE.PerspectiveCamera;
    const { width, height } = state.size;
    const d = Math.min(delta, 0.1);

    // Responsive scale: keep the Lookzon orbit comfortably on screen.
    const halfW = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * OVERVIEW.length() * (width / height);
    const targetScale = THREE.MathUtils.clamp(halfW / 12.8, 0.46, 1);

    // Drag rotation with inertia; ease back toward centre when idle.
    const s = drag.current;
    if (!s.down) {
      s.targetYaw = THREE.MathUtils.clamp(s.targetYaw + s.vel, -0.95, 0.95);
      s.vel *= 0.92;
    }
    s.yaw = THREE.MathUtils.damp(s.yaw, s.targetYaw, 4, d);
    s.pitch = THREE.MathUtils.damp(s.pitch, s.targetPitch, 4, d);
    if (system.current) {
      const g = system.current;
      g.rotation.y = s.yaw;
      g.rotation.x = s.pitch;
      g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, targetScale, 3, d));
    }

    // Focus: either a clicked planet, or the scroll story (scene 2).
    const selected = universeStore.get().selectedId;
    const scrollFocus = smoothstep(0.32, 0.72, runtime.scroll);
    const focusId = selected ?? (scrollFocus > 0.001 ? PRODUCTS[0]?.id ?? null : null);
    if (focusId) lastFocusId.current = focusId;
    focus.current = THREE.MathUtils.damp(focus.current, selected ? 1 : scrollFocus, selected ? 2.4 : 5, d);
    const f = ease(THREE.MathUtils.clamp(focus.current, 0, 1));

    const slow = runtime.reducedMotion ? 0.3 : 1;
    runtime.timeScale = THREE.MathUtils.damp(runtime.timeScale, (f > 0.4 ? 0.1 : 1) * slow, 3, d);

    // Smoothed pointer parallax.
    pointer.current.x = THREE.MathUtils.damp(pointer.current.x, runtime.pointerX, 2.5, d);
    pointer.current.y = THREE.MathUtils.damp(pointer.current.y, runtime.pointerY, 2.5, d);

    // Overview camera (with intro flight).
    tmp.basePos.copy(INTRO_FROM).lerp(OVERVIEW, ease(runtime.intro));
    tmp.basePos.x += pointer.current.x * 1.6;
    tmp.basePos.y += pointer.current.y * 0.9;
    tmp.look.copy(tmp.baseLook);

    const planet = lastFocusId.current ? planetRegistry.get(lastFocusId.current) : undefined;
    if (planet && f > 0.0005) {
      planet.getWorldPosition(tmp.planet);
      const product = PRODUCTS.find((p) => p.id === lastFocusId.current);
      const scale = system.current?.scale.x ?? 1;
      const dist = (product?.look.size ?? 1) * scale * (width < 768 ? 9 : 7);
      tmp.outward.copy(tmp.planet).setY(0);
      if (tmp.outward.lengthSq() < 1e-4) tmp.outward.set(1, 0, 0);
      tmp.outward.normalize();
      tmp.tangent.crossVectors(UP, tmp.outward).normalize();
      tmp.focusPos
        .copy(tmp.planet)
        .addScaledVector(tmp.tangent, dist * 0.92)
        .addScaledVector(tmp.outward, -dist * 0.32)
        .addScaledVector(UP, dist * 0.3);
      tmp.focusPos.x += pointer.current.x * dist * 0.06;
      tmp.focusPos.y += pointer.current.y * dist * 0.04;
      tmp.basePos.lerp(tmp.focusPos, f);
      tmp.look.lerp(tmp.planet, f);
    }

    cam.position.copy(tmp.basePos);
    cam.lookAt(tmp.look);

    // Shift the framing so the focused planet sits beside the details panel.
    if (f > 0.001) {
      if (width >= 768) cam.setViewOffset(width, height, f * width * 0.17, 0, width, height);
      else cam.setViewOffset(width, height, 0, f * height * 0.2, width, height);
    } else if (cam.view?.enabled) {
      cam.clearViewOffset();
    }
  });

  return (
    <>
      <Nebula lowPower={lowPower} />
      <Starfield count={lowPower ? 1100 : 2600} />
      <group ref={system}>
        <Sun lowPower={lowPower} />
        {ORBITS.map((o) => (
          <OrbitSystem key={o.key} orbit={o} lowPower={lowPower} />
        ))}
      </group>
    </>
  );
}

export default function UniverseCanvas({
  lowPower,
  paused,
  onReady,
}: {
  lowPower: boolean;
  paused: boolean;
  onReady?: () => void;
}) {
  return (
    <Canvas
      style={{ position: "absolute", inset: 0, touchAction: "pan-y" }}
      dpr={lowPower ? [1, 1.3] : [1, 1.75]}
      frameloop={paused ? "never" : "always"}
      gl={{ antialias: !lowPower, alpha: false, powerPreference: "high-performance" }}
      camera={{ fov: FOV, near: 0.1, far: 900, position: INTRO_FROM.toArray() }}
      onCreated={({ gl }) => {
        gl.setClearColor("#03050D");
        onReady?.();
      }}
      onPointerMissed={() => {
        if (runtime.dragDistance < 6) selectProduct(null);
      }}
      aria-label="Interactive 3D model of the OrbitApps product universe"
    >
      <Suspense fallback={null}>
        <Universe lowPower={lowPower} />
      </Suspense>
      <AdaptiveDpr pixelated={false} />
    </Canvas>
  );
}
