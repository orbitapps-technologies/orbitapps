"use client";

/**
 * A tiny GSAP-style tween engine on one shared requestAnimationFrame ticker.
 * Covers what the site needs: eased numeric tweens, DOM from/to with stagger,
 * and a per-frame subscription for scroll-linked work.
 */

export type Ease = (t: number) => number;

export const ease = {
  none: ((t) => t) as Ease,
  power1InOut: ((t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)) as Ease,
  power2In: ((t) => t ** 3) as Ease,
  power2Out: ((t) => 1 - (1 - t) ** 3) as Ease,
  power3In: ((t) => t ** 4) as Ease,
  power3Out: ((t) => 1 - (1 - t) ** 4) as Ease,
  power3InOut: ((t) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2)) as Ease,
  cubicInOut: ((t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)) as Ease,
  expoOut: ((t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t))) as Ease,
  expoInOut: ((t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2)) as Ease,
};

/* ------------------------------------------------------------------ */
/* Ticker                                                              */
/* ------------------------------------------------------------------ */

export type FrameFn = (time: number, dt: number) => void;
const early = new Set<FrameFn>();
const frames = new Set<FrameFn>();
let raf = 0;
let last = 0;

function loop(now: number) {
  const dt = last ? Math.min((now - last) / 1000, 0.1) : 1 / 60;
  last = now;
  const t = now / 1000;
  early.forEach((f) => f(t, dt));
  runTweens(t);
  frames.forEach((f) => f(t, dt));
  raf = requestAnimationFrame(loop);
}

function wake() {
  if (!raf && typeof window !== "undefined") raf = requestAnimationFrame(loop);
}

/** Runs every frame. `priority: "early"` runs before tweens and other subscribers (used by smooth scroll). */
export function onFrame(fn: FrameFn, priority: "early" | "normal" = "normal") {
  (priority === "early" ? early : frames).add(fn);
  wake();
  return () => {
    early.delete(fn);
    frames.delete(fn);
  };
}

const clock = () => (typeof performance === "undefined" ? 0 : performance.now() / 1000);

/* ------------------------------------------------------------------ */
/* Numeric tweens                                                      */
/* ------------------------------------------------------------------ */

type Values = Record<string, number>;

interface Tween {
  from: Values;
  to: Values;
  cur: Values;
  start: number;
  duration: number;
  ease: Ease;
  onUpdate?: (v: Values) => void;
  onComplete?: () => void;
  dead: boolean;
  started: boolean;
  onStart?: () => void;
}

const tweens = new Set<Tween>();

function runTweens(t: number) {
  tweens.forEach((tw) => {
    if (tw.dead) {
      tweens.delete(tw);
      return;
    }
    if (t < tw.start) return;
    if (!tw.started) {
      tw.started = true;
      tw.onStart?.();
    }
    const p = tw.duration <= 0 ? 1 : Math.min(1, (t - tw.start) / tw.duration);
    const e = tw.ease(p);
    for (const k in tw.to) tw.cur[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * e;
    tw.onUpdate?.(tw.cur);
    if (p >= 1) {
      tw.dead = true;
      tweens.delete(tw);
      tw.onComplete?.();
    }
  });
}

export interface TweenHandle {
  kill(): void;
}

export interface TweenOptions {
  duration?: number;
  delay?: number;
  ease?: Ease;
  onStart?: () => void;
  onUpdate?: (v: Values) => void;
  onComplete?: () => void;
}

export function tween(from: Values, to: Values, o: TweenOptions = {}): TweenHandle {
  const tw: Tween = {
    from: { ...from },
    to,
    cur: { ...from },
    start: clock() + (o.delay ?? 0),
    duration: o.duration ?? 1,
    ease: o.ease ?? ease.power2Out,
    onUpdate: o.onUpdate,
    onComplete: o.onComplete,
    onStart: o.onStart,
    dead: false,
    started: false,
  };
  tweens.add(tw);
  wake();
  return { kill: () => (tw.dead = true) };
}

/** Tween properties of a plain object (like gsap.to(obj, …)). */
export function tweenObject<T extends object>(target: T, to: Partial<Record<keyof T, number>>, o: TweenOptions = {}) {
  const rec = target as unknown as Values;
  const from: Values = {};
  for (const k in to) from[k] = rec[k];
  return tween(from, to as Values, {
    ...o,
    onUpdate: (v) => {
      for (const k in v) rec[k] = v[k];
      o.onUpdate?.(v);
    },
  });
}

/* ------------------------------------------------------------------ */
/* DOM tweens                                                          */
/* ------------------------------------------------------------------ */

export interface StyleProps {
  x?: number;
  y?: number;
  yPercent?: number;
  scaleX?: number;
  scale?: number;
  opacity?: number;
  /** clip-path: inset(0 0 <clip>% 0) */
  clip?: number;
}

const IDENTITY: Required<StyleProps> = { x: 0, y: 0, yPercent: 0, scaleX: 1, scale: 1, opacity: 1, clip: 0 };
const domTweens = new WeakMap<Element, TweenHandle>();

export function applyStyle(el: HTMLElement, s: StyleProps) {
  const has = (k: keyof StyleProps) => s[k] !== undefined;
  if (has("x") || has("y") || has("yPercent") || has("scaleX") || has("scale")) {
    const parts: string[] = [];
    if (s.x || s.y) parts.push(`translate3d(${(s.x ?? 0).toFixed(2)}px, ${(s.y ?? 0).toFixed(2)}px, 0)`);
    if (s.yPercent) parts.push(`translateY(${s.yPercent.toFixed(3)}%)`);
    if (s.scaleX !== undefined && s.scaleX !== 1) parts.push(`scaleX(${s.scaleX.toFixed(4)})`);
    if (s.scale !== undefined && s.scale !== 1) parts.push(`scale(${s.scale.toFixed(4)})`);
    el.style.transform = parts.join(" ");
  }
  if (s.opacity !== undefined) {
    el.style.opacity = s.opacity.toFixed(3);
    el.style.visibility = s.opacity <= 0.001 ? "hidden" : "";
  }
  if (s.clip !== undefined) el.style.clipPath = `inset(0 0 ${s.clip.toFixed(3)}% 0)`;
}

function clearStyle(el: HTMLElement, keys: (keyof StyleProps)[]) {
  if (keys.some((k) => k !== "opacity" && k !== "clip")) el.style.transform = "";
  if (keys.includes("opacity")) {
    el.style.opacity = "";
    el.style.visibility = "";
  }
}

type Targets = Element | Element[] | NodeListOf<Element> | null | undefined;
const toList = (t: Targets) => (!t ? [] : t instanceof Element ? [t] : Array.from(t)) as HTMLElement[];

export function setStyle(targets: Targets, s: StyleProps) {
  toList(targets).forEach((el) => {
    domTweens.get(el)?.kill();
    applyStyle(el, s);
  });
}

export interface DomTweenOptions extends Omit<TweenOptions, "onUpdate"> {
  stagger?: number;
  /** Remove inline styles once the element reaches its natural state (default true for `from`). */
  clear?: boolean;
}

export function fromTo(targets: Targets, from: StyleProps, to: StyleProps, o: DomTweenOptions = {}): TweenHandle {
  const list = toList(targets);
  const handles = list.map((el, i) => {
    domTweens.get(el)?.kill();
    applyStyle(el, from);
    const keys = Array.from(new Set([...Object.keys(from), ...Object.keys(to)])) as (keyof StyleProps)[];
    const f: Values = {};
    const t: Values = {};
    keys.forEach((k) => {
      f[k] = from[k] ?? IDENTITY[k];
      t[k] = to[k] ?? IDENTITY[k];
    });
    const h = tween(f, t, {
      duration: o.duration,
      ease: o.ease,
      delay: (o.delay ?? 0) + i * (o.stagger ?? 0),
      onStart: i === 0 ? o.onStart : undefined,
      onUpdate: (v) => applyStyle(el, v),
      onComplete: () => {
        if (o.clear) clearStyle(el, keys);
        if (i === list.length - 1) o.onComplete?.();
      },
    });
    domTweens.set(el, h);
    return h;
  });
  if (!list.length) o.onComplete?.();
  return { kill: () => handles.forEach((h) => h.kill()) };
}

/** Animate from `from` to the element's natural state (like gsap.from). */
export function from(targets: Targets, s: StyleProps, o: DomTweenOptions = {}) {
  const to: StyleProps = {};
  (Object.keys(s) as (keyof StyleProps)[]).forEach((k) => (to[k] = IDENTITY[k]));
  return fromTo(targets, s, to, { clear: true, ...o });
}

export function to(targets: Targets, s: StyleProps, o: DomTweenOptions = {}) {
  const list = toList(targets);
  const handles = list.map((el, i) => {
    domTweens.get(el)?.kill();
    const cs = getComputedStyle(el);
    const fromS: StyleProps = {};
    (Object.keys(s) as (keyof StyleProps)[]).forEach((k) => {
      if (k === "opacity") fromS.opacity = el.style.visibility === "hidden" ? 0 : parseFloat(cs.opacity);
      else if (k === "clip") {
        const m = /inset\(\s*0(?:px)?\s+0(?:px)?\s+([\d.]+)%/.exec(el.style.clipPath);
        fromS.clip = m ? parseFloat(m[1]) : 0;
      } else fromS[k] = IDENTITY[k];
    });
    return fromTo(el, fromS, s, { ...o, delay: (o.delay ?? 0) + i * (o.stagger ?? 0), stagger: 0, onComplete: i === list.length - 1 ? o.onComplete : undefined });
  });
  return { kill: () => handles.forEach((h) => h.kill()) };
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
