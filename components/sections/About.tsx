"use client";

import { motion, useReducedMotion } from "framer-motion";
import { SITE } from "@/lib/site";
import { Gyro } from "@/components/brand/Gyro";
import { EASE } from "@/components/motion/Reveal";

export function About() {
  const reduce = useReducedMotion();
  return (
    <section id="about" className="relative overflow-hidden border-t border-white/10 px-5 py-28 md:px-10 md:py-36 lg:px-14">
      <div className="grid items-center gap-16 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="label-mono flex items-center gap-4">
            <span className="h-px w-10 bg-white/40" />
            About
          </p>
          <motion.h2
            initial={reduce ? false : { opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-15% 0px" }}
            transition={{ duration: 1, ease: EASE }}
            className="font-display mt-5 text-[clamp(2.2rem,5.4vw,5rem)]"
          >
            One company.
            <br />
            Many products.
          </motion.h2>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-white">
            OrbitApps Technologies is a product company in Bengaluru. We build, own and operate our apps, starting with
            Lookzon, and every new product joins the same universe.
          </p>
          <p className="mt-4 max-w-xl leading-relaxed text-ink-muted">
            We are {SITE.description.charAt(0).toLowerCase()}
            {SITE.description.slice(1)}
          </p>

          <dl className="mt-14">
            {SITE.principles.map((p, i) => (
              <motion.div
                key={p.label}
                initial={reduce ? false : { opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-10% 0px" }}
                transition={{ duration: 0.8, ease: EASE, delay: i * 0.08 }}
                className="grid gap-2 border-t border-white/10 py-6 sm:grid-cols-[14rem_1fr]"
              >
                <dt className="text-lg text-white">
                  {p.value}
                  <span className="label-mono mt-1 block !text-[0.64rem]">{p.label}</span>
                </dt>
                <dd className="leading-relaxed text-ink-muted">{p.body}</dd>
              </motion.div>
            ))}
          </dl>
        </div>

        <div className="mx-auto w-full max-w-md lg:col-span-5 lg:max-w-none">
          <Gyro className="w-full" />
        </div>
      </div>
    </section>
  );
}
