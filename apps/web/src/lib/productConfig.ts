'use client';

// Product structure for the Productos module (business dashboard): categories,
// reusable option sets (variant axes), curated collections, discounts, stock
// automation and the sell/showcase mode. Stored as ONE jsonb blob in
// `businesses.product_config` (migration 0048) — always read/written as a unit by
// the owner's dashboard. The public listing reads it via `business_products_by_slug`
// to group the real shop + build option pickers. Product ITEMS live in
// `business_items` (kind='product', migration 0021). Mirrors menuConfig.

export type ProductCategory = {
  id: string; // stable slug — products reference it via business_items.section
  es: string;
  en: string;
  icon: string; // key into the module's icon map
  tile: string; // striped-gradient stops (design-system placeholder imagery)
  visible: boolean;
};

// One value of an option set; price is the DELTA added to the base price.
export type OptionValue = { es: string; en?: string; price: number };
// A reusable option set / variant axis (e.g. "Talla" S·M·L, "Color", "Molienda").
// Products attach option sets by id; their cartesian product = sellable variants.
export type OptionSet = {
  id: string;
  es: string;
  en: string;
  single: boolean; // true = pick one (a real variant axis); false = multi add-ons
  values: OptionValue[];
};

// A curated collection — a named group of products, optionally featured on the
// public listing (shown as a promo strip). Members are business_items db ids.
export type Collection = {
  id: string;
  es: string;
  en: string;
  descEs?: string;
  descEn?: string;
  tile: string;
  productIds: string[];
  featured: boolean;
};

export type DiscountType = 'percent' | 'amount' | 'shipping' | 'bogo';
export type DiscountStatus = 'active' | 'paused' | 'scheduled';
export type Discount = {
  id: string;
  code: string;
  type: DiscountType;
  value?: number; // percent-off % or $ amount
  descEs: string;
  descEn: string;
  auto: boolean; // applied automatically (no code needed)
  minOrder?: number;
  status: DiscountStatus;
  startDate?: string; // 'YYYY-MM-DD' when scheduled
};

export type ProductAutomation = { trackStock: boolean; notifyLow: boolean; hideOutOfStock: boolean; backorders: boolean };

export type ProductConfig = {
  categories: ProductCategory[];
  optionSets: OptionSet[];
  collections: Collection[];
  discounts: Discount[];
  tags: string[]; // reusable custom badges the owner created (beyond the built-ins)
  automation: ProductAutomation;
  // Shop mode: false = display-only (show products + prices, no checkout — a
  // showcase for a business that just lists what it sells); true = sell online
  // (adds the +/cart buttons on the public listing).
  selling: boolean;
};

export const prodId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : `p${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

// Striped-tile palette for category / collection imagery placeholders.
export const PRODUCT_TILES: string[] = [
  '#F3D9C8 0 8px,#E8C3AC 8px 16px', // clay / pantry
  '#EAE2F8 0 8px,#DCCEF2 8px 16px', // lilac / merch
  '#F3E2CE 0 8px,#ECD3B4 8px 16px', // tan / baking
  '#EDE0D4 0 8px,#DFCBB6 8px 16px', // coffee
  '#E4ECFB 0 8px,#D7E3F6 8px 16px', // blue / books
  '#F3D9E2 0 8px,#E8BFCD 8px 16px', // rose
  '#E3F5EA 0 8px,#D6E7D0 8px 16px', // green
  '#FBEFD3 0 8px,#F5E1B0 8px 16px', // amber
];

// Default categories. IDs are FROZEN — existing product items already store these
// in business_items.section, so a fresh config must keep matching them.
export const DEFAULT_PRODUCT_CATEGORIES: ProductCategory[] = [
  { id: 'pantry', es: 'Despensa', en: 'Pantry', icon: 'package', tile: PRODUCT_TILES[0], visible: true },
  { id: 'merch', es: 'Mercancía', en: 'Merch', icon: 'shirt', tile: PRODUCT_TILES[1], visible: true },
  { id: 'baking', es: 'Repostería', en: 'Baking', icon: 'cookie', tile: PRODUCT_TILES[2], visible: true },
  { id: 'coffee', es: 'Café', en: 'Coffee', icon: 'coffee', tile: PRODUCT_TILES[3], visible: true },
  { id: 'books', es: 'Libros', en: 'Books', icon: 'book', tile: PRODUCT_TILES[4], visible: true },
];

export const DEFAULT_PRODUCT_AUTOMATION: ProductAutomation = { trackStock: true, notifyLow: true, hideOutOfStock: true, backorders: false };

/** Starting config for a REAL business — display-only by default (opt into
 *  online selling), the standard retail categories to rename. */
export const defaultProductConfig = (): ProductConfig => ({
  categories: DEFAULT_PRODUCT_CATEGORIES.map((c) => ({ ...c })),
  optionSets: [],
  collections: [],
  discounts: [],
  tags: [],
  automation: { ...DEFAULT_PRODUCT_AUTOMATION },
  selling: false,
});

/** Rich sample config for DEMO mode (mirrors the module's original showcase). */
export const demoProductConfig = (): ProductConfig => ({
  categories: DEFAULT_PRODUCT_CATEGORIES.map((c) => ({ ...c })),
  optionSets: [
    { id: 'size', es: 'Tamaño', en: 'Size', single: true, values: [{ es: '12 oz', price: 0 }, { es: '2 lb', price: 27 }] },
    { id: 'grind', es: 'Molienda', en: 'Grind', single: true, values: [{ es: 'Grano entero', en: 'Whole bean', price: 0 }, { es: 'Espresso', price: 0 }, { es: 'Filtro', en: 'Filter', price: 0 }] },
    { id: 'tee', es: 'Talla', en: 'Shirt size', single: true, values: [{ es: 'S', price: 0 }, { es: 'M', price: 0 }, { es: 'L', price: 0 }, { es: 'XL', price: 2 }] },
    { id: 'gift', es: 'Envoltura de regalo', en: 'Gift wrap', single: false, values: [{ es: 'Papel kraft', en: 'Kraft paper', price: 3 }, { es: 'Tarjeta escrita', en: 'Handwritten card', price: 2 }] },
  ],
  collections: [
    { id: 'gifts', es: 'Sets de regalo', en: 'Gift sets', descEs: 'Paquetes curados de temporada', descEn: 'Curated seasonal bundles', tile: PRODUCT_TILES[5], productIds: [], featured: true },
    { id: 'staples', es: 'Básicos de despensa', en: 'Pantry staples', descEs: 'Mermeladas, aceites, miel, sal', descEn: 'Jams, oils, honey, salt', tile: PRODUCT_TILES[0], productIds: [], featured: true },
    { id: 'bakingkit', es: 'Kit de repostería', en: 'Home baking kit', descEs: 'Masa madre, canasta, harina', descEn: 'Starter, banneton, flour', tile: PRODUCT_TILES[2], productIds: [], featured: false },
  ],
  discounts: [
    { id: 'welcome', code: 'WELCOME15', type: 'percent', value: 15, descEs: 'Primer pedido', descEn: 'First order', auto: false, status: 'active' },
    { id: 'freeship', code: 'FREESHIP75', type: 'shipping', descEs: 'Pedidos sobre $75', descEn: 'Orders over $75', auto: true, minOrder: 75, status: 'active' },
    { id: 'gift10', code: 'GIFT10', type: 'amount', value: 10, descEs: 'Sets de regalo · fiestas', descEn: 'Gift sets · holiday', auto: false, status: 'active' },
    { id: 'summer', code: 'SUMMER', type: 'percent', value: 10, descEs: 'Terminó 30 sep', descEn: 'Ended Sep 30', auto: false, status: 'paused' },
  ],
  tags: ['Hecho a mano', 'Orgánico'],
  automation: { ...DEFAULT_PRODUCT_AUTOMATION },
  selling: true, // demo showcases the full online-selling flow
});

/** Coerce whatever is stored in the jsonb column into a usable config. */
export function normalizeProductConfig(raw: unknown): ProductConfig {
  const base = defaultProductConfig();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<ProductConfig>;
  return {
    categories: Array.isArray(r.categories) && r.categories.length ? r.categories : base.categories,
    optionSets: Array.isArray(r.optionSets) ? r.optionSets : [],
    collections: Array.isArray(r.collections) ? r.collections : [],
    discounts: Array.isArray(r.discounts) ? r.discounts : [],
    tags: Array.isArray(r.tags) ? r.tags : [],
    automation: { ...DEFAULT_PRODUCT_AUTOMATION, ...(r.automation ?? {}) },
    selling: r.selling === true, // default display-only
  };
}

/** Number of sellable variants a set of option-set ids produces (cartesian). */
export function variantCount(setIds: string[], sets: OptionSet[]): number {
  const chosen = setIds.map((id) => sets.find((s) => s.id === id)).filter((s): s is OptionSet => !!s && s.single);
  if (!chosen.length) return 0;
  return chosen.reduce((n, s) => n * Math.max(1, s.values.length), 1);
}

// One sellable variant: a stable key + a bilingual label + the per-axis selection.
export type VariantCombo = { key: string; labelEs: string; labelEn: string };

/**
 * Every sellable variant (cartesian over the product's SINGLE option sets, in the
 * given id order). The `key` is `setId:valueIndex|…` — the SAME string the consumer
 * builds from its selected options, so per-variant stock (attrs.variantStock[key])
 * lines up on both sides. Empty when the product has no single option set.
 */
export function variantCombos(setIds: string[], sets: OptionSet[]): VariantCombo[] {
  const chosen = setIds.map((id) => sets.find((s) => s.id === id)).filter((s): s is OptionSet => !!s && s.single && s.values.length > 0);
  if (!chosen.length) return [];
  let acc: { parts: string[]; es: string[]; en: string[] }[] = [{ parts: [], es: [], en: [] }];
  for (const s of chosen) {
    const next: typeof acc = [];
    s.values.forEach((v, i) => {
      for (const c of acc) next.push({ parts: [...c.parts, `${s.id}:${i}`], es: [...c.es, v.es], en: [...c.en, v.en ?? v.es] });
    });
    acc = next;
  }
  return acc.map((c) => ({ key: c.parts.join('|'), labelEs: c.es.join(' · '), labelEn: c.en.join(' · ') }));
}
