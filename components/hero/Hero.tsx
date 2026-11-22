"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type Variants,
} from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { SITE } from "@/lib/site";
import { ORBITS } from "@/lib/orbits";
import { PRODUCTS } from "@/lib/products";
import { focusProduct, hoverProduct, runtime, selectProduct, useUniverse } from "@/lib/universe";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UniverseStage } from "./UniverseStage";
import { ProductPanel } from "./ProductPanel";

const WORD = "ORBITAPPS".split("");
const EASE = [0.22, 1, 0.36, 1] as const;

const letter: Variants = {
  hidden: { opacity: 0, y: 48, filter: "blur(14px)" },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { delay: 1.1 + i * 0.07, duration: 1.1, ease: EASE },
  }),
};

const rise: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: (d: number) => ({ opacity: 1, y: 0, transition: { delay: d, duration: 0.9, ease: EASE } }),
};

export function Hero() {
  const section = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(true);
  const [chapterVisible, setChapterVisible] = useState(false);
  const selectedId = useUniverse((s) => s.selectedId);
  const reduce = useReducedMotion();
  const lookzon = PRODUCTS[0];
  const openOrbits = ORBITS.filter((o) => !o.product).length;

  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const introOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const introY = useTransform(scrollYProgress, [0, 0.2], [0, -40]);
  const chapterOpacity = useTransform(scrollYProgress, [0.48, 0.6, 0.94, 1], [0, 1, 1, 0.6]);
  const chapterY = useTransform(scrollYProgress, [0.48, 0.62], [30, 0]);
  useMotionValueEvent(scrollYProgress, "change", (v) => setChapterVisible(v > 0.5));

  // GSAP drives the 3D camera from scroll (scrubbed for a cinematic, smoothed feel).
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = section.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        runtime,
        { scroll: 0 },
        {
          scroll: 1,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: runtime.reducedMotion ? true : 1.2 },
        },
      );
    }, el);
    return () => ctx.revert();
  }, []);

  // Pause rendering off-screen; close any open panel when leaving the universe.
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
      if (!entry.isIntersecting) selectProduct(null);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id="home" ref={section} aria-label="OrbitApps universe" className="relative h-[210svh] md:h-[240svh]">
      <div id="universe" className="pointer-events-none absolute left-0 top-[118svh] h-px w-px md:top-[140svh]" aria-hidden />

      <div className="sticky top-0 h-svh w-full overflow-hidden">
        <UniverseStage paused={!inView} />

        {/* Legibility vignettes */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-space/90 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-space/95 via-space/50 to-transparent" />

        {/* Scene 1 — the universe */}
        <motion.div
          style={{ opacity: introOpacity, y: introY }}
          className="pointer-events-none absolute inset-0 z-10 flex flex-col"
          aria-hidden={selectedId !== null}
        >
          <div
            className="flex flex-col items-center px-4 pt-28 text-center transition-opacity duration-700 md:pt-32"
            style={{ opacity: selectedId ? 0 : 1 }}
          >
            <h1 className="font-wide text-solar-gradient flex select-none text-[clamp(2.6rem,11.5vw,10.5rem)] font-extralight leading-[0.9] tracking-[0.04em]">
              <span className="sr-only">OrbitApps — A Universe of Innovation</span>
              {WORD.map((ch, i) => (
                <motion.span
                  key={i}
                  aria-hidden
                  custom={i}
                  variants={letter}
                  initial={reduce ? false : "hidden"}
                  animate="show"
                  className="inline-block"
                >
                  {ch}
                </motion.span>
              ))}
            </h1>
            <motion.p
              custom={1.9}
              variants={rise}
              initial={reduce ? false : "hidden"}
              animate="show"
              className="mt-4 text-[clamp(1.05rem,2.1vw,1.6rem)] font-light tracking-wide text-ink"
            >
              A Universe of Innovation.
            </motion.p>
          </div>

          <div
            className="mt-auto flex items-end justify-between gap-10 px-5 pb-16 transition-opacity duration-700 md:px-10 md:pb-14 lg:px-14"
            style={{ opacity: selectedId ? 0 : 1 }}
          >
            <motion.div
              custom={2.3}
              variants={rise}
              initial={reduce ? false : "hidden"}
              animate="show"
              className="pointer-events-auto max-w-md"
            >
              <p className="text-balance text-[17px] leading-relaxed text-ink/90 md:text-lg">{SITE.heroSupport}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <a href="#universe">Explore our universe</a>
                </Button>
                {lookzon && (
                  <Button size="lg" variant="orbit" onClick={() => focusProduct(lookzon.id)}>
                    <span className="size-2 rounded-full bg-sky-400 shadow-[0_0_12px_#38BDF8]" />
                    Discover {lookzon.name}
                  </Button>
                )}
              </div>
            </motion.div>

            {/* System key — also the keyboard route into the 3D scene */}
            <motion.nav
              aria-label="Product planets"
              custom={2.6}
              variants={rise}
              initial={reduce ? false : "hidden"}
              animate="show"
              className="glass pointer-events-auto hidden w-[320px] rounded-3xl p-5 md:block"
            >
              <p className="font-wide text-[13px] tracking-[0.08em] text-ink">The center of our product universe</p>
              <ul className="mt-4 space-y-1">
                {PRODUCTS.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => focusProduct(p.id)}
                      onMouseEnter={() => hoverProduct(p.id)}
                      onMouseLeave={() => hoverProduct(null)}
                      onFocus={() => hoverProduct(p.id)}
                      onBlur={() => hoverProduct(null)}
                      className="group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-white/5"
                    >
                      <span
                        className="size-3 rounded-full"
                        style={{ background: p.look.color, boxShadow: `0 0 14px ${p.look.color}` }}
                      />
                      <span className="flex-1 text-[15px] text-ink">{p.name}</span>
                      <Badge variant="live">{p.status}</Badge>
                    </button>
                  </li>
                ))}
                {openOrbits > 0 && (
                  <li className="flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground">
                    <span className="size-3 rounded-full border border-dashed border-violet-300/60" />
                    Open orbits for future launches
                  </li>
                )}
              </ul>
              <p className="mt-4 border-t border-white/10 pt-4 text-[13px] leading-relaxed text-muted-foreground">
                Every product has its own orbit. Every innovation belongs to the OrbitApps ecosystem.
              </p>
            </motion.nav>
          </div>

          <motion.a
            href="#universe"
            custom={3}
            variants={rise}
            initial={reduce ? false : "hidden"}
            animate="show"
            className="pointer-events-auto absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-xs text-muted-foreground transition hover:text-ink"
          >
            Scroll to travel
            <ChevronDown className="size-4 animate-bounce" />
          </motion.a>
        </motion.div>

        {/* Scene 2 — the camera arrives at Lookzon */}
        {lookzon && (
          <motion.div
            style={{ opacity: chapterOpacity, y: chapterY }}
            className={`absolute inset-x-4 bottom-6 z-20 md:inset-x-auto md:bottom-auto md:right-10 md:top-1/2 md:w-[400px] md:-translate-y-1/2 lg:right-16 ${
              chapterVisible && !selectedId ? "pointer-events-auto" : "pointer-events-none"
            }`}
            aria-hidden={!chapterVisible || !!selectedId}
          >
            <div className="transition-opacity duration-500" style={{ opacity: selectedId ? 0 : 1 }}>
              <p className="text-sm text-sky-300">The first world in our system</p>
              <h2 className="font-wide mt-3 text-[clamp(2.4rem,5vw,3.6rem)] font-light leading-none text-ink">
                {lookzon.name}
              </h2>
              <p className="mt-4 text-xl text-ink">{lookzon.tagline}</p>
              <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{lookzon.description}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={() => selectProduct(lookzon.id)} tabIndex={chapterVisible ? 0 : -1}>
                  See features
                </Button>
                <Button asChild variant="orbit" tabIndex={chapterVisible ? 0 : -1}>
                  <a href={lookzon.url} target="_blank" rel="noopener noreferrer">
                    Explore {lookzon.name}
                    <ArrowUpRight />
                  </a>
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        <ProductPanel />
      </div>
    </section>
  );
}
