import { ArrowUp, Building2, Mail } from "lucide-react";
import { NAV_LINKS, SITE } from "@/lib/site";
import { Separator } from "@/components/ui/separator";
import { Wordmark } from "@/components/brand/Marks";

export function Contact() {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SITE.address.mapsQuery)}`;
  return (
    <section id="contact" className="relative px-5 pb-10 pt-28 md:px-10 md:pt-36">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%] bg-[radial-gradient(60%_60%_at_50%_100%,rgba(255,179,71,0.12),transparent_70%)]" />
      <div className="relative mx-auto max-w-6xl">
        <h2 className="text-lg text-muted-foreground">Get in touch</h2>
        <a
          href={`mailto:${SITE.email}`}
          className="font-wide group mt-4 inline-flex max-w-full items-center gap-4 break-all text-[clamp(1.4rem,4.6vw,4rem)] font-light leading-tight text-ink transition hover:text-solar"
        >
          <Mail className="size-[0.7em] shrink-0 text-solar transition-transform group-hover:-rotate-6" aria-hidden />
          {SITE.email}
        </a>

        <div className="mt-20 grid gap-12 md:grid-cols-3">
          <div className="md:col-span-2">
            <h3 className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="size-4" aria-hidden />
              Registered office
            </h3>
            <address className="mt-3 not-italic leading-relaxed text-ink">
              {SITE.address.lines.map((l) => (
                <span key={l} className="block">
                  {l}
                </span>
              ))}
            </address>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-sm text-sky-300 underline-offset-4 hover:underline"
            >
              Open in Google Maps
            </a>
          </div>
          <nav aria-label="Footer">
            <h3 className="text-sm text-muted-foreground">Explore</h3>
            <ul className="mt-3 space-y-2">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="text-ink transition hover:text-sky-300">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <Separator className="mt-20" />

        <footer className="flex flex-col gap-6 py-8 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
            <Wordmark />
            <p className="text-sm text-muted-foreground">{SITE.location}</p>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {SITE.legal.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="transition hover:text-ink" target="_blank" rel="noopener noreferrer">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </footer>
        <div className="flex items-center justify-between gap-4 pb-2 text-xs text-muted-foreground">
          <p>
            © {SITE.copyrightYear} ORBITAPPS TECHNOLOGIES LLP. All rights reserved.
          </p>
          <a href="#home" className="inline-flex items-center gap-1.5 transition hover:text-ink">
            <ArrowUp className="size-3.5" aria-hidden />
            Back to the universe
          </a>
        </div>
      </div>
    </section>
  );
}
