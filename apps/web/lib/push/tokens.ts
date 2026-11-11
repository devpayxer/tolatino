import "server-only";
import { headers } from "next/headers";
import { cifrar, huella } from "../cifrado";
import { db, tx } from "../db";
import { defApp, type ClaveApp } from "../app-nativa-comun";
import { HOSTS_WEB_EXTRA } from "./llaves";
import { endpointPermitido } from "./webpush";

/* 8c · Los teléfonos que reciben push (fase8-apps.md §2 push_tokens, §3.3). Solo este archivo escribe push_tokens (guardián tokensCifrados).
   - registrar(): atado a la SESIÓN que lo pide (la cookie, nunca un id que mande el teléfono): la app y la plataforma salen de la sesión (que
     las anotó al entrar), no de lo que diga el cliente. Web Push solo desde la web, APNs solo desde la app de iPhone, FCM solo desde Android.
     El token se guarda CIFRADO y se busca por su huella. Mismo token otra vez = solo «visto» (nada nuevo). Un token que otra sesión tenía (el
     teléfono cambió de cuenta) se le quita a esa sesión («reemplazado»). Una sesión tiene un token vivo por proveedor (el que rota reemplaza).
   - La dirección de Web Push se revisa: solo servicios de push conocidos (SSRF: el servidor nunca le escribe a una dirección que diga el cliente).
   - apagarEste() / apagar(): «En este teléfono» y «Tus teléfonos con avisos» de Mi cuenta › Avisos (revocado «apagado», con quién).
   - Salir de la cuenta o bloquear la sesión lo revoca la base en la misma transacción (trigger sessions_push_revocar, 0126). */

export type Proveedor = "apns" | "fcm" | "webpush";
export type Registro = { provider: Proveedor; token: string; p256dh?: string; auth?: string };
type Res = { ok: true; id: string; nuevo: boolean } | { ok: false; msg: string };
const MAX_VIVOS = 20;

function etiquetaDe(ua: string, app: string, plat: string): string {
  const nom = app === "web" ? null : defApp(app as ClaveApp).nombre.es;
  if (plat === "ios") return `iPhone · ${nom}`;
  if (plat === "android") return `Android · ${nom}`;
  const nav = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Navegador";
  const so = /iPhone|iPad/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "computadora";
  return `${nav} · ${so}`;
}

const b64uLen = (s: string | undefined, n: number) => typeof s === "string" && /^[A-Za-z0-9_-]+={0,2}$/.test(s) && Buffer.from(s, "base64url").length === n;

export async function registrar(userId: string, sesionHash: string, r: Registro): Promise<Res> {
  const ses = (await db().query<{ id: string; app: string; platform: string; lang: string; city: string | null }>(
    `select s.id, s.app, s.platform, u.lang, u.home_city_id as city from sessions s join users u on u.id = s.user_id
      where s.token_hash = $1 and s.user_id = $2 and s.signed_out_at is null and not s.blocked and s.expires_at > now()`, [sesionHash, userId])).rows[0];
  if (!ses) return { ok: false, msg: "sin_sesion" };
  const p = r.provider, t = String(r.token ?? "");
  // La plataforma y la app las dice la sesión (anotadas al entrar), nunca el teléfono.
  if (p === "webpush") {
    if (ses.platform !== "web") return { ok: false, msg: "plataforma" };
    if (!endpointPermitido(t, HOSTS_WEB_EXTRA())) return { ok: false, msg: "endpoint" };
    if (!b64uLen(r.p256dh, 65) || Buffer.from(r.p256dh!, "base64url")[0] !== 4 || !b64uLen(r.auth, 16)) return { ok: false, msg: "llaves" };
  } else if (p === "apns") {
    if (ses.platform !== "ios" || !/^[0-9a-f]{64,200}$/i.test(t)) return { ok: false, msg: "token" };
  } else if (p === "fcm") {
    if (ses.platform !== "android" || !/^[A-Za-z0-9_:-]{20,4096}$/.test(t)) return { ok: false, msg: "token" };
  } else return { ok: false, msg: "proveedor" };
  const app = p === "webpush" ? "web" : ses.app;
  if (!["cliente", "negocio", "delivery", "checkin", "web"].includes(app)) return { ok: false, msg: "app" };
  const tok = p === "apns" ? t.toLowerCase() : t, h = huella(`push:${p}:${tok}`);
  let ua = "";
  try { ua = (await headers()).get("user-agent") ?? ""; } catch { /* fuera de una petición */ }
  const label = etiquetaDe(ua, app, ses.platform);
  return tx(async (c): Promise<Res> => {
    await c.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [`push:${h}`]);
    const ya = (await c.query<{ id: string; session_id: string | null; user_id: string }>(`select id::text, session_id, user_id from push_tokens where token_hash = $1 and revoked_at is null for update`, [h])).rows[0];
    if (ya && ya.session_id === ses.id && ya.user_id === userId) {
      await c.query(`update push_tokens set last_seen_at = now(), lang = $2, label = $3 where id = $1`, [ya.id, ses.lang, label]);
      return { ok: true, id: ya.id, nuevo: false };
    }
    if (ya) await c.query(`update push_tokens set revoked_at = now(), revoked_reason = 'reemplazado' where id = $1`, [ya.id]);
    // El token que rota (FCM, una suscripción nueva del navegador) reemplaza al anterior de la misma sesión.
    await c.query(`update push_tokens set revoked_at = now(), revoked_reason = 'reemplazado' where session_id = $1 and provider = $2 and revoked_at is null`, [ses.id, p]);
    const id = (await c.query<{ id: string }>(
      `insert into push_tokens (user_id, session_id, city_id, app, platform, provider, token_enc, token_hash, webpush_keys_enc, label, lang)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) returning id::text`,
      [userId, ses.id, ses.city, app, ses.platform, p, cifrar(tok), h, p === "webpush" ? cifrar(JSON.stringify({ p256dh: r.p256dh, auth: r.auth })) : null, label, ses.lang])).rows[0]!.id;
    // Tope por cuenta: los más viejos se reemplazan (nadie tiene 20 teléfonos; un abuso no llena la tabla).
    await c.query(`update push_tokens set revoked_at = now(), revoked_reason = 'reemplazado'
                    where id in (select id from push_tokens where user_id = $1 and revoked_at is null order by last_seen_at desc offset $2)`, [userId, MAX_VIVOS]);
    return { ok: true, id, nuevo: true };
  });
}

/* «En este teléfono» → apagado: los tokens vivos de ESTA sesión. */
export async function apagarEste(userId: string, sesionHash: string): Promise<number> {
  return (await db().query(`update push_tokens t set revoked_at = now(), revoked_reason = 'apagado', revoked_by = $1
                              from sessions s where s.token_hash = $2 and s.user_id = $1 and t.session_id = s.id and t.revoked_at is null`, [userId, sesionHash])).rowCount ?? 0;
}
/* «Tus teléfonos con avisos» → Apagar uno (solo uno de la persona). */
export async function apagar(userId: string, tokenId: string): Promise<boolean> {
  if (!/^\d{1,18}$/.test(tokenId)) return false;
  return ((await db().query(`update push_tokens set revoked_at = now(), revoked_reason = 'apagado', revoked_by = $1 where id = $2 and user_id = $1 and revoked_at is null`, [userId, tokenId])).rowCount ?? 0) > 0;
}

export type Dispositivo = { id: string; label: string; app: string; platform: string; provider: string; desde: string; ultimo: string | null; este: boolean };
const ISO = (c: string) => `to_char(${c} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
/* Mi cuenta › Avisos: los teléfonos y navegadores con avisos de la persona (sin el token: solo su rótulo). */
export async function misDispositivos(userId: string, sesionHash: string | null): Promise<Dispositivo[]> {
  return (await db().query<Dispositivo>(
    `select t.id::text, coalesce(t.label, t.platform) as label, t.app, t.platform, t.provider, ${ISO("t.created_at")} as desde, ${ISO("t.last_ok_at")} as ultimo,
            coalesce(s.token_hash = $2, false) as este
       from push_tokens t left join sessions s on s.id = t.session_id
      where t.user_id = $1 and t.revoked_at is null order by t.last_seen_at desc limit 20`, [userId, sesionHash])).rows;
}
