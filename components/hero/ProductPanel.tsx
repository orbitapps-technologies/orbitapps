"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Orbit, X } from "lucide-react";
import { getProduct } from "@/lib/products";
import { selectProduct, useUniverse } from "@/lib/universe";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ProductGlyph } from "@/components/brand/Marks";
import { FeatureIconFor } from "./featureIcons";

export function ProductPanel() {
  const selectedId = useUniverse((s) => s.selectedId);
  const product = getProduct(selectedId);
  const reduce = useReducedMotion();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!product) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") selectProduct(null);
    };
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => headingRef.current?.focus({ preventScroll: true }), 250);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [product]);

  return (
    <AnimatePresence>
      {product && (
        <motion.aside
          key={product.id}
          role="dialog"
          aria-modal="false"
          aria-labelledby={`panel-${product.id}`}
          className="glass pointer-events-auto absolute inset-x-3 bottom-3 z-30 max-h-[58svh] overflow-y-auto rounded-[28px] p-6 md:inset-x-auto md:bottom-auto md:right-6 md:top-24 md:max-h-[calc(100svh-8rem)] md:w-[420px] md:p-8 lg:right-10"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: reduce ? 0 : 0.35 }}
        >
          <button
            type="button"
            onClick={() => selectProduct(null)}
            className="absolute right-4 top-4 grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
            aria-label="Close product details"
          >
            <X className="size-4" />
          </button>

          <div className="flex items-center gap-4">
            <ProductGlyph product={product} />
            <div>
              <h2
                id={`panel-${product.id}`}
                ref={headingRef}
                tabIndex={-1}
                className="font-wide text-2xl font-medium tracking-wide text-foreground outline-none"
              >
                {product.name}
              </h2>
              <Badge variant="live" className="mt-1.5">
                <span className="size-1.5 rounded-full bg-emerald-300" />
                {product.status}
              </Badge>
            </div>
          </div>

          <p className="mt-6 text-lg leading-snug text-foreground">{product.tagline}</p>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{product.description}</p>

          {product.screenshot && (
            <motion.figure
              className="relative mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(120%_90%_at_50%_0%,rgba(56,189,248,0.28),rgba(8,13,31,0.2)_60%)]"
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.screenshot.src}
                alt={product.screenshot.alt}
                className="mx-auto h-56 w-auto object-contain pt-4 drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget.parentElement as HTMLElement).style.display = "none";
                }}
              />
            </motion.figure>
          )}

          <Separator className="my-6" />

          <ul className="space-y-4">
            {product.features.map((f, i) => (
              <motion.li
                key={f.title}
                className="flex gap-3.5"
                initial={reduce ? false : { opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 + i * 0.08, duration: 0.5 }}
              >
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border border-sky-300/20 bg-sky-400/10 text-sky-300">
                  <FeatureIconFor icon={f.icon} className="size-4" />
                </span>
                <span>
                  <span className="block text-[15px] font-medium text-foreground">{f.title}</span>
                  <span className="block text-sm leading-relaxed text-muted-foreground">{f.description}</span>
                </span>
              </motion.li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <a href={product.url} target="_blank" rel="noopener noreferrer">
                Explore {product.name}
                <ArrowUpRight />
              </a>
            </Button>
            <Button variant="orbit" onClick={() => selectProduct(null)}>
              <Orbit />
              Back to universe
            </Button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
