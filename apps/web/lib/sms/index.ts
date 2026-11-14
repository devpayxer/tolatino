import "server-only";
import { cifrar, descifrar, huella } from "../cifrado";
import { valores } from "../config";
import { db } from "../db";
import { ENTORNO, MODO_SMS } from "../entorno";
import { hayLlaves, mandar, numeroSms, SMS_PERMANENTES } from "../compa/canales-proveedor";
import { simularEnvio } from "./simulador";

/* 9l · EL ÚNICO CAMINO DE LOS SMS (L1115; guardián smsConReintento). Todo SMS de To'Latino —un aviso (lib/avisos.ts), un aviso a un teléfono sin
   cuenta, el código para entrar (lib/cuenta.ts) y las respuestas de El Compa por SMS (lib/compa/canales.ts)— entra aquí:
   1. enviarSms() deja la fila en sms_outbox (el teléfono y el texto CIFRADOS: el texto puede llevar un código) y hace el primer intento.
   2. intentar() toma la fila (una vez: el reclamo es una sola escritura), habla con el proveedor por lib/compa/canales-proveedor.ts (el único archivo que
      habla con Telnyx) o, en el sandbox, con el simulador (lib/sms/simulador.ts), y anota el intento en sms_attempts (solo inserción).
   3. El resultado final llega por el webhook de Telnyx (`message.finalized` → anotarEntrega) o del simulador: entregado, o falló → reintento con espera
      creciente (sms_reintento_min × 2^n) hasta sms_reintentos, salvo lo permanente (STOP, número inválido) o un código ya vencido.
   4. reintentarSms() (el barrido, cada minuto) manda los reintentos que tocan y retoma lo que quedó a medias (el proceso se cayó).
   El estado se refleja en su origen (el aviso, el SMS a un teléfono sin cuenta, la salida de El Compa): «entregado» o «falló». En el sandbox el aviso
   sigue diciendo «en modo pruebas» (no salió a un teléfono de verdad) y el recorrido del simulador queda en sms_outbox. Nunca lanza. */
export type OrigenSms = { kind: "aviso" | "telefono" | "codigo" | "compa" | "prueba"; id?: string | null };
export type EstadoSms = "pendiente" | "enviado" | "entregado" | "reintento" | "fallo" | "vencido" | "sin_proveedor";
const proveedor = (): "telnyx" | "sim" => (MODO_SMS === "telnyx" ? "telnyx" : "sim");

export async function enviarSms(x: { tel: string; texto: string; tpl?: string | null; origen: OrigenSms; ciudad?: string | null; de?: string | null; venceSeg?: number | null; test?: boolean }): Promise<{ id: string; estado: EstadoSms } | null> {
  try {
    const tel = String(x.tel ?? ""), texto = String(x.texto ?? "").slice(0, 1600);
    if (!/^\+1\d{10}$/.test(tel) || !texto) return null;
    const cfg = await valores("sms_reintentos");
    const p = proveedor();
    // En producción sin llaves (o sin el número que manda) queda «sin proveedor»: sale cuando lleguen (el barrido lo retoma).
    const sin = p === "telnyx" && (!hayLlaves("telnyx") || !(x.de ?? numeroSms()));
    const id = (await db().query<{ id: string }>(
      `insert into sms_outbox (city_id, to_hash, to_enc, to_last4, from_number, tpl, origin_kind, origin_id, body_enc, chars, provider, status, max_attempts, expires_at, is_test)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, case when $14::int is null then null else now() + make_interval(secs => $14::int) end, $15) returning id::text`,
      [x.ciudad ?? null, huella(tel), cifrar(tel), tel.slice(-4), x.de ?? null, x.tpl ?? null, x.origen.kind, x.origen.id ?? null, cifrar(texto), texto.length, p,
        sin ? "sin_proveedor" : "pendiente", Math.max(1, cfg.sms_reintentos), x.venceSeg ?? null, !!x.test || ENTORNO !== "produccion"])).rows[0]!.id;
    if (sin) return { id, estado: "sin_proveedor" };
    return { id, estado: await intentar(id) };
  } catch { return null; }
}

/* Un intento: reclamarlo (una vez), hablar con el proveedor, anotarlo. */
export async function intentar(id: string): Promise<EstadoSms> {
  // Sin llaves de Telnyx no se gasta un intento: queda «sin proveedor» y el barrido lo retoma cuando lleguen.
  if (proveedor() === "telnyx" && !hayLlaves("telnyx")) {
    await db().query(`update sms_outbox set status = 'sin_proveedor', next_at = null where id = $1::bigint and status in ('pendiente', 'reintento')`, [id]).catch(() => undefined);
    await reflejar(id);
    return "sin_proveedor";
  }
  const f = (await db().query<{ to_enc: Buffer | null; body_enc: Buffer | null; de: string | null; n: number; provider: "telnyx" | "sim"; vencido: boolean; max: number }>(
    `update sms_outbox set attempts = attempts + 1, next_at = case when status = 'reintento' then now() + interval '10 minutes' else next_at end
      where id = $1::bigint and attempts < max_attempts and purged_at is null
        and (status = 'reintento' and next_at <= now() or status = 'pendiente' and (attempts = 0 or created_at < now() - interval '2 minutes') or status = 'sin_proveedor')
      returning to_enc, body_enc, from_number as de, attempts as n, provider, coalesce(expires_at < now(), false) as vencido, max_attempts as max`, [id])).rows[0];
  if (!f) return ((await db().query<{ s: EstadoSms }>(`select status as s from sms_outbox where id = $1::bigint`, [id])).rows[0]?.s ?? "fallo");
  const tel = descifrar(f.to_enc), texto = descifrar(f.body_enc);
  if (f.vencido || !tel || !texto) return cerrar(id, "vencido", null, "vencido");
  let aceptado = false, pid: string | null = null, codigo: string | null = null, permanente = false;
  let final: { estado: "entregado" | "fallo"; codigo: string | null } | null = null;
  if (f.provider === "sim") {
    const r = simularEnvio(tel, f.n);
    aceptado = r.aceptado; pid = r.id; codigo = r.codigo; permanente = r.permanente;
    if (r.final) final = { estado: r.final, codigo: r.codigoFinal };
  } else {
    const r = await mandar("telnyx", f.de ?? numeroSms() ?? "", tel, texto);
    aceptado = r.ok; pid = r.ok ? r.id : null; codigo = r.ok ? null : r.error; permanente = !r.ok && /^telnyx_4(00|01|03|22)$/.test(r.error);
  }
  await db().query(`insert into sms_attempts (sms_id, n, provider, provider_msg_id, accepted, error_code) values ($1::bigint, $2, $3, $4, $5, $6)`,
    [id, f.n, f.provider, pid, aceptado, codigo ? codigo.slice(0, 40) : null]);
  let estado: EstadoSms;
  if (aceptado) {
    await db().query(`update sms_outbox set status = 'enviado', next_at = null, sent_at = coalesce(sent_at, now()), error_code = null, error = null where id = $1::bigint`, [id]);
    estado = "enviado";
  } else estado = await fallar(id, codigo, permanente, f.n, f.max);
  await reflejar(id);
  // El simulador contesta su «webhook» enseguida (en producción lo trae /api/compa/entrada/telnyx).
  if (final && pid) estado = (await anotarEntrega("sim", pid, final.estado, final.codigo)) ?? estado;
  return estado;
}

/* Falló un intento: reintento con espera creciente, o falló para siempre (lo permanente, sin intentos, o vencido). */
async function fallar(id: string, codigo: string | null, permanente: boolean, n: number, max: number): Promise<EstadoSms> {
  const { sms_reintento_min: base } = await valores("sms_reintento_min");
  const v = (await db().query<{ vencido: boolean }>(`select coalesce(expires_at < now() + make_interval(mins => $2::int), false) as vencido from sms_outbox where id = $1::bigint`, [id, base * 2 ** (n - 1)])).rows[0];
  if (permanente || n >= max || v?.vencido) return cerrar(id, "fallo", codigo, permanente ? "permanente" : v?.vencido ? "el código vence antes del reintento" : "sin intentos");
  await db().query(`update sms_outbox set status = 'reintento', next_at = now() + make_interval(mins => $2::int), error_code = $3, error = null where id = $1::bigint`,
    [id, base * 2 ** (n - 1), codigo ? codigo.slice(0, 40) : null]);
  return "reintento";
}
async function cerrar(id: string, estado: "fallo" | "vencido", codigo: string | null, motivo: string): Promise<EstadoSms> {
  await db().query(`update sms_outbox set status = $2, next_at = null, error_code = coalesce($3, error_code), error = $4 where id = $1::bigint and status not in ('entregado', 'fallo', 'vencido')`,
    [id, estado, codigo ? codigo.slice(0, 40) : null, motivo.slice(0, 200)]);
  await reflejar(id);
  return estado;
}

/* El resultado final de un intento (webhook de Telnyx `message.finalized`, o el simulador): una vez por intento. Solo el ÚLTIMO intento decide el SMS
   (el aviso viejo de un intento anterior no lo mueve). Devuelve el estado del SMS, o null si ese id no es nuestro. */
export async function anotarEntrega(prov: "telnyx" | "sim", providerMsgId: string, final: "entregado" | "fallo", codigo: string | null): Promise<EstadoSms | null> {
  try {
    const a = (await db().query<{ sms: string; n: number }>(
      `update sms_attempts set final = $3, final_code = $4, final_at = now() where provider = $1 and provider_msg_id = $2 and final is null and accepted returning sms_id::text as sms, n`,
      [prov, String(providerMsgId).slice(0, 200), final, codigo ? String(codigo).slice(0, 40) : null])).rows[0];
    if (!a) return null;
    const s = (await db().query<{ status: EstadoSms; attempts: number; max: number }>(`select status, attempts, max_attempts as max from sms_outbox where id = $1::bigint`, [a.sms])).rows[0];
    if (!s || s.status !== "enviado" || s.attempts !== a.n) return s?.status ?? null;
    if (final === "entregado") {
      await db().query(`update sms_outbox set status = 'entregado', delivered_at = now(), error_code = null where id = $1::bigint and status = 'enviado'`, [a.sms]);
      await reflejar(a.sms);
      return "entregado";
    }
    const r = await fallar(a.sms, codigo, !!codigo && SMS_PERMANENTES.has(codigo), s.attempts, s.max);
    await reflejar(a.sms);
    return r;
  } catch { return null; }
}

/* Lo que dice el SMS, en su origen. En el sandbox el aviso sigue «en modo pruebas» (nunca salió a un teléfono de verdad). */
async function reflejar(id: string): Promise<void> {
  const s = (await db().query<{ status: EstadoSms; provider: string; origin_kind: string; origin_id: string | null }>(
    `select status, provider, origin_kind, origin_id from sms_outbox where id = $1::bigint`, [id])).rows[0];
  if (!s) return;
  const st = s.status === "entregado" ? "entregado" : s.status === "fallo" || s.status === "vencido" ? "fallo" : s.status === "sin_proveedor" ? "sin_proveedor" : "enviado";
  if (s.provider !== "sim") {
    await db().query(`update notifications set sms_status = $2, sms_at = coalesce(sms_at, now()) where sms_id = $1::bigint and sms_status in ('pendiente', 'enviado', 'sin_proveedor', 'fallo') and sms_status <> $2`, [id, st]);
    await db().query(`update phone_messages set sms_status = $2, sms_at = coalesce(sms_at, now()) where sms_id = $1::bigint and sms_status in ('pendiente', 'enviado', 'sin_proveedor', 'fallo') and sms_status <> $2`, [id, st]);
  }
  // La salida de El Compa solo avanza (pendiente → enviado | falló; enviado → entregado | falló).
  if (s.origin_kind === "compa") {
    await db().query(
      `update compa_outbound o set status = $2, provider_msg_id = coalesce(o.provider_msg_id, (select a.provider_msg_id from sms_attempts a where a.sms_id = $1::bigint and a.accepted order by a.n desc limit 1)),
              sent_at = coalesce(o.sent_at, now())
        where o.sms_id = $1::bigint and ((o.status = 'pendiente' and $2 in ('enviado', 'fallo')) or (o.status = 'enviado' and $2 in ('entregado', 'fallo')))`, [id, st === "sin_proveedor" ? "pendiente" : st]);
  }
}

/* El barrido (cada minuto): los reintentos que tocan, lo que quedó a medias y lo que esperaba al proveedor. Y la retención: pasado retener_sms_dias, el
   teléfono y el texto cifrados se vacían (sms_outbox y los SMS a números sin cuenta). */
export async function reintentarSms(): Promise<{ intentos: number; purgados: number }> {
  const L = (await db().query<{ id: string }>(
    `select id::text from sms_outbox where (status = 'reintento' and next_at <= now()) or (status = 'pendiente' and created_at < now() - interval '2 minutes')
        or (status = 'sin_proveedor' and created_at > now() - interval '3 days' and $1) order by sms_outbox.id limit 100`, [proveedor() === "telnyx" && hayLlaves("telnyx")])).rows;
  let intentos = 0;
  for (const x of L) { await intentar(x.id); intentos++; }
  const a = (await db().query(
    `update sms_outbox set to_enc = null, body_enc = null, purged_at = now() where id in (select id from sms_outbox where purged_at is null and created_at < now() - make_interval(days => cfg_int('retener_sms_dias'))
        and status in ('entregado', 'fallo', 'vencido', 'sin_proveedor') order by id limit 5000)`)).rowCount ?? 0;
  const b = (await db().query(
    `update phone_messages set phone_enc = null, body = null, purged_at = now() where id in (select id from phone_messages where purged_at is null and created_at < now() - make_interval(days => cfg_int('retener_sms_dias')) order by id limit 5000)`)).rowCount ?? 0;
  return { intentos, purgados: a + b };
}

/* ── Super Admin › Notificaciones › SMS y WhatsApp: la entrega (sin teléfonos: los últimos 4) ── */
export type FilaSms = { id: string; at: string; tpl: string | null; origen: string; ultimos: string; proveedor: string; estado: EstadoSms; intentos: number; error: string | null; entregado: string | null };
export async function entregaSms(ciudades: string[], antes: string | null) {
  const cur = antes && /^\d{1,18}$/.test(antes) ? antes : null;
  const CI = "(cardinality($1::text[]) = 0 or s.city_id is null or s.city_id = any($1::text[]))";
  const [k, L, W] = await Promise.all([
    db().query<{ total: number; entregados: number; reintentos: number; fallidos: number; sin_proveedor: number; pendientes: number; reintentados_ok: number; sim: number }>(
      `select count(*)::int as total, count(*) filter (where s.status = 'entregado')::int as entregados, count(*) filter (where s.status = 'reintento')::int as reintentos,
              count(*) filter (where s.status in ('fallo', 'vencido'))::int as fallidos, count(*) filter (where s.status = 'sin_proveedor')::int as sin_proveedor,
              count(*) filter (where s.status in ('pendiente', 'enviado'))::int as pendientes, count(*) filter (where s.status = 'entregado' and s.attempts > 1)::int as reintentados_ok,
              count(*) filter (where s.provider = 'sim')::int as sim
         from sms_outbox s where s.created_at > now() - interval '1 day' and ${CI}`, [ciudades]),
    db().query<FilaSms>(
      `select s.id::text, to_char(s.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, s.tpl, s.origin_kind as origen, s.to_last4 as ultimos, s.provider as proveedor,
              s.status as estado, s.attempts as intentos, s.error_code as error, to_char(s.delivered_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as entregado
         from sms_outbox s where ${CI} and ($2::bigint is null or s.id < $2::bigint) order by s.id desc limit 41`, [ciudades, cur]),
    db().query<{ enviados: number; entregados: number; fallidos: number; ventana: number }>(
      `select count(*) filter (where o.status in ('enviado', 'entregado'))::int as enviados, count(*) filter (where o.status = 'entregado')::int as entregados,
              count(*) filter (where o.status = 'fallo')::int as fallidos, count(*) filter (where o.status = 'ventana')::int as ventana
         from compa_outbound o where o.channel = 'whatsapp' and o.created_at > now() - interval '1 day' and (cardinality($1::text[]) = 0 or o.city_id = any($1::text[]))`, [ciudades]),
  ]);
  return { kpi: k.rows[0]!, filas: L.rows.slice(0, 40), sig: L.rows.length > 40 ? L.rows[39]!.id : null, whatsapp: W.rows[0]! };
}
