/**
 * PRODUCT CONFIGURATION — the planets of the OrbitApps universe.
 *
 * Every entry in PRODUCTS becomes a planet with its own orbital path, label,
 * legend entry, product card and details panel. To launch a new product,
 * add one object below. Orbit radius, inclination and speed are assigned
 * automatically if you leave the `orbit` fields out.
 *
 * Only add products that are publicly released.
 */

export type FeatureIcon = "location" | "crash" | "upi" | "shield" | "users" | "spark";

export interface ProductFeature {
  icon: FeatureIcon;
  title: string;
  description: string;
}

export interface PlanetLook {
  /** Base surface colour */
  color: string;
  /** Darker tone used in surface bands */
  deep: string;
  /** Highlight / atmosphere colour */
  glow: string;
  /** Planet radius in scene units (Sun radius is 2.2) */
  size: number;
}

export interface OrbitSettings {
  /** Semi-major axis in scene units */
  radius?: number;
  /** 0 = circle. Keep below 0.2 so rings stay elegant */
  eccentricity?: number;
  /** Tilt of the orbital plane, in radians */
  inclination?: number;
  /** Rotation of the orbital plane around the Sun, in radians */
  node?: number;
  /** Seconds per full revolution at normal speed */
  period?: number;
  /** Starting position along the orbit (0–1) */
  phase?: number;
}

export interface Product {
  id: string;
  name: string;
  status: "Live";
  tagline: string;
  description: string;
  /** Where the "Explore Product" button goes */
  url: string;
  /** Optional path to a logo in /public. A generated glyph is used otherwise. */
  logo?: string;
  screenshot?: { src: string; alt: string };
  features: ProductFeature[];
  look: PlanetLook;
  orbit?: OrbitSettings;
}

export const PRODUCTS: Product[] = [
  {
    id: "lookzon",
    name: "Lookzon",
    status: "Live",
    tagline: "Family safety, in real time.",
    description:
      "India's premier family safety and tracking application, featuring real-time location tracking, vehicle crash detection, and UPI AutoPay integration.",
    // Replace with the Play Store / App Store listing when available.
    url: "https://www.orbitappstechnologiesllp.com/#products",
    screenshot: {
      src: "https://www.orbitappstechnologiesllp.com/images/lookzon-mockup.png",
      alt: "Lookzon app on a smartphone showing live family locations on a map",
    },
    features: [
      {
        icon: "location",
        title: "Real-time location",
        description: "Live family tracking with precise, battery-efficient updates.",
      },
      {
        icon: "crash",
        title: "Crash detection",
        description: "Advanced vehicle crash detection with instant SOS alerts.",
      },
      {
        icon: "upi",
        title: "UPI AutoPay",
        description: "Seamless subscriptions powered by native UPI AutoPay.",
      },
    ],
    look: {
      color: "#38BDF8",
      deep: "#0B3B8C",
      glow: "#7DD3FC",
      size: 0.85,
    },
    orbit: {
      radius: 7.6,
      eccentricity: 0.09,
      inclination: 0.06,
      node: 0.4,
      period: 42,
      phase: 0.12,
    },
  },
];

/**
 * Empty orbits drawn beyond the product orbits. They carry no product and no
 * label beyond "open orbit" — room in the system for what launches next.
 * Set to 0 to show only product orbits.
 */
export const OPEN_ORBITS = 3;

export function getProduct(id: string | null | undefined) {
  return PRODUCTS.find((p) => p.id === id) ?? null;
}
