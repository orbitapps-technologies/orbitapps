import { cn } from "@/lib/utils";
import type { Product } from "@/lib/products";

/** OrbitApps mark: a sun with one tilted orbit and a planet on it. */
export function OrbitMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <defs>
        <radialGradient id="om-sun" cx="40%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#FFF1CF" />
          <stop offset="55%" stopColor="#FFB347" />
          <stop offset="100%" stopColor="#E0640F" />
        </radialGradient>
      </defs>
      <ellipse cx="16" cy="16" rx="14.2" ry="6.4" transform="rotate(-24 16 16)" fill="none" stroke="#F8FAFC" strokeOpacity=".55" strokeWidth="1.1" />
      <circle cx="16" cy="16" r="6.2" fill="url(#om-sun)" />
      <circle cx="28.4" cy="10.1" r="2.3" fill="#38BDF8" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <OrbitMark />
      <span className="font-wide text-[15px] font-medium tracking-[0.12em] text-foreground">OrbitApps</span>
    </span>
  );
}

/** Product logo: uses product.logo when set, otherwise a planet glyph in its colours. */
export function ProductGlyph({ product, className }: { product: Product; className?: string }) {
  if (product.logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={product.logo} alt={`${product.name} logo`} className={cn("size-12 rounded-2xl", className)} />;
  }
  const { color, deep, glow } = product.look;
  const id = `pg-${product.id}`;
  return (
    <span
      className={cn("relative grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.03]", className)}
      role="img"
      aria-label={`${product.name} logo`}
    >
      <svg viewBox="0 0 40 40" className="size-9" aria-hidden>
        <defs>
          <radialGradient id={id} cx="35%" cy="32%" r="75%">
            <stop offset="0%" stopColor={glow} />
            <stop offset="55%" stopColor={color} />
            <stop offset="100%" stopColor={deep} />
          </radialGradient>
        </defs>
        <circle cx="20" cy="20" r="12" fill={`url(#${id})`} />
        <path d="M20 13.5a5 5 0 0 0-5 5c0 3.6 5 8.5 5 8.5s5-4.9 5-8.5a5 5 0 0 0-5-5Z" fill="#03050D" fillOpacity=".72" />
        <circle cx="20" cy="18.6" r="1.8" fill={glow} />
        <circle cx="20" cy="20" r="17" fill="none" stroke={glow} strokeOpacity=".35" strokeWidth="0.8" />
      </svg>
    </span>
  );
}
