"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import { initials, type SpaceApp } from "@/lib/space/data";
import { goToApp } from "@/lib/space/engine";
import { appSlots, orbitPoint, orbitTilt, WORLD } from "@/lib/space/layout";
import { rt, ui, type Vec3 } from "@/lib/space/store";
import { Sun } from "./Sun";
import { NOISE, damp, easeOutCubic, glowTexture, iconTexture, loadImage, rimMaterial } from "./materials";
import { THEMES } from "./themes";

const PLANET_R = 1.2;

function planetMaterial({ accent, base, seed, light }: { accent: string; base: string; seed: number; light: Vec3 }) {
  return new THREE.ShaderMaterial({
    defines: { OCTAVES: 3 },
    uniforms: {
      uLightPos: { value: new THREE.Vector3(...light) },
      uAccent: { value: new THREE.Color(accent) },
      uBase: { value: new THREE.Color(base) },
      uSeed: { value: seed },
      uFocus: { value: 0 },
      uRadius: { value: PLANET_R },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vW;
      varying vec3 vO;
      void main() {
        vO = position;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vW = wp.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uLightPos;
      uniform vec3 uAccent;
      uniform vec3 uBase;
      uniform float uSeed;
      uniform float uFocus;
      uniform float uRadius;
      varying vec3 vN;
      varying vec3 vW;
      varying vec3 vO;
      ${NOISE}
      void main() {
        vec3 N = normalize(vN);
        vec3 V = normalize(cameraPosition - vW);
        vec3 L = normalize(uLightPos - vW);
        float lit = smoothstep(-0.15, 0.7, dot(N, L));

        vec3 p = vO / uRadius;
        float n = fbm(p * 1.8 + uSeed * 10.0);
        float bands = sin(p.y * 11.0 + n * 3.2 + uSeed * 6.0) * 0.5 + 0.5;
        vec3 base = mix(uBase * 0.35, uBase, bands);
        base = mix(base, uAccent * 0.25, smoothstep(0.2, 0.7, n) * 0.4);

        vec3 sunTint = vec3(1.0, 0.86, 0.66);
        float ndl = dot(N, L);
        vec3 col = base * (0.08 + lit * 1.2 * sunTint) + uAccent * 0.02 * (1.0 - lit);
        // warm line where day meets night
        col += vec3(1.0, 0.55, 0.2) * smoothstep(0.0, 0.12, ndl) * (1.0 - smoothstep(0.12, 0.3, ndl)) * 0.12;
        float fres = pow(1.0 - max(dot(N, V), 0.0), 3.2);
        col += uAccent * fres * (0.06 + 0.3 * uFocus) * (0.3 + 0.7 * lit);

        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

function iconMaterial(map: THREE.Texture) {
  return new THREE.ShaderMaterial({
    uniforms: { uMap: { value: map }, uOpacity: { value: 0.6 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        vec4 tex = texture2D(uMap, vUv);
        gl_FragColor = vec4(tex.rgb, tex.a * uOpacity);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
  });
}

const inProducts = () => ui.get().section === "products";

function AppPlanet({ app, index, position, light, lite, segments, reducedMotion }: { app: SpaceApp; index: number; position: Vec3; light: Vec3; lite: boolean; segments: number; reducedMotion: boolean }) {
  const body = useRef<THREE.Mesh>(null);
  const icon = useRef<THREE.Mesh>(null);
  const detail = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Sprite>(null);
  const focus = useRef(0);
  const [hover, setHover] = useState(false);
  const accent = app.accent || "#c9ccd2";
  const Theme = THEMES[app.theme];

  const surface = useMemo(() => `#${new THREE.Color("#26282d").lerp(new THREE.Color(accent), 0.18).getHexString()}`, [accent]);
  const mat = useMemo(() => planetMaterial({ accent, base: surface, seed: index * 0.37 + 0.11, light }), [accent, surface, index, light]);
  const rim = useMemo(() => rimMaterial({ color: accent, intensity: 0.12, edge: 0.45, power: 3.4 }), [accent]);
  const [tex, setTex] = useState(() => iconTexture({ label: initials(app.name), accent, deep: app.deep }));
  const iconMat = useMemo(() => iconMaterial(tex), [tex]);

  useEffect(() => {
    if (!app.logo) return;
    let dead = false;
    loadImage(app.logo)
      .then((img) => !dead && setTex(iconTexture({ image: img, label: "", accent, deep: app.deep })))
      .catch(() => {});
    return () => {
      dead = true;
    };
  }, [app.logo, accent, app.deep]);
  useEffect(() => () => tex.dispose(), [tex]);
  useEffect(() => () => iconMat.dispose(), [iconMat]);
  useEffect(() => () => {
    mat.dispose();
    rim.dispose();
  }, [mat, rim]);
  useEffect(() => {
    document.body.style.cursor = hover ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hover]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20);
    if (hover && !inProducts()) setHover(false);
    const active = ui.get().app;
    const goal = active === index ? 1 : active === -1 ? 0.45 : 0.18;
    focus.current = damp(focus.current, hover ? Math.max(goal, 0.7) : goal, 3, dt);
    const f = focus.current;
    mat.uniforms.uFocus.value = f;
    rim.uniforms.uIntensity.value = 0.06 + f * 0.2;
    iconMat.uniforms.uOpacity.value = 0.55 + f * 0.45;
    icon.current?.scale.setScalar(0.78 + f * 0.17);
    detail.current?.scale.setScalar(0.85 + f * 0.15);
    if (halo.current) (halo.current.material as THREE.SpriteMaterial).opacity = f * f * 0.045;
    if (body.current) body.current.rotation.y += dt * (reducedMotion ? 0.01 : 0.08);
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (!inProducts()) return;
    e.stopPropagation();
    goToApp(index);
  };

  return (
    <group position={position}>
      <mesh
        ref={body}
        material={mat}
        onClick={onClick}
        onPointerOver={(e) => {
          if (!inProducts()) return;
          e.stopPropagation();
          setHover(true);
        }}
        onPointerOut={() => setHover(false)}
      >
        <sphereGeometry args={[PLANET_R, segments, Math.round(segments * 0.75)]} />
      </mesh>
      <mesh material={rim} scale={PLANET_R * 1.14}>
        <sphereGeometry args={[1, 48, 32]} />
      </mesh>
      <group ref={detail}>
        <Theme accent={accent} accent2={app.accent2} focus={focus} radius={PLANET_R} lite={lite} reducedMotion={reducedMotion} />
      </group>
      <sprite ref={halo} scale={22} renderOrder={-2}>
        <spriteMaterial map={glowTexture()} color={accent} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.46, 6, 1, true]} />
        <meshBasicMaterial color="#c9ccd2" transparent opacity={0.45} depthWrite={false} />
      </mesh>
      <Billboard position={[0, 2.28, 0]}>
        <mesh ref={icon} material={iconMat} renderOrder={5}>
          <planeGeometry args={[1.2, 1.2]} />
        </mesh>
      </Billboard>
    </group>
  );
}

const TILT_GLSL = /* glsl */ `
  vec3 tiltOrbit(vec3 v, float node, float incl) {
    vec3 k = vec3(cos(node), 0.0, sin(node));
    return v * cos(incl) + cross(k, v) * sin(incl) + k * dot(k, v) * (1.0 - cos(incl));
  }
`;

type Slots = ReturnType<typeof appSlots>;
const tint = (accent: string) => new THREE.Color("#dfe1e6").lerp(new THREE.Color(accent), 0.85);

/** Thin concentric rings, as in the reference. The focused one brightens and takes the product's colour. */
function useOrbitLines(apps: SpaceApp[], slots: Slots) {
  return useMemo(() => {
    const pos: number[] = [];
    const orbit: number[] = [];
    const color: number[] = [];
    const c = WORLD.apps.center;
    slots.forEach((slot, i) => {
      const col = new THREE.Color(apps[i].accent);
      for (let k = 0; k < 220; k++)
        for (const j of [k, k + 1]) {
          const p = orbitPoint(i, (j / 220) * Math.PI * 2, slot.radius);
          pos.push(p[0] - c[0], p[1] - c[1], p[2] - c[2]);
          orbit.push(i);
          color.push(col.r, col.g, col.b);
        }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("aOrbit", new THREE.Float32BufferAttribute(orbit, 1));
    geo.setAttribute("aColor", new THREE.Float32BufferAttribute(color, 3));
    const material = new THREE.ShaderMaterial({
      uniforms: { uFocus: { value: -1 }, uReveal: { value: 0 }, uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        uniform float uFocus;
        attribute float aOrbit;
        attribute vec3 aColor;
        varying float vMatch;
        varying vec3 vColor;
        void main() {
          vMatch = 1.0 - step(0.5, abs(aOrbit - uFocus));
          vColor = aColor;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uReveal;
        varying float vMatch;
        varying vec3 vColor;
        void main() {
          vec3 col = mix(vec3(0.86, 0.87, 0.89), mix(vec3(0.95), vColor, 0.6), vMatch);
          float a = mix(0.3, 0.75, vMatch) * uReveal;
          gl_FragColor = vec4(col * a, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geo, material };
  }, [apps, slots]);
}

/** A glowing wake behind each planet along its orbit. */
function useOrbitTrails(apps: SpaceApp[], slots: Slots) {
  return useMemo(() => {
    const pos: number[] = [];
    const t: number[] = [];
    const orbit: number[] = [];
    const color: number[] = [];
    const c = WORLD.apps.center;
    const N = 64;
    slots.forEach((slot, i) => {
      const col = tint(apps[i].accent);
      const len = 0.75 * (6 / slot.radius) + 0.2;
      for (let k = 0; k < N; k++)
        for (const j of [k, k + 1]) {
          const u = j / N;
          const p = orbitPoint(i, slot.angle - len * (1 - u), slot.radius);
          pos.push(p[0] - c[0], p[1] - c[1], p[2] - c[2]);
          t.push(u);
          orbit.push(i);
          color.push(col.r, col.g, col.b);
        }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("aT", new THREE.Float32BufferAttribute(t, 1));
    geo.setAttribute("aOrbit", new THREE.Float32BufferAttribute(orbit, 1));
    geo.setAttribute("aColor", new THREE.Float32BufferAttribute(color, 3));
    const material = new THREE.ShaderMaterial({
      uniforms: { uFocus: { value: -1 }, uReveal: { value: 0 }, uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute float aT;
        attribute float aOrbit;
        attribute vec3 aColor;
        uniform float uFocus;
        varying float vT;
        varying float vMatch;
        varying vec3 vColor;
        void main() {
          vT = aT;
          vMatch = 1.0 - step(0.5, abs(aOrbit - uFocus));
          vColor = aColor;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uReveal;
        uniform float uTime;
        varying float vT;
        varying float vMatch;
        varying vec3 vColor;
        void main() {
          float shimmer = 0.85 + 0.15 * sin(vT * 40.0 - uTime * 3.0);
          float a = pow(vT, 2.6) * mix(0.25, 1.0, vMatch) * uReveal * shimmer;
          gl_FragColor = vec4(vColor * a * 1.4, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geo, material };
  }, [apps, slots]);
}

/** Small moons of light travelling along each tilted orbit. */
function useOrbitRunners(slots: Slots, reducedMotion: boolean) {
  return useMemo(() => {
    const n = slots.length * 3;
    const radius = new Float32Array(n);
    const angle = new Float32Array(n);
    const speed = new Float32Array(n);
    const node = new Float32Array(n);
    const incl = new Float32Array(n);
    slots.forEach((s, i) => {
      const tilt = orbitTilt(i);
      for (let k = 0; k < 3; k++) {
        const j = i * 3 + k;
        radius[j] = s.radius;
        angle[j] = (k / 3) * Math.PI * 2 + i;
        speed[j] = (0.12 / Math.sqrt(s.radius)) * (i % 2 ? -1 : 1);
        node[j] = tilt.node;
        incl[j] = tilt.incl;
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute("aRadius", new THREE.BufferAttribute(radius, 1));
    geo.setAttribute("aAngle", new THREE.BufferAttribute(angle, 1));
    geo.setAttribute("aSpeed", new THREE.BufferAttribute(speed, 1));
    geo.setAttribute("aNode", new THREE.BufferAttribute(node, 1));
    geo.setAttribute("aIncl", new THREE.BufferAttribute(incl, 1));
    const material = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 }, uReveal: { value: 0 } },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uPixelRatio;
        attribute float aRadius;
        attribute float aAngle;
        attribute float aSpeed;
        attribute float aNode;
        attribute float aIncl;
        ${TILT_GLSL}
        void main() {
          float a = aAngle + uTime * aSpeed;
          vec3 p = tiltOrbit(vec3(cos(a) * aRadius, 0.0, sin(a) * aRadius), aNode, aIncl);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = clamp(90.0 / -mv.z, 1.5, 6.0) * uPixelRatio;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uReveal;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d) * uReveal;
          gl_FragColor = vec4(vec3(1.6, 1.4, 1.1) * a, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    material.userData.speed = reducedMotion ? 0.1 : 1;
    return { geo, material };
  }, [slots, reducedMotion]);
}

/** The product system: the OrbitApps Sun in the middle, each product on its own coloured, tilted orbit. */
export function AppWorlds({ apps, lite = false, segments = 64, reducedMotion = false }: { apps: SpaceApp[]; lite?: boolean; segments?: number; reducedMotion?: boolean }) {
  const center = WORLD.apps.center;
  const root = useRef<THREE.Group>(null);
  const orbitsRef = useRef<THREE.Group>(null);
  const slots = useMemo(() => appSlots(apps.length), [apps.length]);
  const orbits = useOrbitLines(apps, slots);
  const trails = useOrbitTrails(apps, slots);
  const runners = useOrbitRunners(slots, reducedMotion);
  const local = useMemo(() => slots.map(({ position: p }) => [p[0] - center[0], p[1] - center[1], p[2] - center[2]] as Vec3), [slots, center]);
  const tmp = useMemo(() => ({ c: new THREE.Vector3(), e: new THREE.Vector3(), right: new THREE.Vector3() }), []);

  useEffect(
    () => () => {
      [orbits, trails, runners].forEach((x) => {
        x.geo.dispose();
        x.material.dispose();
      });
    },
    [orbits, trails, runners],
  );

  useFrame((s) => {
    const reveal = easeOutCubic(Math.min(1, rt.arrive.products * 1.25 + (rt.inside.products > 0 ? 1 : 0)));
    const grow = rt.inside.products > 0 ? 1 : THREE.MathUtils.smoothstep(rt.arrive.products, 0.45, 0.95);
    if (root.current) {
      root.current.visible = grow > 0.002;
      root.current.scale.setScalar(Math.max(easeOutCubic(grow), 0.001));
    }
    const focus = ui.get().app;
    orbits.material.uniforms.uFocus.value = focus;
    orbits.material.uniforms.uReveal.value = reveal;
    orbits.material.uniforms.uTime.value = s.clock.elapsedTime;
    trails.material.uniforms.uFocus.value = focus;
    trails.material.uniforms.uReveal.value = reveal;
    trails.material.uniforms.uTime.value = s.clock.elapsedTime;
    runners.material.uniforms.uReveal.value = reveal;
    runners.material.uniforms.uTime.value = s.clock.elapsedTime * runners.material.userData.speed;
    runners.material.uniforms.uPixelRatio.value = s.gl.getPixelRatio();
    orbitsRef.current?.scale.setScalar(0.82 + reveal * 0.18);

    // Project each planet to the screen, for the floating download counters.
    const { camera, size } = s;
    const shown = !!root.current?.visible && root.current.parent?.visible !== false;
    tmp.right.setFromMatrixColumn(camera.matrixWorld, 0);
    slots.forEach((slot, i) => {
      tmp.c.set(...slot.position);
      tmp.e.copy(tmp.c).addScaledVector(tmp.right, PLANET_R);
      tmp.c.project(camera);
      tmp.e.project(camera);
      const x = ((tmp.c.x + 1) / 2) * size.width;
      const y = ((1 - tmp.c.y) / 2) * size.height;
      const w = (rt.worlds[i] ||= { x: 0, y: 0, r: 0, visible: false });
      w.x = x;
      w.y = y;
      w.r = Math.abs(((tmp.e.x + 1) / 2) * size.width - x);
      w.visible = shown && tmp.c.z < 1;
    });
  });

  return (
    <group ref={root} position={center}>
      <group scale={1.55}>
        <Sun reducedMotion={reducedMotion} segments={segments} />
      </group>
      <group ref={orbitsRef}>
        <lineSegments geometry={orbits.geo} material={orbits.material} />
        <points geometry={runners.geo} material={runners.material} frustumCulled={false} />
      </group>
      {apps.map((app, i) => (
        <AppPlanet key={app.id} app={app} index={i} position={local[i]} light={center} lite={lite} segments={segments} reducedMotion={reducedMotion} />
      ))}
    </group>
  );
}
