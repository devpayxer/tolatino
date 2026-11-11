// Prueba al revés de los guardianes de 5d: se inyecta el defecto, el guardián debe fallar; se restaura.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const MO = 'apps/web/lib/moderacion.ts', AP = 'apps/web/lib/apelaciones.ts', M = 'packages/db/migrations/0100_moderacion_apelaciones.sql', AC = 'apps/web/app/admin/acciones-comunidad.ts';
const ACO = 'apps/web/app/admin/acciones-colas.ts', ACF = 'apps/web/app/admin/acciones-confianza.ts', AU = 'apps/web/app/admin/acciones-usuarios.ts', ADM = 'apps/web/lib/admin-dm.ts';
const casos = [
  // ocultarAvisaYApela: cada camino que oculta o sanciona avisa con motivo y apelación.
  ['ocultarAvisaYApela', AC, '    if (ocultar) await avisarOculto(h.p.autor, "com_post", id, String(h.m));', '    if (ocultar) void 0;'],
  ['ocultarAvisaYApela', AC, '  if (ocultar) await avisarOculto(e.x.autor, "com_comment", id, m);', '  if (ocultar) void 0;'],
  ['ocultarAvisaYApela', ACO, '    await avisarOculto(r.autor, "dm_message", r.id, m);', '    void r;'],
  ['ocultarAvisaYApela', ACO, '  if (sid && autor && sk) await (await import("@/lib/apelaciones")).avisarSancion(autor, sid, sk, m);', ''],
  ['ocultarAvisaYApela', AU, '  if (r.ok && h) await avisarSancion(id, h.sid, kind, h.m);', ''],
  ['ocultarAvisaYApela', MO, '  if (r.auto) await avisarOculto(r.auto.autor, r.auto.kind as "com_post" | "com_comment", id, r.auto.motivo, { auto: true });', ''],
  ['ocultarAvisaYApela', ACF, '  if (accion === "quitar" && r.autor) await avisarOculto(r.autor, "media", r.tid, m);', ''],
  ['ocultarAvisaYApela', 'apps/web/lib/vecinos.ts', 'import "server-only";', 'import "server-only";\nexport async function castigar(c: import("pg").PoolClient, u: string) { await c.query(`insert into sanctions (target_kind, target_id, kind, reason, by_staff) values (\'user\', $1, \'adv\', \'x\', $1)`, [u]); }'],
  ['ocultarAvisaYApela', AP, '{ href: RUTA_AVISO(k, id), ref: [k, id], sinSms: true }', '{ href: "/comunidad", ref: [k, id], sinSms: true }'],
  // apelacionOtraPersona: la base y la app impiden que decida quien sancionó.
  ['apelacionOtraPersona', M, "    if old.sanctioned_by is not null and new.decided_by = old.sanctioned_by then raise exception 'la apelación la decide otra persona, no quien sancionó'; end if;\n", ''],
  ['apelacionOtraPersona', M, '  check (decided_by is null or sanctioned_by is null or decided_by <> sanctioned_by),\n', ''],
  ['apelacionOtraPersona', M, '  new.sanctioned_by := x.por;', '  new.sanctioned_by := coalesce(new.sanctioned_by, x.por);'],
  ['apelacionOtraPersona', AP, '  if (a.por === staffId) return { err: "Tú ocultaste o sancionaste esto: la apelación la decide otra persona del equipo." };\n', ''],
  ['apelacionOtraPersona', ACF, 'import type { ResAdm } from "./acciones-colas";', 'import type { ResAdm } from "./acciones-colas";\nexport async function forzar(id: string) { const s = await quien(); if (!s) return; await tx((c) => c.query(`update appeals set status = \'lifted\', decided_by = $2 where id = $1`, [id, s.id])); }'],
  // libroSoloInsercion
  ['libroSoloInsercion', M, 'create trigger mod_flags_no_cambia before update or delete on mod_flags for each row execute function mod_flags_inmutable();', ''],
  ['libroSoloInsercion', M, "  if tg_op = 'DELETE' then raise exception 'una apelación no se borra'; end if;\n", ''],
  ['libroSoloInsercion', MO, 'export const olvidarReglas', 'export async function limpiar() { await db().query(`delete from mod_flags where created_at < now() - interval \'1 year\'`); }\nexport const olvidarReglas'],
  // limitesEnServidor: cada escritura pide limiteDia antes de escribir.
  ['limitesEnServidor', 'apps/web/lib/comunidad.ts', '    const lim = await limiteDia(c, userId, "publicaciones");\n    if (!lim.ok) return lim;\n', ''],
  ['limitesEnServidor', 'apps/web/lib/comunidad-hilo.ts', '    const lim = await limiteDia(c, userId, "comentarios");\n    if (!lim.ok) return lim;\n', ''],
  ['limitesEnServidor', 'apps/web/lib/comunidad-hilo.ts', '      const lim = await limiteDia(c, userId, "votos");\n      if (!lim.ok) return lim;\n', ''],
  ['limitesEnServidor', MO, '    const lim = await limiteDia(c, viewer, "reportes");\n    if (!lim.ok) return lim;\n', ''],
  ['limitesEnServidor', MO, "  await c.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [`lim:${que}:${userId}`]);\n", ''],
  ['limitesEnServidor', MO, '  const tope = u.nueva ? Math.max(1, Math.floor(u.tope / 2)) : u.tope;', '  const tope = u.tope;'],
  ['limitesEnServidor', M, "  ('com_lim_votos', '500',", "  ('com_lim_votoz', '500',"],
  // reportesSinManada: auto-ocultar cuenta personas, no cuentas del mismo dispositivo.
  ['reportesSinManada', MO, "            array(select distinct s.device::text from sessions s where s.user_id = cr.reporter_user_id and s.device is not null) as devs", "            '{}'::text[] as devs"],
  ['reportesSinManada', MO, 'if (peso < umbral) return null;', 'if (F.length < umbral) return null;'],
  ['reportesSinManada', MO, '.filter((x) => x.vieja);', ';'],
  ['reportesSinManada', 'apps/web/app/(app)/comunidad/acciones.ts', 'uid(id) : texto(id, 20), texto(motivo, 20), texto(nota, 400), await dispositivo(false));', 'uid(id) : texto(id, 20), texto(motivo, 20), texto(nota, 400), texto(motivo, 40));'],
  ['reportesSinManada', 'apps/web/app/admin/acciones-comunidad.ts', '"use server";', '"use server";\nconst Q = `update com_posts set status = \'hidden\', hidden_by = \'auto\', hidden_reason = \'x\' where id = 1`; void Q;'],
  // dmSoloConReporte con la llave nueva (CON_APELACION) y mensajeSoloAQuienTeSigue con el límite movido.
  ['dmSoloConReporte', ADM, "and ap.status = 'open')`;", "and ap.status in ('open', 'lifted'))`;"],
  ['dmSoloConReporte', ADM, ' where m.id = $1::bigint and m.hidden_at is not null and ${CON_APELACION("m.id")}`', ' where m.id = $1::bigint and m.hidden_at is not null`'],
  ['mensajeSoloAQuienTeSigue', 'apps/web/lib/mensajes-vecinos.ts', '      const lim = await limiteDia(c, viewer, "conversaciones");\n      if (!lim.ok) return lim;\n', ''],
  ['avisoConPlantilla', AP, '"com_cm_autohide"', '"com_cm_autoesconde"'],
  ['reporteConLlave', MO, "         on conflict (target_kind, target_id, reporter_user_id) do nothing`, [kind", "`, [kind"],
];
let bien = 0;
for (const [g, f, a, b] of casos) {
  const ruta = `${R}/${f}`, orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 60)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, b));
  let falla = false, out = '';
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); } catch (e) { falla = true; out = String(e.stderr).split('\n').find((l) => l.includes('[')) || ''; }
  fs.writeFileSync(ruta, orig);
  console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${f.split('/').pop()})${out ? ' → ' + out.trim().slice(0, 130) : ''}`); if (falla) bien++;
}
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch { limpio = false; }
console.log(`${bien}/${casos.length} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === casos.length && limpio ? 0 : 1);
