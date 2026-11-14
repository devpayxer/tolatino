import "server-only";
import { createVerify, X509Certificate } from "node:crypto";
import { cifrar, huella } from "../cifrado";
import { tapar } from "../compa/tapar";
import { db } from "../db";
import { ENTORNO } from "../entorno";

/* 9l · El correo que entra a Soporte (L977, L1131, §6 #23; guardián correoEntranteFirmado). Amazon SES recibe el correo en la dirección de Soporte y lo
   publica en un tema de SNS que llama a /api/correo/entrada. SOLO entra lo que Amazon firma y aprueba:
   1. La FIRMA de SNS, antes de leer nada más: el certificado sale solo de https://sns.<región>.amazonaws.com/…pem (fuera de producción, también de
      CORREO_SNS_HOSTS en localhost, como el simulador de Wallet), SignatureVersion 1 (SHA1) o 2 (SHA256) sobre la cadena canónica de SNS. El tema tiene que
      ser EL NUESTRO (CORREO_SNS_TEMA: cualquiera puede crear un tema propio y firmar con el certificado de Amazon). Sin el tema en el entorno, nada entra.
      La hora firmada: dentro de una hora (repetición); el MessageId de SNS y el de SES, una vez.
   2. Los veredictos de SES: virus y spam PASS, y SPF o DKIM PASS (el remitente es quien dice). Lo demás queda «rechazado» con su motivo, sin caso.
   3. El remitente: el correo CONFIRMADO de UNA cuenta (aunque esté suspendida: es justo quien no puede entrar). Si no, «sin cuenta» y una respuesta que
      dice cómo escribir (una al día por remitente). El texto entra TAPADO (sin tarjetas ni seguro social) y sin lo citado de correos anteriores.
   4. Un caso TK- con origen «correo» (o, si el asunto trae el número de un caso abierto de esa persona, su mensaje en ese caso). El remitente y el texto se
      guardan cifrado y tapado, y se vacían a retener_correo_entrante_dias. Nada de esto va al registro del servidor. */
export type ResultadoEntrada = { estado: "caso" | "mensaje" | "sin_cuenta" | "rechazado" | "repetido" | "confirmado"; numero?: string };
type Sns = { Type?: string; MessageId?: string; TopicArn?: string; Subject?: string; Message?: string; Timestamp?: string; SignatureVersion?: string; Signature?: string; SigningCertURL?: string; SubscribeURL?: string; Token?: string };

const HOST_SNS = /^sns\.[a-z0-9-]+\.amazonaws\.com$/;
function hostsPrueba(): string[] {
  if (ENTORNO === "produccion") return [];
  return String(process.env.CORREO_SNS_HOSTS ?? "").split(",").map((x) => x.trim()).filter((x) => /^(127\.0\.0\.1|localhost):\d{2,5}$/.test(x));
}
/* ¿De dónde se puede bajar el certificado? Solo de SNS por https (o de localhost fuera de producción). */
export function urlCertificadoValida(u: string): boolean {
  try {
    const x = new URL(u);
    if (x.username || x.password || !/\.pem$/.test(x.pathname)) return false;
    if (x.protocol === "https:" && (x.port === "" || x.port === "443") && HOST_SNS.test(x.hostname)) return true;
    return x.protocol === "http:" && hostsPrueba().includes(x.host);
  } catch { return false; }
}
const cache = new Map<string, { pem: string; at: number }>();
async function certificado(u: string): Promise<string | null> {
  const c = cache.get(u);
  if (c && Date.now() - c.at < 3_600_000) return c.pem;
  try {
    const r = await fetch(u, { redirect: "error", signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    const pem = (await r.text()).slice(0, 20_000);
    const x = new X509Certificate(pem);
    if (new Date(x.validTo).getTime() < Date.now()) return null;
    cache.set(u, { pem, at: Date.now() });
    return pem;
  } catch { return null; }
}
/* La cadena que firma SNS (cada tipo con sus campos, en este orden). */
export function cadenaSns(m: Sns): string | null {
  const campos = m.Type === "Notification" ? ["Message", "MessageId", "Subject", "Timestamp", "TopicArn", "Type"]
    : m.Type === "SubscriptionConfirmation" || m.Type === "UnsubscribeConfirmation" ? ["Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type"] : null;
  if (!campos) return null;
  let s = "";
  for (const k of campos) {
    const v = (m as Record<string, unknown>)[k];
    if (v == null) { if (k === "Subject") continue; return null; }
    s += `${k}\n${String(v)}\n`;
  }
  return s;
}
/* 1 · La firma de SNS (antes de leer el mensaje de SES). */
export async function firmaSns(m: Sns): Promise<{ ok: true } | { ok: false; motivo: "firma" | "tema" | "hora" | "sin_secreto" }> {
  const tema = process.env.CORREO_SNS_TEMA ?? "";
  if (!/^arn:aws:sns:[a-z0-9-]+:\d{12}:[A-Za-z0-9_-]{1,256}$/.test(tema)) return { ok: false, motivo: "sin_secreto" };
  if (m.TopicArn !== tema) return { ok: false, motivo: "tema" };
  const cad = cadenaSns(m), ver = m.SignatureVersion === "2" ? "RSA-SHA256" : m.SignatureVersion === "1" ? "RSA-SHA1" : null;
  if (!cad || !ver || !m.Signature || !m.SigningCertURL || !urlCertificadoValida(m.SigningCertURL)) return { ok: false, motivo: "firma" };
  const pem = await certificado(m.SigningCertURL);
  if (!pem) return { ok: false, motivo: "firma" };
  let ok = false;
  try { ok = createVerify(ver).update(cad, "utf8").verify(pem, Buffer.from(m.Signature, "base64")); } catch { ok = false; }
  if (!ok) return { ok: false, motivo: "firma" };
  const t = Date.parse(String(m.Timestamp ?? ""));
  if (!Number.isFinite(t) || Math.abs(Date.now() - t) > 3_600_000) return { ok: false, motivo: "hora" };
  return { ok: true };
}

/* ── El correo (MIME) ── */
const QP = (s: string) => s.replace(/=\r?\n/g, "").replace(/=([0-9A-Fa-f]{2})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
function decodificar(cuerpo: string, cte: string, charset: string): string {
  const c = cte.toLowerCase();
  let buf: Buffer;
  if (c === "base64") buf = Buffer.from(cuerpo.replace(/\s+/g, ""), "base64");
  else if (c === "quoted-printable") buf = Buffer.from(QP(cuerpo), "latin1");
  else buf = Buffer.from(cuerpo, "latin1");
  return /utf-?8/i.test(charset) || !charset ? buf.toString("utf8") : buf.toString("latin1");
}
function partir(raw: string): { h: Record<string, string>; b: string } {
  const i = raw.search(/\r?\n\r?\n/);
  const cab = i < 0 ? raw : raw.slice(0, i), b = i < 0 ? "" : raw.slice(i).replace(/^\r?\n\r?\n/, "");
  const h: Record<string, string> = {};
  for (const l of cab.replace(/\r?\n[ \t]+/g, " ").split(/\r?\n/)) { const m = /^([A-Za-z0-9-]+):\s*(.*)$/.exec(l); if (m) h[m[1]!.toLowerCase()] = m[2]!; }
  return { h, b };
}
/* El texto plano del correo (el de text/plain; si solo hay HTML, sin etiquetas). Hasta 3 niveles de multipart. */
export function textoDelCorreo(raw: string, nivel = 0): string {
  const { h, b } = partir(raw);
  const ct = h["content-type"] ?? "text/plain", cte = h["content-transfer-encoding"] ?? "7bit", cs = /charset="?([^";]+)"?/i.exec(ct)?.[1] ?? "utf-8";
  const bd = /boundary="?([^";]+)"?/i.exec(ct)?.[1];
  if (/^multipart\//i.test(ct) && bd && nivel < 3) {
    const partes = b.split(`--${bd}`).slice(1).filter((p) => !p.startsWith("--"));
    const txt = partes.map((p) => ({ p, ct: partir(p.replace(/^\r?\n/, "")).h["content-type"] ?? "text/plain" }));
    const plano = txt.find((x) => /^text\/plain/i.test(x.ct)) ?? txt.find((x) => /^multipart\//i.test(x.ct)) ?? txt.find((x) => /^text\/html/i.test(x.ct));
    return plano ? textoDelCorreo(plano.p.replace(/^\r?\n/, ""), nivel + 1) : "";
  }
  const t = decodificar(b, cte, cs);
  return /^text\/html/i.test(ct) ? t.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, "").replace(/<br\s*\/?>|<\/p>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") : t;
}
/* Sin lo citado de correos anteriores («El … escribió:», «On … wrote:», líneas con «>»). */
export function sinCitas(t: string): string {
  const L: string[] = [];
  for (const l of t.replace(/\r/g, "").split("\n")) {
    if (/^\s*>/.test(l)) continue;
    if (/^\s*(El .{3,120} escribió:|On .{3,120} wrote:|-{2,}\s*Original Message|-{2,}\s*Mensaje original|De: .+|From: .+@.+)\s*$/i.test(l)) break;
    L.push(l);
  }
  return L.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
const dirDe = (s: string) => (/<([^<>\s]+@[^<>\s]+)>/.exec(s)?.[1] ?? /([^\s<>"]+@[^\s<>"]+)/.exec(s)?.[1] ?? "").toLowerCase().slice(0, 254);
const veredicto = (x: unknown) => { const v = String((x as { status?: unknown })?.status ?? "").toUpperCase(); return ["PASS", "FAIL", "GRAY", "PROCESSING_FAILED", "DISABLED"].includes(v) ? v : "GRAY"; };

/* 2–4 · Un aviso de SES ya firmado: decide y deja el caso. */
export async function recibirCorreo(snsId: string, msg: unknown): Promise<ResultadoEntrada> {
  const n = msg as { notificationType?: string; mail?: { messageId?: string; source?: string; commonHeaders?: { from?: string[]; subject?: string } }; receipt?: Record<string, unknown>; content?: string };
  if (n?.notificationType !== "Received" || !n.mail?.messageId) return { estado: "rechazado" };
  const r = n.receipt ?? {}, spf = veredicto(r.spfVerdict), dkim = veredicto(r.dkimVerdict), spam = veredicto(r.spamVerdict), virus = veredicto(r.virusVerdict);
  const de = dirDe(n.mail.commonHeaders?.from?.[0] ?? n.mail.source ?? ""), dominio = de.split("@")[1] ?? "desconocido";
  const asunto = tapar(String(n.mail.commonHeaders?.subject ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").slice(0, 200)).texto;
  const crudo = typeof n.content === "string" ? n.content : "";
  const texto = tapar(sinCitas(textoDelCorreo(crudo.slice(0, 2_000_000))).replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").slice(0, 4000)).texto;
  const motivo = virus !== "PASS" ? "virus" : spam !== "PASS" ? "spam" : spf !== "PASS" && dkim !== "PASS" ? (dkim === "FAIL" ? "dkim" : "spf") : !de || texto.replace(/\s+/g, "").length < 10 ? "vacio" : null;
  // La persona: el correo confirmado de UNA cuenta.
  const U = motivo ? [] : (await db().query<{ id: string; city: string | null; lang: string }>(
    `select id::text, home_city_id as city, coalesce(lang, 'es') as lang from users where lower(email::text) = $1 and coalesce(email_verified, false) and status not in ('deleted', 'merged') limit 2`, [de])).rows;
  const u = U.length === 1 ? U[0]! : null;
  const fila = async (estado: string, razon: string | null, caso: string | null) => (await db().query<{ id: string }>(
    `insert into support_email_in (sns_message_id, ses_message_id, from_hash, from_enc, from_domain, subject, body, spf, dkim, spam, virus, status, reason, user_id, case_id, city_id)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::bigint, $16) on conflict do nothing returning id::text`,
    [snsId.slice(0, 100), String(n.mail!.messageId).slice(0, 200), huella(`correo:${de}`), de ? cifrar(de) : null, dominio.slice(0, 253), asunto || null, motivo === "virus" ? null : texto || null,
      spf, dkim, spam, virus, estado, razon, u?.id ?? null, caso, u?.city ?? "hzl"])).rows[0]?.id ?? null;
  const ya = (await db().query(`select 1 from support_email_in where sns_message_id = $1 or ses_message_id = $2`, [snsId.slice(0, 100), String(n.mail.messageId).slice(0, 200)])).rowCount;
  if (ya) return { estado: "repetido" };
  if (motivo) { await fila("rechazado", motivo, null); return { estado: "rechazado" }; }
  if (!u) {
    const id = await fila("sin_cuenta", U.length > 1 ? "varias_cuentas" : null, null);
    if (id) await acuseSinCuenta(de, huella(`correo:${de}`));
    return { estado: "sin_cuenta" };
  }
  // ¿Contesta un caso suyo abierto? (el número en el asunto)
  const tk = /\bTK-\d{4,12}\b/.exec(asunto)?.[0];
  if (tk) {
    const { escribirCaso } = await import("../soporte");
    const e = await escribirCaso({ userId: u.id }, tk, texto);
    if (e.ok) {
      const k = (await db().query<{ id: string }>(`select id::text from support_cases where number = $1`, [tk])).rows[0];
      await fila("mensaje", null, k?.id ?? null);
      return { estado: "mensaje", numero: tk };
    }
  }
  const { abrirCaso } = await import("../soporte");
  const a = await abrirCaso({ userId: u.id }, { tema: "cuenta", texto: asunto ? `${asunto}\n\n${texto}` : texto, clave: null },
    { origen: "correo", resumen: null, dispositivo: { device: "Correo", version: "correo" } });
  if (!a.ok || !a.numero) { await fila("sin_cuenta", "tope", null); return { estado: "sin_cuenta" }; }
  const k = (await db().query<{ id: string }>(`select id::text from support_cases where number = $1`, [a.numero])).rows[0];
  await fila("caso", null, k?.id ?? null);
  await acuseCaso(u.id, de, a.numero);
  return { estado: "caso", numero: a.numero };
}

/* El acuse por correo: «Recibimos tu correo · caso TK-…» (al mismo correo confirmado). */
async function acuseCaso(userId: string, para: string, numero: string) {
  const { BASE_URL, encolar } = await import("./index"), { marco } = await import("./plantillas");
  const u = (await db().query<{ lang: string; city: string | null }>(`select coalesce(lang, 'es') as lang, home_city_id as city from users where id = $1`, [userId])).rows[0];
  const es = u?.lang !== "en";
  const { html, text } = marco({ es, pre: es ? `Tu caso ${numero}` : `Your case ${numero}`, titulo: es ? `Recibimos tu correo · ${numero}` : `We got your email · ${numero}`,
    intro: es ? "Una persona del equipo de Soporte lo lee y te contesta. Para seguir, contesta este correo (sin cambiar el asunto) o entra a To'Latino › Soporte." : "A person on the Support team reads it and replies. To continue, reply to this email (keep the subject) or go to To'Latino › Support.",
    nota: es ? "Nunca te pedimos números de tarjeta ni de seguro social. Si los escribiste, los tapamos." : "We never ask for card or social security numbers. If you wrote them, we covered them.",
    cta: { l: es ? "Ver mi caso" : "See my case", href: `${BASE_URL()}/soporte?caso=${encodeURIComponent(numero)}` } });
  await encolar({ userId, city: u?.city ?? null, to: para, tpl: "support_ack", subject: es ? `Recibimos tu correo · ${numero}` : `We got your email · ${numero}`, html, text, ref: ["support", numero], idem: `sop-ack-${numero}` }).catch(() => null);
}
/* Sin cuenta con ese correo confirmado: cómo escribirnos (una vez al día por remitente; solo a quien pasó SPF o DKIM). */
async function acuseSinCuenta(para: string, h: string) {
  const { BASE_URL, encolar } = await import("./index"), { marco } = await import("./plantillas");
  const dia = (await db().query<{ d: string }>(`select (now() at time zone 'America/New_York')::date::text as d`)).rows[0]?.d ?? "";
  const { html, text } = marco({ es: true, pre: "Soporte de To'Latino", titulo: "No encontramos tu cuenta · We could not find your account",
    intro: "No hay una cuenta de To'Latino con este correo confirmado. Escríbenos desde el correo que confirmaste en tu cuenta, o entra a To'Latino › Soporte. · There is no To'Latino account with this confirmed email. Write from the email you confirmed in your account, or go to To'Latino › Support.",
    cta: { l: "Soporte · Support", href: `${BASE_URL()}/soporte` } });
  await encolar({ userId: null, to: para, tpl: "support_ack", subject: "Soporte de To'Latino · To'Latino Support", html, text, idem: `sop-sin-${h.slice(0, 24)}-${dia}` }).catch(() => null);
}

/* La retención (el barrido): pasado retener_correo_entrante_dias, el texto y el remitente cifrado se vacían. */
export async function purgarCorreoEntrante(): Promise<number> {
  return (await db().query(
    `update support_email_in set subject = null, body = null, from_enc = null, purged_at = now() where id in (select id from support_email_in where purged_at is null and received_at < now() - make_interval(days => cfg_int('retener_correo_entrante_dias')) order by id limit 5000)`)).rowCount ?? 0;
}

/* Super Admin › Soporte: los correos que entraron (sin el remitente: su dominio; sin el texto de lo rechazado). */
export type CorreoEntrante = { id: string; at: string; dominio: string; asunto: string | null; estado: string; motivo: string | null; caso: string | null; spf: string; dkim: string };
export async function correosEntrantes(ciudades: string[]): Promise<CorreoEntrante[]> {
  return (await db().query<CorreoEntrante>(
    `select e.id::text, to_char(e.received_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, e.from_domain as dominio, e.subject as asunto, e.status as estado, e.reason as motivo,
            c.number as caso, e.spf, e.dkim
       from support_email_in e left join support_cases c on c.id = e.case_id
      where (cardinality($1::text[]) = 0 or e.city_id = any($1::text[])) order by e.id desc limit 30`, [ciudades])).rows;
}
