"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Wireframe gyroscope: tick ring, crossing orbits and nodes, slowly turning. */
export function Gyro({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const spin = (duration: number, dir = 1) =>
    reduce ? {} : { animate: { rotate: 360 * dir }, transition: { duration, repeat: Infinity, ease: "linear" as const } };

  return (
    <svg viewBox="-200 -200 400 400" className={className} fill="none" aria-hidden>
      {/* tick ring */}
      <motion.g {...spin(120)}>
        {Array.from({ length: 120 }, (_, i) => {
          const a = (i / 120) * Math.PI * 2;
          const r1 = 188;
          const r2 = i % 10 === 0 ? 176 : 182;
          return (
            <line
              key={i}
              x1={(Math.cos(a) * r1).toFixed(2)}
              y1={(Math.sin(a) * r1).toFixed(2)}
              x2={(Math.cos(a) * r2).toFixed(2)}
              y2={(Math.sin(a) * r2).toFixed(2)}
              stroke="white"
              strokeOpacity={i % 10 === 0 ? 0.5 : 0.18}
            />
          );
        })}
      </motion.g>
      <circle r="150" stroke="white" strokeOpacity=".12" />
      <motion.g {...spin(28)}>
        <ellipse rx="150" ry="46" stroke="white" strokeOpacity=".7" strokeWidth="1.2" transform="rotate(-20)" />
        <circle cx="140" cy="-52" r="4" fill="white" />
      </motion.g>
      <motion.g {...spin(36, -1)}>
        <ellipse rx="40" ry="150" stroke="white" strokeOpacity=".55" strokeWidth="1.2" transform="rotate(25)" />
        <circle cx="-62" cy="-136" r="3.5" fill="white" />
      </motion.g>
      <motion.g {...spin(48)}>
        <ellipse rx="150" ry="96" stroke="white" strokeOpacity=".3" transform="rotate(50)" />
        <circle cx="0" cy="96" r="3" fill="white" fillOpacity=".8" />
      </motion.g>
      <circle r="26" stroke="white" strokeOpacity=".6" strokeWidth="1.2" />
      <path d="M-26 0a26 26 0 0 1 52 0" stroke="white" strokeOpacity=".35" />
      <circle r="4" fill="white" />
    </svg>
  );
}
