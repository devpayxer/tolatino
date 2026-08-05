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
  // Las piezas de la dirección (0153). Se LEEN aquí; se escriben solo por
  // `set_business_address` — ver `WRITABLE` abajo.
  address_line2: string | null;
  state: string | null;
  postal_code: string | null;
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
  connect_charges_enabled?: boolean; // Stripe Connect ready → can charge (0071); else catalog mode
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
  re_config: { license?: string; specialty?: string; langs?: string; zones?: string[]; broker?: string } | null; // real-estate agent config (0117)
  auto_config: { license?: string; sellerType?: string; bhph?: boolean; financing?: boolean; cash?: boolean; langs?: string; zones?: string[] } | null; // car-dealer config (0119)
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
  RealEstate: 'realestate',
  CarDealer: 'cardealer',
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

// SIN negocio demo (2026-07-29). Antes vivían aquí DEMO_BIZ ('Taquería La
// Esperanza', tier verified, 4.8★/412 reseñas) y DEMO_BIZ_2 ('Salón Bella Vida'),
// que se mostraban a quien NO tuviera sesión para que el panel fuera explorable.
// En producción eso es inaceptable (regla #8: nada fabricado presentado como
// real): el fundador se registró, quedó sin sesión por confirmar el correo, abrió
// /negocio y vio un negocio VERIFICADO con 412 reseñas que parecía SUYO — además
// de una solicitud de 'Aliado' inventada. La confianza ES el producto; un dueño
// nuevo que ve datos que no son suyos no vuelve.
// Ahora, sin sesión el panel usa el MISMO estado vacío que un dueño recién
// registrado sin negocios ('conecta tu negocio'), que ya existía y es correcto.

// Columns that are safe to write from the client (map 1:1 to editable form
// fields). tier / rating / reviews_count are intentionally NOT here — they are
// controlled by billing / the review system, not the listing editor.
//
// `address`, `address_line2`, `city`, `state` y `postal_code` TAMPOCO están, y
// no es un olvido (2026-08-05): la dirección solo se escribe por
// `set_business_address`, que guarda la calle Y el punto del mapa a la vez.
// Mientras fue una columna más, el panel cambiaba el texto y dejaba el pin en la
// dirección anterior. Quitarla de aquí convierte «acuérdate de actualizar la
// coordenada» en algo que no se puede olvidar.
const WRITABLE: (keyof BizRow)[] = [
  'name', 'category_id', 'tagline_es', 'tagline_en', 'price_level', 'about_es', 'about_en',
  'phone', 'website', 'logo_url', 'accepts_messages', 'message_channel', 'message_phone', 'hours', 'features', 'card_features', 'subcategories', 'specialty_es', 'specialty_en', 'is_open', 'modules', 'settings', 'hours_exceptions', 'menu_config', 'service_config', 'product_config', 'rental_config', 're_config', 'auto_config',
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
  // `demo` = modo escaparate SIN backend (build estático puro, sin Supabase).
  // Con backend configurado NUNCA se activa: un visitante sin sesión ve el mismo
  // estado vacío que un dueño sin negocios, jamás datos fabricados (regla #8).
  const [demo, setDemo] = useState(false);
  const [businesses, setBusinesses] = useState<BizRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    // Sin sesión (o sin Supabase) → VACÍO, no demo. El panel muestra su estado
    // "conecta tu negocio", que es la verdad: este visitante no administra nada.
    if (!supabase || !user) {
      setDemo(false);
      setBusinesses([]);
      setActiveId(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setDemo(false);
    setLoading(true);
    (async () => {
      try {
        // select('*') — NOT an explicit column list — so a not-yet-applied
        // migration or a briefly-stale PostgREST schema cache can never make the
        // query error and blank the owner's real businesses (that turned the whole
        // dashboard into the "connect your business" empty state). Unknown/extra
        // columns are simply ignored by the row mapping. The global fetch timeout
        // (lib/supabase.ts) guarantees this await always settles, so `loading`
        // can never be stranded true → no infinite spinner.
        const { data, error } = await supabase!
          .from('businesses')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: true });
        if (cancelled) return;
        if (error) {
          // Transient error/timeout → keep whatever we already have; never wipe a
          // working dashboard. A refresh re-tries the load.
          return;
        }
        const rows = Array.isArray(data) ? (data as unknown as BizRow[]) : [];
        setBusinesses(rows);
        // keep the current selection if it still exists, else pick the first
        setActiveId((prev) => (prev && rows.some((r) => r.id === prev) ? prev : rows[0]?.id ?? null));
      } finally {
        // Always clear the gate on the live request — no early return (cancel or
        // error) can leave the six bizAdmin-gated modules spinning forever.
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Key on user?.id (a stable string), NOT the user object: useAuth() emits a
    // fresh user object on every auth event (INITIAL_SESSION, TOKEN_REFRESHED,
    // focus revalidation). Keying on the object re-ran this effect on every
    // refresh → setLoading(true) re-flashed all six gated modules to a spinner
    // mid-session. The id only changes on a real sign-in/out, which is when a
    // reload is actually warranted.
  }, [user?.id, version]);

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
