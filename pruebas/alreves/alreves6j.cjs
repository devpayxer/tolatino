// Prueba al revés de los guardianes de 6j (cierre de la Fase 6): se inyecta el defecto, el guardián debe fallar; se restaura.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M = 'packages/db/migrations/0115_eventos_admin_config.sql', AV = 'apps/web/lib/avisos.ts', PF = 'apps/web/lib/perfil.ts', EA = 'apps/web/lib/evt-admin.ts', AC = 'apps/web/app/admin/acciones-eventos.ts',
  AN = 'apps/web/lib/admin-analitica.ts', UI = 'apps/web/app/admin/Analitica.tsx', IN = 'apps/web/app/admin/page.tsx', EV = 'apps/web/app/admin/eventos/page.tsx', PU = 'apps/web/app/(puerta)/puerta/Inicio.tsx', PP = 'apps/web/app/panel/EventosPuerta.tsx';
const casos = [
  // avisoTituloLleno
  ['avisoTituloLleno', AV, 'title = llenar(es ? r.title.es : r.title.en, v).slice(0, 120)', 'title = es ? r.title.es : r.title.en'],
  ['avisoTituloLleno', AV, 'llenar(t.title.es, v.es).slice(0, 120), llenar(t.title.en, v.en).slice(0, 120)', 't.title.es, t.title.en'],
  // eventosCriticoSiempreLlega
  ['eventosCriticoSiempreLlega', M, " where key in ('bol_comprado', 'bol_reemitido',", " where key in ('bol_reemitido',"],
  ['eventosCriticoSiempreLlega', M, "where key in ('rsvp_ok', 'rsvp_vence',", "where key in ('bol_transfer_in', 'rsvp_ok', 'rsvp_vence',"],
  ['eventosCriticoSiempreLlega', M, "update notif_templates set grp = 'events', pref = 'evtG' where key = 'evt_guardado_cerca'", "update notif_templates set grp = 'events', pref = 'evtG' where key = 'evt_movido'"],
  ['eventosCriticoSiempreLlega', AV, 'if ((r.grp === "community" || r.grp === "events") && apagado) return;', 'if ((r.grp === "community" || r.grp === "events") && (apagado || r.prefs?.evt === false)) return;'],
  ['eventosCriticoSiempreLlega', PF, '"msg", "evt", "evtR", "evtG", "hoy"', '"msg", "evt", "hoy"'],
  // ajusteAdminConRegla
  ['ajusteAdminConRegla', M, "create trigger ticket_stock_cupo_admin before insert or update on ticket_stock for each row execute function evt_cupo_admin();", "-- sin trigger"],
  ['ajusteAdminConRegla', M, "create trigger event_day_stock_cupo_admin before insert or update on event_day_stock for each row execute function evt_cupo_admin();", "-- sin trigger"],
  ['ajusteAdminConRegla', M, "check (sales_extended_until is null or sales_extended_until <= starts_at)", "check (sales_extended_until is null or sales_extended_until <= ends_at)"],
  ['ajusteAdminConRegla', M, "then least(d.starts_at, greatest(d.sales_extended_until,", "then (greatest(d.sales_extended_until,"],
  ['ajusteAdminConRegla', M, " where v.n > s.quantity or s.sold_n + s.held_n > s.quantity\nunion all", " where s.sold_n + s.held_n > s.quantity\nunion all"],
  ['ajusteAdminConRegla', EA, '      if (n < x.usado) return no(`No baja de lo vendido y apartado: ${x.usado}.`);\n', ''],
  ['ajusteAdminConRegla', EA, "    await auditar(c, { actor: s.id, action: \"evento.venta.extender\"", "    void ({ actor: s.id, action: \"evento.venta.extender\""],
  ['ajusteAdminConRegla', AC, 'export async function evtCupo(fecha: string, kind: string, ref: string | null, cantidad: string, motivo: string): Promise<ResAdm> {\n  const s = await requerir("evt", "editar");', 'export async function evtCupo(fecha: string, kind: string, ref: string | null, cantidad: string, motivo: string): Promise<ResAdm> {\n  const s = await requerir("evt", "ver");'],
  ['ajusteAdminConRegla', IN, 'await (await import("@/lib/evt-admin")).sobreventa(s)', '[] as never[]'],
  ['ajusteAdminConRegla', EV, ' kpiBoletosAdmin(s), sobreventa(s),', ' kpiBoletosAdmin(s), Promise.resolve([]),'],
  // analiticaSinPersonas (Eventos)
  ['analiticaSinPersonas', AN, 'from evt_ventas_negocio_dia_cache v join cities ci on ci.id = v.city_id', 'from evt_ventas_negocio_dia_cache v join cities ci on ci.id = v.city_id join users u on u.id = v.business_id::uuid'],
  ['analiticaSinPersonas', AN, "select v.negocio, ci.name as ciudad, sum(v.ordenes)", "select v.negocio, ci.name as ciudad, max(v.holder_user_id::text) as uid, sum(v.ordenes)"],
  ['analiticaSinPersonas', M, "select o.city_id, (p.captured_at at time zone ci.timezone)::date as dia, o.business_id, b.name as negocio, count(distinct o.id)::int as ordenes,", "select o.city_id, (p.captured_at at time zone ci.timezone)::date as dia, o.business_id, o.user_id, b.name as negocio, count(distinct o.id)::int as ordenes,"],
  ['analiticaSinPersonas', M, "select k.city_id, k.dia, coalesce(s.pedidas, 0)::int as pedidas,", "select k.city_id, k.dia, (select max(user_id::text) from operations) as phone, coalesce(s.pedidas, 0)::int as pedidas,"],
  ['analiticaSinPersonas', UI, 'const deVistas = (x: number) =>', 'const irA = (u: { uid: string }) => router.push(`/admin/usuarios/${u.uid}`); const deVistas = (x: number) =>'],
  // libroSoloInsercion (6j)
  ['libroSoloInsercion', M, "create trigger evt_avisos_enviados_no_cambia before update or delete on evt_avisos_enviados for each row execute function evt_avisos_enviados_inmutable();", "-- sin trigger"],
  ['libroSoloInsercion', M, "create trigger event_stock_overrides_no_cambia before update or delete on event_stock_overrides for each row execute function event_stock_overrides_inmutable();", "-- sin trigger"],
  ['libroSoloInsercion', EA, "  return (await db().query<Sobreventa>(", "  await db().query(`delete from evt_avisos_enviados where at < now() - interval '1 day'`);\n  return (await db().query<Sobreventa>("],
  // configDesdeUnLugar (6j: la ventana de la puerta escrita a mano)
  ['configDesdeUnLugar', PU, 'E2(`El modo puerta se activa el día del evento, ${ventanaH} ${ventanaH === 1 ? "hora" : "horas"} antes de abrir las puertas.`', 'E2(`El modo puerta se activa el día del evento, 2 horas antes de abrir las puertas.`'],
  ['configDesdeUnLugar', PP, 'E2(`El modo puerta se activa el día del evento: ${P.ventanaH} ${P.ventanaH === 1 ? "hora" : "horas"} antes', 'E2(`El modo puerta se activa el día del evento: 2 horas antes'],
  // listaConTopeLoQueImporta
  ['listaConTopeLoQueImporta', 'apps/web/lib/evt.ts', "order by (e.status in ('cancelled', 'rejected', 'done')) or (e.start_date + (e.span_days - 1) <", "order by false or (e.start_date + (e.span_days - 1) <"],
  ['listaConTopeLoQueImporta', 'apps/web/lib/evt-liquidacion.ts', 'order by (d.starts_at > now()), d.starts_at desc limit 60', 'order by d.starts_at desc limit 60'],
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
