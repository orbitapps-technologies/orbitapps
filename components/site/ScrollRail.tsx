"use client";

import { motion, useScroll, useSpring } from "framer-motion";

/** Thin vertical scroll-progress rail on the right edge (desktop), like the reference. */
export function ScrollRail() {
  const { scrollYProgress } = useScroll();
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  return (
    <div aria-hidden className="pointer-events-none fixed right-5 top-1/2 z-40 hidden h-56 -translate-y-1/2 lg:block">
      <div className="relative h-full w-px bg-white/15">
        <motion.div className="absolute inset-x-0 top-0 h-full origin-top bg-white" style={{ scaleY: fill }} />
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <span key={t} className="absolute -left-[3px] size-[7px] border border-white/40 bg-black" style={{ top: `calc(${t * 100}% - 3px)` }} />
        ))}
      </div>
    </div>
  );
}
