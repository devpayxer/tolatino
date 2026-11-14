// Prueba al revés de los guardianes de 6c: se inyecta el defecto, el guardián debe fallar; se restaura.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M8 = 'packages/db/migrations/0108_boletos_venta.sql', BO = 'apps/web/lib/boletos.ts', QR = 'apps/web/lib/boletos-qr.ts', BA = 'apps/web/lib/barrido.ts',
  PG = 'apps/web/app/(app)/eventos/pagar/[apartado]/Pagar.tsx', BL = 'apps/web/app/(app)/eventos/[slug]/boletos/Boletos.tsx', AC = 'apps/web/app/(app)/eventos/acciones-boletos.ts',
  OR = 'apps/web/app/(app)/eventos/orden/[num]/Orden.tsx', CO = 'apps/web/lib/cobros.ts', BAD = 'apps/web/lib/boletos-admin.ts', EV = 'apps/web/lib/evt.ts', CF = 'apps/web/lib/config.ts';
const casos = [
  // boletosSinSobreventa
  ['boletosSinSobreventa', M8, "  primary key (ticket_type_id, event_date_id),\n  check (sold_n + held_n <= quantity)\n", "  primary key (ticket_type_id, event_date_id)\n"],
  ['boletosSinSobreventa', M8, "  primary key (table_id, event_date_id),\n  check (sold_n + held_n <= quantity)\n", "  primary key (table_id, event_date_id)\n"],
  ['boletosSinSobreventa', M8, "  check (used_n + held_n <= uses_max),\n", ""],
  ['boletosSinSobreventa', BO, "and s.event_date_id = $2::bigint and s.sold_n + s.held_n + $3 <= s.quantity\n", "and s.event_date_id = $2::bigint\n"],
  ['boletosSinSobreventa', BO, "and s.event_date_id = $2::bigint and s.sold_n + s.held_n + 1 <= s.quantity", "and s.event_date_id = $2::bigint"],
  ['boletosSinSobreventa', BO, "for (const b of [...boletos].sort((x, y) => Number(x.id) - Number(y.id))) {", "for (const b of boletos) {"],
  ['boletosSinSobreventa', BAD, "export async function kpiBoletosAdmin(s: Staff) {", "export async function regalar(id: string) { await db().query(`update ticket_stock set sold_n = sold_n + 1 where ticket_type_id = $1`, [id]); }\nexport async function kpiBoletosAdmin(s: Staff) {"],
  ['boletosSinSobreventa', BAD, "export async function kpiBoletosAdmin(s: Staff) {", "export async function emitir(op: string) { await db().query(`insert into tickets (operation_id) values ($1)`, [op]); }\nexport async function kpiBoletosAdmin(s: Staff) {"],
  // apartadoLoLlevaElServidor
  ['apartadoLoLlevaElServidor', BO, "now() + make_interval(mins => $13::int)) returning id::text`", "now() + interval '8 minutes') returning id::text`"],
  ['apartadoLoLlevaElServidor', BO, '${estado === "expired" ? "and expires_at <= now()" : ""}', ""],
  ['apartadoLoLlevaElServidor', BA, '["evtApartados", () => bol.vencerApartados()], ', ""],
  ['apartadoLoLlevaElServidor', PG, "const i = setInterval(() => setSeg(Math.max(0, p.segundos - Math.floor((Date.now() - t0.current) / 1000))), 1000);", "const i = setInterval(() => { if (Date.now() - t0.current > p.segundos * 1000) void evtSoltar(p.apartado); }, 1000);"],
  ['apartadoLoLlevaElServidor', BL, "{E2(`Al continuar te guardamos boletos y mesa por ${p.apartadoMin} minutos mientras pagas.`", "{E2(`Al continuar te guardamos boletos y mesa por 8 minutos mientras pagas.`"],
  // nadaSeCobraSinBoleto
  ['nadaSeCobraSinBoleto', BO, "    const numero = `B-${", "    await pasarela.capturarPlataforma(pi, h.total);\n    const numero = `B-${"],
  ['nadaSeCobraSinBoleto', BO, "    if (!cap.ok) {\n      await anularPorCobro(op, pi, cap.codigo ?? \"error\");", "    if (!cap.ok) {\n      void op;"],
  ['nadaSeCobraSinBoleto', BO, "      if (pi) await pasarela.liberar(pi).catch(() => undefined);\n      if (pi) await db()", "      if (pi) await db()"],
  ['nadaSeCobraSinBoleto', CO, "o.kind not in ('market_order', 'hold', 'tickets') limit 20", "o.kind not in ('market_order', 'hold') limit 20"],
  ['nadaSeCobraSinBoleto', BAD, "export async function kpiBoletosAdmin(s: Staff) {", "export async function cobrarYa(pi: string) { await (await import(\"./pagos/pasarela\")).pasarela.capturarPlataforma(pi, 100); }\nexport async function kpiBoletosAdmin(s: Staff) {"],
  // precioConCargos
  ['precioConCargos', BO, "const sub = lineas.reduce((s, l) => s + l.unit * l.q, 0), total = sub - desc;", "const sub = lineas.reduce((s, l) => s + l.unit * l.q, 0), total = sub - desc + 100 * nTk;"],
  ['precioConCargos', BO, "retenerPlataforma({ centavos: h.total,", "retenerPlataforma({ centavos: h.total + 0,"],
  ['precioConCargos', BO, "comision(c, \"bol\", pagado, 1)", "Math.round(pagado * 0.05) + 100"],
  ['precioConCargos', OR, "{ l: E2(\"Cargos de servicio\", \"Service fees\"), v: E2(\"Incluidos\", \"Included\") },", "{ l: E2(\"Cargos de servicio\", \"Service fees\"), v: dinero(311) },"],
  // qrFirmado
  ['qrFirmado', QR, "return `${msg}.${sign(null, Buffer.from(msg), k.priv).toString(\"base64url\")}`;", "return `${msg}.${createHmac(\"sha256\", \"puerta\").update(msg).digest(\"base64url\")}`;"],
  ['qrFirmado', QR, 'if (ENTORNO === "produccion") throw new Error("Falta QR_LLAVE_PRIVADA en los secretos del entorno");', ""],
  ['qrFirmado', QR, "from qr_keys where kid = $1 and retired_at is null", "from qr_keys where kid = $1"],
  ['qrFirmado', M8, "  public_key text not null check (public_key ~ '^[A-Za-z0-9_-]{43}$'),   -- 32 bytes en base64url\n", "  public_key text not null check (public_key ~ '^[A-Za-z0-9_-]{43}$'),\n  private_key text,\n"],
  ['qrFirmado', BAD, "export async function kpiBoletosAdmin(s: Staff) {", "const LLAVE = process.env.QR_LLAVE_PRIVADA; void LLAVE;\nexport async function kpiBoletosAdmin(s: Staff) {"],
  ['qrFirmado', BAD, "export async function kpiBoletosAdmin(s: Staff) {", "export const QR_PRUEBA = \"MC4CAQAwBQYDK2VwBCIEIJx0aXRvc2VjcmV0b3NlY3JldG9zZWNyZXRvc2VjcmV0\";\nexport async function kpiBoletosAdmin(s: Staff) {"], // GUARDIAN-OK: llave FALSA a propósito (el guardián qrFirmado debe cazarla)
  // qrSinDatosPersonales
  ['qrSinDatosPersonales', QR, "msg = `TL1.${k.kid}.${t.id}.${t.fecha}.${t.ver}.${t.admits}`;", "msg = `TL1.${k.kid}.${t.id}.${t.fecha}.${t.ver}.${t.admits}.${t.nombre ?? \"\"}`;"],
  ['qrSinDatosPersonales', QR, "export type DatosQR = { id: string; fecha: string; ver: number; admits: number };", "export type DatosQR = { id: string; fecha: string; ver: number; admits: number; nombre?: string };"],
  // boletosSoloSuyos
  ['boletosSoloSuyos', BO, "where o.number = $1 and o.kind = 'tickets' and o.user_id = $2 and o.pay_mode = 'app'`", "where o.number = $1 and o.kind = 'tickets' and $2::uuid is not null and o.pay_mode = 'app'`"],
  ['boletosSoloSuyos', BO, "join operations o on o.id = t.operation_id where t.code = $1 and t.holder_user_id = $2`", "join operations o on o.id = t.operation_id where t.code = $1 and $2::uuid is not null`"],
  ['boletosSoloSuyos', BO, "from ticket_holds h left join operations o on o.id = h.operation_id where h.id = $1::uuid and h.user_id = $2`, [holdId, userId])).rows[0];\n  if (!h) return null;", "from ticket_holds h left join operations o on o.id = h.operation_id where h.id = $1::uuid and $2::uuid is not null`, [holdId, userId])).rows[0];\n  if (!h) return null;"],
  ['boletosSoloSuyos', BO, "select id::text, kind from events where id = $1::bigint and business_id = $2 and entry = 'tickets'", "select id::text, kind from events where id = $1::bigint and $2::text is not null and entry = 'tickets'"],
  ['boletosSoloSuyos', BO, "coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), ''), 'Vecino') as quien, o.number as num,\n              (select count(*)::int", "coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), ''), 'Vecino') as quien, u.phone as tel, o.number as num,\n              (select count(*)::int"],
  // libroBoletos
  ['libroBoletos', M8, "create trigger ticket_log_no_cambia before update or delete on ticket_log", "create trigger ticket_log_x before update on ticket_log"],
  // 6d redefine tickets_antes en 0109 (la última definición es la que vale).
  ['libroBoletos', 'packages/db/migrations/0109_boletos_comprador.sql', "  if tg_op = 'DELETE' then raise exception 'un boleto no se borra: se anula o se devuelve (estados)'; end if;\n", ""],
  ['libroBoletos', BAD, "export async function kpiBoletosAdmin(s: Staff) {", "export async function borrar(id: string) { await db().query(`delete from tickets where id = $1`, [id]); }\nexport async function kpiBoletosAdmin(s: Staff) {"],
  // dineroDelServidor (ampliado a boletos)
  ['dineroDelServidor', BO, "export type BoletosIn = { fecha: string; boletos: { id: string; q: number }[]; mesa: string | null; extras: string[]; codigo: string | null };", "export type BoletosIn = { fecha: string; boletos: { id: string; q: number; price_cents: number }[]; mesa: string | null; extras: string[]; codigo: string | null; total: number };"],
  ['dineroDelServidor', AC, "export async function evtPagar(apartado: string, pm: string, nombres: string[])", "export async function evtPagar(apartado: string, pm: string, nombres: string[], total: number)"],
  // configDesdeUnLugar (las claves nuevas en el tipo)
  ['configDesdeUnLugar', CF, '| "evt_apartado_min" | ', '| '],
  // barridoCompleto (repararBoletos y vencerApartados en el barrido)
  ['barridoCompleto', BA, '["evtApartados", () => bol.vencerApartados()], ', ""],
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
