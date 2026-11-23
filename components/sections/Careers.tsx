"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { SITE } from "@/lib/site";
import { EASE } from "@/components/motion/Reveal";

export function Careers() {
  const { careers } = SITE;
  const reduce = useReducedMotion();
  return (
    <section id="careers" className="relative border-t border-white/10 px-5 py-28 md:px-10 md:py-36 lg:px-14">
      <div className="grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <p className="label-mono flex items-center gap-4">
            <span className="h-px w-10 bg-white/40" />
            Careers
          </p>
          <h2 className="font-display mt-5 text-[clamp(2.2rem,5vw,4.4rem)]">
            Built with a
            <br />
            hacker mentality.
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">{careers.summary}</p>
          <ul className="mt-12">
            {careers.values.map((v) => (
              <li key={v.title} className="border-t border-white/10 py-5">
                <h3 className="text-lg text-white">{v.title}</h3>
                <p className="mt-1 max-w-md text-ink-muted">{v.body}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-5 lg:col-start-8 lg:pt-20">
          <p className="label-mono">Open roles</p>
          <ul className="mt-5 border-t border-white/10">
            {careers.roles.map((role, i) => (
              <motion.li
                key={role}
                initial={reduce ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: EASE, delay: i * 0.08 }}
                className="border-b border-white/10"
              >
                <motion.a
                  href={`mailto:${SITE.email}?subject=${encodeURIComponent(`Application: ${role}`)}`}
                  initial="rest"
                  animate="rest"
                  whileHover="hover"
                  className="group flex items-center justify-between py-7"
                >
                  <motion.span
                    className="font-display text-[clamp(1.6rem,3vw,2.4rem)]"
                    variants={{ rest: { x: 0 }, hover: { x: 10 } }}
                    transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  >
                    {role}
                  </motion.span>
                  <span className="label-mono flex items-center gap-2 group-hover:text-white">
                    Apply
                    <motion.span variants={{ rest: { x: 0, y: 0 }, hover: { x: 3, y: -3 } }}>
                      <ArrowUpRight className="size-4 text-white" aria-hidden />
                    </motion.span>
                  </span>
                </motion.a>
              </motion.li>
            ))}
          </ul>
          <p className="mt-6 text-sm leading-relaxed text-ink-muted">
            Choosing a role opens an email to the team with the role in the subject line. Include links to what you have
            built.
          </p>
        </div>
      </div>
    </section>
  );
}
