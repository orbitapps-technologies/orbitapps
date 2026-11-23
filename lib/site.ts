/**
 * Company copy. Facts come from https://www.orbitappstechnologiesllp.com/ ;
 * headlines marked "brand copy" are positioning lines, not factual claims.
 */
export const SITE = {
  name: "OrbitApps Technologies LLP",
  shortName: "OrbitApps",
  url: "https://www.orbitappstechnologiesllp.com",

  // brand copy
  heroHeadline: "Building products that move the world forward.",
  heroSupport:
    "OrbitApps is a technology company creating ambitious digital products, connected experiences, and meaningful solutions for the future.",
  ecosystemLine: "One company. Multiple products. One connected ecosystem.",

  // verified
  tagline: "Building Next-Gen Consumer Apps for Bharat.",
  productsLine: "Products built for everyday India.",
  description:
    "A lean, fast-moving tech company focused on solving real-world problems with robust technology and seamless user experiences.",
  location: "Engineered in Bengaluru, India",
  email: "lookzonsupport@gmail.com",
  address: {
    lines: [
      "ASPIRE COWORKS, No. 472/7, Balaji Arcade",
      "2nd & 3rd Floor, A.V.S. Compound, 20th L Cross Road",
      "AVS Layout, Ejipura, Koramangala 4th Block",
      "Bengaluru, Karnataka 560095",
    ],
    mapsQuery: "ASPIRE COWORKS Balaji Arcade 20th L Cross Road Koramangala 4th Block Bengaluru 560095",
  },
  principles: [
    { label: "Built for India", value: "Bharat-first", body: "Every product starts with how people in India live, move and pay." },
    { label: "Core team", value: "Lean", body: "A tight-knit core team building for scale, without layers in the way." },
    { label: "Ship cadence", value: "Weekly", body: "Short loops from idea to release, so products keep getting better." },
  ],
  careers: {
    heading: "Built with a hacker mentality.",
    summary:
      "No corporate bureaucracy. We ship fast, own our work end to end, and reward the people who build. A tight-knit core team, building for scale.",
    values: [
      { title: "Ship fast", body: "Small team, short loops. Ideas reach real users quickly and get better every week." },
      { title: "End-to-end ownership", body: "You own what you build, from the first commit to the moment it reaches people." },
      { title: "Reward real builders", body: "Impact matters more than titles. People who build great things are recognised for it." },
    ],
    roles: ["Flutter", "Video Creators"],
  },
  legal: [
    { label: "Privacy policy", href: "https://www.orbitappstechnologiesllp.com/privacy-policy" },
    { label: "Terms of service", href: "https://www.orbitappstechnologiesllp.com/terms-of-service" },
    { label: "Refund & cancellation", href: "https://www.orbitappstechnologiesllp.com/refund-policy" },
  ],
  copyrightYear: 2026,
} as const;

/**
 * "What we build" — capability areas, each grounded in something OrbitApps
 * has shipped. `proof` names where it ships today.
 */
export const CAPABILITIES = [
  {
    icon: "mobile",
    title: "Consumer apps for Bharat",
    body: "Products designed around everyday life in India, from the first screen to the payment flow.",
    proof: "Our focus since day one",
  },
  {
    icon: "location",
    title: "Real-time location",
    body: "Live tracking that stays precise while staying light on battery.",
    proof: "Shipped in Lookzon",
  },
  {
    icon: "crash",
    title: "Safety and emergency response",
    body: "Vehicle crash detection that raises an SOS alert the moment it matters.",
    proof: "Shipped in Lookzon",
  },
  {
    icon: "upi",
    title: "Payments and subscriptions",
    body: "Native UPI AutoPay, so subscribing feels as simple as the rest of the app.",
    proof: "Shipped in Lookzon",
  },
] as const;

export const NAV_LINKS = [
  { label: "Home", href: "#top" },
  { label: "Products", href: "#products" },
  { label: "What we build", href: "#build" },
  { label: "About", href: "#about" },
  { label: "Careers", href: "#careers" },
  { label: "Contact", href: "#contact" },
] as const;
