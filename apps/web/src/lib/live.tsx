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
import { normalizeRentalConfig } from '@/lib/rentalConfig';
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
  capacity: string; // seats-per-session range ('1' | '2–6' | '8–16' | '20+')
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
      capacity: String(a.capacity ?? ''),
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

/** Per-slot seat load for a bookable service (migration 0059) — the booking sheet
 *  disables the exact time slots that are full (capacity = seats per session).
 *  `slot` is the ISO start timestamp. Exposes only slot + seats (SECURITY DEFINER
 *  RPC, no customer data). Returns [] offline / pre-migration / on error. */
export async function fetchBookingLoad(serviceId: string): Promise<{ slot: string; seats: number }[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('booking_load_by_service', { in_service_id: serviceId });
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({ slot: String(r.slot), seats: Number(r.seats ?? 0) }));
}

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
      stock: a.stock != null ? Number(a.stock) : undefined,
      variantStock: a.variantStock && typeof a.variantStock === 'object' && !Array.isArray(a.variantStock)
        ? Object.fromEntries(Object.entries(a.variantStock as Record<string, unknown>).map(([k, v]) => [k, Number(v)]))
        : undefined,
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

// ── real rentals (business_items kind='rental' + rental_config, migration 0050) ──
export type PubRentalAddon = { id: string; name: Bi; price: number };
export type PubRental = {
  id: string;
  n: Bi; // bilingual name
  d: Bi; // bilingual description
  tile: string; // category striped tile (placeholder imagery)
  hour: number | null;
  day: number;
  week: number;
  dep: number; // refundable deposit (per unit)
  img?: string; // real photo URL (live); tile stays as the fallback
  addons: PubRentalAddon[]; // resolved priced extras offered on this item
  avail: string; // availability rule (es): 'Siempre'|'Entre semana'|'Fines de semana'|'48h aviso'
  stock: number; // how many units exist (0/1 → single-unit, no qty picker)
  unit: Bi; // unit noun (e.g. "mesa"/"table")
  catKey: string;
  catName: Bi;
};
/** The real public rentals for a listing: items with hour/day/week rates +
 *  deposit, resolved add-ons (for the Rentar sheet), and the rental mode
 *  (false = display-only → no online Rentar). */
export type PublicRentals = { items: PubRental[]; addons: PubRentalAddon[]; renting: boolean };

/** Fetch + map a business's real rental items by slug (migration 0050). Returns
 *  null when offline / no published rentals — BizDetail falls back to fixtures. */
export async function fetchBusinessRentals(slug: string): Promise<PublicRentals | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('business_rentals_by_slug', { in_slug: slug });
  if (error || !Array.isArray(data) || data.length === 0) return null;
  const row = data[0] as { items: unknown; config: unknown };
  const rows = Array.isArray(row.items) ? (row.items as Record<string, unknown>[]) : [];
  if (rows.length === 0) return null;
  const cfg = normalizeRentalConfig(row.config);

  const addons: PubRentalAddon[] = cfg.addons.map((a) => ({ id: a.id, name: [a.es, a.en ?? a.es], price: a.price }));
  const addonById = new Map(addons.map((a) => [a.id, a]));
  const catById = new Map(cfg.categories.map((c) => [c.id, c]));
  const FALLBACK_TILE = '#EAE2F8 0 11px,#DCCEF2 11px 22px';

  const toRental = (r: Record<string, unknown>): PubRental => {
    const a = (r.attrs ?? {}) as Record<string, unknown>;
    const name = String(r.name);
    const dEs = String(r.description ?? '');
    const cat = catById.get(String(r.section ?? ''));
    const ids = Array.isArray(a.addons) ? (a.addons as string[]) : [];
    return {
      id: String(r.id),
      n: [name, String(a.nameEn ?? name)],
      d: [dEs, String(a.descEn ?? dEs)],
      tile: cat?.tile ?? String(a.tile ?? FALLBACK_TILE),
      hour: a.hour != null ? Number(a.hour) : null,
      day: r.price != null ? Number(r.price) : Number(a.day ?? 0),
      week: Number(a.week ?? 0),
      dep: Number(a.dep ?? 0),
      img: r.image_url != null ? String(r.image_url) : undefined,
      addons: ids.map((id) => addonById.get(id)).filter((x): x is PubRentalAddon => !!x),
      avail: String(a.availEs ?? ''),
      stock: Number(a.stock ?? 0),
      unit: [String(a.unitEs ?? ''), String(a.unitEn ?? a.unitEs ?? '')],
      catKey: cat?.id ?? '_rest',
      catName: cat ? [cat.es, cat.en] : ['Renta', 'Rentals'],
    };
  };

  const items = rows.map(toRental);
  if (items.length === 0) return null;
  return { items, addons, renting: cfg.renting };
}

/** Busy date-ranges for a rental item (migration 0051) — the calendar greys out
 *  days already booked to capacity. Exposes only dates + qty (SECURITY DEFINER
 *  RPC, no customer data). Returns [] offline / pre-migration / on error. */
export async function fetchRentalBusy(itemId: string): Promise<{ start: string; end: string; qty: number }[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('rental_busy_by_item', { in_item_id: itemId });
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    start: String(r.starts), end: String(r.ends ?? r.starts), qty: Number(r.qty ?? 1),
  }));
}

// ── real reviews (migration 0056) ──
export type PubReview = {
  id: string; name: string; initials: string; rating: number; body: [string, string];
  createdAt: string; mine: boolean;
  reply: [string, string] | null; repliedAt: string | null;
  photos: string[];
};

/** A business's real reviews by slug (migration 0056; owner reply 0057; photos 0058). [] offline / none. */
export async function fetchBusinessReviews(slug: string): Promise<PubReview[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('reviews_by_slug', { in_slug: slug });
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => {
    const rEs = r.reply_es == null ? '' : String(r.reply_es);
    const rEn = r.reply_en == null ? '' : String(r.reply_en);
    const reply = rEs || rEn ? ([rEs || rEn, rEn || rEs] as [string, string]) : null;
    const photos = Array.isArray(r.photos) ? (r.photos as unknown[]).map(String).filter(Boolean) : [];
    return {
      id: String(r.id), name: String(r.author_name ?? 'Cliente'), initials: String(r.author_initials ?? 'C'),
      rating: Number(r.rating ?? 5), body: [String(r.body_es ?? ''), String(r.body_en ?? r.body_es ?? '')],
      createdAt: String(r.created_at), mine: !!r.is_mine,
      reply, repliedAt: reply && r.replied_at != null ? String(r.replied_at) : null,
      photos,
    };
  });
}

/** Post (or update) the signed-in user's review for a business, with optional photo
 *  URLs (migration 0058). Returns the review id, or null (offline / not signed in). */
export async function postReview(slug: string, rating: number, body: string, photos: string[] = []): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('post_review', {
    in_slug: slug, in_rating: rating, in_body: body, in_photos: photos,
  });
  if (error || !data) return null;
  return String(data);
}

// ── events + ticketing (migration 0061) ──
export type PubTier = {
  id: string; name: [string, string]; price: number;
  capacity: number | null; sold: number; remaining: number | null;
  salesStart: string | null; salesEnd: string | null;
};
export type PubEvent = {
  slug: string; title: [string, string]; venue: [string, string];
  cat: string; city: string; startsAt: string; endsAt: string | null;
  timeLabel: [string, string]; priceLabel: string | null;
  desc: [string, string]; tile: [string, string]; coverUrl: string | null;
  status: string; going: number; lat: number | null; lng: number | null;
  organizer: string; organizerSlug: string | null; tiers: PubTier[];
};

/** A single event + its live ticket tiers by slug (migration 0061). null offline / not found. */
export async function fetchEventBySlug(slug: string): Promise<PubEvent | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('event_by_slug', { in_slug: slug });
  if (error || !Array.isArray(data) || data.length === 0) return null;
  const r = data[0] as Record<string, unknown>;
  const tiersRaw = Array.isArray(r.tiers) ? (r.tiers as Record<string, unknown>[]) : [];
  return {
    slug: String(r.slug),
    title: [String(r.title_es), String(r.title_en ?? r.title_es)],
    venue: [String(r.venue_es), String(r.venue_en ?? r.venue_es)],
    cat: String(r.cat ?? ''), city: String(r.city ?? ''),
    startsAt: String(r.starts_at), endsAt: r.ends_at != null ? String(r.ends_at) : null,
    timeLabel: [String(r.time_label_es ?? ''), String(r.time_label_en ?? '')],
    priceLabel: r.price_label != null ? String(r.price_label) : null,
    desc: [String(r.desc_es ?? ''), String(r.desc_en ?? r.desc_es ?? '')],
    tile: [String(r.tile_a ?? '#EFEBFF'), String(r.tile_b ?? '#E5DEF9')],
    coverUrl: r.cover_url != null ? String(r.cover_url) : null,
    status: String(r.status ?? 'published'), going: Number(r.going_count ?? 0),
    lat: r.lat != null ? Number(r.lat) : null, lng: r.lng != null ? Number(r.lng) : null,
    organizer: String(r.organizer ?? 'Organizador'),
    organizerSlug: r.organizer_slug != null ? String(r.organizer_slug) : null,
    tiers: tiersRaw.map((t) => ({
      id: String(t.id), name: [String(t.name_es), String(t.name_en ?? t.name_es)],
      price: Number(t.price ?? 0),
      capacity: t.capacity != null ? Number(t.capacity) : null,
      sold: Number(t.sold ?? 0),
      remaining: t.remaining != null ? Number(t.remaining) : null,
      salesStart: t.sales_start != null ? String(t.sales_start) : null,
      salesEnd: t.sales_end != null ? String(t.sales_end) : null,
    })),
  };
}

/** Buy tickets for one tier — capacity-checked, atomic (migration 0061). Returns the
 *  ticket code, or throws with a reason (sold out / sales closed / not found). */
export async function buyEventTickets(slug: string, tierId: string, qty: number): Promise<{ code: string }> {
  if (!supabase) throw new Error('offline');
  const { data, error } = await supabase.rpc('buy_event_tickets', { in_slug: slug, in_tier_id: tierId, in_qty: qty });
  if (error) throw new Error(error.message || 'error');
  if (!Array.isArray(data) || data.length === 0) throw new Error('error');
  return { code: String((data[0] as Record<string, unknown>).code) };
}

/** Map an `events_near` / `search_events` row → the app's EventItem shape (both
 *  RPCs return the same 15 columns). Shared by the geo provider, the by-slug deep
 *  link, and server search so all three stay identical. */
export function mapEventRow(r: Record<string, unknown>, i: number): EventItem {
  const d = new Date(String(r.starts_at));
  return {
    id: i,
    slug: r.slug != null ? String(r.slug) : undefined,
    iso: String(r.starts_at),
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
}

/** Build a card-level EventItem from a rich PubEvent — used by the /eventos?e=<slug>
 *  deep link to render the detail overlay for an event that isn't in the geo list.
 *  id=-1 marks it as detail-only (never an index into EVENTS). */
export function eventItemFromPub(p: PubEvent): EventItem {
  const d = new Date(p.startsAt);
  return {
    id: -1, slug: p.slug, iso: p.startsAt,
    dEs: MONTHS_ES[d.getMonth()], day: String(d.getDate()).padStart(2, '0'),
    cat: p.cat, tEs: p.title[0], tEn: p.title[1], lEs: p.venue[0], lEn: p.venue[1],
    going: p.going, free: p.priceLabel == null, price: p.priceLabel ?? undefined,
    t: p.tile, timeEs: p.timeLabel[0], timeEn: p.timeLabel[1], descEs: p.desc[0], descEn: p.desc[1],
  };
}

/** A ticket issued by buy_event_tickets_multi (migration 0064). */
export type BoughtTicket = { ticketId: string; code: string; tierId: string };

/** Buy an ATOMIC multi-tier order (migration 0064): locks every requested tier,
 *  validates all capacities/windows, issues all tickets or none. Throws with a
 *  reason naming the sold-out/closed tier (e.g. "sold out: VIP"). */
export async function buyEventTicketsMulti(slug: string, items: { tierId: string; qty: number }[], promo?: string): Promise<BoughtTicket[]> {
  if (!supabase) throw new Error('offline');
  const { data, error } = await supabase.rpc('buy_event_tickets_multi', {
    in_slug: slug, in_items: items.map((i) => ({ tier_id: i.tierId, qty: i.qty })), in_promo: promo ?? null,
  });
  if (error) throw new Error(error.message || 'error');
  if (!Array.isArray(data)) throw new Error('error');
  return (data as Record<string, unknown>[]).map((r) => ({
    ticketId: String(r.ticket_id), code: String(r.code), tierId: String(r.tier_id),
  }));
}

/** Result of validating a promo code (migration 0065). Access codes unlock a hidden
 *  tier (fully real now); percent/amount discounts adjust the snapshotted total only
 *  (charging lands with payments). */
export type PromoResult =
  | { ok: true; kind: 'access'; tierId: string; tier: PubTier; msg: string }
  | { ok: true; kind: 'percent' | 'amount'; value: number; tierId: string | null; msg: string }
  | { ok: false; msg: string };

export async function validatePromo(slug: string, code: string): Promise<PromoResult> {
  if (!supabase) return { ok: false, msg: 'offline' };
  const { data, error } = await supabase.rpc('validate_promo', { in_slug: slug, in_code: code });
  if (error || !Array.isArray(data) || data.length === 0) return { ok: false, msg: 'error' };
  const r = data[0] as Record<string, unknown>;
  if (!r.ok) return { ok: false, msg: String(r.msg ?? 'Código no válido') };
  const kind = String(r.kind);
  if (kind === 'access') {
    const t = (r.tier ?? {}) as Record<string, unknown>;
    const tier: PubTier = {
      id: String(t.id), name: [String(t.name_es), String(t.name_en ?? t.name_es)], price: Number(t.price ?? 0),
      capacity: t.capacity != null ? Number(t.capacity) : null, sold: Number(t.sold ?? 0),
      remaining: t.remaining != null ? Number(t.remaining) : null,
      salesStart: t.sales_start != null ? String(t.sales_start) : null, salesEnd: t.sales_end != null ? String(t.sales_end) : null,
    };
    return { ok: true, kind: 'access', tierId: String(r.tier_id), tier, msg: String(r.msg ?? '') };
  }
  return { ok: true, kind: kind === 'amount' ? 'amount' : 'percent', value: Number(r.value ?? 0), tierId: r.tier_id != null ? String(r.tier_id) : null, msg: String(r.msg ?? '') };
}

/** The organizer's OTHER upcoming events by an anchor event slug (migration 0065).
 *  Same 15 columns as events_near → reuses mapEventRow. [] offline / error. */
export async function fetchEventsByOwner(slug: string): Promise<EventItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('events_by_owner', { in_slug: slug, max_results: 12 });
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r, i) => mapEventRow(r, i));
}

/** Server-side event search (migration 0064): Postgres full-text + trigram fuzzy,
 *  published + upcoming only, geo-scoped, category/free filters pushed into SQL,
 *  ranked by relevance then soonest, paginated. Returns [] offline / on error so
 *  the caller falls back to the client geo list. */
export async function searchEvents(opts: {
  q?: string; lat?: number | null; lng?: number | null;
  cat?: string | null; free?: boolean | null; limit?: number; offset?: number;
}): Promise<EventItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('search_events', {
    in_q: opts.q ?? null, user_lat: opts.lat ?? null, user_lng: opts.lng ?? null,
    radius_m: RADIUS_M, in_cat: opts.cat ?? null, in_free: opts.free ?? null,
    max_results: opts.limit ?? 30, in_offset: opts.offset ?? 0,
  });
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r, i) => mapEventRow(r, i));
}

/** Server-side business search (migration 0055): Postgres full-text + trigram
 *  fuzzy, geo-scoped, filtered + ranked by relevance then distance. Returns []
 *  offline / on error so the caller falls back to the client geo list. */
export async function searchBusinesses(opts: {
  q?: string; lat?: number | null; lng?: number | null; city?: string | null;
  cat?: string | null; price?: string | null; minRating?: number | null;
  limit?: number; offset?: number;
}): Promise<Business[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('search_businesses', {
    in_q: opts.q ?? null,
    user_lat: opts.lat ?? null, user_lng: opts.lng ?? null, in_city: opts.city ?? null,
    in_cat: opts.cat && opts.cat !== 'all' ? opts.cat : null,
    in_price: opts.price ?? null, in_min_rating: opts.minRating ?? null,
    max_results: opts.limit ?? 40, in_offset: opts.offset ?? 0,
  });
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[])
    .filter((r) => isCatKey(String(r.category_id)))
    .map((r, i) => mapBusinessRow(r, i, (r.distance_m as number | null) ?? null));
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
        next.events = (ev.data as Record<string, unknown>[]).map((r, i) => mapEventRow(r, i));
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
