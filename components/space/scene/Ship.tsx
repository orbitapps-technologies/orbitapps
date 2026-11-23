"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { intro } from "@/lib/space/store";
import { glowTexture, seeded } from "./materials";

const TRAIL = 200;
const TRAIL_LIFE = 1.4;
const WAKE = 48;

/** A point in front of the camera, at screen coords (x, y) and `dist` deep. */
function ahead(cam: THREE.Camera, x: number, y: number, dist: number) {
  const dir = new THREE.Vector3(x, y, 0.5).unproject(cam).sub(cam.position).normalize();
  return cam.position.clone().addScaledVector(dir, dist);
}
/** A point in the camera's local space. */
const local = (cam: THREE.Camera, x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(cam.matrixWorld);

function trailMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uPixelRatio;
      attribute float aBirth;
      varying float vA;
      void main() {
        float age = uTime - aBirth;
        float life = clamp(1.0 - age / ${TRAIL_LIFE.toFixed(1)}, 0.0, 1.0);
        vA = life * life;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = clamp((0.6 + 2.4 * life) * 22.0 / -mv.z, 0.0, 10.0) * uPixelRatio;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vA;
        if (a < 0.003) discard;
        gl_FragColor = vec4(vec3(1.7, 1.72, 1.78) * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

function wakeMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float aT;
      varying float vT;
      void main() { vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying float vT;
      void main() {
        float a = vT * vT * uOpacity;
        gl_FragColor = vec4(vec3(1.4) * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

function streakMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uWarp: { value: 0 } },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uWarp;
      attribute float aEnd;
      attribute float aSeed;
      varying float vA;
      void main() {
        vec3 p = position;
        float z = mod(p.z + uTime * 120.0 * (0.6 + aSeed * 0.8), 160.0) - 165.0;
        p.z = z + aEnd * uWarp * (3.0 + aSeed * 9.0);
        vA = 0.5 * uWarp * aEnd * smoothstep(-165.0, -110.0, z) * (1.0 - smoothstep(-24.0, -6.0, z)) * (0.3 + aSeed * 0.7);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() { gl_FragColor = vec4(vec3(0.9) * vA, vA); }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/** The launch: a small craft streaks past the lens, then the camera drops out of warp onto the core. */
export function Ship({ lite = false }: { lite?: boolean }) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const [done, setDone] = useState(intro.mode !== "full");
  const ship = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const glow = useRef<THREE.Sprite>(null);
  const streaks = useRef<THREE.LineSegments>(null);
  const st = useRef({ path: null as THREE.CatmullRomCurve3 | null, head: 0, wake: [] as THREE.Vector3[], endT: 0 }).current;

  const r = useMemo(() => {
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3));
    trailGeo.setAttribute("aBirth", new THREE.BufferAttribute(new Float32Array(TRAIL).fill(-100), 1));
    const wakeGeo = new THREE.BufferGeometry();
    const wt = new Float32Array(WAKE);
    for (let i = 0; i < WAKE; i++) wt[i] = i / (WAKE - 1);
    wakeGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(WAKE * 3), 3));
    wakeGeo.setAttribute("aT", new THREE.BufferAttribute(wt, 1));
    const rnd = seeded(404);
    const n = lite ? 70 : 130;
    const pos: number[] = [];
    const end: number[] = [];
    const seed: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2;
      const rad = 3 + rnd() ** 0.7 * 14;
      const z = -rnd() * 160;
      const s = rnd();
      for (const e of [0, 1]) {
        pos.push(Math.cos(a) * rad, Math.sin(a) * rad, z);
        end.push(e);
        seed.push(s);
      }
    }
    const streakGeo = new THREE.BufferGeometry();
    streakGeo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    streakGeo.setAttribute("aEnd", new THREE.Float32BufferAttribute(end, 1));
    streakGeo.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 1));
    return {
      trailGeo,
      wakeGeo,
      streakGeo,
      trailMat: trailMaterial(),
      wakeMat: wakeMaterial(),
      streakMat: streakMaterial(),
      rimMat: new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1), toneMapped: false }),
    };
  }, [lite]);
  useEffect(() => () => Object.values(r).forEach((x) => x.dispose()), [r]);
  const wakeLine = useMemo(() => new THREE.Line(r.wakeGeo, r.wakeMat), [r]);

  useFrame((s) => {
    if (done) return;
    const t = s.clock.elapsedTime;
    if (!st.path && intro.running) {
      camera.updateMatrixWorld();
      const portrait = s.size.width / s.size.height < 0.95;
      st.path = new THREE.CatmullRomCurve3(
        portrait
          ? [ahead(camera, 0, 0.05, 240), ahead(camera, 0.03, 0.02, 70), ahead(camera, 0.16, -0.08, 8), local(camera, 1.7, -0.6, 1.2), local(camera, 6, -1.4, 26)]
          : [ahead(camera, 0, 0.05, 260), ahead(camera, 0.06, 0.04, 95), ahead(camera, 0.32, -0.06, 20), local(camera, 5.2, -0.9, 2.5), local(camera, 13, -2.2, 34)],
        false,
        "centripetal",
      );
      ship.current?.scale.setScalar(portrait ? 1.5 : 1);
    }

    const flying = !!st.path && intro.shipT > 0 && intro.shipT < 1;
    if (ship.current) ship.current.visible = flying;
    if (flying && st.path && ship.current) {
      const p = st.path.getPoint(intro.shipT);
      const next = st.path.getPoint(Math.min(1, intro.shipT + 0.01));
      ship.current.position.copy(p);
      ship.current.lookAt(next);
      if (spin.current) spin.current.rotation.y = t * 1.6;
      const dist = p.distanceTo(camera.position);
      glow.current?.scale.setScalar(THREE.MathUtils.clamp(dist * 0.03, 0.3, 2.4) * (0.35 + intro.engine * 0.65));
      r.rimMat.color.setScalar(0.35 + intro.engine * 1.9);
      const pa = r.trailGeo.attributes.position as THREE.BufferAttribute;
      const ba = r.trailGeo.attributes.aBirth as THREE.BufferAttribute;
      for (let k = 0; k < 2; k++) {
        const i = st.head;
        pa.setXYZ(i, p.x + (Math.random() - 0.5) * 0.08, p.y + (Math.random() - 0.5) * 0.08, p.z + (Math.random() - 0.5) * 0.08);
        ba.setX(i, t);
        st.head = (st.head + 1) % TRAIL;
      }
      pa.needsUpdate = true;
      ba.needsUpdate = true;
      st.wake.push(p.clone());
      if (st.wake.length > WAKE) st.wake.shift();
    }

    const wa = r.wakeGeo.attributes.position as THREE.BufferAttribute;
    const n = st.wake.length;
    for (let i = 0; i < WAKE; i++) {
      const w = st.wake[Math.max(0, n - WAKE + i)] || st.wake[n - 1];
      if (w) wa.setXYZ(i, w.x, w.y, w.z);
    }
    wa.needsUpdate = n > 1;
    r.wakeMat.uniforms.uOpacity.value = flying ? 0.9 * intro.engine : Math.max(0, r.wakeMat.uniforms.uOpacity.value - 0.12);
    r.trailMat.uniforms.uTime.value = t;
    r.trailMat.uniforms.uPixelRatio.value = gl.getPixelRatio();
    r.streakMat.uniforms.uTime.value = t;
    r.streakMat.uniforms.uWarp.value = intro.warp;
    if (streaks.current) {
      streaks.current.visible = intro.warp > 0.001;
      streaks.current.position.copy(camera.position);
      streaks.current.quaternion.copy(camera.quaternion);
    }
    if (intro.shipT >= 1 && !st.endT) st.endT = t;
    if (!intro.running && intro.shipT >= 1 && intro.warp === 0 && t - (st.endT || t) > TRAIL_LIFE) setDone(true);
  });

  if (done) return null;
  return (
    <>
      <group ref={ship} visible={false}>
        <group rotation={[0, 0, -0.38]}>
          <group ref={spin}>
            <mesh scale={[1, 0.2, 1]}>
              <sphereGeometry args={[0.62, 48, 24]} />
              <meshPhysicalMaterial color="#08090b" metalness={0.85} roughness={0.22} clearcoat={1} clearcoatRoughness={0.1} />
            </mesh>
            <mesh position={[0, 0.07, 0]} scale={[1, 0.34, 1]}>
              <sphereGeometry args={[0.26, 32, 16]} />
              <meshPhysicalMaterial color="#0d0e11" metalness={0.9} roughness={0.12} clearcoat={1} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]} material={r.rimMat}>
              <torusGeometry args={[0.6, 0.012, 8, 96]} />
            </mesh>
            {[0, 1, 2].map((i) => {
              const a = (i / 3) * Math.PI * 2;
              return (
                <mesh key={i} position={[Math.cos(a) * 0.6, 0, Math.sin(a) * 0.6]} material={r.rimMat}>
                  <sphereGeometry args={[0.028, 8, 8]} />
                </mesh>
              );
            })}
          </group>
          <sprite ref={glow} position={[0, -0.12, 0]} scale={1.2}>
            <spriteMaterial map={glowTexture()} color={new THREE.Color(1.8, 1.82, 1.88)} transparent toneMapped={false} fog={false} depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
        </group>
      </group>
      <points geometry={r.trailGeo} material={r.trailMat} frustumCulled={false} />
      <primitive object={wakeLine} frustumCulled={false} />
      <lineSegments ref={streaks} geometry={r.streakGeo} material={r.streakMat} frustumCulled={false} visible={false} />
    </>
  );
}
