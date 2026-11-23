"use client";

import { useLayoutEffect, type RefObject } from "react";
import { from, prefersReducedMotion, setStyle, ease } from "@/lib/space/tween";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`logo ${className}`}>
      <svg className="logo__mark" viewBox="0 0 32 32" aria-hidden="true">
        <ellipse cx="16" cy="16" rx="13" ry="4.6" transform="rotate(-24 16 16)" fill="none" stroke="currentColor" strokeWidth="1.3" opacity=".55" />
        <circle cx="16" cy="16" r="6" fill="#000" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="26.3" cy="9.6" r="1.9" fill="currentColor" />
      </svg>
      <span className="logo__word">
        <span className="logo__space">OrbitApps</span>
        <span className="logo__tech">Technologies</span>
      </span>
    </span>
  );
}

const ROT = { right: 0, up: -90, down: 90, "up-right": -45 } as const;

export function Arrow({ direction = "right" }: { direction?: keyof typeof ROT }) {
  return (
    <svg className="btn__arrow" data-direction={direction} width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" style={{ rotate: `${ROT[direction]}deg` }}>
      <path d="M1 7h11M7.5 2.5 12 7l-4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

/**
 * Scroll reveals for every [data-reveal] inside `root`, played once when the element's top
 * passes 88% of the viewport. Kinds: (default) rise, "lines" (masked lines), "draw" (rule), "stagger" (children).
 */
export function useReveal(root: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = prefersReducedMotion();
    const items = Array.from(el.querySelectorAll<HTMLElement>("[data-reveal]"));
    const targets = (item: HTMLElement) => {
      const kind = item.dataset.reveal || "up";
      if (kind === "lines") return Array.from(item.querySelectorAll<HTMLElement>(".line__inner"));
      if (kind === "stagger") return Array.from(item.children) as HTMLElement[];
      return [item];
    };
    const hide = (item: HTMLElement) => {
      const kind = item.dataset.reveal || "up";
      const t = targets(item);
      if (reduced) return setStyle(t.length ? t : [item], { opacity: 0 });
      if (kind === "lines") setStyle(t, { yPercent: 115 });
      else if (kind === "draw") {
        item.style.transformOrigin = "0% 50%";
        setStyle(item, { scaleX: 0 });
      } else if (kind === "stagger") setStyle(t, { y: 36, opacity: 0 });
      else setStyle(item, { y: 44, opacity: 0 });
    };
    const play = (item: HTMLElement) => {
      const kind = item.dataset.reveal || "up";
      const delay = parseFloat(item.dataset.delay || "0");
      const t = targets(item);
      if (reduced) return from(t.length ? t : [item], { opacity: 0 }, { duration: 0.6, delay });
      if (kind === "lines") from(t, { yPercent: 115 }, { duration: 1.35, ease: ease.expoOut, stagger: 0.1, delay });
      else if (kind === "draw") from(item, { scaleX: 0 }, { duration: 1.6, ease: ease.expoInOut, delay });
      else if (kind === "stagger") from(t, { y: 36, opacity: 0 }, { duration: 1.1, ease: ease.expoOut, stagger: 0.08, delay });
      else from(item, { y: 44, opacity: 0 }, { duration: 1.2, ease: ease.expoOut, delay });
    };
    items.forEach(hide);
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting && e.boundingClientRect.top > 0) return;
          io.unobserve(e.target);
          play(e.target as HTMLElement);
        }),
      { rootMargin: "0px 0px -12% 0px" },
    );
    items.forEach((i) => io.observe(i));
    return () => io.disconnect();
  }, [root]);
}
