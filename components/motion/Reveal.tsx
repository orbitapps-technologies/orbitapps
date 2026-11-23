"use client";

import { motion, useReducedMotion, type HTMLMotionProps, type Variants } from "framer-motion";

export const EASE = [0.22, 1, 0.36, 1] as const;

/** Fade + rise into view once. */
export function Reveal({
  delay = 0,
  y = 24,
  children,
  ...props
}: HTMLMotionProps<"div"> & { delay?: number; y?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ duration: 0.9, delay, ease: EASE }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};

export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

/** Container whose `staggerChild` children animate in one after another. */
export function Stagger({ children, ...props }: HTMLMotionProps<"div">) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      variants={staggerParent}
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "-12% 0px" }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
