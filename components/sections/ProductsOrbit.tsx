"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { PRODUCTS, type Product } from "@/lib/products";
import { STOPS, iconRegistry, overlay, stage } from "@/lib/universe";
import { useDevice, useInView } from "@/lib/useDevice";
import { OrbitScene } from "@/components/three/lazy";
import { ProductMark } from "@/components/brand/Marks";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const external = (href: string) => (href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {});

/** Number that counts up whenever its value changes. */
function CountUp({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (n) => Math.round(n).toLocaleString("en-IN"));
  useEffect(() => {
    mv.set(value * 0.8);
    const c = animate(mv, value, { duration: 1.4, ease: EASE });
    return () => c.stop();
  }, [mv, value]);
  return <motion.span>{text}</motion.span>;
}

/** Three phone-shaped previews: real screenshots when provided, generated screens otherwise. */
function Previews({ app }: { app: Product }) {
  const shots = app.screenshots ?? [];
  const lines = app.features.length ? app.features.map((f) => f.title) : [app.tags[0], app.tags[1] ?? app.category, app.name];
  return (
    <div className="mt-5 grid grid-cols-3 gap-2.5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + i * 0.07, duration: 0.6, ease: EASE }}
          className={cn("relative aspect-[9/14] overflow-hidden rounded-lg border border-white/10", i === 2 && "hidden sm:block")}
          style={{ background: `linear-gradient(160deg, ${app.identity.accent}33, ${app.identity.deep}cc 60%, #050507)` }}
        >
          {shots[i] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shots[i]} alt={`${app.name} screenshot`} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-3 text-center">
              <ProductMark product={app} size="sm" />
              <p className="text-[11px] font-medium leading-tight text-white">{lines[i % lines.length]}</p>
              <span className="h-1 w-10 rounded-full bg-white/20" />
              <span className="h-1 w-14 rounded-full bg-white/10" />
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

/** App icons and the stat label, positioned every frame by the 3D scene. */
function Overlays({ app }: { app: Product | null }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {PRODUCTS.map((p) => (
        <div
          key={p.id}
          ref={(el) => {
            if (!el) return;
            iconRegistry.set(p.id, el);
            return () => {
              iconRegistry.delete(p.id);
            };
          }}
          className="absolute left-0 top-0 flex origin-bottom flex-col items-center will-change-transform"
          style={{ opacity: 0 }}
        >
          <ProductMark product={p} size="lg" />
          <span className="h-10 w-px bg-gradient-to-b from-white/70 to-transparent" />
        </div>
      ))}
      <div
        ref={(el) => {
          overlay.stat = el;
          return () => {
            overlay.stat = null;
          };
        }}
        className="absolute left-0 top-0 z-[80] will-change-transform"
        style={{ opacity: 0 }}
      >
        {app?.stat && (
          <div key={app.id}>
            <p className="font-display text-[clamp(1.6rem,3vw,2.6rem)] leading-none text-white">
              <CountUp value={app.stat.value} />
              {app.stat.suffix}
            </p>
            <p className="label-mono mt-2 flex items-center gap-2 !text-[0.6rem]">
              <span className="h-px w-5 bg-white/40" />
              {app.stat.label}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function ProductsOrbit() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const device = useDevice();
  const inView = useInView(ref, "200px");
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const raw = p * (STOPS - 1);
    const i = Math.min(STOPS - 2, Math.floor(raw));
    const focus = Math.min(STOPS - 1, i + smooth(0.35, 0.95, raw - i));
    stage.focus = focus;
    setActive(Math.round(focus));
  });

  const app = active > 0 ? PRODUCTS[active - 1] : null;
  const goTo = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const range = el.offsetHeight - window.innerHeight;
    const top = el.offsetTop + (range * (i + 0.65)) / (STOPS - 1);
    window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <section id="products" ref={ref} aria-labelledby="apps-title" style={{ height: `${STOPS * 80 + 40}svh` }} className="relative">
      <div className="sticky top-0 h-svh overflow-hidden">
        {device?.webgl && <OrbitScene lowPower={device.lowPower} paused={!inView} />}
        {device?.webgl && <Overlays app={app} />}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-black via-black/75 to-transparent lg:hidden" />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-[36%] bg-gradient-to-r from-black via-black/80 to-transparent lg:block" />

        {/* LEFT (desktop) / TOP (mobile): heading + list of worlds */}
        <div className="absolute left-5 right-5 top-24 z-20 md:left-10 lg:right-auto lg:left-14 lg:top-28 lg:w-[22rem] xl:w-[25rem]">
          <p className="label-mono flex items-center gap-4">
            <span className="h-px w-10 bg-white/40" />
            Apps
            <AnimatePresence>
              {active > 0 && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-white lg:hidden">
                  {String(active).padStart(2, "0")} / {String(PRODUCTS.length).padStart(2, "0")}
                </motion.span>
              )}
            </AnimatePresence>
          </p>
          <motion.div
            initial={false}
            animate={{ opacity: active === 0 ? 1 : 0.35, y: 0 }}
            className={cn("transition-[max-height] duration-700", active > 0 && "max-lg:pointer-events-none max-lg:opacity-0")}
          >
            <h2 id="apps-title" className="font-display mt-5 text-[clamp(2rem,4.4vw,3.6rem)]">
              Our apps,
              <br />
              in orbit.
            </h2>
            <p className="mt-5 max-w-sm text-ink-soft">
              {PRODUCTS.length} apps, each on its own orbit around the OrbitApps Sun. Scroll to visit every world.
            </p>
          </motion.div>

          <div className="mt-8 hidden lg:block">
            <p className="label-mono !text-[0.64rem]">Worlds in orbit</p>
            <ul className="mt-3 border-t border-white/10">
              {PRODUCTS.map((p, i) => {
                const on = active === i + 1;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => goTo(i + 1)}
                      className="group relative flex w-full items-center justify-between gap-4 border-b border-white/10 py-2.5 text-left"
                    >
                      <motion.span
                        aria-hidden
                        className="absolute left-0 top-0 h-full w-0.5"
                        style={{ background: p.identity.accent }}
                        initial={false}
                        animate={{ scaleY: on ? 1 : 0 }}
                      />
                      <span className={cn("font-display text-[0.92rem] transition-all duration-300", on ? "pl-3 text-white" : "text-white/55 group-hover:text-white")}>
                        {p.name}
                      </span>
                      <span className={cn("label-mono truncate !text-[0.56rem] transition-colors", on && "!text-white/80")}>{p.tags.join(" • ")}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* RIGHT (desktop) / BOTTOM (mobile): app card */}
        <div className="absolute inset-x-4 bottom-12 z-30 sm:inset-x-10 sm:bottom-16 lg:inset-x-auto lg:bottom-auto lg:right-14 lg:top-1/2 lg:w-[27rem] lg:-translate-y-1/2 xl:w-[30rem]">
          <AnimatePresence mode="wait">
            {app && (
              <motion.article
                key={app.id}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 30, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -16, filter: "blur(6px)" }}
                transition={{ duration: 0.5, ease: EASE }}
                className="panel p-5 sm:p-6"
                style={{ borderTop: `1px solid ${app.identity.accent}` }}
              >
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3.5">
                  <p className="label-mono truncate !text-[0.62rem]">{app.tags.join("  •  ")}</p>
                  {app.demo ? (
                    <span className="label-mono shrink-0 border border-white/15 px-2 py-0.5 !text-[0.56rem]">Demo</span>
                  ) : (
                    <span className="label-mono flex shrink-0 items-center gap-1.5 !text-[0.56rem] !text-emerald-300">
                      <span className="size-1.5 rounded-full bg-emerald-400" />
                      {app.status}
                    </span>
                  )}
                </div>
                <div className="mt-4 flex items-center gap-3.5">
                  <ProductMark product={app} size="md" />
                  <h3 className="font-display text-[clamp(1.6rem,3.4vw,2.4rem)]">{app.name}</h3>
                </div>
                <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">{app.description}</p>
                <div className="hidden sm:block">
                  <Previews app={app} />
                </div>
                {(() => {
                  const link = app.website ?? app.links[0];
                  return (
                    link && (
                      <a
                        href={link.href}
                        {...external(link.href)}
                        className="group mt-5 flex items-center justify-between border border-white/15 px-4 py-3 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-white transition hover:border-white/50 hover:bg-white/[0.04]"
                      >
                        {link.label}
                        <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
                      </a>
                    )
                  );
                })()}
              </motion.article>
            )}
          </AnimatePresence>
        </div>

        {/* BOTTOM: tabs (desktop) / dots (mobile) */}
        <nav aria-label="Apps" className="absolute inset-x-0 bottom-4 z-30 flex justify-center px-4 lg:bottom-6 lg:justify-end lg:px-14">
          <ul className="flex gap-1.5 lg:gap-3">
            {PRODUCTS.map((p, i) => {
              const on = active === i + 1;
              return (
                <li key={p.id}>
                  <button type="button" onClick={() => goTo(i + 1)} className="group flex flex-col gap-1.5" aria-label={`Go to ${p.name}`}>
                    <span className={cn("label-mono hidden !text-[0.55rem] transition-colors lg:block", on ? "!text-white" : "group-hover:!text-white")}>{p.name}</span>
                    <span className="block h-px w-5 bg-white/15 sm:w-8 lg:w-full lg:min-w-12">
                      <motion.span
                        className="block h-px"
                        style={{ background: p.identity.accent }}
                        initial={false}
                        animate={{ width: on ? "100%" : "0%" }}
                        transition={{ duration: 0.5, ease: EASE }}
                      />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {device && !device.webgl && (
          <div className="absolute inset-0 grid place-items-center">
            <div className="grid grid-cols-5 gap-6">
              {PRODUCTS.map((p) => (
                <ProductMark key={p.id} product={p} size="lg" />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
