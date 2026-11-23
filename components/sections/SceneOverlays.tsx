"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { PRODUCTS } from "@/lib/products";
import { iconRegistry, overlay, useActiveStop } from "@/lib/universe";
import { ProductMark } from "@/components/brand/Marks";

const EASE = [0.22, 1, 0.36, 1] as const;

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

/** App icons and the stat label, positioned every frame by the 3D scene. */
export function SceneOverlays() {
  const active = useActiveStop();
  const app = active > 0 ? PRODUCTS[active - 1] : null;
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

