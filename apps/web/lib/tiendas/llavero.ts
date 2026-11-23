import "server-only";
import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import { auditar } from "../admin";
import { db, tx } from "../db";

/* 8a · El LLAVERO de las tiendas (fase8-apps.md §2 «store_secrets», §3.5, §4 8a): las llaves que Apple y Google entregan solo al dueño de la
   cuenta (API de App Store Connect, APNs, cuentas de servicio de Firebase, Play y Wallet, la llave de subida de Android, certificados). El repo
   es PÚBLICO: ninguna llave vive en él ni en GitHub (guardián llavesFueraDelRepo).
   - guardar(): el archivo → su huella (sha256, lo ÚNICO que se vuelve a mostrar) → un sobre cifrado: una llave de datos al azar cifra el
     archivo (AES-256-GCM) y esa llave va cifrada con la del entorno (HKDF de LLAVERO_SECRET o, si no está, de DATOS_SECRET; nunca en el repo;
     sin ninguna de las dos, NO se guarda). Una viva por tipo: la nueva retira la anterior con motivo. Nada del contenido sale de aquí.
   - leer(): solo el servidor (8h: el CI por OIDC), cada lectura anotada en store_secret_reads (solo inserción), y la huella se comprueba.
   - retirar(): una vez, con quién y motivo (la base no deja borrar ni cambiar el sobre).
   - listar(): lo que ve Sistema › Integraciones: tipo, versión, huella, datos públicos (id de la llave, equipo, correo de la cuenta de servicio),
     vence, quién y cuándo, lecturas. NUNCA el sobre (ni siquiera cifrado). */
export const TIPOS = {
  asc_api_key: { es: "App Store Connect · llave de la API", en: "App Store Connect · API key", ext: [".p8"], forma: "pem" },
  apns_key: { es: "Apple · llave de avisos (APNs)", en: "Apple · push key (APNs)", ext: [".p8"], forma: "pem" },
  fcm_service_account: { es: "Firebase · cuenta de servicio (avisos de Android)", en: "Firebase · service account (Android push)", ext: [".json"], forma: "sa" },
  play_service_account: { es: "Google Play · cuenta de servicio", en: "Google Play · service account", ext: [".json"], forma: "sa" },
  android_upload_keystore: { es: "Android · llave de subida", en: "Android · upload key", ext: [".jks", ".keystore", ".p12"], forma: "bin" },
  ios_dist_cert: { es: "Apple · certificado de distribución", en: "Apple · distribution certificate", ext: [".p12"], forma: "bin" },
  // 8g · El .cer que da Apple para la solicitud que generó el servidor (lib/pases/certificado.ts); se guarda con su llave y el intermedio.
  pass_type_cert: { es: "Apple Wallet · certificado del pase", en: "Apple Wallet · pass certificate", ext: [".cer", ".pem"], forma: "cer" },
  google_wallet_sa: { es: "Google Wallet · cuenta de servicio", en: "Google Wallet · service account", ext: [".json"], forma: "sa" },
  // 8g · La llave de la solicitud del certificado del pase: la GENERA el servidor (no se sube); se retira al llegar el certificado.
  pass_type_csr: { es: "Apple Wallet · solicitud del certificado (llave)", en: "Apple Wallet · certificate request (key)", ext: [], forma: "generada" },
  // 8h · El token del fundador para «Pedir un build» (lanza el flujo de las tiendas; permiso «Actions: write» solo en este repositorio).
  github_token: { es: "GitHub · token para pedir builds", en: "GitHub · token to request builds", ext: [".txt"], forma: "token" },
  // 23 nov · Las llaves de TEXTO de los proveedores del servidor de la app (se pegan, no se suben). Las usa SOLO lib/llaves-proveedores.ts.
  stripe_secret_key: { es: "Stripe · llave secreta", en: "Stripe · secret key", ext: [], forma: "texto" },
  stripe_publishable_key: { es: "Stripe · llave pública", en: "Stripe · publishable key", ext: [], forma: "texto" },
  stripe_webhook_secret: { es: "Stripe · firma de los avisos (webhook)", en: "Stripe · webhook signing secret", ext: [], forma: "texto" },
  telnyx_api_key: { es: "Telnyx · llave de la API", en: "Telnyx · API key", ext: [], forma: "texto" },
  telnyx_public_key: { es: "Telnyx · llave pública de los avisos", en: "Telnyx · webhook public key", ext: [], forma: "texto" },
  telnyx_from: { es: "Telnyx · número que manda los SMS", en: "Telnyx · sending number", ext: [], forma: "texto" },
  whatsapp_app_secret: { es: "WhatsApp · secreto de la app", en: "WhatsApp · app secret", ext: [], forma: "texto" },
  whatsapp_verify_token: { es: "WhatsApp · palabra de verificación de los avisos", en: "WhatsApp · webhook verify token", ext: [], forma: "texto" },
  whatsapp_token: { es: "WhatsApp · token permanente", en: "WhatsApp · permanent token", ext: [], forma: "texto" },
  whatsapp_waba_id: { es: "WhatsApp · ID de la cuenta de negocio", en: "WhatsApp · business account ID", ext: [], forma: "texto" },
  ses_access_key_id: { es: "Amazon SES · ID de la llave de acceso", en: "Amazon SES · access key ID", ext: [], forma: "texto" },
  ses_secret_access_key: { es: "Amazon SES · llave secreta de acceso", en: "Amazon SES · secret access key", ext: [], forma: "texto" },
  correo_sns_tema: { es: "Amazon SNS · tema del correo que entra", en: "Amazon SNS · inbound email topic", ext: [], forma: "texto" },
  anthropic_api_key: { es: "Anthropic · llave de la API (El Compa)", en: "Anthropic · API key (El Compa)", ext: [], forma: "texto" },
} as const;
export type TipoLlave = keyof typeof TIPOS;
export const esTipo = (k: unknown): k is TipoLlave => typeof k === "string" && Object.hasOwn(TIPOS, k);
export const MAX_BYTES = 64 * 1024;

/* 23 nov · Las llaves de los PROVEEDORES (docs/REVISION.md «Cómo llegan las llaves de terceros al servidor»): cada tipo de texto con su variable del
   entorno (el tipo en MAYÚSCULAS: stripe_secret_key → STRIPE_SECRET_KEY; la que el sobre sellado sigue pudiendo traer, de respaldo) y su proveedor. El fundador las pega en Integraciones › Llaves; el
   valor se cifra aquí como cualquier llave y solo lib/llaves-proveedores.ts lo vuelve a abrir (en la memoria del proceso). La lista cerrada de
   infra/comun/secretos.json dice lo mismo («llavero»: el tipo) y el guardián secretoConDueno comprueba que coincidan. */
export type Proveedor = "stripe" | "telnyx" | "whatsapp" | "ses" | "anthropic";
export const PROVEEDORES = {
  stripe_secret_key: { prov: "stripe" },
  stripe_publishable_key: { prov: "stripe" },
  stripe_webhook_secret: { prov: "stripe" },
  telnyx_api_key: { prov: "telnyx" },
  telnyx_public_key: { prov: "telnyx" },
  telnyx_from: { prov: "telnyx" },
  whatsapp_app_secret: { prov: "whatsapp" },
  whatsapp_verify_token: { prov: "whatsapp" },
  whatsapp_token: { prov: "whatsapp" },
  whatsapp_waba_id: { prov: "whatsapp" },
  ses_access_key_id: { prov: "ses" },
  ses_secret_access_key: { prov: "ses" },
  correo_sns_tema: { prov: "ses" },
  anthropic_api_key: { prov: "anthropic" },
} as const satisfies Partial<Record<TipoLlave, { prov: Proveedor }>>;
export type TipoProveedor = keyof typeof PROVEEDORES;
export const esTipoProveedor = (k: unknown): k is TipoProveedor => typeof k === "string" && Object.hasOwn(PROVEEDORES, k);
export const MAX_TEXTO = 4096;
type Bi = { es: string; en: string };
const mal = (es: string, en: string) => ({ ok: false as const, msg: { es, en } });

/* La forma de una llave de texto, revisada en el SERVIDOR antes de cifrarla. Las de Stripe dicen si son de prueba o reales: en producción no entra una
   de prueba y en pruebas (o local) no entra una real. Nada de la respuesta repite el valor. */
export function revisarTexto(tipo: TipoProveedor, crudo: string, entorno: string): { ok: true; valor: string; meta: Meta } | { ok: false; msg: Bi } {
  const v = String(crudo ?? "").trim();
  if (!v) return mal("Pega la llave.", "Paste the key.");
  if (v.length > MAX_TEXTO) return mal("Es demasiado larga para ser esa llave.", "It is too long to be that key.");
  if (/[\s\u0000-\u001F\u007F]/.test(v)) return mal("La llave no lleva espacios ni saltos de línea: cópiala otra vez, completa.", "The key has no spaces or line breaks: copy it again, whole.");
  const prod = entorno === "produccion", meta: Meta = {};
  const stripe = (pref: string, nombre: Bi): { ok: false; msg: Bi } | null => {
    const m = new RegExp(`^(${pref})_(test|live)_[A-Za-z0-9]{10,247}$`).exec(v);
    if (!m) return mal(`No es una ${nombre.es} de Stripe (empieza con ${pref.split("|").map((p) => `${p}_`).join(" o ")}).`, `It is not a Stripe ${nombre.en} (it starts with ${pref.split("|").map((p) => `${p}_`).join(" or ")}).`);
    if (prod && m[2] === "test") return mal("Es una llave de PRUEBA de Stripe: en producción va la real (live).", "It is a Stripe TEST key: production needs the live one.");
    if (!prod && m[2] === "live") return mal("Es una llave REAL de Stripe: en el sandbox va la de prueba (test).", "It is a LIVE Stripe key: the sandbox needs the test one.");
    meta.modo = m[2] === "live" ? "real" : "prueba";
    return null;
  };
  let e: { ok: false; msg: Bi } | null = null;
  switch (tipo) {
    case "stripe_secret_key": e = stripe("sk|rk", { es: "llave secreta", en: "secret key" }); break;
    case "stripe_publishable_key": e = stripe("pk", { es: "llave pública", en: "publishable key" }); break;
    case "stripe_webhook_secret": if (!/^whsec_[A-Za-z0-9+/=]{20,200}$/.test(v)) e = mal("No es la firma de los avisos de Stripe (empieza con whsec_).", "It is not the Stripe webhook signing secret (it starts with whsec_)."); break;
    case "telnyx_api_key": if (!/^KEY[A-Za-z0-9_-]{20,200}$/.test(v)) e = mal("No es una llave de la API de Telnyx (empieza con KEY).", "It is not a Telnyx API key (it starts with KEY)."); break;
    case "telnyx_public_key": {
      const b = /^[A-Za-z0-9+/]{43}=$/.test(v) ? Buffer.from(v, "base64") : null;
      if (!b || b.length !== 32) e = mal("No es la llave pública de Telnyx (44 caracteres, la de «Public key» en la configuración de la cuenta).", "It is not the Telnyx public key (44 characters, the «Public key» in the account settings).");
      break;
    }
    case "telnyx_from": if (!/^\+1\d{10}$/.test(v)) e = mal("El número va con +1 y sus 10 dígitos (por ejemplo +15705550100).", "The number goes with +1 and its 10 digits (for example +15705550100)."); break;
    case "whatsapp_app_secret": if (!/^[a-f0-9]{32,64}$/i.test(v)) e = mal("No es el secreto de la app de Meta (32 letras y números, en la configuración básica de la app).", "It is not the Meta app secret (32 letters and numbers, in the app's basic settings)."); break;
    case "whatsapp_verify_token": if (!/^[A-Za-z0-9._~-]{16,128}$/.test(v)) e = mal("La palabra de verificación lleva de 16 a 128 letras, números, punto, guion o guion bajo.", "The verify token takes 16 to 128 letters, numbers, dot, dash or underscore."); break;
    case "whatsapp_token": if (!/^EA[A-Za-z0-9]{40,1000}$/.test(v)) e = mal("No es un token de Meta (empieza con EA).", "It is not a Meta token (it starts with EA)."); break;
    case "whatsapp_waba_id": if (!/^\d{6,20}$/.test(v)) e = mal("El ID de la cuenta de negocio son solo números.", "The business account ID is only numbers."); break;
    case "ses_access_key_id": if (!/^AKIA[A-Z0-9]{16}$/.test(v)) e = mal("No es el ID de una llave de acceso de AWS (AKIA y 16 letras o números).", "It is not an AWS access key ID (AKIA and 16 letters or numbers)."); break;
    case "ses_secret_access_key": if (!/^[A-Za-z0-9/+]{40}$/.test(v)) e = mal("No es una llave secreta de AWS (40 caracteres).", "It is not an AWS secret key (40 characters)."); break;
    case "correo_sns_tema": if (!/^arn:aws:sns:[a-z]{2}(-[a-z]+)+-\d:\d{12}:[A-Za-z0-9_-]{1,256}$/.test(v)) e = mal("No es el ARN de un tema de SNS (arn:aws:sns:región:cuenta:nombre).", "It is not an SNS topic ARN (arn:aws:sns:region:account:name)."); break;
    case "anthropic_api_key": if (!/^sk-ant-[A-Za-z0-9_-]{20,300}$/.test(v)) e = mal("No es una llave de la API de Anthropic (empieza con sk-ant-).", "It is not an Anthropic API key (it starts with sk-ant-)."); break;
  }
  return e ?? { ok: true, valor: v, meta };
}

/* La llave que envuelve: del entorno (secretos del servidor). En ningún entorno se inventa una. */
function kek(tipo: string): Buffer | null {
  const s = process.env.LLAVERO_SECRET && process.env.LLAVERO_SECRET.length >= 32 ? process.env.LLAVERO_SECRET : process.env.DATOS_SECRET;
  if (!s || s.length < 32) return null;
  return Buffer.from(hkdfSync("sha256", Buffer.from(s), Buffer.from("tl:llavero:v1"), Buffer.from(tipo), 32));
}
export const llaveroListo = () => kek("prueba") !== null;
/* 8h · La contraseña de un almacén PKCS12 que nace en la tubería (la llave de subida de Android; el certificado de distribución de Apple si la firma
   en la nube no alcanza) de la versión N: se DERIVA de la llave del entorno (nunca se guarda ni se escribe): el job que crea la llave la pide para
   la versión nueva y el que firma la recibe junto al almacén. Sin la llave del entorno, nada. */
export function claveAlmacen(tipo: "android_upload_keystore" | "ios_dist_cert", version: number): string | null {
  const k = kek(`${tipo}:clave:v${version}`);
  return k ? k.toString("base64url").slice(0, 32) : null;
}

const MAGIA = Buffer.from("TLK1");
function sellar(tipo: string, contenido: Buffer): Buffer {
  const k = kek(tipo);
  if (!k) throw new Error("llavero_sin_llave");
  const dek = randomBytes(32), iv1 = randomBytes(12), iv2 = randomBytes(12);
  const c1 = createCipheriv("aes-256-gcm", dek, iv1), ct = Buffer.concat([c1.update(contenido), c1.final()]), t1 = c1.getAuthTag();
  const c2 = createCipheriv("aes-256-gcm", k, iv2), wdek = Buffer.concat([c2.update(dek), c2.final()]), t2 = c2.getAuthTag();
  dek.fill(0);
  return Buffer.concat([MAGIA, iv2, t2, wdek, iv1, t1, ct]);
}
function abrir(tipo: string, sobre: Buffer): Buffer | null {
  const k = kek(tipo);
  if (!k || sobre.length < 4 + 12 + 16 + 32 + 12 + 16 || !sobre.subarray(0, 4).equals(MAGIA)) return null;
  try {
    let i = 4;
    const iv2 = sobre.subarray(i, i += 12), t2 = sobre.subarray(i, i += 16), wdek = sobre.subarray(i, i += 32), iv1 = sobre.subarray(i, i += 12), t1 = sobre.subarray(i, i += 16), ct = sobre.subarray(i);
    const d2 = createDecipheriv("aes-256-gcm", k, iv2); d2.setAuthTag(t2);
    const dek = Buffer.concat([d2.update(wdek), d2.final()]);
    const d1 = createDecipheriv("aes-256-gcm", dek, iv1); d1.setAuthTag(t1);
    const out = Buffer.concat([d1.update(ct), d1.final()]);
    dek.fill(0);
    return out;
  } catch { return null; }
}
export const huellaDe = (b: Buffer) => createHash("sha256").update(b).digest("hex");

/* Lo que se puede saber del archivo sin guardarlo en claro: que tenga la forma de su tipo y sus datos públicos. */
type Meta = Record<string, string>;
export function revisarArchivo(tipo: TipoLlave, nombre: string, b: Buffer, extra: Meta): { ok: true; meta: Meta } | { ok: false; msg: string } {
  const t = TIPOS[tipo], ext = (/\.[a-z0-9]+$/i.exec(nombre)?.[0] ?? "").toLowerCase();
  if (t.forma === "generada") return { ok: false, msg: "Esta llave no se sube: la genera el servidor." };
  if (t.forma === "texto") return { ok: false, msg: "Esta llave no es un archivo: se pega." };
  if (!b.length || b.length > MAX_BYTES) return { ok: false, msg: "El archivo está vacío o es demasiado grande (64 KB)." };
  if (!(t.ext as readonly string[]).includes(ext)) return { ok: false, msg: `Ese tipo de llave es un archivo ${t.ext.join(" o ")}.` };
  const meta: Meta = {};
  if (t.forma === "pem") {
    const s = b.toString("utf8");
    if (!/^-----BEGIN PRIVATE KEY-----\r?\n[A-Za-z0-9+/=\r\n]+-----END PRIVATE KEY-----\s*$/.test(s.trim() + "\n")) return { ok: false, msg: "No es una llave .p8 de Apple (falta «BEGIN PRIVATE KEY»)." };
    const id = /AuthKey_([A-Z0-9]{8,12})\.p8$/i.exec(nombre)?.[1];
    if (id) meta.id_llave = id.toUpperCase();
  } else if (t.forma === "sa") {
    let j: Record<string, unknown>;
    try { j = JSON.parse(b.toString("utf8")) as Record<string, unknown>; } catch { return { ok: false, msg: "No es un archivo JSON válido." }; }
    if (j.type !== "service_account" || typeof j.private_key !== "string" || typeof j.client_email !== "string") return { ok: false, msg: "No es una cuenta de servicio de Google (faltan type, private_key o client_email)." };
    meta.correo = String(j.client_email).slice(0, 120);
    if (typeof j.project_id === "string") meta.proyecto = j.project_id.slice(0, 80);
    if (typeof j.private_key_id === "string") meta.id_llave = j.private_key_id.slice(0, 12);
  } else if (t.forma === "token") {
    // 8h · Un token de GitHub en un .txt (una línea): de grano fino (github_pat_…) o clásico (ghp_…). Nada más en el archivo.
    if (!/^(github_pat_[A-Za-z0-9_]{40,255}|ghp_[A-Za-z0-9]{36})\r?\n?$/.test(b.toString("utf8"))) return { ok: false, msg: "No es un token de GitHub (github_pat_… o ghp_…, una sola línea)." };
    meta.tipo = b.toString("utf8").startsWith("github_pat_") ? "grano fino" : "clásico";
  } else if (t.forma === "cer") {
    const pem = /-----BEGIN CERTIFICATE-----/.test(b.toString("latin1")), der = b[0] === 0x30 && (b[1] === 0x82 || b[1] === 0x83);
    if (/PRIVATE KEY/.test(b.toString("latin1"))) return { ok: false, msg: "Sube solo el certificado (.cer), sin llave: la llave ya está en el servidor." };
    if (!pem && !der) return { ok: false, msg: "No es un certificado (.cer) de Apple." };
  } else {
    const jks = b.readUInt32BE(0) === 0xfeedfeed, der = b[0] === 0x30 && (b[1] === 0x82 || b[1] === 0x83 || b[1] === 0x80);
    if (!jks && !der) return { ok: false, msg: "No parece un almacén de llaves (.jks / .p12)." };
  }
  for (const [k, v] of Object.entries(extra)) { const x = String(v ?? "").replace(/[^\w.@\- ]/g, "").trim().slice(0, 80); if (x) meta[k] = x; }
  return { ok: true, meta };
}

/* Guardar (dentro de la transacción de quien sube, que ya revisó el permiso y el código). Devuelve la huella y la versión. */
export async function guardar(c: PoolClient, x: { tipo: TipoLlave; contenido: Buffer; meta: Meta; vence: string | null; actor: string; motivo: string }): Promise<{ huella: string; version: number; id: string }> {
  const huella = huellaDe(x.contenido), sobre = sellar(x.tipo, x.contenido);
  await c.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [`llavero:${x.tipo}`]);
  const prev = (await c.query<{ id: string; version: number; fingerprint: string }>(`select id::text, version, fingerprint from store_secrets where kind = $1 and retired_at is null for update`, [x.tipo])).rows[0];
  const version = ((await c.query<{ v: number }>(`select coalesce(max(version), 0) + 1 as v from store_secrets where kind = $1`, [x.tipo])).rows[0]?.v) ?? 1;
  if (prev) await c.query(`update store_secrets set retired_at = now(), retired_by = $2, retired_reason = $3 where id = $1`, [prev.id, x.actor, `Reemplazada por la versión ${version}`]);
  const id = (await c.query<{ id: string }>(
    `insert into store_secrets (kind, version, blob_enc, meta, fingerprint, size_bytes, expires_on, uploaded_by) values ($1, $2, $3, $4::jsonb, $5, $6, $7::date, $8) returning id::text`,
    [x.tipo, version, sobre, JSON.stringify(x.meta), huella, x.contenido.length, x.vence, x.actor])).rows[0]!.id;
  // 9j · Llaves que se reemplazan: cada rotación queda anotada (solo inserción) con la huella vieja y la nueva, quién y por qué.
  if (prev) await c.query(`insert into key_rotations (key_name, version, old_fp, new_fp, by, reason) values ($1, $2, $3, $4, $5, $6)`,
    [x.tipo, version, prev.fingerprint, huella, x.actor, String(x.motivo ?? "").trim().slice(0, 300).padEnd(3, ".")]);
  await auditar(c, { actor: x.actor, action: "llavero.subir", targetKind: "store_secret", targetId: id,
    before: prev ? { llave: TIPOS[x.tipo].es, version: prev.version, huella: prev.fingerprint.slice(0, 16) } : undefined,
    after: { llave: TIPOS[x.tipo].es, version, huella: huella.slice(0, 16), ...x.meta }, reason: x.motivo });
  return { huella, version, id };
}

/* Leer una llave viva (SOLO servidor; 8h la entrega al CI por OIDC). Cada lectura queda anotada, salga bien o no. */
export async function leer(tipo: TipoLlave, para: string, ci?: { run: string; sha: string }): Promise<Buffer | null> {
  const f = (await db().query<{ id: string; blob_enc: Buffer; fingerprint: string }>(`select id::text, blob_enc, fingerprint from store_secrets where kind = $1 and retired_at is null`, [tipo])).rows[0];
  if (!f) return null;
  const b = abrir(tipo, f.blob_enc), ok = !!b && huellaDe(b) === f.fingerprint;
  await db().query(`insert into store_secret_reads (secret_id, by, ci_run, ci_sha, purpose, ok) values ($1, $2, $3, $4, $5, $6)`,
    [f.id, ci ? "ci" : "servidor", ci?.run ?? null, ci?.sha ?? null, para.replace(/[^\w .:/-]/g, "").slice(0, 120) || "sin motivo", ok]);
  return ok ? b : null;
}

/* «Comprobar»: abre el sobre en el servidor y compara la huella (anotado como una lectura). No devuelve nada del contenido. */
export async function comprobar(id: string, actor: string): Promise<{ ok: boolean; msg: string }> {
  const f = (await db().query<{ kind: TipoLlave }>(`select kind from store_secrets where id = $1 and retired_at is null`, [id])).rows[0];
  if (!f) return { ok: false, msg: "Esa llave ya no está viva." };
  const b = await leer(f.kind, `comprobar desde Sistema › Integraciones (${actor.slice(0, 8)})`);
  return b ? { ok: true, msg: "El sobre abre y la huella coincide." } : { ok: false, msg: "El sobre no abre con la llave del entorno o la huella no coincide." };
}

export async function retirar(id: string, actor: string, motivo: string): Promise<{ ok: boolean; msg: string }> {
  return tx(async (c) => {
    const f = (await c.query<{ kind: TipoLlave; version: number; fingerprint: string }>(`select kind, version, fingerprint from store_secrets where id = $1 and retired_at is null for update`, [id])).rows[0];
    if (!f) return { ok: false, msg: "Esa llave ya estaba retirada." };
    await c.query(`update store_secrets set retired_at = now(), retired_by = $2, retired_reason = $3 where id = $1`, [id, actor, motivo]);
    await auditar(c, { actor, action: "llavero.retirar", targetKind: "store_secret", targetId: id, before: { llave: TIPOS[f.kind].es, version: f.version, huella: f.fingerprint.slice(0, 16) }, after: { estado: "retirada" }, reason: motivo });
    return { ok: true, msg: `${TIPOS[f.kind].es}: versión ${f.version} retirada.` };
  });
}

export type FilaLlave = {
  id: string; kind: TipoLlave; version: number; fingerprint: string; meta: Meta; size: number; vence: string | null; quien: string | null; at: string;
  retirada: string | null; motivo: string | null; lecturas: number; ultima: string | null; ultimaOk: boolean | null;
};
const ISO = (c: string) => `to_char(${c} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
/* Lo que ve Sistema › Integraciones: las vivas y las últimas retiradas. Las columnas se nombran una por una: el sobre nunca sale. */
export async function listar(): Promise<FilaLlave[]> {
  return (await db().query<FilaLlave>(
    `select s.id::text, s.kind, s.version, s.fingerprint, s.meta, s.size_bytes as size, to_char(s.expires_on, 'YYYY-MM-DD') as vence,
            nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), '') as quien, ${ISO("s.uploaded_at")} as at,
            ${ISO("s.retired_at")} as retirada, s.retired_reason as motivo,
            (select count(*)::int from store_secret_reads r where r.secret_id = s.id) as lecturas,
            (select ${ISO("max(r.at)")} from store_secret_reads r where r.secret_id = s.id) as ultima,
            (select r.ok from store_secret_reads r where r.secret_id = s.id order by r.at desc limit 1) as "ultimaOk"
       from store_secrets s left join users u on u.id = s.uploaded_by
      where s.retired_at is null or s.retired_at > now() - interval '180 days'
      order by s.kind, s.version desc limit 100`)).rows;
}

/* 23 nov · Las llaves vivas de los PROVEEDORES, abiertas para lib/llaves-proveedores.ts (el ÚNICO que las pide; guardián llaveProveedorUnSoloLector).
   Una consulta para todas; cada sobre se abre y su huella se comprueba. La lectura se anota (store_secret_reads, solo inserción) la PRIMERA vez que
   ESTE proceso abre esa versión (`vistas`, que guarda quien llama): volver a cargar la misma versión tras un aviso no llena la tabla. */
export type LlaveAbierta = { valor: string; huella: string; version: number; id: string };
export async function leerProveedores(vistas: Set<string>): Promise<Map<TipoProveedor, LlaveAbierta>> {
  const filas = (await db().query<{ id: string; kind: TipoProveedor; version: number; blob_enc: Buffer; fingerprint: string }>(
    `select id::text, kind, version, blob_enc, fingerprint from store_secrets where kind = any($1::text[]) and retired_at is null`, [Object.keys(PROVEEDORES)])).rows;
  const out = new Map<TipoProveedor, LlaveAbierta>(), nuevas: { id: string; ok: boolean }[] = [];
  for (const f of filas) {
    if (!esTipoProveedor(f.kind)) continue;
    const b = abrir(f.kind, f.blob_enc), ok = !!b && huellaDe(b) === f.fingerprint;
    if (ok && b) out.set(f.kind, { valor: b.toString("utf8"), huella: f.fingerprint, version: f.version, id: f.id });
    b?.fill(0);
    if (!vistas.has(f.id)) nuevas.push({ id: f.id, ok });
  }
  if (nuevas.length) {
    // Se marca ANTES de escribir: dos cargas a la vez (la de quien guardó y la del aviso de la base) no anotan la misma apertura dos veces.
    for (const x of nuevas) vistas.add(x.id);
    try {
      await db().query(`insert into store_secret_reads (secret_id, by, purpose, ok) select unnest($1::bigint[]), 'servidor', 'proveedores: la app la carga en memoria', unnest($2::boolean[])`,
        [nuevas.map((x) => x.id), nuevas.map((x) => x.ok)]);
    } catch (e) { for (const x of nuevas) vistas.delete(x.id); throw e; }
  }
  return out;
}

/* Guardar una llave de texto (dentro de la transacción de quien la pone, que ya revisó el permiso y el código). Lo mismo que guardar(): sobre cifrado,
   una viva por tipo (la nueva retira la anterior con motivo), rotación anotada y auditoría con la huella corta. */
export async function guardarTexto(c: PoolClient, x: { tipo: TipoProveedor; valor: string; meta: Meta; actor: string; motivo: string }): Promise<{ huella: string; version: number; id: string }> {
  const b = Buffer.from(x.valor, "utf8");
  try { return await guardar(c, { tipo: x.tipo, contenido: b, meta: x.meta, vence: null, actor: x.actor, motivo: x.motivo }); }
  finally { b.fill(0); }
}

/* «Probar»: cada resultado, SOLO inserción (tipo, huella, de dónde la tomó el servidor, si sirvió, un código corto); nunca el valor. Y la auditoría. */
export async function anotarPrueba(x: { tipo: TipoProveedor; huella: string; origen: "llavero" | "entorno"; ok: boolean; resultado: string; actor: string }): Promise<void> {
  const res = x.resultado.replace(/[^a-z0-9_]/g, "_").slice(0, 40).padEnd(2, "_");
  await tx(async (c) => {
    await c.query(`insert into store_secret_checks (kind, fingerprint, source, ok, result, by) values ($1, $2, $3, $4, $5, $6)`, [x.tipo, x.huella, x.origen, x.ok, res, x.actor]);
    await auditar(c, { actor: x.actor, action: "llavero.probar", targetKind: "store_secret", targetId: null,
      after: { llave: TIPOS[x.tipo].es, huella: x.huella.slice(0, 16), origen: x.origen, resultado: res, sirve: x.ok } });
  });
}
/* La última prueba de cada tipo de proveedor (con la huella que se probó): «Lo que te toca» y la pantalla la comparan con la huella que se usa hoy. */
export type UltimaPrueba = { kind: TipoProveedor; huella: string; origen: "llavero" | "entorno"; ok: boolean; resultado: string; at: string };
export async function ultimasPruebas(): Promise<UltimaPrueba[]> {
  return (await db().query<UltimaPrueba>(
    `select distinct on (kind) kind, fingerprint as huella, source as origen, ok, result as resultado, ${ISO("at")} as at
       from store_secret_checks where kind = any($1::text[]) order by kind, at desc`, [Object.keys(PROVEEDORES)])).rows;
}
