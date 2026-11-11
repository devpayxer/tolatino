import "server-only";
import { cifrar, descifrar } from "../cifrado";
import { valores } from "../config";
import { db } from "../db";
import { defApp, type ClaveApp } from "../app-nativa-comun";
import { cuerpoApns, enviarApns } from "./apns";
import { enviarFcm, mensajeFcm, tokenAcceso } from "./fcm";
import { canalesEncendidos, HOSTS_WEB_EXTRA, llavesTienda, llaveVapid, PROD, URL_APNS, URL_FCM, URL_FCM_OAUTH } from "./llaves";
import { enviarWebPush, temaDe, type ResultadoPush } from "./webpush";

/* 8c · La cola de push (fase8-apps.md §3.3 «Cómo sale un aviso»). Push primero; el SMS de respaldo lo decide lib/avisos.ts.
   - encolar(ids): de un aviso YA guardado (con su plantilla: guardián pushConPlantilla) a una fila por teléfono destino, en una sola escritura
     (sin red: guardián pushFueraDeTx). Único (aviso, token): el mismo aviso nunca llega dos veces al mismo teléfono (guardián pushSinDuplicados).
     El contenido va cifrado; si la plantilla es privada (Salud, Niños, Soporte, sanciones, cuenta) solo va el texto genérico (pushPrivadoSinTexto).
   - Destino: los teléfonos vivos de la persona en la app de la plantilla; si no tiene esa app, To'Latino; y sus navegadores con Web Push.
     Solo canales encendidos (push.webpush · push.apns · push.fcm) y sesiones vivas.
   - enviarPendientes(): el trabajador. Toma un lote con «for update skip locked» (dos trabajadores nunca toman la misma fila), manda fuera de toda
     transacción, anota cada intento (push_deliveries, solo inserción, sin personas), reintenta con espera creciente lo que el proveedor no
     pudo (429 / 5xx), revoca el token que el proveedor dice que ya no sirve (410 / Unregistered / UNREGISTERED) y, cuando un aviso ya no tiene
     push que lo lleve, suelta su SMS de respaldo (una vez: lo reclama lib/avisos.ts smsRespaldo).
   - barrerPush() (barrido, cada minuto): lo que se quedó «enviando», lo que venció (push_ttl_h), los tokens sin uso (push_inactivo_dias). */

export const GENERICO = { es: { t: "To'Latino", b: "Tienes un aviso nuevo en To'Latino." }, en: { t: "To'Latino", b: "You have a new notice in To'Latino." } };
const URGENTE = new Set(["biz_req", "puerta_abre"]);

/* Los teléfonos a los que va un aviso de la persona `u` para la app `app` (expresiones SQL). */
export const destino = (u: string, app: string, canales: string) => `t.user_id = ${u} and t.revoked_at is null and t.provider = any(${canales})
  and (t.session_id is null or exists (select 1 from sessions s where s.id = t.session_id and s.signed_out_at is null and not s.blocked and s.expires_at > now()))
  and (t.app = ${app} or t.app = 'web' or (t.app = 'cliente' and not exists (select 1 from push_tokens t2 where t2.user_id = ${u} and t2.app = ${app} and t2.revoked_at is null and t2.provider = any(${canales}))))`;
export const canales = async () => [...(await canalesEncendidos())];
/* El estado del push de un aviso en SQL, con las MISMAS reglas que avisar() (lib/avisos.ts): la plantilla no lo lleva o es de crecimiento sin
   «mkt_push» → no; apagado por la persona → apagado; de noche (salvo crit y la solicitud al negocio) → silencio; con teléfono → pendiente. */
export const estadoPushSql = (u: string, tp: string, tz: string, can: string) => `case
  when not ${tp}.push or (${tp}.grp = 'mkt' and coalesce(${u}.notif_prefs->>'mkt_push', '') <> 'true') then 'no'
  when ${tp}.pref is not null and coalesce(${u}.notif_prefs->>${tp}.pref, '') = 'false' then 'apagado'
  when ${tp}.grp <> 'crit' and ${tp}.key <> 'biz_req' and coalesce(${u}.notif_prefs->>'quiet', '') <> 'false' and extract(hour from now() at time zone ${tz}) not between 7 and 21 then 'silencio'
  when exists (select 1 from push_tokens t where ${destino(`${u}.id`, `${tp}.app`, can)}) then 'pendiente'
  else 'sin_app' end`;

/* El contenido que pasa por Apple / Google / el navegador: el de la notificación ya llena, o el genérico. Nada más (la ruta la pone el envío). */
export const cargaDe = (x: { title: string; body: string; priv: boolean; lang: string }) =>
  JSON.stringify(x.priv ? GENERICO[x.lang === "en" ? "en" : "es"] : { t: x.title.slice(0, 120), b: x.body.slice(0, 480) });

export async function encolar(ids: string[]): Promise<number> {
  const L = ids.filter((x) => /^\d{1,18}$/.test(x));
  if (!L.length) return 0;
  const N = (await db().query<{ id: string; title: string; body: string; priv: boolean; lang: string; tpl: string; grp: string; ref_kind: string | null; ref_id: string | null }>(
    `select n.id::text, n.title, n.body, t.push_private as priv, u.lang, n.tpl, t.grp, n.ref_kind, n.ref_id
       from notifications n join notif_templates t on t.key = n.tpl join users u on u.id = n.user_id
      where n.id = any($1::bigint[]) and n.push_status = 'pendiente'`, [L])).rows;
  if (!N.length) return 0;
  const pl = N.map((x) => cifrar(cargaDe(x))), prio = N.map((x) => (x.grp === "crit" || URGENTE.has(x.tpl) ? "alta" : "normal")),
    col = N.map((x) => (x.ref_kind && x.ref_id ? `${x.ref_kind}:${x.ref_id}`.slice(0, 64) : null));
  const ins = await db().query<{ nid: string }>(
    `insert into push_outbox (notification_id, token_id, city_id, priority, collapse_key, payload_enc, expires_at)
     select x.nid, t.id, n.city_id, x.prio, x.col, x.pl, n.created_at + make_interval(hours => cfg_int('push_ttl_h'))
       from unnest($1::bigint[], $2::bytea[], $3::text[], $4::text[]) as x(nid, pl, prio, col)
       join notifications n on n.id = x.nid join notif_templates tp on tp.key = n.tpl
       join push_tokens t on ${destino("n.user_id", "tp.app", "$5::text[]")}
     on conflict (notification_id, token_id) do nothing
     returning notification_id::text as nid`, [N.map((x) => x.id), pl, prio, col, await canales()]);
  const con = new Set(ins.rows.map((r) => r.nid)), sin = N.filter((x) => !con.has(x.id)).map((x) => x.id);
  // Se quedó sin teléfono entre el aviso y la cola (lo revocaron justo): sin push, y el SMS de respaldo sale ya.
  if (sin.length) {
    const R = (await db().query<{ id: string; sms: string }>(`update notifications set push_status = 'sin_app' where id = any($1::bigint[]) and push_status = 'pendiente' returning id::text, sms_status as sms`, [sin])).rows;
    for (const r of R) if (r.sms === "respaldo") await (await import("../avisos")).smsRespaldo(r.id);
  }
  if (ins.rowCount) pronto();
  return ins.rowCount ?? 0;
}

/* Apenas hay algo en la cola, el mismo proceso lo manda (sin esperar al barrido); si ya está mandando, da otra vuelta al terminar. */
let corriendo = false, otra = false;
export function pronto() {
  if (corriendo) { otra = true; return; }
  corriendo = true;
  setTimeout(() => {
    void (async () => {
      try { do { otra = false; await enviarPendientes(); } while (otra); }
      catch { /* el barrido lo vuelve a intentar */ }
      finally { corriendo = false; }
    })();
  }, 0);
}

type Fila = {
  id: string; nid: string; token_id: string; priority: string; collapse_key: string | null; payload_enc: Buffer | null; vencido: boolean; tries: number; city_id: string | null; ttl_s: number;
  tpl: string; grp: string; provider: "apns" | "fcm" | "webpush" | "sim"; app: string; platform: string; token_enc: Buffer; keys_enc: Buffer | null; valido: boolean; is_test: boolean;
};
type Resultado = Omit<ResultadoPush, "result"> & { result: ResultadoPush["result"] | "pruebas" | "apagado" };
type Hecho = { f: Fila; r: Resultado; ms: number };

async function mandarUno(f: Fila, on: Set<string>): Promise<Hecho["r"]> {
  if (f.vencido) return { result: "error", code: "vencido" };
  if (!f.valido) return { result: "apagado", code: "token_revocado" };
  if (!on.has(f.provider)) return { result: "apagado", code: "canal_apagado" };
  // Los teléfonos de prueba de la semilla (solo fuera de producción: canalesEncendidos nunca enciende «sim» allí): nada sale.
  if (f.provider === "sim") return { result: "pruebas", code: "simulado" };
  const carga = descifrar(f.payload_enc), token = descifrar(f.token_enc);
  if (!carga || !token) return { result: "error", code: "descifrar" };
  const c = JSON.parse(carga) as { t: string; b: string }, url = `/app/aviso/${f.nid}?v=push`, urgente = URGENTE.has(f.tpl), alta = f.priority === "alta";
  if (f.provider === "webpush") {
    const k = JSON.parse(descifrar(f.keys_enc) ?? "{}") as { p256dh?: string; auth?: string };
    if (!k.p256dh || !k.auth) return { result: "invalido", code: "llaves_invalidas" };
    return enviarWebPush({ endpoint: token, p256dh: k.p256dh, auth: k.auth }, JSON.stringify({ t: c.t, b: c.b, u: url, tag: f.collapse_key ?? `n${f.nid}`, n: f.nid }),
      { ttl: f.ttl_s, urgente: alta, tema: f.collapse_key ? temaDe(f.collapse_key) : null, extra: HOSTS_WEB_EXTRA() }, llaveVapid());
  }
  const ll = await llavesTienda();
  if (f.provider === "apns") {
    // Sin la llave de Apple subida al llavero: en el sandbox, «en modo pruebas» (como el SMS); en producción, no salió (el SMS de respaldo sí).
    if (!ll.apns) return { result: PROD ? "apagado" : "pruebas", code: "sin_llave" };
    return enviarApns(URL_APNS(), ll.apns, { token, topic: defApp(f.app as ClaveApp).ios, cuerpo: cuerpoApns({ titulo: c.t, texto: c.b, url, urgente, hilo: f.collapse_key }),
      prioridad: alta || !["community", "mkt"].includes(f.grp) ? 10 : 5, vence: Math.floor(Date.now() / 1000) + f.ttl_s, colapso: f.collapse_key });
  }
  if (!ll.fcm) return { result: PROD ? "apagado" : "pruebas", code: "sin_llave" };
  const msg = mensajeFcm({ token, titulo: c.t, texto: c.b, url, urgente: alta, ttlS: f.ttl_s, colapso: f.collapse_key, n: f.nid });
  for (let i = 0; i < 2; i++) {
    const acceso = await tokenAcceso(ll.fcm, URL_FCM_OAUTH());
    if (!acceso) return { result: "error", code: "oauth" };
    const r = await enviarFcm(URL_FCM(), ll.fcm.project_id, acceso, msg);
    // 401: el token de acceso venció o lo revocaron (enviarFcm ya lo olvidó): una vez más con uno nuevo, en el mismo intento.
    if (r.status !== 401 || i === 1) return r;
  }
  return { result: "error", code: "oauth" };
}

/* El trabajador: un lote. Nada de esto corre dentro de una transacción (guardián pushFueraDeTx). */
export async function enviarPendientes(max?: number): Promise<{ tomados: number; enviados: number; fallidos: number; reintentos: number }> {
  const cfg = await valores("push_lote", "push_por_minuto", "push_reintentos");
  const ultimos = (await db().query<{ n: number }>(`select count(*)::int as n from push_deliveries where at > now() - interval '1 minute'`)).rows[0]?.n ?? 0;
  const lote = Math.min(max ?? cfg.push_lote, cfg.push_lote, cfg.push_por_minuto - ultimos);
  if (lote <= 0) return { tomados: 0, enviados: 0, fallidos: 0, reintentos: 0 };
  const F = (await db().query<Fila>(
    `with c as (update push_outbox o set status = 'enviando', claimed_at = now(), tries = least(o.tries + 1, 20), updated_at = now()
                 where o.id in (select id from push_outbox where status = 'pendiente' and not_before <= now() order by not_before, id limit $1 for update skip locked)
                 returning o.*)
     select c.id::text, c.notification_id::text as nid, c.token_id::text, c.priority, c.collapse_key, c.payload_enc, c.expires_at < now() as vencido, c.tries, c.city_id,
            greatest(0, extract(epoch from c.expires_at - now()))::int as ttl_s, n.tpl, tp.grp, t.provider, t.app, t.platform, t.token_enc, t.webpush_keys_enc as keys_enc, t.is_test,
            (t.revoked_at is null and (t.session_id is null or (s.signed_out_at is null and not s.blocked and s.expires_at > now()))
              and cuenta_estado(u.status, u.status_until) in ('active', 'muted')) as valido
       from c join notifications n on n.id = c.notification_id join notif_templates tp on tp.key = n.tpl join push_tokens t on t.id = c.token_id
       join users u on u.id = t.user_id left join sessions s on s.id = t.session_id`, [lote])).rows;
  if (!F.length) return { tomados: 0, enviados: 0, fallidos: 0, reintentos: 0 };
  const on = await canalesEncendidos(), H: Hecho[] = [];
  for (let i = 0; i < F.length; i += 32) {
    H.push(...(await Promise.all(F.slice(i, i + 32).map(async (f): Promise<Hecho> => {
      const t0 = Date.now();
      let r: Hecho["r"];
      try { r = await mandarUno(f, on); } catch { r = { result: "error", code: "excepcion" }; }
      return { f, r, ms: Date.now() - t0 };
    }))));
  }
  const ok = (x: Hecho) => x.r.result === "enviado" || x.r.result === "pruebas";
  const reintentar = (x: Hecho) => (x.r.result === "limite" || (x.r.result === "error" && x.r.code !== "vencido" && x.r.code !== "descifrar")) && x.f.tries <= cfg.push_reintentos;
  const st = H.map((x) => (ok(x) ? "hecho" : reintentar(x) ? "pendiente" : "fallo"));
  const espera = H.map((x, i) => (st[i] === "pendiente" ? Math.min(1800, Math.max(x.r.retryAfter ?? 0, 30 * 2 ** Math.max(0, x.f.tries - 1))) : 0));
  await db().query(
    `insert into push_deliveries (outbox_id, notification_id, token_id, tpl, city_id, app, platform, provider, result, provider_id, error_code, http_status, ms, is_test)
     select * from unnest($1::bigint[], $2::bigint[], $3::bigint[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[], $9::text[], $10::text[], $11::text[], $12::smallint[], $13::int[], $14::bool[])`,
    [H.map((x) => x.f.id), H.map((x) => x.f.nid), H.map((x) => x.f.token_id), H.map((x) => x.f.tpl), H.map((x) => x.f.city_id), H.map((x) => x.f.app), H.map((x) => x.f.platform), H.map((x) => x.f.provider),
      H.map((x) => x.r.result), H.map((x) => x.r.id ?? null), H.map((x) => x.r.code?.slice(0, 60) ?? null), H.map((x) => x.r.status ?? null), H.map((x) => Math.min(600000, x.ms)), H.map((x) => x.f.is_test)]);
  await db().query(
    `update push_outbox o set status = x.st, payload_enc = case when x.st in ('hecho', 'fallo') then null else o.payload_enc end,
            not_before = case when x.st = 'pendiente' then now() + make_interval(secs => x.espera) else o.not_before end, last_error = x.err, updated_at = now()
       from unnest($1::bigint[], $2::text[], $3::float8[], $4::text[]) as x(id, st, espera, err) where o.id = x.id`,
    [H.map((x) => x.f.id), st, espera, H.map((x) => (ok(x) ? null : (x.r.code ?? x.r.result).slice(0, 120)))]);
  const inval = H.filter((x) => x.r.result === "invalido").map((x) => x.f.token_id), buenos = H.filter(ok).map((x) => x.f.token_id);
  if (inval.length) await db().query(`update push_tokens set revoked_at = now(), revoked_reason = 'invalido' where id = any($1::bigint[]) and revoked_at is null`, [inval]);
  if (buenos.length) await db().query(`update push_tokens set last_ok_at = now() where id = any($1::bigint[]) and revoked_at is null`, [buenos]);
  await resolver([...new Set(H.map((x) => x.f.nid))]);
  return { tomados: F.length, enviados: H.filter(ok).length, fallidos: st.filter((x) => x === "fallo").length, reintentos: st.filter((x) => x === "pendiente").length };
}

/* El estado del push de cada aviso: llegó a un teléfono (y el SMS de respaldo queda «ahorrado») o ya no hay cómo (y sale el SMS de respaldo). */
export async function resolver(nids: string[]): Promise<void> {
  if (!nids.length) return;
  const R = (await db().query<{ id: string; sms: string; ok: boolean }>(
    `with e as (select notification_id as nid, bool_or(status = 'hecho') as ok, bool_and(status in ('hecho', 'fallo')) as fin from push_outbox where notification_id = any($1::bigint[]) group by 1),
          r as (select e.nid, e.ok, exists (select 1 from push_deliveries d where d.notification_id = e.nid and d.result = 'enviado') as real from e where e.ok or e.fin)
     update notifications n set push_status = case when r.ok then (case when r.real then 'enviado' else 'pruebas' end) else 'fallo' end, push_at = now(),
            sms_status = case when r.ok and n.sms_status = 'respaldo' then 'ahorrado' else n.sms_status end
       from r where n.id = r.nid and n.push_status = 'pendiente'
     returning n.id::text, n.sms_status as sms, r.ok`, [nids])).rows;
  for (const r of R) if (!r.ok && r.sms === "respaldo") await (await import("../avisos")).smsRespaldo(r.id);
}

/* El barrido (cada minuto): lo atascado vuelve a la cola, lo vencido se deja (y su SMS de respaldo sale), los reintentos que tocan salen y los
   tokens sin uso vencen. Idempotente: correrlo dos veces no manda nada dos veces. */
export async function barrerPush(): Promise<{ atascados: number; vencidos: number; enviados: number; tokensVencidos: number; respaldos: number }> {
  const at = (await db().query(`update push_outbox set status = 'pendiente', updated_at = now() where status = 'enviando' and claimed_at < now() - interval '2 minutes'`)).rowCount ?? 0;
  const V = (await db().query<{ nid: string }>(
    `with v as (update push_outbox o set status = 'fallo', payload_enc = null, last_error = 'vencido', updated_at = now()
                 where o.status = 'pendiente' and o.expires_at < now() returning o.id, o.notification_id, o.token_id, o.city_id)
     insert into push_deliveries (outbox_id, notification_id, token_id, tpl, city_id, app, platform, provider, result, error_code, is_test)
     select v.id, v.notification_id, v.token_id, n.tpl, v.city_id, t.app, t.platform, t.provider, 'error', 'vencido', t.is_test
       from v join notifications n on n.id = v.notification_id join push_tokens t on t.id = v.token_id
     returning notification_id::text as nid`)).rows;
  await resolver([...new Set(V.map((x) => x.nid))]);
  let enviados = 0;
  for (let i = 0; i < 20; i++) { const r = await enviarPendientes(); enviados += r.enviados; if (!r.tomados) break; }
  // Un aviso con SMS de respaldo cuyo push nunca se resolvió (el trabajador estuvo caído más de push_ttl_h): el SMS sale ahora.
  const S = (await db().query<{ id: string }>(
    `update notifications set push_status = 'fallo', push_at = now() where sms_status = 'respaldo' and push_status = 'pendiente'
        and created_at < now() - make_interval(hours => cfg_int('push_ttl_h')) - interval '5 minutes'
        and not exists (select 1 from push_outbox o where o.notification_id = notifications.id and o.status in ('pendiente', 'enviando'))
      returning id::text`)).rows;
  for (const s of S) await (await import("../avisos")).smsRespaldo(s.id);
  const tv = (await db().query(`update push_tokens set revoked_at = now(), revoked_reason = 'vencido'
                                 where revoked_at is null and last_seen_at < now() - make_interval(days => cfg_int('push_inactivo_dias'))`)).rowCount ?? 0;
  return { atascados: at, vencidos: V.length, enviados, tokensVencidos: tv, respaldos: S.length };
}
