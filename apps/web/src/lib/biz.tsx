"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * Business context — tier + category gate the whole business side.
 * Read these everywhere a business surface renders; never assume premium.
 */

export type Tier = "free" | "verified" | "premium";

/** The 16 onboarding categories. Labels are bilingual; resolve via CATEGORY_LABELS. */
export type Category =
  | "auto"
  | "beauty"
  | "food"
  | "retail"
  | "services"
  | "health"
  | "events"
  | "home"
  | "education"
  | "professional"
  | "nightlife"
  | "fitness"
  | "pets"
  | "arts"
  | "travel"
  | "community";

export const CATEGORY_LABELS: Record<Category, { es: string; en: string }> = {
  auto: { es: "Servicios de auto", en: "Auto services" },
  beauty: { es: "Belleza y salud", en: "Beauty & health" },
  food: { es: "Comida y bebida", en: "Food & drink" },
  retail: { es: "Tiendas y retail", en: "Retail & shops" },
  services: { es: "Servicios", en: "Services" },
  health: { es: "Salud", en: "Health" },
  events: { es: "Eventos", en: "Events" },
  home: { es: "Hogar y reparación", en: "Home & repair" },
  education: { es: "Educación", en: "Education" },
  professional: { es: "Profesional", en: "Professional" },
  nightlife: { es: "Vida nocturna", en: "Nightlife" },
  fitness: { es: "Fitness", en: "Fitness" },
  pets: { es: "Mascotas", en: "Pets" },
  arts: { es: "Arte y cultura", en: "Arts & culture" },
  travel: { es: "Viajes", en: "Travel" },
  community: { es: "Comunidad", en: "Community" },
};

/** Tier capability matrix — the upsell engine. Gate features against this. */
export const TIER_CAPS = {
  free: { photos: 3, modules: false, reviewReplies: false, featured: false, label: { es: "Básico", en: "Free" } },
  verified: { photos: 30, modules: true, reviewReplies: true, featured: false, label: { es: "Verificado", en: "Verified" } },
  premium: { photos: Infinity, modules: true, reviewReplies: true, featured: true, label: { es: "Premium", en: "Premium" } },
} as const;

type BizValue = {
  tier: Tier;
  setTier: (t: Tier) => void;
  category: Category;
  setCategory: (c: Category) => void;
};

const BizContext = createContext<BizValue | null>(null);

export function BizProvider({
  children,
  initialTier = "verified",
  initialCategory = "food",
}: {
  children: ReactNode;
  initialTier?: Tier;
  initialCategory?: Category;
}) {
  const [tier, setTier] = useState<Tier>(initialTier);
  const [category, setCategory] = useState<Category>(initialCategory);
  return <BizContext.Provider value={{ tier, setTier, category, setCategory }}>{children}</BizContext.Provider>;
}

export function useBiz(): BizValue {
  const ctx = useContext(BizContext);
  if (!ctx) throw new Error("useBiz must be used inside <BizProvider>");
  return ctx;
}
