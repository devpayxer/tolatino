import "server-only";
import { createHash, createHmac } from "node:crypto";

/* Envío por Amazon SES v2 (PLAN §8: «Correo · envío por SES»). Sin SDK: la firma AWS Signature V4 se hace aquí (se prueba
   contra el vector oficial de AWS en scripts/prueba-firma-ses.mjs). Llaves en los secretos del entorno:
   SES_ACCESS_KEY_ID, SES_SECRET_ACCESS_KEY, SES_REGION (us-east-1 por defecto) y CORREO_DE (el remitente verificado). */
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

export function sesListo() {
  return !!(process.env.SES_ACCESS_KEY_ID && process.env.SES_SECRET_ACCESS_KEY && process.env.CORREO_DE);
}
export async function enviarSES(m: { to: string; subject: string; html: string; text: string; cabeceras?: Record<string, string> }): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const region = process.env.SES_REGION || "us-east-1", host = `email.${region}.amazonaws.com`, path = "/v2/email/outbound-emails";
  // 9l · Cabeceras propias (la baja de un toque de las campañas: List-Unsubscribe y List-Unsubscribe-Post), con Content.Simple.Headers de SES v2.
  const Headers = m.cabeceras ? Object.entries(m.cabeceras).map(([Name, Value]) => ({ Name, Value })) : undefined;
  const body = JSON.stringify({
    FromEmailAddress: process.env.CORREO_DE, Destination: { ToAddresses: [m.to] },
    Content: { Simple: { Subject: { Data: m.subject, Charset: "UTF-8" }, Body: { Html: { Data: m.html, Charset: "UTF-8" }, Text: { Data: m.text, Charset: "UTF-8" } }, ...(Headers ? { Headers } : {}) } },
  });
  const f = firmarV4({ method: "POST", host, path, headers: { "content-type": "application/json" }, body, region, service: "ses", key: process.env.SES_ACCESS_KEY_ID!, secret: process.env.SES_SECRET_ACCESS_KEY!, date: new Date() });
  try {
    const r = await fetch(`https://${host}${path}`, { method: "POST", headers: { "content-type": "application/json", "x-amz-date": f.amzDate, authorization: f.authorization }, body, signal: AbortSignal.timeout(10_000) });
    const j = (await r.json().catch(() => ({}))) as { MessageId?: string; message?: string };
    return r.ok && j.MessageId ? { ok: true, id: j.MessageId } : { ok: false, error: `${r.status} ${j.message ?? ""}`.slice(0, 300) };
  } catch (e) { return { ok: false, error: String((e as Error).message ?? e).slice(0, 300) }; }
}
