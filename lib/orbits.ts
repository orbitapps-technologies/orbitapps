import { OPEN_ORBITS, PRODUCTS, type Product } from "./products";

export const SUN_RADIUS = 2.2;
const FIRST_ORBIT = 7.6;
const ORBIT_GAP = 3.5;

export interface ResolvedOrbit {
  key: string;
  product: Product | null;
  radius: number;
  eccentricity: number;
  /** semi-minor axis */
  minor: number;
  inclination: number;
  node: number;
  period: number;
  phase: number;
  color: string;
}

// Deterministic variety for auto-generated orbits.
const INCLINATIONS = [0.06, -0.1, 0.14, -0.05, 0.09, -0.13];
const NODES = [0.4, 1.9, -0.8, 2.7, -2.1, 1.1];
const ECC = [0.09, 0.06, 0.11, 0.05, 0.08, 0.07];

export function resolveOrbits(): ResolvedOrbit[] {
  const out: ResolvedOrbit[] = [];
  const total = PRODUCTS.length + OPEN_ORBITS;

  for (let i = 0; i < total; i++) {
    const product = PRODUCTS[i] ?? null;
    const o = product?.orbit ?? {};
    const radius = o.radius ?? FIRST_ORBIT + i * ORBIT_GAP;
    const eccentricity = o.eccentricity ?? ECC[i % ECC.length];
    out.push({
      key: product ? product.id : `open-${i}`,
      product,
      radius,
      eccentricity,
      minor: radius * Math.sqrt(1 - eccentricity * eccentricity),
      inclination: o.inclination ?? INCLINATIONS[i % INCLINATIONS.length],
      node: o.node ?? NODES[i % NODES.length],
      // Kepler's third law flavour: outer orbits are slower.
      period: o.period ?? 42 * Math.pow(radius / FIRST_ORBIT, 1.5),
      phase: o.phase ?? (i * 0.37) % 1,
      color: product ? product.look.color : "#6D4AFF",
    });
  }
  return out;
}

export const ORBITS = resolveOrbits();
export const OUTER_RADIUS = ORBITS.reduce((m, o) => Math.max(m, o.radius * (1 + o.eccentricity)), 0);

/** Solve Kepler's equation M = E - e·sin(E) for the eccentric anomaly E. */
export function eccentricAnomaly(meanAnomaly: number, e: number) {
  let E = meanAnomaly;
  for (let i = 0; i < 5; i++) {
    E = E - (E - e * Math.sin(E) - meanAnomaly) / (1 - e * Math.cos(E));
  }
  return E;
}

/** Position in the orbital plane (Sun at the focus). Writes x/z into `out`. */
export function orbitPoint(orbit: ResolvedOrbit, E: number, out: { x: number; y: number; z: number }) {
  out.x = orbit.radius * (Math.cos(E) - orbit.eccentricity);
  out.y = 0;
  out.z = -orbit.minor * Math.sin(E);
  return out;
}
