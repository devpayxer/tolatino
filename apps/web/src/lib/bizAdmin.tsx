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
import type { HoursException } from '@/lib/hours';
import type { MenuConfig } from '@/lib/menuConfig';
import type { ServiceConfig } from '@/lib/serviceConfig';
import type { ProductConfig } from '@/lib/productConfig';
import type { RentalConfig } from '@/lib/rentalConfig';

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
  logo_url: string | null;
  accepts_messages: boolean;
  message_channel: string | null; // 'sms' | 'whatsapp'
  message_phone: string | null; // separate messaging number; null = use `phone`
  hours: number[][][] | null; // WeekHours jsonb
  hours_exceptions: HoursException[] | null; // date overrides (holidays/vacations)
  features: string[];
  card_features: string[] | null; // up to 3 highlighted on the search card
  subcategories: string[];
  specialty_es: string | null;
  specialty_en: string | null;
  is_open: boolean;
  timezone?: string | null; // IANA tz for metric rollups (0079); absent/null → America/Chicago
  rating: number;
  reviews_count: number;
  tile_a: string | null;
  tile_b: string | null;
  modules: Mods | null; // which dashboard modules are on (null = tier default)
  settings: Record<string, unknown> | null; // notifications / shipping / drivers prefs
  menu_config: MenuConfig | null; // food-menu structure (categories/mods/dayparts/promos)
  service_config: ServiceConfig | null; // services structure (categories/add-ons/booking mode)
  product_config: ProductConfig | null; // shop structure (categories/option sets/collections/discounts/sell mode)
  rental_config: RentalConfig | null; // rental structure (categories/add-ons/rental mode)
  created_at: string;
};

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
  logo_url: null,
  accepts_messages: true,
  message_channel: 'whatsapp',
  message_phone: null,
  hours: [[[600, 1200]], [[540, 1320]], [[540, 1320]], [[540, 1320]], [[540, 1320]], [[540, 1380]], [[540, 1380]]],
  hours_exceptions: null,
  features: ['A domicilio', 'Para llevar', 'Comedor', 'Se habla español'],
  card_features: ['A domicilio', 'Para llevar', 'Se habla español'],
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
  menu_config: null,
  service_config: null,
  product_config: null,
  rental_config: null,
  created_at: '2024-01-01T00:00:00Z',
};

// A second demo business so the switcher flow is visible/explorable when nobody
// is signed in (a real owner sees their own list instead). Different rubro.
const DEMO_BIZ_2: BizRow = {
  id: 'demo-2',
  slug: 'salon-bella-vida',
  name: 'Salón Bella Vida',
  category_id: 'BeautyHealth',
  tagline_es: 'Belleza con cariño',
  tagline_en: 'Beauty with care',
  tier: 'free',
  price_level: '$$',
  about_es: 'Salón familiar. Cortes, color y uñas con productos de calidad.',
  about_en: 'Family salon. Cuts, color and nails with quality products.',
  address: '2140 Long Point Rd, Houston, TX',
  city: 'Houston, TX',
  phone: '(713) 555-0192',
  website: null,
  logo_url: null,
  accepts_messages: true,
  message_channel: 'sms',
  message_phone: null,
  hours: [[], [[540, 1140]], [[540, 1140]], [[540, 1140]], [[540, 1140]], [[540, 1080]], []],
  hours_exceptions: null,
  features: ['Con cita', 'Sin cita', 'Se habla español'],
  card_features: ['Con cita', 'Se habla español'],
  subcategories: ['Salón de belleza', 'Uñas'],
  specialty_es: 'Color y tratamientos',
  specialty_en: 'Color & treatments',
  is_open: true,
  rating: 4.7,
  reviews_count: 138,
  tile_a: '#FBE9F0',
  tile_b: '#F5D8E6',
  modules: null,
  settings: null,
  menu_config: null,
  service_config: null,
  product_config: null,
  rental_config: null,
  created_at: '2024-03-01T00:00:00Z',
};

// Columns that are safe to write from the client (map 1:1 to editable form
// fields). tier / rating / reviews_count are intentionally NOT here — they are
// controlled by billing / the review system, not the listing editor.
const WRITABLE: (keyof BizRow)[] = [
  'name', 'category_id', 'tagline_es', 'tagline_en', 'price_level', 'about_es', 'about_en',
  'address', 'city', 'phone', 'website', 'logo_url', 'accepts_messages', 'message_channel', 'message_phone', 'hours', 'features', 'card_features', 'subcategories', 'specialty_es', 'specialty_en', 'is_open', 'modules', 'settings', 'hours_exceptions', 'menu_config', 'service_config', 'product_config', 'rental_config',
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
  /** Persist a patch to the active business (RLS-guarded) + update local state.
   *  `skipped` lists columns the DB didn't recognize (pending migration) — the
   *  rest of the patch WAS saved. */
  update: (patch: Partial<BizRow>) => Promise<{ error: string | null; skipped?: string[] }>;
  refresh: () => void;
};

const Ctx = createContext<BizAdminCtx | null>(null);

export function BizAdminProvider({ children }: { children: ReactNode }) {
  const { user, configured } = useAuth();
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(true);
  const [businesses, setBusinesses] = useState<BizRow[]>([DEMO_BIZ, DEMO_BIZ_2]);
  const [activeId, setActiveId] = useState<string | null>(DEMO_BIZ.id);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    // Not signed in (or Supabase not configured) → DEMO mode: one sample
    // business so every editor is explorable; edits stay local.
    if (!supabase || !user) {
      setDemo(true);
      setBusinesses([DEMO_BIZ, DEMO_BIZ_2]);
      setActiveId((prev) => (prev === DEMO_BIZ_2.id ? DEMO_BIZ_2.id : DEMO_BIZ.id));
      setLoading(false);
      return;
    }
    let cancelled = false;
    setDemo(false);
    setLoading(true);
    (async () => {
      // select('*') — NOT an explicit column list — so a not-yet-applied
      // migration or a briefly-stale PostgREST schema cache can never make the
      // query error and blank the owner's real businesses (that turned the whole
      // dashboard into the "connect your business" empty state). Unknown/extra
      // columns are simply ignored by the row mapping.
      const { data, error } = await supabase!
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true });
      if (cancelled) return;
      if (error) {
        // Transient error → keep whatever we already have; never wipe a working
        // dashboard. A refresh re-tries the load.
        setLoading(false);
        return;
      }
      const rows = Array.isArray(data) ? (data as unknown as BizRow[]) : [];
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
    async (patch: Partial<BizRow>): Promise<{ error: string | null; skipped?: string[] }> => {
      if (!active) return { error: 'no-active-business' };
      // Only forward known-writable columns to the DB.
      const dbPatch: Record<string, unknown> = {};
      for (const k of WRITABLE) if (k in patch) dbPatch[k] = patch[k];
      // Optimistic local update so the UI reflects the change immediately.
      setBusinesses((list) => list.map((b) => (b.id === active.id ? ({ ...b, ...patch } as BizRow) : b)));
      if (!supabase || demo) return { error: null }; // demo / not configured → local only

      // A column the DB doesn't know yet (migration not applied, or PostgREST's
      // schema cache briefly stale after DDL) must NOT sink the whole save —
      // drop the offending column, save the rest, and report what was skipped.
      //   PostgREST: "Could not find the 'card_features' column of ..."
      //   Postgres:  column "card_features" of relation ... does not exist
      const skipped: string[] = [];
      let toSend = { ...dbPatch };
      for (let attempt = 0; attempt < WRITABLE.length; attempt++) {
        if (Object.keys(toSend).length === 0) break;
        const { error } = await supabase.from('businesses').update(toSend).eq('id', active.id);
        if (!error) return { error: null, skipped: skipped.length ? skipped : undefined };
        const m = /'([^']+)' column/.exec(error.message) ?? /column "([^"]+)"/.exec(error.message);
        if (m && m[1] in toSend) {
          skipped.push(m[1]);
          const { [m[1]]: _drop, ...rest } = toSend;
          toSend = rest;
          continue;
        }
        return { error: error.message };
      }
      return { error: null, skipped: skipped.length ? skipped : undefined };
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
