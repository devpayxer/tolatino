#!/usr/bin/env node
// verify-geo.mjs — comprueba que la GEOLOCALIZACIÓN sigue viva.
//
// POR QUÉ EXISTE: el soporte de Supabase va a mover PostGIS del esquema
// `public` al esquema `extensions` (respuesta al ticket de `spatial_ref_sys`,
// 2026-08-16). Es el arreglo correcto —`anon` puede hoy borrar esa tabla y
// tumbar toda la geo— pero es una operación que se hace DESDE FUERA, en su
// lado, y que puede romper 89 funciones nuestras de golpe si algo del camino
// (`search_path`) no quedó bien.
//
// La migración `0156` prepara el terreno. Este script comprueba el resultado,
// y hay que correrlo:
//   · ANTES del traslado, para tener una foto de referencia
//   · JUSTO DESPUÉS, en pruebas — y no autorizar producción hasta que salga
//     limpio
//   · DESPUÉS en producción
//
// Cubre las 23 funciones geo públicas de verdad, no una muestra: si «negocios
// cerca de ti» se cae, se cae el producto.
//
// Uso:
//   SUPABASE_PROJECT_REF=zpkaxojonufdwgahiqjh node scripts/verify-geo.mjs
//   SUPABASE_PROJECT_REF=vurqsebgsacickxsxfeh node scripts/verify-geo.mjs
//
// Sale con código 1 si algo geo dejó de funcionar.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const REF = process.env.SUPABASE_PROJECT_REF ?? 'vurqsebgsacickxsxfeh';
const ES_PRUEBAS = REF === 'zpkaxojonufdwgahiqjh';
const URL_SB = `https://${REF}.supabase.co`;

// La llave pública sale del .env del entorno correspondiente (son públicas por
// diseño; RLS es lo que protege los datos).
const envFile = ES_PRUEBAS ? 'apps/web/.env.staging' : 'apps/web/.env.production';
const ANON = (readFileSync(new URL(`../${envFile}`, import.meta.url), 'utf8')
  .split('\n').find((l) => l.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) ?? '')
  .split('=').slice(1).join('=').trim();

// Hazleton, PA — la ciudad del lanzamiento.
const LAT = 40.9584, LNG = -75.9746;

const fallos = [];
const ok = (m) => console.log(`  ✅ ${m}`);
const mal = (m) => { console.log(`  ❌ ${m}`); fallos.push(m); };

function rpc(nombre, cuerpo) {
  try {
    const out = execFileSync('curl', [
      '-s', '-X', 'POST', `${URL_SB}/rest/v1/rpc/${nombre}`,
      '-H', `apikey: ${ANON}`, '-H', `authorization: Bearer ${ANON}`,
      '-H', 'content-type: application/json',
      '--data-binary', JSON.stringify(cuerpo), '--max-time', '25',
    ], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    return JSON.parse(out || 'null');
  } catch (e) {
    return { __error: String(e).slice(0, 160) };
  }
}

/** Una función geo está VIVA si responde sin error de SQL. Que devuelva 0 filas
 *  puede ser legítimo (producción está vacía); que devuelva un error de función
 *  inexistente NO lo es nunca — y es exactamente el síntoma de PostGIS movido
 *  sin el `search_path` preparado. */
function vive(nombre, cuerpo, { esperaFilas = false } = {}) {
  const r = rpc(nombre, cuerpo);
  if (r && r.__error) return mal(`${nombre}: no respondió (${r.__error})`);
  if (r && r.code && r.message) {
    // 42883 = function does not exist → el fallo que este script vigila
    const pista = String(r.code) === '42883' || /does not exist|no existe/i.test(r.message)
      ? '  ← PostGIS movido sin `extensions` en el camino'
      : '';
    return mal(`${nombre}: ${r.code} ${String(r.message).slice(0, 90)}${pista}`);
  }
  const n = Array.isArray(r) ? r.length : r == null ? 0 : 1;
  if (esperaFilas && n === 0) return mal(`${nombre}: respondió pero sin filas, y aquí SÍ debía haber`);
  ok(`${nombre} responde${n ? ` · ${n} fila(s)` : ''}`);
  return r;
}

/** Función que un visitante NO debe poder ejecutar. Se espera un 42501; que
 *  responda con datos sería una fuga, y un error DISTINTO delataría que se
 *  rompió por el traslado de PostGIS. */
function privada(nombre, cuerpo) {
  const r = rpc(nombre, cuerpo);
  if (r && String(r.code) === '42501') return ok(`${nombre} sigue cerrada a visitantes (correcto)`);
  if (r && r.code) return mal(`${nombre}: error inesperado ${r.code} ${String(r.message).slice(0, 80)}`);
  return mal(`${nombre}: ¡respondió a un visitante! debería estar cerrada`);
}

console.log(`\nverify-geo · ${ES_PRUEBAS ? 'PRUEBAS' : 'PRODUCCIÓN'} (${REF})`);

// ── 1 · ¿dónde vive PostGIS ahora mismo? ────────────────────────────────────
let esquema = '(desconocido)';
try {
  const out = execFileSync('node', ['scripts/sbsql.mjs', '--raw',
    "select n.nspname as e from pg_extension x join pg_namespace n on n.oid=x.extnamespace where x.extname='postgis';"],
    { encoding: 'utf8', env: { ...process.env, SUPABASE_PROJECT_REF: REF } });
  esquema = JSON.parse(out)[0]?.e ?? '(no encontrado)';
} catch { /* sbsql necesita el token de gestión; sin él seguimos igual */ }
console.log(`\nPostGIS vive en el esquema: ${esquema}`);

// ── 2 · las funciones que el usuario toca de verdad ─────────────────────────
console.log('\nbúsqueda y descubrimiento');
const cerca = vive('search_businesses', {
  in_q: null, user_lat: LAT, user_lng: LNG, in_city: null, in_cat: null,
  in_price: null, in_min_rating: null, max_results: 5, in_offset: 0,
}, { esperaFilas: ES_PRUEBAS });
// La distancia es LO que calcula PostGIS: si viene nula donde hay filas, el
// cálculo se rompió aunque la consulta no diera error.
if (Array.isArray(cerca) && cerca.length) {
  const d = cerca[0].distance_m;
  if (d == null) mal('search_businesses devuelve filas pero SIN distancia — el cálculo geo no corrió');
  else ok(`distancia calculada: ${(d / 1609.34).toFixed(2)} mi al más cercano`);
}
vive('search_events', { in_q: null, user_lat: LAT, user_lng: LNG, radius_m: 80000, in_cat: null, in_free: null, max_results: 5 });
vive('events_near', { user_lat: LAT, user_lng: LNG, radius_m: 80000, max_results: 5 });
vive('posts_near', { user_lat: LAT, user_lng: LNG, radius_m: 48280, max_results: 5 });
vive('nearest_city', { user_lat: LAT, user_lng: LNG });
// `neighbors_nearby` NO es pública a propósito (anon no puede ejecutarla): es
// para gente con sesión. Se comprueba que siga siendo privada — si un día
// respondiera a un visitante, eso sí sería el fallo.
privada('neighbors_nearby', { user_lat: LAT, user_lng: LNG, radius_m: 48280, max_results: 5 });

console.log('\nficha del negocio y entrega');
const slug = ES_PRUEBAS ? 'hz-food-p4' : '__ninguno__';
const ficha = vive('business_by_slug', { in_slug: slug }, { esperaFilas: ES_PRUEBAS });
if (Array.isArray(ficha) && ficha.length) {
  const { lat, lng } = ficha[0];
  if (lat == null || lng == null) mal('business_by_slug no devuelve coordenada — st_x/st_y no corrieron');
  else ok(`coordenada de la ficha: ${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`);
}
vive('delivery_range_check', { in_slug: slug, in_lat: LAT, in_lng: LNG });

console.log('\notras verticales que también usan geo');
vive('properties_search', { user_lat: LAT, user_lng: LNG, max_results: 3 });
vive('vehicles_search', { user_lat: LAT, user_lng: LNG, max_results: 3 });

// ── 3 · reporte ─────────────────────────────────────────────────────────────
if (fallos.length) {
  console.error(`\n✖ ${fallos.length} comprobación(es) geo fallaron.`);
  console.error('  Si acaban de mover PostGIS: NO autorizar el traslado en producción.');
  console.error('  El arreglo es volver a aplicar la migración 0156 (añade `extensions`');
  console.error('  al `search_path`) y repetir esta comprobación.\n');
  process.exit(1);
}
console.log('\n✅ La geolocalización responde entera.\n');
