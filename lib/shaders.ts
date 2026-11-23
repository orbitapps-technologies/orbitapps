import * as THREE from "three";

/** 3D simplex noise (Ian McEwan / Ashima Arts, MIT) + fbm. */
export const noiseGLSL = /* glsl */ `
#ifndef FBM_OCTAVES
#define FBM_OCTAVES 4
#endif
vec3 mod289(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
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
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
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
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
float fbm(vec3 p){
  float f = 0.0;
  float a = 0.5;
  for (int i = 0; i < FBM_OCTAVES; i++) { f += a * snoise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; }
  return f;
}
`;

/** Latitude / longitude wireframe for a sphere, as line segments. */
export function globeLines(radius: number, lats = 9, lons = 16, seg = 96) {
  const pts: number[] = [];
  for (let i = 1; i < lats; i++) {
    const phi = (i / lats) * Math.PI;
    const y = Math.cos(phi) * radius;
    const r = Math.sin(phi) * radius;
    for (let j = 0; j < seg; j++) {
      const a0 = (j / seg) * Math.PI * 2;
      const a1 = ((j + 1) / seg) * Math.PI * 2;
      pts.push(Math.cos(a0) * r, y, Math.sin(a0) * r, Math.cos(a1) * r, y, Math.sin(a1) * r);
    }
  }
  for (let i = 0; i < lons; i++) {
    const th = (i / lons) * Math.PI * 2;
    for (let j = 0; j < seg / 2; j++) {
      const p0 = (j / (seg / 2)) * Math.PI;
      const p1 = ((j + 1) / (seg / 2)) * Math.PI;
      pts.push(
        Math.sin(p0) * Math.cos(th) * radius, Math.cos(p0) * radius, Math.sin(p0) * Math.sin(th) * radius,
        Math.sin(p1) * Math.cos(th) * radius, Math.cos(p1) * radius, Math.sin(p1) * Math.sin(th) * radius,
      );
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return geo;
}

/** Thin line material whose far side fades, for depth. */
export function depthLineMaterial(color: string, opacity: number, radius: number) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity }, uRadius: { value: radius } },
    vertexShader: /* glsl */ `
      uniform float uRadius;
      varying float vDepth;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float cz = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).z;
        vDepth = clamp((mv.z - cz) / uRadius * 0.5 + 0.5, 0.0, 1.0);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vDepth;
      void main() { gl_FragColor = vec4(uColor, uOpacity * mix(0.18, 1.0, vDepth)); }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/** A loop with a travelling bright trace (aT = 0..1 along the loop). */
export function traceLoop(points: Float32Array, color: string, base: number, trail: number, trailLen = 8) {
  const n = points.length / 3;
  const t = new Float32Array(n);
  for (let i = 0; i < n; i++) t[i] = i / n;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(points, 3));
  geo.setAttribute("aT", new THREE.BufferAttribute(t, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uHead: { value: 0 },
      uBase: { value: base },
      uTrail: { value: trail },
      uLen: { value: trailLen },
      uOpacity: { value: 1 },
    },
    vertexShader: /* glsl */ `
      attribute float aT;
      varying float vT;
      void main() { vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uHead, uBase, uTrail, uLen, uOpacity;
      varying float vT;
      void main() {
        float d = fract(uHead - vT);
        float tr = exp(-d * uLen) * uTrail;
        gl_FragColor = vec4(mix(uColor, vec3(1.0), clamp(tr, 0.0, 1.0) * 0.6), (uBase + tr) * uOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.LineLoop(geo, mat);
}

export function ellipsePoints(a: number, b: number, segments = 256, offsetX = 0) {
  const pts = new Float32Array(segments * 3);
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    pts.set([Math.cos(t) * a - offsetX, 0, -Math.sin(t) * b], i * 3);
  }
  return pts;
}

/** Soft radial glow for billboards. */
export function glowMaterial(color: string, intensity: number, falloff = 2.4) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uIntensity: { value: intensity }, uFalloff: { value: falloff } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uIntensity; uniform float uFalloff; varying vec2 vUv;
      void main(){ float d = length(vUv - 0.5) * 2.0; float g = pow(clamp(1.0 - d, 0.0, 1.0), uFalloff); gl_FragColor = vec4(uColor, g * uIntensity); }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/** Starfield points spread on a shell. */
export function starfield(count: number, rMin: number, rMax: number) {
  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1;
    const th = Math.random() * Math.PI * 2;
    const r = rMin + Math.random() * (rMax - rMin);
    const s = Math.sqrt(1 - u * u);
    pos.set([r * s * Math.cos(th), r * u, r * s * Math.sin(th)], i * 3);
    size[i] = Math.pow(Math.random(), 4) * 3 + 0.6;
    seed[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aSize; attribute float aSeed;
      uniform float uTime; uniform float uPixelRatio;
      varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uPixelRatio * (120.0 / -mv.z);
        vA = 0.55 + 0.45 * sin(uTime * (0.5 + aSeed * 1.5) + aSeed * 50.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() { float d = length(gl_PointCoord - 0.5); float c = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vec3(1.0), c * c * vA); }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return pts;
}
