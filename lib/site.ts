/**
 * Verified company information, taken from https://www.orbitappstechnologiesllp.com/
 * Keep this file as the single source of truth for copy shown on the site.
 */
export const SITE = {
  name: "OrbitApps Technologies LLP",
  shortName: "OrbitApps",
  url: "https://www.orbitappstechnologiesllp.com",
  tagline: "Building Next-Gen Consumer Apps for Bharat.",
  description:
    "A lean, fast-moving tech company focused on solving real-world problems with robust technology and seamless user experiences.",
  heroSupport:
    "Building meaningful digital experiences that connect, protect, and empower people.",
  location: "Engineered in Bengaluru, India",
  email: "lookzonsupport@gmail.com",
  address: {
    lines: [
      "ASPIRE COWORKS, No. 472/7, Balaji Arcade",
      "2nd & 3rd Floor, A.V.S. Compound, 20th L Cross Road",
      "AVS Layout, Ejipura, Koramangala 4th Block",
      "Bengaluru, Karnataka 560095",
    ],
    mapsQuery:
      "ASPIRE COWORKS Balaji Arcade 20th L Cross Road Koramangala 4th Block Bengaluru 560095",
  },
  highlights: [
    { label: "Built for India", value: "Bharat-first" },
    { label: "Core team", value: "Lean" },
    { label: "Ship cadence", value: "Weekly" },
  ],
  careers: {
    heading: "Built with a Hacker Mentality.",
    summary:
      "No corporate bureaucracy. We ship fast, own our work end to end, and reward the people who build. A tight-knit core team, building for scale.",
    values: [
      {
        title: "Ship fast",
        body: "Small team, short loops. Ideas reach real users quickly and get better every week.",
      },
      {
        title: "End-to-end ownership",
        body: "You own what you build, from the first commit to the moment it lands in someone's hands.",
      },
      {
        title: "Reward real builders",
        body: "Impact matters more than titles. People who build great things are recognised for it.",
      },
    ],
    roles: ["Flutter", "Video Creators"],
  },
  legal: [
    { label: "Privacy Policy", href: "https://www.orbitappstechnologiesllp.com/privacy-policy" },
    { label: "Terms of Service", href: "https://www.orbitappstechnologiesllp.com/terms-of-service" },
    {
      label: "Refund & Cancellation Policy",
      href: "https://www.orbitappstechnologiesllp.com/refund-policy",
    },
  ],
  copyrightYear: 2026,
} as const;

export const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "Our Universe", href: "#universe" },
  { label: "Products", href: "#products" },
  { label: "About", href: "#about" },
  { label: "Careers", href: "#careers" },
  { label: "Contact", href: "#contact" },
] as const;
