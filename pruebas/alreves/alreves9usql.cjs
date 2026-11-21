// Prueba al revés de 9u · sql9u (toda consulta fija prepara en Postgres). Cada caso rompe una consulta a propósito y sql9u tiene que fallar diciendo el
// archivo y SU error (el texto de cada caso abajo); después se restaura y sql9u vuelve a pasar:
//   el campo de JSON tras `||` sin paréntesis de «Asignar a…» · el update de «Mi casa» que no usa $1 ni $2 · una columna que no existe · una coma de más.
// Necesita la base de pruebas arriba (pruebas/servir/base.sh): no necesita el servidor.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const R = ENT.RAIZ;
const casos = [
  ['apps/web/app/admin/acciones-colas.ts', "|| ' · ' || (r.name->>'es') as nombre", "|| ' · ' || r.name->>'es' as nombre", 'operator does not exist: text ->> unknown'],
  ['apps/web/lib/oficios-publico.ts', 'where id = $15 and user_id = $1 and address_id = $2 returning id::text', 'where id = $15 returning id::text', 'could not determine data type of parameter $1'],
  ['apps/web/lib/oficios-publico.ts', 'select count(*)::int as n from user_homes where user_id = $1 and removed_at is null', 'select count(*)::int as n from user_homes where user_id = $1 and quitada_el is null', 'column "quitada_el" does not exist'],
  ['apps/web/lib/barrido.ts', 'insert into system_jobs (name, last_run_at, last_ok_at, last_ms, last_error, runs, errors) values', 'insert into system_jobs (name, last_run_at, last_ok_at, last_ms, last_error, runs, errors,) values', 'syntax error at or near ")"'],
];
const soloTextos = !!process.env.ALREVES_SOLO_TEXTOS;
const correr = () => { const r = spawnSync('node', ['pruebas/e2e/sql9u.cjs'], { cwd: R, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); return { st: r.status, txt: `${r.stdout || ''}\n${r.stderr || ''}` }; };
let bien = 0, total = 0;
for (const [f, a, b, msg] of casos) {
  total++;
  const ruta = path.join(R, f), orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { console.log(`  ✗ sql9u al revés: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r;
  try { r = correr(); } finally { fs.writeFileSync(ruta, orig); }
  const cazo = r.st !== 0 && r.txt.includes(f) && (soloTextos || r.txt.includes(msg));
  console.log(`  ${cazo ? '✓' : '✗'} sql9u al revés (${path.basename(f)}: «${msg}»)${cazo ? '' : r.st === 0 ? ' → sql9u no falló' : ' → falló con otra cosa: ' + (r.txt.match(/✗ .*/) || [r.txt.slice(-200)])[0].slice(0, 200)}`);
  if (cazo) bien++;
}
const fin = correr();
console.log(`\n${bien}/${total} defectos cazados · sql9u limpio después: ${fin.st === 0 ? 'sí' : 'NO'}`);
process.exit(bien === total && fin.st === 0 ? 0 : 1);
