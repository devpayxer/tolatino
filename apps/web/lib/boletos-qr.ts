import "server-only";
import { createHash, createHmac, createPrivateKey, createPublicKey, sign, verify, type KeyObject } from "node:crypto";
import { db } from "./db";
import { ENTORNO } from "./entorno";
import qrRaw from "./qr/qrcodegen";

/* 6c · El QR del boleto (fase6-eventos.md §3 «El QR», §6 #10): fijo, firmado y con versión.
   - Contenido: TL1.<kid>.<id del boleto>.<id de la fecha>.<qr_ver>.<admits>.<firma>. SIN datos personales (guardián qrSinDatosPersonales).
   - Firma Ed25519 del servidor sobre todo lo anterior. La llave PRIVADA solo sale del entorno (QR_LLAVE_PRIVADA: PKCS8 DER en base64; la
     genera infra/pruebas/deploy.sh en el servidor, una por entorno) y solo la lee este archivo; nunca va a la base, a un log ni al
     navegador (guardián qrFirmado). En el sandbox sin la variable se deriva de AUTH_SECRET (como lib/cifrado.ts); en producción, sin ella,
     no se firma nada.
   - La llave PÚBLICA se publica en qr_keys (kid = 8 hex del sha256 de la llave): la puerta (6g/6h) verifica sin conexión con ella y no
     puede fabricar un boleto (no hay secreto compartido tipo HMAC con la puerta).
   - Reemitir o transferir sube qr_ver: el QR viejo trae otra versión y la base dice que no vale.
   - La matriz del QR la arma el generador abierto de Project Nayuki (MIT) que vive en lib/qr/; el sistema de diseño (TicketQR) solo la dibuja. */
const PREFIJO_PKCS8 = Buffer.from("302e020100300506032b657004220420", "hex");
let llaves: { priv: KeyObject; pub: KeyObject; kid: string; pubB64: string } | null = null;
let publicada = false;

function cargar() {
  if (llaves) return llaves;
  const b64 = process.env.QR_LLAVE_PRIVADA;
  let priv: KeyObject;
  if (b64) priv = createPrivateKey({ key: Buffer.from(b64, "base64"), format: "der", type: "pkcs8" });
  else {
    if (ENTORNO === "produccion") throw new Error("Falta QR_LLAVE_PRIVADA en los secretos del entorno");
    const semilla = createHmac("sha256", process.env.AUTH_SECRET ?? "sandbox-sin-secreto").update("tolatino-qr-ed25519-v1").digest();
    priv = createPrivateKey({ key: Buffer.concat([PREFIJO_PKCS8, semilla]), format: "der", type: "pkcs8" });
  }
  const pub = createPublicKey(priv), crudo = (pub.export({ format: "der", type: "spki" }) as Buffer).subarray(-32);
  llaves = { priv, pub, kid: createHash("sha256").update(crudo).digest("hex").slice(0, 8), pubB64: crudo.toString("base64url") };
  return llaves;
}
/* Publica la llave pública de este entorno (una vez por proceso; idempotente). */
async function publicar() {
  if (publicada) return;
  const k = cargar();
  await db().query(`insert into qr_keys (kid, public_key) values ($1, $2) on conflict (kid) do nothing`, [k.kid, k.pubB64]);
  publicada = true;
}

export type DatosQR = { id: string; fecha: string; ver: number; admits: number };
const RE = /^TL1\.([a-f0-9]{8})\.(\d{1,18})\.(\d{1,18})\.(\d{1,6})\.(\d{1,2})\.([A-Za-z0-9_-]{86})$/;

/* El texto del QR de un boleto (solo el servidor lo firma). */
export async function firmarQR(t: DatosQR): Promise<string> {
  await publicar();
  const k = cargar(), msg = `TL1.${k.kid}.${t.id}.${t.fecha}.${t.ver}.${t.admits}`;
  return `${msg}.${sign(null, Buffer.from(msg), k.priv).toString("base64url")}`;
}

/* ¿La firma es buena? Con la llave PÚBLICA publicada para ese kid (como la puerta sin conexión). */
export async function verificarFirma(texto: string): Promise<{ ok: true; d: DatosQR; kid: string } | { ok: false; motivo: "formato" | "llave" | "firma" }> {
  const m = RE.exec(String(texto ?? "").trim());
  if (!m) return { ok: false, motivo: "formato" };
  await publicar();
  const kid = m[1]!, r = (await db().query<{ pk: string }>(`select public_key as pk from qr_keys where kid = $1 and retired_at is null`, [kid])).rows[0];
  if (!r) return { ok: false, motivo: "llave" };
  const pub = createPublicKey({ key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), Buffer.from(r.pk, "base64url")]), format: "der", type: "spki" });
  const msg = `TL1.${kid}.${m[2]}.${m[3]}.${m[4]}.${m[5]}`;
  let bien = false;
  try { bien = verify(null, Buffer.from(msg), pub, Buffer.from(m[6]!, "base64url")); } catch { bien = false; }
  return bien ? { ok: true, kid, d: { id: m[2]!, fecha: m[3]!, ver: Number(m[4]), admits: Number(m[5]) } } : { ok: false, motivo: "firma" };
}

/* La matriz del QR (true = módulo oscuro). Corrección de errores M: se lee bien en una pantalla con brillo bajo. */
type Gen = { QrCode: { Ecc: { MEDIUM: unknown }; encodeText: (t: string, e: unknown) => { size: number; getModule: (x: number, y: number) => boolean } } };
const qrcodegen = qrRaw as unknown as Gen;
export function matrizQR(texto: string): boolean[][] {
  const q = qrcodegen.QrCode.encodeText(texto, qrcodegen.QrCode.Ecc.MEDIUM);
  return Array.from({ length: q.size }, (_, y) => Array.from({ length: q.size }, (_, x) => q.getModule(x, y)));
}
