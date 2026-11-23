import type { Keyframe, Vec3 } from "./store";

/** Where everything sits in the 3D universe. The camera flies from one landmark to the next. */
export const WORLD = {
  core: [0, 0, 0] as Vec3,
  apps: { center: [0, -6, -72] as Vec3 },
  station: [0, -16, -150] as Vec3,
  gyro: [0, -30, -205] as Vec3,
  planet: { center: [0, -190, -330] as Vec3, radius: 150 },
  sun: { x: 250, z: -900, yHidden: -185, yRisen: -112 },
};

/** Scroll distance (in viewport heights) spent at each app. */
export const APP_STEP_VH = 1.25;

/** Orbits spread out with distance from the Sun — inner ones close together, outer ones far apart. */
export const orbitRadius = (slot: number) => 4.6 + slot * 2.0 + slot * slot * 0.08;

/** Each product orbit is tipped slightly out of the plane around its own line of nodes. */
export function orbitTilt(slot: number) {
  return { node: slot * 1.9 + 0.4, incl: 0 }; // flat, concentric — like the reference
}

/** Rotate p around the axis (cos node, 0, sin node) by incl (Rodrigues). Mirrored in GLSL. */
export function tiltPoint([x, y, z]: Vec3, node: number, incl: number): Vec3 {
  const kx = Math.cos(node);
  const kz = Math.sin(node);
  const c = Math.cos(incl);
  const s = Math.sin(incl);
  const dot = kx * x + kz * z;
  const cx = -kz * y;
  const cy = kz * x - kx * z;
  const cz = kx * y;
  return [x * c + cx * s + kx * dot * (1 - c), y * c + cy * s, z * c + cz * s + kz * dot * (1 - c)];
}

/** A point on product `slot`'s orbit, in world space. */
export function orbitPoint(slot: number, angle: number, radius = orbitRadius(slot)): Vec3 {
  const { node, incl } = orbitTilt(slot);
  const [cx, cy, cz] = WORLD.apps.center;
  const p = tiltPoint([Math.cos(angle) * radius, 0, Math.sin(angle) * radius], node, incl);
  return [cx + p[0], cy + p[1], cz + p[2]];
}

export interface AppSlot {
  slot: number;
  radius: number;
  angle: number;
  position: Vec3;
}

export function appSlots(count: number): AppSlot[] {
  return Array.from({ length: count }, (_, slot) => {
    const radius = orbitRadius(slot);
    // Alternate left/right of the Sun on the side facing the camera, fanning outwards,
    // so no planet hides behind the Sun (camera looks from +z).
    // A spiral around the whole circle (front, back, both sides): each next product sits a little further
    // round and a little further out, so the camera glides to a neighbour instead of jumping across the Sun.
    const angle = 0.25 + slot * ((Math.PI * 2) / Math.max(count, 1));
    return { slot, radius, angle, position: orbitPoint(slot, angle, radius) };
  });
}

/** Station module height, and which side of the truss it docks on. */
export const SERVICE_SPACING = 7;
export const serviceY = (i: number) => 4 - i * SERVICE_SPACING;
export const serviceSide = (i: number) => (i % 2 === 0 ? 1 : -1);

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const mid = (a: Vec3, b: Vec3) => mul(add(a, b), 0.5);
const kf = (at: number, pos: Vec3, target: Vec3, sx = 0, sy = 0): Keyframe => ({ at, pos, target, sx, sy });

function appView(slot: { angle: number; position: Vec3 }, portrait: boolean) {
  const p = slot.position;
  const out: Vec3 = [Math.cos(slot.angle), 0, Math.sin(slot.angle)];
  const side: Vec3 = [-out[2], 0, out[0]];
  // Same framing as before; the camera sits on the side away from the next planet in the spiral,
  // so that planet never ends up between the lens and the one in focus.
  const d = portrait ? 12 : 10;
  return { pos: add(add(add(p, mul(out, d * 0.8)), mul(side, -d * 0.45)), [0, d * 0.24, 0]), target: add(p, [0, 1.05, 0]) };
}

function arcBetween(a: AppSlot, b: AppSlot, steps: number, portrait: boolean) {
  let delta = b.angle - a.angle;
  delta = Math.atan2(Math.sin(delta), Math.cos(delta));
  const c = WORLD.apps.center;
  const out: { pos: Vec3; target: Vec3 }[] = [];
  for (let s = 1; s <= steps; s++) {
    const t = s / (steps + 1);
    const ang = a.angle + delta * t;
    const r = a.radius + (b.radius - a.radius) * t;
    const y = a.position[1] + (b.position[1] - a.position[1]) * t;
    const v = appView({ angle: ang, position: [c[0] + Math.cos(ang) * r, y, c[2] + Math.sin(ang) * r] }, portrait);
    // A gentle hop: rise and drift outwards mid-way, so the move reads as one smooth arc.
    const hop = Math.sin(Math.PI * t);
    const lift = hop * (1.6 + Math.abs(b.radius - a.radius) * 0.35);
    out.push({ pos: add(add(v.pos, mul([Math.cos(ang), 0, Math.sin(ang)], lift)), [0, hop * 1.4, 0]), target: v.target });
  }
  return out;
}

export interface Box {
  top: number;
  height: number;
}

export interface Measure {
  vh: number;
  vw: number;
  max: number;
  portrait: boolean;
  sections: { home: Box; products: Box; build: Box; about: Box; contact: Box };
  servicePanels: number[];
  appCount: number;
}

/** Builds the camera path: one keyframe per scroll position, in document pixels. */
export function buildKeyframes(m: Measure) {
  const { vh, max, portrait, sections: s, servicePanels } = m;
  const frames: Keyframe[] = [];
  const anchors = { apps: [] as number[], appsOverview: s.products.top, appArrive: [] as number[], appStep: 0, appsEnd: 0, vh };

  // Home — close on the core
  const homePos: Vec3 = portrait ? [0, 0.4, 12.5] : [0, 0.3, 11.2];
  frames.push(kf(0, homePos, [0, 0, 0], portrait ? 0 : 0.29, portrait ? 0.22 : 0.02));
  frames.push(kf(s.products.top * 0.45, [-5.6, 2.4, 0.6], [0, -2, -40]));

  // Products — overview of the system, then one planet per stop
  const c = WORLD.apps.center;
  const slots = appSlots(m.appCount);
  const outer = Math.max(...slots.map((x) => x.radius), 1);
  const overPos: Vec3 = portrait ? [c[0], c[1] + outer * 1.5, c[2] + outer * 2.9] : [c[0] + outer * 0.1, c[1] + outer * 1.2, c[2] + outer * 2.35];
  const overTgt: Vec3 = [c[0], c[1] - 1, c[2]];
  const osx = portrait ? 0 : 0.23;
  const osy = portrait ? -0.08 : -0.04;
  const step = APP_STEP_VH * vh;
  frames.push(kf(s.products.top, overPos, overTgt, osx, osy));
  frames.push(kf(s.products.top + 0.3 * vh, overPos, overTgt, osx, osy));

  const asx = portrait ? 0 : -0.2;
  const asy = portrait ? 0.2 : 0.06;
  let prev: AppSlot | null = null;
  let lastView: { pos: Vec3; target: Vec3 } | null = null;
  slots.forEach((slot, i) => {
    const v = appView(slot, portrait);
    const at = s.products.top + vh + i * step;
    if (prev) {
      const gap = Math.abs(Math.atan2(Math.sin(slot.angle - prev.angle), Math.cos(slot.angle - prev.angle)));
      const n = Math.max(2, Math.round(gap / (Math.PI / 7.5)));
      const from = at - 0.5 * step;
      arcBetween(prev, slot, n, portrait).forEach((p, k) => {
        frames.push(kf(from + (0.5 * step * (k + 1)) / (n + 1), p.pos, p.target, asx, asy));
      });
    }
    frames.push(kf(at, v.pos, v.target, asx, asy));
    frames.push(kf(at + 0.5 * step, v.pos, v.target, asx, asy));
    anchors.apps.push(at + 0.1 * step);
    anchors.appArrive.push(at);
    prev = slot;
    lastView = v;
  });
  const appsEnd = s.products.top + s.products.height - vh;
  anchors.appStep = step;
  anchors.appsEnd = appsEnd;
  const lv = lastView as { pos: Vec3; target: Vec3 } | null;
  if (lv) frames.push(kf(appsEnd, lv.pos, lv.target, asx, asy));

  // Build — the station, one module per capability
  const st = WORLD.station;
  const stPos = add(st, portrait ? [7, 3, 30] : [10, 4, 25]);
  const stTgt = add(st, [0, -1.5, 0]);
  if (lv) frames.push(kf((appsEnd + s.build.top) / 2, add(mid(lv.pos, stPos), [0, 5, 0]), mid(lv.target, stTgt)));
  frames.push(kf(s.build.top, stPos, stTgt, portrait ? 0 : 0.2, portrait ? 0.16 : 0));
  let lastMod: { pos: Vec3; target: Vec3 } | null = null;
  const msx = portrait ? 0 : -0.27;
  const msy = portrait ? 0.24 : 0;
  servicePanels.forEach((at, i) => {
    const m0 = add(st, [0, serviceY(i), 0]);
    const pos = add(m0, portrait ? [6, 2.2, 13] : [6.5, 1.8, 11]);
    const target = add(m0, [0, -0.2, 0]);
    frames.push(kf(at, pos, target, msx, msy));
    lastMod = { pos, target };
  });
  const buildEnd = s.build.top + s.build.height - vh;
  const lm = lastMod as { pos: Vec3; target: Vec3 } | null;
  if (lm) frames.push(kf(buildEnd, lm.pos, lm.target, msx, msy));

  // About — the gyroscope
  const g = WORLD.gyro;
  const gPos = add(g, portrait ? [0, 0.6, 15] : [0, 0.6, 13]);
  const gsx = portrait ? 0 : 0.25;
  const gsy = portrait ? 0.24 : 0;
  if (lm) frames.push(kf((buildEnd + s.about.top) / 2, add(mid(lm.pos, gPos), [8, 2, 0]), mid(lm.target, g)));
  frames.push(kf(s.about.top, gPos, g, gsx, gsy));
  const aboutEnd = Math.max(s.about.top + s.about.height - vh, s.about.top + 1);
  frames.push(kf(aboutEnd, gPos, g, gsx, gsy));

  // Contact — over the planet, at sunrise
  const cPos: Vec3 = [0, -28, -262];
  const cTgt: Vec3 = [0, -28.6, -330];
  frames.push(kf((aboutEnd + s.contact.top) / 2, add(g, [6, 1.5, -8]), [3, -29, -280]));
  const cAt = Math.min(s.contact.top, max - 2);
  frames.push(kf(cAt, cPos, cTgt, 0, portrait ? -0.16 : 0));
  frames.push(kf(Math.max(max, cAt + 1), [0, -29.5, -275], cTgt, 0, portrait ? -0.16 : 0));

  for (let i = 1; i < frames.length; i++) if (frames[i].at <= frames[i - 1].at) frames[i].at = frames[i - 1].at + 1;
  return { frames, anchors };
}
