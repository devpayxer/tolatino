import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { PoolClient } from "pg";
import { boletoParaPase } from "../boletos";
import { cifrar, descifrar, llaveDerivada } from "../cifrado";
import { valores } from "../config";
import { BASE_URL } from "../correo";
import { db, tx } from "../db";
import { armarPkpass, isoEnZona, type Bi, type ContenidoPase } from "./apple";
import { avisarPase } from "./apns-pase";
import { credenciales, encendidos, imagenes, URL_APNS_PASE, URL_GOOGLE, URL_GOOGLE_OAUTH } from "./credenciales";
import { enlaceGuardar, idClase, idObjeto, sincronizar } from "./google";
import { dentroDelTope } from "../topes";

/* 8g · El boleto en Apple Wallet y Google Wallet (fase8-apps.md §4 8g). El servidor decide todo; la pantalla solo muestra el botón.
   - EMITIR: solo quien tiene el boleto, con el boleto vivo (válido, o usado que todavía entra otro día), sin transferencia pendiente y sin
     haber pasado; un pase por boleto y plataforma (el mismo número de serie si se vuelve a pedir). La base lo vuelve a revisar al insertar.
   - CONTENIDO: lo arma contenidoPase() con boletoParaPase() de lib/boletos.ts = la MISMA vista que la pantalla del boleto (el mismo QR firmado,
     el mismo estado; guardián paseMismoQr). Sin el nombre de la persona ni nada que la pantalla no muestre; evento de Fe, Salud o Niños: texto
     genérico (sin nombre del evento, lugar ni organizador).
   - CAMBIOS: los triggers de 0129 tocan el pase en la MISMA transacción que cambia el boleto, la fecha o el evento (pase_tocar: sube la versión
     o lo anula; guardián paseSigueAlBoleto). Quien cambió algo llama pasesPronto() (lo manda ya); el trabajador manda a cada teléfono
     registrado el aviso de Apple (APNs con el certificado del pase, cuerpo «{}») y pone al día el objeto de Google. Reintentos con espera
     creciente (pase_reintentos); el barrido de cada minuto y el trabajador de push (cada 5 s) lo vuelven a intentar.
   - SERVICIO WEB DE APPLE (app/api/pases/v1/…): cada pedido de un pase se autoriza SOLO con el token de ESE pase («ApplePass <token>»),
     comparado por su huella en tiempo constante; un token ajeno o un pase que no existe → 401, igual (guardián tokenDePase). El token no se
     guarda: es un HMAC de la llave del entorno sobre la serie y su generación, y en la base solo queda su sha256. */

export type Res<T = object> = ({ ok: true } & T) | { ok: false; msg: Bi };
const no = (es: string, en: string): { ok: false; msg: Bi } => ({ ok: false, msg: { es, en } });
const CODIGO = /^TL-[A-HJ-NP-Z2-9]{3}-[2-9]{4}$/, SERIE = /^[A-Z2-7]{26}$/, TIPO = /^pass\.[A-Za-z0-9.-]{3,120}$/, DISPOSITIVO = /^[A-Za-z0-9-]{8,128}$/;
const sha = (x: string) => createHash("sha256").update(x).digest("hex");

/* Una serie al azar: 128 bits en base32 (26 letras A-Z y 2-7). No dice nada del boleto. */
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function serieNueva(): string {
  const b = randomBytes(17);
  let bitsAcum = 0, v = 0, out = "";
  for (const x of b) { v = (v << 8) | x; bitsAcum += 8; while (bitsAcum >= 5 && out.length < 26) { out += B32[(v >>> (bitsAcum - 5)) & 31]; bitsAcum -= 5; } }
  return out.slice(0, 26);
}
/* El token del servicio web: HMAC de la llave del entorno (propósito «pase-token») sobre la serie y su generación. Solo su huella va a la base. */
export const tokenPase = (serie: string, gen: number) => createHmac("sha256", llaveDerivada("pase-token", serie)).update(`gen:${gen}`).digest("base64url");
export const huellaToken = (t: string) => sha(`pase:${t}`);

/* ── El contenido de un pase (lo que se ve en Wallet) ── */
type FilaPase = { id: string; tid: string; serial: string; platform: "apple" | "google"; version: number; voided: boolean; why: string | null; token_gen: number; pass_type_id: string | null; city: string; issued_to: string; updated: string };
const ESTADO: Record<string, Bi> = {
  envio: { es: "Se está transfiriendo: este código no entra", en: "Being transferred: this code does not get in" },
  used: { es: "Usado", en: "Used" }, void: { es: "Anulado", en: "Voided" }, refunded: { es: "Devuelto", en: "Refunded" },
  replaced: { es: "Transferido a otra persona", en: "Transferred to someone else" }, dueno: { es: "Ya no está a tu nombre", en: "No longer in your name" },
  fecha: { es: "Fecha cancelada", en: "Date cancelled" }, evento: { es: "Evento cancelado", en: "Event cancelled" }, pasado: { es: "Ya pasó", en: "Past" },
};
export async function contenidoPase(p: Pick<FilaPase, "tid" | "serial" | "version" | "voided" | "why">): Promise<{ c: ContenidoPase; fid: string } | null> {
  const B = await boletoParaPase(p.tid);
  if (!B) return null;
  const x = (await db().query<{ tz: string; ini: string; fin: string; generico: boolean }>(
    `select ci.timezone as tz, to_char(min(z.starts_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as ini, to_char(max(z.ends_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as fin,
            bool_or(pase_generico(t.event_id)) as generico
       from tickets t join cities ci on ci.id = t.city_id
       join event_dates z on z.id = any(bol_fechas_validas(t.id)) or z.id = t.event_date_id
      where t.id = $1::bigint group by ci.timezone`, [p.tid])).rows[0];
  if (!x) return null;
  const { es, en } = B, ev = B.evento.es;
  // EL QR es el de la pantalla del boleto, tal cual (vistaBoleto). Anulado: ninguno.
  if (es.qr !== en.qr) throw new Error("pase: el QR de la vista no coincide entre idiomas");
  const qr = p.voided ? null : es.qr;
  const est = p.voided ? ESTADO[p.why === "boleto" ? es.estado : p.why ?? "void"] ?? ESTADO.void! : es.envio ? ESTADO.envio! : ev.pasado ? ESTADO.pasado! : es.estado === "used" && !es.sigue ? ESTADO.used! : null;
  const tipo = (v: typeof es, ing: boolean) => (v.mesa ? `${v.tipo} · ${v.admits} ${ing ? "entries" : "entradas"}` : v.tipo);
  return {
    fid: B.fid,
    c: {
      serie: p.serial, version: p.version, codigo: es.code, qr, anulado: p.voided, estado: est, generico: x.generico,
      titulo: { es: ev.title, en: B.evento.en.title }, lugar: ev.venue || null, direccion: ev.addr, organiza: ev.org || null,
      inicio: isoEnZona(x.ini, x.tz), fin: isoEnZona(x.fin, x.tz), tipo: { es: tipo(es, false), en: tipo(en, true) }, entran: es.admits,
      vale: es.vale ? { es: es.vale, en: en.vale } : null, enlace: `${BASE_URL()}/cuenta/boletos/${es.code}`,
    },
  };
}

/* ── Qué botones ve la persona en su boleto ── */
export type Disponible = { apple: boolean; google: boolean };
export async function disponible(userId: string, code: string): Promise<Disponible> {
  if (!CODIGO.test(code)) return { apple: false, google: false };
  const [on, cr, ok] = await Promise.all([encendidos(), (await import("./credenciales")).listos(), vivoParaPase(db(), userId, code)]);
  return { apple: !!ok && on.apple && cr.apple, google: !!ok && on.google && cr.google };
}
/* El boleto, si se le puede dar un pase a esta persona ahora (la base lo vuelve a revisar al insertar el pase). */
async function vivoParaPase(c: Pick<PoolClient, "query">, userId: string, code: string): Promise<{ id: string; city: string; fid: string; generico: boolean } | null> {
  return (await c.query<{ id: string; city: string; fid: string; generico: boolean }>(
    `select t.id::text, t.city_id as city, t.event_date_id::text as fid,
            pase_generico(t.event_id) as generico
       from tickets t join event_dates d on d.id = t.event_date_id join events e on e.id = t.event_id
      where t.code = $1 and t.holder_user_id = $2 and d.status = 'scheduled' and e.status not in ('cancelled', 'rejected') and d.ends_at > now()
        and (bol_vigente(t.id) or (t.status = 'used' and exists (select 1 from event_dates z where z.id = any(bol_fechas_validas(t.id)) and z.ends_at > now()
              and not exists (select 1 from ticket_entries x where x.ticket_id = t.id and x.event_date_id = z.id and x.entered_n >= t.admits))))`, [code, userId])).rows[0] ?? null;
}

/* Un pase de esta persona para este boleto y plataforma (el que ya tenía, o uno nuevo). */
async function obtenerPase(userId: string, code: string, plat: "apple" | "google", ids: { tipo?: string; emisor?: string }): Promise<Res<{ p: FilaPase; nuevo: boolean }>> {
  return tx(async (c) => {
    const b = await vivoParaPase(c, userId, code);
    if (!b) return no("Este boleto no se puede guardar en Wallet ahora (ya no vale, se está transfiriendo o ya pasó).", "This ticket cannot be saved to Wallet right now (no longer valid, being transferred or past).");
    await c.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [`pase:${b.id}:${plat}`]);
    const SEL = `select id::text, ticket_id::text as tid, serial, platform, version, voided_at is not null as voided, void_reason as why, token_gen, pass_type_id, city_id as city, issued_to::text, to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as updated from ticket_passes`;
    const ya = (await c.query<FilaPase>(`${SEL} where ticket_id = $1::bigint and platform = $2`, [b.id, plat])).rows[0];
    if (ya && !ya.voided && ya.issued_to === userId && (plat !== "apple" || ya.pass_type_id === ids.tipo)) {
      await c.query(`insert into pass_log (pass_id, city_id, action) values ($1::bigint, $2, 'descargado')`, [ya.id, ya.city]);
      return { ok: true, p: ya, nuevo: false };
    }
    if (ya) return no("Este boleto ya tuvo un pase que se anuló. Vuelve a abrir el boleto.", "This ticket had a pass that was voided. Open the ticket again.");
    const serie = serieNueva();
    const p = (await c.query<FilaPase>(
      `insert into ticket_passes (ticket_id, city_id, platform, serial, auth_token_hash, pass_type_id, google_class_id, google_object_id, issued_to)
       values ($1::bigint, $2, $3, $4, $5, $6, $7, $8, $9) returning id::text, ticket_id::text as tid, serial, platform, version, false as voided, null::text as why, token_gen, pass_type_id, city_id as city, issued_to::text,
         to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as updated`,
      [b.id, b.city, plat, serie, plat === "apple" ? huellaToken(tokenPase(serie, 1)) : null, plat === "apple" ? ids.tipo : null,
        plat === "google" ? idClase(ids.emisor!, b.fid, b.generico) : null, plat === "google" ? idObjeto(ids.emisor!, serie) : null, userId])).rows[0]!;
    await c.query(`insert into pass_log (pass_id, city_id, action, detail) values ($1::bigint, $2, 'emitido', $3)`, [p.id, p.city, plat]);
    return { ok: true, p, nuevo: true };
  });
}

/* Apple: el .pkpass del boleto para esta persona (para «Agregar a Apple Wallet»). */
export async function pkpassDe(userId: string, code: string): Promise<Res<{ archivo: Buffer; nombre: string }>> {
  if (!CODIGO.test(String(code))) return no("Ese boleto no existe.", "That ticket does not exist.");
  const [on, cr] = await Promise.all([encendidos(), credenciales()]);
  if (!on.apple || !cr.apple) return no("Apple Wallet no está disponible por ahora.", "Apple Wallet is not available right now.");
  const r = await obtenerPase(userId, code, "apple", { tipo: cr.apple.tipo });
  if (!r.ok) return r;
  const archivo = await armar(r.p);
  if (!archivo) return no("No se pudo armar el pase. Prueba de nuevo.", "The pass could not be built. Try again.");
  return { ok: true, archivo, nombre: `${code}.pkpass` };
}
/* Dentro de la app: un enlace al .pkpass firmado para esta persona y este boleto, que vale 10 minutos (la vista de Safari no tiene la sesión).
   Lo que abre es lo mismo que la pantalla ya le muestra (su QR), así que filtrarlo vale lo que una captura; nunca se manda por mensaje. */
const firmaEnlace = (u: string, code: string, e: number) => createHmac("sha256", llaveDerivada("pase-enlace", u)).update(`${code}|${e}`).digest("base64url");
export async function enlaceAppleFirmado(userId: string, code: string): Promise<Res<{ url: string }>> {
  if (!CODIGO.test(code)) return no("Ese boleto no existe.", "That ticket does not exist.");
  const d = await disponible(userId, code);
  if (!d.apple) return no("Apple Wallet no está disponible para este boleto ahora.", "Apple Wallet is not available for this ticket right now.");
  const e = Math.floor(Date.now() / 1000) + 600;
  return { ok: true, url: `${BASE_URL()}/api/pases/apple/${code}?u=${userId}&e=${e}&f=${firmaEnlace(userId, code, e)}` };
}
export function verificarEnlace(code: string, q: URLSearchParams): string | null {
  const u = q.get("u") ?? "", e = Number(q.get("e")), f = q.get("f") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(u) || !Number.isInteger(e) || e < Date.now() / 1000 || e > Date.now() / 1000 + 900 || !/^[A-Za-z0-9_-]{43}$/.test(f)) return null;
  const a = Buffer.from(firmaEnlace(u, code, e)), b = Buffer.from(f);
  return a.length === b.length && timingSafeEqual(a, b) ? u : null;
}
async function armar(p: FilaPase): Promise<Buffer | null> {
  const cr = (await credenciales()).apple;
  if (!cr || p.pass_type_id !== cr.tipo) return null;
  const k = await contenidoPase(p);
  if (!k) return null;
  return armarPkpass(k.c, cr, await imagenes(), `${BASE_URL()}/api/pases`, tokenPase(p.serial, p.token_gen));
}

/* Google: crea (o pone al día) la clase y el objeto y devuelve el enlace «Guardar en Google Wallet». */
export async function enlaceGoogle(userId: string, code: string): Promise<Res<{ url: string }>> {
  if (!CODIGO.test(String(code))) return no("Ese boleto no existe.", "That ticket does not exist.");
  const [on, cr] = await Promise.all([encendidos(), credenciales()]);
  if (!on.google || !cr.google) return no("Google Wallet no está disponible por ahora.", "Google Wallet is not available right now.");
  const r = await obtenerPase(userId, code, "google", { emisor: cr.google.emisor });
  if (!r.ok) return r;
  const s = await sincronizarGoogle(r.p.id);
  if (!s) return no("Google Wallet no respondió. Prueba de nuevo en un momento.", "Google Wallet did not answer. Try again in a moment.");
  return { ok: true, url: enlaceGuardar(cr.google, r.p.serial, new URL(BASE_URL()).origin) };
}

/* ── El servicio web de Apple (lo llama app/api/pases/v1/…) ── */
const SEL_P = `select p.id::text, p.ticket_id::text as tid, p.serial, p.platform, p.version, p.voided_at is not null as voided, p.void_reason as why, p.token_gen, p.pass_type_id, p.city_id as city, p.issued_to::text,
  to_char(p.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as updated, p.auth_token_hash as h from ticket_passes p`;
/* La autorización de UN pase: «ApplePass <token>» de ESE pase (por tipo y serie). Cualquier otra cosa → null (el servicio contesta 401). */
export async function autorizarPase(tipo: string, serie: string, cabecera: string | null): Promise<FilaPase | null> {
  const t = /^ApplePass ([A-Za-z0-9_-]{16,128})$/.exec(cabecera ?? "")?.[1];
  if (!t || !TIPO.test(tipo) || !SERIE.test(serie)) return null;
  const p = (await db().query<FilaPase & { h: string }>(`${SEL_P} where p.serial = $1 and p.pass_type_id = $2 and p.platform = 'apple'`, [serie, tipo])).rows[0];
  if (!p) return null;
  const a = Buffer.from(huellaToken(t), "hex"), b = Buffer.from(p.h, "hex");
  return a.length === b.length && timingSafeEqual(a, b) ? p : null;
}

/* POST …/devices/{d}/registrations/{tipo}/{serie}: 201 nuevo, 200 ya estaba, 401 sin el token del pase, 400 cuerpo malo, 429 demasiados. */
export async function registrar(p: FilaPase, dispositivo: string, cuerpo: unknown): Promise<200 | 201 | 400 | 429> {
  const token = String((cuerpo as { pushToken?: unknown } | null)?.pushToken ?? "");
  if (!DISPOSITIVO.test(dispositivo) || !/^[0-9a-fA-F]{64,200}$/.test(token)) return 400;
  try {
    return await tx(async (c) => {
      const h = sha(`pase-push:${token.toLowerCase()}`);
      await c.query(`insert into pass_devices (device_library_id, push_token_enc, push_token_hash) values ($1, $2, $3)
                     on conflict (device_library_id) do update set push_token_enc = case when pass_devices.push_token_hash = excluded.push_token_hash then pass_devices.push_token_enc else excluded.push_token_enc end,
                       push_token_hash = excluded.push_token_hash, last_seen_at = now(), invalid_at = null, invalid_reason = null`, [dispositivo, cifrar(token.toLowerCase()), h]);
      const ya = (await c.query(`select 1 from pass_registrations where device_library_id = $1 and pass_id = $2::bigint and removed_at is null`, [dispositivo, p.id])).rowCount;
      if (ya) return 200 as const;
      await c.query(`insert into pass_registrations (device_library_id, pass_id, city_id, pushed_version) values ($1, $2::bigint, $3, 0)`, [dispositivo, p.id, p.city]);
      // Lo que el teléfono acaba de bajar ya es la versión de ahora: no hace falta avisarle.
      await c.query(`update pass_registrations set pushed_version = $3 where device_library_id = $1 and pass_id = $2::bigint and removed_at is null`, [dispositivo, p.id, p.version]);
      await c.query(`insert into pass_log (pass_id, city_id, action) values ($1::bigint, $2, 'registrado')`, [p.id, p.city]);
      return 201 as const;
    });
  } catch (e) { if ((e as { code?: string }).code === "P0429") return 429; throw e; }
}
/* DELETE …: la baja de ese teléfono para ese pase (estado; la fila queda). */
export async function darDeBaja(p: FilaPase, dispositivo: string): Promise<200 | 400> {
  if (!DISPOSITIVO.test(dispositivo)) return 400;
  const u = await db().query(`update pass_registrations set removed_at = now(), removed_reason = 'telefono' where device_library_id = $1 and pass_id = $2::bigint and removed_at is null`, [dispositivo, p.id]);
  if (u.rowCount) await db().query(`insert into pass_log (pass_id, city_id, action) values ($1::bigint, $2, 'baja')`, [p.id, p.city]);
  return 200;
}
/* GET …/devices/{d}/registrations/{tipo}?passesUpdatedSince=: las series que ESE teléfono sigue y cambiaron (Apple no manda token aquí; solo
   salen series de pases registrados por ese mismo identificador de teléfono). La marca es el instante del último cambio en microsegundos. */
export async function seriesCambiadas(dispositivo: string, tipo: string, desde: string | null): Promise<{ serialNumbers: string[]; lastUpdated: string } | null> {
  if (!DISPOSITIVO.test(dispositivo) || !TIPO.test(tipo)) return null;
  const marca = desde && /^\d{1,20}$/.test(desde) ? desde : "0";
  const r = (await db().query<{ serial: string; us: string }>(
    `select p.serial, (extract(epoch from p.updated_at) * 1000000)::bigint::text as us from pass_registrations r join ticket_passes p on p.id = r.pass_id
      where r.device_library_id = $1 and r.removed_at is null and p.pass_type_id = $2 and p.platform = 'apple' and p.updated_at > to_timestamp($3::numeric / 1000000)
      order by p.updated_at limit 500`, [dispositivo, tipo, marca])).rows;
  if (!r.length) return null;
  await db().query(`update pass_devices set last_seen_at = now() where device_library_id = $1`, [dispositivo]);
  return { serialNumbers: r.map((x) => x.serial), lastUpdated: r.reduce((m, x) => (BigInt(x.us) > BigInt(m) ? x.us : m), "0") };
}
/* GET …/passes/{tipo}/{serie}: el pase al día (firmado otra vez). 304 si no cambió desde If-Modified-Since. */
export async function paseAlDia(p: FilaPase, siModificado: string | null): Promise<{ status: 200; archivo: Buffer; modificado: string } | { status: 304 | 503; modificado?: string }> {
  const modificado = new Date(p.updated).toUTCString();
  if (siModificado && !Number.isNaN(Date.parse(siModificado)) && Math.floor(Date.parse(p.updated) / 1000) <= Math.floor(Date.parse(siModificado) / 1000)) return { status: 304, modificado };
  const archivo = await armar(p);
  if (!archivo) return { status: 503 };
  await db().query(`insert into pass_log (pass_id, city_id, action, detail) values ($1::bigint, $2, 'enviado', $3)`, [p.id, p.city, `versión ${p.version}`]);
  return { status: 200, archivo, modificado };
}

/* Límite por dirección (pase_ws_por_minuto) del servicio web: por minuto, compartido entre los procesos (lib/topes.ts, 9b-3). */
export async function permitido(ip: string | null): Promise<boolean> {
  const lim = (await valores("pase_ws_por_minuto")).pase_ws_por_minuto;
  return dentroDelTope("pase_ws", ip || "?", lim);
}

/* ── El trabajador: avisos a los teléfonos (Apple) y objetos de Google al día ── */
let corriendo = false, otra = false;
/* Lo llama quien acaba de cambiar un boleto, una fecha o un evento (después de su transacción): manda ya, sin esperar al barrido. */
export function pasesPronto() {
  if (corriendo) { otra = true; return; }
  corriendo = true;
  setTimeout(() => {
    void (async () => {
      try { do { otra = false; await enviarPendientes(); } while (otra); }
      catch { /* el barrido lo vuelve a intentar */ }
      finally { corriendo = false; }
    })();
  }, 0);
}

export async function enviarPendientes(): Promise<{ avisos: number; google: number; fallos: number }> {
  const lim = await valores("pase_reintentos");
  let avisos = 0, google = 0, fallos = 0;
  // Apple: un aviso por teléfono (el teléfono pide después todas las series que cambiaron).
  const R = (await db().query<{ id: string; dev: string; pid: string; v: number; tipo: string; city: string; enc: Buffer; tries: number }>(
    `update pass_registrations r set push_not_before = now() + interval '60 seconds'
       from ticket_passes p, pass_devices d
      where r.id in (select r2.id from pass_registrations r2 join ticket_passes p2 on p2.id = r2.pass_id join pass_devices d2 on d2.device_library_id = r2.device_library_id
                      where r2.removed_at is null and d2.invalid_at is null and r2.pushed_version < p2.version and (r2.push_not_before is null or r2.push_not_before <= now())
                      order by r2.id limit 300 for update of r2 skip locked)
        and p.id = r.pass_id and d.device_library_id = r.device_library_id
      returning r.id::text, r.device_library_id as dev, r.pass_id::text as pid, p.version as v, p.pass_type_id as tipo, p.city_id as city, d.push_token_enc as enc, r.push_tries as tries`)).rows;
  if (R.length) {
    const cr = (await credenciales()).apple;
    const porTel = new Map<string, typeof R>();
    for (const x of R) porTel.set(`${x.dev}|${x.tipo}`, [...(porTel.get(`${x.dev}|${x.tipo}`) ?? []), x]);
    for (const grupo of porTel.values()) {
      const x0 = grupo[0]!, ids = grupo.map((x) => x.id);
      if (!cr || cr.tipo !== x0.tipo) {
        await db().query(`update pass_registrations set last_push_result = 'sin_cert', push_not_before = now() + interval '10 minutes' where id = any($1::bigint[])`, [ids]);
        continue;
      }
      const token = descifrar(x0.enc);
      const r = token ? await avisarPase(URL_APNS_PASE(), { tipo: cr.tipo, llavePem: cr.llavePem, certPem: cr.certPem }, token)
        : { result: "invalido" as const, code: "sin_token" };
      if (r.result === "enviado") {
        avisos++;
        for (const x of grupo) {
          await db().query(`update pass_registrations set pushed_version = greatest(pushed_version, $2), push_tries = 0, push_not_before = null, last_push_at = now(), last_push_result = 'enviado' where id = $1::bigint`, [x.id, x.v]);
          await db().query(`insert into pass_log (pass_id, city_id, action, detail) values ($1::bigint, $2, 'aviso', $3)`, [x.pid, x.city, `versión ${x.v}`]);
        }
      } else if (r.result === "invalido") {
        // El teléfono ya no recibe: se marca y sus registros se dan de baja (estado).
        await db().query(`update pass_devices set invalid_at = now(), invalid_reason = 'apns' where device_library_id = $1 and invalid_at is null`, [x0.dev]);
        const B = (await db().query<{ pid: string; city: string }>(`update pass_registrations set removed_at = now(), removed_reason = 'token_invalido', last_push_at = now(), last_push_result = 'invalido'
                                                                    where device_library_id = $1 and removed_at is null returning pass_id::text as pid, city_id as city`, [x0.dev])).rows;
        for (const b of B) await db().query(`insert into pass_log (pass_id, city_id, action, detail) values ($1::bigint, $2, 'baja', 'APNs: el teléfono ya no recibe')`, [b.pid, b.city]);
        fallos++;
      } else {
        fallos++;
        for (const x of grupo) {
          const fin = x.tries + 1 >= lim.pase_reintentos;
          await db().query(`update pass_registrations set push_tries = push_tries + 1, last_push_at = now(), last_push_result = $3,
                              push_not_before = now() + make_interval(mins => least(60, power(2, push_tries)::int)), pushed_version = case when $4 then greatest(pushed_version, $2) else pushed_version end
                            where id = $1::bigint`, [x.id, x.v, r.result, fin]);
          if (fin) await db().query(`insert into pass_log (pass_id, city_id, action, detail) values ($1::bigint, $2, 'aviso_fallo', $3)`, [x.pid, x.city, `${r.result} ${r.code ?? ""}`.trim().slice(0, 120)]);
        }
      }
    }
  }
  // Google: cada objeto que quedó atrás de su versión.
  const G = (await db().query<{ id: string }>(
    `update ticket_passes set google_not_before = now() + interval '60 seconds'
      where id in (select id from ticket_passes where platform = 'google' and google_synced_version < version and (google_not_before is null or google_not_before <= now())
                    order by id limit 100 for update skip locked) returning id::text`)).rows;
  for (const g of G) { if (await sincronizarGoogle(g.id)) google++; else fallos++; }
  return { avisos, google, fallos };
}

/* Poner al día el objeto de Google de un pase (y su clase). Fuera de toda transacción (red). true = quedó al día. */
async function sincronizarGoogle(id: string): Promise<boolean> {
  const p = (await db().query<FilaPase & { tries: number }>(`${SEL_P.replace(" from ticket_passes p", ", p.google_tries as tries from ticket_passes p")} where p.id = $1::bigint and p.platform = 'google'`, [id])).rows[0];
  if (!p) return false;
  const [cr, k, lim] = await Promise.all([credenciales(), contenidoPase(p), valores("pase_reintentos")]);
  const r = cr.google && k ? await sincronizar(URL_GOOGLE(), URL_GOOGLE_OAUTH(), cr.google, k.fid, k.c) : { ok: false, status: 0, code: cr.google ? "contenido" : "sin_cuenta" };
  if (r.ok) {
    await db().query(`update ticket_passes set google_synced_version = greatest(google_synced_version, $2), google_tries = 0, google_not_before = null, google_error = null where id = $1::bigint`, [p.id, p.version]);
    await db().query(`insert into pass_log (pass_id, city_id, action, detail) values ($1::bigint, $2, 'google', $3)`, [p.id, p.city, `versión ${p.version}${p.voided ? " · INACTIVE" : ""}`]);
    return true;
  }
  const fin = p.tries + 1 >= lim.pase_reintentos;
  await db().query(`update ticket_passes set google_tries = google_tries + 1, google_error = $3, google_not_before = now() + make_interval(mins => least(60, power(2, google_tries)::int)),
                      google_synced_version = case when $4 then greatest(google_synced_version, $2) else google_synced_version end where id = $1::bigint`,
    [p.id, p.version, `${r.status || ""} ${r.code ?? ""}`.trim().slice(0, 120), fin]);
  if (fin) await db().query(`insert into pass_log (pass_id, city_id, action, detail) values ($1::bigint, $2, 'google_fallo', $3)`, [p.id, p.city, `${r.status || ""} ${r.code ?? ""}`.trim().slice(0, 120)]);
  return false;
}

/* Barrido (cada minuto): lo que quedó pendiente o con reintento, y el aviso del certificado que vence. */
export async function barrerPases(): Promise<{ avisos: number; google: number; fallos: number; cert: number }> {
  const r = await enviarPendientes();
  const cert = await (await import("./certificado")).avisarVencimiento().catch(() => 0);
  return { ...r, cert };
}
