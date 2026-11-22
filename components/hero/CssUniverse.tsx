"use client";

import { ORBITS, OUTER_RADIUS } from "@/lib/orbits";
import { selectProduct } from "@/lib/universe";

/** Lightweight fallback for browsers without WebGL. Same concept, pure CSS. */
export function CssUniverse() {
  return (
    <div className="absolute inset-0 grid place-items-center overflow-hidden" aria-label="OrbitApps product universe">
      <div className="relative aspect-square w-[min(120vw,1100px)] [perspective:1400px]">
        <div className="absolute inset-0 [transform:rotateX(68deg)] [transform-style:preserve-3d]">
          {ORBITS.map((o) => {
            const pct = (o.radius / OUTER_RADIUS) * 92;
            return (
              <div
                key={o.key}
                className="absolute left-1/2 top-1/2 rounded-full border"
                style={{
                  width: `${pct}%`,
                  height: `${pct}%`,
                  transform: "translate(-50%, -50%)",
                  borderColor: o.product ? "rgba(56,189,248,0.45)" : "rgba(109,74,255,0.22)",
                  borderStyle: o.product ? "solid" : "dashed",
                  animation: `orbit-spin ${o.period}s linear infinite`,
                }}
              >
                {o.product && (
                  <button
                    type="button"
                    onClick={() => selectProduct(o.product!.id)}
                    className="absolute -top-4 left-1/2 size-8 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_35%_30%,#BAE6FD,#38BDF8_55%,#0B3B8C)] shadow-[0_0_30px_rgba(56,189,248,0.8)] [transform:rotateX(-68deg)]"
                    aria-label={`Open ${o.product.name} details`}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="absolute left-1/2 top-1/2 size-[18%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_40%_38%,#FFF1CF,#FFB347_55%,#E0640F)] shadow-[0_0_120px_40px_rgba(255,150,40,0.35)] [animation:sun-breathe_4s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}
