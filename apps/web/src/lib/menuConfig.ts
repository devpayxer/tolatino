'use client';

// Menu structure for the Food module (business dashboard): categories, reusable
// modifier groups, dayparts (time windows), promotions and stock automation.
// Stored as ONE jsonb blob in `businesses.menu_config` (migration 0045) — always
// read/written as a unit by the owner's dashboard, so a single column beats four
// tables here (and stays portable / schema-cache-proof). The public listing
// reads it via `business_menu_by_slug` to group the real menu + build option
// pickers. Menu ITEMS themselves live in `business_items` (kind='menu', 0021).

export type MenuCategory = {
  id: string; // stable slug — items reference it via business_items.section
  es: string;
  en: string;
  icon: string; // key into the module's icon map (croissant/pizza/…)
  tile: string; // striped-gradient stops (design-system placeholder imagery)
  schedEs?: string; // optional display label, e.g. "Mañana · 7–11"
  schedEn?: string;
  visible: boolean;
};

export type ModOption = { es: string; en?: string; price: number };
export type ModGroup = {
  id: string;
  es: string;
  en: string;
  single: boolean; // true = choose one, false = choose multiple
  required: boolean;
  options: ModOption[];
};

export type Daypart = {
  id: string;
  es: string;
  en: string;
  start: number; // hour of day, 24h (7 = 7:00 AM); halves allowed (16.5)
  end: number;
  days: number[]; // 7 flags, Monday-first (matches the module's L M X J V S D)
  color: string;
  bg: string;
  on: boolean;
};

export type PromoType = 'percent' | 'combo' | 'bogo' | 'happy';
export type PromoStatus = 'active' | 'paused' | 'scheduled';
export type Promo = {
  id: string;
  type: PromoType;
  es: string; // name
  en: string;
  descEs: string;
  descEn: string;
  value?: number; // percent-off % or combo price $
  timeStart?: number; // happy hour window (hour of day)
  timeEnd?: number;
  days?: number[]; // 7 flags Monday-first; undefined = every day
  status: PromoStatus;
  startDate?: string; // 'YYYY-MM-DD' when scheduled
  // A `percent` promo with a `code` is REDEEMABLE at checkout: the customer types
  // the code in the cart and the business gives that % off (the business absorbs
  // it — To'Latino never funds a promo). `minOrder` gates it by subtotal.
  code?: string;
  minOrder?: number;
};

export type MenuAutomation = { auto86: boolean; notifyLow: boolean; resetDaily: boolean; backorders: boolean };

export type MenuConfig = {
  categories: MenuCategory[];
  mods: ModGroup[];
  dayparts: Daypart[];
  promos: Promo[];
  tags: string[]; // reusable custom tags the owner created (beyond the built-ins)
  automation: MenuAutomation;
  // Menu mode: false = display-only (show dishes + prices, no online orders —
  // the common case for a small restaurant); true = accept online orders (adds
  // the +/Pedir buttons + cart on the public listing).
  ordering: boolean;
};

export const menuId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : `m${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

// Striped-tile palette (category imagery placeholders, from the app's tiles).
export const MENU_TILES: string[] = [
  '#F3E2CE 0 8px,#ECD3B4 8px 16px', // tan / bread
  '#FBEFD3 0 8px,#F5E1B0 8px 16px', // amber / pastry
  '#FCE3DC 0 8px,#F6CEC2 8px 16px', // peach / pizza
  '#E3F5EA 0 8px,#D6E7D0 8px 16px', // green / salads
  '#EDE0D4 0 8px,#DFCBB6 8px 16px', // coffee
  '#F3D9E2 0 8px,#E8BFCD 8px 16px', // rose / wine
  '#EFEBFF 0 8px,#E5DEF9 8px 16px', // lilac
  '#E4ECFB 0 8px,#D7E3F6 8px 16px', // blue
];

// Daypart color pairs (dot + soft bg).
export const DAYPART_COLORS: { color: string; bg: string }[] = [
  { color: '#F59E0B', bg: '#FEF3C7' },
  { color: '#22C55E', bg: '#DCFCE7' },
  { color: '#7B61FF', bg: '#EFEBFF' },
  { color: '#D6336C', bg: '#FDE7EF' },
  { color: '#2F6FED', bg: '#E5EFFB' },
  { color: '#0D9488', bg: '#CCFBF1' },
];

const EVERY_DAY = [1, 1, 1, 1, 1, 1, 1];

// The 7 standard categories. IDs are frozen — existing real menu items already
// store these in business_items.section, so a fresh config must keep matching.
export const DEFAULT_CATEGORIES: MenuCategory[] = [
  { id: 'bread', es: 'Pan y panes', en: 'Bread & loaves', icon: 'croissant', tile: MENU_TILES[0], visible: true },
  { id: 'pastry', es: 'Pan dulce', en: 'Pastries', icon: 'cake', tile: MENU_TILES[1], visible: true },
  { id: 'pizza', es: 'Pizza', en: 'Pizza', icon: 'pizza', tile: MENU_TILES[2], visible: true },
  { id: 'pasta', es: 'Pasta', en: 'Pasta', icon: 'utensils', tile: MENU_TILES[2], visible: true },
  { id: 'salad', es: 'Ensaladas', en: 'Salads', icon: 'salad', tile: MENU_TILES[3], visible: true },
  { id: 'drinks', es: 'Café y té', en: 'Coffee & tea', icon: 'coffee', tile: MENU_TILES[4], visible: true },
  { id: 'wine', es: 'Vino y cócteles', en: 'Wine & cocktails', icon: 'wine', tile: MENU_TILES[5], visible: true },
];

export const DEFAULT_AUTOMATION: MenuAutomation = { auto86: true, notifyLow: true, resetDaily: true, backorders: false };

/** Starting config for a REAL business (standard categories, build the rest).
 *  Display-only by default — the owner opts into online ordering. */
export const defaultMenuConfig = (): MenuConfig => ({
  categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
  mods: [],
  dayparts: [],
  promos: [],
  tags: [],
  automation: { ...DEFAULT_AUTOMATION },
  ordering: false,
});

/** Rich sample config for DEMO mode (mirrors the module's original showcase). */
export const demoMenuConfig = (): MenuConfig => ({
  categories: [
    ...DEFAULT_CATEGORIES.map((c) => ({ ...c, schedEs: schedFor(c.id).es, schedEn: schedFor(c.id).en })),
    { id: 'kids', es: 'Menú infantil', en: 'Kids menu', icon: 'icecream', tile: MENU_TILES[1], schedEs: 'Todo el día', schedEn: 'All day', visible: false },
  ],
  mods: [
    { id: 'size', es: 'Tamaño', en: 'Size', single: true, required: true, options: [{ es: 'Personal 8"', price: 0 }, { es: 'Estándar 12"', price: 0 }, { es: 'Grande 16"', price: 6 }] },
    { id: 'toppings', es: 'Extras', en: 'Add-ons', single: false, required: false, options: [{ es: 'Anchoa', en: 'Anchovy', price: 2 }, { es: 'Burrata', price: 4 }, { es: 'Trufa', en: 'Truffle', price: 8 }] },
    { id: 'crust', es: 'Masa', en: 'Crust', single: true, required: true, options: [{ es: 'Original', price: 0 }, { es: 'Sin gluten', en: 'Gluten-free', price: 3 }, { es: 'Masa madre', en: 'Sourdough', price: 0 }] },
    { id: 'milk', es: 'Tipo de leche', en: 'Milk choice', single: true, required: false, options: [{ es: 'Entera', en: 'Whole', price: 0 }, { es: 'Avena', en: 'Oat', price: 0.75 }, { es: 'Almendra', en: 'Almond', price: 0.75 }] },
    { id: 'winepair', es: 'Maridaje de vino', en: 'Wine pairing', single: true, required: false, options: [{ es: 'Sin maridaje', en: 'No pairing', price: 0 }, { es: 'Estándar', en: 'Standard', price: 60 }, { es: 'Reserva', en: 'Reserve', price: 120 }] },
  ],
  dayparts: [
    { id: 'dp1', es: 'Mañana · Pan dulce y café', en: 'Morning · Pastries & coffee', start: 7, end: 11, days: [...EVERY_DAY], color: DAYPART_COLORS[0].color, bg: DAYPART_COLORS[0].bg, on: true },
    { id: 'dp2', es: 'Comida', en: 'Lunch', start: 11, end: 14, days: [...EVERY_DAY], color: DAYPART_COLORS[1].color, bg: DAYPART_COLORS[1].bg, on: true },
    { id: 'dp3', es: 'Cena · Pizza y pasta', en: 'Dinner · Pizza & pasta', start: 17, end: 22, days: [0, 1, 1, 1, 1, 1, 1], color: DAYPART_COLORS[2].color, bg: DAYPART_COLORS[2].bg, on: true },
    { id: 'dp4', es: 'Vino y cócteles', en: 'Wine & cocktails', start: 16, end: 22, days: [...EVERY_DAY], color: DAYPART_COLORS[3].color, bg: DAYPART_COLORS[3].bg, on: true },
  ],
  promos: [
    { id: 'pr1', type: 'percent', es: 'Domingos de masa madre', en: 'Sourdough Sundays', descEs: '20% en todos los panes los domingos', descEn: '20% off all loaves on Sundays', value: 20, days: [0, 0, 0, 0, 0, 0, 1], status: 'active' },
    { id: 'pr2', type: 'happy', es: 'Happy hour de vino', en: 'Happy hour wine', descEs: 'Copas de la casa a $8, 4–6 PM', descEn: '$8 house wine, 4–6 PM', timeStart: 16, timeEnd: 18, status: 'active' },
    { id: 'pr3', type: 'bogo', es: 'Compra pizza, llévate tiramisú', en: 'Buy a pizza, get a tiramisù', descEs: 'Tiramisú gratis con cualquier pizza', descEn: 'Free tiramisù with any pizza', status: 'scheduled', startDate: '2026-08-01' },
  ],
  tags: ['Casero', 'De temporada'],
  automation: { ...DEFAULT_AUTOMATION },
  ordering: true, // demo showcases the full online-ordering flow
});

function schedFor(id: string): { es: string; en: string } {
  switch (id) {
    case 'pastry': return { es: 'Mañana · 7–11', en: 'Morning · 7–11' };
    case 'pizza': case 'pasta': return { es: 'Cena · 5–10', en: 'Dinner · 5–10' };
    case 'salad': return { es: 'Comida y cena', en: 'Lunch & dinner' };
    case 'wine': return { es: 'Desde 4 PM', en: 'From 4 PM' };
    default: return { es: 'Todo el día', en: 'All day' };
  }
}

/** Coerce whatever is stored in the jsonb column into a usable config. */
export function normalizeMenuConfig(raw: unknown): MenuConfig {
  const base = defaultMenuConfig();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<MenuConfig>;
  return {
    categories: Array.isArray(r.categories) && r.categories.length ? r.categories : base.categories,
    mods: Array.isArray(r.mods) ? r.mods : [],
    dayparts: Array.isArray(r.dayparts) ? r.dayparts : [],
    promos: Array.isArray(r.promos) ? r.promos : [],
    tags: Array.isArray(r.tags) ? r.tags : [],
    automation: { ...DEFAULT_AUTOMATION, ...(r.automation ?? {}) },
    ordering: r.ordering === true, // default display-only
  };
}

/** Hour-of-day (24h, halves ok) → "4:30 PM" style label. */
export function hourLabel(h: number): string {
  const hh = Math.floor(h) % 24;
  const mm = Math.round((h - Math.floor(h)) * 60);
  const ap = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 || 12;
  return mm ? `${h12}:${String(mm).padStart(2, '0')} ${ap}` : `${h12} ${ap}`;
}
