// Prueba al revés del guardián de 9t (19 nov): destacarEventosDelServidor (Destacados de Eventos, 0183: el equipo fija un evento arriba de Eventos de la
// ciudad; editorial, distinto de Patrocinado). Se inyecta el defecto, el guardián debe fallar con SU mensaje ([destacarEventosDelServidor]); se
// restaura. La prueba de punta a punta es evt9t.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const MIG = 'packages/db/migrations/0183_destacar_eventos.sql', L = 'apps/web/lib/crecimiento/destacados.ts', EP = 'apps/web/lib/evt-publico.ts', PG = 'apps/web/app/(app)/eventos/page.tsx',
  EV = 'apps/web/app/(app)/eventos/Eventos.tsx', AC = 'apps/web/app/admin/acciones-crecimiento.ts', CR = 'apps/web/app/admin/Crecimiento.tsx', EA = 'apps/web/app/admin/EventosAdmin.tsx',
  LE = 'apps/web/lib/evt.ts', PA = 'apps/web/app/panel/EventosPanel.tsx', OTRO = 'apps/web/lib/patrocinio-evento.ts';
const T = 'destacarEventosDelServidor';
const casos = [
  // la base: sin tope, sin candado, un evento cancelado o sin fechas, dos vivos, «quitar» en eventos, borrar, lo cancelado ocupa puesto
  [T, MIG, ">= public.cfg_int('destacados_evt_por_ciudad') then raise exception 'destacados_evt_tope'", ">= 99 then raise exception 'destacados_evt_tope'"],
  [T, MIG, "perform pg_advisory_xact_lock(hashtextextended('destacados_evt:' || new.city_id, 0));", "-- sin candado"],
  [T, MIG, "e.city_id = new.city_id and e.status <> 'cancelled'", "e.city_id = new.city_id"],
  [T, MIG, "d.listable and d.ends_at > greatest(now(), new.from_at)", "d.ends_at > greatest(now(), new.from_at)"],
  [T, MIG, "then raise exception 'destacado: ese evento ya tiene uno vivo'", "then null"],
  [T, MIG, "event_id is not null and business_id is null and mode = 'fijar'", "event_id is not null and business_id is null"],
  [T, MIG, "if tg_op = 'DELETE' then raise exception 'un destacado no se borra: se retira'; end if;", "if tg_op = 'DELETE' then return old; end if;"],
  [T, MIG, "and e.status <> 'cancelled' and exists (select 1 from public.event_dates d where d.event_id = e.id and d.listable and d.ends_at > now()))\n  select", "and true)\n  select"],
  // la vitrina: lo retirado o lo programado sale, sin VIVO, repite Patrocinados, sin tope, de otra ciudad
  [T, EP, "f.city_id = $2 and f.placement = 'eventos' and f.retired_at is null and f.from_at <= now() and f.to_at > now()", "f.city_id = $2 and f.placement = 'eventos' and f.to_at > now()"],
  [T, EP, "where ${VIVO} and d.city_id = $2 and e.status <> 'cancelled' and ${EN_RADIO(centro, R)} and ${PRIMERA()}\n                   and not exists", "where d.city_id = $2 and ${EN_RADIO(centro, R)} and ${PRIMERA()}\n                   and not exists"],
  [T, EP, "and not exists (select 1 from event_sponsorships s where s.event_id = d.event_id and s.status = 'activo'", "and not exists (select 1 from event_sponsorships s where false and s.status = 'activo'"],
  [T, EP, "select * from x order by x.fijo::bigint limit ${cfgFijadosEvt}", "select * from x order by x.fijo::bigint limit 50"],
  // la lista del día: lo destacado se repite en otra página
  [T, EP, "x.primera && !fijados.has(x.ev) && ids.length <= POR_PAGINA_EVT", "x.primera && ids.length <= POR_PAGINA_EVT"],
  [T, PG, "destacadosEventos(loc, u?.id ?? null, es)", "Promise.resolve([])"],
  // la pieza: un título inventado en vez de SectionHeader
  [T, EV, "<SectionHeader title={E2(`Destacados en ${ciudad}`, `Featured in ${ciudad}`)} />", "<h2>{E2(`Destacados en ${ciudad}`, `Featured in ${ciudad}`)}</h2>"],
  // otro archivo escribe featured
  [T, OTRO, '/* «Avísame si se libera un puesto» (Eventos de la ciudad). */', '/* «Avísame si se libera un puesto» (Eventos de la ciudad). */\nconst _x = "update featured set retired_at = now()";'],
  // fijar: sin permiso, sin la ciudad de quien fija, sin motivo, más de 30 días, sin auditoría; la ciudad desde la pantalla
  [T, L, 'if (!s.puede("mkt", "editar")) return mal("Tu rol no cambia los destacados.", "Your role cannot change featured items.");', '// sin permiso'],
  [T, L, 'if (!enCiudad(s, e.city)) return mal("Esa ciudad no es tuya.", "That city is not yours.");\n      if (!e.fin)', 'if (!e.fin)'],
  [T, L, 'if (motivo.length < 3) return mal("Escribe el motivo.", "Write the reason.");\n  const cfg = await valores("destacados_evt_por_ciudad");', 'const cfg = await valores("destacados_evt_por_ciudad");'],
  [T, L, 'if (diasEntre(d0, hasta) + 1 > 30) return mal', 'if (diasEntre(d0, hasta) + 1 > 365) return mal'],
  [T, L, 'await auditar(c, { actor: s.id, action: "mkt.destacado_evt.fijar"', 'void ({ actor: s.id, action: "mkt.destacado_evt.fijar"'],
  [T, L, 'await auditar(c, { actor: s.id, action: "mkt.destacado_evt.retirar"', 'void ({ actor: s.id, action: "mkt.destacado_evt.retirar"'],
  [T, AC, 'export async function destacadoEvtFijar(evento: string, desde: string, hasta: string, motivo: string): Promise<ResAdm> {', 'export async function destacadoEvtFijar(evento: string, desde: string, hasta: string, motivo: string, _ciudad?: string): Promise<ResAdm> {'],
  // espejo: el Super Admin sin «Retirar», la ficha del evento sin el destacado, el panel del organizador sin el aviso
  [T, CR, 'hacer: (m) => destacadoRetirar(x.id, m) }) }] : undefined };', 'hacer: async () => ({ ok: true }) }) }] : undefined };'],
  [T, EA, '...destacadoAdm(e, destacado, !!publico, !!puede.destacar, setConf, E, en),', ''],
  [T, LE, 'kind: e.kind, fechas, destacado: fx.rows[0] ?? null,', 'kind: e.kind, fechas, destacado: null,'],
  [T, PA, '  if (e.destacado) {', '  if (false && e.destacado) {'],
];
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (g, que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [g, f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(g); } finally { fs.writeFileSync(ruta, orig); }
  informe(g, f.split('/').pop(), r);
}
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
