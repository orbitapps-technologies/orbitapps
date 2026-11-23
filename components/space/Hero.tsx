"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { APPS } from "@/lib/space/data";
import { goToSection } from "@/lib/space/engine";
import { useUI } from "@/lib/space/store";
import { ease, fromTo, onFrame, prefersReducedMotion, setStyle } from "@/lib/space/tween";
import { SITE } from "@/lib/site";
import { Arrow } from "./ui";

const LINES = ["Building products", "that move the", "world forward."];

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const foot = useRef<HTMLDivElement>(null);
  const entered = useUI((s) => s.entered);

  // Hidden until the launch finishes.
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    setStyle(el.querySelectorAll(".line__inner"), { yPercent: 115 });
    setStyle(el.querySelectorAll("[data-hero-fade]"), { y: 26, opacity: 0 });
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!entered || !el) return;
    const reduced = prefersReducedMotion();
    const d = reduced ? 0 : 0.35;
    const a = fromTo(el.querySelectorAll(".line__inner"), { yPercent: 115 }, { yPercent: 0 }, { duration: reduced ? 0 : 1.7, ease: ease.expoOut, stagger: 0.11, delay: d, clear: true });
    const b = fromTo(el.querySelectorAll("[data-hero-fade]"), { y: 26, opacity: 0 }, { y: 0, opacity: 1 }, {
      duration: reduced ? 0.3 : 1.3,
      ease: ease.expoOut,
      stagger: 0.09,
      delay: reduced ? 0 : d + 0.45,
      clear: true,
    });
    return () => {
      a.kill();
      b.kill();
    };
  }, [entered]);

  // Scrubbed exit: the copy drifts up and fades as the camera pulls away.
  useEffect(
    () =>
      onFrame(() => {
        const el = root.current;
        if (!el) return;
        const h = el.offsetHeight || 1;
        const y = window.scrollY - el.offsetTop;
        const p = Math.min(1, Math.max(0, y / (h * 0.75)));
        const q = Math.min(1, Math.max(0, y / (h * 0.25)));
        if (content.current) {
          content.current.style.transform = p ? `translateY(${-14 * p}%)` : "";
          content.current.style.opacity = String(1 - p);
          content.current.style.visibility = p >= 1 ? "hidden" : "";
        }
        if (foot.current) foot.current.style.opacity = String(1 - q);
      }),
    [],
  );

  return (
    <section id="home" ref={root} className="hero" aria-labelledby="hero-title">
      <div ref={content} className="hero__content container">
        <p className="eyebrow hero__eyebrow" data-hero-fade>
          <span className="eyebrow__index">OrbitApps Technologies</span> Bengaluru, India
        </p>
        <h1 id="hero-title" className="display hero__title">
          {LINES.map((l) => (
            <span key={l} className="line">
              <span className="line__inner">{l}</span>
            </span>
          ))}
        </h1>
        <div className="hero__row">
          <p className="lead hero__copy" data-hero-fade>
            {SITE.heroSupport} {APPS.length} apps and counting, each one a world in the OrbitApps universe.
          </p>
          <a
            href="#products"
            className="btn hero__cta"
            data-hero-fade
            onClick={(e) => {
              e.preventDefault();
              goToSection("products");
            }}
          >
            Explore the apps <Arrow />
          </a>
        </div>
      </div>
      <div ref={foot} className="hero__foot">
        <div className="hero__foot-inner container" data-hero-fade>
          <span className="hero__scroll mono">
            <i aria-hidden="true" />
            Scroll to explore
          </span>
          <span className="hero__meta mono">{APPS.map((a) => a.name).join("  /  ")}</span>
        </div>
      </div>
    </section>
  );
}
