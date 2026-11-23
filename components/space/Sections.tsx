"use client";

import { useRef } from "react";
import { APPS, CONTACT, MODULES, SECTIONS } from "@/lib/space/data";
import { goToSection, scrollToTarget } from "@/lib/space/engine";
import { useUI } from "@/lib/space/store";
import { SITE } from "@/lib/site";
import { Arrow, Logo, useReveal } from "./ui";

/* ------------------------------------------------------------------ */
/* Build — each capability docks to a module of the station            */
/* ------------------------------------------------------------------ */

export function Services() {
  const root = useRef<HTMLElement>(null);
  const active = useUI((s) => s.service);
  useReveal(root);
  return (
    <section id="build" ref={root} className="services" aria-labelledby="services-title">
      <div className="container services__grid">
        <header className="services__header">
          <p className="eyebrow" data-reveal>
            What we build
          </p>
          <h2 id="services-title" className="display services__title" data-reveal="lines">
            <span className="line">
              <span className="line__inner">Build.</span>
            </span>
            <span className="line services__title-offset">
              <span className="line__inner">Track.</span>
            </span>
            <span className="line">
              <span className="line__inner">Protect.</span>
            </span>
          </h2>
          <p className="lead" data-reveal data-delay="0.15">
            Everything we build is grounded in something we have shipped: consumer apps designed around everyday life in India, with the
            location, safety and payment systems behind them.
          </p>
        </header>
        <div className="services__modules">
          {MODULES.map((m, i) => (
            <article key={m.id} className={`module ${active === i ? "is-active" : ""}`} data-service-panel>
              <span className="module__dock" aria-hidden="true" />
              <div className="module__body">
                <p className="mono module__code">{m.code}</p>
                <p className="display module__label">{m.label}</p>
                <h3 className="module__title">{m.title}</h3>
                <p className="module__desc">{m.description}</p>
                <p className="module__tags mono">{m.tags.join("  /  ")}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* About + Careers — the gyroscope                                     */
/* ------------------------------------------------------------------ */

export function About() {
  const root = useRef<HTMLElement>(null);
  useReveal(root);
  return (
    <section id="about" ref={root} className="about" aria-labelledby="about-title">
      <div className="container about__grid">
        <div className="about__copy">
          <p className="eyebrow" data-reveal>
            About
          </p>
          <h2 id="about-title" className="display about__title" data-reveal="lines">
            <span className="line about__title-dim">
              <span className="line__inner">One company.</span>
            </span>
            <span className="line about__title-dim">
              <span className="line__inner">Multiple products.</span>
            </span>
            <span className="line">
              <span className="line__inner">One connected universe.</span>
            </span>
          </h2>
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
            {SITE.principles.map((p) => (
              <li key={p.label} className="pillar">
                <span className="pillar__rule" data-reveal="draw" aria-hidden="true" />
                <div className="pillar__row" data-reveal>
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
