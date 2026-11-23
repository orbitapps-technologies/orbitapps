"use client";

import { useEffect } from "react";

/**
 * Lenis-style smooth scrolling for mouse wheels and in-page links.
 * Touch, keyboard and the scrollbar keep native behaviour.
 * Disabled when the user prefers reduced motion.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const root = document.documentElement;
    const prevBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";

    let target = window.scrollY;
    let current = window.scrollY;
    let raf = 0;
    let running = false;
    const max = () => root.scrollHeight - window.innerHeight;

    const tick = () => {
      current += (target - current) * 0.09;
      if (Math.abs(target - current) < 0.4) {
        current = target;
        running = false;
      }
      window.scrollTo(0, current);
      if (running) raf = requestAnimationFrame(tick);
    };
    const start = () => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || document.body.style.overflow === "hidden") return;
      // Let inner scrollable elements handle their own wheel events.
      let el = e.target as HTMLElement | null;
      while (el && el !== document.body) {
        const s = getComputedStyle(el);
        if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight) return;
        el = el.parentElement;
      }
      e.preventDefault();
      const delta = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
      target = Math.max(0, Math.min(max(), target + delta));
      start();
    };

    const onScroll = () => {
      if (!running) target = current = window.scrollY;
    };

    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.("a[href^='#']") as HTMLAnchorElement | null;
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
      const id = a.getAttribute("href")!.slice(1);
      const el = id ? document.getElementById(id) : null;
      if (!el && id !== "top") return;
      e.preventDefault();
      const top = el ? el.getBoundingClientRect().top + window.scrollY : 0;
      current = window.scrollY;
      target = Math.max(0, Math.min(max(), top));
      history.replaceState(null, "", `#${id}`);
      start();
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onClick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick);
      root.style.scrollBehavior = prevBehavior;
    };
  }, []);

  return null;
}
