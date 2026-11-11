import "server-only";
import { connect, constants, type ClientHttp2Session } from "node:http2";
import { createHash, createPrivateKey, randomUUID, sign as firmar } from "node:crypto";
import type { ResultadoPush } from "./webpush";

/* 8c · APNs directo (fase8-apps.md §3.3; sin SDK de Firebase en iOS): HTTP/2 con un JWT ES256 firmado por la llave .p8 de Apple (vive en el
   llavero; la pasa quien llama). Según la documentación de Apple «Sending notification requests to APNs» y «Handling notification responses»:
   POST /3/device/{token hex} con authorization «bearer», apns-topic (el id de la app), apns-push-type alert, apns-priority 10 (5 = sin prisa),
   apns-expiration y apns-collapse-id ≤ 64 bytes; 410 Unregistered / ExpiredToken o 400 BadDeviceToken → el token ya no sirve. El JWT se
   reusa ~50 min (Apple: no más de una vez cada 20 min, vale 60). Una conexión HTTP/2 por servidor, reusada. Módulo autocontenido (sin la base):
   lo compila aparte el contrato (scripts/contrato-push) y lo corre contra un servidor HTTP/2 que valida cada pedido. */

export type CredApns = { llavePem: string; idLlave: string; equipo: string };
export type EnvioApns = { token: string; topic: string; cuerpo: string; prioridad: 10 | 5; vence: number; colapso?: string | null; id?: string };

const b64u = (b: Buffer | string) => Buffer.from(b).toString("base64url");
let jwt: { k: string; t: string; at: number } | null = null;
export function jwtApns(c: CredApns, ahoraMs = Date.now()): string {
  const k = `${c.equipo}.${c.idLlave}.${createHash("sha256").update(c.llavePem).digest("hex").slice(0, 16)}`;
  if (jwt && jwt.k === k && ahoraMs - jwt.at < 50 * 60_000) return jwt.t;
  const h = b64u(JSON.stringify({ alg: "ES256", kid: c.idLlave })), p = b64u(JSON.stringify({ iss: c.equipo, iat: Math.floor(ahoraMs / 1000) }));
  const firma = firmar("sha256", Buffer.from(`${h}.${p}`), { key: createPrivateKey(c.llavePem), dsaEncoding: "ieee-p1363" });
  jwt = { k, t: `${h}.${p}.${b64u(firma)}`, at: ahoraMs };
  return jwt.t;
}
export const olvidarJwtApns = () => { jwt = null; };

const conexiones = new Map<string, ClientHttp2Session>();
function conexion(base: string): ClientHttp2Session {
  const c = conexiones.get(base);
  if (c && !c.closed && !c.destroyed) return c;
  const n = connect(base);
  n.on("error", () => conexiones.delete(base));
  n.on("goaway", () => conexiones.delete(base));
  n.on("close", () => conexiones.delete(base));
  n.setTimeout(5 * 60_000, () => n.close());
  conexiones.set(base, n);
  return n;
}
export function cerrarApns() { for (const c of conexiones.values()) c.close(); conexiones.clear(); }

/* Lo que APNs dice que NO se reintenta porque el token no sirve (la documentación: «Don't retry … BadDeviceToken, DeviceTokenNotForTopic,
   ExpiredToken, Unregistered»). Forbidden y PayloadTooLarge tampoco se reintentan, pero no son culpa del token: «rechazado». */
const TOKEN_MUERTO = new Set(["BadDeviceToken", "DeviceTokenNotForTopic", "ExpiredToken", "Unregistered"]);

export async function enviarApns(base: string, cred: CredApns, e: EnvioApns, timeoutMs = 10_000): Promise<ResultadoPush> {
  if (!/^[0-9a-f]{64,200}$/i.test(e.token)) return { result: "invalido", code: "BadDeviceToken" };
  const id = e.id ?? randomUUID();
  const h: Record<string, string | number> = {
    [constants.HTTP2_HEADER_METHOD]: "POST", [constants.HTTP2_HEADER_PATH]: `/3/device/${e.token.toLowerCase()}`,
    authorization: `bearer ${jwtApns(cred)}`, "apns-topic": e.topic, "apns-push-type": "alert", "apns-priority": String(e.prioridad),
    "apns-expiration": String(Math.max(0, Math.floor(e.vence))), "apns-id": id, "content-type": "application/json",
  };
  if (e.colapso) h["apns-collapse-id"] = Buffer.byteLength(e.colapso) > 64 ? e.colapso.slice(0, 64) : e.colapso;
  return new Promise<ResultadoPush>((fin) => {
    let s: ClientHttp2Session;
    try { s = conexion(base); } catch { fin({ result: "error", code: "red" }); return; }
    const t = setTimeout(() => { try { req.close(constants.NGHTTP2_CANCEL); } catch { /* ya cerró */ } fin({ result: "error", code: "timeout" }); }, timeoutMs);
    const req = s.request(h);
    let status = 0, apnsId = "", cuerpo = "";
    req.on("response", (r) => { status = Number(r[":status"]); apnsId = String(r["apns-id"] ?? ""); });
    req.setEncoding("utf8");
    req.on("data", (d: string) => { if (cuerpo.length < 2000) cuerpo += d; });
    req.on("error", () => { clearTimeout(t); fin({ result: "error", code: "red" }); });
    req.on("end", () => {
      clearTimeout(t);
      let reason = "";
      try { reason = String((JSON.parse(cuerpo || "{}") as { reason?: string }).reason ?? ""); } catch { /* sin cuerpo */ }
      if (status === 200) fin({ result: "enviado", status, id: apnsId || id });
      else if (status === 410 || TOKEN_MUERTO.has(reason)) { fin({ result: "invalido", status, code: reason || "Unregistered" }); }
      else if (status === 429) fin({ result: "limite", status, code: reason || "TooManyRequests" });
      else if (status === 403 && reason === "ExpiredProviderToken") { olvidarJwtApns(); fin({ result: "error", status, code: reason }); }
      else if (status >= 500 || status === 403) fin({ result: "error", status, code: reason || `HTTP ${status}` });
      else fin({ result: "rechazado", status, code: reason || `HTTP ${status}` });
    });
    req.end(e.cuerpo);
  });
}

/* El cuerpo que ve el iPhone: el texto (o el genérico), sonido, y «time-sensitive» solo para lo que no espera (nunca «critical»). La ruta que
   abre va fuera de «aps» (u: /app/aviso/{id}). ≤ 4 KB (Apple). */
export function cuerpoApns(x: { titulo: string; texto: string; url: string; urgente: boolean; hilo?: string | null }): string {
  const aps: Record<string, unknown> = { alert: { title: x.titulo, body: x.texto }, sound: "default", "interruption-level": x.urgente ? "time-sensitive" : "active" };
  if (x.hilo) aps["thread-id"] = x.hilo.slice(0, 64);
  return JSON.stringify({ aps, u: x.url });
}
