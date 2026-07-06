'use client';

// Live data layer: reads businesses / events / posts from Supabase
// (Postgres + PostGIS) and maps rows to the app's fixture shapes. Serves the
// local fixtures until Supabase responds (or when it isn't configured), so
// the app always works. Geo: distance comes from the `businesses_v2` RPC
// (PostGIS st_distance from the selected city's center).

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { BUSINESSES, EVENTS, POSTS, type Business, type EventItem, type Post } from '@/data/fixtures';
import { CAT, type CatKey } from '@/lib/tiles';
import { useApp } from '@/lib/state';
import { normalizeMenuConfig } from '@/lib/menuConfig';
import { normalizeServiceConfig } from '@/lib/serviceConfig';
import { normalizeProductConfig } from '@/lib/productConfig';
import type { Bi, MenuCat, MenuItem, OptionGroup } from '@/data/bizdetail';

const MONTHS_ES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

const isCatKey = (v: string): v is CatKey => v in CAT;

// Map a `businesses_v2` / `business_by_slug` row → the app's Business shape.
// Shared by the geo list and the by-slug deep link so both stay identical.
export function mapBusinessRow(r: Record<string, unknown>, i: number, distM: number | null): Business {
  return {
    id: i,
    slug: String(r.slug),
    name: String(r.name),
    cat: String(r.category_id) as CatKey,
    rating: Number(r.rating).toFixed(1),
    reviews: Number(r.reviews_count),
    dist: distM != null ? `${(distM / 1609.34).toFixed(1)} mi` : '— mi',
    price: (r.price_level as Business['price']) ?? '$',
    open: Boolean(r.is_open),
    hours: (r.hours as Business['hours']) ?? undefined,
    hoursExceptions: (r.hours_exceptions as Business['hoursExceptions']) ?? undefined,
    verified: r.tier !== 'free',
    endorse: Number(r.endorse_count ?? 0),
    t: [String(r.tile_a ?? '#EFEBFF'), String(r.tile_b ?? '#E5DEF9')],
    specEs: String(r.specialty_es ?? ''),
    specEn: String(r.specialty_en ?? ''),
    subcats: (r.subcategories as string[]) ?? [],
    // dynamic feature filter: prefer the dedicated column, fall back to the
    // business's amenities so pre-migration rows still filter.
    features: (r.features as string[]) ?? (r.amenities_es as string[]) ?? [],
    cardFeatures: (r.card_features as string[] | null) ?? undefined,
    amEs: (r.amenities_es as string[]) ?? [],
    amEn: (r.amenities_en as string[]) ?? [],
    revEs: String(r.review_es ?? ''),
    revEn: String(r.review_en ?? ''),
    // owner-entered contact + description (absent on pre-0034 rows → undefined)
    phone: r.phone != null ? String(r.phone) : undefined,
    address: r.address != null ? String(r.address) : undefined,
    city: r.city != null ? String(r.city) : undefined,
    website: r.website != null ? String(r.website) : undefined,
    logoUrl: r.logo_url != null ? String(r.logo_url) : undefined,
    acceptsMessages: r.accepts_messages === true,
    messageChannel: r.message_channel === 'sms' ? 'sms' : r.message_channel === 'whatsapp' ? 'whatsapp' : undefined,
    messagePhone: r.message_phone != null ? String(r.message_phone) : undefined,
    descEs: r.about_es != null ? String(r.about_es) : undefined,
    descEn: r.about_en != null ? String(r.about_en) : undefined,
  };
}

/** Fetch a business's gallery photo URLs by public slug (cover first). Empty
 *  when offline / none uploaded — the listing falls back to placeholders. */
export async function fetchBusinessPhotos(slug: string): Promise<string[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('business_photos_by_slug', { in_slug: slug });
  if (error || !Array.isArray(data)) return [];
  return (data as { url: string }[]).map((r) => String(r.url)).filter(Boolean);
}

/** The real public menu for a listing: items grouped by the owner's menu
 *  categories, per-item option groups (modifier groups from menu_config) keyed
 *  by `catKey::itemNameEs`, and the first ACTIVE promo (for the hero badge). */
export type PublicMenu = { cats: MenuCat[]; groups: Record<string, OptionGroup[]>; promo: Bi | null; ordering: boolean };

/** Fetch + map a business's real menu by slug (migration 0045). Returns null
 *  when offline / no published items — BizDetail falls back to the fixtures. */
export async function fetchBusinessMenu(slug: string): Promise<PublicMenu | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('business_menu_by_slug', { in_slug: slug });
  if (error || !Array.isArray(data) || data.length === 0) return null;
  const row = data[0] as { items: unknown; config: unknown };
  const rows = Array.isArray(row.items) ? (row.items as Record<string, unknown>[]) : [];
  const cfg = normalizeMenuConfig(row.config);

  // Published = available (86'd items are hidden from the public menu).
  const live = rows.filter((r) => {
    const a = (r.attrs ?? {}) as Record<string, unknown>;
    return a.stock !== 'out';
  });
  if (live.length === 0) return null;

  const groups: Record<string, OptionGroup[]> = {};
  const toMenuItem = (r: Record<string, unknown>, tile: string, catKey: string): MenuItem => {
    const a = (r.attrs ?? {}) as Record<string, unknown>;
    const name = String(r.name);
    const dEs = String(r.description ?? '');
    const item: MenuItem = {
      n: [name, name],
      d: [dEs, String(a.en ?? dEs)],
      price: Number(r.price ?? 0),
      orig: a.compareAt != null ? Number(a.compareAt) : undefined,
      tag: a.popular ? ['Popular', 'Popular'] : a.isNew ? ['Nuevo', 'New'] : undefined,
      tagBg: a.popular ? '#EFEBFF' : a.isNew ? '#FCEFD6' : undefined,
      tagC: a.popular ? '#6D4DF6' : a.isNew ? '#9A6A12' : undefined,
      bg: tile,
      img: r.image_url != null ? String(r.image_url) : undefined,
    };
    // per-item option groups from the business's reusable modifier groups
    const modIds = Array.isArray(a.mods) ? (a.mods as string[]) : [];
    const gs = modIds
      .map((id) => cfg.mods.find((m) => m.id === id))
      .filter((m): m is NonNullable<typeof m> => !!m)
      .map((m): OptionGroup => ({
        id: m.id,
        name: [m.es, m.en],
        type: m.single ? 'single' : 'multi',
        choices: m.options.map((o) => ({ label: [o.es, o.en ?? o.es] as Bi, price: o.price })),
      }));
    if (gs.length) groups[`${catKey}::${name}`] = gs;
    return item;
  };

  const cats: MenuCat[] = [];
  const used = new Set<Record<string, unknown>>();
  for (const c of cfg.categories.filter((c) => c.visible)) {
    const inCat = live.filter((r) => r.section === c.id);
    inCat.forEach((r) => used.add(r));
    if (inCat.length) cats.push({ key: c.id, name: [c.es, c.en], items: inCat.map((r) => toMenuItem(r, c.tile, c.id)) });
  }
  const rest = live.filter((r) => !used.has(r));
  if (rest.length) cats.push({ key: '_rest', name: ['Menú', 'Menu'], items: rest.map((r) => toMenuItem(r, '#EFEBFF 0 8px,#E5DEF9 8px 16px', '_rest')) });
  if (cats.length === 0) return null;

  const active = cfg.promos.find((p) => p.status === 'active');
  return { cats, groups, promo: active ? [active.es, active.en] : null, ordering: cfg.ordering };
}

/** A public, consumer-facing add-on (resolved from service_config). */
export type PubSvcAddon = { id: string; name: Bi; price: number };
/** One public service (a `business_items` kind='service' row, consumer-shaped). */
export type PubSvc = {
  id: string;
  name: string;
  desc: Bi;
  price: number | null; // null → quote / inquiry
  priceType: 'fijo' | 'persona' | 'cotiza';
  dur: string;
  bookable: boolean; // false → inquiry only (no fixed slot, collects a lead)
  deposit: boolean; // requires an upfront at booking
  addons: PubSvcAddon[]; // resolved add-ons offered on this service
  tile: string; // category striped tile (placeholder imagery)
  img?: string; // real photo URL (live); tile stays as the fallback
};
export type PubSvcCat = { key: string; name: Bi; items: PubSvc[] };
/** The real public services for a listing: items grouped by the owner's service
 *  categories, the full add-on catalog (for the booking sheet), and the booking
 *  mode (false = display-only → no online Reservar). */
export type PublicServices = { cats: PubSvcCat[]; addons: PubSvcAddon[]; booking: boolean };

/** Fetch + map a business's real services by slug (migration 0046). Returns null
 *  when offline / no published services — BizDetail falls back to the fixtures. */
export async function fetchBusinessServices(slug: string): Promise<PublicServices | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('business_services_by_slug', { in_slug: slug });
  if (error || !Array.isArray(data) || data.length === 0) return null;
  const row = data[0] as { items: unknown; config: unknown };
  const rows = Array.isArray(row.items) ? (row.items as Record<string, unknown>[]) : [];
  if (rows.length === 0) return null;
  const cfg = normalizeServiceConfig(row.config);

  const addons: PubSvcAddon[] = cfg.addons.map((a) => ({ id: a.id, name: [a.es, a.en ?? a.es], price: a.price }));
  const addonById = new Map(addons.map((a) => [a.id, a]));

  const toSvc = (r: Record<string, unknown>, tile: string): PubSvc => {
    const a = (r.attrs ?? {}) as Record<string, unknown>;
    const name = String(r.name);
    const dEs = String(r.description ?? '');
    const price = r.price != null ? Number(r.price) : null;
    const priceType = (a.priceType as PubSvc['priceType']) ?? (price != null ? 'fijo' : 'cotiza');
    const ids = Array.isArray(a.addons) ? (a.addons as string[]) : [];
    return {
      id: String(r.id),
      name,
      desc: [dEs, String(a.en ?? dEs)],
      price,
      priceType,
      dur: String(a.dur ?? '60 min'),
      bookable: a.bookable !== false,
      deposit: !!a.deposit,
      addons: ids.map((id) => addonById.get(id)).filter((x): x is PubSvcAddon => !!x),
      tile,
      img: r.image_url != null ? String(r.image_url) : undefined,
    };
  };

  const cats: PubSvcCat[] = [];
  const used = new Set<Record<string, unknown>>();
  for (const c of cfg.categories.filter((c) => c.visible)) {
    const inCat = rows.filter((r) => r.section === c.id);
    inCat.forEach((r) => used.add(r));
    if (inCat.length) cats.push({ key: c.id, name: [c.es, c.en], items: inCat.map((r) => toSvc(r, c.tile)) });
  }
  const rest = rows.filter((r) => !used.has(r));
  if (rest.length) cats.push({ key: '_rest', name: ['Servicios', 'Services'], items: rest.map((r) => toSvc(r, '#EFE3D0 0 8px,#E2CFB2 8px 16px')) });
  if (cats.length === 0) return null;

  return { cats, addons, booking: cfg.booking };
}

/** The real public shop for a listing: products grouped by the owner's product
 *  categories (keys prefixed `sh:` so option groups never collide with the menu),
 *  per-item option groups (variant/option sets), featured collections (promo
 *  strip) and the selling mode (false = display-only → no cart). */
export type PublicShop = { cats: MenuCat[]; groups: Record<string, OptionGroup[]>; collections: { es: string; en: string; tile: string }[]; selling: boolean };

/** Fetch + map a business's real products by slug (migration 0048). Returns null
 *  when offline / no published products — BizDetail falls back to the fixtures. */
export async function fetchBusinessProducts(slug: string): Promise<PublicShop | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('business_products_by_slug', { in_slug: slug });
  if (error || !Array.isArray(data) || data.length === 0) return null;
  const row = data[0] as { items: unknown; config: unknown };
  const rows = Array.isArray(row.items) ? (row.items as Record<string, unknown>[]) : [];
  if (rows.length === 0) return null;
  const cfg = normalizeProductConfig(row.config);

  const groups: Record<string, OptionGroup[]> = {};
  const toItem = (r: Record<string, unknown>, tile: string, catKey: string): MenuItem => {
    const a = (r.attrs ?? {}) as Record<string, unknown>;
    const name = String(r.name);
    const dEs = String(r.description ?? '');
    const price = Number(r.price ?? 0);
    const compareAt = a.compareAt != null ? Number(a.compareAt) : undefined;
    const badges = Array.isArray(a.badges) ? (a.badges as string[]) : [];
    const tag: Bi | undefined = badges.includes('Popular') ? ['Popular', 'Popular'] : badges.includes('Nuevo') ? ['Nuevo', 'New'] : badges.includes('Oferta') ? ['Oferta', 'Sale'] : badges.includes('Local') ? ['Local', 'Local'] : undefined;
    const item: MenuItem = {
      n: [name, name],
      d: [dEs, String(a.en ?? dEs)],
      price,
      orig: compareAt && compareAt > price ? compareAt : undefined,
      tag,
      tagBg: tag ? '#EFEBFF' : undefined,
      tagC: tag ? '#6D4DF6' : undefined,
      bg: tile,
      img: r.image_url != null ? String(r.image_url) : undefined,
    };
    // per-item option groups from the business's reusable option sets
    const optIds = Array.isArray(a.options) ? (a.options as string[]) : [];
    const gs = optIds
      .map((id) => cfg.optionSets.find((o) => o.id === id))
      .filter((o): o is NonNullable<typeof o> => !!o)
      .map((o): OptionGroup => ({
        id: o.id,
        name: [o.es, o.en],
        type: o.single ? 'single' : 'multi',
        choices: o.values.map((v) => ({ label: [v.es, v.en ?? v.es] as Bi, price: v.price })),
      }));
    if (gs.length) groups[`${catKey}::${name}`] = gs;
    return item;
  };

  const cats: MenuCat[] = [];
  const used = new Set<Record<string, unknown>>();
  for (const c of cfg.categories.filter((c) => c.visible)) {
    const key = `sh:${c.id}`;
    const inCat = rows.filter((r) => r.section === c.id);
    inCat.forEach((r) => used.add(r));
    if (inCat.length) cats.push({ key, name: [c.es, c.en], items: inCat.map((r) => toItem(r, c.tile, key)) });
  }
  const rest = rows.filter((r) => !used.has(r));
  if (rest.length) cats.push({ key: 'sh:_rest', name: ['Tienda', 'Shop'], items: rest.map((r) => toItem(r, '#F3D9C8 0 8px,#E8C3AC 8px 16px', 'sh:_rest')) });
  if (cats.length === 0) return null;

  const collections = cfg.collections.filter((c) => c.featured).map((c) => ({ es: c.es, en: c.en, tile: c.tile }));
  return { cats, groups, collections, selling: cfg.selling };
}

/** Fetch a single business by its public slug (geo-independent). Returns a
 *  mapped Business or null (offline / not found / unknown category). */
export async function fetchBusinessBySlug(slug: string): Promise<Business | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('business_by_slug', { in_slug: slug });
  if (error || !Array.isArray(data) || data.length === 0) return null;
  const r = data[0] as Record<string, unknown>;
  if (!isCatKey(String(r.category_id))) return null;
  return mapBusinessRow(r, 0, (r.distance_m as number | null) ?? null);
}

function relTime(iso: string): [string, string] {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return [`hace ${mins} min`, `${mins}m`];
  const h = Math.round(mins / 60);
  if (h < 24) return [`hace ${h} h`, `${h}h`];
  const d = Math.round(h / 24);
  return [`hace ${d} d`, `${d}d`];
}

type LiveData = {
  businesses: Business[];
  events: EventItem[];
  posts: Post[];
  live: boolean;
  /** Re-fetch from Supabase (e.g. right after publishing a post). */
  refresh: () => void;
};

const Ctx = createContext<LiveData>({ businesses: BUSINESSES, events: EVENTS, posts: POSTS, live: false, refresh: () => {} });

// ~80 km radius for businesses/events: keeps a whole metro together.
const RADIUS_M = 80000;
// 30 miles for the hyperlocal community feed.
const COMMUNITY_RADIUS_M = 48280;

export function LiveDataProvider({ children }: { children: ReactNode }) {
  const { coords } = useApp();
  const [version, setVersion] = useState(0);
  const [data, setData] = useState<Omit<LiveData, 'refresh'>>({ businesses: BUSINESSES, events: EVENTS, posts: POSTS, live: false });

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    const { lat, lng } = coords; // real coords from geolocation / city pick

    (async () => {
      const [biz, ev, po] = await Promise.all([
        // businesses + events scoped to the user's metro by real distance
        supabase.rpc('businesses_v2', { user_lat: lat, user_lng: lng, in_city: null, max_results: 50, radius_m: RADIUS_M }),
        supabase.rpc('events_near', { user_lat: lat, user_lng: lng, radius_m: RADIUS_M, max_results: 50 }),
        // community feed is hyperlocal → posts within 30 miles of the user
        supabase.rpc('posts_near', { user_lat: lat, user_lng: lng, radius_m: COMMUNITY_RADIUS_M, max_results: 50 }),
      ]);
      if (cancelled) return;

      const next: Omit<LiveData, 'refresh'> = { businesses: BUSINESSES, events: EVENTS, posts: POSTS, live: false };

      // When a query SUCCEEDS we trust its result — even if empty (a city with
      // no listings genuinely shows none). Fixtures remain only if the query
      // errored (e.g. Supabase not configured, or migrations not applied yet).
      if (!biz.error && Array.isArray(biz.data)) {
        const rows = (biz.data as Record<string, unknown>[]).filter((r) => isCatKey(String(r.category_id)));
        next.businesses = rows.map((r, i) => mapBusinessRow(r, i, (r.distance_m as number | null) ?? null));
        next.live = true;
      }

      if (!ev.error && Array.isArray(ev.data)) {
        next.events = (ev.data as Record<string, unknown>[]).map((r, i): EventItem => {
          const d = new Date(String(r.starts_at));
          return {
            id: i,
            slug: r.slug != null ? String(r.slug) : undefined,
            dEs: MONTHS_ES[d.getMonth()],
            day: String(d.getDate()).padStart(2, '0'),
            cat: r.cat as EventItem['cat'],
            tEs: String(r.title_es),
            tEn: String(r.title_en),
            lEs: String(r.venue_es),
            lEn: String(r.venue_en),
            going: Number(r.going_count ?? 0),
            free: r.price_label == null,
            price: (r.price_label as string) ?? undefined,
            t: [String(r.tile_a ?? '#EFEBFF'), String(r.tile_b ?? '#E5DEF9')],
            timeEs: String(r.time_label_es ?? ''),
            timeEn: String(r.time_label_en ?? ''),
            descEs: String(r.desc_es ?? ''),
            descEn: String(r.desc_en ?? ''),
          };
        });
        next.live = true;
      }

      if (!po.error && Array.isArray(po.data)) {
        next.posts = (po.data as Record<string, unknown>[]).map((r): Post => {
          const [tEs, tEn] = relTime(String(r.created_at));
          return {
            id: String(r.id),
            type: r.type as Post['type'],
            initials: String(r.author_initials),
            color: String(r.author_color),
            name: String(r.author_name),
            authorId: (r.author_id as string) ?? undefined,
            hoodEs: String(r.hood ?? ''),
            city: (r.city as string) ?? undefined,
            timeEs: tEs,
            timeEn: tEn,
            recommends: Number(r.recommends ?? 0),
            business: (r.business_name as string) ?? undefined,
            bizRating: r.business_rating != null ? Number(r.business_rating).toFixed(1) : undefined,
            poll: (r.poll_options as string[]) ?? undefined,
            pollBase: (r.poll_votes as number[]) ?? undefined,
            images: (r.images as string[]) ?? undefined,
            es: String(r.body_es),
            en: String(r.body_en),
          };
        });
        next.live = true;
      }

      setData(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [coords, version]);

  return <Ctx.Provider value={{ ...data, refresh: () => setVersion((v) => v + 1) }}>{children}</Ctx.Provider>;
}

export function useLiveData(): LiveData {
  return useContext(Ctx);
}
