"use client";

import { Component, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { SECTIONS, CONTACT, type SectionId } from "@/lib/space/data";
import { abortIntro, goToSection, onRefresh, sectionTops, startIntro, startScroll, stopScroll } from "@/lib/space/engine";
import { intro, rt, ui, useUI } from "@/lib/space/store";
import { ease, fromTo, onFrame, prefersReducedMotion, to, tween } from "@/lib/space/tween";
import { Logo } from "./ui";

const SpaceScene = dynamic(() => import("./scene/SpaceScene"), { ssr: false, loading: () => null });

class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(e: unknown) {
    console.error("[SpaceScene] WebGL scene failed, using the static sky.", e);
    abortIntro();
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** The fixed WebGL layer behind the page. */
export function SceneLayer({ webgl }: { webgl: boolean | null }) {
  const sky = <div className="static-sky" />;
  return (
    <div className="scene-layer" aria-hidden="true">
      {webgl === null ? null : webgl ? (
        <SceneBoundary fallback={sky}>
          <SpaceScene />
        </SceneBoundary>
      ) : (
        sky
      )}
      <div className="scene-vignette" />
    </div>
  );
}

const FADE = { full: 1.1, short: 0.5, none: 0.25 };

/** Black screen with one breathing point of light, until the scene has rendered. */
export function Preloader({ webgl }: { webgl: boolean | null }) {
  const ready = useUI((s) => s.ready);
  const [gone, setGone] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (webgl === false) ui.set({ ready: true });
    const t = setTimeout(() => ui.set({ ready: true, entered: true }), 8000);
    return () => clearTimeout(t);
  }, [webgl]);

  useEffect(() => {
    if (!ready) return;
    startIntro();
    const h = to(ref.current, { opacity: 0 }, { duration: FADE[intro.mode] ?? 0.5, ease: ease.power1InOut, onComplete: () => setGone(true) });
    return () => h.kill();
  }, [ready]);

  if (gone) return null;
  return (
    <div ref={ref} className="preloader" aria-hidden="true">
      <span className="preloader__light" />
    </div>
  );
}

export function Nav() {
  const section = useUI((s) => s.section);
  const open = useUI((s) => s.menuOpen);
  const entered = useUI((s) => s.entered);
  const scrolled = useUI((s) => s.scrolled);
  const list = useRef<HTMLUListElement>(null);
  const links = useRef<Partial<Record<SectionId, HTMLAnchorElement | null>>>({});
  const indicator = useRef<HTMLSpanElement>(null);
  const progress = useRef<HTMLSpanElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const burger = useRef<HTMLButtonElement>(null);
  const ind = useRef({ x: 0, w: 0 });
  const menuMounted = useRef(false);
  const setOpen = (v: boolean) => ui.set({ menuOpen: v });

  useEffect(
    () =>
      onFrame(() => {
        if (progress.current) progress.current.style.transform = `scaleX(${rt.progress})`;
      }),
    [],
  );

  const moveIndicator = useCallback(
    (instant = false) => {
      const a = links.current[section];
      const ul = list.current;
      const bar = indicator.current;
      if (!a || !ul || !bar) return;
      const r = a.getBoundingClientRect();
      const base = ul.getBoundingClientRect();
      const target = { x: r.left - base.left, w: r.width };
      const paint = (v: Record<string, number>) => {
        ind.current = { x: v.x, w: v.w };
        bar.style.transform = `translateX(${v.x}px)`;
        bar.style.width = `${v.w}px`;
      };
      if (instant || prefersReducedMotion()) return paint(target);
      return tween({ ...ind.current }, target, { duration: 0.8, ease: ease.expoOut, onUpdate: paint });
    },
    [section],
  );

  useLayoutEffect(() => {
    const h = moveIndicator();
    const onResize = () => moveIndicator(true);
    window.addEventListener("resize", onResize);
    document.fonts?.ready.then(() => moveIndicator(true));
    return () => {
      h?.kill();
      window.removeEventListener("resize", onResize);
    };
  }, [moveIndicator]);

  useEffect(() => {
    const m = menu.current;
    if (!m) return;
    const reduced = prefersReducedMotion();
    if (open) {
      menuMounted.current = true;
      stopScroll();
      document.documentElement.classList.add("menu-open");
      fromTo(m, { clip: 100 }, { clip: 0 }, { duration: reduced ? 0 : 0.9, ease: ease.expoInOut });
      fromTo(m.querySelectorAll("[data-menu-item]"), { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1 }, {
        duration: reduced ? 0 : 1,
        ease: ease.expoOut,
        stagger: 0.06,
        delay: reduced ? 0 : 0.35,
        clear: true,
        onComplete: () => m.querySelector<HTMLAnchorElement>(".menu__list a")?.focus({ preventScroll: true }),
      });
      const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
    if (!menuMounted.current) {
      menuMounted.current = true;
      return;
    }
    document.documentElement.classList.remove("menu-open");
    if (ui.get().entered) startScroll();
    to(m, { clip: 100 }, { duration: reduced ? 0 : 0.7, ease: ease.expoInOut });
  }, [open]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 961px)");
    const onChange = (e: MediaQueryListEvent) => e.matches && setOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const go = (id: SectionId) => (e: React.MouseEvent) => {
    e.preventDefault();
    const wasOpen = ui.get().menuOpen;
    setOpen(false);
    if (wasOpen) burger.current?.focus({ preventScroll: true });
    setTimeout(() => goToSection(id), wasOpen ? 250 : 0);
  };

  return (
    <header className={`nav ${scrolled ? "is-scrolled" : ""} ${open ? "is-open" : ""} ${entered ? "" : "is-launching"}`}>
      <div className="nav__bar container">
        <a href="#home" className="nav__brand" onClick={go("home")} aria-label="OrbitApps Technologies — home">
          <Logo />
        </a>
        <nav className="nav__links" aria-label="Primary">
          <ul ref={list}>
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  ref={(el) => void (links.current[s.id] = el)}
                  className={section === s.id ? "is-active" : ""}
                  aria-current={section === s.id ? "location" : undefined}
                  onClick={go(s.id)}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <span ref={indicator} className="nav__indicator" aria-hidden="true" />
        </nav>
        <button
          ref={burger}
          className="nav__burger"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen(!open)}
        >
          <span />
          <span />
        </button>
      </div>
      <span className="nav__progress" aria-hidden="true">
        <span ref={progress} />
      </span>
      <div id="mobile-menu" ref={menu} className="menu" aria-hidden={!open} inert={!open}>
        <div className="menu__inner container">
          <p className="mono menu__label" data-menu-item>
            Menu
          </p>
          <ul className="menu__list">
            {SECTIONS.map((s) => (
              <li key={s.id} className="menu__row">
                <a href={`#${s.id}`} onClick={go(s.id)} className={section === s.id ? "is-active" : ""} data-menu-item>
                  <span className="menu__text">{s.label}</span>
                </a>
              </li>
            ))}
          </ul>
          <div className="menu__foot" data-menu-item>
            <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
            <span>{CONTACT.location}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

/** Right-edge progress rail with a tick per section. */
export function Hud() {
  const section = useUI((s) => s.section);
  const entered = useUI((s) => s.entered);
  const fill = useRef<HTMLSpanElement>(null);
  const [ticks, setTicks] = useState<number[]>(() => SECTIONS.map((_, i) => i / (SECTIONS.length - 1)));

  useEffect(
    () =>
      onFrame(() => {
        if (fill.current) fill.current.style.transform = `scaleY(${rt.progress})`;
      }),
    [],
  );
  useEffect(() => {
    const measure = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const tops = sectionTops();
      setTicks(SECTIONS.map(({ id }) => Math.min(1, (tops[id] ?? 0) / max)));
    };
    measure();
    return onRefresh(measure);
  }, []);

  const active = Math.max(0, SECTIONS.findIndex((s) => s.id === section));
  return (
    <div className={`hud ${entered ? "is-ready" : ""}`} aria-hidden="true">
      <div className="hud__rail">
        <span className="hud__track">
          <span ref={fill} className="hud__fill" />
        </span>
        {SECTIONS.map((s, i) => (
          <button key={s.id} tabIndex={-1} className={`hud__tick ${i === active ? "is-active" : ""}`} style={{ top: `${ticks[i] * 100}%` }} onClick={() => goToSection(s.id)}>
            <span className="mono">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
