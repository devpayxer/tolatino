'use client';

// Rental structure for the Renta module (business dashboard): categories +
// reusable priced add-ons (delivery, setup, insurance…) + rental mode. Stored as
// ONE jsonb blob in `businesses.rental_config` (migration 0050) — always read/
// written as a unit by the owner's dashboard. The public listing reads it via
// `business_rentals_by_slug` to group rental items + build the extras picker in
// the Rentar sheet. Rental ITEMS live in `business_items` (kind='rental',
// migration 0021). Mirrors serviceConfig.

export type RentalCategory = {
  id: string; // stable slug — rental items reference it via business_items.section
  es: string;
  en: string;
  icon: string; // key into the module's icon map
  tile: string; // striped-gradient stops (placeholder imagery)
  visible: boolean;
};

// A reusable priced extra a renter can add (e.g. "Entrega a domicilio +$40",
// "Montaje en sitio +$25"). Rental items attach add-ons by id.
export type RentalAddon = {
  id: string;
  es: string;
  en?: string;
  price: number; // extra charge; 0 = free add-on
};

export type RentalConfig = {
  categories: RentalCategory[];
  addons: RentalAddon[];
  tags: string[]; // reusable custom tags the owner created (beyond the built-ins)
  // Mode: false = display-only (show items + rates, no online rentals — for a
  // business that just wants to showcase); true = accept online rentals (the
  // Rentar flow + deposits on the public listing).
  renting: boolean;
};

export const rentId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : `r${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

// Striped-tile palette for category imagery placeholders.
export const RENTAL_TILES: string[] = [
  '#EAE2F8 0 8px,#DCCEF2 8px 16px', // lilac
  '#F3E2CE 0 8px,#ECD3B4 8px 16px', // tan
  '#FBEFD3 0 8px,#F5E1B0 8px 16px', // amber
  '#EDE0D4 0 8px,#DFCBB6 8px 16px', // coffee
  '#E3F5EA 0 8px,#D6E7D0 8px 16px', // green
  '#FCE3DC 0 8px,#F6CEC2 8px 16px', // peach
  '#E4ECFB 0 8px,#D7E3F6 8px 16px', // blue
  '#F3D9E2 0 8px,#E8BFCD 8px 16px', // rose
];

// Generic default categories (rentals vary by business; the owner renames/adds).
export const DEFAULT_RENTAL_CATEGORIES: RentalCategory[] = [
  { id: 'general', es: 'Artículos', en: 'Items', icon: 'boxes', tile: RENTAL_TILES[0], visible: true },
];

/** Starting config for a REAL business — display-only by default (opt into
 *  online rentals), one generic category to rename. */
export const defaultRentalConfig = (): RentalConfig => ({
  categories: DEFAULT_RENTAL_CATEGORIES.map((c) => ({ ...c })),
  addons: [],
  tags: [],
  renting: false,
});

/** Rich sample config for DEMO mode — event/party-rental-style. */
export const demoRentalConfig = (): RentalConfig => ({
  categories: [
    { id: 'space', es: 'Espacio', en: 'Space', icon: 'home', tile: RENTAL_TILES[0], visible: true },
    { id: 'furniture', es: 'Mobiliario', en: 'Furniture', icon: 'armchair', tile: RENTAL_TILES[1], visible: true },
    { id: 'tableware', es: 'Vajilla', en: 'Tableware', icon: 'utensils', tile: RENTAL_TILES[2], visible: true },
    { id: 'equipo', es: 'Equipo', en: 'Equipment', icon: 'wrench', tile: RENTAL_TILES[3], visible: true },
  ],
  addons: [
    { id: 'delivery', es: 'Entrega a domicilio', en: 'Home delivery', price: 40 },
    { id: 'setup', es: 'Montaje en sitio', en: 'On-site setup', price: 25 },
    { id: 'pickup', es: 'Recolección', en: 'Pickup', price: 20 },
    { id: 'insurance', es: 'Seguro de daños', en: 'Damage insurance', price: 15 },
  ],
  tags: ['Más rentado', 'Para eventos'],
  renting: true,
});

/** Coerce whatever is stored in the jsonb column into a usable config. */
export function normalizeRentalConfig(raw: unknown): RentalConfig {
  const base = defaultRentalConfig();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<RentalConfig>;
  return {
    categories: Array.isArray(r.categories) && r.categories.length ? r.categories : base.categories,
    addons: Array.isArray(r.addons) ? r.addons : [],
    tags: Array.isArray(r.tags) ? r.tags : [],
    renting: r.renting === true, // default display-only
  };
}
