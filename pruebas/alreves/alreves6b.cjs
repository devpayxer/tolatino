// Prueba al revés de los guardianes de 6b: se inyecta el defecto, el guardián debe fallar; se restaura.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M7 = 'packages/db/migrations/0107_eventos_publico.sql', EP = 'apps/web/lib/evt-publico.ts', RS = 'apps/web/lib/rsvp.ts', PT = 'apps/web/lib/punto.ts',
  NP = 'apps/web/lib/noche-publico.ts', EV = 'apps/web/app/(app)/eventos/Eventos.tsx', AC = 'apps/web/app/(app)/eventos/acciones.ts',
  FI = 'apps/web/app/(app)/eventos/[slug]/FichaEvento.tsx', CF = 'apps/web/lib/config.ts', EVL = 'apps/web/lib/eventos.ts', BA = 'apps/web/lib/barrido.ts', IN = 'apps/web/app/(app)/Inicio.tsx';
const casos = [
  // eventosSoloListables (nuevo)
  ['eventosSoloListables', M7, "select e.status in ('live', 'paused') and e.approved_at is not null and e.hidden_at is null and st = 'scheduled' and evt_negocio_publico(e.business_id)", "select e.status in ('live', 'paused') and e.approved_at is not null and e.hidden_at is null and st = 'scheduled'"],
  ['eventosSoloListables', M7, "and not (coalesce(b.modules_off, '{}'::jsonb) ? 'eventos')", ""],
  ['eventosSoloListables', M7, "     and not exists (select 1 from event_organizers o where o.business_id = neg and o.blocked_at is not null)\n", "\n"],
  ['eventosSoloListables', M7, "create trigger businesses_evt_relistar after update on businesses", "create trigger businesses_evt_relistar_x after update on businesses"],
  ['eventosSoloListables', EP, "const VIVO = `d.listable and d.starts_at", "const VIVO = `d.starts_at"],
  ['eventosSoloListables', EP, "${DESDE_T} where ${VIVO} and d.city_id = $2 and d.local_date <= $3::date", "${DESDE_T} where d.city_id = $2 and d.local_date <= $3::date"],
  ['eventosSoloListables', NP, "and exists (select 1 from event_dates d where d.event_id = e.id and d.listable and d.ends_at > now())", "and exists (select 1 from event_dates d where d.event_id = e.id and d.ends_at > now())"],
  ['eventosSoloListables', RS, "f.kind = 'event' and d.listable", "f.kind = 'event'"],
  // eventosConCursor (nuevo)
  ['eventosConCursor', EP, "order by d.starts_at, d.id limit ${POR_PAGINA_EVT + 1}`, v)", "order by d.starts_at, d.id limit ${POR_PAGINA_EVT + 1} offset 0`, v)"],
  ['eventosConCursor', EP, "w.push(`(d.starts_at, d.id) > ($${v.length - 1}::timestamptz, $${v.length}::bigint)`)", "w.push(`d.starts_at > $${v.length - 1}::timestamptz and $${v.length}::bigint > 0`)"],
  ['eventosConCursor', EP, "export const POR_PAGINA_EVT = 20;", "export const POR_PAGINA_EVT = 200;"],
  ['eventosConCursor', EV, "const verMas = async () => {", "const saltar = (n: number) => `offset ${n}`; void saltar;\n  const verMas = async () => {"],
  // rsvpConCupo (nuevo)
  // 9a · la última definición de cada función es la que vive (0112 redefine el cupo del día): ahí se rompe.
  ['rsvpConCupo', M7, "  select * into d from event_dates where id = new.event_date_id for update;", "  select * into d from event_dates where id = new.event_date_id;"],
  ['rsvpConCupo', M7, "  if e.rsvp_capacity > 0 and d.rsvp_n - antes + new.party > e.rsvp_capacity then raise exception 'evt_cupo_lleno: quedan % lugares', greatest(0, e.rsvp_capacity - d.rsvp_n + antes); end if;\n", ""],
  ['rsvpConCupo', 'packages/db/migrations/0112_puerta.sql', "  if dh > 0 and cap > 0 and n > cap then raise exception 'evt_cupo_lleno: el cupo se llenó'; end if;\n", ""],
  ['rsvpConCupo', M7, "and coalesce(current_setting('tl.evt_derivado', true), '') <> 'si' then\n    raise exception", "and false then\n    raise exception"],
  ['rsvpConCupo', RS, "if (ya) { if (ya.party !== party) await c.query(`update rsvps set party = $2 where id = $1::bigint`, [ya.id, party]); }", "if (ya) { if (ya.party !== party) await c.query(`update rsvps set party = $2 where id = $1::bigint`, [ya.id, party]); await c.query(`update event_dates set rsvp_n = rsvp_n + $2 where id = $1::bigint`, [fechaId, party]); }"],
  ['rsvpConCupo', AC, "export async function evtCompartir(", "export async function evtVoyDirecto(f: string) { if (!(await mismoOrigen())) return; await db().query(`insert into rsvps (event_date_id, party) values ($1, 1)`, [f]); }\nexport async function evtCompartir("],
  ['rsvpConCupo', M7, "create trigger events_cupo before update of rsvp_capacity on events", "create trigger events_cupo_x before update of rsvp_capacity on events"],
  // hoySoloEnVivo (ampliado: novedad con evento)
  ['hoySoloEnVivo', M7, "     and (p.link_kind <> 'event' or exists (select 1 from event_dates d join events e on e.id = d.event_id\n                                              where d.event_id = p.event_id and e.business_id = p.business_id and d.listable and d.ends_at > now()));", "     and true;"],
  ['hoySoloEnVivo', M7, "where d.event_id = p.event_id and e.business_id = p.business_id and d.listable and d.ends_at > now()));", "where d.event_id = p.event_id and e.business_id = p.business_id and d.ends_at > now()));"],
  // puntoPublico (ampliado: punto y dirección del evento)
  ['puntoPublico', PT, "when ${b}.works_from_home then round(st_y(${b}.geo::geometry)", "when false then round(st_y(${b}.geo::geometry)"],
  ['puntoPublico', PT, "when ${b}.works_from_home then null else ${b}.address end", "else ${b}.address end"],
  ['puntoPublico', EP, "venue, ${DIRECCION_EVENTO(\"e\", \"b\")} as addr", "venue, b.address as addr"],
  ['puntoPublico', EP, "${PUNTO_EVENTO(\"e\", \"b\")},", "st_y(d.geom::geometry) as lat, st_x(d.geom::geometry) as lng,"],
  // configDesdeUnLugar (el plazo del RSVP sale de Configuración)
  ['configDesdeUnLugar', FI, "hasta ${f.guardaMin} min después de abrir puertas. Si ya no vas", "hasta 30 min después de abrir puertas. Si ya no vas"],
  ['configDesdeUnLugar', CF, '  | "rsvp_guarda_min"\n', '\n'],
  // eventosEnLista (los nombres nuevos de la analítica)
  ['eventosEnLista', EVL, '| "ver_evento" | "rsvp" | "guardar_evento" | "compartir_evento" |', '| "ver_evento" | "rsvp" | "guardar_evento" |'],
  // barridoCompleto (vencer RSVP en el barrido)
  ['barridoCompleto', BA, '["rsvpVencer", () => rsvp.vencerRsvp()], ', ''],
  // rutasVivas (los enlaces nuevos van a pantallas que existen)
  ['rutasVivas', IN, 'onAction={() => router.push("/eventos")} />', 'onAction={() => router.push("/eventos-semana")} />'],
  // codigoPuerta (el código del RSVP no sale en la app)
  ['codigoPuerta', RS, "      `select d.id::text as fid, e.slug, e.title,", "      `select d.id::text as fid, r.door_code, e.slug, e.title,"],
];
let bien = 0;
for (const [g, f, a, b] of casos) {
  const ruta = `${R}/${f}`;
  if (!fs.existsSync(ruta)) { console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, b));
  let falla = false, out = '';
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); } catch (e) { falla = true; out = String(e.stderr).split('\n').find((l) => l.includes('[')) || ''; }
  fs.writeFileSync(ruta, orig);
  console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${f.split('/').pop()})${out ? ' → ' + out.trim().slice(0, 150) : ''}`); if (falla) bien++;
}
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch { limpio = false; }
console.log(`${bien}/${casos.length} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === casos.length && limpio ? 0 : 1);
