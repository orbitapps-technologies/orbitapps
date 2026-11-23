"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { SITE } from "@/lib/site";
import { PRODUCTS } from "@/lib/products";
import { useDevice, useInView } from "@/lib/useDevice";
import { HeroSun } from "@/components/three/lazy";

const EASE = [0.22, 1, 0.36, 1] as const;
const LINES = ["Building products", "that move the", "world forward."];

const line: Variants = {
  hidden: { y: "105%" },
  show: (i: number) => ({ y: "0%", transition: { delay: 0.3 + i * 0.09, duration: 1.1, ease: EASE } }),
};
const fade: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: (d: number) => ({ opacity: 1, y: 0, transition: { delay: d, duration: 0.9, ease: EASE } }),
};

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const device = useDevice();
  const inView = useInView(ref);
  const init = reduce ? false : "hidden";

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, -140]);
  const fadeOut = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const sceneScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);

  return (
    <section id="top" ref={ref} aria-labelledby="hero-title" className="relative isolate flex min-h-svh items-end overflow-hidden pb-14 pt-28 lg:items-center lg:pb-0">
      <motion.div style={reduce ? undefined : { opacity: fadeOut, scale: sceneScale }} className="absolute inset-0 -z-10">
        {device?.webgl && <HeroSun lowPower={device.lowPower} paused={!inView} />}
      </motion.div>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-black via-black/60 to-transparent lg:hidden" />

      <motion.div style={reduce ? undefined : { y, opacity: fadeOut }} className="w-full px-5 md:px-10 lg:px-14">
        <motion.p custom={0.15} variants={fade} initial={init} animate="show" className="label-mono flex items-center gap-4">
          <span className="h-px w-10 bg-white/40" />
          <span className="text-white">OrbitApps Technologies</span>
          <span>Bengaluru, India</span>
        </motion.p>

        <h1 id="hero-title" className="font-display text-chrome mt-6 text-[clamp(2.4rem,5.4vw,5.8rem)]">
          <span className="sr-only">{SITE.heroHeadline}</span>
          <span aria-hidden>
            {LINES.map((l, i) => (
              <span key={l} className="block overflow-hidden pb-[0.04em]">
                <motion.span className="block" custom={i} variants={line} initial={init} animate="show">
                  {l}
                </motion.span>
              </span>
            ))}
          </span>
        </h1>

        <motion.p custom={0.8} variants={fade} initial={init} animate="show" className="mt-7 max-w-xl text-base leading-relaxed text-ink-soft md:text-lg">
          {SITE.heroSupport} {PRODUCTS.length} apps and counting, each one a planet around the OrbitApps Sun.
        </motion.p>

        <motion.div custom={1} variants={fade} initial={init} animate="show" className="mt-9 flex flex-wrap items-center gap-5">
          <a
            href="#products"
            className="group inline-flex h-12 items-center gap-3 border border-white/25 px-6 font-mono text-xs uppercase tracking-[0.2em] text-white transition hover:border-white hover:bg-white hover:text-black"
          >
            Explore the apps
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </a>
        </motion.div>

        <motion.a
          href="#products"
          custom={1.3}
          variants={fade}
          initial={init}
          animate="show"
          className="label-mono mt-14 flex items-center gap-3 hover:text-white"
        >
          <motion.span
            className="block h-8 w-px bg-white/40"
            style={{ originY: 0 }}
            animate={reduce ? undefined : { scaleY: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          Scroll to explore
        </motion.a>
      </motion.div>
    </section>
  );
}
