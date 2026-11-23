import { cn } from "@/lib/utils";
import type { Product } from "@/lib/products";

/** OrbitApps mark: a ringed planet, drawn in one weight. */
export function OrbitMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} fill="none" aria-hidden>
      <circle cx="15" cy="17" r="7" stroke="currentColor" strokeWidth="1.8" />
      <ellipse cx="15" cy="17" rx="13" ry="4.6" transform="rotate(-24 15 17)" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="27" cy="6" r="2.2" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3 text-white", className)}>
      <OrbitMark className="size-8" />
      <span className="font-display text-[17px] leading-none tracking-[0.02em]">OrbitApps</span>
      <span className="label-mono hidden !text-[0.68rem] sm:inline">Technologies</span>
    </span>
  );
}

const SIZES = {
  sm: { box: "size-8 rounded-[9px]", text: "text-[13px]" },
  md: { box: "size-12 rounded-[13px]", text: "text-lg" },
  lg: { box: "size-16 rounded-[17px]", text: "text-2xl" },
  xl: { box: "size-20 rounded-[21px]", text: "text-3xl" },
} as const;

/** Placeholder app icon for an orbit with no product yet. */
export function FutureMark({ size = "md", className }: { size?: keyof typeof SIZES; className?: string }) {
  const s = SIZES[size];
  return (
    <span
      role="img"
      aria-label="Coming soon"
      className={cn("relative grid shrink-0 place-items-center border border-dashed border-white/25 bg-white/[0.04] text-white/55", s.box, className)}
    >
      <svg viewBox="0 0 24 24" className="size-[42%]" aria-hidden>
        <path d="M12 6v12M6 12h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </span>
  );
}

/** Product app icon: product.logo when provided, otherwise a tile in the product's colours. */
export function ProductMark({ product, size = "md", className }: { product: Product; size?: keyof typeof SIZES; className?: string }) {
  const s = SIZES[size];
  if (product.logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={product.logo} alt={`${product.name} logo`} className={cn(s.box, "object-cover", className)} />;
  }
  const { accent, deep, glow } = product.identity;
  return (
    <span
      role="img"
      aria-label={`${product.name} logo`}
      className={cn("relative grid shrink-0 place-items-center overflow-hidden font-display text-white", s.box, s.text, className)}
      style={{ background: `linear-gradient(145deg, ${accent} 0%, ${deep} 100%)`, boxShadow: `inset 0 1px 0 ${glow}88, 0 12px 30px -10px ${accent}` }}
    >
      <span aria-hidden className="absolute inset-[14%] rounded-full border border-white/30" />
      <span className="relative">{product.name.charAt(0)}</span>
    </span>
  );
}
