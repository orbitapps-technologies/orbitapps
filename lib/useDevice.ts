"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

export interface DeviceProfile {
  webgl: boolean;
  lowPower: boolean;
}

let cached: DeviceProfile | null = null;

function compute(): DeviceProfile {
  let webgl = false;
  try {
    const c = document.createElement("canvas");
    webgl = !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    webgl = false;
  }
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.matchMedia("(max-width: 767px)").matches;
  return { webgl, lowPower: coarse || narrow || (navigator.hardwareConcurrency ?? 8) <= 4 };
}

/** null during SSR / first hydration pass. */
export function useDevice(): DeviceProfile | null {
  return useSyncExternalStore(
    () => () => {},
    () => (cached ??= compute()),
    () => null,
  );
}

/** True while the element is on screen (used to pause WebGL off-screen). */
export function useInView<T extends Element>(ref: React.RefObject<T | null>, margin = "0px") {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return inView;
}
