"use client";

import { useSyncExternalStore } from "react";
import { PRODUCTS } from "./products";

/** Scroll stops in the apps section: 0 = all planets, then one per app. */
export const STOPS = PRODUCTS.length + 1;

/** Per-frame values shared between the DOM and the 3D scene. */
export const stage = {
  /** 0 = hero (close on the Sun) → 1 = whole solar system revealed */
  reveal: 0,
  /** apps tour: 0 = overview, 1 = first app, 2 = second app … */
  focus: 0,
};

/** DOM overlays positioned by the 3D scene every frame. */
export const iconRegistry = new Map<string, HTMLElement>();
export const overlay: { stat: HTMLElement | null } = { stat: null };

/** Which stop is active (0 = overview), shared by the scene overlays and the apps UI. */
let active = 0;
const listeners = new Set<() => void>();
export function setActiveStop(i: number) {
  if (i === active) return;
  active = i;
  listeners.forEach((l) => l());
}
export function useActiveStop() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => active,
    () => 0,
  );
}
