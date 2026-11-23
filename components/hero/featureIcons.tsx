import { MapPin, Repeat, Shield, ShieldAlert, Smartphone, Sparkles, Users, Zap, type LucideIcon } from "lucide-react";
import type { FeatureIcon } from "@/lib/products";

const ICONS: Record<FeatureIcon, LucideIcon> = {
  location: MapPin,
  crash: ShieldAlert,
  upi: Repeat,
  shield: Shield,
  users: Users,
  spark: Sparkles,
  mobile: Smartphone,
  bolt: Zap,
};

export function FeatureIconFor({ icon, className }: { icon: FeatureIcon; className?: string }) {
  const Icon = ICONS[icon];
  return <Icon className={className} aria-hidden strokeWidth={1.6} />;
}
