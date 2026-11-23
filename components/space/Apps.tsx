"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { APPS, initials, type SpaceApp } from "@/lib/space/data";
import { goToApp, worldMetricVisibility } from "@/lib/space/engine";
import { APP_STEP_VH } from "@/lib/space/layout";
import { rt, useUI } from "@/lib/space/store";
import { ease, from, onFrame, prefersReducedMotion, to, tween, type TweenHandle } from "@/lib/space/tween";
import { Arrow, useReveal } from "./ui";

const fmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const formatStat = (s: NonNullable<SpaceApp["stat"]>) => `${fmt.format(s.value)}${s.suffix ?? ""}`;

function PlayIcon() {
  return (
    <svg className="play-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.2 2.6 13.6 12l-9.4 9.4c-.4-.2-.7-.7-.7-1.3V3.9c0-.6.3-1.1.7-1.3Z" fill="currentColor" opacity=".9" />
      <path d="m16.8 8.8-3.2 3.2 3.2 3.2 3.7-2.1c.9-.5.9-1.7 0-2.2l-3.7-2.1Z" fill="currentColor" opacity=".7" />
      <path d="M4.2 2.6c.3-.1.7-.1 1 .1l11.6 6.1-3.2 3.2-9.4-9.4ZM13.6 12l3.2 3.2-11.6 6.1c-.3.2-.7.2-1 .1l9.4-9.4Z" fill="currentColor" opacity=".5" />
    </svg>
  );
}

function AppPanel({ app }: { app: SpaceApp }) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (prefersReducedMotion() || !ref.current) return;
    const h = from(ref.current.querySelectorAll("[data-card-item]"), { y: 16, opacity: 0 }, { duration: 0.9, ease: ease.expoOut, stagger: 0.05, delay: 0.05 });
    return () => h.kill();
  }, [app.id]);
  const hasLink = !!app.playStore;
  const showDescription = app.description && app.description !== app.summary;
  return (
    <article ref={ref} className="app-panel panel" style={{ "--app-accent": app.accent } as React.CSSProperties} aria-labelledby={`app-${app.id}-name`}>
      <header className="app-panel__meta mono" data-card-item>
        <span>{app.tags.join(" • ")}</span>
        <span className="app-panel__status">
          <i aria-hidden="true" />
          {app.status}
        </span>
      </header>
      <div className="app-panel__title" data-card-item>
        {app.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="app-panel__icon" src={app.logo} alt={`${app.name} app icon`} width={52} height={52} />
        ) : (
          <span className="app-panel__icon is-generated" style={{ background: `linear-gradient(145deg, ${app.accent}, ${app.deep})` }} aria-hidden="true">
            {initials(app.name)}
          </span>
        )}
        <h3 id={`app-${app.id}-name`} className="display app-panel__name">
          {app.name}
        </h3>
      </div>
      <p className="app-panel__summary" data-card-item>
        {app.summary}
      </p>
      {showDescription && (
        <p className="app-panel__desc" data-card-item>
          {app.description}
        </p>
      )}
      {app.features.length > 0 && (
        <ul className="app-panel__features mono" data-card-item>
          {app.features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}
      {app.stat && <p className="sr-only">{`${formatStat(app.stat)} ${app.stat.label.toLowerCase()}.`}</p>}
      {app.screens.length > 0 && (
        <ul className={`app-panel__screens ${app.screens.length === 1 ? "is-single" : ""}`} data-card-item>
          {app.screens.map((src, i) => (
            <li key={src}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`${app.name}, screenshot ${i + 1}`}
                width={180}
                height={320}
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  const list = e.currentTarget.closest("ul");
                  e.currentTarget.closest("li")?.remove();
                  if (list && !list.children.length) list.remove();
                }}
              />
            </li>
          ))}
        </ul>
      )}
      {hasLink ? (
        <a
          className="btn app-panel__cta"
          data-card-item
          href={app.playStore}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View ${app.name} on Google Play (opens in a new tab)`}
        >
          <span className="app-panel__cta-label">
            <PlayIcon /> View on Google Play
          </span>
          <Arrow direction="up-right" />
        </a>
      ) : (
        <span className="btn app-panel__cta is-pending" data-card-item aria-disabled="true" title="Google Play link coming soon">
          <span className="app-panel__cta-label">
            <PlayIcon /> View on Google Play
          </span>
          <span className="app-panel__soon">Soon</span>
        </span>
      )}
    </article>
  );
}

/** Keeps the card on screen while the next one is chosen, so cards cross-fade instead of popping. */
function PanelStage({ app }: { app: SpaceApp | null }) {
  const [shown, setShown] = useState<SpaceApp | null>(app);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (app?.id === shown?.id) return;
    const el = box.current;
    if (!el || !shown || prefersReducedMotion()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- swap immediately when nothing is on screen
      setShown(app);
      return;
    }
    const h = to(el, { y: -12, opacity: 0 }, {
      duration: 0.28,
      ease: ease.power2In,
      onComplete: () => {
        el.style.transform = "";
        el.style.opacity = "";
        el.style.visibility = "";
        setShown(app);
      },
    });
    return () => h.kill();
  }, [app, shown]);
  return <div ref={box}>{shown && <AppPanel key={shown.id} app={shown} />}</div>;
}

type Side = "left" | "right" | "top" | "bottom" | "bottom-right";
interface Bounds {
  top?: number;
  right?: number;
  bottom?: number;
}

/** Floating counter beside a planet, positioned from the 3D projection every frame. */
function WorldMetric({ app, index, side, bounds }: { app: SpaceApp; index: number; side: Side; bounds: () => Bounds }) {
  const root = useRef<HTMLDivElement>(null);
  const value = useRef<HTMLSpanElement>(null);
  const stat = app.stat!;

  useEffect(() => {
    const el = root.current!;
    const num = value.current!;
    const reduced = prefersReducedMotion();
    const st = { w: 0, h: 0, counted: false, tw: null as TweenHandle | null };
    const ro = new ResizeObserver(() => {
      st.w = el.offsetWidth;
      st.h = el.offsetHeight;
    });
    ro.observe(el);
    const reset = () => {
      st.tw?.kill();
      num.textContent = "0";
      st.counted = false;
    };
    const count = () => {
      st.counted = true;
      if (reduced) {
        num.textContent = formatStat(stat);
        return;
      }
      let last = "";
      st.tw = tween({ v: 0 }, { v: stat.value }, {
        duration: 2.2,
        ease: ease.power3InOut,
        onUpdate: ({ v }) => {
          const t = fmt.format(Math.floor(v));
          if (t !== last) num.textContent = last = t;
        },
        onComplete: () => (num.textContent = formatStat(stat)),
      });
    };
    reset();
    const off = onFrame(() => {
      const w = rt.worlds[index];
      const vis = w?.visible ? worldMetricVisibility(index) : 0;
      if (vis < 0.002) {
        if (el.style.visibility !== "hidden") el.style.visibility = "hidden";
        if (st.counted && vis === 0) reset();
        return;
      }
      el.style.visibility = "visible";
      const gap = w.r * 0.35 + 22;
      const b = bounds();
      const right = b.right ?? window.innerWidth - 16;
      // Prefer the requested side; if it would run into the card or off screen, use the other side, then below.
      let place: Side = side;
      if (place === "right" && w.x + w.r + gap + st.w > right) place = w.x - w.r - gap - st.w > 16 ? "left" : "bottom";
      let x: number;
      let y: number;
      switch (place) {
        case "left":
          x = w.x - w.r - gap - st.w;
          y = w.y - st.h / 2;
          break;
        case "top":
          x = w.x - st.w / 2;
          y = w.y - w.r - gap - st.h;
          break;
        case "bottom":
          x = w.x - st.w / 2;
          y = w.y + w.r + gap * 0.6;
          break;
        case "bottom-right":
          x = w.x + w.r * 0.55;
          y = w.y + w.r * 0.85 + 10;
          break;
        default:
          x = w.x + w.r + gap;
          y = w.y - st.h / 2;
      }
      x = Math.max(16, Math.min(x, right - st.w));
      y = Math.max(b.top ?? 90, Math.min(y, (b.bottom ?? window.innerHeight - 16) - st.h));
      const drift = (1 - vis) * 16;
      el.style.opacity = vis.toFixed(3);
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${(y + drift).toFixed(1)}px, 0) scale(${(0.94 + 0.06 * vis).toFixed(3)})`;
      if (vis > 0.6 && !st.counted) count();
    });
    return () => {
      off();
      ro.disconnect();
      st.tw?.kill();
    };
  }, [index, side, bounds, stat]);

  return (
    <div ref={root} className={`world-metric world-metric--${side}`} style={{ visibility: "hidden" }}>
      <span ref={value} className="world-metric__value">
        0
      </span>
      <span className="world-metric__label">{stat.label}</span>
    </div>
  );
}

const portraitQuery = (cb: () => void) => {
  const m = window.matchMedia("(max-aspect-ratio: 19/20)");
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

function WorldMetrics({ panel }: { panel: React.RefObject<HTMLDivElement | null> }) {
  const portrait = useSyncExternalStore(portraitQuery, () => window.matchMedia("(max-aspect-ratio: 19/20)").matches, () => false);
  const rect = useRef<DOMRect | null>(null);
  useEffect(() => {
    const el = panel.current;
    if (!el) return;
    const measure = () => (rect.current = el.getBoundingClientRect());
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    measure();
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [panel]);
  const bounds = useCallback((): Bounds => {
    const r = rect.current;
    if (!r || !r.width) return { top: 96 };
    return portrait ? { top: 96, bottom: r.height > 0 ? r.top - 14 : undefined } : { top: 96, right: r.left - 32, bottom: window.innerHeight - 96 };
  }, [portrait]);
  return (
    <div className="world-metrics" aria-hidden="true">
      {APPS.map((app, i) =>
        app.stat?.value ? <WorldMetric key={app.id} app={app} index={i} side={portrait ? "bottom-right" : "right"} bounds={bounds} /> : null,
      )}
    </div>
  );
}

export function Apps() {
  const root = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const active = useUI((s) => s.app);
  useReveal(root);
  const app = active >= 0 ? APPS[active] : null;
  const dense = APPS.length > 6;

  return (
    <section id="products" ref={root} className="apps" style={{ "--stage-vh": APPS.length * APP_STEP_VH + 2 } as React.CSSProperties} aria-labelledby="apps-title">
      <div className={`apps__stage ${app ? "has-focus" : ""}`}>
        <div className="apps__frame container">
          <header className="apps__intro">
            <p className="eyebrow" data-reveal>
              Products
            </p>
            <h2 id="apps-title" className="display apps__title" data-reveal="lines">
              <span className="line">
                <span className="line__inner">Our products,</span>
              </span>
              <span className="line apps__title-offset">
                <span className="line__inner">in orbit.</span>
              </span>
            </h2>
            <p className="lead apps__lead" data-reveal data-delay="0.15">
              {APPS.length} apps, each one a world in the OrbitApps universe, built and run by our own team. Scroll to visit each one.
            </p>
          </header>

          <nav className={`apps__index ${dense ? "is-dense" : ""}`} aria-label="App worlds">
            <span className="mono apps__index-label">Worlds in orbit</span>
            <ol>
              {APPS.map((a, i) => (
                <li key={a.id}>
                  <button className={i === active ? "is-active" : ""} style={{ "--app-accent": a.accent } as React.CSSProperties} onClick={() => goToApp(i)} aria-current={i === active ? "true" : undefined}>
                    <span className="apps__index-name">{a.name}</span>
                    <span className="mono apps__index-cat">{a.category.split(" • ")[0]}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <div ref={panel} className="apps__panel">
            <PanelStage app={app} />
          </div>

          <nav className={`apps__progress mono ${dense ? "is-dense" : ""}`} aria-label="Jump to app">
            <ol className="apps__segments">
              {APPS.map((a, i) => (
                <li key={a.id}>
                  <button
                    className={i === active ? "is-active" : i < active ? "is-past" : ""}
                    style={{ "--app-accent": a.accent } as React.CSSProperties}
                    onClick={() => goToApp(i)}
                    aria-current={i === active ? "true" : undefined}
                    aria-label={a.name}
                  >
                    <span className="apps__segment-name">{a.name}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </div>
      <WorldMetrics panel={panel} />
    </section>
  );
}
