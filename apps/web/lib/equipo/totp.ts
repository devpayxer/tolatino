import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/* 9j · TOTP propio (RFC 6238 sobre HOTP, RFC 4226): HMAC-SHA1, pasos de 30 s, 6 números. Sin dependencias: solo node:crypto (guardián totpPropio).
   - El secreto: 20 bytes al azar (160 bits, lo que pide la RFC 4226), en Base32 (RFC 4648, sin «=») para la app de códigos.
   - La ventana: el paso de ahora y uno antes y uno después (±30 s de reloj desviado), nada más.
   - Un código usado no vuelve: quien llama pasa el último paso aceptado y solo vale un paso MAYOR (lib/equipo/dos-pasos.ts lo guarda en la base,
     que además no deja que baje). La comparación es de tiempo constante. */
export const PASO_S = 30;
export const DIGITOS = 6;
export const VENTANA = 1;
const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32(b: Buffer): string {
  let bits = 0, valor = 0, out = "";
  for (const x of b) {
    valor = (valor << 8) | x; bits += 8;
    while (bits >= 5) { out += ALFABETO[(valor >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += ALFABETO[(valor << (5 - bits)) & 31];
  return out;
}

export function desdeBase32(s: string): Buffer | null {
  const t = s.toUpperCase().replace(/[\s=-]/g, "");
  if (!/^[A-Z2-7]+$/.test(t)) return null;
  let bits = 0, valor = 0;
  const out: number[] = [];
  for (const c of t) {
    valor = (valor << 5) | ALFABETO.indexOf(c); bits += 5;
    if (bits >= 8) { out.push((valor >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

export function nuevoSecreto(): string {
  return base32(randomBytes(20));
}

export const pasoDe = (ms: number) => Math.floor(ms / 1000 / PASO_S);

/* HOTP del paso (RFC 4226 §5.3: truncado dinámico). */
export function codigo(secreto: Buffer, paso: number): string {
  const m = Buffer.alloc(8);
  m.writeUInt32BE(Math.floor(paso / 0x100000000), 0);
  m.writeUInt32BE(paso >>> 0, 4);
  const h = createHmac("sha1", secreto).update(m).digest();
  const o = h[h.length - 1]! & 0x0f;
  const n = ((h[o]! & 0x7f) << 24) | (h[o + 1]! << 16) | (h[o + 2]! << 8) | h[o + 3]!;
  return String(n % 10 ** DIGITOS).padStart(DIGITOS, "0");
}

/* ¿Con qué paso de la ventana coincide el código? (el más nuevo de los que coinciden, o null). Quien llama decide si ese paso ya se usó: solo vale
   un paso MAYOR que el último aceptado (un código usado no vuelve; dos-pasos.ts lo hace con una escritura condicionada y la base no deja bajarlo). */
export function coincide(secretoB32: string, entrada: string, ahoraMs = Date.now()): number | null {
  const s = desdeBase32(secretoB32);
  const c = String(entrada ?? "").replace(/\D/g, "");
  if (!s || s.length < 10 || c.length !== DIGITOS) return null;
  const p0 = pasoDe(ahoraMs);
  let hallado: number | null = null;
  // Se recorren los tres pasos siempre (sin salir antes) para no decir por el tiempo cuál coincidió.
  for (let d = -VENTANA; d <= VENTANA; d++) if (timingSafeEqual(Buffer.from(codigo(s, p0 + d)), Buffer.from(c))) hallado = p0 + d;
  return hallado;
}

/* La dirección otpauth:// que lee la app de códigos (Google Authenticator, 1Password, Authy…). Lleva el secreto: solo se pinta una vez. */
export function uriOtp(secretoB32: string, cuenta: string): string {
  const emisor = "To'Latino";
  return `otpauth://totp/${encodeURIComponent(`${emisor}:${cuenta}`)}?secret=${secretoB32}&issuer=${encodeURIComponent(emisor)}&algorithm=SHA1&digits=${DIGITOS}&period=${PASO_S}`;
}
