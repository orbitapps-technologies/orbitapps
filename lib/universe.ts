"use client";

import { useSyncExternalStore } from "react";
import type { Object3D } from "three";

/* ------------------------------------------------------------------ */
/* React-facing state (re-renders UI)                                  */
/* ------------------------------------------------------------------ */

export interface UniverseState {
  selectedId: string | null;
  hoveredId: string | null;
}

const initial: UniverseState = { selectedId: null, hoveredId: null };
let state: UniverseState = initial;
const listeners = new Set<() => void>();

export const universeStore = {
  get: () => state,
  set(patch: Partial<UniverseState>) {
    const next = { ...state, ...patch };
    if (next.selectedId === state.selectedId && next.hoveredId === state.hoveredId) return;
    state = next;
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

export function useUniverse<T>(selector: (s: UniverseState) => T): T {
  return useSyncExternalStore(
    universeStore.subscribe,
    () => selector(state),
    () => selector(initial),
  );
}

export const selectProduct = (id: string | null) => universeStore.set({ selectedId: id });
export const hoverProduct = (id: string | null) => universeStore.set({ hoveredId: id });

/* ------------------------------------------------------------------ */
/* Per-frame runtime values (mutated freely, read inside useFrame)     */
/* ------------------------------------------------------------------ */

export const runtime = {
  /** 0 → 1 scroll progress through the hero story */
  scroll: 0,
  /** normalised pointer, -1 → 1 */
  pointerX: 0,
  pointerY: 0,
  /** px moved since last pointer down — used to tell clicks from drags */
  dragDistance: 0,
  /** cinematic intro progress 0 → 1 */
  intro: 0,
  /** orbital clock multiplier — slows down while a planet is focused */
  timeScale: 1,
  reducedMotion: false,
};

/** World-space objects of each planet, so the camera can follow them. */
export const planetRegistry = new Map<string, Object3D>();

/* ------------------------------------------------------------------ */
/* Actions used by buttons across the page                             */
/* ------------------------------------------------------------------ */

/** Scroll back to the universe if needed, then fly the camera to a planet. */
export function focusProduct(id: string) {
  if (typeof window === "undefined") return;
  const hero = document.getElementById("home");
  const heroBottom = hero ? hero.getBoundingClientRect().bottom : 0;
  if (window.scrollY > 40 && heroBottom < window.innerHeight) {
    window.scrollTo({ top: 0, behavior: runtime.reducedMotion ? "auto" : "smooth" });
    window.setTimeout(() => selectProduct(id), runtime.reducedMotion ? 0 : 700);
  } else {
    selectProduct(id);
  }
}
