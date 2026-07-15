#!/usr/bin/env node
// seed-carwash.mjs — seed "Aqua Shine Auto Spa" (hz-aqua-shine): the car-wash
// test business that exercises the PREPAID booking flow (Stripe deposit) plus
// PRICE VARIANTS (vehicle type adds to the base price) and capacity-based slots
// (2 bays — no per-professional staffing). Same owner + test Stripe account as
// El Sabor so card checkout works. Idempotent. Run: node scripts/seed-carwash.mjs
import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SLUG = 'hz-aqua-shine';
const esc = (s) => String(s).replace(/'/g, "''");

const TILES = {
  lavados: '#D7ECF7 0 8px,#C2E0F1 8px 16px',
  detallado: '#E6E0F3 0 8px,#D5CCEB 8px 16px',
};

const config = {
  categories: [
    { id: 'lavados', es: 'Paquetes de lavado', en: 'Wash packages', icon: 'car', tile: TILES.lavados, visible: true },
    { id: 'detallado', es: 'Detallado', en: 'Detailing', icon: 'sparkles', tile: TILES.detallado, visible: true },
  ],
  addons: [
    { id: 'aroma', es: 'Aromatizante', en: 'Air freshener', price: 3 },
    { id: 'cera', es: 'Cera líquida rápida', en: 'Quick liquid wax', price: 8 },
    { id: 'motor', es: 'Limpieza de motor', en: 'Engine cleaning', price: 15 },
    { id: 'llantas', es: 'Tratamiento de llantas', en: 'Tire treatment', price: 6 },
    { id: 'tapiceria', es: 'Shampoo de tapicería', en: 'Upholstery shampoo', price: 20 },
  ],
  tags: [],
  booking: true,
  promos: [],
  providers: [], // capacity-based (2 bays) — no staff picker
};

// The signature single-choice variant: vehicle type adds to the base price.
const VEHICLES = {
  es: 'Tipo de vehículo', en: 'Vehicle type',
  options: [
    { es: 'Sedán / Coupé', en: 'Sedan / Coupe', delta: 0 },
    { es: 'SUV / Crossover', en: 'SUV / Crossover', delta: 5 },
    { es: 'Camioneta / Pickup', en: 'Truck / Pickup', delta: 10 },
    { es: 'Van / Minivan', en: 'Van / Minivan', delta: 12 },
  ],
};

const ALL = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
// [cat, es, en, descEs, descEn, price, dur, deposit, tags, addons]
const SVCS = [
  ['lavados', 'Lavado Express', 'Express wash', 'Exterior a mano, secado y brillo de llantas.', 'Hand exterior wash, dry and tire shine.', 12, '30 min', false, [], ['aroma', 'llantas']],
  ['lavados', 'Lavado Completo', 'Full wash', 'Exterior + interior: aspirado, vidrios y tablero.', 'Exterior + interior: vacuum, windows and dash.', 22, '30 min', true, ['Popular'], ['aroma', 'cera', 'llantas']],
  ['lavados', 'Solo Aspirado', 'Vacuum only', 'Interior, alfombras y cajuela.', 'Interior, mats and trunk.', 10, '30 min', false, [], ['aroma', 'tapiceria']],
  ['detallado', 'Detallado Premium', 'Premium detail', 'Limpieza profunda, encerado, tapicería y motor — como de agencia.', 'Deep clean, wax, upholstery and engine — showroom finish.', 89, '90 min', true, ['Popular'], ['motor', 'tapiceria']],
  ['detallado', 'Encerado y Pulido', 'Wax & polish', 'Cera de carnauba y abrillantado a máquina.', 'Carnauba wax and machine polish.', 55, '60 min', true, ['Nuevo'], ['llantas', 'cera']],
  ['detallado', 'Restauración de Faros', 'Headlight restoration', 'Pulido de micas opacas — mejora visibilidad y estética.', 'Polish cloudy lenses — better visibility and looks.', 35, '45 min', false, [], []],
];

// Sun 10–16 · Mon–Sat 8–19 (index 0 = Sunday).
const HOURS = [[[600, 960]], [[480, 1140]], [[480, 1140]], [[480, 1140]], [[480, 1140]], [[480, 1140]], [[480, 1140]]];

const settings = {};

let sql = `-- seed-carwash generated ${new Date().toISOString()}
insert into public.businesses (slug, name, category_id, tagline_es, tagline_en, tier, price_level,
  about_es, about_en, address, city, phone, is_open, rating, reviews_count,
  tile_a, tile_b, location, owner_id, modules, settings, service_config, hours,
  stripe_account_id, connect_charges_enabled, connect_details_submitted, timezone,
  specialty_es, specialty_en, hours_es, hours_en)
values ('${SLUG}', 'Aqua Shine Auto Spa', 'AutoServices',
  'Tu auto reluciente — reserva tu horario en línea', 'A spotless car — book your slot online',
  'verified', '$$',
  'Lavado a mano y detallado profesional. Elige tu paquete, tipo de vehículo y extras; paga en línea y llega directo a tu bahía — sin filas.',
  'Hand wash and professional detailing. Pick your package, vehicle type and extras; pay online and drive straight to your bay — no lines.',
  '212 W Broad St, Hazleton, PA', 'Hazleton, PA', '(570) 555-0187', true, 0, 0,
  '#D7ECF7', '#C2E0F1', st_geogfromtext('POINT(-75.974 40.951)'),
  (select owner_id from public.businesses where slug='hz-sabor-quisqueya'),
  '{"services": true, "bookings": true, "updates": true, "staff": true}'::jsonb,
  '${esc(JSON.stringify(settings))}'::jsonb,
  '${esc(JSON.stringify(config))}'::jsonb,
  '${esc(JSON.stringify(HOURS))}'::jsonb,
  (select stripe_account_id from public.businesses where slug='hz-sabor-quisqueya'),
  true, true, 'America/New_York',
  'Car wash y detallado', 'Car wash & detailing',
  'Lun–Sáb 8am–7pm · Dom 10am–4pm', 'Mon–Sat 8am–7pm · Sun 10am–4pm')
on conflict (slug) do update set
  service_config = excluded.service_config,
  hours = excluded.hours,
  modules = excluded.modules,
  stripe_account_id = excluded.stripe_account_id,
  connect_charges_enabled = excluded.connect_charges_enabled;

delete from public.business_items where kind='service' and business_id=(select id from public.businesses where slug='${SLUG}');
insert into public.business_items (business_id, kind, name, description, price, section, available, sort, attrs) values
`;

const rows = SVCS.map(([cat, es, en, dEs, dEn, price, dur, deposit, tags, addons], i) => {
  const attrs = { en: dEn, priceType: 'fijo', dur, bookable: true, deposit, addons, tags, days: ALL, capacity: '2', variants: VEHICLES };
  return `((select id from public.businesses where slug='${SLUG}'), 'service', '${esc(es)}', '${esc(dEs)}', ${price}, '${cat}', true, ${i}, '${esc(JSON.stringify(attrs))}'::jsonb)`;
});
sql += rows.join(',\n') + ';\n';
sql += `select count(*) as servicios from public.business_items where kind='service' and business_id=(select id from public.businesses where slug='${SLUG}');\n`;

const out = resolve(HERE, '../.seed-carwash.sql');
writeFileSync(out, sql);
console.log(`sql written: ${out} (${rows.length} services)`);
const r = spawnSync('node', [resolve(HERE, 'sbsql.mjs'), '--file', out], { encoding: 'utf8', stdio: 'inherit' });
process.exit(r.status ?? 1);
