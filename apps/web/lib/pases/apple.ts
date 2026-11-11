import "server-only";
import { createHash, type KeyObject } from "node:crypto";
import { firmaSeparada } from "./der";
import { zip } from "./zip";

/* 8g · El pase de Apple Wallet (fase8-apps.md §4 8g; formato de Apple «Pass» y «PassFields», developer.apple.com/documentation/walletpasses,
   fijado en scripts/contrato-wallet/apple.json):
   - pass.json de tipo eventTicket. El QR es EL MISMO texto firmado del boleto (6c): lo da contenidoPase() con vistaBoleto() de lib/boletos.ts
     (guardián paseMismoQr); así la Puerta lo valida igual con y sin señal. Sin QR vigente (se está transfiriendo, usado, anulado…), el pase va
     sin código y con el estado; si el boleto ya no vale nunca más, «voided».
   - Nada personal más allá de lo que muestra la pantalla del boleto (qrSinDatosPersonales): sin el nombre de la persona, sin teléfono, sin
     montos. Evento sensible (Fe, Salud, Niños): texto genérico, sin lugar ni organizador.
   - ES/EN: las etiquetas y los valores van en español en pass.json (el idioma principal) y cada uno se traduce en en.lproj/pass.strings;
     es.lproj/pass.strings repite el español (así un teléfono en otro idioma ve el español, nunca una llave).
   - manifest.json (SHA-1 de cada archivo, como lo pide Apple) y signature: firma CMS separada del manifiesto con el certificado del Pass Type
     ID + el intermedio WWDR (der.ts).
   Módulo autocontenido (sin la base): lo compila aparte el contrato (scripts/contrato-wallet). */

export type Bi = { es: string; en: string };
export type ContenidoPase = {
  serie: string; version: number; codigo: string;
  /* El texto del QR del boleto tal cual lo firma el servidor (6c), o null si ahora no hay QR vigente. */
  qr: string | null;
  anulado: boolean; estado: Bi | null; generico: boolean;
  titulo: Bi; lugar: string | null; direccion: string | null; organiza: string | null;
  /* ISO 8601 con la zona de la ciudad (Wallet lo muestra en esa hora: ignoresTimeZone). */
  inicio: string; fin: string;
  tipo: Bi; entran: number; vale: Bi | null; enlace: string;
};
export type CredPase = { tipo: string; equipo: string; llave: KeyObject | string; certDer: Buffer; cadena: Buffer[] };
export type Imagenes = Record<"icon.png" | "icon@2x.png" | "icon@3x.png" | "logo.png" | "logo@2x.png", Buffer>;

const L = {
  fecha: { es: "FECHA", en: "DATE" }, evento: { es: "EVENTO", en: "EVENT" }, lugar: { es: "LUGAR", en: "VENUE" }, hora: { es: "HORA", en: "TIME" },
  tipo: { es: "TIPO", en: "TYPE" }, entran: { es: "ENTRAN", en: "ADMITS" }, estado: { es: "ESTADO", en: "STATUS" }, codigo: { es: "CÓDIGO", en: "CODE" },
  vale: { es: "VALE", en: "VALID" }, direccion: { es: "DIRECCIÓN", en: "ADDRESS" }, organiza: { es: "ORGANIZA", en: "ORGANIZER" },
  ayuda: { es: "EN LA PUERTA", en: "AT THE DOOR" }, cambios: { es: "TRANSFERIR O DEVOLVER", en: "TRANSFER OR REFUND" },
  desc: { es: "Boleto de To'Latino", en: "To'Latino ticket" }, logo: { es: "To'Latino", en: "To'Latino" },
};
export const GENERICO: Bi = { es: "Boleto de evento", en: "Event ticket" };

/* Los colores del sistema de diseño (packages/ui/src/tokens.css): --tl-ink de fondo, --tl-white el texto, --tl-signal las etiquetas. */
const TINTA = [11, 14, 18] as const;
export const COLORES = { fondo: `rgb(${TINTA.join(", ")})`, texto: "rgb(255, 255, 255)", etiqueta: "rgb(0, 229, 196)" };
/* El mismo fondo en hexadecimal (lo que pide Google Wallet: hexBackgroundColor). */
export const FONDO_HEX = `#${TINTA.map((x) => x.toString(16).padStart(2, "0")).join("")}`;

type Campo = { key: string; label?: string; value: string | number; dateStyle?: string; timeStyle?: string; ignoresTimeZone?: boolean; textAlignment?: string };

/* pass.json + los textos de cada idioma (clave = el español). */
export function paseJson(c: ContenidoPase, cred: Pick<CredPase, "tipo" | "equipo">, servicio: string, token: string): { json: Record<string, unknown>; textos: Map<string, string> } {
  const textos = new Map<string, string>();
  const t = (x: Bi) => { if (x.es !== x.en || !textos.has(x.es)) textos.set(x.es, x.en); return x.es; };
  const campo = (key: string, etiqueta: Bi, value: string | number, extra: Partial<Campo> = {}): Campo => ({ key, label: t(etiqueta), value, ...extra });
  const fechaHora = { dateStyle: "PKDateStyleMedium", timeStyle: "PKDateStyleShort", ignoresTimeZone: true };
  const aux: Campo[] = [campo("tipo", L.tipo, t(c.generico ? { es: "Boleto", en: "Ticket" } : c.tipo)), campo("entran", L.entran, c.entran)];
  if (c.estado) aux.push(campo("estado", L.estado, t(c.estado)));
  const atras: Campo[] = [campo("codigo", L.codigo, c.codigo)];
  if (c.vale) atras.push(campo("vale", L.vale, t(c.vale)));
  if (!c.generico && c.direccion) atras.push(campo("direccion", L.direccion, c.direccion));
  if (!c.generico && c.organiza) atras.push(campo("organiza", L.organiza, c.organiza));
  atras.push(campo("ayuda", L.ayuda, t({ es: `Muestra este código en la puerta. Si no se puede leer, di el código ${c.codigo}. Funciona sin señal.`, en: `Show this code at the door. If it cannot be scanned, say the code ${c.codigo}. It works without signal.` })));
  atras.push(campo("cambios", L.cambios, t({ es: `En To'Latino › Mis boletos: ${c.enlace}`, en: `In To'Latino › My tickets: ${c.enlace}` })));
  const json: Record<string, unknown> = {
    formatVersion: 1, passTypeIdentifier: cred.tipo, teamIdentifier: cred.equipo, serialNumber: c.serie,
    organizationName: "To'Latino", description: t(L.desc), logoText: t(L.logo),
    webServiceURL: servicio, authenticationToken: token,
    backgroundColor: COLORES.fondo, foregroundColor: COLORES.texto, labelColor: COLORES.etiqueta,
    relevantDate: c.inicio, expirationDate: c.fin, sharingProhibited: true, voided: c.anulado,
    eventTicket: {
      headerFields: [campo("fecha", L.fecha, c.inicio, { dateStyle: "PKDateStyleShort", timeStyle: "PKDateStyleNone", ignoresTimeZone: true, textAlignment: "PKTextAlignmentRight" })],
      primaryFields: [campo("evento", L.evento, t(c.generico ? GENERICO : c.titulo))],
      secondaryFields: [campo("hora", L.hora, c.inicio, fechaHora), ...(!c.generico && c.lugar ? [campo("lugar", L.lugar, c.lugar)] : [])],
      auxiliaryFields: aux,
      backFields: atras,
    },
  };
  // Sin QR vigente no hay código (nunca uno viejo): la pantalla del boleto tampoco lo muestra.
  if (c.qr && !c.anulado) json.barcodes = [{ format: "PKBarcodeFormatQR", message: c.qr, messageEncoding: "iso-8859-1", altText: c.codigo }];
  return { json, textos };
}

/* Un archivo .strings: "clave" = "valor"; con comillas, barras y saltos escapados. UTF-16 LE con BOM (lo que leen los .strings de Apple). */
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
export function strings(pares: [string, string][]): Buffer {
  const txt = pares.map(([k, v]) => `"${esc(k)}" = "${esc(v)}";`).join("\n") + "\n";
  return Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(txt, "utf16le")]);
}

const sha1 = (b: Buffer) => createHash("sha1").update(b).digest("hex");

/* El .pkpass: pass.json, los textos, las imágenes, manifest.json y signature, en un ZIP. */
export function armarPkpass(c: ContenidoPase, cred: CredPase, img: Imagenes, servicio: string, token: string): Buffer {
  const { json, textos } = paseJson(c, cred, servicio, token);
  const archivos: [string, Buffer][] = [
    ["pass.json", Buffer.from(JSON.stringify(json), "utf8")],
    ["es.lproj/pass.strings", strings([...textos.keys()].map((k) => [k, k]))],
    ["en.lproj/pass.strings", strings([...textos.entries()])],
    ...(Object.entries(img) as [string, Buffer][]),
  ];
  const manifiesto = Buffer.from(JSON.stringify(Object.fromEntries(archivos.map(([n, b]) => [n, sha1(b)]))), "utf8");
  const firma = firmaSeparada(manifiesto, cred.llave, cred.certDer, cred.cadena);
  return zip([...archivos, ["manifest.json", manifiesto], ["signature", firma]]);
}

/* Una fecha UTC en ISO 8601 con el desfase de la zona de la ciudad (2026-11-20T21:00:00-05:00). */
export function isoEnZona(utc: string, tz: string): string {
  const d = new Date(utc);
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    .formatToParts(d).map((x) => [x.type, x.value]));
  const local = Date.UTC(+p.year!, +p.month! - 1, +p.day!, +p.hour!, +p.minute!, +p.second!), min = Math.round((local - d.getTime()) / 60_000);
  const z = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, "0");
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${min < 0 ? "-" : "+"}${z(Math.abs(min) / 60)}:${z(Math.abs(min) % 60)}`;
}
