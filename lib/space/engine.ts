"use client";

import { APPS, SECTIONS, type SectionId } from "./data";
import { APP_STEP_VH, buildKeyframes, type Box, type Measure } from "./layout";
import { intro, rt, ui, type CameraSection } from "./store";
import { ease, onFrame, prefersReducedMotion, type Ease } from "./tween";

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const maxScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

/* ================================================================== */
/* Smooth scroll — behaves like Lenis (lerp 0.085, wheel ×0.9)          */
/* ================================================================== */

const LERP_LAMBDA = 0.085 * 60;
const WHEEL_MULTIPLIER = 0.9;

const smooth = {
  enabled: false,
  stopped: false,
  current: 0,
  target: 0,
  lerping: false,
  anim: null as null | { from: number; to: number; t: number; duration: number; ease: Ease },
};

function setLocked(locked: boolean) {
  document.documentElement.classList.toggle("scroll-locked", locked);
}

function onWheel(e: WheelEvent) {
  if (e.ctrlKey) return;
  if (smooth.stopped) {
    e.preventDefault();
    return;
  }
  if (!smooth.enabled) return;
  let el = e.target as HTMLElement | null;
  while (el && el !== document.body) {
    if (el.hasAttribute?.("data-scroll-prevent")) return;
    el = el.parentElement;
  }
  e.preventDefault();
  const delta = (e.deltaMode === 1 ? e.deltaY * 40 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY) * WHEEL_MULTIPLIER;
  if (smooth.anim) {
    smooth.anim = null;
    smooth.current = window.scrollY;
    smooth.target = smooth.current;
  }
  if (!smooth.lerping) smooth.current = smooth.target = window.scrollY;
  smooth.target = Math.max(0, Math.min(maxScroll(), smooth.target + delta));
  smooth.lerping = true;
}

function onNativeScroll() {
  if (!smooth.lerping && !smooth.anim) smooth.current = smooth.target = window.scrollY;
}

function smoothFrame(_t: number, dt: number) {
  const a = smooth.anim;
  if (a) {
    a.t += dt;
    const p = Math.min(1, a.t / a.duration);
    const y = a.from + (a.to - a.from) * a.ease(p);
    window.scrollTo(0, y);
    smooth.current = smooth.target = y;
    if (p >= 1) smooth.anim = null;
    return;
  }
  if (!smooth.lerping) return;
  smooth.current += (smooth.target - smooth.current) * (1 - Math.exp(-LERP_LAMBDA * dt));
  if (Math.abs(smooth.target - smooth.current) < 0.5) {
    smooth.current = smooth.target;
    smooth.lerping = false;
  }
  window.scrollTo(0, smooth.current);
}

export function stopScroll() {
  smooth.stopped = true;
  smooth.lerping = false;
  smooth.anim = null;
  setLocked(true);
}

export function startScroll() {
  smooth.stopped = false;
  smooth.current = smooth.target = window.scrollY;
  setLocked(false);
}

/** Scroll to a position, element or selector with a cubic ease and a distance-based duration. */
export function scrollToTarget(target: number | string | Element, { offset = 0, immediate = false } = {}) {
  let y: number;
  if (typeof target === "number") y = target;
  else {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return;
    y = el.getBoundingClientRect().top + window.scrollY;
  }
  y = Math.max(0, Math.min(maxScroll(), y + offset));
  if (immediate || prefersReducedMotion() || !smooth.enabled) {
    if (immediate || prefersReducedMotion()) window.scrollTo(0, y);
    else window.scrollTo({ top: y, behavior: "smooth" });
    smooth.current = smooth.target = y;
    return;
  }
  const dist = Math.abs(window.scrollY - y);
  smooth.lerping = false;
  smooth.anim = { from: window.scrollY, to: y, t: 0, duration: Math.min(3.4, Math.max(1.1, dist / 2600)), ease: ease.cubicInOut };
}

export function goToSection(id: SectionId) {
  if (id === "home") return scrollToTarget(0);
  if (id === "products") return scrollToTarget(rt.anchors.appsOverview || "#products");
  scrollToTarget(`#${id}`);
}

export function goToApp(i: number) {
  const y = rt.anchors.apps[i];
  if (y != null) scrollToTarget(y);
}

/* ================================================================== */
/* Measuring + per-frame scroll state                                 */
/* ================================================================== */

let metrics: Measure | null = null;
let modules: Box[] = [];
let navTops: { id: SectionId; top: number }[] = [];
const refreshListeners = new Set<() => void>();
export const onRefresh = (fn: () => void) => {
  refreshListeners.add(fn);
  return () => {
    refreshListeners.delete(fn);
  };
};

const box = (el: Element | null): Box => {
  if (!el) return { top: 0, height: 0 };
  const r = el.getBoundingClientRect();
  return { top: r.top + window.scrollY, height: r.height };
};

export function sectionTops(): Record<string, number> {
  const out: Record<string, number> = {};
  SECTIONS.forEach(({ id }) => (out[id] = box(document.getElementById(id)).top));
  return out;
}

export function refresh() {
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const about = box(document.getElementById("about"));
  const careers = box(document.getElementById("careers"));
  const aboutSpan: Box = careers.height ? { top: about.top, height: careers.top + careers.height - about.top } : about;
  const panels = Array.from(document.querySelectorAll("[data-service-panel]"));
  modules = panels.map(box);
  navTops = SECTIONS.map(({ id }) => ({ id, top: box(document.getElementById(id)).top }));
  metrics = {
    vh,
    vw,
    max: maxScroll(),
    portrait: vw / vh < 0.95,
    sections: {
      home: box(document.getElementById("home")),
      products: box(document.getElementById("products")),
      build: box(document.getElementById("build")),
      about: aboutSpan,
      contact: box(document.getElementById("contact")),
    },
    servicePanels: modules.map((b) => b.top + b.height / 2 - vh / 2),
    appCount: APPS.length,
  };
  const { frames, anchors } = buildKeyframes(metrics);
  rt.keyframes = frames;
  rt.anchors = anchors;
  rt.version++;
  update();
  refreshListeners.forEach((f) => f());
}

function rigAt(y: number) {
  const f = rt.keyframes;
  if (f.length < 2) return;
  if (y <= f[0].at) {
    rt.rig.u = 0;
    rt.rig.sx = f[0].sx;
    rt.rig.sy = f[0].sy;
    return;
  }
  for (let i = 1; i < f.length; i++) {
    if (y < f[i].at) {
      const a = f[i - 1];
      const b = f[i];
      const p = (y - a.at) / (b.at - a.at);
      rt.rig.u = i - 1 + p;
      rt.rig.sx = a.sx + (b.sx - a.sx) * p;
      rt.rig.sy = a.sy + (b.sy - a.sy) * p;
      return;
    }
  }
  const z = f[f.length - 1];
  rt.rig.u = f.length - 1;
  rt.rig.sx = z.sx;
  rt.rig.sy = z.sy;
}

function update() {
  const M = metrics;
  if (!M) return;
  const y = window.scrollY;
  const { vh } = M;
  rt.progress = M.max > 0 ? clamp01(y / M.max) : 0;
  rigAt(y);

  (Object.keys(M.sections) as CameraSection[]).forEach((id) => {
    const s = M.sections[id];
    rt.arrive[id] = id === "home" ? 1 : clamp01((y - (s.top - vh)) / vh);
    const end = id === "home" ? s.top + s.height : s.top + s.height - vh;
    rt.inside[id] = clamp01((y - s.top) / Math.max(1, end - s.top));
  });

  // Active nav section: the last one whose top has passed 55% of the viewport.
  let section: SectionId = "home";
  for (const t of navTops) if (t.top <= y + vh * 0.55) section = t.id;

  // Which app is in focus.
  const ps = M.sections.products;
  const n = APPS.length;
  let app = -1;
  if (y >= ps.top && y <= ps.top + ps.height - vh + 1) {
    const p = clamp01((y - ps.top) / Math.max(1, ps.height - vh));
    const t = p * (n * APP_STEP_VH + 1);
    app = t < 0.75 ? -1 : Math.min(n - 1, Math.floor((t - 1 + 0.25 * APP_STEP_VH) / APP_STEP_VH));
  }

  // Which station module is docked.
  let service = -1;
  modules.forEach((b, i) => {
    const top = b.top - y;
    if (top < vh * 0.62 && top + b.height > vh * 0.38) service = i;
  });

  ui.set({ section, app, service, scrolled: y > 40 });
}

/** Visibility of an app's floating metric (0–1), from the camera path. */
export function worldMetricVisibility(i: number) {
  const { appArrive, appStep, appsEnd, vh } = rt.anchors;
  const a = appArrive[i];
  if (a == null || !appStep) return 0;
  const y = window.scrollY;
  const ss = (e0: number, e1: number, v: number) => {
    const r = clamp01((v - e0) / (e1 - e0));
    return r * r * (3 - 2 * r);
  };
  const last = i === appArrive.length - 1;
  const fadeIn = ss(a - 0.32 * appStep, a - 0.04 * appStep, y);
  const out = last ? appsEnd + 0.02 * vh : a + 0.55 * appStep;
  return fadeIn * (1 - ss(out, out + 0.25 * (last ? vh : appStep), y));
}

/* ================================================================== */
/* Launch sequence                                                    */
/* ================================================================== */

const ENTERED_KEY = "orbitapps:entered";

export function chooseIntroMode(webgl: boolean) {
  let seen = false;
  try {
    seen = sessionStorage.getItem(ENTERED_KEY) === "1";
  } catch {}
  intro.mode = !webgl || prefersReducedMotion() ? "none" : seen ? "short" : "full";
  if (intro.mode === "full") {
    rt.intro.dz = 60;
    rt.intro.dy = 6;
    intro.reveal = 0;
  } else if (intro.mode === "short") {
    rt.intro.dz = 16;
    rt.intro.dy = 3.5;
    intro.reveal = 1;
  } else {
    rt.intro.dz = 0;
    rt.intro.dy = 0;
    intro.reveal = 1;
  }
  return intro.mode;
}

interface Step {
  target: Record<string, number>;
  key: string;
  from: number;
  to: number;
  at: number;
  dur: number;
  ease: Ease;
}

let timeline: { time: number; duration: number; steps: Step[]; calls: { at: number; fn: () => void; done: boolean }[]; onComplete: () => void } | null = null;

const markEntered = () => ui.set({ entered: true });
function remember() {
  try {
    sessionStorage.setItem(ENTERED_KEY, "1");
  } catch {}
}

/** Builds (once) and arms the launch timeline. It advances from the WebGL frame loop. */
export function startIntro() {
  if (timeline) return;
  if (intro.mode === "none") {
    markEntered();
    return;
  }
  const I = intro as unknown as Record<string, number>;
  const R = rt.intro as unknown as Record<string, number>;
  if (intro.mode === "full") {
    intro.running = true;
    const steps: Step[] = [
      { target: I, key: "engine", from: 0, to: 1, at: 0.45, dur: 0.5, ease: ease.power2Out },
      { target: I, key: "shipT", from: 0, to: 1, at: 0.5, dur: 2.1, ease: ease.power3In },
      { target: I, key: "warp", from: 0, to: 1, at: 2.15, dur: 0.45, ease: ease.power2In },
      { target: R, key: "dz", from: 60, to: 0, at: 2.15, dur: 1.7, ease: ease.expoInOut },
      { target: R, key: "dy", from: 6, to: 0, at: 2.15, dur: 1.7, ease: ease.expoInOut },
      { target: I, key: "reveal", from: 0, to: 1, at: 2.35, dur: 1.3, ease: ease.power3Out },
      { target: I, key: "warp", from: 1, to: 0, at: 2.7, dur: 1, ease: ease.power2Out },
    ];
    const speedUp = () => (intro.speed = 3.5);
    const evs = ["wheel", "keydown", "pointerdown", "touchstart"] as const;
    evs.forEach((e) => window.addEventListener(e, speedUp, { once: true, passive: true }));
    timeline = {
      time: 0,
      duration: 3.7,
      steps,
      calls: [{ at: 3, fn: markEntered, done: false }],
      onComplete: () => {
        evs.forEach((e) => window.removeEventListener(e, speedUp));
        intro.running = false;
        remember();
      },
    };
  } else {
    timeline = {
      time: 0,
      duration: 1.6,
      steps: [
        { target: R, key: "dz", from: rt.intro.dz, to: 0, at: 0, dur: 1.6, ease: ease.expoOut },
        { target: R, key: "dy", from: rt.intro.dy, to: 0, at: 0, dur: 1.6, ease: ease.expoOut },
      ],
      calls: [{ at: 0.2, fn: markEntered, done: false }],
      onComplete: remember,
    };
  }
}

/** Called once per rendered WebGL frame. */
export function advanceIntro(dt: number) {
  const tl = timeline;
  if (!tl || tl.time >= tl.duration) return;
  tl.time = Math.min(tl.duration, tl.time + Math.min(dt, 1 / 30) * intro.speed);
  for (const s of tl.steps) {
    if (tl.time < s.at) continue;
    const p = s.dur <= 0 ? 1 : clamp01((tl.time - s.at) / s.dur);
    s.target[s.key] = s.from + (s.to - s.from) * s.ease(p);
  }
  tl.calls.forEach((c) => {
    if (!c.done && tl.time >= c.at) {
      c.done = true;
      c.fn();
    }
  });
  if (tl.time >= tl.duration) tl.onComplete();
}

/** The scene could not start: skip the launch and open the page. */
export function abortIntro() {
  intro.mode = "none";
  intro.running = false;
  intro.reveal = 1;
  rt.intro.dz = 0;
  rt.intro.dy = 0;
  ui.set({ ready: true, entered: true });
}

/* ================================================================== */
/* Boot                                                               */
/* ================================================================== */

export function startEngine({ reducedMotion }: { reducedMotion: boolean }) {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  smooth.enabled = !reducedMotion && !coarse;
  smooth.current = smooth.target = window.scrollY;
  document.documentElement.style.scrollBehavior = "auto";

  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("scroll", onNativeScroll, { passive: true });

  let resizeTimer = 0;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(refresh, 150);
  };
  window.addEventListener("resize", onResize);
  window.addEventListener("load", refresh);
  document.fonts?.ready.then(refresh);
  const ro = new ResizeObserver(onResize);
  const main = document.getElementById("main");
  if (main) ro.observe(main);

  const onPointer = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    rt.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    rt.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
  };
  window.addEventListener("pointermove", onPointer, { passive: true });

  const offSmooth = onFrame(smoothFrame, "early");
  const offUpdate = onFrame(update, "early");
  refresh();

  return () => {
    offSmooth();
    offUpdate();
    ro.disconnect();
    clearTimeout(resizeTimer);
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("scroll", onNativeScroll);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("load", refresh);
    window.removeEventListener("pointermove", onPointer);
  };
}
