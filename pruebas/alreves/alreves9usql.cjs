// Prueba al revés de 9u · sql9u (toda consulta que se puede enumerar prepara en Postgres) y del guardián consultasSinComprobar (ninguna consulta nueva
// queda fuera de la comprobación). Cada caso rompe algo a propósito y sql9u (o el guardián) tiene que fallar diciendo el archivo y SU error (el texto de
// cada caso abajo); después se restaura y todo vuelve a pasar:
//   el campo de JSON tras `||` sin paréntesis de «Asignar a…» · el update de «Mi casa» que no usa $1 ni $2 · una columna que no existe · una coma de más ·
//   una columna rota dentro de una constante que se mete con `${…}` · dentro de una consulta que se pasa entera por su nombre · dentro de una función de
//   trozos que se llama con argumentos fijos (`scope("…")`) · en la segunda rama de un ternario · en un valor de un objeto que se indexa
//   (`F_PED[f]`: se preparan todos sus valores) · en una consulta con un comentario entre el paréntesis y el texto; y del guardián: una consulta nueva armada con push/join, y un número de la lista aceptada que ya no es.
// Necesita la base de pruebas arriba (pruebas/servir/base.sh) para los casos de sql9u: no necesita el servidor. Los del guardián no necesitan base.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const R = ENT.RAIZ, G = 'consultasSinComprobar';
// [archivo que se rompe, texto, texto roto, lo que tiene que decir, (opcional) archivo que lo dice, (opcional) 'guardian' si lo caza el guardián]
const casos = [
  ['apps/web/app/admin/acciones-colas.ts', "|| ' · ' || (r.name->>'es') as nombre", "|| ' · ' || r.name->>'es' as nombre", 'operator does not exist: text ->> unknown'],
  ['apps/web/lib/oficios-publico.ts', 'where id = $15 and user_id = $1 and address_id = $2 returning id::text', 'where id = $15 returning id::text', 'could not determine data type of parameter $1'],
  ['apps/web/lib/oficios-publico.ts', 'select count(*)::int as n from user_homes where user_id = $1 and removed_at is null', 'select count(*)::int as n from user_homes where user_id = $1 and quitada_el is null', 'column "quitada_el" does not exist'],
  // Consultas armadas SOLO con constantes de texto: también entran (una pieza `${SEL}` del mismo archivo, y la consulta entera pasada por su nombre).
  ['apps/web/lib/cobro-fuera.ts', 'idem_key as idem', 'idem_llave as idem', 'column "idem_llave" does not exist'],
  ['apps/web/lib/planes.ts', 'select s.id::text, o.number as numero, s.city_id as city from plan_subscriptions s join operations o on o.id = s.operation_id join cities ci on ci.id = s.city_id', 'select s.id::text, o.number as numero, s.ciudad_id as city from plan_subscriptions s join operations o on o.id = s.operation_id join cities ci on ci.id = s.city_id', 'column s.ciudad_id does not exist'],
  ['apps/web/lib/barrido.ts', 'insert into system_jobs (name, last_run_at, last_ok_at, last_ms, last_error, runs, errors) values', 'insert into system_jobs (name, last_run_at, last_ok_at, last_ms, last_error, runs, errors,) values', 'syntax error at or near ")"'],
  // Lo que se enumera además (22 nov): funciones de trozos, ternarios, objetos, comentarios y listas cerradas.
  ['apps/web/lib/crecimiento/admin.ts', 'const scope = (col: string) => `(cardinality($1::text[]) = 0 or', 'const scope = (col: string) => `(cardinalidad($1::text[]) = 0 or', 'function cardinalidad(text[]) does not exist'],
  ['apps/web/lib/novedades.ts', "array_remove(modules_on, 'nov') where id = $1`, [negocio]", "array_remove(modules_en, 'nov') where id = $1`, [negocio]", 'column "modules_en" does not exist'],
  ['apps/web/lib/admin-analitica.ts', 'union all select user_id, step, started_at, completed_at from onboarding_drafts_done) d', 'union all select user_id, step, started_at, completed_at from onboarding_hechos) d', 'relation "onboarding_hechos" does not exist'],
  ['apps/web/lib/mi-cuenta.ts', 'const F_PED: Record<FiltroPed, string> = {', 'const F_PED: Record<FiltroPed, string> = {\n  zz: `o.columna_que_no_existe = 1`,', 'column o.columna_que_no_existe does not exist'],
  // El guardián (sin base): una consulta nueva que el código arma en tiempo de ejecución, y un número aceptado que ya no es.
  ['apps/web/lib/hoy.ts', 'import "server-only";', 'import "server-only";\nimport { db as zzDb } from "./db";\nexport async function zzNueva(w: string[]) { return zzDb().query(`select 1 from users u where ${w.join(" and ")}`); }', '1 consulta(s) nueva(s) que NO se comprueba(n)', null, 'guardian'],
  ['pruebas/consultas-fuera.json', '"apps/web/lib/ninos.ts": 1', '"apps/web/lib/ninos.ts": 2', 'ahora solo 1 sin comprobar y la lista acepta 2', null, 'guardian'],
  ['pruebas/consultas-fuera.json', '"apps/web/lib/ninos.ts": 1,', '', 'consulta(s) nueva(s) que NO se comprueba(n)', null, 'guardian'],
];
const soloTextos = !!process.env.ALREVES_SOLO_TEXTOS;
const correr = (g) => {
  const r = g ? spawnSync('node', ['guardianes/run.mjs', '--solo', G], { cwd: R, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }) : spawnSync('node', ['pruebas/e2e/sql9u.cjs'], { cwd: R, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { st: r.status, txt: `${r.stdout || ''}\n${r.stderr || ''}` };
};
let bien = 0, total = 0;
for (const [f, a, b, msg, en, quien] of casos) {
  total++;
  const g = quien === 'guardian', ruta = path.join(R, f), orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { console.log(`  ✗ ${g ? 'guardián' : 'sql9u'} al revés: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r;
  try { r = correr(g); } finally { fs.writeFileSync(ruta, orig); }
  const dicho = en || f;
  const cazo = r.st !== 0 && r.txt.includes(dicho) && (soloTextos || r.txt.includes(msg)) && (!g || r.txt.includes(`[${G}]`));
  console.log(`  ${cazo ? '✓' : '✗'} ${g ? 'guardián' : 'sql9u'} al revés (${path.basename(f)}: «${msg}»)${cazo ? '' : r.st === 0 ? ' → no falló' : ' → falló con otra cosa: ' + (r.txt.match(/✗ .*|\[.*/) || [r.txt.slice(-200)])[0].slice(0, 200)}`);
  if (cazo) bien++;
}
const fin = correr(false), finG = correr(true);
console.log(`\n${bien}/${total} defectos cazados · sql9u limpio después: ${fin.st === 0 ? 'sí' : 'NO'} · guardián limpio después: ${finG.st === 0 ? 'sí' : 'NO'}`);
process.exit(bien === total && fin.st === 0 && finG.st === 0 ? 0 : 1);
