import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "../db";
import { ENTORNO, secretoAuth } from "../entorno";
import { enviarSES, sesListo } from "./ses";
import { marco } from "./plantillas";

/* Correo (bloque 2q). Todo pasa por la bandeja de salida `email_outbox` (historial; nada se borra).
   Modo: fuera de producción, «pruebas» (no sale; se ve en el Super Admin) salvo TOLATINO_CORREO_MODO=ses; en producción,
   SES si están las llaves, si no «sin_proveedor» (queda en la bandeja y sale cuando lleguen). Nunca «pruebas» en
   producción. Un recibo por pedido o reservación (idem_key). Reintentos: hasta 5, desde `procesarCorreos`. */
export type ModoCorreo = "pruebas" | "ses" | "sin_proveedor";
export function modoCorreo(): ModoCorreo {
  if (ENTORNO !== "produccion" && process.env.TOLATINO_CORREO_MODO !== "ses") return "pruebas";
  return sesListo() ? "ses" : "sin_proveedor";
}
export const BASE_URL = () => (process.env.TOLATINO_URL || "https://pruebas.tolatino.com").replace(/\/$/, "");

type Tpl = "verify" | "receipt_order" | "receipt_table" | "receipt_pro" | "receipt_tickets" | "report" | "founder_daily" | "campaign" | "support_reply" | "support_ack" | "weekly" | "city_open"; // 9h · campaign: Crecimiento › Campañas por correo · 9l · Soporte por correo y el resumen semanal del barrio · 9i · city_open: el aviso «tu ciudad abrió»
export async function encolar(x: { userId: string | null; city?: string | null; to: string; tpl: Tpl; subject: string; html: string; text: string; ref?: [string, string]; idem?: string }): Promise<{ id: string; status: string } | null> {
  const m = modoCorreo(), st = m === "pruebas" ? "pruebas" : m === "ses" ? "pendiente" : "sin_proveedor";
  const r = (await db().query<{ id: string; status: string }>(
    `insert into email_outbox (user_id, city_id, to_email, tpl, subject, html, text_body, ref_kind, ref_id, idem_key, status) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     on conflict (idem_key) do nothing returning id::text, status`,
    [x.userId, x.city ?? null, x.to, x.tpl, x.subject.slice(0, 200), x.html, x.text, x.ref?.[0] ?? null, x.ref?.[1] ?? null, x.idem ?? null, st])).rows[0];
  if (!r) return null; // ya se mandó este recibo
  if (r.status === "pendiente") await mandar(r.id);
  return r;
}
async function mandar(id: string) {
  const c = (await db().query<{ to: string; subject: string; html: string; text: string; tpl: string; uid: string | null }>(
    `update email_outbox set attempts = attempts + 1 where id = $1 and status in ('pendiente', 'fallo') and attempts < 5 returning to_email::text as to, subject, html, text_body as text, tpl, user_id::text as uid`, [id])).rows[0];
  if (!c) return;
  // 9l · Una campaña lleva la baja de UN TOQUE (RFC 8058: List-Unsubscribe + List-Unsubscribe-Post), como piden Gmail y Yahoo a quien manda masivo.
  const cabeceras = c.tpl === "campaign" && c.uid ? cabecerasBaja(c.uid) : undefined;
  const r = await enviarSES({ ...c, cabeceras });
  if (r.ok) await db().query(`update email_outbox set status = 'enviado', provider_id = $2, sent_at = now(), error = null where id = $1`, [id, r.id]);
  else await db().query(`update email_outbox set status = 'fallo', error = $2 where id = $1`, [id, r.error]);
}
/* Reintenta lo pendiente o fallido (lo llama el proceso perezoso de la app; un reloj propio llega con el lanzamiento). */
let ultimo = 0;
export async function procesarCorreos() {
  if (modoCorreo() !== "ses" || Date.now() - ultimo < 60_000) return;
  ultimo = Date.now();
  const L = (await db().query<{ id: string }>(`select id::text from email_outbox where status in ('pendiente', 'fallo', 'sin_proveedor') and attempts < 5 and created_at > now() - interval '3 days' order by email_outbox.id limit 20`)).rows;
  await db().query(`update email_outbox set status = 'pendiente' where status = 'sin_proveedor' and attempts < 5 and created_at > now() - interval '3 days'`);
  for (const x of L) await mandar(x.id);
}

/* ── 9l · La baja de un toque de las campañas (List-Unsubscribe, RFC 8058) ──
   El enlace lleva a la persona y una firma HMAC (con la llave de la sesión): nadie puede dar de baja a otro cambiando el id. Un POST (el botón «Cancelar
   suscripción» de Gmail o Yahoo, sin sesión) apaga «Novedades de To'Latino» (notif_prefs.mkt y su push) y lo anota en email_unsubscribes. El mismo enlace
   va visible al pie de cada campaña (lib/crecimiento/campanas.ts); abrirlo (GET) lleva a Mi cuenta › Avisos, nunca da de baja solo (los antivirus abren
   los enlaces). */
const firmaBaja = (userId: string) => createHmac("sha256", secretoAuth()).update(`baja:mkt:${userId}`).digest("base64url").slice(0, 32);
export function enlaceBaja(userId: string): string {
  return `${BASE_URL()}/api/correo/baja?u=${encodeURIComponent(userId)}&f=${firmaBaja(userId)}`;
}
function cabecerasBaja(userId: string): Record<string, string> {
  return { "List-Unsubscribe": `<${enlaceBaja(userId)}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
}
export async function bajaDeUnToque(userId: string, firma: string, via: "un_toque" | "enlace"): Promise<boolean> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(userId) || !/^[A-Za-z0-9_-]{32}$/.test(firma)) return false;
  const a = Buffer.from(firma), b = Buffer.from(firmaBaja(userId));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const e = (await db().query<{ id: string }>(`select id::text from email_outbox where user_id = $1::uuid and tpl = 'campaign' order by email_outbox.id desc limit 1`, [userId])).rows[0];
  if (!e) return false;
  await db().query(`update users set notif_prefs = coalesce(notif_prefs, '{}'::jsonb) || '{"mkt": false, "mkt_push": false}'::jsonb where id = $1::uuid`, [userId]);
  await db().query(`insert into email_unsubscribes (user_id, kind, via, email_id) values ($1::uuid, 'mkt', $2, $3::bigint)`, [userId, via, e.id]);
  return true;
}

/* ── Verificar el correo ── */
const hash = (t: string) => createHash("sha256").update(t).digest("hex");
export async function pedirVerificacion(userId: string): Promise<{ ok: true; enlacePrueba?: string } | { ok: false; msg: { es: string; en: string } }> {
  const u = (await db().query<{ email: string | null; verif: boolean; lang: string; city: string | null; nombre: string }>(
    `select email::text, coalesce(email_verified, false) as verif, coalesce(lang, 'es') as lang, home_city_id as city, coalesce(nullif(trim(first_name), ''), '') as nombre from users where id = $1`, [userId])).rows[0];
  if (!u?.email) return { ok: false, msg: { es: "Primero escribe tu correo y guárdalo.", en: "First type your email and save it." } };
  if (u.verif) return { ok: false, msg: { es: "Tu correo ya está verificado.", en: "Your email is already verified." } };
  const n = (await db().query<{ n: number }>(`select count(*)::int as n from email_verifications where user_id = $1 and created_at > now() - interval '1 hour'`, [userId])).rows[0]?.n ?? 0;
  if (n >= 3) return { ok: false, msg: { es: "Ya te mandamos 3 enlaces en la última hora. Revisa tu correo o espera un poco.", en: "We sent you 3 links in the last hour. Check your email or wait a bit." } };
  const t = randomBytes(24).toString("base64url");
  // 9l · Un enlace de UN uso: el nuevo anula los anteriores que no se usaron (un correo viejo reenviado o robado ya no sirve).
  await db().query(`update email_verifications set revoked_at = now() where user_id = $1 and used_at is null and revoked_at is null`, [userId]);
  await db().query(`insert into email_verifications (user_id, email, token_hash, expires_at) values ($1, $2, $3, now() + interval '24 hours')`, [userId, u.email, hash(t)]);
  const es = u.lang !== "en", href = `${BASE_URL()}/cuenta/correo?t=${t}`;
  const { html, text } = marco({ es, pre: es ? "Confirma tu correo" : "Confirm your email", titulo: es ? "Confirma tu correo" : "Confirm your email",
    intro: es ? `Hola${u.nombre ? ` ${u.nombre}` : ""}: toca el botón para confirmar que este correo es tuyo. Así te llegan tus recibos y puedes recuperar tu cuenta.` : `Hi${u.nombre ? ` ${u.nombre}` : ""}: tap the button to confirm this email is yours. That way you get your receipts and can recover your account.`,
    nota: es ? "El enlace sirve 24 horas y una sola vez. Si no fuiste tú, ignora este correo." : "The link works for 24 hours, once. If it was not you, ignore this email.", cta: { l: es ? "Confirmar mi correo" : "Confirm my email", href } });
  await encolar({ userId, city: u.city, to: u.email, tpl: "verify", subject: es ? "Confirma tu correo en To’Latino" : "Confirm your email on To’Latino", html, text, ref: ["user", userId] });
  return { ok: true, enlacePrueba: modoCorreo() === "pruebas" ? `/cuenta/correo?t=${t}` : undefined };
}
export async function confirmarCorreo(userId: string, token: string): Promise<{ ok: boolean; email?: string; msg?: { es: string; en: string } }> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(String(token ?? ""))) return { ok: false, msg: { es: "Ese enlace no es válido.", en: "That link is not valid." } };
  const r = (await db().query<{ email: string }>(
    `update email_verifications set used_at = now() where token_hash = $1 and user_id = $2 and used_at is null and revoked_at is null and expires_at > now() returning email::text`, [hash(token), userId])).rows[0];
  if (!r) return { ok: false, msg: { es: "El enlace ya se usó, venció o pediste otro después. Usa el último que te mandamos o pide otro desde tu Perfil.", en: "The link was used, expired or you asked for a newer one. Use the latest one we sent or ask for another from your Profile." } };
  const u = await db().query(`update users set email_verified = true where id = $1 and lower(email::text) = lower($2)`, [userId, r.email]);
  if (!u.rowCount) return { ok: false, msg: { es: "Cambiaste tu correo después de pedir el enlace. Pide otro.", en: "You changed your email after asking for the link. Ask for another." } };
  return { ok: true, email: r.email };
}
