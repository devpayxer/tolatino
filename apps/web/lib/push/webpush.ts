import "server-only";
import { createCipheriv, createECDH, createHash, createHmac, createPublicKey, randomBytes, sign as firmar, type KeyObject } from "node:crypto";

/* 8c · Web Push propio (fase8-apps.md §3.3): el contenido va cifrado de punta a punta con «aes128gcm» (RFC 8188) y las llaves del navegador
   (RFC 8291), y cada envío se identifica con VAPID (RFC 8292: un JWT ES256 firmado con NUESTRA llave; sin cuenta de nadie). Sin bibliotecas:
   node:crypto. El servicio de push del navegador (Apple, Google, Mozilla, Microsoft) solo ve bytes cifrados; nosotros no guardamos nada en claro.
   Módulo autocontenido (sin la base): lo compila aparte el contrato (scripts/contrato-push) y lo prueba contra una implementación independiente.
   SSRF: solo se le escribe a un servicio de push conocido (endpointPermitido); el navegador da la dirección, pero el servidor decide si la usa. */

export type ResultadoPush = { result: "enviado" | "invalido" | "rechazado" | "limite" | "error"; status?: number; code?: string; id?: string; retryAfter?: number };
const b64u = (b: Buffer | string) => Buffer.from(b).toString("base64url");
const hmac = (k: Buffer, d: Buffer) => createHmac("sha256", k).update(d).digest();
export const RS = 4096;
/* Lo máximo que cabe en un solo registro: rs − 16 (etiqueta) − 1 (delimitador). Nuestro aviso es mucho menor (≤ 3 KB). */
export const MAX_TEXTO = RS - 17;

/* RFC 8291 §3.4 + RFC 8188 §2: un solo registro. `salt` y `asPrivada` solo los fija una prueba (vector del RFC); en uso, al azar cada vez. */
export function cifrarAes128gcm(uaPublic: Buffer, auth: Buffer, texto: Buffer, o: { salt?: Buffer; asPrivada?: Buffer } = {}): Buffer {
  if (uaPublic.length !== 65 || uaPublic[0] !== 4) throw new Error("p256dh no es un punto P-256 sin comprimir");
  if (auth.length !== 16) throw new Error("auth no es de 16 bytes");
  if (texto.length > MAX_TEXTO) throw new Error("el aviso no cabe en un registro");
  const as = createECDH("prime256v1");
  if (o.asPrivada) as.setPrivateKey(o.asPrivada); else as.generateKeys();
  const asPublic = as.getPublicKey();
  const secreto = as.computeSecret(uaPublic);
  // HKDF-SHA-256 (un solo bloque: L ≤ 32): extraer con el secreto de autenticación, expandir con «WebPush: info».
  const prkKey = hmac(auth, secreto);
  const ikm = hmac(prkKey, Buffer.concat([Buffer.from("WebPush: info\0", "latin1"), uaPublic, asPublic, Buffer.from([1])]));
  const salt = o.salt ?? randomBytes(16);
  if (salt.length !== 16) throw new Error("salt de 16 bytes");
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.from("Content-Encoding: aes128gcm\0\x01", "latin1")).subarray(0, 16);
  const nonce = hmac(prk, Buffer.from("Content-Encoding: nonce\0\x01", "latin1")).subarray(0, 12);
  const c = createCipheriv("aes-128-gcm", cek, nonce);
  const ct = Buffer.concat([c.update(Buffer.concat([texto, Buffer.from([2])])), c.final(), c.getAuthTag()]);
  const cab = Buffer.alloc(21);
  salt.copy(cab, 0); cab.writeUInt32BE(RS, 16); cab[20] = asPublic.length;
  return Buffer.concat([cab, asPublic, ct]);
}

/* VAPID (RFC 8292 §2): JWT ES256 con aud = el origen del servicio de push, exp ≤ 24 h (12 h) y sub = cómo contactarnos (https o mailto). */
export function jwtVapid(aud: string, sujeto: string, privada: KeyObject, ahoraMs = Date.now()): string {
  const h = b64u(JSON.stringify({ typ: "JWT", alg: "ES256" })), p = b64u(JSON.stringify({ aud, exp: Math.floor(ahoraMs / 1000) + 12 * 3600, sub: sujeto }));
  const firma = firmar("sha256", Buffer.from(`${h}.${p}`), { key: privada, dsaEncoding: "ieee-p1363" });
  return `${h}.${p}.${b64u(firma)}`;
}
/* La llave pública VAPID como la pide el navegador (applicationServerKey) y la cabecera (k=): punto sin comprimir en base64url. */
export function publicaVapid(privada: KeyObject): string {
  const j = createPublicKey(privada).export({ format: "jwk" }) as { x: string; y: string };
  return b64u(Buffer.concat([Buffer.from([4]), Buffer.from(j.x, "base64url"), Buffer.from(j.y, "base64url")]));
}

/* Los servicios de push que conocemos (los que dan Chrome, Edge, Firefox y Safari). Cualquier otra dirección no se registra ni se llama. */
const HOSTS = [/^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /^web\.push\.apple\.com$/, /^[a-z0-9-]+\.push\.apple\.com$/, /^[a-z0-9-]+\.notify\.windows\.com$/];
export function endpointPermitido(url: string, extra: string[] = []): boolean {
  let u: URL;
  try { u = new URL(url); } catch { return false; }
  if (url.length > 1024 || u.username || u.password) return false;
  // Un simulador local (solo fuera de producción: quien llama decide `extra`) puede ser http://127.0.0.1:puerto.
  if (extra.includes(u.host)) return u.protocol === "http:" || u.protocol === "https:";
  return u.protocol === "https:" && (u.port === "" || u.port === "443") && HOSTS.some((re) => re.test(u.hostname));
}

/* «Topic» (RFC 8030 §5.4): un aviso nuevo con el mismo tema reemplaza al que todavía espera en el servicio. Máximo 32 caracteres base64url. */
export const temaDe = (clave: string) => createHash("sha256").update(clave).digest("base64url").slice(0, 32);

export type Suscripcion = { endpoint: string; p256dh: string; auth: string };
export type Vapid = { privada: KeyObject; publica: string; sujeto: string };
/* Un envío. TTL en segundos; urgencia «high» solo para lo que no espera (RFC 8030 §5.3). Nunca lanza: devuelve el resultado. */
export async function enviarWebPush(s: Suscripcion, texto: string, o: { ttl: number; urgente: boolean; tema?: string | null; extra?: string[]; timeoutMs?: number }, v: Vapid): Promise<ResultadoPush> {
  if (!endpointPermitido(s.endpoint, o.extra ?? [])) return { result: "invalido", code: "endpoint_no_permitido" };
  let cuerpo: Buffer;
  try { cuerpo = cifrarAes128gcm(Buffer.from(s.p256dh, "base64url"), Buffer.from(s.auth, "base64url"), Buffer.from(texto, "utf8")); }
  catch { return { result: "invalido", code: "llaves_invalidas" }; }
  const aud = new URL(s.endpoint).origin;
  const h: Record<string, string> = {
    authorization: `vapid t=${jwtVapid(aud, v.sujeto, v.privada)}, k=${v.publica}`,
    "content-encoding": "aes128gcm", "content-type": "application/octet-stream",
    ttl: String(Math.max(0, Math.min(2419200, Math.floor(o.ttl)))), urgency: o.urgente ? "high" : "normal",
  };
  if (o.tema) h.topic = o.tema;
  try {
    const r = await fetch(s.endpoint, { method: "POST", headers: h, body: new Uint8Array(cuerpo), redirect: "manual", signal: AbortSignal.timeout(o.timeoutMs ?? 10_000) });
    const ra = Number(r.headers.get("retry-after")) || undefined;
    await r.arrayBuffer().catch(() => undefined);
    if (r.status === 201 || r.status === 200 || r.status === 202) return { result: "enviado", status: r.status, id: (r.headers.get("location") ?? "").slice(-100) || undefined };
    if (r.status === 404 || r.status === 410) return { result: "invalido", status: r.status, code: r.status === 410 ? "Gone" : "NotFound" };
    if (r.status === 429) return { result: "limite", status: 429, code: "TooManyRequests", retryAfter: ra };
    if (r.status >= 500) return { result: "error", status: r.status, code: `HTTP ${r.status}`, retryAfter: ra };
    return { result: "rechazado", status: r.status, code: `HTTP ${r.status}` };
  } catch (e) {
    return { result: "error", code: (e as Error)?.name === "TimeoutError" ? "timeout" : "red" };
  }
}
