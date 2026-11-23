/**
 * PRODUCT UNIVERSE — every OrbitApps app is a planet around the OrbitApps Sun.
 *
 * Each entry automatically gets a planet, an orbit, a floating app icon and
 * its own stop (card, stat, link) in the scroll experience.
 *
 * ⚠️  DEMO DATA: entries marked `demo: true` are placeholders so the design can
 * be seen with a full universe. Replace them with real apps, or set
 * SHOW_DEMO_APPS = false, before going live.
 */

export const SHOW_DEMO_APPS = true;

export type FeatureIcon = "location" | "crash" | "upi" | "shield" | "users" | "spark" | "mobile" | "bolt";

export interface ProductFeature {
  icon: FeatureIcon;
  title: string;
  description: string;
}

export interface ProductLink {
  label: string;
  href: string;
}

export interface Product {
  id: string;
  name: string;
  status: "Live" | "Beta" | "Coming soon";
  /** Short labels shown above the name, e.g. ["Family safety", "Location"] */
  tags: string[];
  category: string;
  summary: string;
  description: string;
  /** Primary button. Falls back to the first entry of `links`. */
  website?: ProductLink;
  links: ProductLink[];
  /** Optional app icon in /public. A generated icon in the app's colours is used otherwise. */
  logo?: string;
  /** Optional app screenshots (paths in /public or full URLs). Generated previews are used otherwise. */
  screenshots?: string[];
  /** Optional headline number, counted up on screen (e.g. downloads). */
  stat?: { value: number; suffix?: string; label: string };
  features: ProductFeature[];
  identity: { accent: string; glow: string; deep: string };
  /** Placeholder entry — not a real product. */
  demo?: boolean;
}

const LOOKZON: Product = {
  id: "lookzon",
  name: "Lookzon",
  status: "Live",
  tags: ["Family safety", "Location", "SOS"],
  category: "Family safety",
  summary: "Family safety and tracking, built for India.",
  description:
    "India's premier family safety and tracking application, featuring real-time location tracking, vehicle crash detection, and UPI AutoPay integration.",
  screenshots: ["https://www.orbitappstechnologiesllp.com/images/lookzon-mockup.png"],
  links: [
    { label: "Contact Lookzon support", href: "mailto:lookzonsupport@gmail.com" },
    { label: "Privacy policy", href: "https://www.orbitappstechnologiesllp.com/privacy-policy" },
  ],
  features: [
    { icon: "location", title: "Real-time location", description: "Live family tracking with precise, battery-efficient updates." },
    { icon: "crash", title: "Crash detection", description: "Advanced vehicle crash detection with instant SOS alerts." },
    { icon: "upi", title: "UPI AutoPay", description: "Seamless subscriptions powered by native UPI AutoPay." },
  ],
  identity: { accent: "#3B82F6", glow: "#93C5FD", deep: "#0B2A6B" },
};

const demo = (
  id: string,
  name: string,
  tags: string[],
  summary: string,
  accent: string,
  glow: string,
  deep: string,
  stat: number,
): Product => ({
  id,
  name,
  status: "Live",
  tags,
  category: tags[0],
  summary,
  description: summary,
  links: [{ label: "Learn more", href: "#contact" }],
  stat: { value: stat, suffix: "+", label: "Downloads" },
  features: [],
  identity: { accent, glow, deep },
  demo: true,
});

const DEMO_APPS: Product[] = [
  demo("rasoi", "Rasoi", ["Food", "Recipes"], "Everyday Indian recipes and weekly meal plans for the whole family.", "#F97316", "#FDBA74", "#7C2D12", 120000),
  demo("kosh", "Kosh", ["Finance", "Budgeting"], "Track spending, split bills and save smarter with UPI-first budgeting.", "#10B981", "#6EE7B7", "#064E3B", 85000),
  demo("sutra", "Sutra", ["Learning", "Skills"], "Bite-sized courses that fit between classes, commutes and chai breaks.", "#8B5CF6", "#C4B5FD", "#2E1065", 64000),
  demo("yatra", "Yatra", ["Travel", "Trips"], "Plan trips across India with routes, stays and budgets in one place.", "#06B6D4", "#67E8F9", "#164E63", 47000),
  demo("swasth", "Swasth", ["Health", "Fitness"], "Daily habits, step goals and home workouts made for busy lives.", "#F43F5E", "#FDA4AF", "#881337", 92000),
  demo("bazaar", "Bazaar", ["Shopping", "Local"], "Discover deals from neighbourhood stores, right around the corner.", "#F59E0B", "#FCD34D", "#78350F", 38000),
  demo("dhun", "Dhun", ["Music", "Audio"], "Regional music, devotional playlists and podcasts in your language.", "#D946EF", "#F0ABFC", "#701A75", 150000),
  demo("saathi", "Saathi", ["Community", "Chat"], "Private groups for families, societies and the people you trust.", "#6366F1", "#A5B4FC", "#1E1B4B", 29000),
  demo("kheti", "Kheti", ["Agriculture", "Advisory"], "Weather, mandi prices and crop advice for farmers, in their language.", "#84CC16", "#BEF264", "#365314", 56000),
];

export const PRODUCTS: Product[] = [LOOKZON, ...(SHOW_DEMO_APPS ? DEMO_APPS : [])];

/** No longer used for layout; kept for compatibility. */
export const OPEN_ORBITS = 0;

export function getProduct(id: string | null | undefined) {
  return PRODUCTS.find((p) => p.id === id) ?? null;
}
