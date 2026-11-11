import "server-only";
import { createHash, createPrivateKey, createPublicKey, sign as firmar, X509Certificate, type KeyObject } from "node:crypto";

/* 8g · ASN.1 DER mínimo y propio (fase8-apps.md §4 8g: «PKCS#7 propio con node:crypto»): node:crypto firma, verifica y lee certificados, pero
   no arma ni una firma CMS (PKCS#7) ni una solicitud de certificado (PKCS#10). El contenedor de la web (node:22-alpine) no trae el comando
   openssl. Aquí, lo justo y nada más:
   - firmaSeparada(): la firma de Apple Wallet = CMS SignedData SEPARADA (RFC 5652, sin el contenido adentro) del manifest.json, con el
     certificado del Pass Type ID y la cadena (el intermedio WWDR de Apple), atributos firmados contentType + signingTime + messageDigest,
     SHA-256 y RSA. La verifica `openssl smime -verify` (la prueba wal8g lo hace con la cadena de prueba).
   - solicitudCertificado(): el CSR (PKCS#10) que se sube a developer.apple.com para el Pass Type ID: la llave privada nace y se queda en el
     servidor (llavero); a Apple solo va la parte pública.
   - leer(): recorrer un TLV (para sacar del certificado el emisor y el número de serie que pide el SignerInfo).
   Módulo autocontenido (sin la base): lo compila aparte el contrato (scripts/contrato-wallet). */

type Nodo = Buffer;
const largo = (n: number): Buffer => {
  if (n < 0x80) return Buffer.from([n]);
  const b: number[] = [];
  for (let x = n; x > 0; x = Math.floor(x / 256)) b.unshift(x & 0xff);
  return Buffer.from([0x80 | b.length, ...b]);
};
export const tlv = (tag: number, cuerpo: Buffer): Nodo => Buffer.concat([Buffer.from([tag]), largo(cuerpo.length), cuerpo]);
export const seq = (...x: Nodo[]): Nodo => tlv(0x30, Buffer.concat(x));
/* SET OF en DER: los elementos ordenados por sus bytes (X.690 §11.6). */
export const set = (...x: Nodo[]): Nodo => tlv(0x31, Buffer.concat([...x].sort(Buffer.compare)));
export const ctx = (n: number, cuerpo: Buffer, construido = true): Nodo => tlv((construido ? 0xa0 : 0x80) | n, cuerpo);
export const nulo = (): Nodo => Buffer.from([0x05, 0x00]);
export const octetos = (b: Buffer): Nodo => tlv(0x04, b);
export const utf8 = (s: string): Nodo => tlv(0x0c, Buffer.from(s, "utf8"));
export const imprimible = (s: string): Nodo => tlv(0x13, Buffer.from(s, "ascii"));
export const bits = (b: Buffer): Nodo => tlv(0x03, Buffer.concat([Buffer.from([0]), b]));
export function entero(v: number | Buffer): Nodo {
  const h = typeof v === "number" ? v.toString(16) : "";
  let b = typeof v === "number" ? Buffer.from(h.length % 2 ? `0${h}` : h, "hex") : Buffer.from(v);
  while (b.length > 1 && b[0] === 0 && !(b[1]! & 0x80)) b = b.subarray(1);
  if (b[0]! & 0x80) b = Buffer.concat([Buffer.from([0]), b]);
  return tlv(0x02, b);
}
export function oid(s: string): Nodo {
  const p = s.split(".").map(Number), out: number[] = [p[0]! * 40 + p[1]!];
  for (const n of p.slice(2)) { const g: number[] = []; let x = n; do { g.unshift(x & 0x7f); x = Math.floor(x / 128); } while (x > 0); for (let i = 0; i < g.length - 1; i++) g[i]! |= 0x80; out.push(...g); }
  return tlv(0x06, Buffer.from(out));
}
/* UTCTime (hasta 2049) como pide RFC 5280 para signingTime. */
export function hora(d: Date): Nodo {
  const z = (n: number) => String(n).padStart(2, "0");
  return tlv(0x17, Buffer.from(`${z(d.getUTCFullYear() % 100)}${z(d.getUTCMonth() + 1)}${z(d.getUTCDate())}${z(d.getUTCHours())}${z(d.getUTCMinutes())}${z(d.getUTCSeconds())}Z`, "ascii"));
}

/* Un TLV leído: su etiqueta, dónde empieza el cuerpo y dónde termina todo (para cortar el original sin re-codificar). */
export type Leido = { tag: number; ini: number; cuerpo: number; fin: number };
export function leer(b: Buffer, i = 0): Leido {
  const tag = b[i]!;
  let n = b[i + 1]!, p = i + 2;
  if (n & 0x80) { const k = n & 0x7f; if (k < 1 || k > 4) throw new Error("der: largo"); n = 0; for (let j = 0; j < k; j++) n = n * 256 + b[p + j]!; p += k; }
  if (p + n > b.length) throw new Error("der: corto");
  return { tag, ini: i, cuerpo: p, fin: p + n };
}
export function hijos(b: Buffer, x: Leido): Leido[] {
  const out: Leido[] = [];
  for (let i = x.cuerpo; i < x.fin; ) { const h = leer(b, i); out.push(h); i = h.fin; }
  return out;
}

/* Del certificado (DER): el emisor tal cual (Name) y el número de serie tal cual (INTEGER), para IssuerAndSerialNumber. */
export function emisorYSerie(certDer: Buffer): { emisor: Buffer; serie: Buffer } {
  const cert = leer(certDer), tbs = hijos(certDer, cert)[0]!, h = hijos(certDer, tbs);
  const k = h[0]!.tag === 0xa0 ? 1 : 0; // [0] versión (opcional)
  const serie = h[k]!, emisor = h[k + 2]!;
  if (serie.tag !== 0x02 || emisor.tag !== 0x30) throw new Error("der: certificado");
  return { emisor: certDer.subarray(emisor.ini, emisor.fin), serie: certDer.subarray(serie.ini, serie.fin) };
}

const OID = {
  datos: "1.2.840.113549.1.7.1", firmados: "1.2.840.113549.1.7.2", sha256: "2.16.840.1.101.3.4.2.1", rsa: "1.2.840.113549.1.1.1",
  rsaSha256: "1.2.840.113549.1.1.11", ecdsaSha256: "1.2.840.10045.4.3.2", tipo: "1.2.840.113549.1.9.3", resumen: "1.2.840.113549.1.9.4", cuando: "1.2.840.113549.1.9.5",
  cn: "2.5.4.3", c: "2.5.4.6", o: "2.5.4.10",
};

/* Los certificados de una cadena PEM (uno o varios BEGIN CERTIFICATE) en DER. */
export function certificadosPem(pem: string): Buffer[] {
  return [...pem.matchAll(/-----BEGIN CERTIFICATE-----([A-Za-z0-9+/=\s]+)-----END CERTIFICATE-----/g)].map((m) => Buffer.from(m[1]!.replace(/\s+/g, ""), "base64"));
}
export const pemDe = (der: Buffer, que = "CERTIFICATE") => `-----BEGIN ${que}-----\n${der.toString("base64").replace(/(.{64})/g, "$1\n").replace(/\n$/, "")}\n-----END ${que}-----\n`;

/* La firma separada (CMS SignedData, DER) de `contenido` con la llave y el certificado del firmante y la cadena (sin la raíz). */
export function firmaSeparada(contenido: Buffer, llave: KeyObject | string, certDer: Buffer, cadena: Buffer[], cuando = new Date()): Buffer {
  const k = typeof llave === "string" ? createPrivateKey(llave) : llave;
  const ec = k.asymmetricKeyType === "ec";
  if (!ec && k.asymmetricKeyType !== "rsa") throw new Error("der: llave RSA o EC");
  const algSha = seq(oid(OID.sha256), nulo());
  const atributos = [
    seq(oid(OID.tipo), set(oid(OID.datos))),
    seq(oid(OID.cuando), set(hora(cuando))),
    seq(oid(OID.resumen), set(octetos(createHash("sha256").update(contenido).digest()))),
  ];
  // Lo que se firma es el SET OF de los atributos (etiqueta 0x31); en el SignerInfo va con la etiqueta [0] implícita.
  const firmados = set(...atributos), firma = firmar("sha256", firmados, ec ? { key: k, dsaEncoding: "der" } : k);
  const { emisor, serie } = emisorYSerie(certDer);
  const firmante = seq(entero(1), seq(emisor, serie), algSha, Buffer.concat([Buffer.from([0xa0]), firmados.subarray(1)]),
    ec ? seq(oid(OID.ecdsaSha256)) : seq(oid(OID.rsa), nulo()), octetos(firma));
  const datos = seq(entero(1), set(algSha), seq(oid(OID.datos)), ctx(0, Buffer.concat([certDer, ...cadena])), set(firmante));
  return seq(oid(OID.firmados), ctx(0, datos));
}

/* La solicitud de certificado (PKCS#10, PEM) para una llave RSA: CN y país; atributos vacíos. Apple solo lee la llave pública. */
export function solicitudCertificado(llave: KeyObject | string, cn: string, pais = "US"): string {
  const k = typeof llave === "string" ? createPrivateKey(llave) : llave;
  const spki = createPublicKey(k).export({ format: "der", type: "spki" }) as Buffer;
  const nombre = seq(set(seq(oid(OID.cn), utf8(cn.slice(0, 64)))), set(seq(oid(OID.c), imprimible(pais))));
  const info = seq(entero(0), nombre, spki, Buffer.from([0xa0, 0x00]));
  return pemDe(seq(info, seq(oid(OID.rsaSha256), nulo()), bits(firmar("sha256", info, k))), "CERTIFICATE REQUEST");
}

/* Los datos del certificado de un Pass Type ID (subject UID = el identificador; OU = el equipo) y si su llave es la nuestra. */
export function datosCertificado(certDer: Buffer, llave?: KeyObject | string) {
  const x = new X509Certificate(certDer);
  const campo = (k: string) => new RegExp(`(?:^|\\n)${k}=([^\\n]+)`).exec(x.subject)?.[1]?.trim() ?? null;
  const propia = llave ? x.checkPrivateKey(typeof llave === "string" ? createPrivateKey(llave) : llave) : null;
  return { x, tipo: campo("UID"), equipo: campo("OU"), cn: campo("CN"), vence: new Date(x.validTo), desde: new Date(x.validFrom), propia,
    emisorUrl: /CA Issuers - URI:(\S+)/.exec(x.infoAccess ?? "")?.[1] ?? null, huella: x.fingerprint256.replace(/:/g, "").toLowerCase() };
}
