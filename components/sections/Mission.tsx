"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SITE } from "@/lib/site";

// "OrbitApps is a lean, fast-moving tech company …"
const STATEMENT = `OrbitApps is ${SITE.description.charAt(0).toLowerCase()}${SITE.description.slice(1)} Every product has its own orbit. Every innovation belongs to the OrbitApps ecosystem.`;

const PILLARS = [
  { title: "Connect", body: "Apps that keep people close to the ones who matter to them." },
  { title: "Protect", body: "Safety that works quietly in the background and speaks up when it counts." },
  { title: "Empower", body: "Simple, dependable tools that make everyday life in Bharat easier." },
];

export function Mission() {
  const ref = useRef<HTMLParagraphElement>(null);

  // Words brighten as the statement scrolls through the viewport.
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll("[data-word]"),
        { opacity: 0.18 },
        {
          opacity: 1,
          stagger: 0.05,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: true },
        },
      );
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section id="about" className="relative px-5 py-28 md:px-10 md:py-40">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_15%_20%,rgba(109,74,255,0.14),transparent_70%)]" />
      <div className="relative mx-auto max-w-6xl">
        <h2 className="font-wide max-w-4xl text-[clamp(2rem,5.2vw,4.4rem)] font-light leading-[1.02] tracking-tight text-ink">
          {SITE.tagline}
        </h2>

        <p ref={ref} className="mt-12 max-w-[34ch] text-[clamp(1.35rem,2.6vw,2.15rem)] font-light leading-snug text-ink md:mt-16">
          {STATEMENT.split(" ").map((w, i) => (
            <span key={i} data-word className="inline-block pr-[0.28em]">
              {w}
            </span>
          ))}
        </p>

        <dl className="mt-20 grid grid-cols-2 gap-x-8 gap-y-10 border-t border-white/10 pt-10 md:grid-cols-4">
          {SITE.highlights.map((h) => (
            <div key={h.label}>
              <dt className="text-sm text-muted-foreground">{h.label}</dt>
              <dd className="font-wide mt-2 text-2xl font-light text-ink">{h.value}</dd>
            </div>
          ))}
          <div>
            <dt className="text-sm text-muted-foreground">Home base</dt>
            <dd className="font-wide mt-2 text-2xl font-light text-ink">Bengaluru</dd>
          </div>
        </dl>

        <div className="mt-24 grid gap-12 md:grid-cols-3 md:gap-10">
          {PILLARS.map((p, i) => (
            <div key={p.title} className="relative pl-6">
              <span
                className="absolute left-0 top-2 size-2.5 rounded-full"
                style={{
                  background: ["#FFB347", "#38BDF8", "#6D4AFF"][i],
                  boxShadow: `0 0 14px ${["#FFB347", "#38BDF8", "#6D4AFF"][i]}`,
                }}
                aria-hidden
              />
              <h3 className="text-xl text-ink">{p.title}</h3>
              <p className="mt-2 max-w-xs leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
