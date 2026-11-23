import * as THREE from "three";

/** Deterministic random (mulberry-style), so the universe looks the same on every visit. */
export function seeded(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 1831565813) >>> 0;
    let e = t;
    e = Math.imul(e ^ (e >>> 15), e | 1);
    e ^= e + Math.imul(e ^ (e >>> 7), e | 61);
    return ((e ^ (e >>> 14)) >>> 0) / 4294967296;
  };
}

export const damp = (a: number, b: number, lambda: number, dt: number) => a + (b - a) * (1 - Math.exp(-lambda * dt));
export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
/** Opacity of an app world's detail layer for a given focus (0–1). */
export const focusOpacity = (f: number) => 0.14 + 0.62 * f;

export type P3 = [number, number, number];

export function ringGeometry(radius: number, segments = 128) {
  const pos = new Float32Array(segments * 3);
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pos[i * 3] = Math.cos(a) * radius;
    pos[i * 3 + 2] = Math.sin(a) * radius;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return g;
}

let glow: THREE.CanvasTexture | null = null;
/** Soft radial sprite used for every glow in the scene. */
export function glowTexture() {
  if (glow) return glow;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.08, "rgba(255,255,255,0.75)");
  g.addColorStop(0.25, "rgba(255,255,255,0.22)");
  g.addColorStop(0.55, "rgba(255,255,255,0.05)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  glow = new THREE.CanvasTexture(c);
  return glow;
}

const DISPLAY_FONT = `"Archivo", system-ui, sans-serif`;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + s, y, x + s, y + s, r);
  ctx.arcTo(x + s, y + s, x, y + s, r);
  ctx.arcTo(x, y + s, x, y, r);
  ctx.arcTo(x, y, x + s, y, r);
  ctx.closePath();
}

/** App icon drawn into a rounded tile: the real logo when there is one, otherwise initials in the app colours. */
export function iconTexture({ image, label, accent, deep }: { image?: HTMLImageElement | null; label: string; accent: string; deep: string }) {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  const size = 471.04;
  const inset = (512 - size) / 2;
  const r = size * 0.22;
  ctx.save();
  roundRect(ctx, inset, inset, size, r);
  ctx.clip();
  if (image) {
    const s = Math.max(size / image.width, size / image.height);
    const w = image.width * s;
    const h = image.height * s;
    ctx.drawImage(image, 256 - w / 2, 256 - h / 2, w, h);
  } else {
    const g = ctx.createLinearGradient(0, 0, 512, 512);
    g.addColorStop(0, accent);
    g.addColorStop(1, deep);
    ctx.fillStyle = g;
    ctx.fillRect(inset, inset, size, size);
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(256, 256, size * 0.36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 170px ${DISPLAY_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 256, 264);
  }
  ctx.restore();
  roundRect(ctx, inset + 1, inset + 1, size - 2, r);
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/* ------------------------------------------------------------------ */
/* GLSL                                                                */
/* ------------------------------------------------------------------ */

export const NOISE = /* glsl */ `
vec3 mod289(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v){
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g  = step(x0.yzx, x0.xyz);
  vec3 l  = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j  = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x  = x_ * ns.x + ns.yyyy;
  vec4 y  = y_ * ns.x + ns.yyyy;
  vec4 h  = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

#ifndef OCTAVES
#define OCTAVES 4
#endif

float fbm(vec3 p){
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < OCTAVES; i++) {
    sum += amp * snoise(p);
    p = p * 2.03 + vec3(17.1, 9.2, 4.7);
    amp *= 0.5;
  }
  return sum;
}

float hash12(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
`;

/** Back-face fresnel halo around a sphere. */
export function rimMaterial({ color = "#8fb4ff", intensity = 1, edge = 0.55, power = 2.4 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
      uEdge: { value: edge },
      uPower: { value: power },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uEdge;
      uniform float uPower;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float x = clamp(-dot(normalize(vN), normalize(vV)), 0.0, 1.0);
        float g = pow(smoothstep(0.0, uEdge, x), uPower) * (1.0 - smoothstep(uEdge, uEdge + 0.25, x));
        gl_FragColor = vec4(uColor * g * uIntensity, g);
      }
    `,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/* ------------------------------------------------------------------ */
/* Light-trace lines and sparkle points (used by the app worlds)       */
/* ------------------------------------------------------------------ */

export function circlePoints(radius: number, segments = 128, y = 0, closed = true): P3[] {
  const out: P3[] = [];
  const n = closed ? segments + 1 : segments;
  for (let i = 0; i < n; i++) {
    const a = (i / segments) * Math.PI * 2;
    out.push([Math.cos(a) * radius, y, Math.sin(a) * radius]);
  }
  return out;
}

/** Polylines → line segments with a normalised arc length (aT) and a per-line seed (aSeed, -1 = no pulse). */
export function traceGeometry(lines: { points: P3[]; seed?: number }[]) {
  const pos: number[] = [];
  const t: number[] = [];
  const seed: number[] = [];
  for (const { points, seed: s = -1 } of lines) {
    const len = [0];
    for (let i = 1; i < points.length; i++) {
      const [a, b] = [points[i - 1], points[i]];
      len.push(len[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
    }
    const total = len[len.length - 1] || 1;
    for (let i = 0; i < points.length - 1; i++) {
      pos.push(...points[i], ...points[i + 1]);
      t.push(len[i] / total, len[i + 1] / total);
      seed.push(s, s);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aT", new THREE.Float32BufferAttribute(t, 1));
  g.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 1));
  return g;
}

export function traceMaterial({ color, pulse = "#ffffff", base = 0.3, speed = 0.2, density = 0.6, trail = 16 }: { color: string; pulse?: string; base?: number; speed?: number; density?: number; trail?: number }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uPulse: { value: new THREE.Color(pulse) },
      uBase: { value: base },
      uSpeed: { value: speed },
      uDensity: { value: density },
      uTrail: { value: trail },
    },
    vertexShader: /* glsl */ `
      attribute float aT;
      attribute float aSeed;
      varying float vT;
      varying float vSeed;
      void main() {
        vT = aT;
        vSeed = aSeed;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uOpacity;
      uniform vec3 uColor;
      uniform vec3 uPulse;
      uniform float uBase;
      uniform float uSpeed;
      uniform float uDensity;
      uniform float uTrail;
      varying float vT;
      varying float vSeed;
      void main() {
        float trail = 0.0;
        if (vSeed >= 0.0) {
          float sp = uSpeed * (0.6 + fract(vSeed * 17.3) * 0.8);
          float head = fract(uTime * sp + vSeed * 9.7);
          float d = head - vT;
          trail = d >= 0.0 ? exp(-d * uTrail) : 0.0;
          trail *= step(1.0 - uDensity, fract(vSeed * 13.7));
        }
        vec3 col = uColor * uBase + uPulse * trail * 1.6;
        float a = (uBase + trail) * uOpacity;
        gl_FragColor = vec4(col * uOpacity, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

export function pointsGeometry(items: { p: P3; size?: number; phase?: number }[]) {
  const pos = new Float32Array(items.length * 3);
  const size = new Float32Array(items.length);
  const phase = new Float32Array(items.length);
  items.forEach((it, i) => {
    pos.set(it.p, i * 3);
    size[i] = it.size ?? 1;
    phase[i] = it.phase ?? 0;
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  g.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
  return g;
}

export function sparkMaterial({ color, scale = 30, twinkle = 0.35 }: { color: string; scale?: number; twinkle?: number }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uPixelRatio: { value: 1 },
      uColor: { value: new THREE.Color(color) },
      uScale: { value: scale },
      uTwinkle: { value: twinkle },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uScale;
      uniform float uTwinkle;
      attribute float aSize;
      attribute float aPhase;
      varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vA = mix(1.0, 0.55 + 0.45 * sin(uTime * (0.8 + aPhase * 1.7) + aPhase * 6.2831), uTwinkle);
        gl_PointSize = clamp(aSize * uScale / -mv.z, 1.0, 14.0) * uPixelRatio;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      uniform vec3 uColor;
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        a = a * a * vA * uOpacity;
        gl_FragColor = vec4(uColor * a * 1.4, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

type Disposable = { dispose: () => void };
export function disposeAll(o: Record<string, unknown>) {
  Object.values(o).forEach((v) => {
    if (v && typeof (v as Disposable).dispose === "function") (v as Disposable).dispose();
  });
}

export function syncMaterials(mats: THREE.ShaderMaterial[], { time, opacity, pixelRatio }: { time: number; opacity?: number; pixelRatio: number }) {
  for (const m of mats) {
    const u = m.uniforms;
    if (u.uTime) u.uTime.value = time;
    if (u.uPixelRatio) u.uPixelRatio.value = pixelRatio;
    if (opacity != null && u.uOpacity) u.uOpacity.value = opacity;
  }
}

/** Shows children only while the camera is within `range` of `center` (saves GPU time). */
export const within = (camera: THREE.Camera, center: THREE.Vector3, range: number) => camera.position.distanceTo(center) < range;
