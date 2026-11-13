import "server-only";
import { alCambiarConfig } from "../cambios-config";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { db } from "../db";
import { ENTORNO } from "../entorno";
import { TOKEN_URI, type CuentaServicio } from "../push/fcm";
import { leer } from "../tiendas/llavero";
import type { CredPase, Imagenes } from "./apple";
import { certificadosPem } from "./der";
import { API_WALLET, type CredGoogle } from "./google";

/* 8g · De dónde salen las llaves de Wallet y a dónde se habla (fase8-apps.md §3.5; nada de esto vive en el repo, que es PÚBLICO):
   - Apple: el certificado del Pass Type ID con su llave y el intermedio WWDR (un PEM que arma lib/pases/certificado.ts al subir el .cer) en el
     llavero (pass_type_cert). Sin él no se emite ni se actualiza ningún pase de Apple (el botón no sale).
   - Google: la cuenta de servicio de Google Wallet + el ID del emisor (google_wallet_sa, meta «emisor»). Sin ella, el botón de Google no sale.
   - Direcciones: las de Apple y Google. FUERA de producción, un simulador las puede reemplazar (PASES_APNS_URL, PASES_GOOGLE_URL,
     PASES_GOOGLE_OAUTH_URL, PASES_AIA_HOSTS); en producción esas variables NO se leen (guardián pushSimuladorAislado).
   Cada lectura del llavero queda anotada (store_secret_reads); se vuelve a abrir solo si la llave cambió o cada 10 minutos. */
export const PROD = ENTORNO === "produccion";
const env = (k: string) => (PROD ? undefined : process.env[k] || undefined);
/* Apple: «A push notification for a pass update works only in the production environment» (contrato). */
export const URL_APNS_PASE = () => env("PASES_APNS_URL") ?? "https://api.push.apple.com";
export const URL_GOOGLE = () => env("PASES_GOOGLE_URL") ?? API_WALLET;
export const URL_GOOGLE_OAUTH = () => env("PASES_GOOGLE_OAUTH_URL") ?? TOKEN_URI;
/* De dónde se baja el intermedio del certificado (su «CA Issuers» de AIA): solo de Apple; en pruebas, también del simulador local. */
export const HOSTS_AIA = (): string[] => ["certs.apple.com", "www.apple.com", ...(env("PASES_AIA_HOSTS") ?? "").split(",").map((x) => x.trim()).filter((x) => /^(127\.0\.0\.1|localhost):\d{2,5}$/.test(x))];
export const TIPO_PASE_DEF = "pass.com.tolatino.boletos";

export type CredApple = CredPase & { llavePem: string; certPem: string; vence: string | null };
let cache: { at: number; k: string; apple: CredApple | null; google: CredGoogle | null } | null = null;
export async function credenciales(): Promise<{ apple: CredApple | null; google: CredGoogle | null }> {
  const meta = (await db().query<{ kind: string; meta: Record<string, string>; fp: string }>(
    `select kind, meta, fingerprint as fp from store_secrets where kind in ('pass_type_cert', 'google_wallet_sa') and retired_at is null`).catch(() => ({ rows: [] }))).rows;
  const k = meta.map((x) => `${x.kind}:${x.fp}:${JSON.stringify(x.meta)}`).sort().join("|");
  if (cache && cache.k === k && Date.now() - cache.at < 10 * 60_000) return cache;
  const m = new Map(meta.map((x) => [x.kind, x.meta]));
  let apple: CredApple | null = null, google: CredGoogle | null = null;
  const ma = m.get("pass_type_cert");
  if (ma?.pass_type_id && ma.equipo) {
    const b = await leer("pass_type_cert", "wallet · firmar pases").catch(() => null);
    const pem = b?.toString("utf8") ?? "", llave = /-----BEGIN PRIVATE KEY-----[\s\S]+?-----END PRIVATE KEY-----/.exec(pem)?.[0], certs = certificadosPem(pem);
    if (llave && certs.length >= 2) {
      const certPem = (/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/.exec(pem)?.[0] ?? "") + "\n";
      apple = { tipo: ma.pass_type_id, equipo: ma.equipo, llave, llavePem: llave, certPem, certDer: certs[0]!, cadena: certs.slice(1), vence: ma.vence ?? null };
    }
  }
  const mg = m.get("google_wallet_sa");
  if (mg?.emisor && /^\d{6,25}$/.test(mg.emisor)) {
    const b = await leer("google_wallet_sa", "wallet · Google").catch(() => null);
    try { const j = b ? (JSON.parse(b.toString("utf8")) as CuentaServicio & { private_key_id?: string }) : null; if (j?.client_email && j.private_key) google = { sa: { ...j, token_uri: TOKEN_URI }, emisor: mg.emisor }; } catch { /* archivo dañado */ }
  }
  cache = { at: Date.now(), k, apple, google };
  return cache;
}
export const olvidarCredenciales = () => { cache = null; };

/* ¿Hay certificado / cuenta de Google? Sin abrir el sobre (no es una lectura). */
export async function listos(): Promise<{ apple: boolean; google: boolean }> {
  const r = (await db().query<{ kind: string; ok: boolean }>(
    `select kind, (kind <> 'pass_type_cert' or (meta ? 'pass_type_id' and meta ? 'equipo')) and (kind <> 'google_wallet_sa' or meta ? 'emisor') as ok
       from store_secrets where kind in ('pass_type_cert', 'google_wallet_sa') and retired_at is null`).catch(() => ({ rows: [] as { kind: string; ok: boolean }[] }))).rows;
  return { apple: r.some((x) => x.kind === "pass_type_cert" && x.ok), google: r.some((x) => x.kind === "google_wallet_sa" && x.ok) };
}

/* Los interruptores app.wallet.apple / app.wallet.google (15 s de caché, como Configuración). Apagado = no se emiten pases NUEVOS; los
   emitidos siguen recibiendo sus cambios (un pase que ya está en un teléfono no se queda con un QR viejo). */
let flags: { at: number; on: Set<string> } | null = null, escucha = false;
export async function encendidos(): Promise<{ apple: boolean; google: boolean }> {
  if (!escucha) { escucha = true; alCambiarConfig(olvidarInterruptores); }
  if (!flags || Date.now() - flags.at > 15_000) {
    const r = await db().query<{ key: string }>(`select key from feature_flags where key in ('app.wallet.apple', 'app.wallet.google') and enabled`).catch(() => ({ rows: [] as { key: string }[] }));
    flags = { at: Date.now(), on: new Set(r.rows.map((x) => x.key)) };
  }
  return { apple: flags.on.has("app.wallet.apple"), google: flags.on.has("app.wallet.google") };
}
export const olvidarInterruptores = () => { flags = null; };

/* Las imágenes del pase, del sistema de diseño (public/assets: el ícono de la app de 8c y el logo blanco), con sharp, una vez por proceso. */
let imgs: Imagenes | null = null;
export async function imagenes(): Promise<Imagenes> {
  if (imgs) return imgs;
  const sharp = (await import("sharp")).default, pub = join(process.cwd(), "public", "assets");
  const icono = await readFile(join(pub, "app", "icono-180.png")), logo = await readFile(join(pub, "logo-tolatino-white.svg"));
  const ic = (n: number) => sharp(icono).resize(n, n).png().toBuffer(), lg = (h: number) => sharp(logo, { density: 300 }).resize({ height: h }).png().toBuffer();
  const [a, b, c, d, e] = await Promise.all([ic(29), ic(58), ic(87), lg(50), lg(100)]);
  imgs = { "icon.png": a, "icon@2x.png": b, "icon@3x.png": c, "logo.png": d, "logo@2x.png": e };
  return imgs;
}
