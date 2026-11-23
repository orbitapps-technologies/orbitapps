import { PRODUCTS, type Product, type WorldTheme } from "@/lib/products";
import { CAPABILITIES, SITE } from "@/lib/site";

export type { WorldTheme };

/** One stop of the apps tour: a planet in the OrbitApps universe. */
export interface SpaceApp {
  id: string;
  name: string;
  category: string;
  summary: string;
  accent: string;
  accent2?: string;
  deep: string;
  theme: WorldTheme;
  logo?: string;
  screens: string[];
  cta: { label: string; href: string };
  stat?: Product["stat"];
  status: Product["status"];
  tags: string[];
  description: string;
  features: string[];
  /** Google Play listing; "" until it is added in lib/products.ts. */
  playStore: string;
}

const THEME_CYCLE: WorldTheme[] = ["network", "sacred", "financial", "celestial", "audio"];

function toSpaceApp(p: Product, i: number): SpaceApp {
  const cta = p.website ?? p.links[0] ?? { label: "Get in touch", href: "#contact" };
  return {
    id: p.id,
    name: p.name,
    category: p.tags.length ? p.tags.join(" • ") : p.category,
    summary: p.summary,
    accent: p.identity.accent,
    accent2: p.identity.glow,
    deep: p.identity.deep,
    theme: p.theme ?? THEME_CYCLE[i % THEME_CYCLE.length],
    logo: p.logo,
    screens: (p.screenshots ?? []).slice(0, 3),
    cta,
    stat: p.stat,
    status: p.status,
    tags: p.tags,
    description: p.description,
    features: p.features.map((f) => f.title),
    playStore: p.playStore,
  };
}

export const APPS: SpaceApp[] = PRODUCTS.map(toSpaceApp);

/** Navigation. `camera` sections each get their own stretch of the 3D flight. */
export const SECTIONS = [
  { id: "home", label: "Home" },
  { id: "products", label: "Products" },
  { id: "build", label: "Build" },
  { id: "about", label: "About" },
  { id: "careers", label: "Careers" },
  { id: "contact", label: "Contact" },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

const MODULE_LABELS: Record<string, string> = { mobile: "Build", location: "Track", crash: "Protect", upi: "Pay" };

/** "What we build" — each one docks to a module of the space station. */
export const MODULES = CAPABILITIES.map((c, i) => ({
  id: c.icon,
  code: `MOD-${String(i + 1).padStart(2, "0")}`,
  label: MODULE_LABELS[c.icon] ?? c.title.split(" ")[0],
  title: c.title,
  description: c.body,
  tags: [c.proof],
}));

export const CONTACT = {
  email: SITE.email,
  location: "Bengaluru, India",
  mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SITE.address.mapsQuery)}`,
  office: SITE.address.lines.join(", "),
  projectMailto: `mailto:${SITE.email}?subject=${encodeURIComponent("New project — OrbitApps")}`,
};

export function initials(name: string) {
  const parts = name.split(/[\s-]+|(?<=[a-z])(?=[A-Z0-9])/).filter(Boolean);
  return (parts.length > 1 ? parts.map((w) => w[0]) : [name[0], name[1] ?? ""]).slice(0, 2).join("").toUpperCase();
}
