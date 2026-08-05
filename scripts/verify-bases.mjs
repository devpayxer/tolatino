#!/usr/bin/env node
// ¿Tiene producción lo mismo que pruebas? Comparar, no confiar.
//
// ════════════════════════════════════════════════════════════════════════════
// POR QUÉ EXISTE (2026-08-05)
// ════════════════════════════════════════════════════════════════════════════
// El fundador preguntó si quedaba algo pendiente para pasar a producción. Al
// mirarlo en serio salió que **dos migraciones llevaban tiempo subidas como
// código y nunca ejecutadas** (0131 y 0143): sus archivos estaban en la rama de
// producción, sus funciones e índices no estaban en la base.
//
// Y no había forma de darse cuenta. Este proyecto aplica las migraciones a mano
// pegándolas en el SQL Editor, así que **no existe
// `supabase_migrations.schema_migrations`** — la tabla donde el CLI de Supabase
// anota lo aplicado. Sin ella, «¿está la 0143?» solo se puede responder mirando
// si sus objetos existen. Eso es lo que hace esto.
//
// No compara migraciones: compara el RESULTADO (funciones, columnas, índices,
// políticas, triggers). Es más fiable — una migración puede aplicarse a medias,
// o alguien puede tocar algo desde el panel, y el nombre del archivo no se
// enteraría.
//
// USO
//   node scripts/verify-bases.mjs
//   node scripts/verify-bases.mjs --ref-a <pruebas> --ref-b <produccion>
//
// Sale con código 1 si a producción le falta algo. Pensado para ejecutarlo
// ANTES de pasar código a producción: el código nuevo que llama a una función
// que allí no existe es exactamente lo que rompe el sitio en vivo.
//
// AUTENTICACIÓN: la misma que `sbsql.mjs` (SUPABASE_ACCESS_TOKEN).

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SBSQL = resolve(HERE, 'sbsql.mjs');

// Los refs por defecto son los dos proyectos del proyecto. Se pueden cambiar por
// argumento para no dejarlos clavados si algún día cambian.
const arg = (n, def) => {
  const i = process.argv.indexOf(n);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
};
const REF_A = arg('--ref-a', 'zpkaxojonufdwgahiqjh');   // pruebas: la referencia
const REF_B = arg('--ref-b', 'vurqsebgsacickxsxfeh');   // producción: la que se revisa

// Objetos que SOLO deben existir en pruebas. Un hueco aquí no es un fallo: es lo
// correcto. `_seed_user` siembra datos de mentira — en producción sería un
// agujero, no una falta.
const SOLO_PRUEBAS = new Set(['_seed_user']);

const CONSULTAS = [
  ['funciones', `select string_agg(distinct p.proname, ',' order by p.proname) v
                   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public'`],
  ['columnas', `select string_agg(c.relname||'.'||a.attname, ',' order by c.relname||'.'||a.attname) v
                  from pg_class c
                  join pg_attribute a on a.attrelid = c.oid
                  join pg_namespace n on n.oid = c.relnamespace
                 where n.nspname = 'public' and c.relkind = 'r'
                   and a.attnum > 0 and not a.attisdropped`],
  ['índices', `select string_agg(indexname, ',' order by indexname) v
                 from pg_indexes where schemaname = 'public'`],
  ['políticas RLS', `select string_agg(tablename||'::'||policyname, ',' order by tablename||'::'||policyname) v
                       from pg_policies where schemaname in ('public','storage')`],
  ['triggers', `select string_agg(c.relname||'::'||t.tgname, ',' order by c.relname||'::'||t.tgname) v
                  from pg_trigger t
                  join pg_class c on c.oid = t.tgrelid
                  join pg_namespace n on n.oid = c.relnamespace
                 where n.nspname = 'public' and not t.tgisinternal`],
];

function consultar(ref, sql) {
  const r = spawnSync('node', [SBSQL, sql], {
    encoding: 'utf8',
    env: { ...process.env, SUPABASE_PROJECT_REF: ref },
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.status !== 0) {
    console.error(`  no se pudo consultar ${ref}:\n${(r.stderr || r.stdout || '').trim().slice(0, 400)}`);
    process.exit(2);
  }
  try {
    const v = JSON.parse(r.stdout)[0]?.v;
    return new Set(v ? v.split(',') : []);
  } catch {
    console.error(`  respuesta ilegible de ${ref}`);
    process.exit(2);
  }
}

console.log(`Comparando  A=${REF_A} (referencia)  →  B=${REF_B} (revisada)\n`);

let faltan = 0;
let sobran = 0;

for (const [nombre, sql] of CONSULTAS) {
  const a = consultar(REF_A, sql);
  const b = consultar(REF_B, sql);
  const falta = [...a].filter((x) => !b.has(x) && !SOLO_PRUEBAS.has(x)).sort();
  const sobra = [...b].filter((x) => !a.has(x)).sort();
  const omitidos = [...a].filter((x) => !b.has(x) && SOLO_PRUEBAS.has(x));

  if (!falta.length && !sobra.length) {
    console.log(`  ✅ ${nombre.padEnd(15)} igual (${a.size})${omitidos.length ? ` · ${omitidos.length} de solo-pruebas, correcto` : ''}`);
    continue;
  }
  if (falta.length) {
    faltan += falta.length;
    console.log(`  ❌ ${nombre.padEnd(15)} FALTAN ${falta.length} en B:`);
    falta.forEach((x) => console.log(`       · ${x}`));
  }
  // Que B tenga algo de más no rompe nada, pero casi siempre significa que
  // alguien tocó producción a mano. Se dice, sin fallar por ello.
  if (sobra.length) {
    sobran += sobra.length;
    console.log(`  ⚠️  ${nombre.padEnd(15)} B tiene ${sobra.length} que A no: ${sobra.join(', ')}`);
  }
}

console.log();
if (faltan) {
  console.log(`❌ A la base revisada le faltan ${faltan} objeto(s).`);
  console.log('   NO pases código a producción hasta aplicar las migraciones que los crean:');
  console.log('   SUPABASE_PROJECT_REF=<ref> node scripts/sbsql.mjs --file supabase/migrations/<archivo>.sql');
} else {
  console.log(`✅ La base revisada tiene todo lo que tiene la de referencia${sobran ? ' (y algo de más, ver arriba)' : ''}.`);
}
process.exit(faltan ? 1 : 0);
