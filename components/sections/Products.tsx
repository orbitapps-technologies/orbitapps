"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight, Orbit } from "lucide-react";
import { OPEN_ORBITS, PRODUCTS, type Product } from "@/lib/products";
import { focusProduct } from "@/lib/universe";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductGlyph } from "@/components/brand/Marks";
import { FeatureIconFor } from "@/components/hero/featureIcons";

function ProductSpread({ product, flip }: { product: Product; flip: boolean }) {
  const visual = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), { stiffness: 140, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-9, 9]), { stiffness: 140, damping: 18 });

  // Gentle scroll parallax on the device mockup.
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = visual.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelector("[data-device]"),
        { yPercent: 8 },
        { yPercent: -8, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } },
      );
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <article className={`grid items-center gap-12 md:grid-cols-2 md:gap-16 ${flip ? "md:[&>*:first-child]:order-2" : ""}`}>
      <div
        ref={visual}
        className="relative mx-auto aspect-square w-full max-w-[520px] [perspective:1200px]"
        onPointerMove={(e) => {
          if (reduce || e.pointerType !== "mouse") return;
          const r = e.currentTarget.getBoundingClientRect();
          mx.set((e.clientX - r.left) / r.width - 0.5);
          my.set((e.clientY - r.top) / r.height - 0.5);
        }}
        onPointerLeave={() => {
          mx.set(0);
          my.set(0);
        }}
      >
        {/* The product's planet, as a soft backdrop */}
        <div
          className="absolute inset-[8%] rounded-full"
          style={{
            background: `radial-gradient(circle at 34% 30%, ${product.look.glow}55, ${product.look.color}33 38%, ${product.look.deep}22 62%, transparent 72%)`,
            boxShadow: `0 0 120px -20px ${product.look.color}66`,
          }}
        />
        <div className="absolute inset-[2%] rounded-full border border-white/[0.07]" />
        <div className="absolute inset-[-6%] rounded-full border border-dashed border-white/[0.05]" />
        <motion.div style={{ rotateX: rx, rotateY: ry }} className="absolute inset-0 grid place-items-center">
          <div data-device className="relative h-[86%]">
            {product.screenshot ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.screenshot.src}
                alt={product.screenshot.alt}
                loading="lazy"
                className="h-full w-auto object-contain drop-shadow-[0_40px_60px_rgba(0,0,0,0.65)]"
              />
            ) : (
              <ProductGlyph product={product} className="size-40" />
            )}
          </div>
        </motion.div>
      </div>

      <div>
        <div className="flex items-center gap-4">
          <ProductGlyph product={product} />
          <Badge variant="live">
            <span className="size-1.5 rounded-full bg-emerald-300" />
            {product.status}
          </Badge>
        </div>
        <h3 className="font-wide mt-6 text-[clamp(2.4rem,5vw,4rem)] font-light leading-none text-ink">{product.name}</h3>
        <p className="mt-4 text-xl text-ink">{product.tagline}</p>
        <p className="mt-3 max-w-lg leading-relaxed text-muted-foreground">{product.description}</p>

        <ul className="mt-8 divide-y divide-white/10 border-y border-white/10">
          {product.features.map((f) => (
            <li key={f.title} className="flex gap-4 py-4">
              <FeatureIconFor icon={f.icon} className="mt-1 size-5 shrink-0 text-sky-300" />
              <div>
                <p className="text-ink">{f.title}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <a href={product.url} target="_blank" rel="noopener noreferrer">
              Explore {product.name}
              <ArrowUpRight />
            </a>
          </Button>
          <Button variant="orbit" onClick={() => focusProduct(product.id)}>
            <Orbit />
            See it in orbit
          </Button>
        </div>
      </div>
    </article>
  );
}

export function Products() {
  return (
    <section id="products" className="relative px-5 py-28 md:px-10 md:py-36">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_40%_at_80%_30%,rgba(56,189,248,0.1),transparent_70%)]" />
      <div className="relative mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <h2 className="font-wide text-[clamp(2rem,4.6vw,3.8rem)] font-light leading-[1.04] text-ink">Our products</h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Each OrbitApps product is a planet in the system above, with its own path around the same core.
          </p>
        </div>

        <div className="mt-20 space-y-32">
          {PRODUCTS.map((p, i) => (
            <ProductSpread key={p.id} product={p} flip={i % 2 === 1} />
          ))}
        </div>

        {OPEN_ORBITS > 0 && (
          <div className="mt-28 flex flex-col items-start gap-4 rounded-[2rem] border border-dashed border-violet-300/25 px-7 py-8 md:flex-row md:items-center md:gap-8 md:px-10">
            <span className="relative grid size-14 shrink-0 place-items-center" aria-hidden>
              <span className="absolute inset-0 rounded-full border border-dashed border-violet-300/40 [animation:orbit-spin_18s_linear_infinite]" />
              <span className="size-2 rounded-full bg-violet-300 shadow-[0_0_14px_#A78BFA]" />
            </span>
            <div>
              <p className="text-lg text-ink">The next orbit is open.</p>
              <p className="mt-1 text-muted-foreground">
                New OrbitApps products will appear here, and as planets in the universe above, when they launch.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
