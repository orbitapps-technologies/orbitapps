"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { Menu } from "lucide-react";
import { NAV_LINKS } from "@/lib/site";
import { PRODUCTS } from "@/lib/products";
import { focusProduct } from "@/lib/universe";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Wordmark } from "@/components/brand/Marks";

const SECTION_IDS = ["home", "about", "products", "careers", "contact"];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("home");
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const lookzon = PRODUCTS[0];

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 40));

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  const exploreLookzon = () => {
    const wasOpen = open;
    setOpen(false);
    if (lookzon) window.setTimeout(() => focusProduct(lookzon.id), wasOpen ? 320 : 0);
  };

  return (
    <motion.header
      initial={reduce ? false : { y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.6, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-40 px-3 pt-3 md:px-6 md:pt-5"
    >
      <nav
        aria-label="Main"
        className={cn(
          "mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full border px-3 pl-5 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-500",
          scrolled
            ? "border-white/10 bg-[#080D1F]/70 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl"
            : "border-transparent bg-transparent",
        )}
      >
        <a href="#home" className="rounded-full" aria-label="OrbitApps home">
          <Wordmark />
        </a>

        <ul className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => {
            const isActive = l.href === `#${active}`;
            return (
              <li key={l.href} className="relative">
                <a
                  href={l.href}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "relative block rounded-full px-4 py-2 text-[14px] transition-colors",
                    isActive ? "text-ink" : "text-muted-foreground hover:text-ink",
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 -z-10 rounded-full bg-white/[0.07]"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  {l.label}
                </a>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          {lookzon && (
            <Button size="sm" variant="orbit" onClick={exploreLookzon} className="hidden sm:inline-flex">
              <span className="size-1.5 rounded-full bg-sky-400 shadow-[0_0_10px_#38BDF8]" />
              Explore {lookzon.name}
            </Button>
          )}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="px-8 pt-24">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <SheetDescription className="sr-only">Jump to a section of the OrbitApps site</SheetDescription>
              <ul className="space-y-1">
                {NAV_LINKS.map((l, i) => (
                  <motion.li
                    key={l.href}
                    initial={reduce ? false : { opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.12 + i * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <a
                      href={l.href}
                      onClick={(e) => {
                        // Let the sheet release its scroll lock before scrolling.
                        e.preventDefault();
                        setOpen(false);
                        window.setTimeout(() => {
                          document.querySelector(l.href)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
                          history.replaceState(null, "", l.href);
                        }, 320);
                      }}
                      className="font-wide block py-3 text-2xl font-light text-ink transition hover:text-sky-300"
                    >
                      {l.label}
                    </a>
                  </motion.li>
                ))}
              </ul>
              {lookzon && (
                <motion.div
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="mt-8"
                >
                  <Button onClick={exploreLookzon} className="w-full">
                    Explore {lookzon.name}
                  </Button>
                </motion.div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </motion.header>
  );
}
