import "server-only";
import { createPrivateKey, sign as firmar } from "node:crypto";
import type { ResultadoPush } from "./webpush";

/* 8c · FCM HTTP v1, solo mensajería (fase8-apps.md §3.3): Android con Google Play solo despierta de forma fiable por FCM. Una cuenta de
   servicio (vive en el llavero; la pasa quien llama) firma un JWT RS256 que se cambia por un token de acceso OAuth 2 (scope
   firebase.messaging, se reusa hasta un minuto antes de vencer) y POST /v1/projects/{proyecto}/messages:send con un Message (la forma la
   valida el contrato contra el documento de descubrimiento oficial de FCM v1). UNREGISTERED / SENDER_ID_MISMATCH → el token ya no sirve.
   Módulo autocontenido (sin la base): lo compila aparte scripts/contrato-push. */

export type CuentaServicio = { client_email: string; private_key: string; project_id: string; token_uri: string };
export const TOKEN_URI = "https://oauth2.googleapis.com/token";
export const ALCANCE = "https://www.googleapis.com/auth/firebase.messaging";
const b64u = (b: Buffer | string) => Buffer.from(b).toString("base64url");

/* Un token de acceso por cuenta de servicio, servidor y alcance (8g: la cuenta de Google Wallet usa el mismo camino con su alcance). */
const accesos = new Map<string, { t: string; vence: number }>();
/* `tokenUri` lo decide quien llama: el de Google (o un simulador fuera de producción), nunca el que traiga el archivo subido. */
export async function tokenAcceso(sa: CuentaServicio, tokenUri: string, ahoraMs = Date.now(), alcance = ALCANCE): Promise<string | null> {
  const k = `${sa.client_email}|${tokenUri}|${alcance}`, acceso = accesos.get(k);
  if (acceso && acceso.vence - 60_000 > ahoraMs) return acceso.t;
  const iat = Math.floor(ahoraMs / 1000);
  const h = b64u(JSON.stringify({ alg: "RS256", typ: "JWT" })), p = b64u(JSON.stringify({ iss: sa.client_email, scope: alcance, aud: TOKEN_URI, iat, exp: iat + 3600 }));
  let firma: Buffer;
  try { firma = firmar("sha256", Buffer.from(`${h}.${p}`), createPrivateKey(sa.private_key)); } catch { return null; }
  try {
    const r = await fetch(tokenUri, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, redirect: "manual", signal: AbortSignal.timeout(10_000),
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${h}.${p}.${b64u(firma)}` }).toString() });
    if (!r.ok) return null;
    const j = (await r.json()) as { access_token?: string; expires_in?: number };
    if (!j.access_token) return null;
    if (accesos.size > 20) accesos.clear();
    accesos.set(k, { t: j.access_token, vence: ahoraMs + (Number(j.expires_in) || 3600) * 1000 });
    return j.access_token;
  } catch { return null; }
}
export const olvidarAccesoFcm = () => { accesos.clear(); };

/* El Message de FCM v1 (nombres JSON del documento de descubrimiento: collapseKey, defaultSound): notificación (lo que se ve), data (la ruta que abre: u), Android con prioridad, TTL, colapso y etiqueta (el estado
   nuevo reemplaza al viejo en la barra). Nada más (sin analítica: fcm_options.analytics_label no se usa). */
export function mensajeFcm(x: { token: string; titulo: string; texto: string; url: string; urgente: boolean; ttlS: number; colapso?: string | null; n: string }) {
  const android: Record<string, unknown> = { priority: x.urgente ? "HIGH" : "NORMAL", ttl: `${Math.max(0, Math.floor(x.ttlS))}s`, notification: { tag: (x.colapso ?? `n${x.n}`).slice(0, 64), defaultSound: true } };
  if (x.colapso) android.collapseKey = x.colapso.slice(0, 64);
  return { token: x.token, notification: { title: x.titulo, body: x.texto }, data: { u: x.url, n: x.n }, android };
}

export async function enviarFcm(base: string, proyecto: string, token: string, mensaje: ReturnType<typeof mensajeFcm>, timeoutMs = 10_000): Promise<ResultadoPush> {
  if (!/^[a-z0-9-]{4,40}$/.test(proyecto)) return { result: "rechazado", code: "proyecto_invalido" };
  try {
    const r = await fetch(`${base.replace(/\/$/, "")}/v1/projects/${proyecto}/messages:send`, { method: "POST", redirect: "manual", signal: AbortSignal.timeout(timeoutMs),
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ message: mensaje }) });
    const ra = Number(r.headers.get("retry-after")) || undefined;
    const j = (await r.json().catch(() => ({}))) as { name?: string; error?: { status?: string; details?: { "@type"?: string; errorCode?: string }[] } };
    if (r.ok) return { result: "enviado", status: r.status, id: String(j.name ?? "").split("/").pop()?.slice(0, 100) };
    const code = j.error?.details?.find((d) => /FcmError$/.test(String(d["@type"] ?? "")))?.errorCode ?? j.error?.status ?? `HTTP ${r.status}`;
    if (code === "UNREGISTERED" || code === "SENDER_ID_MISMATCH" || r.status === 404) return { result: "invalido", status: r.status, code };
    if (code === "QUOTA_EXCEEDED" || r.status === 429) return { result: "limite", status: r.status, code, retryAfter: ra };
    if (code === "UNAVAILABLE" || code === "INTERNAL" || r.status >= 500 || r.status === 401 || code === "THIRD_PARTY_AUTH_ERROR") {
      if (r.status === 401) olvidarAccesoFcm();
      return { result: "error", status: r.status, code, retryAfter: ra };
    }
    return { result: "rechazado", status: r.status, code };
  } catch (e) {
    return { result: "error", code: (e as Error)?.name === "TimeoutError" ? "timeout" : "red" };
  }
}
