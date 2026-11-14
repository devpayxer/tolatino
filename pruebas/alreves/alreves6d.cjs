// Prueba al revés de los guardianes de 6d: se inyecta el defecto, el guardián debe fallar; se restaura.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M9 = 'packages/db/migrations/0109_boletos_comprador.sql', D = 'apps/web/lib/boletos-despues.ts', BO = 'apps/web/lib/boletos.ts', BAD = 'apps/web/lib/boletos-admin.ts',
  ES = 'apps/web/lib/espera.ts', BA = 'apps/web/lib/barrido.ts', PA = 'apps/web/lib/pagos/pasarela.ts', AD = 'apps/web/app/(app)/eventos/acciones-despues.ts', AE = 'apps/web/app/panel/acciones-eventos.ts',
  TX = 'apps/web/app/admin/Transacciones.tsx', ATX = 'apps/web/app/admin/acciones-tx.ts', EP = 'apps/web/app/panel/EventosPanel.tsx';
const casos = [
  // qrViejoNoEntra
  ['qrViejoNoEntra', D, "      // EL QR ANTERIOR QUEDA ANULADO: la versión sube ya; mientras está pendiente no se firma ningún QR de este boleto.\n      await c.query(`update tickets set qr_ver = qr_ver + 1 where id = $1::bigint`, [b.id]);\n", ""],
  ['qrViejoNoEntra', D, "      await c.query(`update tickets set qr_ver = qr_ver + 1 where id = $1::bigint`, [t.id]);\n      await c.query(`insert into ticket_log (ticket_id, operation_id, city_id, kind, by_user, by_kind) values ($1::bigint, $2::bigint, $3, 'transfer_cancelado'", "      await c.query(`insert into ticket_log (ticket_id, operation_id, city_id, kind, by_user, by_kind) values ($1::bigint, $2::bigint, $3, 'transfer_cancelado'"],
  ['qrViejoNoEntra', BO, "const qr = conQR && vale && !b.envio ?", "const qr = conQR && vale ?"],
  ['qrViejoNoEntra', D, "      await c.query(`update tickets set status = 'replaced', replaced_by = $2::bigint where id = $1::bigint and status = 'valid'`, [t.id, n.id]);\n", ""],
  ['qrViejoNoEntra', D, "      if (huella(yo.phone) !== x.ph) throw no(", "      if (false && huella(yo.phone) !== x.ph) throw no("],
  ['qrViejoNoEntra', D, "      if (x.from === userId) throw no(", "      if (false) throw no("],
  ['qrViejoNoEntra', BAD, "bol_vigente(t.id) as vig,", "t.status = 'valid' as vig,"],
  ['qrViejoNoEntra', M9, "  check (claimed_by is null or claimed_by <> from_user_id)\n", "  check (true)\n"],
  ['qrViejoNoEntra', M9, "  if new.status = 'claimed' and old.status = 'pending' and old.expires_at <= now() then raise exception 'esa transferencia ya venció'; end if;\n", ""],
  ['qrViejoNoEntra', M9, "select 1 from ticket_transfers x where x.ticket_id = t.id and x.status = 'pending' and x.kind = 'transfer'))", "select 1 where false))"],
  // cortesiaSinDinero
  ['cortesiaSinDinero', M9, "alter table tickets add constraint tickets_cortesia_sin_dinero check (kind <> 'comp' or (price_cents = 0 and fee_cents = 0 and discount_cents = 0));", "alter table tickets add constraint tickets_cortesia_sin_dinero check (kind <> 'comp' or fee_cents = 0);"],
  ['cortesiaSinDinero', M9, "    if new.kind = 'comp' and pm is distinct from 'none' then raise exception 'cortesia_sin_dinero: una cortesía va en una orden sin cobro'; end if;\n", ""],
  ['cortesiaSinDinero', M9, "    if new.status = 'refunded' and old.kind = 'comp' then raise exception 'cortesia_sin_dinero: una cortesía no se devuelve, se anula'; end if;\n", ""],
  ['cortesiaSinDinero', D, "         values ($1, 'tickets', $2, $3, $4, 'confirmed', $5::jsonb, 0, 0, 'none', now(), $6::uuid, $7) returning id::text`,", "         values ($1, 'tickets', $2, $3, $4, 'confirmed', $5::jsonb, 0, 0, 'app', now(), $6::uuid, $7) returning id::text`,"],
  ['cortesiaSinDinero', D, "      if (ya + q > k0.max) throw no(", "      if (false) throw no("],
  ['cortesiaSinDinero', D, "      if (sel.some((b) => b.st !== \"valid\" || b.kind !== \"paid\")) throw no(\"Uno de esos boletos ya se canceló", "      if (sel.some((b) => b.st !== \"valid\")) throw no(\"Uno de esos boletos ya se canceló"],
  // listaDeEsperaEnOrden
  ['listaDeEsperaEnOrden', ES, "where event_date_id = $1::bigint and status = 'waiting' order by created_at, waitlist.id limit 200", "where event_date_id = $1::bigint and status = 'waiting' order by party limit 200"],
  ['listaDeEsperaEnOrden', ES, "    await c.query(`select pg_advisory_xact_lock(hashtext('espera:' || $1))`, [fecha]);\n", ""],
  ['listaDeEsperaEnOrden', BO, "  // 6d · Lo que se liberó es primero para la lista de espera (en orden); lo que nadie de la fila puede usar queda para todos.\n  await primeroLaFila(fecha);\n", ""],
  ['listaDeEsperaEnOrden', BO, "    if (h.wl && (h.st === \"expired\" || !h.vivo)) throw no(", "    if (false) throw no("],
  ['listaDeEsperaEnOrden', M9, "  if (new.event_date_id, new.event_id, new.city_id, new.user_id, new.party, new.created_at) is distinct from (old.event_date_id, old.event_id, old.city_id, old.user_id, old.party, old.created_at) then\n    raise exception 'el lugar en la lista de espera no cambia';", "  if (new.event_date_id, new.user_id) is distinct from (old.event_date_id, old.user_id) then\n    raise exception 'la persona no cambia';"],
  ['listaDeEsperaEnOrden', BA, '["espera", () => espera.barrerEspera()], ', ""],
  // devolucionUnaVez
  ['devolucionUnaVez', M9, "create unique index if not exists ticket_refund_lines_boleto_idx on ticket_refund_lines (ticket_id) where ticket_id is not null;", "create index if not exists ticket_refund_lines_boleto_idx on ticket_refund_lines (ticket_id) where ticket_id is not null;"],
  ['devolucionUnaVez', M9, "  if ya + new.amount_cents > p.amount_cents then raise exception", "  if false then raise exception"],
  ['devolucionUnaVez', M9, "  select * into p from payments where id = new.payment_id for update;", "  select * into p from payments where id = new.payment_id;"],
  ['devolucionUnaVez', D, "`update refunds set status = 'done', stripe_refund_id = coalesce(stripe_refund_id, $2), done_at = now(), last_error = null where id = $1::bigint and status = 'pending'`", "`update refunds set status = 'done', stripe_refund_id = coalesce(stripe_refund_id, $2), done_at = now(), last_error = null where id = $1::bigint`"],
  ['devolucionUnaVez', D, "const x = await pasarela.devolver(r.pi, r.amt, r.idem,", "const x = await pasarela.devolver(r.pi, r.amt, `${r.idem}-${Date.now()}`,"],
  ['devolucionUnaVez', D, "devuelve: Math.max(0, b.precio - b.cargo)", "devuelve: Math.max(0, b.precio)"],
  ['devolucionUnaVez', PA, "`insert into sim_refunds (id, payment_intent, amount_cents) values ($1, $2, $3) on conflict (id) do nothing returning id`", "`insert into sim_refunds (id, payment_intent, amount_cents) values ($1, $2, $3) returning id`"],
  ['devolucionUnaVez', BA, '["bolDevoluciones", () => desp.barrerDevolucionesBoletos()]', '["bolDevoluciones", async () => 0]'],
  ['devolucionUnaVez', D, "(${EN_PIE}) and d.starts_at - make_interval(hours => ${cfgSql(\"bol_cancelar_h\")}) > now() as abierto, p.id::text as pid", "(${EN_PIE}) and d.starts_at - interval '24 hours' > now() as abierto, p.id::text as pid"],
  // devolverCoincide (ampliado)
  // 9k · La lista de hoy (con evento privado, planes y rentas): antes el texto ya no se encontraba y el caso no corría.
  ['devolverCoincide', TX, 'const DEVUELVE = new Set(["order", "appointment", "party", "trip", "night", "enrollment", "private_event", "plan", "rental"]);', 'const DEVUELVE = new Set(["order", "appointment", "party", "trip", "night", "enrollment", "private_event", "plan", "rental", "tickets"]);'],
  ['devolverCoincide', AE, '  if (!(await accesoPanel(a.negocio.id, "pay"))) return no(', '  if (false) return no('],
  // dineroDelServidor (ampliado a 6d)
  ['dineroDelServidor', AD, "export async function bolCancelar(numero: string, codes: string[], clave: string)", "export async function bolCancelar(numero: string, codes: string[], clave: string, monto: number)"],
  ['dineroDelServidor', AE, "export async function evtDevolver(negocio: string, numero: string, codes: string[], clave: string)", "export async function evtDevolver(negocio: string, numero: string, codes: string[], clave: string, refundCents: number)"],
  // boletosSinSobreventa (ampliado a 6d)
  ['boletosSinSobreventa', ES, "set held_n = held_n + $3, updated_at = now() where ticket_type_id = $1::bigint and event_date_id = $2::bigint and sold_n + held_n + $3 <= quantity`, [t.id, fecha, w.party]);", "set held_n = held_n + $3, updated_at = now() where ticket_type_id = $1::bigint and event_date_id = $2::bigint`, [t.id, fecha, w.party]);"],
  ['boletosSinSobreventa', D, "const u = await c.query(`update ticket_stock set sold_n = sold_n + $3, updated_at = now() where ticket_type_id = $1::bigint and event_date_id = $2::bigint and sold_n + held_n + $3 <= quantity`, [t.id, d.fid, q]);", "const u = await c.query(`update ticket_stock set sold_n = sold_n + $3, updated_at = now() where ticket_type_id = $1::bigint and event_date_id = $2::bigint`, [t.id, d.fid, q]);"],
  ['boletosSinSobreventa', D, "export async function quitarCortesia(", "export async function liberar(f: string) { await db().query(`update ticket_stock set sold_n = sold_n - 1 where event_date_id = $1::bigint`, [f]); }\nexport async function quitarCortesia("],
  ['boletosSinSobreventa', M9, "create trigger tickets_libera after update of status on tickets for each row execute function tickets_libera();", "-- sin trigger"],
  // libroBoletos (ampliado)
  ['libroBoletos', M9, "create trigger ticket_refund_lines_no_cambia before update or delete on ticket_refund_lines for each row execute function ticket_refund_lines_inmutable();", "-- sin trigger"],
  ['libroBoletos', D, "export async function quitarCortesia(", "export async function olvidar(id: string) { await db().query(`delete from waitlist where id = $1::bigint`, [id]); }\nexport async function quitarCortesia("],
  // barridoCompleto (las tareas nuevas en el barrido)
  ['barridoCompleto', BA, '["bolTransferencias", () => desp.vencerTransferencias()], ', ""],
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
