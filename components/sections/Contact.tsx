"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUp } from "lucide-react";
import { NAV_LINKS, SITE } from "@/lib/site";
import { Wordmark } from "@/components/brand/Marks";
import { EASE } from "@/components/motion/Reveal";

export function Contact() {
  const reduce = useReducedMotion();
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SITE.address.mapsQuery)}`;
  const rows = [
    { label: "Email", value: SITE.email, href: `mailto:${SITE.email}` },
    { label: "Location", value: "Bengaluru, India", href: mapsUrl },
    { label: "Registered office", value: SITE.address.lines.join(", "), href: mapsUrl },
  ];

  return (
    <section id="contact" className="relative overflow-hidden border-t border-white/10">
      <div className="px-5 pt-28 md:px-10 md:pt-36 lg:px-14">
        <p className="label-mono flex items-center gap-4">
          <span className="h-px w-10 bg-white/40" />
          Contact
        </p>
        <motion.h2
          initial={reduce ? false : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 1, ease: EASE }}
          className="font-display text-chrome mt-5 text-[clamp(2.4rem,6.4vw,6rem)]"
        >
          Let&apos;s build
          <br />
          what&apos;s next.
        </motion.h2>

        <dl className="mt-16 max-w-4xl">
          {rows.map((r) => (
            <div key={r.label} className="border-t border-white/10 py-6">
              <dt className="label-mono !text-[0.66rem]">{r.label}</dt>
              <dd className="mt-2">
                <a
                  href={r.href}
                  {...(r.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="text-lg text-white transition hover:text-white/70"
                >
                  {r.value}
                </a>
              </dd>
            </div>
          ))}
        </dl>

        <a href={`mailto:${SITE.email}`} className="group mt-10 inline-flex items-center gap-6">
          <span className="font-display border-b border-white pb-2 text-[clamp(1.4rem,2.6vw,2rem)]">Get in touch</span>
          <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden />
          <span className="hidden text-ink-muted sm:inline">Tell us what you are building.</span>
        </a>
      </div>

      {/* Planet horizon */}
      <div aria-hidden className="relative mt-24 h-[22rem] md:h-[28rem]">
        <div className="absolute left-1/2 top-[38%] h-[220vw] w-[220vw] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,#0b0d14_92%,#1e293b_96%,#94a3b8_99%,#f8fafc_100%)] shadow-[0_-30px_120px_10px_rgba(148,163,184,0.35)] md:h-[180vw] md:w-[180vw]" />
        <motion.div
          className="absolute right-[12%] top-[34%] size-3 rounded-full bg-white shadow-[0_0_40px_16px_rgba(255,255,255,0.8),0_0_160px_60px_rgba(148,197,255,0.35)]"
          animate={reduce ? undefined : { opacity: [0.7, 1, 0.7], scale: [1, 1.2, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <footer className="relative -mt-44 border-t border-white/10 bg-black/40 px-5 py-8 backdrop-blur-sm md:-mt-52 md:px-10 lg:px-14">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <Wordmark />
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-7 gap-y-2">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="label-mono transition hover:text-white">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="label-mono !text-[0.62rem]">© {SITE.copyrightYear} OrbitApps Technologies LLP. All rights reserved.</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {SITE.legal.map((l) => (
              <li key={l.href}>
                <a href={l.href} target="_blank" rel="noopener noreferrer" className="label-mono !text-[0.62rem] transition hover:text-white">
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <a href="#top" className="label-mono inline-flex items-center gap-1.5 !text-[0.62rem] transition hover:text-white">
                Back to top
                <ArrowUp className="size-3" aria-hidden />
              </a>
            </li>
          </ul>
        </div>
      </footer>
    </section>
  );
}
