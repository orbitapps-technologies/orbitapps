"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { NAV_LINKS, SITE } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/brand/Marks";

const EASE = [0.22, 1, 0.36, 1] as const;

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 24));

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color] duration-500",
          scrolled || open ? "border-white/10 bg-black/70 backdrop-blur-xl" : "border-transparent",
        )}
      >
        <nav aria-label="Main" className="flex h-20 items-center justify-between px-5 md:px-10 lg:px-14">
          <a href="#top" aria-label={`${SITE.shortName} home`} onClick={() => setOpen(false)}>
            <Wordmark />
          </a>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="relative grid size-11 place-items-center"
          >
            <motion.span
              className="absolute h-px w-7 bg-white"
              animate={open ? { rotate: 45, y: 0, width: 28 } : { rotate: 0, y: -4, width: 28 }}
              transition={{ duration: 0.35, ease: EASE }}
            />
            <motion.span
              className="absolute h-px bg-white"
              animate={open ? { rotate: -45, y: 0, width: 28, x: 0 } : { rotate: 0, y: 4, width: 18, x: 5 }}
              transition={{ duration: 0.35, ease: EASE }}
            />
          </button>
        </nav>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="site-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-0 z-40 flex flex-col justify-between bg-black px-5 pb-10 pt-28 md:px-10 lg:px-14"
            initial={reduce ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)" }}
            animate={reduce ? { opacity: 1 } : { clipPath: "inset(0 0 0% 0)" }}
            exit={reduce ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <ul>
              {NAV_LINKS.map((l, i) => (
                <li key={l.href} className="overflow-hidden border-b border-white/10">
                  <motion.a
                    href={l.href}
                    onClick={() => setOpen(false)}
                    initial={reduce ? false : { y: "100%" }}
                    animate={{ y: "0%" }}
                    transition={{ delay: 0.15 + i * 0.05, duration: 0.7, ease: EASE }}
                    className="group flex items-baseline gap-6 py-4"
                  >
                    <span className="label-mono w-8">{String(i + 1).padStart(2, "0")}</span>
                    <span className="font-display text-[clamp(2rem,6vw,4.5rem)] transition-transform duration-300 group-hover:translate-x-3">
                      {l.label}
                    </span>
                  </motion.a>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <a href={`mailto:${SITE.email}`} className="text-lg text-white hover:text-white/70">
                {SITE.email}
              </a>
              <p className="label-mono">{SITE.location}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
