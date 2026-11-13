// Prueba al revés de los guardianes de 6f: se inyecta el defecto, el guardián debe fallar; se restaura.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M = 'packages/db/migrations/0111_series_y_dias.sql', S6 = 'apps/web/lib/evt-series.ts', BA = 'apps/web/lib/barrido.ts', L = 'apps/web/lib/boletos.ts', P = 'apps/web/lib/evt-publico.ts',
  E = 'apps/web/lib/evt.ts', AE = 'apps/web/app/panel/acciones-eventos.ts';
const casos = [
  // fechasLasGeneraLaBase
  ['fechasLasGeneraLaBase', E, "/* Enviar lo guardado", "export async function crearFecha(id: string) { await db().query(`insert into event_dates (event_id, city_id, starts_at, ends_at, doors_at, local_date) select id, city_id, now(), now(), now(), now() from events where id = $1`, [id]); }\n/* Enviar lo guardado"],
  ['fechasLasGeneraLaBase', AE, "export async function evtSaltar(", "export async function evtBorrarFecha(n: string, f: string) { await db().query(`delete from event_dates where id = $1`, [f]); return { ok: true } as Res; }\nexport async function evtSaltar("],
  ['fechasLasGeneraLaBase', M, "maxn := least((e.rep->>'n')::int, cfg_int('evt_fechas_max'));", "maxn := (e.rep->>'n')::int;"],
  ['fechasLasGeneraLaBase', M, "  tope := hoy + cfg_int('evt_dias_adelante');", "  tope := hoy + 180;"],
  ['fechasLasGeneraLaBase', M, "      if d.status = 'scheduled' and not evt_fecha_con_gente(d.id) then update event_dates set status = 'skipped' where id = d.id; n := n + 1; end if;", "      if d.status = 'scheduled' then update event_dates set status = 'skipped' where id = d.id; n := n + 1; end if;"],
  ['fechasLasGeneraLaBase', M, "     and (z.serie_dia is null or not (z.serie_dia = any(dias))) and not evt_fecha_con_gente(z.id);", "     and (z.serie_dia is null or not (z.serie_dia = any(dias)));"],
  ['fechasLasGeneraLaBase', M, "if d.moved_at is null and d.starts_at > now() and not evt_fecha_con_gente(d.id) and", "if d.starts_at > now() and"],
  ['fechasLasGeneraLaBase', M, "  select exists (select 1 from event_dates d where d.id = fid and (d.sold_n > 0 or d.rsvp_n > 0))", "  select exists (select 1 from event_dates d where d.id = fid and d.sold_n > 0)"],
  ['fechasLasGeneraLaBase', S6, "        if (d.gente) throw", "        if (false) throw"],
  ['fechasLasGeneraLaBase', BA, '["evtSeries", () => ser.extenderSeries()],', ""],
  // aforoPorDia
  ['aforoPorDia', M, "  constraint event_day_stock_cupo check (capacity = 0 or sold_n + held_n <= capacity)", "  constraint event_day_stock_cupo check (capacity >= 0)"],
  ['aforoPorDia', M, "create trigger ticket_stock_dia after update of held_n, sold_n on ticket_stock for each row execute function ticket_stock_dia();", "-- sin trigger"],
  ['aforoPorDia', M, "and (t.valid_day is null or d.day_index = t.valid_day);\n  return null;", "and d.day_index = coalesce(t.valid_day, 0);\n  return null;"],
  ['aforoPorDia', M, "create trigger tickets_dias before insert on tickets for each row execute function tickets_dias();", "-- sin trigger"],
  ['aforoPorDia', M, "where t.event_id = eid and d.status = 'scheduled' and (e.kind <> 'span' or d.id = ancla)", "where t.event_id = eid and d.status = 'scheduled'"],
  ['aforoPorDia', L, " and bol_tipo_hasta(t.id) > now()\n              and s.event_date_id = $2::bigint", "\n              and s.event_date_id = $2::bigint"],
  ['aforoPorDia', L, '(e as { constraint?: string }).constraint === "event_day_stock_cupo") return { ok: false, msg: { es: "Un día', '(e as { constraint?: string }).constraint === "otro") return { ok: false, msg: { es: "Un día'],
  ['aforoPorDia', S6, "/* Barrido: las series", "export async function subirAforo(f: string) { await db().query(`update event_day_stock set capacity = capacity + 10 where event_date_id = $1`, [f]); }\n/* Barrido: las series"],
  // serieUnaVezEnLista
  ['serieUnaVezEnLista', P, "then ${ES_PRIMERA(enP(ff))} else false end", "then true else false end"],
  ['serieUnaVezEnLista', P, " and ${EN_RADIO(centro, R)} and ${PRIMERA(\"p.local_date = $3::date\")}", " and ${EN_RADIO(centro, R)}"],
  ['serieUnaVezEnLista', P, "e.business_id = $2 and ${PRIMERA()} order by", "e.business_id = $2 order by"],
  ['serieUnaVezEnLista', P, "and (p.starts_at, p.id) < (d.starts_at, d.id))`;", "and p.starts_at < d.starts_at)`;"],
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
