import "server-only";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { gzipSync } from "node:zlib";
import { db, tx } from "./db";
import { valores } from "./config";
import { firmarPaquete } from "./boletos-qr";
import { llaveDerivada } from "./cifrado";
import type { CtxPuerta } from "./puerta";
import type { Bi } from "./puerta-comun";

/* 6h · El paquete sin conexión de To'Latino Puerta (fase6-eventos.md §3 «Sin conexión y varios porteros», §4 6h; decisión T #23).
   - Se arma al pedirlo, para UNA sesión de puerta abierta (accesoPuerta antes, y la base lo vuelve a exigir al registrar el paquete), y solo
     para el teléfono que abrió esa puerta (cookie del dispositivo = door_sessions.device). El contenido no se guarda: queda door_packages
     con la huella, las filas y cuándo vence (fin de la fecha + puerta_paquete_h).
   - Lleva SOLO lo que la validación necesita (puerta_paquete_filas de la base): por boleto id, versión del QR, entradas, estado, nombre +
     inicial (o la cortesía), últimos 4 y huella del código, días que vale, tipo, mesa / cortesía / recibido, entraron / adentro / última
     puerta y hora; por RSVP id, personas, estado, nombre + inicial y llegaron. NUNCA teléfonos, correos, montos ni pagos (guardián
     paqueteMinimo).
   - Se FIRMA con la llave Ed25519 del QR (prefijo TLPK1: no se confunde con un QR) y se CIFRA con AES-256-GCM con la llave de esa sesión
     (HKDF de la llave del entorno con la sesión, la persona y el teléfono): otra sesión, otro portero u otro teléfono no la tienen, y el
     servidor no la vuelve a dar cuando la sesión se cierra o se revoca. El teléfono la guarda como CryptoKey NO exportable.
   - Con señal, cada puerta_sync_seg el teléfono pide los cambios desde su cursor (devueltos, transferidos, nuevos, quién entró por otra
     puerta), firmados y cifrados igual. */
const ID = /^\d{1,18}$/, UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d{1,6})?([+-]\d{2}(:?\d{2})?|Z)$/;

/* Una fila de boleto: [id, versión QR, entradas, estado, nombre, últimos 4 del código, huella del código, días (varios días) | null,
   tipo (índice en `tipos`) | -1, banderas (1 mesa · 2 cortesía · 4 recibido), entraron, adentro, última puerta | null, hora HH:MM | null]. */
export type FilaPaqB = [string, number, number, string, string, string, string, number[] | null, number, number, number, number, string | null, string | null];
/* Una fila de RSVP: [id, personas, estado, nombre, llegaron]. */
export type FilaPaqR = [string, number, string, string, number];
export type Paquete = {
  v: 1; delta: boolean; pk: string; s: string; f: string; e: string; di: number; emitido: string; vence: string; cursor: string;
  reglas: { entry: "free" | "rsvp" | "tickets"; reentrada: boolean; edad: number; pideId: boolean; cierre: string | null; span: boolean };
  ev: { titulo: Bi; negocio: string; puerta: string; dia: string; h0: number; puertas: string; tz: string };
  fechas: string[]; tipos: Bi[]; b: FilaPaqB[]; r: FilaPaqR[];
  sync: { seg: number; avisoMin: number; lote: number };
};
type Fila = { k: "b" | "r"; id: string; v: number | null; a: number; st: string; nom: string; c4: string | null; ch: string | null; dias: number[] | null; tipo: Bi | null;
  mesa: boolean; comp: boolean; tr: boolean; e: number; i: number; ud: string | null; uh: string | null };

/* La llave de la sesión (nunca se guarda: se vuelve a derivar). */
function llaveSesion(sesion: string, userId: string, device: string | null): Buffer {
  return llaveDerivada("puerta-paquete", `${sesion}|${userId}|${device ?? "-"}`);
}
/* Firma y cifra: {j, kid, sig} → gzip → AES-256-GCM (iv de 12 bytes; el texto cifrado con la etiqueta al final, como WebCrypto). */
async function sellar(p: Paquete, llave: Buffer, gz: boolean): Promise<{ iv: string; c: string; sha: string; bytes: number }> {
  const j = JSON.stringify(p), { kid, firma } = await firmarPaquete(j);
  const sobre = Buffer.from(JSON.stringify({ j, kid, sig: firma }), "utf8"), plano = gz ? gzipSync(sobre) : sobre;
  const iv = randomBytes(12), ci = createCipheriv("aes-256-gcm", llave, iv);
  const c = Buffer.concat([ci.update(plano), ci.final(), ci.getAuthTag()]);
  return { iv: iv.toString("base64"), c: c.toString("base64"), sha: createHash("sha256").update(j).digest("hex"), bytes: c.length };
}

export type ResPaquete =
  | { ok: true; pk: string; iv: string; c: string; n: number; delta: boolean; gz: boolean; llave?: string; vence: string; emitido: string }
  | { ok: false; msg: Bi; cerrada?: boolean; otro?: boolean; completo?: boolean };
const no = (es: string, en: string, x: Record<string, unknown> = {}) => ({ ok: false as const, msg: { es, en }, ...x });

/* El paquete (todo) o los cambios desde un cursor. `device` = la cookie del teléfono que lo pide. */
export async function armarPaquete(ctx: CtxPuerta, device: string | null, desde: string | null, conLlave: boolean, gz = true): Promise<ResPaquete> {
  const s = (await db().query<{ device: string | null; pk: string | null }>(
    `select s.device::text as device, (select p.id::text from door_packages p where p.session_id = s.id and p.revoked_at is null and p.expires_at > now() order by p.id desc limit 1) as pk
       from door_sessions s where s.id = $1::bigint and s.user_id = $2 and s.ended_at is null`, [ctx.sesion, ctx.userId])).rows[0];
  if (!s) return no("Ya no tienes acceso a esta puerta.", "You no longer have access to this door.", { cerrada: true });
  // Solo el teléfono que abrió la puerta (otro teléfono con la misma cuenta abre su propia puerta).
  if (s.device && (!device || !UUID.test(device) || device.toLowerCase() !== s.device.toLowerCase())) return no("Esta puerta se abrió en otro teléfono. Ábrela otra vez aquí.", "This door was opened on another phone. Open it again here.", { cerrada: true, otro: true });
  const delta = !!desde;
  if (delta && (!ISO.test(String(desde)) || !s.pk)) return no("Hace falta bajar la lista completa.", "The full list is needed.", { completo: true });
  const cfg = await valores("puerta_sync_seg", "puerta_offline_aviso_min", "puerta_sync_lote");
  return tx(async (c) => {
    const h = (await c.query<{ ahora: string; vence: string; cierre: string | null; fechas: string[] }>(
      `select to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as ahora,
              to_char((d.ends_at + make_interval(hours => cfg_int('puerta_paquete_h'))) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as vence,
              case when e.door_close_after_min is not null then to_char((d.starts_at + make_interval(mins => e.door_close_after_min)) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end as cierre,
              (select coalesce(array_agg(z.id::text order by z.starts_at), '{}') from event_dates z where z.event_id = e.id) as fechas
         from event_dates d join events e on e.id = d.event_id where d.id = $1::bigint`, [ctx.fecha])).rows[0]!;
    // Cambios: con 15 s de margen sobre el cursor (lo que se confirmó tarde no se pierde; repetir una fila no cambia nada en el teléfono).
    const F = (await c.query<Fila>(
      `select k, id::text, v, a, st, nom, c4, ch, dias, tipo, mesa, comp, tr, e, i, ud, uh from puerta_paquete_filas($1::bigint, $2::timestamptz - interval '15 seconds')`,
      [ctx.fecha, delta ? desde : null])).rows;
    const tipos: Bi[] = [], idx = new Map<string, number>();
    const tipo = (x: Bi | null) => { if (!x) return -1; const k = JSON.stringify(x); if (!idx.has(k)) { idx.set(k, tipos.length); tipos.push({ es: String(x.es ?? ""), en: String(x.en ?? x.es ?? "") }); } return idx.get(k)!; };
    const b: FilaPaqB[] = [], r: FilaPaqR[] = [];
    for (const x of F) {
      if (x.k === "b") b.push([x.id, x.v ?? 1, x.a, x.st, x.nom, x.c4 ?? "", x.ch ?? "", x.dias, tipo(x.tipo), (x.mesa ? 1 : 0) | (x.comp ? 2 : 0) | (x.tr ? 4 : 0), x.e, x.i, x.ud, x.uh]);
      else r.push([x.id, x.a, x.st, x.nom, x.e]);
    }
    let pk = s.pk ?? "";
    const p: Paquete = {
      v: 1, delta, pk, s: ctx.sesion, f: ctx.fecha, e: ctx.evento, di: ctx.dayIndex, emitido: h.ahora, vence: h.vence, cursor: h.ahora,
      reglas: { entry: ctx.entry, reentrada: ctx.reentrada, edad: ctx.edad, pideId: ctx.pideId, cierre: h.cierre, span: ctx.kind === "span" },
      ev: { titulo: ctx.titulo, negocio: ctx.negocioNombre, puerta: ctx.puerta, dia: ctx.dia, h0: ctx.h0, puertas: ctx.puertas, tz: ctx.tz },
      fechas: h.fechas, tipos, b, r, sync: { seg: cfg.puerta_sync_seg, avisoMin: cfg.puerta_offline_aviso_min, lote: cfg.puerta_sync_lote },
    };
    if (!delta) {
      // El registro del paquete (sin el contenido). La base vuelve a exigir la sesión abierta con acceso; la sesión apunta al último.
      const sha = createHash("sha256").update(JSON.stringify({ ...p, pk: "" })).digest("hex");
      pk = (await c.query<{ id: string }>(`insert into door_packages (session_id, rows_n, bytes_n, sha256, expires_at, event_date_id, event_id, business_id, city_id, user_id)
        select $1::bigint, $2, 0, $3, now(), s.event_date_id, s.event_id, s.business_id, s.city_id, s.user_id from door_sessions s where s.id = $1::bigint returning id::text`, [ctx.sesion, b.length + r.length, sha])).rows[0]!.id;
      await c.query(`update door_sessions set package_id = $2::bigint where id = $1::bigint`, [ctx.sesion, pk]);
      p.pk = pk;
    }
    const llave = llaveSesion(ctx.sesion, ctx.userId, s.device), sel = await sellar(p, llave, gz);
    return { ok: true as const, pk, iv: sel.iv, c: sel.c, n: b.length + r.length, delta, gz, vence: h.vence, emitido: h.ahora, ...(conLlave ? { llave: llave.toString("base64") } : {}) };
  });
}

/* ── Barrido: los paquetes que vencieron quedan revocados (el teléfono los borra al ver la hora o en la próxima señal) ── */
export async function vencerPaquetes(): Promise<number> {
  return (await db().query(`update door_packages set revoked_at = now(), revoked_reason = 'vencido' where revoked_at is null and expires_at < now()`)).rowCount ?? 0;
}

/* ¿Sigue vivo el paquete de esta sesión? (para la pantalla: «lista de las 10:42»). */
export async function paqueteDe(sesion: string): Promise<{ pk: string; built: string; n: number } | null> {
  if (!ID.test(String(sesion ?? ""))) return null;
  return (await db().query<{ pk: string; built: string; n: number }>(
    `select id::text as pk, to_char(built_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as built, rows_n as n from door_packages where session_id = $1::bigint and revoked_at is null order by id desc limit 1`, [sesion])).rows[0] ?? null;
}
