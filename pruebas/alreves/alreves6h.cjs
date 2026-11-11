// Prueba al revés de los guardianes de 6h (la puerta sin conexión): se inyecta el defecto, el guardián debe fallar; se restaura.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M = 'packages/db/migrations/0113_puerta_sin_conexion.sql', L = 'apps/web/lib/puerta-paquete.ts', RP = 'apps/web/app/api/puerta/paquete/route.ts',
  C = 'apps/web/app/(puerta)/puerta/sin-conexion/local.ts', H = 'apps/web/app/(puerta)/puerta/sin-conexion/usePuertaLocal.ts', BR = 'apps/web/lib/barrido.ts', Y = 'apps/web/lib/puerta-sync.ts',
  P = 'apps/web/lib/puerta.ts', PA = 'apps/web/lib/puerta-admin.ts', SW = 'apps/web/public/puerta/sw.js', SB = 'apps/web/public/sw-boletos.js', K1 = 'apps/web/app/(puerta)/puerta/sin-conexion/page.tsx',
  K2 = 'apps/web/app/(sin-senal)/cuenta/boletos/sin-conexion/page.tsx', BS = 'apps/web/lib/boletos-sin-conexion.ts', CU = 'apps/web/lib/cuenta.ts', AJ = 'apps/web/app/(app)/cuenta/ajustes/Ajustes.tsx';
const casos = [
  // paqueteMinimo
  ['paqueteMinimo', M, "         v.arrived_n, v.arrived_n, null::text, null::text, v.updated_at", "         v.arrived_n, v.arrived_n, u.phone, null::text, v.updated_at"],
  ['paqueteMinimo', M, "e smallint, i smallint, ud text, uh text, cambio timestamptz)", "e smallint, i smallint, ud text, uh text, cambio timestamptz, precio integer)"],
  ['paqueteMinimo', M, "    if not found or s.ended_at is not null or not puerta_acceso(s.id, s.user_id) then raise exception 'puerta_cerrada: el paquete solo sale para una puerta abierta'; end if;\n", ''],
  ['paqueteMinimo', M, "    update door_packages set revoked_at = now(), revoked_reason = new.ended_by where session_id = new.id and revoked_at is null;\n", ''],
  ['paqueteMinimo', L, 'llaveDerivada("puerta-paquete", `${sesion}|${userId}|${device ?? "-"}`)', 'llaveDerivada("puerta-paquete", "todas")'],
  ['paqueteMinimo', L, 'createCipheriv("aes-256-gcm", llave, iv)', 'createCipheriv("aes-256-ctr", llave, iv)'],
  ['paqueteMinimo', L, ' and s.ended_at is null`, [ctx.sesion, ctx.userId])', '`, [ctx.sesion, ctx.userId])'],
  ['paqueteMinimo', L, '/* ── Barrido:', 'export async function telefonos(f: string) { return db().query(`select u.phone from tickets t join users u on u.id = t.holder_user_id where t.event_date_id = $1`, [f]); }\n/* ── Barrido:'],
  ['paqueteMinimo', RP, 'const ctx = await accesoPuerta(u.id, String(b?.sesion ?? ""));\n  if (!ctx) return NO(', 'const ctx = (await accesoPuerta(u.id, String(b?.sesion ?? ""))) as never;\n  if (false) return NO('],
  ['paqueteMinimo', C, 'importKey("raw", b64(raw), { name: "AES-GCM" }, false, ["encrypt", "decrypt"])', 'importKey("raw", b64(raw), { name: "AES-GCM" }, true, ["encrypt", "decrypt"])'],
  ['paqueteMinimo', C, 'datos: await cifrar(k, e) };', 'datos: { iv: new Uint8Array(12) as Uint8Array<ArrayBuffer>, c: new TextEncoder().encode(JSON.stringify(e)).buffer as ArrayBuffer } };'],
  ['paqueteMinimo', C, '  if (!pub || !(await verificarEd(pub, new TextEncoder().encode(`TLPK1\\n${sobre.j}`), b64url(sobre.sig)))) throw new Error("paquete_firma");\n', ''],
  ['paqueteMinimo', C, '  if (Date.parse(f.vence) < Date.now()) { await borrarSesion(s); return null; }\n', ''],
  ['paqueteMinimo', H, 'if (r.j.cerrada) await olvidar(!!r.j.revocada); return false;', 'return false;'],
  ['paqueteMinimo', BR, '["puertaPaquetes", () => paq.vencerPaquetes()],', ''],
  // choqueDePuertaDeterminista
  ['choqueDePuertaDeterminista', M, ') q order by q.eff, q.srv, q.id', ') q order by q.srv, q.id'],
  ['choqueDePuertaDeterminista', M, "  select * into x from ticket_entries where ticket_id = t.id and event_date_id = d.id for update;\n  for c in", "  select * into x from ticket_entries where ticket_id = t.id and event_date_id = d.id;\n  for c in"],
  ['choqueDePuertaDeterminista', M, "      insert into ticket_scan_fixes (scan_id, event_date_id, city_id, ticket_id, result, resolution, admits_n, first_n, sync_id) values (c.id, d.id, d.city_id, t.id, res, resl, k, f, p_sync);", "      update ticket_scans set resolution = resl where id = c.id;"],
  ['choqueDePuertaDeterminista', M, "  if tg_op <> 'INSERT' then raise exception 'ticket_scan_fixes es solo de inserción'; end if;\n", ''],
  ['choqueDePuertaDeterminista', M, "    select d.id, e.id, e.business_id, d.city_id, x2.session_id, t.id, 'duplicado', '', s.user_id, z, gana, true from ticket_scans x2 where x2.id = z\n    on conflict (scan_id, kind) where auto do nothing;", "    select 1;"],
  ['choqueDePuertaDeterminista', M, "  eff := p_at_device + make_interval(secs => coalesce(p_offset_ms, 0) / 1000.0);", "  eff := p_at_device;"],
  ['choqueDePuertaDeterminista', M, "  eff := least(greatest(coalesce(eff, now()), s.started_at), coalesce(s.ended_at, now()), now());", "  eff := coalesce(eff, now());"],
  ['choqueDePuertaDeterminista', Y, 'Math.round(Date.now() - tel)', '0'],
  ['choqueDePuertaDeterminista', P, 'sum(x.first_n)::int as e, count(*) filter (where x.resolution = \'rejected\')::int as r, max(x.at_server) as u, count(*) filter (where x.offline)::int as off,\n                                 count(*) filter (where x.resolution = \'duplicate\')::int as dup from ticket_scans_ef x', 'sum(x.first_n)::int as e, count(*) filter (where x.resolution = \'rejected\')::int as r, max(x.at_server) as u, count(*) filter (where x.offline)::int as off,\n                                 count(*) filter (where x.resolution = \'duplicate\')::int as dup from ticket_scans x'],
  ['choqueDePuertaDeterminista', PA, 'from ticket_scans_ef x join tickets t on t.id = x.ticket_id', 'from ticket_scans x join tickets t on t.id = x.ticket_id'],
  // sinConexionSinDatosAjenos
  ['sinConexionSinDatosAjenos', SW, '  if (url.pathname.indexOf("/api/") === 0) return; // nunca: datos con cuenta\n', ''],
  ['sinConexionSinDatosAjenos', SW, '    e.respondWith(fetch(req).catch(function () {\n      if (url.pathname === CASCARA)', '    e.respondWith(fetch(req).then(function (r) { caches.open(CACHE).then(function (c) { c.put(req, r.clone()); }); return r; }).catch(function () {\n      if (url.pathname === CASCARA)'],
  ['sinConexionSinDatosAjenos', SB, 'var ESTATICO = /^\\/(_next\\/static\\/|fuentes\\/)/;', 'var ESTATICO = /^\\/(_next\\/static\\/|fuentes\\/|cuenta\\/)/;'],
  ['sinConexionSinDatosAjenos', SB, '  if (req.method !== "GET") return;', '  if (req.method !== "GET") return;\n  if (req.url.indexOf("/api/") > 0) { e.respondWith(caches.open(CACHE).then(function (c) { return fetch(req).then(function (r) { c.put(req.url, r.clone()); return r; }); })); return; }'],
  ['sinConexionSinDatosAjenos', SW, 'self.addEventListener("install", function (e) {', 'self.addEventListener("install", function (e) {{'],
  ['sinConexionSinDatosAjenos', K1, 'export const dynamic = "force-static";', 'export const dynamic = "force-dynamic";'],
  ['sinConexionSinDatosAjenos', K2, 'import { BoletosSinSenal } from "./BoletosSinSenal";', 'import { BoletosSinSenal } from "./BoletosSinSenal";\nimport { yo } from "@/lib/cuenta";\nvoid yo;'],
  ['sinConexionSinDatosAjenos', BS, '    const c = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, new TextEncoder().encode(JSON.stringify(b)));', '    const c = new TextEncoder().encode(JSON.stringify(b)).buffer as ArrayBuffer;'],
  ['sinConexionSinDatosAjenos', BS, 'estadoFg: string; titulo: string;', 'estadoFg: string; precio: number; titulo: string;'],
  ['sinConexionSinDatosAjenos', BS, '    if (!v) { await pedir(st("readwrite").clear()); return; }\n', ''],
  ['sinConexionSinDatosAjenos', CU, '  jar.delete({ name: COOKIE_BOLETOS, path: "/cuenta/boletos" });\n', ''],
  ['sinConexionSinDatosAjenos', AJ, 'await olvidarSinConexion(); await fetch("/api/cuenta/salir"', 'await fetch("/api/cuenta/salir"'],
  // escaneoIdempotente (ampliado)
  ['escaneoIdempotente', M, "    if sc.session_id <> p_session then raise exception 'puerta_id_ajeno: ese escaneo es de otra puerta'; end if;\n", ''],
  ['escaneoIdempotente', M, "  sc := puerta_repetido(p_scan);\n  if sc.id is not null then\n    if sc.session_id", "  s := puerta_sesion_cola(p_session, p_user);\n  sc := puerta_repetido(p_scan);\n  if sc.id is not null then\n    if sc.session_id"],
  ['escaneoIdempotente', H, 'await L.encolar(sesion, { id, at,', 'await L.encolar(sesion, { id: crypto.randomUUID(), at,'],
  ['escaneoIdempotente', H, 'await L.quitarDeCola(lote.map((x, i) => (hechos[i] ? x.id : "")).filter(Boolean));', 'await L.quitarDeCola(lote.map((x) => x.id));'],
  // qrViejoNoEntra (ampliado: sin conexión)
  ['qrViejoNoEntra', C, '  if (st === "replaced" || (x.ver != null && x.ver !== fila[1])) return vista("replaced");', '  if (st === "replaced") return vista("replaced");'],
  ['qrViejoNoEntra', C, '  if (st === "pending") return vista("pending_transfer");\n', ''],
  ['qrViejoNoEntra', M, "    elsif t.status = 'replaced' or (p_ver is not null and p_ver <> t.qr_ver) then r := 'replaced';", "    elsif t.status = 'replaced' then r := 'replaced';"],
  ['qrViejoNoEntra', M, "         case when t.status in ('valid', 'used') and exists (select 1 from ticket_transfers z where z.ticket_id = t.id and z.status = 'pending' and z.kind = 'transfer') then 'pending' else t.status end,", "         t.status,"],
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
