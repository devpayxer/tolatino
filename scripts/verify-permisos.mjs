#!/usr/bin/env node
// verify-permisos.mjs — el guardián que la migración 0148 no dejó.
//
// POR QUÉ EXISTE (regla §3 del CLAUDE.md: «cada clase cazada deja un guardián
// automático»). La 0148 cerró de golpe 150 funciones que estaban abiertas a
// `anon` sin querer. Pero en PostgreSQL una función NUEVA la puede ejecutar
// PUBLIC salvo que se diga lo contrario, y PostgREST publica en `/rest/v1/rpc/…`
// todo lo que viva en `public`. O sea: la próxima `admin_*` que alguien escriba
// —o el próximo disparador— nace ABIERTA otra vez, y nada lo cazaba solo.
// Esto lo caza.
//
// QUÉ COMPRUEBA (cuatro invariantes; cualquiera rota = sale con código 1):
//   A1 · Ninguna `admin_*` es ejecutable por `anon`.
//   A2 · Ningún disparador nuestro (una función que devuelve `trigger`, no de una
//        extensión) es alcanzable por `anon` NI por `authenticated` — un
//        disparador no es una API, lo llama la tabla.
//   A3 · TODA `admin_*` sigue siendo ejecutable por `authenticated` — el reverso:
//        que un revoke de más no deje el panel `/admin` muerto.
//   A4 · Ninguna función SECURITY DEFINER ejecutable por `anon` está FUERA de la
//        lista blanca de abajo. Esa lista es la decisión, registrada en git, de
//        «estas 44 son públicas a propósito» (catálogo, fichas, búsqueda). Una
//        función nueva que aparezca abierta y no esté en la lista rompe el
//        build: o es pública de verdad y se añade aquí a mano (una línea, un
//        commit), o hay que cerrarla.
//
// QUÉ **NO** COMPRUEBA, y quién sí: que una función pública no se haya cerrado
// de más (p. ej. `reviews_by_slug` dejando de verse sin cuenta). Eso lo caza el
// OTRO guardián, `tools/mobile-audit/permisos-anon.js`, recorriendo el sitio sin
// sesión. Los dos son complementarios: este mira la base («¿nació algo
// abierto?»), aquél mira el navegador («¿se cerró algo que debía verse?»).
//
// USO:
//   node scripts/verify-permisos.mjs                       # revisa PRODUCCIÓN
//   SUPABASE_PROJECT_REF=zpkaxojonufdwgahiqjh node scripts/verify-permisos.mjs   # PRUEBAS
//
// Habla con la base a través de `sbsql.mjs`, así que hereda su transporte (curl
// por el proxy) y su auth (SUPABASE_ACCESS_TOKEN). No lleva ningún secreto.
//
// CÓDIGOS DE SALIDA: 0 todo en orden · 1 hay invariante(s) rota(s) · 2 error de
// configuración o de consulta.

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SBSQL = resolve(HERE, 'sbsql.mjs');

// ── La lista blanca ──────────────────────────────────────────────────────────
// Las funciones SECURITY DEFINER que SÍ deben ser ejecutables sin sesión: el
// catálogo, la búsqueda, las fichas y las de registro anónimo. Sacada de la base
// el 2026-08-05 (41 en producción + 3 que aún no se han desplegado ahí:
// landing_*, platform_stats). AÑADIR AQUÍ una función es una decisión consciente
// de hacerla pública — que quede en el diff, revisable.
const PUBLICAS = new Set([
  'auto_directory', 'booking_busy_by_slug', 'booking_load_by_service',
  'bump_update_views', 'business_by_slug', 'business_menu_by_slug',
  'business_photos_by_slug', 'business_products_by_slug', 'business_relations_by_slug',
  'business_rentals_by_slug', 'business_services_by_slug', 'business_updates_by_slug',
  'businesses_v2', 'check_promo', 'delivery_range_check', 'endorsements_by_slug',
  'event_by_slug', 'event_reviews_by_slug', 'events_by_owner', 'neighbor_profile',
  'properties_search', 'property_by_slug', 'public_avatars', 're_directory',
  'registrar_busqueda', 'rental_busy_by_item', 'rental_busy_by_slug',
  'rental_peak_booked', 'reviews_by_slug', 'search_businesses', 'search_businesses_link',
  'seat_claims_by_slug', 'sugerir_termino', 'track_listing_view', 'track_property_view',
  'track_search_appearance', 'track_vehicle_view', 'validate_promo', 'vehicle_by_slug',
  'vehicles_search', 'zone_stats',
  // aún no en producción, pero públicas a propósito (portada):
  'landing_marketplace', 'landing_testimonials', 'platform_stats',
]);

// Una sola consulta trae el estado de TODAS nuestras funciones; la clasificación
// se hace aquí, en JS, para que la lista blanca viva en el código y no en el SQL.
const SQL = `
  select p.proname as fn,
         (p.prorettype = 'pg_catalog.trigger'::regtype) as es_trigger,
         p.prosecdef as secdef,
         has_function_privilege('anon', p.oid, 'execute') as anon,
         has_function_privilege('authenticated', p.oid, 'execute') as auth_
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prokind = 'f'
     and not exists (
       select 1 from pg_depend d
       join pg_extension e on e.oid = d.refobjid
       where d.objid = p.oid and d.deptype = 'e')
   order by p.proname;`;

function consultar() {
  const res = spawnSync('node', [SBSQL, '--raw', SQL], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (res.status !== 0) {
    console.error('verify-permisos: la consulta a la base falló.\n' + (res.stderr || res.stdout || '').trim());
    process.exit(2);
  }
  // sbsql imprime el JSON en la última línea no vacía; lo demás son avisos suyos.
  const lineas = (res.stdout || '').trim().split('\n');
  for (let i = lineas.length - 1; i >= 0; i--) {
    const t = lineas[i].trim();
    if (t.startsWith('[')) { try { return JSON.parse(t); } catch { /* sigue */ } }
  }
  console.error('verify-permisos: no se pudo leer la respuesta de la base.');
  process.exit(2);
}

// Solo para el mensaje. NO se toca la variable de entorno: si no está puesta,
// `sbsql` la deduce de apps/web/.env.production (producción), como debe ser.
const ref = process.env.SUPABASE_PROJECT_REF || 'producción (según .env.production)';

const filas = consultar();
const fallos = [];

for (const f of filas) {
  if (f.fn.startsWith('admin_')) {
    if (f.anon) fallos.push(['A1 · admin_* alcanzable por anon', f.fn]);
    if (!f.auth_) fallos.push(['A3 · admin_* ROTA para el panel (authenticated no puede)', f.fn]);
  }
  if (f.es_trigger && (f.anon || f.auth_)) {
    const quien = [f.anon && 'anon', f.auth_ && 'authenticated'].filter(Boolean).join(' y ');
    fallos.push(['A2 · disparador alcanzable desde fuera', `${f.fn} (${quien})`]);
  }
  // A4 excluye `admin_*` a propósito: si una admin nace abierta, ya la reporta
  // A1 con su nombre — no hace falta contarla dos veces.
  if (f.secdef && !f.es_trigger && !f.fn.startsWith('admin_') && f.anon && !PUBLICAS.has(f.fn)) {
    fallos.push(['A4 · SECURITY DEFINER abierta a anon y FUERA de la lista blanca', f.fn]);
  }
}

console.log(`verify-permisos · ${filas.length} funciones nuestras revisadas en ${ref}`);

if (fallos.length === 0) {
  const admin = filas.filter((f) => f.fn.startsWith('admin_')).length;
  const disp = filas.filter((f) => f.es_trigger).length;
  const pub = filas.filter((f) => f.secdef && !f.es_trigger && f.anon).length;
  console.log(`  ${admin} admin_* cerradas a anon y vivas para el panel · ${disp} disparadores no alcanzables · ${pub} públicas, todas en la lista blanca`);
  console.log('\n✅ Ninguna función nació abierta.');
  process.exit(0);
}

// Agrupado por invariante, para que se lea de un vistazo qué clase falló.
const porClase = new Map();
for (const [clase, fn] of fallos) {
  if (!porClase.has(clase)) porClase.set(clase, []);
  porClase.get(clase).push(fn);
}
console.error(`\n❌ ${fallos.length} problema(s) de permisos:\n`);
for (const [clase, fns] of [...porClase].sort()) {
  console.error(`  ${clase}`);
  for (const fn of fns.sort()) console.error(`      · ${fn}`);
}
console.error('\n  Si alguna A4 es pública a propósito, añádela a PUBLICAS en este archivo.');
console.error('  Si no, ciérrala:  revoke execute on function public.<fn>(...) from public, anon;');
process.exit(1);
