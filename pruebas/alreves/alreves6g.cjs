// Prueba al revés de los guardianes de 6g (la puerta): se inyecta el defecto, el guardián debe fallar; se restaura.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M = 'packages/db/migrations/0112_puerta.sql', M6 = 'packages/db/migrations/0106_eventos_base.sql', L = 'apps/web/lib/puerta.ts', A = 'apps/web/app/(puerta)/puerta/acciones.ts',
  RT = 'apps/web/app/api/puerta/escanear/route.ts', V = 'apps/web/app/api/puerta/vivo/route.ts', E = 'apps/web/app/(puerta)/puerta/Escanear.tsx', N = 'apps/web/lib/noche-reservas.ts';
const casos = [
  // sinVentaEnLaPuerta
  ['sinVentaEnLaPuerta', L, 'import { db, tx } from "./db";', 'import { db, tx } from "./db";\nimport { cobrarOperacion } from "./cobros";'],
  ['sinVentaEnLaPuerta', A, 'import { aceptarPortero, salirPortero } from "@/lib/puerta-equipo";', 'import { aceptarPortero, salirPortero } from "@/lib/puerta-equipo";\nimport { apartar } from "@/lib/boletos";'],
  ['sinVentaEnLaPuerta', L, '/* ── Barrido ── */', 'export async function vender() { await db().query(`insert into operations (number, kind) values (1, 2)`); }\n/* ── Barrido ── */'],
  ['sinVentaEnLaPuerta', L, "t.code, t.admits, t.kind = 'comp' as comp, t.holder_name as hn", "t.code, t.price_cents, t.admits, t.kind = 'comp' as comp, t.holder_name as hn"],
  ['sinVentaEnLaPuerta', M, "  return puerta_registrar(p_scan, s, 'noche', null, null, o.id, null, 'in', p_k, p_k, 'valid'", "  update operations set total_cents = 0 where id = o.id;\n  return puerta_registrar(p_scan, s, 'noche', null, null, o.id, null, 'in', p_k, p_k, 'valid'"],
  ['sinVentaEnLaPuerta', E, 'E2("Siguiente", "Next")', 'E2("Pagar en la puerta", "Pay at the door")'],
  ['sinVentaEnLaPuerta', M6, "check (entry in ('free', 'rsvp', 'tickets'))", "check (entry in ('free', 'rsvp', 'tickets', 'door'))"],
  // porteroSoloSuEvento
  ['porteroSoloSuEvento', A, '  const c = await puerta(sesion);\n  if (!c) return CERRADA;\n  return darMesa(', '  const c = { sesion } as unknown as CtxPuerta;\n  return darMesa('],
  ['porteroSoloSuEvento', RT, 'const ctx = await accesoPuerta(u.id, String(b.sesion ?? ""));\n  if (!ctx) return NO(', 'const ctx = (await accesoPuerta(u.id, String(b.sesion ?? ""))) ?? ({ sesion: String(b.sesion) } as never);\n  if (false) return NO('],
  ['porteroSoloSuEvento', V, 'sigue = async () => !!(await accesoPuerta(u.id, sesion));', 'sigue = async () => true;'],
  ['porteroSoloSuEvento', L, ' and puerta_acceso(s.id, $2)`, [sesion, userId])', '`, [sesion, userId])'],
  ['porteroSoloSuEvento', L, "        where t.event_id = $1::bigint and t.status in ('valid', 'used', 'void', 'refunded')", "        where t.status in ('valid', 'used', 'void', 'refunded')"],
  ['porteroSoloSuEvento', L, '      where t.id = $1::bigint and t.event_id = $2::bigint`, [tid, ctx.evento, ctx.fecha])', '      where t.id = $1::bigint`, [tid, ctx.evento, ctx.fecha])'],
  ['porteroSoloSuEvento', M, "       and now() between d.doors_at - make_interval(hours => cfg_int('puerta_ventana_h')) and d.ends_at + make_interval(hours => cfg_int('puerta_ventana_h'))\n", ''],
  ['porteroSoloSuEvento', M, "\n                                                     and (f.scope = 'all' or e.id = any(f.event_ids)))", ')'],
  ['porteroSoloSuEvento', M, '  s := puerta_sesion(p_session, p_user);\n  if p_dir not in', "  select * into s from door_sessions where id = p_session;\n  if p_dir not in"],
  ['porteroSoloSuEvento', M, "    update door_sessions set ended_at = now(), ended_by = 'removed' where door_staff_id = new.id and ended_at is null;", "    null;"],
  ['porteroSoloSuEvento', L, 'u.first_name as fn, u.last_name as ln, tt.name as tipo', 'u.first_name as fn, u.phone as tel, u.last_name as ln, tt.name as tipo'],
  ['porteroSoloSuEvento', M, "  if t.event_id <> d.event_id then r := 'wrong_event';", "  if false then r := 'wrong_event';"],
  // escaneoIdempotente
  ['escaneoIdempotente', M, "  perform pg_advisory_xact_lock(hashtextextended('puerta:' || p_scan::text, 0));\n", ''],
  ['escaneoIdempotente', M, '  sc := puerta_repetido(p_scan);\n  if sc.id is not null then return sc; end if;\n  s := puerta_sesion(p_session, p_user);\n  select * into d from event_dates where id = s.event_date_id;\n  select * into e from events where id = d.event_id;\n  select * into v', '  s := puerta_sesion(p_session, p_user);\n  select * into d from event_dates where id = s.event_date_id;\n  select * into e from events where id = d.event_id;\n  select * into v'],
  ['escaneoIdempotente', M, 'select * into t from tickets where id = p_ticket for update;', 'select * into t from tickets where id = p_ticket;'],
  ['escaneoIdempotente', M, 'constraint ticket_entries_una_vez check (entered_n between 0 and admits)', 'constraint ticket_entries_una_vez check (entered_n >= 0)'],
  ['escaneoIdempotente', M, "  if coalesce(current_setting('tl.puerta', true), '') <> 'si' then raise exception 'un escaneo lo registra solo la puerta (puerta_registrar)'; end if;\n", ''],
  ['escaneoIdempotente', L, '  if (!UUID.test(id)) return null;\n', ''],
  ['escaneoIdempotente', E, 'id: q.p.id', 'id: uuid()'],
  ['escaneoIdempotente', L, '/* ── Barrido ── */', "export async function marca() { await db().query(`select set_config('tl.puerta', 'si', true)`); }\n/* ── Barrido ── */"],
  ['escaneoIdempotente', L, 'select (puerta_repetido($1::uuid)).id::text as id', 'select null::text as id'],
  // codigoPuerta (ampliado)
  ['codigoPuerta', L, '  return (await import("./noche-reservas")).listaEnLaPuerta(ctx.negocio, String(q ?? ""));', "  void q; return (await db().query(`select number from operations where business_id = $1 and kind = 'night'`, [ctx.negocio])).rows;"],
  ['codigoPuerta', N, '    `select o.number as numero, u.first_name as fn', '    `select o.number as numero, o.door_code as code, u.first_name as fn'],
  // libroSoloInsercion (ampliado)
  ['libroSoloInsercion', M, 'create trigger door_searches_no_cambia before update or delete on door_searches', 'create trigger door_searches_no_cambia before update on door_searches'],
  ['libroSoloInsercion', L, '/* ── Barrido ── */', 'export async function borrar(s: string) { await db().query(`delete from ticket_scans where session_id = $1`, [s]); }\n/* ── Barrido ── */'],
  ['libroSoloInsercion', M, "  if tg_op = 'DELETE' then raise exception 'una incidencia no se borra: se cierra'; end if;\n", ''],
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
