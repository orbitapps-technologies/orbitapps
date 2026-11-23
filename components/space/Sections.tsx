"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { APPS, CONTACT, MODULES, SECTIONS } from "@/lib/space/data";
import { goToSection, scrollToTarget } from "@/lib/space/engine";
import { rt, useUI } from "@/lib/space/store";
import { SITE } from "@/lib/site";
import { ease, from, onFrame, prefersReducedMotion } from "@/lib/space/tween";
import { Arrow, Logo, useReveal } from "./ui";

/* ------------------------------------------------------------------ */
/* Build — the OrbitApps Lab: a ringed planet, one satellite per capability */
/* ------------------------------------------------------------------ */

/** Small orbit selector: dots ride an ellipse and the active one swings to the front. */
function OrbitDial({ active }: { active: number }) {
  const n = MODULES.length;
  const dots = useRef<(HTMLButtonElement | null)[]>([]);
  const rot = useRef(0);
  useEffect(
    () =>
      onFrame((_, dt) => {
        const goal = Math.max(active, 0);
        rot.current += (goal - rot.current) * (1 - Math.exp(-6 * dt));
        dots.current.forEach((el, i) => {
          if (!el) return;
          const a = Math.PI / 2 - ((i - rot.current) / n) * Math.PI * 2;
          const x = 50 + Math.cos(a) * 44;
          const y = 50 + Math.sin(a) * 30;
          const depth = (Math.sin(a) + 1) / 2; // 1 = front
          el.style.left = `${x}%`;
          el.style.top = `${y}%`;
          el.style.transform = `translate(-50%, -50%) scale(${(0.7 + depth * 0.45).toFixed(3)})`;
          el.style.opacity = (0.35 + depth * 0.65).toFixed(3);
          el.style.zIndex = String(Math.round(depth * 10));
        });
      }),
    [active, n],
  );
  return (
    <nav className="lab__dial" aria-label="Capabilities">
      <svg viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true">
        <ellipse cx="50" cy="30" rx="44" ry="18" />
        <circle cx="50" cy="30" r="3.2" className="lab__dial-core" />
      </svg>
      {MODULES.map((m, i) => (
        <button
          key={m.id}
          ref={(el) => void (dots.current[i] = el)}
          className={`lab__dot ${i === active ? "is-active" : ""}`}
          onClick={() => scrollToTarget(`[data-service-panel="${i}"]`)}
          aria-current={i === active ? "true" : undefined}
        >
          <i aria-hidden="true" />
          <span className="mono">{m.label}</span>
        </button>
      ))}
    </nav>
  );
}

function LabFocus({ index }: { index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const m = MODULES[index];
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const a = from(el.querySelectorAll(".lab__label"), { yPercent: 110 }, { duration: 1.1, ease: ease.expoOut });
    const b = from(el.querySelectorAll("[data-lab-item]"), { y: 18, opacity: 0 }, { duration: 0.9, ease: ease.expoOut, stagger: 0.06, delay: 0.12 });
    return () => {
      a.kill();
      b.kill();
    };
  }, [index]);
  return (
    <div ref={ref} className="lab__focus">
      <p className="mono lab__count" data-lab-item>
        <span>{String(index + 1).padStart(2, "0")}</span> / {String(MODULES.length).padStart(2, "0")} · {m.code}
      </p>
      <div className="lab__label-mask">
        <p className="display lab__label">{m.label}</p>
      </div>
      <h3 className="lab__title" data-lab-item>
        {m.title}
      </h3>
      <p className="lab__desc" data-lab-item>
        {m.description}
      </p>
      <p className="mono lab__proof" data-lab-item>
        <i aria-hidden="true" />
        {m.tags.join("  /  ")}
      </p>
    </div>
  );
}

export function Services() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const active = useUI((s) => s.service);
  useReveal(root);
  // Past the last satellite: fade the card and selector out while the camera heads on to About.
  useEffect(
    () =>
      onFrame(() => {
        const last = root.current?.querySelector<HTMLElement>(`[data-service-panel="${MODULES.length - 1}"]`);
        if (!last || !stage.current) return;
        const past = last.getBoundingClientRect().bottom < window.innerHeight * 0.62;
        stage.current.classList.toggle("is-past", past);
      }),
    [],
  );
  return (
    <section id="build" ref={root} className="lab" style={{ "--lab-n": MODULES.length } as React.CSSProperties} aria-labelledby="services-title">
      <div ref={stage} className={`lab__stage ${active >= 0 ? "is-docked" : ""}`}>
        <div className="container lab__frame">
          <header className="lab__head">
            <p className="eyebrow" data-reveal>
              What we build
            </p>
            <h2 id="services-title" className="display lab__heading" data-reveal="lines">
              <span className="line">
                <span className="line__inner">Built in</span>
              </span>
              <span className="line lab__heading-offset">
                <span className="line__inner">our orbit.</span>
              </span>
            </h2>
            <p className="lead lab__lead" data-reveal data-delay="0.15">
              Each capability is a satellite around the OrbitApps Lab — grounded in something we have shipped. Scroll to dock with each one.
            </p>
          </header>
          {active >= 0 && <LabFocus key={active} index={active} />}
          <OrbitDial active={active} />
        </div>
      </div>
      <div className="lab__track" aria-hidden="true">
        <div className="lab__spacer" />
        {MODULES.map((m, i) => (
          <div key={m.id} className="lab__spacer" data-service-panel={i} />
        ))}
      </div>
      {/* Accessible list of every capability */}
      <ul className="sr-only">
        {MODULES.map((m) => (
          <li key={m.id}>
            {m.title}: {m.description} ({m.tags.join(", ")})
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* About + Careers — the gyroscope                                     */
/* ------------------------------------------------------------------ */

const ABOUT_LINES = [
  { text: "One company.", dim: true },
  { text: "Multiple products.", dim: true },
  { text: "One connected universe.", dim: false },
];

/** Heading whose words light up one by one as it scrolls through the screen. */
function ScrubTitle() {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const words = Array.from(el.querySelectorAll<HTMLElement>("[data-word]"));
    if (prefersReducedMotion()) return;
    return onFrame(() => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when the heading enters at 85% of the screen, 1 when it reaches 35%
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (vh * 0.5)));
      const lit = p * words.length;
      words.forEach((w, i) => {
        const t = Math.min(1, Math.max(0, lit - i));
        w.style.opacity = (0.16 + t * 0.84).toFixed(3);
        w.style.filter = t < 1 ? `blur(${((1 - t) * 3).toFixed(2)}px)` : "";
      });
    });
  }, []);
  return (
    <h2 id="about-title" ref={ref} className="display about__title">
      {ABOUT_LINES.map((l) => (
        <span key={l.text} className={`about__line ${l.dim ? "about__title-dim" : ""}`}>
          {l.text.split(" ").map((w, i) => (
            <span key={i} data-word className="about__word">
              {w}{" "}
            </span>
          ))}
        </span>
      ))}
    </h2>
  );
}

/** A small orbit glyph that spins its moon when the row is active. */
function OrbitGlyph() {
  return (
    <svg className="pillar__glyph" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="15" />
      <circle cx="20" cy="20" r="3.5" className="pillar__glyph-core" />
      <g className="pillar__glyph-orbit">
        <circle cx="35" cy="20" r="2.6" className="pillar__glyph-moon" />
      </g>
    </svg>
  );
}

export function About() {
  const root = useRef<HTMLElement>(null);
  const rows = useRef<(HTMLLIElement | null)[]>([]);
  useReveal(root);
  // The row nearest the middle of the screen is "active" — it lights up here and its moon lights up in 3D.
  useEffect(
    () =>
      onFrame(() => {
        const mid = window.innerHeight * 0.55;
        let best = -1;
        let bestD = window.innerHeight * 0.3;
        rows.current.forEach((el, i) => {
          if (!el) return;
          const r = el.getBoundingClientRect();
          const d = Math.abs(r.top + r.height / 2 - mid);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        });
        if (best !== rt.pillar) {
          rt.pillar = best;
          rows.current.forEach((el, i) => el?.classList.toggle("is-active", i === best));
        }
      }),
    [],
  );
  return (
    <section id="about" ref={root} className="about" aria-labelledby="about-title">
      <div className="container about__grid">
        <div className="about__copy">
          <p className="eyebrow" data-reveal>
            About
          </p>
          <ScrubTitle />
          <div className="about__text">
            <p className="lead" data-reveal>
              OrbitApps Technologies is a product company in Bengaluru. We build, own and operate our apps — {APPS.map((a) => a.name).join(", ")} — and
              every new product joins the same universe.
            </p>
            <p data-reveal data-delay="0.1">
              We are {SITE.description.charAt(0).toLowerCase()}
              {SITE.description.slice(1)} {SITE.tagline}
            </p>
          </div>
          <ol className="pillars" aria-label="How we work">
            {SITE.principles.map((p, i) => (
              <li key={p.label} className="pillar" ref={(el) => void (rows.current[i] = el)}>
                <span className="pillar__rule" data-reveal="draw" aria-hidden="true" />
                <div className="pillar__row" data-reveal>
                  <OrbitGlyph />
                  <h3 className="pillar__title">
                    {p.value}
                    <span className="mono pillar__label">{p.label}</span>
                  </h3>
                  <p className="pillar__text">{p.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

export function Careers() {
  const root = useRef<HTMLElement>(null);
  const { careers } = SITE;
  useReveal(root);
  return (
    <section id="careers" ref={root} className="careers" aria-labelledby="careers-title">
      <div className="container careers__grid">
        <div className="careers__copy">
          <p className="eyebrow" data-reveal>
            Careers
          </p>
          <h2 id="careers-title" className="display careers__title" data-reveal="lines">
            <span className="line">
              <span className="line__inner">Built with a</span>
            </span>
            <span className="line">
              <span className="line__inner">hacker mentality.</span>
            </span>
          </h2>
          <p className="lead" data-reveal data-delay="0.1">
            {careers.summary}
          </p>
          <ol className="pillars careers__values">
            {careers.values.map((v) => (
              <li key={v.title} className="pillar">
                <span className="pillar__rule" data-reveal="draw" aria-hidden="true" />
                <div className="pillar__row" data-reveal>
                  <h3 className="pillar__title">{v.title}</h3>
                  <p className="pillar__text">{v.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="careers__roles">
          <p className="mono careers__label" data-reveal>
            Open roles
          </p>
          <ul className="careers__list" data-reveal="stagger">
            {careers.roles.map((role) => (
              <li key={role}>
                <a className="careers__role" href={`mailto:${SITE.email}?subject=${encodeURIComponent(`Application: ${role}`)}`}>
                  <span className="display careers__role-name">{role}</span>
                  <span className="mono careers__apply">
                    Apply <Arrow direction="up-right" />
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className="careers__note" data-reveal>
            Choosing a role opens an email to the team with the role in the subject line. Include links to what you have built.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Contact — sunrise over the planet                                   */
/* ------------------------------------------------------------------ */

export function Contact() {
  const root = useRef<HTMLElement>(null);
  useReveal(root);
  return (
    <section id="contact" ref={root} className="contact" aria-labelledby="contact-title">
      <div className="container contact__inner">
        <p className="eyebrow" data-reveal>
          Contact
        </p>
        <h2 id="contact-title" className="display contact__title" data-reveal="lines">
          <span className="line">
            <span className="line__inner">Let’s build</span>
          </span>
          <span className="line">
            <span className="line__inner">what’s next.</span>
          </span>
        </h2>
        <div className="contact__grid" data-reveal="stagger">
          <a className="contact__item" href={`mailto:${CONTACT.email}`}>
            <span className="mono contact__label">Email</span>
            <span className="contact__value">{CONTACT.email}</span>
          </a>
          <a className="contact__item" href={CONTACT.mapsUrl} target="_blank" rel="noopener noreferrer">
            <span className="mono contact__label">Location</span>
            <span className="contact__value">{CONTACT.location}</span>
          </a>
          <a className="contact__item" href={CONTACT.mapsUrl} target="_blank" rel="noopener noreferrer">
            <span className="mono contact__label">Registered office</span>
            <span className="contact__value contact__value--small">{CONTACT.office}</span>
          </a>
        </div>
        <div className="contact__cta" data-reveal>
          <a className="text-link contact__project" href={CONTACT.projectMailto}>
            Get in touch <Arrow />
          </a>
          <p className="contact__note">Tell us what you are building.</p>
        </div>
      </div>
      <footer className="footer">
        <div className="container footer__inner">
          <Logo />
          <nav className="footer__nav" aria-label="Footer">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  goToSection(s.id);
                }}
              >
                {s.label}
              </a>
            ))}
          </nav>
          <p className="mono footer__copy">
            © {SITE.copyrightYear} OrbitApps Technologies LLP. All rights reserved.
          </p>
          <nav className="footer__legal mono" aria-label="Legal">
            {SITE.legal.map((l) => (
              <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">
                {l.label}
              </a>
            ))}
          </nav>
          <button className="mono footer__top" onClick={() => scrollToTarget(0)}>
            Back to top <Arrow direction="up" />
          </button>
        </div>
      </footer>
    </section>
  );
}
