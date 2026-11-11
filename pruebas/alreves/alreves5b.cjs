// Prueba al revés de los guardianes de 5b: se inyecta el defecto, el guardián debe fallar; se restaura.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M8 = 'packages/db/migrations/0098_hilo_votos_encuestas.sql', H = 'apps/web/lib/comunidad-hilo.ts';
const casos = [
  ['votoUnico', 'packages/db/migrations/0097_comunidad_base.sql', '  primary key (target_kind, target_id, user_id)\n);', '  id bigint\n);'],
  ['votoUnico', M8, "if autor = new.user_id then raise exception 'lo propio no se vota'; end if;", ''],
  ['votoUnico', M8, "new.counted := not exists (select 1 from com_votes o where o.target_kind = new.target_kind and o.target_id = new.target_id and o.device = new.device and o.user_id <> new.user_id);", 'new.counted := true;'],
  ['votoUnico', M8, "  if tg_op in ('UPDATE', 'DELETE') and old.counted then", "  if tg_op in ('UPDATE', 'DELETE') then"],
  ['votoUnico', H, '    if (t.autor === userId) return no("Lo tuyo lo votan los demás.", "Others vote on your posts.");\n', ''],
  ['votoUnico', 'apps/web/app/admin/acciones-comunidad.ts', '"use server";', '"use server";\nconst q = `insert into com_votes (target_kind, target_id, user_id, v) values ($1, $2, $3, 1)`;'],
  ['saldoDerivado', 'apps/web/app/admin/acciones-comunidad.ts', "`update com_posts set comments_locked_at = $2 where id = $1::bigint`", "`update com_posts set comments_locked_at = $2, score = 0 where id = $1::bigint`"],
  ['saldoDerivado', H, "await c.query(`insert into com_saves (post_id, user_id) values ($1::bigint, $2) on conflict do nothing`, [id, userId]);", "await c.query(`insert into com_saves (post_id, user_id) values ($1::bigint, $2) on conflict do nothing`, [id, userId]);\n    await c.query(`insert into com_thread_recs (post_id, business_id, city_id) values (1, 'x', 'hzl')`);"],
  ['saldoDerivado', H, '  if (!r.ok) return r;\n  if (r.subir) await recalcularRango(r.subir).catch(() => undefined);\n  // Llegó a 10 votos', "  if (!r.ok) return r;\n  if (r.subir) await recalcularRango(r.subir).catch(() => undefined);\n  await db().query(`select set_config('tl.derivados', 'si', true)`);\n  // Llegó a 10 votos"],
  ['saldoDerivado', M8, "  if not com_derivados_ok() then raise exception 'com_thread_recs es derivado: solo lo escribe com_recs_recalcular()'; end if;", ''],
  ['bloqueoAlEscribir', H, '    const t = kind === "post" ? await tocable(c, userId, id) : await comentarioTocable(c, userId, id);', '    const t = { autor: null as string | null, body: "" };'],
  ['bloqueoAlEscribir', H, '        and ${sinBloqueos("u.id", "$1")} and ${sinBloqueos("$1", "u.id")}`,', '        `,'],
  ['bloqueoAlEscribir', H, '  for (const a of r.avisos) await avisar(a.id, a.tpl,', '  if (r.post) await avisar(userId, "com_comment", { nombre: "", texto: "" });\n  for (const a of r.avisos) await avisar(a.id, a.tpl,'],
  ['bloqueoAlEscribir', H, 'where v.post_id = $1::bigint and ${sinBloqueos("$2::uuid", "v.user_id")}`', 'where v.post_id = $1::bigint and $2::uuid is not distinct from $2::uuid`'],
  ['avisoComunidadSinSms', M8, "('com_reply', 'tx', null, false,", "('com_reply', 'tx', null, true,"],
  ['comunidadSinTelefonos', H, '  const f = revisarComentario({ body: e.body, business: e.business });\n  if (f) return { ok: false, msg: f.msg, campo: f.campo };\n', ''],
  ['noTePromuevas', H, '      if (await esSuNegocio(c, userId, b.id)) return no(', '      if (false && await esSuNegocio(c, userId, b.id)) return no('],
  ['barridoCompleto', 'apps/web/lib/barrido.ts', '        ["cerrarEncuestas", () => com.barrerEncuestas()],\n', ''],
  ['bloqueoMutuo', H, "    `select x.id::text, x.author_user_id::text as autor from com_comments x where x.id = any($1::bigint[]) and ${sinBloqueos(\"x.author_user_id\", \"$2\")}`", "    `select x.id::text, x.author_user_id::text as autor from com_comments x where x.id = any($1::bigint[]) and $2::uuid is not null`"],
];
let bien = 0;
for (const [g, f, a, b] of casos) {
  const ruta = `${R}/${f}`, orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, b));
  let falla = false, out = '';
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); } catch (e) { falla = true; out = String(e.stderr).split('\n').find((l) => l.includes('[')) || ''; }
  fs.writeFileSync(ruta, orig);
  console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${f.split('/').pop()})${out ? ' → ' + out.trim().slice(0, 140) : ''}`); if (falla) bien++;
}
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch { limpio = false; }
console.log(`${bien}/${casos.length} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === casos.length && limpio ? 0 : 1);
