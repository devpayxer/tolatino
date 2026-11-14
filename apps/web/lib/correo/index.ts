import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "../db";
import { ENTORNO } from "../entorno";
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

type Tpl = "verify" | "receipt_order" | "receipt_table" | "receipt_pro" | "receipt_tickets" | "report" | "founder_daily" | "campaign"; // 9h · campaign: Crecimiento › Campañas por correo
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
  const c = (await db().query<{ to: string; subject: string; html: string; text: string }>(
    `update email_outbox set attempts = attempts + 1 where id = $1 and status in ('pendiente', 'fallo') and attempts < 5 returning to_email::text as to, subject, html, text_body as text`, [id])).rows[0];
  if (!c) return;
  const r = await enviarSES(c);
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
    `update email_verifications set used_at = now() where token_hash = $1 and user_id = $2 and used_at is null and expires_at > now() returning email::text`, [hash(token), userId])).rows[0];
  if (!r) return { ok: false, msg: { es: "El enlace ya se usó o venció. Pide otro desde tu Perfil.", en: "The link was used or expired. Ask for another from your Profile." } };
  const u = await db().query(`update users set email_verified = true where id = $1 and lower(email::text) = lower($2)`, [userId, r.email]);
  if (!u.rowCount) return { ok: false, msg: { es: "Cambiaste tu correo después de pedir el enlace. Pide otro.", en: "You changed your email after asking for the link. Ask for another." } };
  return { ok: true, email: r.email };
}
