import { MapPin, Repeat, Shield, ShieldAlert, Sparkles, Users, type LucideIcon } from "lucide-react";
import type { FeatureIcon } from "@/lib/products";

const ICONS: Record<FeatureIcon, LucideIcon> = {
  location: MapPin,
  crash: ShieldAlert,
  upi: Repeat,
  shield: Shield,
  users: Users,
  spark: Sparkles,
};

export function FeatureIconFor({ icon, className }: { icon: FeatureIcon; className?: string }) {
  const Icon = ICONS[icon];
  return <Icon className={className} aria-hidden />;
}
