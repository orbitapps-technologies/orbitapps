"use client";

import { PRODUCTS } from "./products";

/** Scroll stops in the apps section: 0 = all planets, then one per app. */
export const STOPS = PRODUCTS.length + 1;

/** Per-frame values shared between the DOM and the 3D scene. */
export const stage = {
  /** continuous position: 0 = overview, 1 = first app, 2 = second app … */
  focus: 0,
};

/** DOM overlays positioned by the 3D scene every frame. */
export const iconRegistry = new Map<string, HTMLElement>();
export const overlay: { stat: HTMLElement | null } = { stat: null };
