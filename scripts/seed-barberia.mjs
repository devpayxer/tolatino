#!/usr/bin/env node
// seed-barberia.mjs — turn "Barbería D' Primera" (hz-barberia-primera) into the
// full Booksy-style test barbershop: 3 categories × 8 services (pay-at-venue, no
// deposits), 6 reusable add-ons, and a 4-pro bookable team (providers) so the
// consumer "Elige tu profesional" picker + per-pro double-booking guard can be
// exercised end-to-end. Ownership moves to the same test owner as El Sabor so the
// founder manages it from the panel. Idempotent. Run: node scripts/seed-barberia.mjs
import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SLUG = 'hz-barberia-primera';
const esc = (s) => String(s).replace(/'/g, "''");

const TILES = {
  cortes: '#E7E4EF 0 8px,#DAD5E6 8px 16px',
  barba: '#EADFD0 0 8px,#DECEB8 8px 16px',
  color: '#EFE0EA 0 8px,#E6CEDD 8px 16px',
};

const config = {
  categories: [
    { id: 'cortes', es: 'Cortes', en: 'Haircuts', icon: 'scissors', tile: TILES.cortes, visible: true },
    { id: 'barba', es: 'Barba y afeitado', en: 'Beard & shave', icon: 'sparkles', tile: TILES.barba, visible: true },
    { id: 'color', es: 'Color y tratamientos', en: 'Color & treatments', icon: 'droplets', tile: TILES.color, visible: true },
  ],
  addons: [
    { id: 'lavado', es: 'Lavado premium', en: 'Premium wash', price: 5 },
    { id: 'linea', es: 'Diseño de línea', en: 'Line design', price: 6 },
    { id: 'mascarilla', es: 'Mascarilla negra', en: 'Black mask', price: 8 },
    { id: 'tintebarba', es: 'Tinte de barba', en: 'Beard tint', price: 12 },
    { id: 'exfoliacion', es: 'Exfoliación facial', en: 'Facial scrub', price: 9 },
    { id: 'cejas', es: 'Perfilado de cejas', en: 'Eyebrow shaping', price: 5 },
  ],
  tags: [],
  booking: true,
  promos: [],
  providers: [
    { id: 'marco', name: 'Marco', tagEs: 'Fades y degradados', tagEn: 'Fades & tapers', color: '#26252B', serviceIds: [], active: true },
    { id: 'tony', name: 'Tony', tagEs: 'Barbas y afeitado', tagEn: 'Beards & shaves', color: '#D6A22A', serviceIds: [], active: true },
    { id: 'luis', name: 'Luis', tagEs: 'Diseños y líneas', tagEn: 'Designs & lines', color: '#2F6FED', serviceIds: [], active: true },
    { id: 'junior', name: 'Junior', tagEs: 'Cortes clásicos y niños', tagEn: 'Classic & kids cuts', color: '#1F9D57', serviceIds: [], active: true },
  ],
};

// [cat, es, en, descEs, descEn, price, durMin label, days, tags, addons]
const ALL_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const SVCS = [
  ['cortes', 'Corte de Cabello', 'Haircut', 'Tijera o máquina, con lavado y peinado incluidos.', 'Scissor or clipper cut with wash & styling included.', 25, '30 min', ALL_DAYS, [], ['lavado', 'linea', 'mascarilla']],
  ['cortes', 'Corte + Barba', 'Haircut + beard', 'El combo completo: corte, perfilado de barba con toalla caliente y aceites.', 'The full combo: haircut plus hot-towel beard lineup with oils.', 38, '45 min', ALL_DAYS, ['Popular'], ['lavado', 'linea', 'tintebarba']],
  ['cortes', 'Corte para Niño', 'Kids cut', 'Corte paciente y divertido para menores de 12 años.', 'Patient, fun cuts for kids under 12.', 18, '30 min', ALL_DAYS, [], ['linea']],
  ['cortes', 'Diseño Capilar', 'Hair design', 'Líneas, figuras y degradados artísticos a máquina y navaja.', 'Lines, shapes and artistic fades by clipper and razor.', 30, '45 min', ['Jue', 'Vie', 'Sáb'], ['Nuevo'], ['lavado']],
  ['barba', 'Afeitado Clásico', 'Classic shave', 'Navaja, toalla caliente, espuma artesanal y bálsamo calmante.', 'Straight razor, hot towel, artisan lather and soothing balm.', 28, '30 min', ALL_DAYS, [], ['exfoliacion', 'mascarilla']],
  ['barba', 'Arreglo de Barba', 'Beard trim', 'Perfilamos y damos forma con máquina y navaja, terminando con aceite.', 'Shape & lineup by clipper and razor, finished with beard oil.', 18, '30 min', ALL_DAYS, ['Popular'], ['tintebarba', 'mascarilla']],
  ['color', 'Tinte / Color', 'Tint / color', 'Cubre canas o cambia tu look; incluye lavado y peinado.', 'Cover grays or switch your look; includes wash & styling.', 45, '60 min', ['Mar', 'Mié', 'Jue', 'Vie'], ['Nuevo'], ['lavado']],
  ['color', 'Tratamiento Capilar', 'Hair treatment', 'Hidratación profunda con masaje capilar — cabello reseco o maltratado.', 'Deep-moisture treatment with scalp massage for dry or damaged hair.', 35, '45 min', ['Mar', 'Mié', 'Jue', 'Vie'], [], ['lavado', 'cejas']],
];

// Sunday closed · Mon–Thu 9–19 · Fri–Sat 9–20 (index 0 = Sunday).
const HOURS = [[], [[540, 1140]], [[540, 1140]], [[540, 1140]], [[540, 1140]], [[540, 1200]], [[540, 1200]]];

let sql = `-- seed-barberia generated ${new Date().toISOString()}
update public.businesses set
  owner_id = (select owner_id from public.businesses where slug='hz-sabor-quisqueya'),
  service_config = '${esc(JSON.stringify(config))}'::jsonb,
  hours = '${esc(JSON.stringify(HOURS))}'::jsonb,
  hours_exceptions = '[]'::jsonb,
  hours_es = 'Lun–Jue 9am–7pm · Vie–Sáb 9am–8pm · Dom cerrado',
  hours_en = 'Mon–Thu 9am–7pm · Fri–Sat 9am–8pm · Sun closed',
  specialty_es = 'Barbería clásica y moderna',
  specialty_en = 'Classic & modern barbershop',
  timezone = 'America/New_York',
  modules = coalesce(modules, '{}'::jsonb) || '{"services": true, "bookings": true, "updates": true, "staff": true}'::jsonb
where slug = '${SLUG}';

delete from public.business_items where kind='service' and business_id=(select id from public.businesses where slug='${SLUG}');
insert into public.business_items (business_id, kind, name, description, price, section, available, sort, attrs) values
`;

const rows = SVCS.map(([cat, es, en, dEs, dEn, price, dur, days, tags, addons], i) => {
  const attrs = { en: dEn, priceType: 'fijo', dur, bookable: true, deposit: false, addons, tags, days, capacity: '1', variants: null };
  return `((select id from public.businesses where slug='${SLUG}'), 'service', '${esc(es)}', '${esc(dEs)}', ${price}, '${cat}', true, ${i}, '${esc(JSON.stringify(attrs))}'::jsonb)`;
});
sql += rows.join(',\n') + ';\n';
sql += `select count(*) as servicios from public.business_items where kind='service' and business_id=(select id from public.businesses where slug='${SLUG}');\n`;

const out = resolve(HERE, '../.seed-barberia.sql');
writeFileSync(out, sql);
console.log(`sql written: ${out} (${rows.length} services)`);
const r = spawnSync('node', [resolve(HERE, 'sbsql.mjs'), '--file', out], { encoding: 'utf8', stdio: 'inherit' });
process.exit(r.status ?? 1);
