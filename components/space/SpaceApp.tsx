"use client";

import { useEffect, useState } from "react";
import { chooseIntroMode, goToSection, refresh, startEngine, startScroll, stopScroll } from "@/lib/space/engine";
import { SECTIONS, type SectionId } from "@/lib/space/data";
import { useUI } from "@/lib/space/store";
import { prefersReducedMotion } from "@/lib/space/tween";
import { Hud, Nav, Preloader, SceneLayer } from "./Chrome";
import { Hero } from "./Hero";
import { Apps } from "./Apps";
import { About, Careers, Contact, Services } from "./Sections";

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGL2RenderingContext && c.getContext("webgl2")) || !!(window.WebGLRenderingContext && c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * The whole page: a fixed WebGL universe behind, the content in front.
 * Scrolling flies the camera from the core → app worlds → station → gyroscope → planet sunrise.
 */
export function SpaceApp() {
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const entered = useUI((s) => s.entered);

  useEffect(() => {
    const gl = hasWebGL();
    chooseIntroMode(gl);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- capability check needs the browser
    setWebgl(gl);
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    return startEngine({ reducedMotion: prefersReducedMotion() });
  }, []);

  useEffect(() => {
    if (!entered) {
      stopScroll();
      return;
    }
    startScroll();
    refresh();
    const id = window.location.hash.slice(1) as SectionId;
    if (id && SECTIONS.some((s) => s.id === id)) setTimeout(() => goToSection(id), 600);
  }, [entered]);

  return (
    <div id="space-root">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SceneLayer webgl={webgl} />
      <Preloader webgl={webgl} />
      <Nav />
      <Hud />
      <main id="main">
        <Hero />
        <Apps />
        <Services />
        <About />
        <Careers />
        <Contact />
      </main>
    </div>
  );
}
