import {
  Car,
  Scissors,
  UtensilsCrossed,
  ShoppingBag,
  Wrench,
  HeartPulse,
  PartyPopper,
  Home,
  GraduationCap,
  Briefcase,
  Martini,
  Dumbbell,
  PawPrint,
  Palette,
  Plane,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "./biz";

/**
 * Per-category icon + soft tint, used on business onboarding and module tiles.
 * Tints use design tokens only (no raw hex).
 */
export const CATEGORY_META: Record<Category, { icon: LucideIcon; tint: string; fg: string }> = {
  auto: { icon: Car, tint: "bg-primary/10", fg: "text-primary" },
  beauty: { icon: Scissors, tint: "bg-rose-soft", fg: "text-rose" },
  food: { icon: UtensilsCrossed, tint: "bg-warn-soft", fg: "text-warn" },
  retail: { icon: ShoppingBag, tint: "bg-rose-soft", fg: "text-rose" },
  services: { icon: Wrench, tint: "bg-primary/10", fg: "text-primary" },
  health: { icon: HeartPulse, tint: "bg-success-soft", fg: "text-success" },
  events: { icon: PartyPopper, tint: "bg-rose-soft", fg: "text-rose" },
  home: { icon: Home, tint: "bg-success-soft", fg: "text-success" },
  education: { icon: GraduationCap, tint: "bg-primary/10", fg: "text-primary" },
  professional: { icon: Briefcase, tint: "bg-canvas", fg: "text-ink" },
  nightlife: { icon: Martini, tint: "bg-primary/10", fg: "text-primary" },
  fitness: { icon: Dumbbell, tint: "bg-success-soft", fg: "text-success" },
  pets: { icon: PawPrint, tint: "bg-warn-soft", fg: "text-warn" },
  arts: { icon: Palette, tint: "bg-rose-soft", fg: "text-rose" },
  travel: { icon: Plane, tint: "bg-primary/10", fg: "text-primary" },
  community: { icon: Users, tint: "bg-primary/10", fg: "text-primary" },
};
