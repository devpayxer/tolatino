// Prueba al revés de los guardianes de 7c (el motor de El Compa) y de la parte IA del guardián de Costos: se inyecta el defecto, el guardián
// debe fallar; se restaura.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M = 'packages/db/migrations/0118_compa_base.sql', C = 'apps/web/lib/compa/conversacion.ts', A = 'apps/web/lib/compa/acciones.ts', T = 'apps/web/lib/compa/tope.ts',
  V = 'apps/web/lib/compa/verificar.ts', X = 'apps/web/lib/compa/contexto-vecino.ts', I = 'apps/web/lib/compa/interruptores.ts', MC = 'apps/web/lib/compa/modelo-claude.ts',
  MO = 'apps/web/lib/compa/modelo.ts', RT = 'apps/web/app/api/interno/compa/route.ts', UI = 'apps/web/app/admin/ElCompaAdmin.tsx', PED = 'apps/web/lib/pedidos.ts',
  PK = 'apps/web/package.json', TD = 'apps/web/lib/traduccion.ts', BA = 'apps/web/lib/barrido.ts', AY = 'apps/web/lib/compa/ayuda-indice.ts', CMP = 'infra/pruebas/docker-compose.yml',
  AD = 'apps/web/lib/compa/admin-compa.ts';
const casos = [
  // compaSoloServidor
  ['compaSoloServidor', V, 'import "server-only";\n', ''],
  ['compaSoloServidor', UI, 'import type { DatosCompaAdmin, FichaConv } from "@/lib/compa/admin-compa";', 'import { datosCompaAdmin, type DatosCompaAdmin, type FichaConv } from "@/lib/compa/admin-compa";\nvoid datosCompaAdmin;'],
  ['compaSoloServidor', MO, '  if (hayClave()) return "claude";', '  if (process.env.ANTHROPIC_API_KEY) return "claude";'],
  ['compaSoloServidor', UI, 'export function ElCompaAdmin(', 'const ia = (window as unknown as { claude: unknown }).claude; void ia;\nexport function ElCompaAdmin('],
  ['compaSoloServidor', RT, 'if (ENTORNO === "produccion" || !tokenOk(req.headers.get("x-barrido-token"))) return NO();', 'if (!tokenOk(req.headers.get("x-barrido-token"))) return NO();'],
  ['compaSoloServidor', RT, '    const r = await turno({ userId: u.id },', '    const r = await turno({ userId: String(b.userId ?? u.id) },'],
  ['compaSoloServidor', 'infra/pruebas/deploy.sh', 'chmod 600 "$ENV_FILE"', 'echo "ANTHROPIC_API_KEY=x" >> "$ENV_FILE"\nchmod 600 "$ENV_FILE"'],
  // compaUnSoloProveedor
  ['compaUnSoloProveedor', C, 'const NUM_CP = /^CP-\\d{4,12}$/;', 'const NUM_CP = /^CP-\\d{4,12}$/;\nexport const otro = () => fetch("https://api.anthropic.com/v1/messages");'],
  ['compaUnSoloProveedor', PK, '"pg": "^8.16.0",', '"pg": "^8.16.0",\n    "openai": "4.0.0",'],
  ['compaUnSoloProveedor', MO, 'export interface Modelo {', 'export const otroProveedor = "https://api.openai.com/v1/chat";\nexport interface Modelo {'],
  ['compaUnSoloProveedor', TD, 'import "server-only";', 'import "server-only";\nimport { turno } from "./compa/conversacion";\nvoid turno;'],
  // compaPorElTope
  ['compaPorElTope', C, '  const reserva = await gastar({ uso: x.uso, canal: x.canal, ciudad: x.ciudad, negocio: x.negocio ?? null, modelo: id, entradaMax: Math.ceil(largo / 2) + 200, salidaMax: cfg.compa_salida_tokens });', '  const reserva = { ok: true as const, id: "x", modelo: id };'],
  ['compaPorElTope', C, '  await anotarUso({ reserva: reserva.id, conversacion: x.convId, uso: x.uso, ciudad: x.ciudad, negocio: x.negocio ?? null, userId: x.userId, modelo: id, tokens: sal.tokens, ms, resultado: v.ok ? "ok" : "invalid" });\n', ''],
  ['compaPorElTope', T, '  const d = await disponible({ uso: x.uso, canal: x.canal, ciudad: x.ciudad, negocio: x.negocio ?? null });\n  if (!d.ok) return { ok: false, por: "off" };\n', ''],
  ['compaPorElTope', AD, 'const USOS = new Set(', 'const PRECIO_HAIKU = 100000; void PRECIO_HAIKU;\nconst USOS = new Set('],
  ['compaPorElTope', T, 'export async function gastoDelMes(', 'export async function sumar(n: number) { await db().query(`update compa_spend_month set spent_microusd = spent_microusd + $1`, [n]); }\nexport async function gastoDelMes('],
  // costosIA
  ['costosIA', M, "   where month = m and spent_microusd + reserved_microusd + maxi <= tope;", "   where month = m;"],
  ['costosIA', M, "tope bigint := cfg_int('compa_tope_mes_cents')::bigint * 10000; r uuid;", "tope bigint := 1000000; r uuid;"],
  ['costosIA', M, "  ('compa_tope_mes_cents', 0, 1000000, 10000,", "  ('compa_tope_mes_cents', 0, 1000000, 1000000,"],
  ['costosIA', M, 'create trigger compa_usage_solo_insercion before update or delete on compa_usage', 'create trigger compa_usage_solo_insercion before delete on compa_usage'],
  ['costosIA', M, '    from compa_models m where m.id = p_model\n', '    from (select 100000 as input_per_mtok_microusd, 500000 as output_per_mtok_microusd, 10000 as cache_read_per_mtok_microusd, 125000 as cache_write_per_mtok_microusd, 110 as geo_pct) m\n'],
  ['costosIA', M, "  result             text not null check", "  prompt             text,\n  result             text not null check"],
  ['costosIA', BA, '["compaReservas", async () => { await db().query(`select compa_soltar_reservas(10)`); }],', ''],
  // compaSinDinero
  ['compaSinDinero', A, 'import { rsvCliente } from "../reservas";', 'import { rsvCliente } from "../reservas";\nimport { devolverPago } from "../cobros";\nvoid devolverPago;'],
  ['compaSinDinero', A, '  table: async (u, n) => rsvCliente(u, n, "cancelar", "otro", "compa"),', '  table: async (u, n) => rsvCliente(u, n, "cancelar", "otro", "compa"),\n  tickets: async (u, n) => rsvCliente(u, n, "aceptar"),'],
  ['compaSinDinero', M, "type            text not null check (type in ('cancel_request', 'open_screen', 'go_to_panel')),", "type            text not null check (type in ('cancel_request', 'open_screen', 'go_to_panel', 'refund')),"],
  ['compaSinDinero', A, 'o.status !== "pending" || o.detail || !(o.pago == null || o.pago === "held")', 'o.status === "cancelled"'],
  ['compaSinDinero', C, 'const NUM_CP = /^CP-\\d{4,12}$/;', 'const NUM_CP = /^CP-\\d{4,12}$/;\nimport { liberarOperacion } from "../cobros";\nexport const soltar = (id: string) => liberarOperacion(id);'],
  // compaAccionConfirmada
  ['compaAccionConfirmada', C, '  const p = validarAccion({ uso: x.uso, accion: r.accion, refs: ctx.refs });', '  const p = validarAccion({ uso: x.uso, accion: r.accion, refs: ctx.refs });\n  if (p) await (await import("./acciones")).confirmar({ userId: q.userId }, "x", "app");'],
  ['compaAccionConfirmada', A, "where id = $1 and user_id = $2 and status = 'proposed' and expires_at >= now()", "where id = $1 and status = 'proposed'"],
  ['compaAccionConfirmada', A, '!fn || o.status !== a.op_status ||', '!fn ||'],
  ['compaAccionConfirmada', A, '          where o.id = $1::bigint and o.user_id = $2`, [a.operation_id, q.userId])).rows[0];', '          where o.id = $1::bigint and $2::uuid is not null`, [a.operation_id, q.userId])).rows[0];'],
  ['compaAccionConfirmada', RT, '  if (!(await mismoOrigen())) return NextResponse.json({ ok: false, msg: "origen" }, { status: 403 });\n', ''],
  ['compaAccionConfirmada', M, "    raise exception 'compa_accion_decidida: esa acción ya se decidió';", "    return new;"],
  // compaSoloSusDatos
  ['compaSoloSusDatos', X, '        where o.user_id = $1\n', '        where o.user_id is not null\n'],
  ['compaSoloSusDatos', X, '    const ref = `op${i + 1}`;', '    const ref = o.id;'],
  ['compaSoloSusDatos', A, '    const op = /^op\\d{1,2}$/.test(a.ref) ? x.refs.get(a.ref) : undefined;\n    if (!op || !op.cancelableGratis', '    const op = x.refs.get(a.ref) ?? [...x.refs.values()].find((o) => o.numero === a.ref);\n    if (!op || !op.cancelableGratis'],
  ['compaSoloSusDatos', C, 'where number = $1 and user_id = $2 and use = $3 and closed_at is null', 'where number = $1 and $2::uuid is not null and use = $3 and closed_at is null'],
  ['compaSoloSusDatos', X, 'from users u left join cities c on c.id = coalesce(u.home_city_id, \'hzl\') where u.id = $1`, [userId]),', 'from users u left join cities c on c.id = coalesce(u.home_city_id, \'hzl\') where u.id = $1 or u.phone is not null`, [userId]),'],
  // compaSinDatosSensibles
  ['compaSinDatosSensibles', X, "          and o.kind not in ('enrollment')\n", ''],
  ['compaSinDatosSensibles', X, "          and not (o.kind = 'appointment' and coalesce(o.details->>'rubro', '') in ('salud', 'pro'))\n", ''],
  ['compaSinDatosSensibles', X, "          and not exists (select 1 from op_private p where p.operation_id = o.id)\n", "          and (select note_enc from op_private p where p.operation_id = o.id limit 1) is null\n"],
  ['compaSinDatosSensibles', X, "o.total_cents as total\n", "o.total_cents as total, o.door_code\n"],
  // compaTapaEnElMotor
  ['compaTapaEnElMotor', C, '[conv.id, ciudad, q.userId, t.texto]', '[conv.id, ciudad, q.userId, crudo]'],
  ['compaTapaEnElMotor', C, 'texto: tapar(h.body).texto', 'texto: h.body'],
  ['compaTapaEnElMotor', C, 'texto: tapar(r.text).texto', 'texto: r.text'],
  ['compaTapaEnElMotor', M, "  if texto_con_secretos(new.text) then raise exception 'compa_sin_secretos", "  if false then raise exception 'compa_sin_secretos"],
  ['compaTapaEnElMotor', A, 'export async function descartar(', 'export async function nota(c: string) { return db().query(`insert into compa_messages (conversation_id, city_id, sender, text) values (1, \'hzl\', \'system\', $1)`, [c]); }\nexport async function descartar('],
  // compaSalidaLimpia
  ['compaSalidaLimpia', V, '  if (EMOJI.test(todo)) return { ok: false, motivo: "emoji" };\n', ''],
  ['compaSalidaLimpia', V, '  if (HECHO.test(r.respuesta)) return { ok: false, motivo: "dice_que_hizo" };\n', ''],
  ['compaSalidaLimpia', V, '  if (fuente && fuente !== "cuenta" && !c.fuentes.includes(fuente)) fuente = "";\n', ''],
  ['compaSalidaLimpia', V, '  for (const m of r.respuesta.match(MONTO) ?? []) if', '  for (const m of [] as string[]) if'],
  ['compaSalidaLimpia', C, '  const ms = Date.now() - t0, v = ver(sal.json);', '  const ms = Date.now() - t0, v = { ok: true as const, r: sal.json as Respuesta };'],
  ['compaSalidaLimpia', C, '    const v = verificar(responderConReglas({ texto: t.texto, lang, ops, trozos }), vctx);', '    const v = { ok: true as const, r: responderConReglas({ texto: t.texto, lang, ops, trozos }) as Respuesta };'],
  // compaInterruptores
  ['compaInterruptores', I, '  if (candadoProduccion()) return { ok: false, por: "produccion" };\n', ''],
  ['compaInterruptores', I, '  if (!r?.nivel) return { ok: false, por: "nivel" };', '  if (r?.nivel === false) return { ok: false, por: "nivel" };'],
  ['compaInterruptores', C, '  if (!d.ok || !dOp.ok) return { ok: false, apagado: true, msg: LINEAS.apagado };\n', ''],
  ['compaInterruptores', AD, 'const USOS = new Set(', 'export const apagar = () => db().query(`update feature_flags set enabled = false where key = \'compa.use.neighbor\'`);\nconst USOS = new Set('],
  // compaSinRutaCritica
  ['compaSinRutaCritica', PED, 'import "server-only";', 'import "server-only";\nimport { turno } from "./compa/conversacion";\nvoid turno;'],
  ['compaSinRutaCritica', 'apps/web/app/(app)/soporte/acciones.ts', 'import { mismoOrigen, yo } from "@/lib/cuenta";', 'import { mismoOrigen, yo } from "@/lib/cuenta";\nimport { gastar } from "@/lib/compa/tope";\nvoid gastar;'],
  // compaAyudaPorAudiencia (ampliado)
  ['compaAyudaPorAudiencia', AY, "and c.audience = any($3::text[]) and a.status = 'live' and a.audience = any($3::text[])\n        and ($5", "and a.status = 'live'\n        and ($5"],
  ['compaAyudaPorAudiencia', C, '  const suyas: Audiencia[] = (["vecino"] as Audiencia[]).filter((a) => aud.includes(a));', '  const suyas: Audiencia[] = ["vecino", "equipo"];'],
  // libroSoloInsercion (ampliado)
  ['libroSoloInsercion', M, "  if tg_op <> 'INSERT' then raise exception 'compa_messages es solo de inserción'; end if;", "  if tg_op = 'DELETE' then return old; end if;"],
  ['libroSoloInsercion', M, "  if tg_op = 'DELETE' then raise exception 'una pausa de El Compa no se borra: se levanta'; end if;", ''],
  ['libroSoloInsercion', A, 'export async function descartar(', 'export async function borrar(id: string) { return db().query(`delete from compa_actions where id = $1`, [id]); }\nexport async function descartar('],
  ['libroSoloInsercion', T, 'export async function gastoDelMes(', 'export async function limpiar() { return db().query(`update compa_usage set cost_microusd = 0`); }\nexport async function gastoDelMes('],
];
let bien = 0;
for (const [g, f, a, b] of casos) {
  const ruta = `${R}/${f}`;
  if (!fs.existsSync(ruta)) { console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  if (a === b) { console.log(`  · ${g}: (sin cambio, se salta)`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let falla = false, out = '';
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); } catch (e) { falla = true; out = String(e.stderr).split('\n').find((l) => l.includes('[')) || ''; }
  fs.writeFileSync(ruta, orig);
  console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${f.split('/').pop()})${out ? ' → ' + out.trim().slice(0, 150) : ''}`); if (falla) bien++;
}
const total = casos.filter(([, , a, b]) => a !== b).length;
console.log(`\n${bien}/${total} al revés`);
execSync('node guardianes/run.mjs', { cwd: R, stdio: 'inherit' });
// 9b-3 · alrevesQueFalla: un defecto sin cazar pone la prueba en rojo (antes salía con 0 y el CI la contaba en verde).
if (bien !== total) process.exit(1);
