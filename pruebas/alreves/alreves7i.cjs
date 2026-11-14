// Prueba al revés de los guardianes de 7i (Super Admin completo de El Compa, la purga, avisos de Soporte, analítica): se inyecta el defecto, el
// guardián debe fallar; se restaura.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M = 'packages/db/migrations/0124_compa_admin_config.sql', A = 'apps/web/lib/compa/admin-compa.ts', C = 'apps/web/lib/compa/conversacion.ts', BA = 'apps/web/lib/barrido.ts',
  PU = 'apps/web/lib/compa/purga.ts', AN = 'apps/web/lib/admin-analitica.ts', UI = 'apps/web/app/admin/Analitica.tsx', AV = 'apps/web/app/(app)/cuenta/avisos/Avisos.tsx', AVI = 'apps/web/lib/avisos.ts',
  SE = 'apps/web/lib/soporte-equipo.ts', CF = 'apps/web/lib/compa/canales.ts', NI = 'apps/web/lib/ninos-privado.ts';
const casos = [
  // retencionQueCorre (nuevo): una retención que se promete y no corre
  ['retencionQueCorre', BA, '        ["compaRetencion", async () => (await import("./compa/purga")).barrerRetencion()],\n', ''],
  ['retencionQueCorre', M, "declare meses integer := cfg_int('compa_retener_meses');", 'declare meses integer := 12;'],
  ['retencionQueCorre', PU, 'select compa_purgar($1) as x', 'select jsonb_build_object($1::int) as x'],
  ['retencionQueCorre', BA, '["compaCanales", async () => (await import("./compa/canales")).barrerCanales()],', '["compaCanales", async () => undefined],'],
  ['retencionQueCorre', BA, '["ninosPurga", () => ninosP.purgarNinos()]', '["ninosPurga", async () => 0]'],
  // soporteSiempreLlega (nuevo): lo del caso no se apaga
  ['soporteSiempreLlega', M, "where key in ('sop_recibido', 'sop_respuesta', 'sop_resuelto', 'compa_caso', 'compa_caso_negocio')", "where key in ('sop_recibido', 'sop_respuesta', 'sop_resuelto', 'compa_caso')"],
  ['soporteSiempreLlega', AVI, 'if ((r.grp === "community" || r.grp === "events") && apagado) return;', 'if ((r.grp === "community" || r.grp === "events") && apagado) return;\n    if (r.grp === "support" && apagado) return;'],
  ['soporteSiempreLlega', AV, 'E2("Lo de tus casos siempre te llega", "Your case updates always reach you")', 'E2("Lo de tus casos", "Your cases")'],
  ['soporteSiempreLlega', AV, '    [E2("EMPLEOS", "JOBS"),', '    [E2("SOPORTE", "SUPPORT"), [["sopR", E2("Respuestas de Soporte", "Support replies"), ""]]],\n    [E2("EMPLEOS", "JOBS"),'],
  // analiticaSinPersonas ampliado (El Compa y Soporte)
  ['analiticaSinPersonas', AN, 'from compa_analitica_dia_cache a where a.dia >= ${DESDE} and ${scope("a.city_id")} group by a.uso order by 2 desc', 'from compa_analitica_dia_cache a join compa_conversations cv on cv.city_id = a.city_id where a.dia >= ${DESDE} and ${scope("a.city_id")} group by a.uso order by 2 desc'],
  ['analiticaSinPersonas', AN, 'coalesce(sum(x.alta), 0)::int as alta,', 'coalesce(sum(x.alta), 0)::int as alta, max(x.assigned_staff_id::text) as quien,'],
  ['analiticaSinPersonas', M, "       count(*) filter (where c.origin = 'compa')::int as desde_compa,", "       max(c.user_id::text) as user_id, count(*) filter (where c.origin = 'compa')::int as desde_compa,"],
  ['analiticaSinPersonas', M, '       coalesce(c.marcadas, 0)::int as marcadas,', '       coalesce(c.marcadas, 0)::int as marcadas, null::text as query_tapada,'],
  ['analiticaSinPersonas', UI, '{ key: x.uso, icon: "chat", t: USO[x.uso] ?? x.uso, r: String(x.conversaciones),', '{ key: x.uso, icon: "chat", onClick: () => router.push(`/admin/compa?cp=${x.uso}`), t: USO[x.uso] ?? x.uso, r: String(x.conversaciones),'],
  // libroSoloInsercion ampliado: marcas, «no supo» y la purga que solo vacía, una vez
  ['libroSoloInsercion', M, "  if tg_op = 'DELETE' then raise exception 'una marca de El Compa no se borra (se quita, con motivo)'; end if;\n", "  if tg_op = 'DELETE' then return old; end if;\n"],
  ['libroSoloInsercion', M, "  raise exception 'compa_reviews: de una marca solo se quita la marca, una vez (y la purga vacía la nota)';", '  return new;'],
  ['libroSoloInsercion', M, "  if tg_op = 'DELETE' then raise exception 'lo que El Compa no supo no se borra (estados)'; end if;", "  if tg_op = 'DELETE' then return old; end if;"],
  ['libroSoloInsercion', M, "  if tg_op = 'UPDATE' and old.purged_at is null and new.purged_at is not null and new.text is null\n     and (to_jsonb(new) - array['text', 'purged_at']) = (to_jsonb(old) - array['text', 'purged_at']) then", "  if tg_op = 'UPDATE' and new.text is null then"],
  ['libroSoloInsercion', M, "    if old.purged_at is null and new.purged_at is not null and new.body is null\n       and (to_jsonb(new) - array['body', 'purged_at']) = (to_jsonb(old) - array['body', 'purged_at']) then", "    if new.body is null then"],
  ['libroSoloInsercion', M, "(to_jsonb(new) - array['summary', 'draft', 'next_step', 'purged_at']) = (to_jsonb(old) - array['summary', 'draft', 'next_step', 'purged_at'])", 'true'],
  ['libroSoloInsercion', M, "  if tg_op = 'UPDATE' and old.purged_at is null and new.purged_at is not null and new.summary is null\n     and (to_jsonb(new) - array['summary', 'purged_at']) = (to_jsonb(old) - array['summary', 'purged_at']) then", "  if tg_op = 'UPDATE' and old.purged_at is null then"],
  ['libroSoloInsercion', M, '  rk := soporte_purgar_casos(k);', '  rk := 0;'],
  ['libroSoloInsercion', SE, 'export async function barrerSoporte(): Promise<number> {', 'export async function borrarCasoPrueba(id: string) { await db().query(`update support_messages set body = null, purged_at = now() where case_id = $1`, [id]); }\nexport async function barrerSoporte(): Promise<number> {'],
  ['libroSoloInsercion', A, 'export async function quitarMarca(', 'export async function borrarMarca(id: string) { await db().query(`delete from compa_reviews where id = $1`, [id]); }\nexport async function quitarMarca('],
  // compaLecturaAnotada ampliado: ciudades, la pregunta solo para quien lee hilos, permisos de marcar
  ['compaLecturaAnotada', A, '`select id::text, city_id from compa_conversations where number = $1 and ${SUS("city_id", "$2")}`, [n, s.cities]', '`select id::text, city_id from compa_conversations where number = $1`, [n]'],
  ['compaLecturaAnotada', A, 'case when $2 then q.query_tapada end as q,', 'q.query_tapada as q,'],
  ['compaLecturaAnotada', A, '  const leer = s.puede("compa", "editar"), est =', '  const leer = s.puede("compa", "ver"), est ='],
  ['compaLecturaAnotada', A, '  if (!s.puede("compa", "editar")) return { ok: false, msg: "Tu rol no marca respuestas de El Compa." };', '  if (!s.puede("compa", "ver")) return { ok: false, msg: "Tu rol no marca respuestas de El Compa." };'],
  ['compaLecturaAnotada', A, '  if (!s.puede("compa", "editar")) return { ok: false, msg: "Tu rol no cambia esta lista." };', ''],
  ['compaLecturaAnotada', SE, 'export async function barrerSoporte(): Promise<number> {', 'export async function preguntasSinSaber() { return (await db().query(`select query_tapada from compa_unknowns limit 5`)).rows; }\nexport async function barrerSoporte(): Promise<number> {'],
  // compaTapaEnElMotor ampliado: lo que no supo, tapado y solo desde el motor
  ['compaTapaEnElMotor', C, 'if (r.tipo === "no_se") await anotarNoSupo(c, { conv: conv.id, ciudad, audiencia: "vecino", lang, texto: t.texto });', 'if (r.tipo === "no_se") await anotarNoSupo(c, { conv: conv.id, ciudad, audiencia: "vecino", lang, texto: crudo });'],
  ['compaTapaEnElMotor', C, '      if (r.tipo === "no_se") await anotarNoSupo(c, { conv: conv.id, ciudad, audiencia: "negocio", lang, texto: t.texto });', ''],
  ['compaTapaEnElMotor', M, "    if texto_con_secretos(new.query_tapada) then raise exception 'compa_sin_secretos: la pregunta no guarda números de tarjeta ni de seguro social'; end if;\n", ''],
  ['compaTapaEnElMotor', A, 'export async function quitarMarca(', 'export async function anotarAMano(c: import("pg").PoolClient, t: string) { await c.query(`insert into compa_unknowns (conversation_id, city_id, audience, query_tapada) values (1, $1, \'vecino\', $1)`, [t]); }\nexport async function quitarMarca('],
  // barridoCompleto: la purga corre en el barrido
  ['barridoCompleto', BA, '(await import("./compa/purga")).barrerRetencion()', 'Promise.resolve(0)'],
];
let bien = 0;
for (const [g, f, a, b] of casos) {
  const ruta = `${R}/${f}`;
  if (!fs.existsSync(ruta)) { console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let falla = false, out = '';
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); } catch (e) { falla = true; out = String(e.stderr).split('\n').find((l) => l.includes('[')) || ''; }
  fs.writeFileSync(ruta, orig);
  console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${f.split('/').pop()})${out ? ' → ' + out.trim().slice(0, 150) : ''}`); if (falla) bien++;
}
console.log(`\n${bien}/${casos.length} al revés`);
execSync('node guardianes/run.mjs', { cwd: R, stdio: 'inherit' });
// 9b-3 · alrevesQueFalla: un defecto sin cazar pone la prueba en rojo (antes salía con 0 y el CI la contaba en verde).
if (bien !== casos.length) process.exit(1);
