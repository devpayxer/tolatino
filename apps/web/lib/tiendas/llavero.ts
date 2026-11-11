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
} as const;
export type TipoLlave = keyof typeof TIPOS;
export const esTipo = (k: unknown): k is TipoLlave => typeof k === "string" && Object.hasOwn(TIPOS, k);
export const MAX_BYTES = 64 * 1024;

/* La llave que envuelve: del entorno (secretos del servidor). En ningún entorno se inventa una. */
function kek(tipo: string): Buffer | null {
  const s = process.env.LLAVERO_SECRET && process.env.LLAVERO_SECRET.length >= 32 ? process.env.LLAVERO_SECRET : process.env.DATOS_SECRET;
  if (!s || s.length < 32) return null;
  return Buffer.from(hkdfSync("sha256", Buffer.from(s), Buffer.from("tl:llavero:v1"), Buffer.from(tipo), 32));
}
export const llaveroListo = () => kek("prueba") !== null;

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
