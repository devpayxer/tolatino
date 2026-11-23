import "server-only";
import { createHash, createHmac } from "node:crypto";
import { llave, llaveYa } from "../llaves-proveedores";

/* Envío por Amazon SES v2 (PLAN §8: «Correo · envío por SES»). Sin SDK: la firma AWS Signature V4 se hace aquí (se prueba
   contra el vector oficial de AWS en scripts/prueba-firma-ses.mjs). Las llaves (SES_ACCESS_KEY_ID, SES_SECRET_ACCESS_KEY) las da
   lib/llaves-proveedores.ts (el entorno o el llavero); SES_REGION (us-east-1 por defecto) y CORREO_DE (el remitente verificado) son configuración. */
const h = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");
const hmac = (k: string | Buffer, s: string) => createHmac("sha256", k).update(s).digest();

export type Firma = { authorization: string; amzDate: string };
/* AWS SigV4 (canonical request → string to sign → firma). `headers` en minúsculas; se firman todos. */
export function firmarV4(x: { method: string; host: string; path: string; query?: string; headers: Record<string, string>; body: string; region: string; service: string; key: string; secret: string; date: Date }): Firma {
  const amzDate = x.date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""), day = amzDate.slice(0, 8);
  const hs: Record<string, string> = Object.fromEntries(Object.entries({ ...x.headers, host: x.host, "x-amz-date": amzDate }).map(([k, v]) => [k.toLowerCase(), String(v).trim().replace(/\s+/g, " ")]));
  const nombres = Object.keys(hs).sort();
  const canon = nombres.map((k) => `${k}:${hs[k]}\n`).join("");
  const firmados = nombres.join(";");
  const req = [x.method, x.path, x.query ?? "", canon, firmados, h(x.body)].join("\n");
  const scope = `${day}/${x.region}/${x.service}/aws4_request`;
  const sts = ["AWS4-HMAC-SHA256", amzDate, scope, h(req)].join("\n");
  const kSig = hmac(hmac(hmac(hmac(`AWS4${x.secret}`, day), x.region), x.service), "aws4_request");
  const firma = createHmac("sha256", kSig).update(sts).digest("hex");
  return { amzDate, authorization: `AWS4-HMAC-SHA256 Credential=${x.key}/${scope}, SignedHeaders=${firmados}, Signature=${firma}` };
}

/* 23 nov · A dónde van las llamadas de este archivo (enviar y probar). En producción, siempre email.<región>.amazonaws.com por https. SES_API_BASE (la
   dirección del simulador de las pruebas, que pasa pruebas/servir/servir.sh) cambia SOLO el origen (esquema, servidor y puerto),
   nunca la ruta ni las cabeceras, y la firma SigV4 se hace para ESE servidor (SigV4 firma la cabecera host: firmar un host y llamar a otro = 403).
   Se ignora salvo con TOLATINO_ENTORNO=pruebas y una dirección local (127.0.0.1 / localhost, sin ruta): en producción no tiene efecto aunque alguien
   la ponga (además está PROHIBIDA en infra/comun/secretos.json; guardián proveedoresSimuladorAislado). */
function origenDePruebas(v: string | undefined): URL | null {
  if (process.env.TOLATINO_ENTORNO !== "pruebas" || !v) return null;
  let u: URL;
  try { u = new URL(v); } catch { return null; }
  if (!/^https?:$/.test(u.protocol) || !["127.0.0.1", "localhost"].includes(u.hostname) || u.username || u.password || u.pathname !== "/" || u.search || u.hash) return null;
  return u;
}
export function destinoSes(region: string): { origen: string; host: string } {
  const p = origenDePruebas(process.env.SES_API_BASE), real = `email.${region}.amazonaws.com`;
  return p ? { origen: p.origin, host: p.host } : { origen: `https://${real}`, host: real };
}

export function sesListo() {
  return !!(llaveYa("SES_ACCESS_KEY_ID") && llaveYa("SES_SECRET_ACCESS_KEY") && process.env.CORREO_DE);
}
export async function enviarSES(m: { to: string; subject: string; html: string; text: string; cabeceras?: Record<string, string> }): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const region = process.env.SES_REGION || "us-east-1", d = destinoSes(region), path = "/v2/email/outbound-emails";
  // 9l · Cabeceras propias (la baja de un toque de las campañas: List-Unsubscribe y List-Unsubscribe-Post), con Content.Simple.Headers de SES v2.
  const Headers = m.cabeceras ? Object.entries(m.cabeceras).map(([Name, Value]) => ({ Name, Value })) : undefined;
  const body = JSON.stringify({
    FromEmailAddress: process.env.CORREO_DE, Destination: { ToAddresses: [m.to] },
    Content: { Simple: { Subject: { Data: m.subject, Charset: "UTF-8" }, Body: { Html: { Data: m.html, Charset: "UTF-8" }, Text: { Data: m.text, Charset: "UTF-8" } }, ...(Headers ? { Headers } : {}) } },
  });
  const key = await llave("SES_ACCESS_KEY_ID"), secret = await llave("SES_SECRET_ACCESS_KEY");
  if (!key || !secret) return { ok: false, error: "sin_llave" };
  const f = firmarV4({ method: "POST", host: d.host, path, headers: { "content-type": "application/json" }, body, region, service: "ses", key, secret, date: new Date() });
  try {
    const r = await fetch(`${d.origen}${path}`, { method: "POST", headers: { "content-type": "application/json", "x-amz-date": f.amzDate, authorization: f.authorization }, body, signal: AbortSignal.timeout(10_000) });
    const j = (await r.json().catch(() => ({}))) as { MessageId?: string; message?: string };
    return r.ok && j.MessageId ? { ok: true, id: j.MessageId } : { ok: false, error: `${r.status} ${j.message ?? ""}`.slice(0, 300) };
  } catch (e) { return { ok: false, error: String((e as Error).message ?? e).slice(0, 300) }; }
}

/* 23 nov · «Probar» de Integraciones › Llaves: GET /v2/email/account (solo lectura; dice si la cuenta salió del modo de prueba) firmado con ESE par. */
export async function probarSes(): Promise<{ ok: boolean; resultado: string }> {
  const key = await llave("SES_ACCESS_KEY_ID"), secret = await llave("SES_SECRET_ACCESS_KEY");
  if (!key || !secret) return { ok: false, resultado: "falta_par" };
  const region = process.env.SES_REGION || "us-east-1", d = destinoSes(region), path = "/v2/email/account";
  const f = firmarV4({ method: "GET", host: d.host, path, headers: {}, body: "", region, service: "ses", key, secret, date: new Date() });
  try {
    const r = await fetch(`${d.origen}${path}`, { headers: { "x-amz-date": f.amzDate, authorization: f.authorization }, signal: AbortSignal.timeout(8000) });
    return r.ok ? { ok: true, resultado: "sirve" } : { ok: false, resultado: r.status === 403 ? "rechazada" : `http_${r.status}` };
  } catch { return { ok: false, resultado: "sin_conexion" }; }
}
