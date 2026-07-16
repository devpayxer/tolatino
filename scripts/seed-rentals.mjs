#!/usr/bin/env node
// seed-rentals.mjs — a real party-rental business ("Alquiler Fiesta Quisqueya",
// hz-alquiler-fiesta) so the Renta cart flow (0097) can be exercised end-to-end:
// renting on, MANUAL approval, pay-at-pickup (no Stripe), 3 categories × 12 items
// with day/week rates + refundable deposits + stock, and 3 order-level extras
// (entrega/montaje/recolección). Owned by the same test owner as El Sabor so the
// founder manages it from the panel. Idempotent. Run: node scripts/seed-rentals.mjs
import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SLUG = 'hz-alquiler-fiesta';
const esc = (s) => String(s).replace(/'/g, "''");

const TILES = {
  furniture: '#F3E2CE 0 8px,#ECD3B4 8px 16px',
  tableware: '#FBEFD3 0 8px,#F5E1B0 8px 16px',
  equipo: '#E3F5EA 0 8px,#D6E7D0 8px 16px',
};

const config = {
  categories: [
    { id: 'furniture', es: 'Mobiliario', en: 'Furniture', icon: 'armchair', tile: TILES.furniture, visible: true },
    { id: 'tableware', es: 'Vajilla y mantelería', en: 'Tableware & linens', icon: 'utensils', tile: TILES.tableware, visible: true },
    { id: 'equipo', es: 'Equipo y ambiente', en: 'Equipment & ambiance', icon: 'wrench', tile: TILES.equipo, visible: true },
  ],
  addons: [
    { id: 'entrega', es: 'Entrega a domicilio', en: 'Home delivery', price: 60 },
    { id: 'montaje', es: 'Montaje en sitio', en: 'On-site setup', price: 40 },
    { id: 'recoleccion', es: 'Recolección', en: 'Pickup service', price: 30 },
  ],
  policies: [
    { id: 'liability', es: 'Exención de responsabilidad', en: 'Liability waiver', subEs: 'Requerida al rentar', subEn: 'Required at rental', default: true },
    { id: 'deposit', es: 'Depósito reembolsable', en: 'Refundable deposit', subEs: 'Se devuelve al regresar', subEn: 'Returned on return', default: true },
    { id: 'latefee', es: 'Cargo por retraso', en: 'Late return fee', subEs: '$50/hora después', subEn: '$50/hour after', default: true },
  ],
  tags: ['Más rentado', 'Para eventos'],
  renting: true,
  autoConfirm: false,
  promos: [],
};

// [cat, es, en, descEs, descEn, dayRate, weekRate, deposit, stock, unitEs, unitEn, avail]
const ITEMS = [
  ['furniture', 'Mesa redonda (10 pers.)', 'Round table (seats 10)', 'Mesa redonda de 60" para banquete, ideal para 10 comensales.', '60" round banquet table, seats 10.', 9, 45, 15, 40, 'mesa', 'table', 'Siempre'],
  ['furniture', 'Mesa rectangular 8ft', 'Rectangular table 8ft', 'Mesa plegable de 8 pies para buffet o presídium.', '8ft folding table for buffet or head table.', 8, 40, 12, 50, 'mesa', 'table', 'Siempre'],
  ['furniture', 'Silla Tiffany', 'Tiffany chair', 'Silla Chiavari elegante, dorada o plateada, con cojín.', 'Elegant Chiavari chair, gold or silver, with cushion.', 3, 15, 5, 300, 'silla', 'chair', 'Siempre'],
  ['furniture', 'Silla plegable', 'Folding chair', 'Silla plegable resistente, blanca o negra.', 'Sturdy folding chair, white or black.', 1.5, 8, 3, 400, 'silla', 'chair', 'Siempre'],
  ['furniture', 'Barra portátil', 'Portable bar', 'Barra iluminada LED para bebidas, con estante trasero.', 'LED-lit drink bar with back shelf.', 75, 350, 120, 4, 'barra', 'bar', 'Siempre'],
  ['tableware', 'Mantel redondo', 'Round tablecloth', 'Mantel de poliéster premium, varios colores.', 'Premium polyester tablecloth, many colors.', 6, 30, 8, 120, 'mantel', 'linen', 'Siempre'],
  ['tableware', 'Vajilla completa (por persona)', 'Full place setting (per guest)', 'Plato base, plato hondo, cubiertos y copa por comensal.', 'Charger, bowl, flatware and glass per guest.', 1.5, 7, 3, 400, 'juego', 'set', 'Siempre'],
  ['tableware', 'Servilleta de tela', 'Cloth napkin', 'Servilleta de tela a juego con el mantel.', 'Cloth napkin matching the tablecloth.', 0.75, 4, 2, 500, 'servilleta', 'napkin', 'Siempre'],
  ['equipo', 'Carpa 10×20 ft', 'Tent 10×20 ft', 'Carpa blanca para 40 personas, con paredes opcionales.', 'White tent for 40 guests, optional walls.', 120, 550, 200, 5, 'carpa', 'tent', '48h aviso'],
  ['equipo', 'Bocina + micrófono', 'Speaker + microphone', 'Sistema de sonido portátil con micrófono inalámbrico.', 'Portable PA with wireless mic.', 90, 400, 150, 6, 'equipo', 'unit', 'Siempre'],
  ['equipo', 'Brincolín inflable', 'Bounce house', 'Castillo inflable con soplador — supervisión aparte.', 'Inflatable castle with blower — attendant separate.', 150, 700, 200, 3, 'inflable', 'unit', '48h aviso'],
  ['equipo', 'Pista de baile 12×12', 'Dance floor 12×12', 'Pista de baile modular de madera, 12×12 ft.', 'Modular wood dance floor, 12×12 ft.', 200, 900, 300, 2, 'pista', 'floor', '48h aviso'],
];

// copy location + city from an existing Hazleton business so it appears on the map
let sql = `-- seed-rentals generated ${new Date().toISOString()}
insert into public.businesses (slug, name, category_id, owner_id, tier, city, location, address,
  tile_a, tile_b,
  tagline_es, tagline_en, about_es, about_en, phone, is_open, connect_charges_enabled,
  price_level, timezone, hours_es, hours_en, specialty_es, specialty_en, modules, rental_config)
select '${SLUG}', 'Alquiler Fiesta Quisqueya', 'Party',
  (select owner_id from public.businesses where slug='hz-sabor-quisqueya'),
  'verified', b.city, b.location, '742 W Broad St',
  '#F7E6F4', '#EAD3E4',
  'Todo para tu fiesta — mesas, sillas, carpas y más', 'Everything for your party — tables, chairs, tents & more',
  'Renta de mobiliario y equipo para quinceañeras, bodas y eventos. Entrega y montaje disponibles. Depósito reembolsable al devolver.',
  'Furniture & equipment rentals for quinceañeras, weddings and events. Delivery & setup available. Refundable deposit on return.',
  '(570) 555-0142', true, false, '$$', 'America/New_York',
  'Lun–Sáb 8am–6pm · Dom con cita', 'Mon–Sat 8am–6pm · Sun by appointment',
  'Renta para eventos y fiestas', 'Event & party rentals',
  '{"rental": true, "updates": true}'::jsonb, '${esc(JSON.stringify(config))}'::jsonb
from public.businesses b where b.slug='hz-barberia-primera'
on conflict (slug) do update set
  owner_id = excluded.owner_id, category_id = excluded.category_id, tier = excluded.tier,
  tile_a = excluded.tile_a, tile_b = excluded.tile_b,
  connect_charges_enabled = false, is_open = true,
  modules = coalesce(public.businesses.modules, '{}'::jsonb) || '{"rental": true, "updates": true}'::jsonb,
  rental_config = excluded.rental_config;

delete from public.business_items where kind='rental' and business_id=(select id from public.businesses where slug='${SLUG}');
insert into public.business_items (business_id, kind, name, description, price, section, available, sort, attrs) values
`;

const rows = ITEMS.map(([cat, es, en, dEs, dEn, day, week, dep, stock, unitEs, unitEn, avail], i) => {
  const attrs = { nameEn: en, descEn: dEn, day, week, dep, stock, unitEs, unitEn, availEs: avail, addons: [] };
  return `((select id from public.businesses where slug='${SLUG}'), 'rental', '${esc(es)}', '${esc(dEs)}', ${day}, '${cat}', true, ${i}, '${esc(JSON.stringify(attrs))}'::jsonb)`;
});
sql += rows.join(',\n') + ';\n';
sql += `select count(*) as articulos from public.business_items where kind='rental' and business_id=(select id from public.businesses where slug='${SLUG}');\n`;

const out = resolve(HERE, '../.seed-rentals.sql');
writeFileSync(out, sql);
console.log(`sql written: ${out} (${rows.length} rental items)`);
const r = spawnSync('node', [resolve(HERE, 'sbsql.mjs'), '--file', out], { encoding: 'utf8', stdio: 'inherit' });
process.exit(r.status ?? 1);
