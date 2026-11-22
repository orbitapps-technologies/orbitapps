import { Mail } from "lucide-react";
import { SITE } from "@/lib/site";
import { Button } from "@/components/ui/button";

export function Careers() {
  const { careers } = SITE;
  return (
    <section id="careers" className="relative overflow-hidden px-5 py-28 md:px-10 md:py-36">
      {/* Concentric orbits drifting off the right edge */}
      <svg
        className="pointer-events-none absolute -right-[30%] top-1/2 h-[140%] -translate-y-1/2 opacity-60 md:-right-[12%]"
        viewBox="0 0 800 800"
        aria-hidden
      >
        {[120, 200, 280, 360].map((r, i) => (
          <circle
            key={r}
            cx="400"
            cy="400"
            r={r}
            fill="none"
            stroke={i === 1 ? "#38BDF8" : "#6D4AFF"}
            strokeOpacity={i === 1 ? 0.28 : 0.14}
            strokeDasharray={i % 2 ? "0" : "2 8"}
          />
        ))}
        <circle cx="400" cy="400" r="46" fill="url(#careers-sun)" />
        <circle cx="541" cy="259" r="9" fill="#38BDF8" />
        <defs>
          <radialGradient id="careers-sun">
            <stop offset="0%" stopColor="#FFF1CF" />
            <stop offset="60%" stopColor="#FFB347" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FFB347" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>

      <div className="relative mx-auto max-w-6xl">
        <p className="text-lg text-sky-300">Join our universe</p>
        <h2 className="font-wide mt-4 max-w-3xl text-[clamp(2rem,4.8vw,4rem)] font-light leading-[1.04] text-ink">
          {careers.heading}
        </h2>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">{careers.summary}</p>

        <div className="mt-16 grid gap-10 md:grid-cols-3">
          {careers.values.map((v) => (
            <div key={v.title} className="border-t border-white/15 pt-6">
              <h3 className="text-xl text-ink">{v.title}</h3>
              <p className="mt-2 max-w-xs leading-relaxed text-muted-foreground">{v.body}</p>
            </div>
          ))}
        </div>

        <div className="glass mt-20 max-w-3xl rounded-[2rem] p-7 md:p-10">
          <h3 className="text-xl text-ink">Open roles</h3>
          <ul className="mt-5 flex flex-wrap gap-3">
            {careers.roles.map((role) => (
              <li key={role}>
                <a
                  href={`mailto:${SITE.email}?subject=${encodeURIComponent(`Application: ${role}`)}`}
                  className="inline-flex h-11 items-center rounded-full border border-white/15 px-5 text-ink transition hover:border-sky-300/50 hover:bg-sky-400/10"
                >
                  {role}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-muted-foreground">
            Pick a role to email us with it in the subject line, along with links to what you have built.
          </p>
          <Button asChild variant="orbit" className="mt-6">
            <a href={`mailto:${SITE.email}?subject=${encodeURIComponent("Careers at OrbitApps")}`}>
              <Mail />
              Email the team
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
