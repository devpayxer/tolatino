#!/usr/bin/env node
// seed-imagenes-unsplash.mjs — pone imágenes REALES (Unsplash) en los negocios
// de prueba para que el demo se explore como una app profesional: avatar/logo,
// portada (featured), galería de 6, y una imagen en CADA ítem de menú/tienda/
// servicios, más fotos en propiedades y vehículos.
//
// ═══════════════════════════════════════════════════════════════════════════
// SOLO PRUEBAS. Fotos de stock sobre negocios FICTICIOS no pueden ir a
// producción: sería engañoso (regla #8). El script se niega a correr contra el
// proyecto de producción.
// ═══════════════════════════════════════════════════════════════════════════
//
// CÓMO. No guarda nada en el bucket: ENLAZA directo a la CDN de Unsplash
// (`images.unsplash.com/...`), que es lo que sus guías piden y deja el
// almacenamiento de pruebas en cero. La app las pinta como `<img>` normales y
// no hay CSP que las bloquee (comprobado).
//
// RATE LIMIT. La cuenta Demo de Unsplash da 50 peticiones/hora. Por eso NO se
// busca una foto por ítem (serían 6.000+), sino UN pool de ~30 fotos por
// contexto (categoría, y categoría×tipo) que se reparte por HASH del id. Mismo
// id → misma foto: re-ejecutable sin barajar ni duplicar. Los pools se cachean
// en disco (POOLS_JSON) para no re-consultar en cada corrida.
//
// GUÍAS DE UNSPLASH (anotado en LAUNCH-CHECKLIST): para un uso público habría
// que atribuir al fotógrafo y disparar el endpoint de descarga. Aquí son datos
// de demo internos; se enlaza (que es lo que prefieren) y se guarda el crédito
// del autor en el pool por si hiciera falta.
//
// USO:
//   UNSPLASH_ACCESS_KEY=xxx SUPABASE_PROJECT_REF=zpkaxojonufdwgahiqjh \
//   POOLS_JSON=/ruta/pools.json node scripts/seed-imagenes-unsplash.mjs
//     --fetch   solo baja los pools de Unsplash (rate-limited) y los cachea
//     --apply   solo escribe en la base desde el pool cacheado (idempotente)
//     (sin flag = fetch si no hay caché, y luego apply)

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SBSQL = resolve(HERE, 'sbsql.mjs');
const die = (m) => { console.error('seed-imagenes: ' + m); process.exit(2); };

const KEY = process.env.UNSPLASH_ACCESS_KEY || die('falta UNSPLASH_ACCESS_KEY');
const REF = process.env.SUPABASE_PROJECT_REF || die('poné SUPABASE_PROJECT_REF (pruebas: zpkaxojonufdwgahiqjh)');
if (REF === 'vurqsebgsacickxsxfeh') die('ESTE ES PRODUCCIÓN. Este sembrador es solo para pruebas. Abortado.');
const POOLS_JSON = process.env.POOLS_JSON || resolve(HERE, '../.unsplash-pools.json');

const argv = process.argv.slice(2);
const soloFetch = argv.includes('--fetch');
const soloApply = argv.includes('--apply');

// ── El mapa: cada "pool" es una búsqueda. Se reutilizan entre negocio e ítem
//    cuando el concepto es el mismo, para gastar menos del rate limit. ────────
const POOLS = {
  // por categoría de NEGOCIO (portada/galería/avatar)
  transporte:   'bus coach travel station',
  belleza:      'beauty salon spa interior',
  deportes:     'gym fitness studio',
  auto:         'auto repair garage mechanic',
  ninos:        'kids daycare playroom',
  iglesias:     'church congregation community',
  educacion:    'classroom tutoring students',
  comida:       'latin restaurant food',
  abarrotes:    'grocery store market produce',
  salud:        'medical clinic doctor office',
  hogar:        'home repair contractor tools',
  nocturna:     'bar lounge nightlife',
  fiesta:       'party celebration event decor',
  profesional:  'professional office meeting',
  tiendas:      'retail store boutique shop',
  // por TIPO de ítem (imagen de cada producto/servicio/menú)
  it_autopartes:  'car parts accessories',
  it_belleza_prod:'cosmetics beauty products',
  it_belleza_serv:'haircut manicure salon service',
  it_ninos_prod:  'kids toys products',
  it_ninos_serv:  'children activity class',
  it_menu:        'mexican tacos food plate',
  it_bebidas:     'cocktail drinks bar',
  it_abarrotes:   'groceries food produce',
  it_salud_serv:  'medical checkup healthcare',
  it_hogar_serv:  'home cleaning handyman',
  it_fiesta_renta:'party rental tables chairs decoration',
  it_prof_serv:   'business consulting service',
  it_tienda_prod: 'retail products merchandise',
  it_deporte_renta:'sports equipment',
  it_transporte_serv:'travel transport service',
  // fichas especiales
  casa:  'house home real estate',
  carro: 'car vehicle for sale',
};

// categoría de negocio → pool para su portada/galería/avatar
const CAT_A_POOL = {
  Transportation: 'transporte', BeautyHealth: 'belleza', Sports: 'deportes',
  AutoServices: 'auto', Children: 'ninos', Churches: 'iglesias',
  Education: 'educacion', FoodDrinks: 'comida', Grocery: 'abarrotes',
  HealthMedicine: 'salud', HomeServices: 'hogar', NightLife: 'nocturna',
  Party: 'fiesta', ProServices: 'profesional', Shops: 'tiendas',
  // Estas dos venden coches / casas (su contenido son vehicles / properties, no
  // business_items) pero como negocio igual necesitan avatar, portada y galería.
  CarDealer: 'carro', RealEstate: 'casa',
};
// (categoría de negocio, tipo de ítem) → pool para la imagen del ítem
const ITEM_A_POOL = {
  'AutoServices|product': 'it_autopartes', 'AutoServices|service': 'auto',
  'BeautyHealth|product': 'it_belleza_prod', 'BeautyHealth|service': 'it_belleza_serv',
  'Children|product': 'it_ninos_prod', 'Children|service': 'it_ninos_serv',
  'Education|service': 'educacion',
  'FoodDrinks|menu': 'it_menu',
  'Grocery|product': 'it_abarrotes',
  'HealthMedicine|service': 'it_salud_serv',
  'HomeServices|service': 'it_hogar_serv',
  'NightLife|menu': 'it_bebidas',
  'Party|rental': 'it_fiesta_renta', 'Party|service': 'fiesta',
  'ProServices|service': 'it_prof_serv',
  'Shops|product': 'it_tienda_prod',
  'Sports|rental': 'it_deporte_renta', 'Sports|service': 'deportes',
  'Transportation|service': 'it_transporte_serv',
};

// ── Unsplash ─────────────────────────────────────────────────────────────────
function buscar(query) {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}`
    + `&per_page=30&orientation=landscape&content_filter=high&client_id=${KEY}`;
  const r = spawnSync('curl', ['-s', '-w', '\n%{http_code}', '--max-time', '30', url], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  const t = (r.stdout || '').trim();
  const code = t.slice(t.lastIndexOf('\n') + 1);
  if (code !== '200') throw new Error(`búsqueda "${query}" → HTTP ${code}: ${t.slice(0, 160)}`);
  const j = JSON.parse(t.slice(0, t.lastIndexOf('\n')));
  return (j.results || []).map((p) => ({
    raw: p.urls.raw,
    autor: p.user?.name || '',
    perfil: p.user?.links?.html || '',
  }));
}

function fetchPools() {
  const pools = {};
  const claves = Object.keys(POOLS);
  console.log(`Bajando ${claves.length} pools de Unsplash (rate limit 50/hora)…`);
  for (let i = 0; i < claves.length; i++) {
    const k = claves[i];
    const fotos = buscar(POOLS[k]);
    pools[k] = fotos;
    console.log(`  ${String(i + 1).padStart(2)}/${claves.length}  ${k.padEnd(18)} "${POOLS[k]}" → ${fotos.length} fotos`);
    if (fotos.length === 0) throw new Error(`el pool "${k}" volvió vacío`);
  }
  writeFileSync(POOLS_JSON, JSON.stringify(pools, null, 0));
  console.log(`Pools cacheados en ${POOLS_JSON}`);
  return pools;
}

// ── Base de datos ────────────────────────────────────────────────────────────
function sql(texto) {
  const tmp = POOLS_JSON + '.sql';
  writeFileSync(tmp, texto);
  const r = spawnSync('node', [SBSQL, '--file', tmp], { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
  if (r.status !== 0) { console.error(r.stdout || ''); console.error(r.stderr || ''); die('la escritura en la base falló'); }
  return r.stdout;
}
function query(texto) {
  const r = spawnSync('node', [SBSQL, '--raw', texto], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) { console.error(r.stdout, r.stderr); die('consulta falló'); }
  const lineas = (r.stdout || '').trim().split('\n');
  for (let i = lineas.length - 1; i >= 0; i--) { const s = lineas[i].trim(); if (s.startsWith('[')) return JSON.parse(s); }
  die('no se pudo leer la consulta');
}

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
// Unsplash `raw` ya trae query (?ixid=…); los parámetros de tamaño van con &.
const sized = (raw, params) => `${raw}&${params}&fm=jpg&fit=crop`;
const arrLit = (urls) => `array[${urls.map((u) => q(u)).join(',')}]::text[]`;

function apply(pools) {
  // 1 · Negocios objetivo: todos MENOS los que ya tienen fotos reales (El Sabor).
  const negocios = query(`
    select b.id, b.category_id,
      exists(select 1 from public.business_photos p
             where p.business_id=b.id and p.url not like '%images.unsplash.com%') as reales
    from public.businesses b order by b.id;`);
  const objetivo = negocios.filter((b) => !b.reales && CAT_A_POOL[b.category_id]);
  console.log(`Negocios a ilustrar: ${objetivo.length} (${negocios.length - objetivo.length} con fotos reales, intactos)`);

  const partes = [];

  // Idempotencia: fuera lo que sembramos antes; las fotos reales (no unsplash) se quedan.
  partes.push(`delete from public.business_photos where url like '%images.unsplash.com%';`);

  // 2 · Avatar (logo_url): un pool por categoría, elegido por hash → cuadrado.
  //     Y featured + 5 de galería como filas de business_photos.
  const filasFoto = [];
  for (const b of objetivo) {
    const pool = pools[CAT_A_POOL[b.category_id]];
    const n = pool.length;
    // 6 índices distintos, deterministas por el id del negocio.
    const base = Math.abs(hashStr(b.id));
    const idx = [];
    for (let k = 0; idx.length < 6 && k < n; k++) { const v = (base + k) % n; if (!idx.includes(v)) idx.push(v); }
    const avatar = sized(pool[idx[0]].raw, 'w=200&h=200&q=70');
    partes.push(`update public.businesses set logo_url=${q(avatar)} where id=${q(b.id)};`);
    idx.forEach((v, k) => {
      const url = sized(pool[v].raw, k === 0 ? 'w=1280&h=720&q=75' : 'w=1000&h=667&q=72');
      filasFoto.push(`(${q(b.id)},${q(url)},${k === 0},${k})`);
    });
  }
  // INSERT en lotes de 400 filas.
  for (let i = 0; i < filasFoto.length; i += 400) {
    partes.push(`insert into public.business_photos (business_id,url,is_cover,sort) values ${filasFoto.slice(i, i + 400).join(',')};`);
  }

  // 3 · Ítems (image_url): un UPDATE por (categoría×tipo), hash → foto del pool.
  for (const [combo, poolId] of Object.entries(ITEM_A_POOL)) {
    const [cat, kind] = combo.split('|');
    const urls = pools[poolId].map((p) => sized(p.raw, 'w=800&h=600&q=75'));
    partes.push(`
      update public.business_items i set image_url = a.arr[(abs(hashtextextended(i.id::text,0)) % ${urls.length}) + 1]
      from (select ${arrLit(urls)} as arr) a
      where i.kind=${q(kind)} and i.business_id in (select id from public.businesses where category_id=${q(cat)});`);
  }

  // 4 · Propiedades y vehículos: 4 fotos cada uno (columna array), por hash.
  for (const [tabla, poolId] of [['properties', 'casa'], ['vehicles', 'carro']]) {
    const urls = pools[poolId].map((p) => sized(p.raw, 'w=1000&h=667&q=75'));
    // `photos` es jsonb (no text[]): se envuelve con to_jsonb.
    partes.push(`
      update public.${tabla} t set photos = to_jsonb(array[
        a.arr[(abs(hashtextextended(t.id::text,0)) % ${urls.length})+1],
        a.arr[(abs(hashtextextended(t.id::text,1)) % ${urls.length})+1],
        a.arr[(abs(hashtextextended(t.id::text,2)) % ${urls.length})+1],
        a.arr[(abs(hashtextextended(t.id::text,3)) % ${urls.length})+1]])
      from (select ${arrLit(urls)} as arr) a;`);
  }

  console.log(`Escribiendo: ${objetivo.length} avatares, ${filasFoto.length} fotos de galería, ${Object.keys(ITEM_A_POOL).length} lotes de ítems, propiedades y vehículos…`);
  sql(partes.join('\n'));
  console.log('Listo.');
}

// Hash estable de string → entero (para elegir en el pool en JS; en SQL uso hashtextextended).
function hashStr(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return h; }

// ── Orquestación ─────────────────────────────────────────────────────────────
let pools = null;
if (soloApply) {
  if (!existsSync(POOLS_JSON)) die(`--apply necesita el caché ${POOLS_JSON}; corré --fetch primero`);
  pools = JSON.parse(readFileSync(POOLS_JSON, 'utf8'));
} else if (soloFetch) {
  fetchPools(); process.exit(0);
} else {
  pools = existsSync(POOLS_JSON) ? JSON.parse(readFileSync(POOLS_JSON, 'utf8')) : fetchPools();
}
apply(pools);
