"use client";

import { useEffect, useRef } from "react";
import { useMotionValueEvent, useScroll } from "framer-motion";
import { stage } from "@/lib/universe";
import { useDevice, useInView } from "@/lib/useDevice";
import { OrbitScene } from "@/components/three/lazy";
import { Hero } from "@/components/hero/Hero";
import { ProductsOrbit } from "./ProductsOrbit";
import { SceneOverlays } from "./SceneOverlays";

/**
 * One continuous 3D scene behind the hero and the apps tour.
 * Hero: close on the OrbitApps Sun. Scrolling pulls the camera back,
 * the orbits unfold one by one and the apps tour begins, with no cut between sections.
 */
export function Universe() {
  const wrap = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLDivElement>(null);
  const device = useDevice();
  const inView = useInView(wrap, "100px");

  const { scrollYProgress } = useScroll({ target: hero, offset: ["start start", "end start"] });
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    stage.reveal = p;
  });
  useEffect(() => {
    stage.reveal = scrollYProgress.get();
  }, [scrollYProgress]);

  return (
    <div ref={wrap} className="relative">
      <div aria-hidden className="sticky top-0 z-0 -mb-[100svh] h-svh overflow-hidden">
        {device?.webgl && <OrbitScene lowPower={device.lowPower} paused={!inView} />}
        {device?.webgl && <SceneOverlays />}
      </div>
      <div ref={hero} className="relative">
        <Hero />
      </div>
      <ProductsOrbit />
    </div>
  );
}
