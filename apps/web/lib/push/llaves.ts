import "server-only";
import { alCambiarConfig } from "../cambios-config";
import { createECDH, createPrivateKey, type KeyObject } from "node:crypto";
import { db } from "../db";
import { ENTORNO } from "../entorno";
import { llaveDerivada } from "../cifrado";
import { leer } from "../tiendas/llavero";
import type { CredApns } from "./apns";
import { TOKEN_URI, type CuentaServicio } from "./fcm";
import { publicaVapid, type Vapid } from "./webpush";

/* 8c · De dónde salen las llaves y a dónde se manda (fase8-apps.md §3.3, §3.5). Nada de esto vive en el repo (es PÚBLICO).
   - VAPID (Web Push): VAPID_PRIVADA (PKCS8 DER en base64) la crea infra/pruebas/deploy.sh una vez en el servidor, como los demás secretos del
     sandbox. Sin ella (desarrollo local, CI), se DERIVA de la llave del entorno (HKDF de DATOS_SECRET, propósito «vapid»): estable entre
     reinicios, nunca guardada, distinta en cada entorno. Cambiarla deja inválidas las suscripciones de los navegadores (se vuelven a pedir solas).
   - APNs (.p8 + id de la llave + Team ID) y FCM (cuenta de servicio): del LLAVERO de las tiendas (Sistema › Integraciones; cada lectura queda
     anotada). Sin la llave subida, el canal queda «en modo pruebas» (no sale nada; se ve en el Super Admin), como el SMS.
   - Direcciones: las de Apple y Google. Fuera de producción, un simulador las puede reemplazar (PUSH_APNS_URL, PUSH_FCM_URL, PUSH_FCM_OAUTH_URL,
     PUSH_WEB_HOSTS); en producción esas variables NO se leen (guardián pushSimuladorAislado). */
export const PROD = ENTORNO === "produccion";
const env = (k: string) => (PROD ? undefined : process.env[k] || undefined);
// TestFlight y la tienda usan el APNs de producción; un build de desarrollo de Xcode, el de desarrollo (APNS_ENTORNO=desarrollo).
export const URL_APNS = () => env("PUSH_APNS_URL") ?? (process.env.APNS_ENTORNO === "desarrollo" ? "https://api.sandbox.push.apple.com" : "https://api.push.apple.com");
export const URL_FCM = () => env("PUSH_FCM_URL") ?? "https://fcm.googleapis.com";
export const URL_FCM_OAUTH = () => env("PUSH_FCM_OAUTH_URL") ?? TOKEN_URI;
export const HOSTS_WEB_EXTRA = (): string[] => (env("PUSH_WEB_HOSTS") ?? "").split(",").map((x) => x.trim()).filter((x) => /^(127\.0\.0\.1|localhost):\d{2,5}$/.test(x));

let vapid: Vapid | null = null;
export function llaveVapid(): Vapid {
  if (vapid) return vapid;
  let privada: KeyObject;
  const e = process.env.VAPID_PRIVADA;
  if (e && e.length > 40) privada = createPrivateKey({ key: Buffer.from(e, "base64"), format: "der", type: "pkcs8" });
  else {
    // Derivada: un escalar P-256 válido (1 ≤ d < n) del HKDF de la llave del entorno.
    const d = llaveDerivada("vapid", "web-push"), ec = createECDH("prime256v1");
    ec.setPrivateKey(d);
    const pub = ec.getPublicKey();
    privada = createPrivateKey({ key: { kty: "EC", crv: "P-256", d: d.toString("base64url"), x: pub.subarray(1, 33).toString("base64url"), y: pub.subarray(33).toString("base64url") }, format: "jwk" });
  }
  vapid = { privada, publica: publicaVapid(privada), sujeto: process.env.VAPID_SUJETO && /^(https:\/\/|mailto:)/.test(process.env.VAPID_SUJETO) ? process.env.VAPID_SUJETO : "https://tolatino.com" };
  return vapid;
}
export const origenVapid = () => (process.env.VAPID_PRIVADA && process.env.VAPID_PRIVADA.length > 40 ? "entorno" : "derivada");

/* Las llaves de las tiendas: se mira en cada vuelta qué llave viva hay (su huella, sin abrir el sobre) y el sobre solo se vuelve a abrir si cambió
   (se subió, se reemplazó o se retiró) o cada 10 minutos. Cada apertura queda anotada en store_secret_reads. */
let tienda: { at: number; k: string; apns: CredApns | null; fcm: CuentaServicio | null } | null = null;
export async function llavesTienda(): Promise<{ apns: CredApns | null; fcm: CuentaServicio | null }> {
  const meta = (await db().query<{ kind: string; meta: Record<string, string>; fp: string }>(`select kind, meta, fingerprint as fp from store_secrets where kind in ('apns_key', 'fcm_service_account') and retired_at is null`).catch(() => ({ rows: [] }))).rows;
  const k = meta.map((x) => `${x.kind}:${x.fp}:${JSON.stringify(x.meta)}`).sort().join("|");
  if (tienda && tienda.k === k && Date.now() - tienda.at < 10 * 60_000) return tienda;
  const m = new Map(meta.map((x) => [x.kind, x.meta]));
  let apns: CredApns | null = null, fcm: CuentaServicio | null = null;
  const ma = m.get("apns_key");
  if (ma?.id_llave && ma.equipo) {
    const b = await leer("apns_key", "push · APNs").catch(() => null);
    if (b) apns = { llavePem: b.toString("utf8"), idLlave: ma.id_llave, equipo: ma.equipo };
  }
  if (m.has("fcm_service_account")) {
    const b = await leer("fcm_service_account", "push · FCM").catch(() => null);
    try { const j = b ? JSON.parse(b.toString("utf8")) as CuentaServicio : null; if (j?.client_email && j.private_key && j.project_id) fcm = { ...j, token_uri: TOKEN_URI }; } catch { /* archivo dañado */ }
  }
  tienda = { at: Date.now(), k, apns, fcm };
  return tienda;
}
export const olvidarLlavesTienda = () => { tienda = null; };
/* ¿Hay cuenta de servicio de FCM subida? Sin abrir el sobre (no cuenta como lectura): solo si existe una viva. */
export async function fcmListo(): Promise<boolean> {
  return !!(await db().query(`select 1 from store_secrets where kind = 'fcm_service_account' and retired_at is null`).catch(() => ({ rowCount: 0 }))).rowCount;
}

/* Los interruptores por canal (feature_flags push.*), con 15 s de caché como Configuración. Uno que no existe = apagado. */
export type Proveedor = "apns" | "fcm" | "webpush" | "sim";
let canales: { at: number; on: Set<Proveedor> } | null = null, escucha = false;
export async function canalesEncendidos(): Promise<Set<Proveedor>> {
  if (!escucha) { escucha = true; alCambiarConfig(() => { canales = null; }); }
  if (canales && Date.now() - canales.at < 15_000) return canales.on;
  const r = await db().query<{ key: string }>(`select key from feature_flags where key in ('push.webpush', 'push.apns', 'push.fcm') and enabled`).catch(() => ({ rows: [] as { key: string }[] }));
  const on = new Set<Proveedor>(r.rows.map((x) => x.key.slice(5) as Proveedor));
  // «sim»: los teléfonos de prueba de la semilla. Nunca en producción.
  if (!PROD) on.add("sim");
  canales = { at: Date.now(), on };
  return on;
}
export const olvidarCanales = () => { canales = null; };
