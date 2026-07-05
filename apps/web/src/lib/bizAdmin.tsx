'use client';

// Business-admin data layer for the dashboard (`/negocio`). Loads the SIGNED-IN
// owner's real businesses (RLS: public read + "update own business", migration
// 0013) and exposes the active one plus a writer that persists edits to the real
// `businesses` row. When the owner has no business (or isn't signed in / Supabase
// isn't configured) it stays in DEMO mode so the dashboard is always explorable —
// the Panel keeps its fixture identity in that case.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Mods, Rubro, Tier } from '@/screens/negocio/tabs';

// One row of the owner's business, admin view (all editable fields).
export type BizRow = {
  id: string;
  slug: string;
  name: string;
  category_id: string;
  tagline_es: string | null;
  tagline_en: string | null;
  tier: Tier;
  price_level: string | null;
  about_es: string | null;
  about_en: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  website: string | null;
  accepts_messages: boolean;
  message_channel: string | null; // 'sms' | 'whatsapp'
  hours: number[][][] | null; // WeekHours jsonb
  features: string[];
  subcategories: string[];
  specialty_es: string | null;
  specialty_en: string | null;
  is_open: boolean;
  rating: number;
  reviews_count: number;
  tile_a: string | null;
  tile_b: string | null;
  modules: Mods | null; // which dashboard modules are on (null = tier default)
  settings: Record<string, unknown> | null; // notifications / shipping / drivers prefs
  created_at: string;
};

// Columns we read for the admin view (never the raw `location` geography — it
// serializes as WKB hex and we don't need it here).
const COLS =
  'id,slug,name,category_id,tagline_es,tagline_en,tier,price_level,about_es,about_en,address,city,phone,website,accepts_messages,message_channel,hours,features,subcategories,specialty_es,specialty_en,is_open,rating,reviews_count,tile_a,tile_b,modules,settings,created_at';

// The 15 public categories → the dashboard's 5 rubros (drives module defaults &
// category-specific copy). Anything not clearly food/beauty/auto/rental is retail.
const RUBRO_FROM_CAT: Record<string, Rubro> = {
  FoodDrinks: 'restaurant',
  NightLife: 'restaurant',
  BeautyHealth: 'beauty',
  HealthMedicine: 'beauty',
  AutoServices: 'auto',
  Transportation: 'auto',
  Party: 'rental',
  Sports: 'rental',
  Shops: 'retail',
  Grocery: 'retail',
  HomeServices: 'retail',
  ProServices: 'retail',
  Education: 'retail',
  Children: 'retail',
  Churches: 'retail',
};

export const rubroFromCat = (cat: string): Rubro => RUBRO_FROM_CAT[cat] ?? 'retail';

// Demo business used when nobody is signed in, so the dashboard is fully
// explorable (real editors with sample data). Edits stay local — never
// persisted. A signed-in owner always sees their real business(es) instead.
const DEMO_BIZ: BizRow = {
  id: 'demo',
  slug: 'taqueria-la-esperanza',
  name: 'Taquería La Esperanza',
  category_id: 'FoodDrinks',
  tagline_es: 'Sabor de casa en Bellaire',
  tagline_en: 'Home-style flavor in Bellaire',
  tier: 'verified',
  price_level: '$$',
  about_es: 'Negocio familiar. Preparamos todo a diario con ingredientes locales. Catering disponible.',
  about_en: 'Family business. Everything made daily with local ingredients. Catering available.',
  address: '5821 Bellaire Blvd, Houston, TX',
  city: 'Houston, TX',
  phone: '(832) 555-4521',
  website: 'taquerialaesperanza.com',
  accepts_messages: true,
  message_channel: 'whatsapp',
  hours: [[[600, 1200]], [[540, 1320]], [[540, 1320]], [[540, 1320]], [[540, 1320]], [[540, 1380]], [[540, 1380]]],
  features: ['A domicilio', 'Para llevar', 'Comedor', 'Se habla español'],
  subcategories: ['Tacos', 'Comida mexicana'],
  specialty_es: 'Tacos al pastor',
  specialty_en: 'Al pastor tacos',
  is_open: true,
  rating: 4.8,
  reviews_count: 412,
  tile_a: '#ECE3F8',
  tile_b: '#E3D7F4',
  modules: null,
  settings: null,
  created_at: '2024-01-01T00:00:00Z',
};

// Columns that are safe to write from the client (map 1:1 to editable form
// fields). tier / rating / reviews_count are intentionally NOT here — they are
// controlled by billing / the review system, not the listing editor.
const WRITABLE: (keyof BizRow)[] = [
  'name', 'category_id', 'tagline_es', 'tagline_en', 'price_level', 'about_es', 'about_en',
  'address', 'city', 'phone', 'website', 'accepts_messages', 'message_channel', 'hours', 'features', 'subcategories', 'specialty_es', 'specialty_en', 'is_open', 'modules', 'settings',
];

type BizAdminCtx = {
  configured: boolean; // Supabase present
  demo: boolean; // not signed in → sample business, edits local only, no network reads
  loading: boolean;
  hasReal: boolean; // signed-in owner has ≥1 real business
  businesses: BizRow[];
  active: BizRow | null;
  activeId: string | null;
  setActive: (id: string) => void;
  /** Persist a patch to the active business (RLS-guarded) + update local state. */
  update: (patch: Partial<BizRow>) => Promise<{ error: string | null }>;
  refresh: () => void;
};

const Ctx = createContext<BizAdminCtx | null>(null);

export function BizAdminProvider({ children }: { children: ReactNode }) {
  const { user, configured } = useAuth();
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(true);
  const [businesses, setBusinesses] = useState<BizRow[]>([DEMO_BIZ]);
  const [activeId, setActiveId] = useState<string | null>(DEMO_BIZ.id);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    // Not signed in (or Supabase not configured) → DEMO mode: one sample
    // business so every editor is explorable; edits stay local.
    if (!supabase || !user) {
      setDemo(true);
      setBusinesses([DEMO_BIZ]);
      setActiveId(DEMO_BIZ.id);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setDemo(false);
    setLoading(true);
    (async () => {
      const { data, error } = await supabase!
        .from('businesses')
        .select(COLS)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true });
      if (cancelled) return;
      const rows = error || !Array.isArray(data) ? [] : (data as unknown as BizRow[]);
      setBusinesses(rows);
      // keep the current selection if it still exists, else pick the first
      setActiveId((prev) => (prev && rows.some((r) => r.id === prev) ? prev : rows[0]?.id ?? null));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, version]);

  const active = useMemo(() => businesses.find((b) => b.id === activeId) ?? null, [businesses, activeId]);

  const update = useCallback(
    async (patch: Partial<BizRow>): Promise<{ error: string | null }> => {
      if (!active) return { error: 'no-active-business' };
      // Only forward known-writable columns to the DB.
      const dbPatch: Record<string, unknown> = {};
      for (const k of WRITABLE) if (k in patch) dbPatch[k] = patch[k];
      // Optimistic local update so the UI reflects the change immediately.
      setBusinesses((list) => list.map((b) => (b.id === active.id ? ({ ...b, ...patch } as BizRow) : b)));
      if (!supabase || demo) return { error: null }; // demo / not configured → local only
      const { error } = await supabase.from('businesses').update(dbPatch).eq('id', active.id);
      return { error: error ? error.message : null };
    },
    [active, demo],
  );

  const value: BizAdminCtx = {
    configured,
    demo,
    loading,
    hasReal: !demo && businesses.length > 0,
    businesses,
    active,
    activeId,
    setActive: setActiveId,
    update,
    refresh: () => setVersion((v) => v + 1),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBizAdmin(): BizAdminCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useBizAdmin must be used inside <BizAdminProvider>');
  return ctx;
}
