"use client";

import { motion, useReducedMotion } from "framer-motion";
import { SITE } from "@/lib/site";
import { FeatureIconFor } from "@/components/hero/featureIcons";
import { EASE } from "@/components/motion/Reveal";

const SERVICES = [
  {
    word: "Build",
    title: "Consumer apps for Bharat",
    body: "Products designed around everyday life in India, from the first screen to the payment flow.",
    tags: ["Bharat-first", "Lean core team", "Weekly releases"],
    icon: "mobile" as const,
  },
  {
    word: "Locate",
    title: "Real-time location",
    body: "Live tracking that stays precise while staying light on battery. Shipped in Lookzon.",
    tags: ["Live tracking", "Battery-efficient"],
    icon: "location" as const,
  },
  {
    word: "Protect",
    title: "Safety & emergency response",
    body: "Vehicle crash detection that raises an SOS alert the moment it matters. Shipped in Lookzon.",
    tags: ["Crash detection", "Instant SOS"],
    icon: "crash" as const,
  },
  {
    word: "Pay",
    title: "Payments & subscriptions",
    body: "Native UPI AutoPay, so subscribing feels as simple as the rest of the app. Shipped in Lookzon.",
    tags: ["UPI AutoPay", "Subscriptions"],
    icon: "upi" as const,
  },
];

export function Services() {
  const reduce = useReducedMotion();
  return (
    <section id="build" className="relative px-5 py-28 md:px-10 md:py-36 lg:px-14">
      <div className="grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-32">
            <p className="label-mono flex items-center gap-4">
              <span className="h-px w-10 bg-white/40" />
              What we build
            </p>
            <h2 className="font-display mt-5 text-[clamp(2rem,3.9vw,4rem)]">
              Built
              <br />
              for Bharat.
            </h2>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-soft">
              {SITE.tagline} These are the capabilities our products run on today.
            </p>
          </div>
        </div>

        <div className="space-y-5 lg:col-span-7">
          {SERVICES.map((s, i) => (
            <motion.article
              key={s.word}
              initial={reduce ? false : { opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-12% 0px" }}
              transition={{ duration: 0.9, ease: EASE, delay: i * 0.05 }}
              whileHover="hover"
              className="panel group relative overflow-hidden p-7 md:p-10"
            >
              <motion.span
                aria-hidden
                className="absolute right-7 top-7 text-white/30 md:right-10 md:top-10"
                variants={{ hover: { rotate: -10, scale: 1.1, color: "rgba(255,255,255,0.9)" } }}
                transition={{ type: "spring", stiffness: 260, damping: 16 }}
              >
                <FeatureIconFor icon={s.icon} className="size-6" />
              </motion.span>
              <motion.h3
                className="font-display text-[clamp(2.6rem,6vw,4.8rem)]"
                variants={{ hover: { x: 8 } }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
              >
                {s.word}
              </motion.h3>
              <p className="mt-6 text-xl text-white">{s.title}</p>
              <p className="mt-2 max-w-lg leading-relaxed text-ink-muted">{s.body}</p>
              <p className="label-mono mt-6 !text-[0.66rem]">{s.tags.join("  /  ")}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
