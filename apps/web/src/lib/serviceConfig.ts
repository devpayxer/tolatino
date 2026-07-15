'use client';
import type { Promo } from '@/lib/menuConfig';

// Service structure for the Servicios module (business dashboard): categories +
// reusable add-ons + booking mode. Stored as ONE jsonb blob in
// `businesses.service_config` (migration 0046) — always read/written as a unit by
// the owner's dashboard. The public listing reads it via `business_services_by_slug`
// to group services + build the add-on picker in the booking sheet. Service ITEMS
// live in `business_items` (kind='service', migration 0021). Mirrors menuConfig.

export type ServiceCategory = {
  id: string; // stable slug — services reference it via business_items.section
  es: string;
  en: string;
  icon: string; // key into the module's icon map
  tile: string; // striped-gradient stops (placeholder imagery)
  visible: boolean;
};

// A reusable add-on/extra a customer can add to a service (e.g. "Lavado +$5",
// "Diseño de barba +$8"). Services attach add-ons by id.
export type ServiceAddon = {
  id: string;
  es: string;
  en?: string;
  price: number; // extra charge; 0 = free add-on
};

// A bookable professional (barber, stylist, technician…) the customer can pick in
// the booking sheet — Booksy/Fresha's core interaction. Public data only (name +
// specialty + look); the private team roster (emails, roles) stays in the Staff
// module (business_staff). serviceIds empty/absent = performs ALL services.
export type SvcProvider = {
  id: string;
  name: string;
  tagEs: string; // specialty line, e.g. "Fades y degradados"
  tagEn?: string;
  color: string; // avatar circle color (from PROVIDER_COLORS)
  photo?: string; // optional storage URL — overrides the initials avatar
  serviceIds?: string[]; // business_items ids this pro performs (empty = all)
  active: boolean; // inactive = hidden from the public picker, kept in history
};

export type ServiceConfig = {
  categories: ServiceCategory[];
  addons: ServiceAddon[];
  tags: string[]; // reusable custom tags the owner created (beyond the built-ins)
  // Mode: false = display-only (show services + prices, no online booking — for a
  // business that just wants to showcase); true = accept online bookings (the
  // Reservar flow + deposits).
  booking: boolean;
  // Approval mode (Booksy "Instant book" vs "Request to book"). true = a new
  // customer booking is CONFIRMED immediately; false = it arrives 'pending' and
  // the owner approves/declines in the agenda. Default false (manual). Enforced
  // server-side (migration 0095) — the client can never self-confirm. Applies to
  // pay-at-establishment bookings; paid-online bookings are always confirmed.
  autoConfirm: boolean;
  // Promotions the owner manages from the Promociones hub. A `percent` promo with a
  // `code` is redeemable at booking checkout (business-absorbed). Reuses menu Promo.
  promos: Promo[];
  // The bookable team ("Elige tu profesional"). Empty = the business books by
  // capacity only (car washes, venues) — no staff step in the consumer sheet.
  providers: SvcProvider[];
};

export const svcId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : `s${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

// Striped-tile palette for category imagery placeholders.
export const SERVICE_TILES: string[] = [
  '#EFE3D0 0 8px,#E2CFB2 8px 16px', // tan
  '#F3D9E2 0 8px,#E8BFCD 8px 16px', // rose
  '#E3F5EA 0 8px,#D6E7D0 8px 16px', // green
  '#FCE3DC 0 8px,#F6CEC2 8px 16px', // peach
  '#E4ECFB 0 8px,#D7E3F6 8px 16px', // blue
  '#EFEBFF 0 8px,#E5DEF9 8px 16px', // lilac
  '#FBEFD3 0 8px,#F5E1B0 8px 16px', // amber
  '#EDE0D4 0 8px,#DFCBB6 8px 16px', // coffee
];

// Avatar palette for professionals without a photo (initials on a colored circle).
export const PROVIDER_COLORS: string[] = ['#7B61FF', '#E0568F', '#2F6FED', '#1F9D57', '#D6A22A', '#6D4DF6', '#E8954A', '#26252B'];

// Generic default categories (services vary by trade; the owner renames/adds).
export const DEFAULT_SERVICE_CATEGORIES: ServiceCategory[] = [
  { id: 'general', es: 'Servicios', en: 'Services', icon: 'sparkles', tile: SERVICE_TILES[0], visible: true },
];

/** Starting config for a REAL business — display-only by default (opt into
 *  online bookings), one generic category to rename. */
export const defaultServiceConfig = (): ServiceConfig => ({
  categories: DEFAULT_SERVICE_CATEGORIES.map((c) => ({ ...c })),
  addons: [],
  tags: [],
  booking: false,
  autoConfirm: false,
  promos: [],
  providers: [],
});

/** Rich sample config for DEMO mode — restaurant-style bookable services. */
export const demoServiceConfig = (): ServiceConfig => ({
  categories: [
    { id: 'tastings', es: 'Degustaciones', en: 'Tastings', icon: 'wine', tile: SERVICE_TILES[1], visible: true },
    { id: 'classes', es: 'Clases y talleres', en: 'Classes & workshops', icon: 'grad', tile: SERVICE_TILES[0], visible: true },
    { id: 'private', es: 'Eventos privados', en: 'Private events', icon: 'gift', tile: SERVICE_TILES[2], visible: true },
    { id: 'catering', es: 'Catering', en: 'Catering', icon: 'utensils', tile: SERVICE_TILES[3], visible: true },
  ],
  addons: [
    { id: 'wine', es: 'Maridaje de vino', en: 'Wine pairing', price: 60 },
    { id: 'starter', es: 'Masa madre para llevar', en: 'Starter to take home', price: 0 },
    { id: 'photos', es: 'Fotografía del evento', en: 'Event photography', price: 120 },
    { id: 'setup', es: 'Montaje en sitio', en: 'On-site setup', price: 45 },
  ],
  tags: ['A domicilio', 'Bilingüe'],
  booking: true,
  autoConfirm: false,
  promos: [],
  providers: [
    { id: 'chef-r', name: 'Chef Rosa', tagEs: 'Cocina dominicana', tagEn: 'Dominican cuisine', color: PROVIDER_COLORS[1], active: true },
    { id: 'chef-m', name: 'Miguel', tagEs: 'Panadería y masa madre', tagEn: 'Bakery & sourdough', color: PROVIDER_COLORS[2], active: true },
  ],
});

/** Coerce whatever is stored in the jsonb column into a usable config. */
export function normalizeServiceConfig(raw: unknown): ServiceConfig {
  const base = defaultServiceConfig();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<ServiceConfig>;
  return {
    categories: Array.isArray(r.categories) && r.categories.length ? r.categories : base.categories,
    addons: Array.isArray(r.addons) ? r.addons : [],
    tags: Array.isArray(r.tags) ? r.tags : [],
    booking: r.booking === true, // default display-only
    autoConfirm: r.autoConfirm === true, // default manual approval
    promos: Array.isArray(r.promos) ? r.promos : [],
    providers: Array.isArray(r.providers) ? r.providers.filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string') : [],
  };
}
