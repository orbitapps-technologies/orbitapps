# OrbitApps Technologies — corporate website

The main website of **OrbitApps Technologies LLP**: one company, multiple products, one connected ecosystem.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui (Radix) · Three.js · React Three Fiber · Drei · Framer Motion · GSAP (3D scroll camera) · Lucide

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm start          # serve the build
```

Node 20.9+ is required. If `npm install` stops with a peer-dependency conflict, run
`npm install --legacy-peer-deps`, or add a `.npmrc` file containing `legacy-peer-deps=true`.

## Add a product

Append an object to `PRODUCTS` in `lib/products.ts`. It automatically gets an orbit and a floating
identity chip in the hero, a row in **Our ecosystem**, a node on the ecosystem map, a footer link,
and — with `showcase: true` — its own showcase section at `#<id>` in its own colours.

```ts
{
  id: "newapp",
  name: "NewApp",
  status: "Live",                 // "Live" | "Beta" | "In development"
  category: "Productivity",
  summary: "One line for the ecosystem index.",
  tagline: "Headline for the showcase.",
  description: "…",
  website: { label: "Visit NewApp", href: "https://…" },   // optional primary link
  links: [{ label: "Support", href: "mailto:…" }],
  logo: "/products/newapp.svg",   // optional; otherwise a generated mark
  screenshot: { src: "/products/newapp.png", alt: "…" },
  features: [{ icon: "shield", title: "…", description: "…" }],
  identity: { accent: "#A78BFA", glow: "#DDD6FE", deep: "#3B1E8C" },
  showcase: true,
  // orbit: { radius, eccentricity, inclination, node, period, phase }  ← optional
}
```

`OPEN_ORBITS` sets how many empty, unnamed orbits surround the products. Only add products that are
publicly released, with statuses that are true today.

## Structure

| Path | What it is |
| --- | --- |
| `lib/site.ts` | Company copy, capabilities, principles, careers, address, nav |
| `lib/products.ts` | Product ecosystem data |
| `lib/orbits.ts` | Orbit layout (products take the ring nearest their requested radius) + Kepler motion |
| `lib/universe.ts` | Shared hover state (3D ↔ index ↔ map) and per-frame runtime |
| `components/three/*` | Core (glass lens, geodesic lattice, gimbal rings), orbits with light traces, product nodes, dust, polar grid, camera rig |
| `components/hero/*` | Hero copy and the 3D stage, with an SVG loading state and WebGL fallback |
| `components/sections/*` | Ecosystem, product showcase, What we build, Philosophy, Careers, Contact + footer |
| `components/motion/Reveal.tsx` | Shared Framer Motion reveal / stagger primitives |
| `components/ui/*` | shadcn/ui components (Button, Badge, Separator, Sheet) |

Add shadcn components with `npx shadcn@latest add <component>` (`components.json` is configured).

## Motion

- **Framer Motion:** hero headline and load sequence, scroll-linked hero fade, section reveals and
  staggers, ecosystem map draw-in, Philosophy word-by-word reveal, Lookzon device parallax,
  spring hovers, navbar active pill, mobile menu.
- **GSAP ScrollTrigger:** only the 3D camera pull-back as the hero scrolls away.
- `prefers-reduced-motion` is respected everywhere.

## Lookzon assets and links

The mockup loads from `https://www.orbitappstechnologiesllp.com/images/lookzon-mockup.png`; copy it into
`public/products/` for production. No Lookzon website or store listing is public yet, so the showcase
links to Lookzon support and the privacy policy — set `website` in `lib/products.ts` when one exists.
Add a real logo with the `logo` field.

## Deploy

**Vercel:** push to GitHub, import the repo at vercel.com/new, deploy with the defaults.
**Any Node host:** `npm run build && npm start` (set `PORT` to change from 3000).
