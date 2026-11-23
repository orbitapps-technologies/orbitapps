"use client";

import { useSyncExternalStore } from "react";
import type { SectionId } from "./data";

export type Vec3 = [number, number, number];

export interface Keyframe {
  at: number;
  pos: Vec3;
  target: Vec3;
  sx: number;
  sy: number;
}

export interface WorldScreen {
  x: number;
  y: number;
  r: number;
  visible: boolean;
}

export type CameraSection = "home" | "products" | "build" | "about" | "contact";

/**
 * Per-frame values shared by the DOM and the WebGL scene.
 * Mutated in place every frame — never read it during React render.
 */
export const rt = {
  rig: { u: 0, sx: 0, sy: 0 },
  keyframes: [] as Keyframe[],
  version: 0,
  intro: { dz: 16, dy: 3.5 },
  camera: { x: 0, y: 0, z: 0 },
  progress: 0,
  arrive: { home: 1, products: 0, build: 0, about: 0, contact: 0 } as Record<CameraSection, number>,
  inside: { home: 0, products: 0, build: 0, about: 0, contact: 0 } as Record<CameraSection, number>,
  anchors: {
    apps: [] as number[],
    appsOverview: 0,
    appArrive: [] as number[],
    appStep: 0,
    appsEnd: 0,
    vh: 0,
  },
  worlds: [] as WorldScreen[],
  pointer: { x: 0, y: 0 },
};

/** The launch sequence (ship fly-by, warp, camera dolly). */
export const intro = {
  mode: "full" as "full" | "short" | "none",
  shipT: 0,
  engine: 0,
  warp: 0,
  reveal: 1,
  running: false,
  speed: 1,
};

/* ------------------------------------------------------------------ */
/* UI state — changes rarely, drives React                             */
/* ------------------------------------------------------------------ */

export interface UIState {
  section: SectionId;
  app: number;
  service: number;
  ready: boolean;
  entered: boolean;
  menuOpen: boolean;
  scrolled: boolean;
}

let state: UIState = {
  section: "home",
  app: -1,
  service: -1,
  ready: false,
  entered: false,
  menuOpen: false,
  scrolled: false,
};
const listeners = new Set<() => void>();
const SERVER_STATE = state;

export const ui = {
  get: () => state,
  set(patch: Partial<UIState>) {
    let changed = false;
    for (const k in patch) {
      const key = k as keyof UIState;
      if (state[key] !== patch[key]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

export function useUI<T>(select: (s: UIState) => T): T {
  return useSyncExternalStore(
    ui.subscribe,
    () => select(state),
    () => select(SERVER_STATE),
  );
}
