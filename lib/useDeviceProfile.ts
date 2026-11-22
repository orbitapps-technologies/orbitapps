"use client";

import { useSyncExternalStore } from "react";
import { runtime } from "./universe";

export interface DeviceProfile {
  webgl: boolean;
  lowPower: boolean;
  reducedMotion: boolean;
}

let cached: DeviceProfile | null = null;

function detectWebGL() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    return !!gl;
  } catch {
    return false;
  }
}

function compute(): DeviceProfile {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.matchMedia("(max-width: 767px)").matches;
  const cores = navigator.hardwareConcurrency ?? 8;
  runtime.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return {
    webgl: cached?.webgl ?? detectWebGL(),
    lowPower: coarse || narrow || cores <= 4,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
}

function subscribe(cb: () => void) {
  const queries = [
    window.matchMedia("(prefers-reduced-motion: reduce)"),
    window.matchMedia("(max-width: 767px)"),
  ];
  const onChange = () => {
    cached = compute();
    cb();
  };
  queries.forEach((q) => q.addEventListener("change", onChange));
  return () => queries.forEach((q) => q.removeEventListener("change", onChange));
}

function getSnapshot() {
  if (!cached) cached = compute();
  return cached;
}

/** null during SSR and the first hydration pass — render a placeholder then. */
export function useDeviceProfile(): DeviceProfile | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

const reducedQuery = "(prefers-reduced-motion: reduce)";
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const q = window.matchMedia(reducedQuery);
      q.addEventListener("change", cb);
      return () => q.removeEventListener("change", cb);
    },
    () => window.matchMedia(reducedQuery).matches,
    () => false,
  );
}
