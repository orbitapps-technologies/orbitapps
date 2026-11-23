"use client";

/** Registered by <SmoothScroll/>; falls back to native scrolling (touch, reduced motion). */
let impl: ((top: number) => void) | null = null;

export function registerSmoothScroll(fn: ((top: number) => void) | null) {
  impl = fn;
}

export function smoothScrollTo(top: number, instant = false) {
  if (instant) window.scrollTo({ top, behavior: "auto" });
  else if (impl) impl(top);
  else window.scrollTo({ top, behavior: "smooth" });
}
