// Prueba al revés de los guardianes de 6e: se inyecta el defecto, el guardián debe fallar; se restaura.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M = 'packages/db/migrations/0110_eventos_cambios_dinero.sql', C = 'apps/web/lib/evt-cambios.ts', L = 'apps/web/lib/evt-liquidacion.ts', D = 'apps/web/lib/boletos-despues.ts',
  BA = 'apps/web/lib/barrido.ts', PA = 'apps/web/lib/pagos/pasarela.ts', CT = 'scripts/contrato-stripe/prueba.cjs', SE = 'scripts/prueba-firma-ses/prueba.mjs', TX = 'apps/web/lib/admin-tx.ts',
  AE = 'apps/web/app/panel/acciones-eventos.ts';
const casos = [
  // scriptsSeLeen (la falla del CI de 6d: una variable declarada dos veces)
  ['scriptsSeLeen', CT, "  const tr = await pasarela.transferir(", "  const tr = 1; const tr = await pasarela.transferir("],
  ['scriptsSeLeen', SE, "import ", "import { (; import "],
  // contratoCubreLaPasarela
  ['contratoCubreLaPasarela', CT, "  const tr = await pasarela.transferir(", "  const tr = await pasarela.transferirX("],
  ['contratoCubreLaPasarela', CT, "  const rv = await pasarela.revertirTransferencia(", "  const rv = await pasarela.revertirX("],
  ['contratoCubreLaPasarela', PA, "  /* Cobro directo a To'Latino (suscripción Pro)", "  async nuevaLlamada(x: string) { return stripe(\"POST\", `/v1/payouts`, { amount: 1, x }); },\n  /* Cobro directo a To'Latino (suscripción Pro)"],
  // devolucionTotalAlCancelar
  ['devolucionTotalAlCancelar', C, "idem: `evtcx-${cx.id}-${op}`", "idem: `evtcx-${cx.id}-${op}-${Date.now()}`"],
  ['devolucionTotalAlCancelar', C, "usados: true });\n      // El costo", "usados: false });\n      // El costo"],
  ['devolucionTotalAlCancelar', C, "and not exists (select 1 from payments p where p.operation_id = o.id and p.status = 'held')", ""],
  ['devolucionTotalAlCancelar', D, "  const k = await calcular(c, o.id, o.fee, sel, \"business\");\n  // Nunca", "  const k = await calcular(c, o.id, o.fee, sel, \"buyer\");\n  // Nunca"],
  ['devolucionTotalAlCancelar', D, "  k.total = Math.min(k.total, resto);\n", ""],
  ['devolucionTotalAlCancelar', D, "d.status in ('needs_response', 'under_review', 'lost', 'accepted')) as disp", "false) as disp"],
  ['devolucionTotalAlCancelar', BA, '["evtCancelaciones", () => cxs.barrerCancelaciones()], ', ""],
  ['devolucionTotalAlCancelar', M, "create unique index if not exists event_cancellations_una_idx", "create index if not exists event_cancellations_una_idx"],
  // pagoDespuesDelEvento
  ['pagoDespuesDelEvento', M, "  if d.ends_at > now() then raise exception 'evt_liq_antes: la fecha todavía no termina'; end if;\n", ""],
  ['pagoDespuesDelEvento', M, "  if (now() at time zone tz)::date < old.pay_on then raise exception", "  if false then raise exception"],
  ['pagoDespuesDelEvento', M, "  if k.abiertas > 0 then raise exception 'evt_liq_disputa: hay una disputa abierta en esta fecha'; end if;\n", ""],
  ['pagoDespuesDelEvento', M, "  if k.pendientes > 0 then raise exception 'evt_liq_devolucion: hay devoluciones pendientes en esta fecha'; end if;\n", ""],
  ['pagoDespuesDelEvento', M, "  if evt_liq_retener_nuevo(new.event_id, new.business_id) then raise exception 'evt_liq_nuevo: primer evento de un organizador nuevo sobre el tope: lo revisa Confianza'; end if;\n", ""],
  ['pagoDespuesDelEvento', M, " or a.payouts_paused then raise exception 'evt_liq_cuenta", " then raise exception 'evt_liq_cuenta"],
  ['pagoDespuesDelEvento', M, "new.base_cents := k.base;", "new.base_cents := coalesce(new.base_cents, k.base);"],
  ['pagoDespuesDelEvento', M, "      raise exception 'evt_liq_fija: lo que se transfiere ya quedó fijo';", "      null;"],
  ['pagoDespuesDelEvento', M, "  idem_key       text not null unique check (idem_key ~ '^evt-liq-\\d{1,18}$'),", "  idem_key       text not null,"],
  ['pagoDespuesDelEvento', L, "idem: s.idem, meta:", "idem: `${s.idem}-${s.id}-${Date.now()}`, meta:"],
  ['pagoDespuesDelEvento', L, "and status = 'paying'`, [id, tr]);", "`, [id, tr]);"],
  ['pagoDespuesDelEvento', TX, "export async function listaTx(", "export async function arreglar(id: string) { await (await import(\"./db\")).db().query(`update event_settlements set net_cents = 0 where id = $1`, [id]); }\nexport async function listaTx("],
  ['pagoDespuesDelEvento', AE, "export async function evtAvisar(", "export async function evtPagar(n: string) { await (await import(\"@/lib/pagos/pasarela\")).pasarela.transferir({ centavos: 1, destino: n, grupo: 'x', idem: 'x', meta: {} }); }\nexport async function evtAvisar("],
  ['pagoDespuesDelEvento', BA, '["evtLiquidar", () => liq.liquidar()], ', ""],
  // avisoEventoSmsSoloCritico
  ['avisoEventoSmsSoloCritico', M, "('evt_aviso', 'tx', null, false,", "('evt_aviso', 'tx', null, true,"],
  ['avisoEventoSmsSoloCritico', M, "('evt_pago', 'biz', null, false,", "('evt_pago', 'biz', null, true,"],
  ['avisoEventoSmsSoloCritico', C, 'avisarMuchos(r.L, "evt_aviso"', 'avisarMuchos(r.L, "evt_cancelado"'],
  // libroCambiosEvento
  ['libroCambiosEvento', M, "create trigger event_changes_no_cambia before update or delete on event_changes for each row execute function event_changes_inmutable();", "-- sin trigger"],
  ['libroCambiosEvento', M, "  if tg_op <> 'INSERT' then raise exception 'event_notices es solo de inserción'; end if;\n", ""],
  ['libroCambiosEvento', M, "  if tg_op = 'DELETE' then raise exception 'una liquidación no se borra (estados)'; end if;\n", ""],
  ['libroCambiosEvento', C, "/* ── AVISOS A LOS QUE VAN", "export async function borrarAviso(id: string) { await db().query(`delete from event_notices where id = $1::bigint`, [id]); }\n/* ── AVISOS A LOS QUE VAN"],
  // devolverCoincide (ampliado: cancelar con devolución pide la parte de Cobros)
  ['devolverCoincide', AE, '  if (!(await accesoPanel(a.negocio.id, "pay"))) return no("Solo quien maneja Cobros puede cancelar con devolución.",', '  if (false) return no("Solo quien maneja Cobros puede cancelar con devolución.",'],
  // dineroSinDesbordar (centavos × centavos en bigint: la página de Transacciones se caía con un cobro de $2,250)
  ['dineroSinDesbordar', TX, "fee_cents::bigint * (amount_cents", "fee_cents * (amount_cents"],
  ['dineroSinDesbordar', 'apps/web/lib/cobros.ts', "p.fee_cents::bigint * (p.amount_cents", "p.fee_cents * (p.amount_cents"],
  // revisionAntesDePublicar (ampliado: reanudar solo un evento pausado y aprobado)
  ['revisionAntesDePublicar', C, "`update events set status = 'live' where id = $1::bigint and status = 'paused' and approved_at is not null`", "`update events set status = 'live' where id = $1::bigint`"],
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
