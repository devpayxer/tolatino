import "server-only";
import { createPrivateKey, sign as firmar } from "node:crypto";
import { tokenAcceso, type CuentaServicio } from "../push/fcm";
import type { Bi, ContenidoPase } from "./apple";
import { FONDO_HEX, GENERICO } from "./apple";

/* 8g · Google Wallet (fase8-apps.md §4 8g; API REST «walletobjects v1», su documento de descubrimiento oficial fijado a un commit en
   scripts/contrato-wallet/correr.sh): una CLASE de evento por fecha (nombre, lugar, fecha) y un OBJETO por boleto (estado, el QR, el tipo, cuándo
   vale). El enlace «Guardar en Google Wallet» es un JWT firmado con la cuenta de servicio (RS256, aud «google», typ «savetowallet») que solo
   nombra el objeto ya creado por la API (nada del boleto viaja en el enlace).
   - El QR es EL MISMO texto firmado del boleto (6c), como en Apple (guardián paseMismoQr). Sin QR vigente, el objeto queda sin código; anulado,
     INACTIVE (Google lo pasa a «Pases vencidos»).
   - Nada personal: sin ticketHolderName, sin montos (faceValue), sin teléfono. Evento sensible: texto genérico, sin lugar.
   - La cuenta de servicio y el ID del emisor salen del llavero (google_wallet_sa); el servidor de Google lo decide quien llama (en pruebas, el
   simulador del contrato; en producción, solo el de Google).
   Módulo autocontenido (sin la base): lo compila aparte el contrato (scripts/contrato-wallet). */
export const ALCANCE_WALLET = "https://www.googleapis.com/auth/wallet_object.issuer";
export const API_WALLET = "https://walletobjects.googleapis.com";
export const GUARDAR = "https://pay.google.com/gp/v/save/";
export type CredGoogle = { sa: CuentaServicio & { private_key_id?: string }; emisor: string };
export type RespGoogle = { ok: boolean; status: number; code?: string };

const ls = (x: Bi) => ({ defaultValue: { language: "es-US", value: x.es }, translatedValues: [{ language: "en-US", value: x.en }] });
const ID = /^\d{6,25}$/, SUF = /^[A-Za-z0-9._-]{1,120}$/;
export const idClase = (emisor: string, fecha: string, generico: boolean) => `${emisor}.evt_${fecha}${generico ? "_g" : ""}`;
export const idObjeto = (emisor: string, serie: string) => `${emisor}.${serie}`;

/* La clase: el evento de esa fecha. Sensible = genérica (sin nombre del evento ni lugar). */
export function clase(emisor: string, fecha: string, c: Pick<ContenidoPase, "generico" | "titulo" | "lugar" | "direccion" | "inicio" | "fin">) {
  const b: Record<string, unknown> = {
    id: idClase(emisor, fecha, c.generico), issuerName: "To'Latino", reviewStatus: "UNDER_REVIEW", hexBackgroundColor: FONDO_HEX,
    eventName: ls(c.generico ? GENERICO : c.titulo), dateTime: { start: c.inicio, end: c.fin },
  };
  if (!c.generico && c.lugar) b.venue = { name: ls({ es: c.lugar, en: c.lugar }), ...(c.direccion ? { address: ls({ es: c.direccion, en: c.direccion }) } : {}) };
  return b;
}
/* El objeto: el boleto. */
export function objeto(emisor: string, fecha: string, c: ContenidoPase) {
  const b: Record<string, unknown> = {
    id: idObjeto(emisor, c.serie), classId: idClase(emisor, fecha, c.generico), state: c.anulado ? "INACTIVE" : "ACTIVE",
    ticketNumber: c.codigo, ticketType: ls(c.generico ? { es: "Boleto", en: "Ticket" } : c.tipo),
    validTimeInterval: { start: { date: c.inicio }, end: { date: c.fin } },
    textModulesData: [
      ...(c.estado ? [{ id: "estado", localizedHeader: ls({ es: "Estado", en: "Status" }), localizedBody: ls(c.estado), header: "Estado", body: c.estado.es }] : []),
      ...(c.vale ? [{ id: "vale", localizedHeader: ls({ es: "Vale", en: "Valid" }), localizedBody: ls(c.vale), header: "Vale", body: c.vale.es }] : []),
      { id: "entran", localizedHeader: ls({ es: "Entran", en: "Admits" }), localizedBody: ls({ es: String(c.entran), en: String(c.entran) }), header: "Entran", body: String(c.entran) },
    ],
    linksModuleData: { uris: [{ id: "boleto", uri: c.enlace, description: "Mis boletos", localizedDescription: ls({ es: "Abrir en To'Latino", en: "Open in To'Latino" }) }] },
  };
  // Sin QR vigente no hay código (nunca uno viejo).
  if (c.qr && !c.anulado) b.barcode = { type: "QR_CODE", value: c.qr, alternateText: c.codigo };
  return b;
}

async function pedir(base: string, token: string, metodo: "GET" | "POST" | "PUT", ruta: string, cuerpo?: unknown): Promise<RespGoogle & { json?: Record<string, unknown> }> {
  try {
    const r = await fetch(`${base.replace(/\/$/, "")}/walletobjects/v1/${ruta}`, { method: metodo, redirect: "manual", signal: AbortSignal.timeout(10_000),
      headers: { authorization: `Bearer ${token}`, ...(cuerpo ? { "content-type": "application/json" } : {}) }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
    const j = (await r.json().catch(() => ({}))) as Record<string, unknown> & { error?: { status?: string; message?: string } };
    return { ok: r.ok, status: r.status, code: r.ok ? undefined : String(j.error?.status ?? `HTTP ${r.status}`), json: j };
  } catch (e) { return { ok: false, status: 0, code: (e as Error)?.name === "TimeoutError" ? "timeout" : "red" }; }
}

/* Crear o poner al día la clase y el objeto (insert; si ya existe, update = PUT, que REEMPLAZA todo: un PATCH dejaría el código viejo puesto
   cuando el boleto se queda sin QR vigente). Idempotente: la misma llamada dos veces deja lo mismo. */
export async function sincronizar(base: string, tokenUri: string, cred: CredGoogle, fecha: string, c: ContenidoPase): Promise<RespGoogle> {
  if (!ID.test(cred.emisor) || !SUF.test(c.serie) || !/^\d{1,18}$/.test(fecha)) return { ok: false, status: 0, code: "datos" };
  const token = await tokenAcceso(cred.sa, tokenUri, Date.now(), ALCANCE_WALLET);
  if (!token) return { ok: false, status: 401, code: "oauth" };
  const k = clase(cred.emisor, fecha, c), o = objeto(cred.emisor, fecha, c);
  let r = await pedir(base, token, "POST", "eventTicketClass", k);
  if (r.status === 409) r = await pedir(base, token, "PUT", `eventTicketClass/${encodeURIComponent(String(k.id))}`, k);
  if (!r.ok) return r;
  r = await pedir(base, token, "POST", "eventTicketObject", o);
  if (r.status === 409) r = await pedir(base, token, "PUT", `eventTicketObject/${encodeURIComponent(String(o.id))}`, o);
  return { ok: r.ok, status: r.status, code: r.code };
}

/* El enlace «Guardar en Google Wallet»: un JWT con SOLO el id del objeto (ya creado). `origen` = la página desde donde se guarda. */
export function enlaceGuardar(cred: CredGoogle, serie: string, origen: string, ahoraS = Math.floor(Date.now() / 1000)): string {
  const b64u = (x: unknown) => Buffer.from(JSON.stringify(x)).toString("base64url");
  const h = b64u({ alg: "RS256", typ: "JWT", ...(cred.sa.private_key_id ? { kid: cred.sa.private_key_id } : {}) });
  const p = b64u({ iss: cred.sa.client_email, aud: "google", typ: "savetowallet", iat: ahoraS, origins: [origen], payload: { eventTicketObjects: [{ id: idObjeto(cred.emisor, serie) }] } });
  const f = firmar("sha256", Buffer.from(`${h}.${p}`), createPrivateKey(cred.sa.private_key)).toString("base64url");
  return `${GUARDAR}${h}.${p}.${f}`;
}
