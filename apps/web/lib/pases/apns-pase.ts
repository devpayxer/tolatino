import "server-only";
import { connect, constants, type ClientHttp2Session } from "node:http2";

/* 8g · El aviso de «tu pase cambió» a Apple Wallet (fase8-apps.md §4 8g; Apple «Adding a Web Service to Update Passes»: «The notification uses
   the same certificate and private key that the creator of the pass used to sign the original, the push token registered by the device, and an
   empty JSON dictionary for the payload … works only in the production environment», fijado en scripts/contrato-wallet/apple.json).
   - APNs por HTTP/2 con TLS de CLIENTE: el certificado del Pass Type ID y su llave (del llavero; no la llave .p8 de los avisos de 8c).
   - POST /3/device/{token} con apns-topic = el Pass Type ID y el cuerpo «{}». Sin apns-push-type ni prioridad (Apple no documenta cuál lleva un
     aviso de Wallet: queda «a verificar» en REVISION con el certificado de verdad).
   - 410 Unregistered / BadDeviceToken / DeviceTokenNotForTopic → ese teléfono ya no recibe: se borra su registro (estado, no se borra la fila).
   Módulo autocontenido (sin la base): lo compila aparte el contrato y lo corre contra el simulador (scripts/wallet-sim), que exige el
   certificado de cliente firmado por la cadena de prueba. */
export type CredApnsPase = { tipo: string; llavePem: string; certPem: string };
export type ResultadoPase = { result: "enviado" | "invalido" | "rechazado" | "limite" | "error"; status?: number; code?: string };

const conexiones = new Map<string, ClientHttp2Session>();
function conexion(base: string, c: CredApnsPase): ClientHttp2Session {
  const k = `${base}|${c.certPem.length}|${c.certPem.slice(-80)}`;
  const s = conexiones.get(k);
  if (s && !s.closed && !s.destroyed) return s;
  const n = connect(base, { key: c.llavePem, cert: c.certPem });
  n.on("error", () => conexiones.delete(k));
  n.on("goaway", () => conexiones.delete(k));
  n.on("close", () => conexiones.delete(k));
  n.setTimeout(5 * 60_000, () => n.close());
  conexiones.set(k, n);
  return n;
}
export function cerrarApnsPase() { for (const c of conexiones.values()) c.close(); conexiones.clear(); }
const TOKEN_MUERTO = new Set(["BadDeviceToken", "DeviceTokenNotForTopic", "ExpiredToken", "Unregistered"]);

export async function avisarPase(base: string, cred: CredApnsPase, token: string, timeoutMs = 10_000): Promise<ResultadoPase> {
  if (!/^[0-9a-f]{64,200}$/i.test(token)) return { result: "invalido", code: "BadDeviceToken" };
  if (!/^pass\.[A-Za-z0-9.-]{3,120}$/.test(cred.tipo)) return { result: "rechazado", code: "tipo_invalido" };
  return new Promise<ResultadoPase>((fin) => {
    let s: ClientHttp2Session;
    try { s = conexion(base, cred); } catch { fin({ result: "error", code: "red" }); return; }
    const t = setTimeout(() => { try { req.close(constants.NGHTTP2_CANCEL); } catch { /* ya cerró */ } fin({ result: "error", code: "timeout" }); }, timeoutMs);
    const req = s.request({ [constants.HTTP2_HEADER_METHOD]: "POST", [constants.HTTP2_HEADER_PATH]: `/3/device/${token.toLowerCase()}`, "apns-topic": cred.tipo, "content-type": "application/json" });
    let status = 0, cuerpo = "";
    req.on("response", (r) => { status = Number(r[":status"]); });
    req.setEncoding("utf8");
    req.on("data", (d: string) => { if (cuerpo.length < 2000) cuerpo += d; });
    req.on("error", () => { clearTimeout(t); fin({ result: "error", code: "red" }); });
    req.on("end", () => {
      clearTimeout(t);
      let reason = "";
      try { reason = String((JSON.parse(cuerpo || "{}") as { reason?: string }).reason ?? ""); } catch { /* sin cuerpo */ }
      if (status === 200) fin({ result: "enviado", status });
      else if (status === 410 || TOKEN_MUERTO.has(reason)) fin({ result: "invalido", status, code: reason || "Unregistered" });
      else if (status === 429) fin({ result: "limite", status, code: reason || "TooManyRequests" });
      else if (status >= 500 || status === 403) fin({ result: "error", status, code: reason || `HTTP ${status}` });
      else fin({ result: "rechazado", status, code: reason || `HTTP ${status}` });
    });
    req.end("{}");
  });
}
