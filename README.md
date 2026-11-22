# OrbitApps — A Universe of Innovation

Interactive 3D landing page for **OrbitApps Technologies LLP**. OrbitApps is the Sun at the centre; every product is a planet on its own orbit.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui (Radix) · Three.js · React Three Fiber · Drei · GSAP + ScrollTrigger · Framer Motion · Lucide

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm start          # serve the build
```

Node 20.9+ is required. If `npm install` stops with a peer-dependency conflict (React 19.3 is newer than some 3D libraries declare), run `npm install --legacy-peer-deps`, or add a `.npmrc` file containing `legacy-peer-deps=true`.

## Add a product (a new planet)

Open `lib/products.ts` and add an object to `PRODUCTS`. That's all. The planet, orbit ring,
particle trail, floating label, legend row, product spread and details panel are generated from it.

```ts
{
  id: "newapp",
  name: "NewApp",
  status: "Live",
  tagline: "…",
  description: "…",
  url: "https://…",               // Explore button
  logo: "/products/newapp.svg",   // optional, file in /public
  screenshot: { src: "/products/newapp.png", alt: "…" },
  features: [{ icon: "shield", title: "…", description: "…" }],
  look: { color: "#A78BFA", deep: "#3B1E8C", glow: "#DDD6FE", size: 0.7 },
  // orbit: { radius, eccentricity, inclination, node, period, phase }  ← optional
}
```

`OPEN_ORBITS` controls the dashed empty orbits beyond the products (set it to `0` to hide them).
Only add products that are publicly released.

## Where things live

| Path | What it does |
| --- | --- |
| `lib/site.ts` | Verified company copy, address, legal links, nav |
| `lib/products.ts` | Product configuration |
| `lib/orbits.ts` | Orbit layout + Kepler motion (Sun at the focus) |
| `lib/universe.ts` | Selection store, per-frame runtime, `focusProduct()` |
| `components/three/*` | Sun (shader surface, corona, flares), orbits, planets, stars, nebula, camera rig |
| `components/hero/*` | Hero overlay, scroll chapter, product panel, WebGL fallback |
| `components/sections/*` | About, Products, Careers, Contact + footer |
| `components/ui/*` | shadcn/ui components (Button, Badge, Separator, Sheet) |

Add more shadcn components any time with `npx shadcn@latest add <component>` — `components.json` is set up.

## Interactions

- Drag (mouse or horizontal swipe) rotates the system within limits; the mouse adds subtle parallax.
- Hover a planet to highlight it; click or tap to fly the camera to it and open its panel.
- Click empty space, the Sun, **Back to universe**, or press `Esc` to return.
- Scrolling through the hero flies the camera to Lookzon (GSAP ScrollTrigger, scrubbed — no scroll hijacking).
- The planet list in the hero is keyboard-accessible and drives the same camera.

## Performance & accessibility

DPR capped (1.75 desktop / 1.3 mobile) with adaptive DPR, lighter shaders and fewer particles on
mobile/low-core devices, rendering paused when the hero is off-screen, lazy-loaded 3D bundle,
CSS fallback when WebGL is unavailable, `prefers-reduced-motion` respected throughout, and all
important text in crisp HTML overlays.

## Assets

The Lookzon mockup is loaded from the live site
(`https://www.orbitappstechnologiesllp.com/images/lookzon-mockup.png`). For production, copy it into
`public/products/` and update `screenshot.src`. Drop a real Lookzon logo in `public/` and set `logo`
to replace the generated glyph. Set `url` to the Play Store / App Store listing when available.

## Deploy

**Vercel:** push to GitHub, import the repo at vercel.com/new, keep the defaults, deploy.

**Any Node host:** `npm run build && npm start` (port 3000, set `PORT` to change).
