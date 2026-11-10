import "server-only";
import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { db, tx } from "./db";
import { cfgSql } from "./config";
import { verificarFirma } from "./boletos-qr";
import { diaCorto } from "./evt-comun";
import { hora12, nombreCorto, RESULTADO, type Bi, type FilaPuerta, type Pregunta, type ResEscaneo, type Resultado, type Resumen, type VistaEscaneo } from "./puerta-comun";

/* 6g · To'Latino Puerta en línea (fase6-eventos.md §3 «La puerta» y «Porteros», §4 6g; apps-delivery-checkin.md §2 CHK-*; D1).
   - La puerta SOLO escanea: nada aquí cobra, crea órdenes, emite boletos ni lee montos, teléfonos o correos (guardianes
     sinVentaEnLaPuerta y porteroSoloSuEvento). Lo que ve el portero de una persona: nombre + inicial (o el nombre de la cortesía).
   - Toda acción pasa por accesoPuerta(persona, sesión) → puerta_acceso() de la base: la sesión abierta, el portero activo con ESE
     evento (o el miembro del negocio con «evt»), el negocio activo y la ventana del día. Quitar al portero corta en la próxima acción.
   - Cada lectura filtra por la fecha y el evento de la sesión: un portero del negocio A no ve nada del negocio B (un QR de otro evento
     sale «NO ES DE ESTE EVENTO» sin más datos).
   - La decisión de entrar la toma la base con la fila del boleto bloqueada (puerta_entrada / puerta_rsvp / puerta_contar /
     puerta_noche → puerta_registrar, la única que escribe en ticket_scans): dos porteros a la vez → uno entra y el otro «ya entró».
   - Cada escaneo trae su id (uuid del teléfono) y la hora del teléfono: repetirlo no cuenta dos veces (gancho del modo sin conexión, 6h). */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, ID = /^\d{1,18}$/;
const no = (es: string, en: string, cerrada?: boolean) => ({ ok: false as const, msg: { es, en } as Bi, ...(cerrada ? { cerrada: true } : {}) });
const bi = (x: Bi | null | undefined, es: boolean) => (x ? (es ? x.es : x.en || x.es) : "");
const sha = (t: string) => createHash("sha256").update(t).digest("hex");

export type CtxPuerta = {
  sesion: string; userId: string; fecha: string; evento: string; negocio: string; negocioNombre: string; city: string; tz: string; puerta: string; staff: string | null;
  titulo: Bi; dia: string; h0: number; puertas: string; entry: "free" | "rsvp" | "tickets"; kind: string; reentrada: boolean; edad: number; pideId: boolean; contar: boolean;
  noche: boolean; mesas: boolean; cierre: string | null; dayIndex: number;
};
/* ¿Sigue valiendo esta sesión para esta persona? La base decide (puerta_acceso); null = sin acceso (portero quitado, fuera de hora…). */
export async function accesoPuerta(userId: string, sesion: string): Promise<CtxPuerta | null> {
  if (!ID.test(String(sesion ?? "")) || !userId) return null;
  const r = (await db().query<CtxPuerta & { h0: number }>(
    `select s.id::text as sesion, s.user_id::text as "userId", s.event_date_id::text as fecha, s.event_id::text as evento, s.business_id as negocio, b.name as "negocioNombre",
            s.city_id as city, ci.timezone as tz, s.door_name as puerta, s.door_staff_id::text as staff, e.title as titulo, d.local_date::text as dia,
            (extract(hour from d.starts_at at time zone ci.timezone) * 60 + extract(minute from d.starts_at at time zone ci.timezone))::int as h0,
            to_char(d.doors_at at time zone ci.timezone, 'HH24:MI') as puertas, e.entry, e.kind, e.reentry as reentrada, e.min_age as edad, e.id_required as "pideId",
            e.door_count as contar, b.category_id = 'NEG-NOCHE' as noche, e.tables_cfg <> '[]'::jsonb as mesas, d.day_index as "dayIndex",
            case when e.door_close_after_min is not null then to_char((d.starts_at + make_interval(mins => e.door_close_after_min)) at time zone ci.timezone, 'HH24:MI') end as cierre
       from door_sessions s join event_dates d on d.id = s.event_date_id join events e on e.id = s.event_id join businesses b on b.id = s.business_id join cities ci on ci.id = s.city_id
      where s.id = $1::bigint and s.user_id = $2 and puerta_acceso(s.id, $2)`, [sesion, userId])).rows[0];
  return r ?? null;
}
/* 6h · ¿Ese id de escaneo ya es de otra puerta? (un id repetido de ESTA puerta es idempotencia; de otra, nunca se devuelve lo de allá). */
export async function idAjeno(id: string, sesion: string): Promise<boolean> {
  if (!UUID.test(String(id ?? "")) || !ID.test(String(sesion ?? ""))) return false;
  return !!(await db().query(`select 1 from ticket_scans where id = $1::uuid and session_id <> $2::bigint`, [id.toLowerCase(), sesion])).rowCount;
}
/* Un error de la base de la puerta → mensaje para la persona (sin detalles internos). */
function errPuerta(e: unknown) {
  const m = String((e as { message?: string })?.message ?? "");
  if (/puerta_cerrada|puerta_sin_acceso/.test(m)) return no("Ya no tienes acceso a esta puerta. Si es un error, habla con el negocio.", "You no longer have access to this door. If this is a mistake, talk to the business.", true);
  if (/puerta_no_cuenta/.test(m)) return no("Este evento entra con boleto o RSVP: escanea o búscalo.", "This event needs a ticket or RSVP: scan or search.");
  throw e;
}

/* ── CHK-ONB · Tus puertas: lo que puedes abrir hoy y lo que viene (como portero o como miembro del negocio con «evt») ── */
export type PuertaAsignada = { fecha: string; evento: string; titulo: Bi; negocio: string; dia: string; h0: number; puertas: string; abrible: boolean; hoy: boolean; staff: string | null; miembro: boolean };
export type SesionAbierta = { sesion: string; titulo: Bi; puerta: string; negocio: string };
export async function misPuertas(userId: string): Promise<{ puertas: PuertaAsignada[]; abiertas: SesionAbierta[]; equipos: { id: string; negocio: string }[] }> {
  const [P, A, E] = await Promise.all([
    db().query<PuertaAsignada & { h0: number }>(
      `with mias as (
         select e.id as eid, f.id as staff, false as miembro from door_staff f join events e on e.business_id = f.business_id
          where f.user_id = $1 and f.status = 'active' and (f.scope = 'all' or e.id = any(f.event_ids)) and e.status in ('live', 'paused')
         union all
         select e.id, null, true from business_members m join events e on e.business_id = m.business_id
          where m.user_id = $1 and m.status = 'active' and (m.kind = 'owner' or m.panel_access && array['all', 'evt']::text[]) and e.status in ('live', 'paused'))
       select distinct on (d.id) d.id::text as fecha, e.id::text as evento, e.title as titulo, b.name as negocio, d.local_date::text as dia,
              (extract(hour from d.starts_at at time zone ci.timezone) * 60 + extract(minute from d.starts_at at time zone ci.timezone))::int as h0,
              to_char(d.doors_at at time zone ci.timezone, 'HH24:MI') as puertas, puerta_puede(d.id, $1, x.staff) as abrible,
              d.local_date = (now() at time zone ci.timezone)::date as hoy, x.staff::text as staff, x.miembro
         from mias x join events e on e.id = x.eid join event_dates d on d.event_id = e.id join businesses b on b.id = e.business_id join cities ci on ci.id = d.city_id
        where b.status = 'active' and d.status in ('scheduled', 'done') and d.ends_at + make_interval(hours => cfg_int('puerta_ventana_h')) > now() and d.starts_at < now() + interval '7 days'
        order by d.id, x.miembro, d.starts_at limit 40`, [userId]),
    db().query<SesionAbierta>(
      `select s.id::text as sesion, e.title as titulo, s.door_name as puerta, b.name as negocio from door_sessions s join events e on e.id = s.event_id join businesses b on b.id = s.business_id
        where s.user_id = $1 and s.ended_at is null and puerta_acceso(s.id, $1) order by s.started_at desc limit 5`, [userId]),
    db().query<{ id: string; negocio: string }>(`select f.id::text, b.name as negocio from door_staff f join businesses b on b.id = f.business_id where f.user_id = $1 and f.status = 'active' order by f.accepted_at`, [userId]),
  ]);
  return { puertas: P.rows.sort((a, b) => (a.dia + String(a.h0).padStart(4, "0")).localeCompare(b.dia + String(b.h0).padStart(4, "0"))), abiertas: A.rows, equipos: E.rows };
}

/* Abrir la puerta de una fecha (nombre de la puerta). Una persona tiene una puerta abierta por fecha: cambiarla cierra la anterior. */
export async function abrirPuerta(userId: string, fecha: string, nombrePuerta: string, staff: string | null, device: string | null): Promise<{ ok: true; sesion: string } | { ok: false; msg: Bi }> {
  const p = String(nombrePuerta ?? "").replace(/\s+/g, " ").trim().slice(0, 30);
  if (!ID.test(String(fecha ?? "")) || (staff !== null && !ID.test(String(staff)))) return no("Esa puerta no existe.", "That door does not exist.");
  if (!p) return no("Ponle nombre a tu puerta (Principal, VIP…).", "Name your door (Main, VIP…).");
  try {
    return await tx(async (c) => {
      const ok = (await c.query<{ ok: boolean }>(`select puerta_puede($1::bigint, $2, $3::bigint) as ok`, [fecha, userId, staff])).rows[0]?.ok;
      if (!ok) return no("Esta puerta todavía no abre o ya cerró. El modo puerta se activa el día del evento.", "This door is not open yet or already closed. Door mode turns on the day of the event.");
      await c.query(`update door_sessions set ended_at = now(), ended_by = 'self' where user_id = $1 and event_date_id = $2::bigint and ended_at is null`, [userId, fecha]);
      const s = (await c.query<{ id: string }>(
        `insert into door_sessions (event_date_id, event_id, business_id, city_id, door_staff_id, member_user_id, user_id, door_name, device)
         select d.id, d.event_id, e.business_id, d.city_id, $3::bigint, case when $3::bigint is null then $2::uuid end, $2::uuid, $4, $5::uuid
           from event_dates d join events e on e.id = d.event_id where d.id = $1::bigint returning id::text`, [fecha, userId, staff, p, device && UUID.test(device) ? device : null])).rows[0]!;
      return { ok: true as const, sesion: s.id };
    });
  } catch (e) {
    if (/puerta_sin_acceso/.test(String((e as Error).message))) return no("No tienes acceso a esta puerta.", "You do not have access to this door.");
    throw e;
  }
}
export async function cerrarPuerta(ctx: CtxPuerta): Promise<{ ok: true }> {
  await db().query(`update door_sessions set ended_at = now(), ended_by = 'self' where id = $1::bigint and user_id = $2 and ended_at is null`, [ctx.sesion, ctx.userId]);
  return { ok: true };
}

/* ── La cabecera viva: adentro / faltan / rechazados / repetidos / aforo (la usan la puerta, el SSE, el panel y el admin) ── */
export async function resumenFecha(fecha: string): Promise<Resumen> {
  const r = (await db().query<{ adentro: number; entraron: number; llegaron: number; esperados: number; rechazados: number; repetidos: number; aforo: number; alerta: number }>(
    `select d.inside_n as adentro, d.entered_n as entraron,
            coalesce((select sum(x.entered_n) from ticket_entries x where x.event_date_id = d.id), 0)::int
              + coalesce((select sum(v.arrived_n) from rsvps v where v.event_date_id = d.id), 0)::int as llegaron,
            coalesce((select sum(t.admits) from tickets t where t.event_id = e.id and t.status in ('valid', 'used')
                         and (t.event_date_id = d.id or (e.kind = 'span' and d.day_index = any(t.valid_days)))), 0)::int
              + coalesce((select sum(v.party) from rsvps v where v.event_date_id = d.id and v.status in ('going', 'attended')), 0)::int as esperados,
            coalesce((select sum(c.rejected_n) from door_counts c where c.event_date_id = d.id), 0)::int as rechazados,
            coalesce((select sum(c.dup_n) from door_counts c where c.event_date_id = d.id), 0)::int as repetidos,
            puerta_aforo(d.id) as aforo, cfg_int('puerta_aforo_alerta_pct') as alerta
       from event_dates d join events e on e.id = d.event_id where d.id = $1::bigint`, [fecha])).rows[0];
  if (!r) return { adentro: 0, entraron: 0, esperados: 0, faltan: 0, rechazados: 0, repetidos: 0, aforo: 0, pct: 0, alerta: false, lleno: false, alertaPct: 90 };
  const pct = r.aforo > 0 ? Math.round((r.adentro * 100) / r.aforo) : 0;
  return { adentro: r.adentro, entraron: r.entraron, esperados: r.esperados, faltan: Math.max(0, r.esperados - r.llegaron), rechazados: r.rechazados, repetidos: r.repetidos, aforo: r.aforo,
    pct, alerta: r.aforo > 0 && pct >= r.alerta, lleno: r.aforo > 0 && r.adentro >= r.aforo, alertaPct: r.alerta };
}

/* ── Lo que la puerta muestra de un boleto (SOLO de este evento: nombre + inicial, tipo, mesa, entradas; nunca montos ni teléfono) ── */
type InfoB = { code: string; admits: number; comp: boolean; nombre: string; tipo: Bi | null; mesa: Bi | null; numero: number | null; entraron: number; adentro: number; ultima: string | null; puertaU: string | null;
  transferido: boolean; dias: string[] };
async function infoBoleto(q: PoolClient | ReturnType<typeof db>, ctx: CtxPuerta, tid: string): Promise<InfoB | null> {
  const r = (await q.query<InfoB & { hn: string | null; fn: string | null; ln: string | null; cn: string | null }>(
    `select t.code, t.admits, t.kind = 'comp' as comp, t.holder_name as hn, t.comp_name as cn, u.first_name as fn, u.last_name as ln, tt.name as tipo, et.zone as mesa,
            n.table_no as numero, coalesce(x.entered_n, 0) as entraron, coalesce(x.inside_n, 0) as adentro,
            to_char(x.last_at at time zone ci.timezone, 'HH24:MI') as ultima, x.last_door as "puertaU",
            exists (select 1 from ticket_transfers z where z.new_ticket_id = t.id and z.status = 'claimed') as transferido,
            (select coalesce(array_agg(z.local_date::text order by z.starts_at), '{}') from event_dates z where z.id = any(bol_fechas_validas(t.id))) as dias
       from tickets t join cities ci on ci.id = t.city_id left join users u on u.id = t.holder_user_id left join ticket_types tt on tt.id = t.ticket_type_id
       left join event_tables et on et.id = t.table_id
       left join ticket_entries x on x.ticket_id = t.id and x.event_date_id = $3::bigint
       left join door_table_numbers n on n.ticket_id = t.id and n.event_date_id = $3::bigint and n.released_at is null
      where t.id = $1::bigint and t.event_id = $2::bigint`, [tid, ctx.evento, ctx.fecha])).rows[0];
  if (!r) return null;
  return { ...r, nombre: r.comp ? String(r.cn ?? "—") : r.hn ? nombreCorto(r.hn) : nombreCorto(r.fn, r.ln) };
}
async function vista(ctx: CtxPuerta, sc: { id: string; result: Resultado; ticket_id: string | null; admits_n: number; direction: "in" | "out" }, es: boolean): Promise<VistaEscaneo> {
  const b = sc.ticket_id ? await infoBoleto(db(), ctx, sc.ticket_id) : null;
  const base = RESULTADO[sc.result];
  // Ámbar: entró, pero el boleto se recibió de otra persona (revisa que el QR sea el de su teléfono).
  const tono = sc.result === "valid" && b?.transferido ? "warn" : base.tono;
  return {
    id: sc.id, res: sc.result, tono, dir: sc.direction, k: sc.admits_n, de: b?.admits ?? 0, entraron: b?.entraron ?? 0,
    nombre: b?.nombre ?? null, tipo: b ? (b.comp ? (es ? "Cortesía" : "Comp") : bi(b.tipo ?? b.mesa, es)) : null, code: b?.code ?? null, cortesia: !!b?.comp, transferido: !!b?.transferido,
    mesa: b?.mesa ? { zona: bi(b.mesa, es), numero: b.numero } : null, edad: ctx.edad, pideId: ctx.pideId,
    ya: sc.result === "already_used" && b?.puertaU ? { puerta: b.puertaU, hora: hora12(b.ultima) } : null,
    vale: sc.result === "wrong_day" && b ? b.dias.map((d) => diaCorto(d, es)).join(" · ") : null, reentrada: ctx.reentrada,
  };
}
type FilaScan = { id: string; result: Resultado; ticket_id: string | null; admits_n: number; direction: "in" | "out" };
const SCAN = `id::text, result, ticket_id::text, admits_n, direction`;

/* ── CHK-SCAN · El QR: la firma Ed25519 se verifica con la llave PÚBLICA; la base decide con la fila del boleto bloqueada ── */
export type EntradaIn = { id: string; at: number | null; n: number | null; dir: "in" | "out"; previo: boolean };
function limpiarIn(x: { id?: unknown; at?: unknown; n?: unknown; dir?: unknown; previo?: unknown }): EntradaIn | null {
  const id = String(x.id ?? "");
  if (!UUID.test(id)) return null;
  const at = Number(x.at), n = x.n == null ? null : Math.floor(Number(x.n));
  return { id: id.toLowerCase(), at: Number.isFinite(at) && at > 1.6e12 && at < 4.1e12 ? at : null, n: n != null && n >= 1 && n <= 20 ? n : null, dir: x.dir === "out" ? "out" : "in", previo: x.previo === true };
}
export async function escanearQR(ctx: CtxPuerta, texto: string, raw: Record<string, unknown>, es: boolean): Promise<ResEscaneo> {
  const e = limpiarIn(raw);
  if (!e) return no("Escaneo sin identificador. Actualiza la app.", "Scan without an id. Update the app.");
  const t = String(texto ?? "").trim().slice(0, 400);
  const v = await verificarFirma(t);
  try {
    if (!v.ok) {
      // Un QR que no es un boleto (formato) = NO ENCONTRADO; con la forma de un boleto pero firma mala o llave de otro entorno = QR NO VÁLIDO.
      const sc = (await db().query<FilaScan>(`select ${SCAN} from puerta_entrada($1::uuid, $2::bigint, $3, null, null, $4, $5, null, null, to_timestamp($6::double precision / 1000), false, $7)`,
        [e.id, ctx.sesion, ctx.userId, sha(t), e.dir, e.at, v.motivo !== "formato"])).rows[0]!;
      return { ok: true, v: await vista(ctx, sc, es) };
    }
    if (e.previo && e.dir === "in") {
      const p = await pregunta(ctx, v.d.id, v.d.ver, e.id, es);
      if (p) return { ok: true, pregunta: p };
    }
    const sc = (await db().query<FilaScan>(`select ${SCAN} from puerta_entrada($1::uuid, $2::bigint, $3, $4::bigint, $5, $6, $7, $8, null, to_timestamp($9::double precision / 1000), false)`,
      [e.id, ctx.sesion, ctx.userId, v.d.id, v.d.ver, sha(t), e.dir, e.n, e.at])).rows[0]!;
    return { ok: true, v: await vista(ctx, sc, es) };
  } catch (x) { return errPuerta(x); }
}
/* Antes de marcar, un grupo (entran N de M) o un evento que pide ID se confirma con «Entró». Solo si el boleto entraría: si no, la base
   lo decide y lo registra de una vez (rechazos al instante). No escribe nada. */
async function pregunta(ctx: CtxPuerta, tid: string, ver: number | null, id: string, es: boolean): Promise<Pregunta | null> {
  const r = (await db().query<{ ok: boolean; quedan: number }>(
    `select t.event_id = $2::bigint and t.status in ('valid', 'used') and ($3::int is null or t.qr_ver = $3) and bol_vale_en(t.id, $4::bigint)
            and not exists (select 1 from ticket_transfers z where z.ticket_id = t.id and z.status = 'pending' and z.kind = 'transfer') as ok,
            t.admits - coalesce(x.entered_n, 0) as quedan
       from tickets t left join ticket_entries x on x.ticket_id = t.id and x.event_date_id = $4::bigint where t.id = $1::bigint`, [tid, ctx.evento, ver, ctx.fecha])).rows[0];
  if (!r?.ok || r.quedan < 1 || (r.quedan === 1 && !(ctx.pideId && ctx.edad > 0))) return null;
  const b = await infoBoleto(db(), ctx, tid);
  if (!b) return null;
  return { id, quedan: r.quedan, de: b.admits, entraron: b.entraron, nombre: b.nombre, tipo: b.comp ? (es ? "Cortesía" : "Comp") : bi(b.tipo ?? b.mesa, es), mesa: b.mesa ? bi(b.mesa, es) : null,
    edad: ctx.edad, pideId: ctx.pideId && ctx.edad > 0, cortesia: b.comp, transferido: b.transferido, reentrada: ctx.reentrada };
}

/* ── CHK-BUSCAR · Entrada manual (no trajo QR): el boleto que se encontró por nombre o código, con motivo ── */
export async function entradaManual(ctx: CtxPuerta, ticketId: string, motivo: string, raw: Record<string, unknown>, es: boolean): Promise<ResEscaneo> {
  const e = limpiarIn(raw), m = String(motivo ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  if (!e || !ID.test(String(ticketId ?? ""))) return no("Ese boleto no existe.", "That ticket does not exist.");
  if (m.length < 2) return no("Elige por qué entra sin escanear.", "Choose why they get in without scanning.");
  try {
    if (e.previo && e.dir === "in") { const p = await pregunta(ctx, ticketId, null, e.id, es); if (p) return { ok: true, pregunta: p }; }
    const sc = (await db().query<FilaScan>(`select ${SCAN} from puerta_entrada($1::uuid, $2::bigint, $3, $4::bigint, null, null, $5, $6, $7, to_timestamp($8::double precision / 1000), false)`,
      [e.id, ctx.sesion, ctx.userId, ticketId, e.dir, e.n, m, e.at])).rows[0]!;
    return { ok: true, v: await vista(ctx, sc, es) };
  } catch (x) { return errPuerta(x); }
}

/* ── CHK-LISTA · Un RSVP que llega (entran N de M; el lugar sigue contado) ── */
export async function marcarRsvp(ctx: CtxPuerta, rsvpId: string, raw: Record<string, unknown>): Promise<{ ok: true; res: Resultado; k: number; llegaron: number; de: number } | { ok: false; msg: Bi; cerrada?: boolean }> {
  const e = limpiarIn(raw);
  if (!e || !ID.test(String(rsvpId ?? ""))) return no("Ese RSVP no existe.", "That RSVP does not exist.");
  try {
    const sc = (await db().query<FilaScan & { rsvp_id: string | null }>(`select ${SCAN}, rsvp_id::text from puerta_rsvp($1::uuid, $2::bigint, $3, $4::bigint, $5, to_timestamp($6::double precision / 1000), false)`,
      [e.id, ctx.sesion, ctx.userId, rsvpId, e.n, e.at])).rows[0]!;
    const v = (await db().query<{ a: number; p: number }>(`select arrived_n as a, party as p from rsvps where id = $1::bigint and event_id = $2::bigint`, [rsvpId, ctx.evento])).rows[0];
    return { ok: true, res: sc.result, k: sc.admits_n, llegaron: v?.a ?? 0, de: v?.p ?? 0 };
  } catch (x) { return errPuerta(x); }
}

/* «Contar en la puerta» (entrada libre: +1 cada persona que entra; −1 si sale). */
export async function contar(ctx: CtxPuerta, raw: Record<string, unknown>): Promise<{ ok: true; res: Resultado; k: number } | { ok: false; msg: Bi; cerrada?: boolean }> {
  const e = limpiarIn(raw);
  if (!e) return no("Conteo sin identificador. Actualiza la app.", "Count without an id. Update the app.");
  try {
    const sc = (await db().query<FilaScan>(`select ${SCAN} from puerta_contar($1::uuid, $2::bigint, $3, $4, $5, to_timestamp($6::double precision / 1000), false)`, [e.id, ctx.sesion, ctx.userId, e.n ?? 1, e.dir, e.at])).rows[0]!;
    return { ok: true, res: sc.result, k: sc.admits_n };
  } catch (x) { return errPuerta(x); }
}

/* ── Lista de la noche (Noche · 4nc): la lee y la marca SOLO lib/noche-reservas.ts (único lector del código de la puerta) ── */
export async function listaNoche(ctx: CtxPuerta, q: string) {
  if (!ctx.noche) return [];
  return (await import("./noche-reservas")).listaEnLaPuerta(ctx.negocio, String(q ?? ""));
}
export async function llegadaNoche(ctx: CtxPuerta, numero: string, n: number, raw: Record<string, unknown>): Promise<{ ok: true; entraron: number; de: number } | { ok: false; msg: Bi; cerrada?: boolean }> {
  const e = limpiarIn(raw);
  if (!e || !ctx.noche) return no("Esa reserva no existe.", "That booking does not exist.");
  const { marcarLlegada } = await import("./noche-reservas");
  try {
    return await tx(async (c) => {
      // El mismo escaneo dos veces (o a la vez) no cuenta dos veces: el candado del id primero, después la reserva.
      const ya = !!(await c.query<{ id: string | null }>(`select (puerta_repetido($1::uuid)).id::text as id`, [e.id])).rows[0]!.id;
      const r = await marcarLlegada(c, ctx.negocio, String(numero ?? ""), ya ? 0 : Math.max(1, Math.min(20, Math.floor(Number(n) || 1))), ctx.userId);
      if (!r.ok) return r;
      if (ya) return { ok: true as const, entraron: r.entraron, de: r.de };
      const sc = (await c.query<{ res: string }>(`select result as res from puerta_noche($1::uuid, $2::bigint, $3, $4::bigint, $5, to_timestamp($6::double precision / 1000), false)`, [e.id, ctx.sesion, ctx.userId, r.op, r.k, e.at])).rows[0]!;
      if (sc.res === "already_used") return no(`Ya entraron los ${r.de}.`, `All ${r.de} are already in.`);
      if (sc.res !== "valid") throw Object.assign(new Error("puerta_noche"), { res: sc.res });
      return { ok: true as const, entraron: r.entraron, de: r.de };
    });
  } catch (x) {
    if ((x as { res?: string }).res === "over_capacity") return no("Esta puerta está llena. Deja entrar cuando salgan.", "This door is full. Let them in as others leave.");
    return errPuerta(x);
  }
}

/* ── CHK-BUSCAR · por nombre, código (completo o los últimos 4), orden B- o los últimos 4 del teléfono. Con límite por minuto. ── */
export async function buscar(ctx: CtxPuerta, qRaw: string, es: boolean): Promise<{ ok: true; filas: FilaPuerta[] } | { ok: false; msg: Bi; cerrada?: boolean }> {
  const q = String(qRaw ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  if (q.length < 2) return { ok: true, filas: [] };
  // El tope de Configuración se lee en la base al decidir (sin caché).
  const lim = (await db().query<{ n: number; max: number }>(`select count(*)::int as n, ${cfgSql("puerta_buscar_min")} as max from door_searches where user_id = $1 and at > now() - interval '1 minute'`, [ctx.userId])).rows[0]!;
  if (lim.n >= lim.max) return no("Muchas búsquedas seguidas. Espera un minuto.", "Too many searches in a row. Wait a minute.");
  await db().query(`insert into door_searches (session_id, user_id) values ($1::bigint, $2)`, [ctx.sesion, ctx.userId]);
  const Q = q.toUpperCase().replace(/\s/g, "");
  const cod = /^TL-?[A-Z0-9]{3}-?\d{4}$/.test(Q) ? `TL-${Q.replace(/^TL-?/, "").replace(/-/g, "").slice(0, 3)}-${Q.slice(-4)}` : null;
  const cuatro = /^\d{4}$/.test(Q) ? Q : null, orden = /^B-?\d{3,10}$/.test(Q) ? `B-${Q.replace(/^B-?/, "")}` : null;
  const nom = !cod && !cuatro && !orden ? q.toLowerCase() : null;
  return { ok: true, filas: await filas(ctx, { cod, cuatro, orden, nom, limite: 20 }, es) };
}

/* Boletos y RSVP de ESTA fecha de ESTE evento (lista y búsqueda). Un pase de varios días vale el día de la sesión. */
type FiltroF = { cod?: string | null; cuatro?: string | null; orden?: string | null; nom?: string | null; filtro?: string; antes?: string | null; limite: number };
async function filas(ctx: CtxPuerta, f: FiltroF, es: boolean): Promise<FilaPuerta[]> {
  const a: unknown[] = [ctx.evento, ctx.fecha, ctx.dayIndex];
  const p = (v: unknown) => { a.push(v); return `$${a.length}`; };
  const wT: string[] = [], wR: string[] = [];
  if (f.cod) { wT.push(`t.code = ${p(f.cod)}`); wR.push("false"); }
  if (f.cuatro) { const x = p(f.cuatro); wT.push(`(right(t.code, 4) = ${x} or right(u.phone, 4) = ${x})`); wR.push(`right(u.phone, 4) = ${x}`); }
  if (f.orden) { wT.push(`o.number = ${p(f.orden)}`); wR.push("false"); }
  if (f.nom) {
    const x = p(`%${f.nom.replace(/[%_\\]/g, "")}%`);
    wT.push(`unaccent(lower(coalesce(t.comp_name, '') || ' ' || coalesce(t.holder_name, '') || ' ' || coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, ''))) like unaccent(${x})`);
    wR.push(`unaccent(lower(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, ''))) like unaccent(${x})`);
  }
  const k = f.filtro ?? "todos";
  if (k === "faltan") { wT.push(`coalesce(x.entered_n, 0) < t.admits and t.status in ('valid', 'used')`); wR.push(`v.arrived_n < v.party and v.status in ('going', 'expired')`); }
  if (k === "adentro") { wT.push(`coalesce(x.entered_n, 0) > 0`); wR.push(`v.arrived_n > 0`); }
  if (k === "mesa") { wT.push(`t.table_id is not null`); wR.push("false"); }
  if (k === "cortesias") { wT.push(`t.kind = 'comp'`); wR.push("false"); }
  if (k === "rsvp") wT.push("false");
  if (k === "boletos") wR.push("false");
  const cur = f.antes && /^[^|]{0,80}\|[tr]\|\d{1,18}$/.test(f.antes) ? f.antes.split("|") : null;
  const curW = cur ? `where (z.orden, z.kind, z.id::bigint) > (${p(cur[0])}, ${p(cur[1] === "t" ? "ticket" : "rsvp")}, ${p(cur[2])}::bigint)` : "";
  const r = (await db().query<FilaPuerta & { orden: string; fn: string | null; ln: string | null; hn: string | null; cn: string | null; tipoB: Bi | null; mesaB: Bi | null; otro: string | null }>(
    `select * from (
       select 'ticket' as kind, t.id::text as id, t.code, t.admits as de, coalesce(x.entered_n, 0) as entraron, coalesce(x.inside_n, 0) as adentro,
              case when exists (select 1 from ticket_transfers z where z.ticket_id = t.id and z.status = 'pending' and z.kind = 'transfer') then 'pending' else t.status end as estado,
              t.kind = 'comp' as cortesia, u.first_name as fn, u.last_name as ln, t.holder_name as hn, t.comp_name as cn, tt.name as "tipoB", et.zone as "mesaB",
              lower(coalesce(t.comp_name, t.holder_name, u.first_name, '')) as orden, null::text as otro
         from tickets t join operations o on o.id = t.operation_id left join users u on u.id = t.holder_user_id
         left join ticket_types tt on tt.id = t.ticket_type_id left join event_tables et on et.id = t.table_id
         left join ticket_entries x on x.ticket_id = t.id and x.event_date_id = $2::bigint
        where t.event_id = $1::bigint and t.status in ('valid', 'used', 'void', 'refunded')
          and (t.event_date_id = $2::bigint or ($3::int = any(t.valid_days) and exists (select 1 from events e where e.id = t.event_id and e.kind = 'span')))
          ${wT.map((w) => `and ${w}`).join(" ")}
       union all
       select 'rsvp', v.id::text, null, v.party, v.arrived_n, v.arrived_n, v.status, false, u.first_name, u.last_name, null, null, null, null,
              lower(coalesce(u.first_name, '')), null
         from rsvps v join users u on u.id = v.user_id
        where v.event_id = $1::bigint and v.event_date_id = $2::bigint and v.status in ('going', 'attended', 'expired')
          ${wR.map((w) => `and ${w}`).join(" ")}
     ) z ${curW} order by z.orden, z.kind, z.id::bigint limit ${Math.min(100, f.limite)}`, a)).rows;
  return r.map((x) => ({ kind: x.kind, id: x.id, code: x.code, de: x.de, entraron: x.entraron, adentro: x.adentro, estado: x.estado, cortesia: x.cortesia,
    nombre: x.cortesia ? String(x.cn ?? "—") : x.hn ? nombreCorto(x.hn) : nombreCorto(x.fn, x.ln),
    tipo: x.kind === "rsvp" ? "RSVP" : x.cortesia ? (es ? "Cortesía" : "Comp") : bi(x.tipoB ?? x.mesaB, es), mesa: x.mesaB ? bi(x.mesaB, es) : null, otroDia: x.otro,
    cursor: `${x.orden}|${x.kind === "ticket" ? "t" : "r"}|${x.id}` }));
}
export async function lista(ctx: CtxPuerta, filtro: string, antes: string | null, es: boolean): Promise<{ filas: FilaPuerta[]; siguiente: string | null }> {
  const k = ["todos", "faltan", "adentro", "mesa", "cortesias", "rsvp", "boletos"].includes(filtro) ? filtro : "todos";
  const F = await filas(ctx, { filtro: k, antes, limite: 51 }, es);
  const mas = F.length > 50, L = F.slice(0, 50);
  return { filas: L, siguiente: mas ? L.at(-1)!.cursor ?? null : null };
}

/* ── CHK-AFORO · adentro / aforo, por tipo, por puerta y entradas por hora ── */
export async function aforo(ctx: CtxPuerta, es: boolean) {
  const [R, T, P, H] = await Promise.all([
    resumenFecha(ctx.fecha),
    db().query<{ tipo: Bi | null; mesa: Bi | null; comp: boolean; de: number; entraron: number }>(
      `select tt.name as tipo, et.zone as mesa, t.kind = 'comp' as comp, sum(t.admits)::int as de, sum(coalesce(x.entered_n, 0))::int as entraron
         from tickets t left join ticket_types tt on tt.id = t.ticket_type_id left join event_tables et on et.id = t.table_id
         left join ticket_entries x on x.ticket_id = t.id and x.event_date_id = $2::bigint
        where t.event_id = $1::bigint and t.status in ('valid', 'used') and (t.event_date_id = $2::bigint or ($3::int = any(t.valid_days) and exists (select 1 from events e where e.id = t.event_id and e.kind = 'span')))
        group by 1, 2, 3 order by 4 desc`, [ctx.evento, ctx.fecha, ctx.dayIndex]),
    db().query<{ puerta: string; adentro: number; entraron: number; rechazados: number }>(
      `select door_name as puerta, inside_n as adentro, entered_n as entraron, rejected_n as rechazados from door_counts where event_date_id = $1::bigint order by entered_n desc`, [ctx.fecha]),
    db().query<{ h: string; n: number }>(
      `select to_char(date_trunc('hour', s.at_eff at time zone $2), 'HH24:MI') as h, sum(s.first_n)::int as n from ticket_scans_ef s
        where s.event_date_id = $1::bigint and s.resolution = 'accepted' and s.first_n > 0 group by 1 order by 1`, [ctx.fecha, ctx.tz]),
  ]);
  const caps = (await db().query<{ caps: Record<string, number> }>(`select door_caps as caps from events where id = $1::bigint`, [ctx.evento])).rows[0]?.caps ?? {};
  return { r: R, tipos: T.rows.map((x) => ({ tipo: x.comp ? (es ? "Cortesías" : "Comps") : bi(x.tipo ?? x.mesa, es), de: x.de, entraron: x.entraron })),
    puertas: P.rows.map((x) => ({ ...x, cap: caps[x.puerta] ?? 0 })), horas: H.rows.map((x) => ({ h: hora12(x.h), n: x.n })) };
}

/* ── CHK-MESAS · «TIENE MESA · ¿CUÁL LE DAS?»: un número por mesa vendida; dos grupos nunca con el mismo ── */
export async function mesas(ctx: CtxPuerta, es: boolean) {
  const [Z, G] = await Promise.all([
    db().query<{ id: string; zona: Bi; cantidad: number; seats: number; ocupadas: number[] }>(
      `select et.id::text, et.zone as zona, et.quantity as cantidad, et.seats,
              coalesce((select array_agg(n.table_no order by n.table_no) from door_table_numbers n where n.table_id = et.id and n.event_date_id = $2::bigint and n.released_at is null), '{}') as ocupadas
         from event_tables et where et.event_id = $1::bigint and (et.quantity > 0) order by et.sort, et.id`, [ctx.evento, ctx.fecha]),
    db().query<{ id: string; mesa: string; zona: Bi; de: number; entraron: number; numero: number | null; fn: string | null; ln: string | null; hn: string | null }>(
      `select t.id::text, et.id::text as mesa, et.zone as zona, t.admits as de, coalesce(x.entered_n, 0) as entraron, n.table_no as numero, u.first_name as fn, u.last_name as ln, t.holder_name as hn
         from tickets t join event_tables et on et.id = t.table_id left join users u on u.id = t.holder_user_id
         left join ticket_entries x on x.ticket_id = t.id and x.event_date_id = $2::bigint
         left join door_table_numbers n on n.ticket_id = t.id and n.event_date_id = $2::bigint and n.released_at is null
        where t.event_id = $1::bigint and t.event_date_id = $2::bigint and t.status in ('valid', 'used') order by (n.table_no is null) desc, coalesce(x.entered_n, 0) desc, t.id limit 200`, [ctx.evento, ctx.fecha]),
  ]);
  return { zonas: Z.rows.map((z) => ({ ...z, zona: bi(z.zona, es) })), grupos: G.rows.map((g) => ({ id: g.id, mesa: g.mesa, zona: bi(g.zona, es), de: g.de, entraron: g.entraron, numero: g.numero, nombre: g.hn ? nombreCorto(g.hn) : nombreCorto(g.fn, g.ln) })) };
}
export async function darMesa(ctx: CtxPuerta, ticketId: string, numero: number): Promise<{ ok: true } | { ok: false; msg: Bi; cerrada?: boolean }> {
  const n = Math.floor(Number(numero));
  if (!ID.test(String(ticketId ?? "")) || !(n >= 1 && n <= 60)) return no("Esa mesa no existe.", "That table does not exist.");
  if (!(await accesoPuerta(ctx.userId, ctx.sesion))) return no("Ya no tienes acceso a esta puerta.", "You no longer have access to this door.", true);
  try {
    return await tx(async (c) => {
      const t = (await c.query<{ id: string }>(`select id::text from tickets where id = $1::bigint and event_id = $2::bigint and event_date_id = $3::bigint and table_id is not null and status in ('valid', 'used') for update`, [ticketId, ctx.evento, ctx.fecha])).rows[0];
      if (!t) return no("Ese grupo no tiene mesa en esta fecha.", "That group has no table on this date.");
      await c.query(`update door_table_numbers set released_at = now(), released_by = $3 where ticket_id = $1::bigint and event_date_id = $2::bigint and released_at is null`, [ticketId, ctx.fecha, ctx.userId]);
      await c.query(`insert into door_table_numbers (event_date_id, city_id, table_id, ticket_id, table_no, by_user) select $2::bigint, t.city_id, t.table_id, t.id, $3, $4 from tickets t where t.id = $1::bigint`, [ticketId, ctx.fecha, n, ctx.userId]);
      return { ok: true as const };
    });
  } catch (e) {
    const x = e as { code?: string; constraint?: string; message?: string };
    if (x.code === "23505" && x.constraint === "door_table_numbers_mesa_idx") return no(`La mesa ${n} ya la tiene otro grupo.`, `Table ${n} is already taken.`);
    if (/esa mesa no existe/.test(String(x.message))) return no("Esa mesa no existe en esta zona.", "That table does not exist in this area.");
    throw e;
  }
}

/* ── CHK-INCID · duplicado · edad · seguridad (911) · pide devolución · otro → aviso al organizador ── */
export async function incidencia(ctx: CtxPuerta, kind: string, nota: string, code: string | null): Promise<{ ok: true } | { ok: false; msg: Bi; cerrada?: boolean }> {
  const K = ["duplicado", "edad", "seguridad", "devolucion", "otro"];
  if (!K.includes(kind)) return no("Elige qué pasó.", "Choose what happened.");
  const n = String(nota ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
  if (kind === "otro" && n.length < 3) return no("Cuenta qué pasó en una línea.", "Say what happened in one line.");
  if (!(await accesoPuerta(ctx.userId, ctx.sesion))) return no("Ya no tienes acceso a esta puerta.", "You no longer have access to this door.", true);
  const c = code && /^TL-[A-HJ-NP-Z2-9]{3}-[2-9]{4}$/.test(code) ? code : null;
  const tid = c ? (await db().query<{ id: string }>(`select id::text from tickets where code = $1 and event_id = $2::bigint`, [c, ctx.evento])).rows[0]?.id ?? null : null;
  await db().query(`insert into door_incidents (event_date_id, event_id, business_id, city_id, session_id, ticket_id, kind, note, by_user) values ($1::bigint, $2::bigint, $3, $4, $5::bigint, $6::bigint, $7, $8, $9)`,
    [ctx.fecha, ctx.evento, ctx.negocio, ctx.city, ctx.sesion, tid, kind, n, ctx.userId]);
  const L: Record<string, string> = { duplicado: "boleto duplicado", edad: "edad o identificación", seguridad: "seguridad", devolucion: "pide devolución", otro: "otra cosa" };
  const quien = (await db().query<{ n: string }>(`select coalesce(nullif(first_name, ''), 'Portero') as n from users where id = $1`, [ctx.userId])).rows[0]?.n ?? "Portero";
  await (await import("./avisos")).avisarNegocio(ctx.negocio, "puerta_incidencia", { quien, puerta: ctx.puerta, evento: ctx.titulo.es, tipo: L[kind]!, nota: n },
    { href: `/panel/${ctx.negocio}/eventos?det=door:${ctx.evento}@${ctx.fecha}`, ref: ["event_date", ctx.fecha] });
  return { ok: true };
}
/* 6h · Las automáticas (duplicado sin conexión, entró con un boleto que ya no valía) traen las dos puertas y horas: la del escaneo de más
   (o sin valor) y la de quien ganó AHORA (la primera entrada vigente por la hora que cuenta). */
export async function incidencias(fecha: string, tz: string) {
  return (await db().query<{ id: string; kind: string; nota: string; st: string; hora: string; puerta: string | null; quien: string; code: string | null; auto: boolean;
    aPuerta: string | null; aHora: string | null; gPuerta: string | null; gHora: string | null; res: Resultado | null }>(
    `select i.id::text, i.kind, i.note as nota, i.status as st, to_char(i.at at time zone $2, 'HH24:MI') as hora, s.door_name as puerta,
            coalesce(nullif(u.first_name, ''), '—') as quien, t.code, i.auto, a.door_name as "aPuerta", to_char(a.at_eff at time zone $2, 'HH24:MI') as "aHora", a.result as res,
            g.door_name as "gPuerta", to_char(g.at_eff at time zone $2, 'HH24:MI') as "gHora"
       from door_incidents i left join door_sessions s on s.id = i.session_id left join users u on u.id = i.by_user left join tickets t on t.id = i.ticket_id
       left join ticket_scans_ef a on a.id = i.scan_id
       left join lateral (select x.door_name, x.at_eff from ticket_scans_ef x where i.auto and i.kind = 'duplicado' and x.ticket_id = i.ticket_id and x.event_date_id = i.event_date_id
                            and x.resolution = 'accepted' and x.direction = 'in' and x.first_n > 0 order by x.at_eff, x.at_server, x.id limit 1) g on true
      where i.event_date_id = $1::bigint order by i.at desc limit 50`, [fecha, tz])).rows.map((x) => ({ ...x, hora: hora12(x.hora), aHora: hora12(x.aHora), gHora: hora12(x.gHora) }));
}

/* ── CHK-EQUIPO · quién está en la puerta, en cuál, y cuántos dejó entrar cada uno ── */
export async function equipo(fecha: string, tz: string) {
  // 6h · Por teléfono también: cuántos escaneos subió sin conexión, la última subida, el desfase de su reloj, si se cerró o se revocó y si
  // todavía puede subir lo que tenga (cerrada por ella, el panel o el barrido, mientras no venza el paquete).
  return (await db().query<{ sesion: string; nombre: string; puerta: string; activa: boolean; desde: string; entradas: number; rechazos: number; ultimo: string | null; miembro: boolean;
    cerradaPor: string | null; sinConexion: number; repetidos: number; subio: string | null; desfase: number | null; revocable: boolean }>(
    `select s.id::text as sesion, coalesce(f.display_name, nullif(u.first_name, ''), 'Equipo') as nombre, s.door_name as puerta, s.ended_at is null as activa,
            to_char(s.started_at at time zone $2, 'HH24:MI') as desde, coalesce(k.e, 0) as entradas, coalesce(k.r, 0) as rechazos, to_char(k.u at time zone $2, 'HH24:MI') as ultimo,
            s.member_user_id is not null as miembro, s.ended_by as "cerradaPor", coalesce(k.off, 0) as "sinConexion", coalesce(k.dup, 0) as repetidos,
            to_char(y.sy at time zone $2, 'HH24:MI') as subio, s.clock_offset_ms as desfase,
            (s.ended_by is null or s.ended_by in ('self', 'business', 'system')) and now() <= d.ends_at + make_interval(hours => cfg_int('puerta_paquete_h')) as revocable
       from door_sessions s join event_dates d on d.id = s.event_date_id left join door_staff f on f.id = s.door_staff_id left join users u on u.id = s.user_id
       left join lateral (select sum(x.first_n)::int as e, count(*) filter (where x.resolution = 'rejected')::int as r, max(x.at_server) as u, count(*) filter (where x.offline)::int as off,
                                 count(*) filter (where x.resolution = 'duplicate')::int as dup from ticket_scans_ef x where x.session_id = s.id) k on true
       left join lateral (select max(z.received_at) as sy from door_syncs z where z.session_id = s.id) y on true
      where s.event_date_id = $1::bigint order by (s.ended_at is null) desc, s.started_at desc limit 40`, [fecha, tz])).rows.map((x) => ({ ...x, desde: hora12(x.desde), ultimo: hora12(x.ultimo), subio: hora12(x.subio) }));
}
/* Los últimos en la puerta (resultado, nombre + inicial o la cortesía, puerta y hora). */
export async function ultimos(fecha: string, tz: string, es: boolean, limite = 12) {
  // 6h · La resolución vigente (ticket_scans_ef) y la hora que cuenta; los de sin conexión salen marcados (y los repetidos, como tales).
  return (await db().query<{ id: string; res: Resultado; k: number; dir: string; puerta: string; hora: string; kind: string; fn: string | null; ln: string | null; hn: string | null; cn: string | null; comp: boolean | null;
    offline: boolean; resolucion: string; desviado: boolean }>(
    `select s.id::text, s.result as res, s.admits_n as k, s.direction as dir, s.door_name as puerta, to_char(s.at_eff at time zone $2, 'HH24:MI') as hora, s.kind,
            coalesce(u.first_name, ru.first_name) as fn, coalesce(u.last_name, ru.last_name) as ln, t.holder_name as hn, t.comp_name as cn, t.kind = 'comp' as comp,
            s.offline, s.resolution as resolucion, s.skew as desviado
       from ticket_scans_ef s left join tickets t on t.id = s.ticket_id left join users u on u.id = t.holder_user_id
       left join rsvps v on v.id = s.rsvp_id left join users ru on ru.id = v.user_id
      where s.event_date_id = $1::bigint order by s.at_server desc limit $3`, [fecha, tz, limite])).rows.map((x) => ({
    id: x.id, res: x.res, k: x.k, dir: x.dir, puerta: x.puerta, hora: hora12(x.hora), kind: x.kind, offline: x.offline, repetido: x.resolucion === "duplicate", desviado: x.desviado,
    nombre: x.kind === "count" ? (es ? "Conteo" : "Count") : x.kind === "noche" ? (es ? "Lista de la noche" : "Tonight’s list") : x.comp ? String(x.cn ?? "—") : x.hn ? nombreCorto(x.hn) : x.fn ? nombreCorto(x.fn, x.ln) : "—" }));
}

/* ── CHK-CIERRE · el resumen de la noche (sin dinero: boletos, entraron, no vinieron, cortesías, RSVP, incidencias) ── */
export async function cierre(fecha: string, eventoId: string, dayIndex: number) {
  const r = (await db().query<{ boletos: number; cortesias: number; rsvp: number; entraron: number; llegaron: number; incid: number; abiertas: number; rechazados: number; repetidos: number }>(
    `select coalesce(sum(t.admits) filter (where t.kind = 'paid'), 0)::int as boletos, coalesce(sum(t.admits) filter (where t.kind = 'comp'), 0)::int as cortesias,
            coalesce((select sum(v.party) from rsvps v where v.event_date_id = $2::bigint and v.status in ('going', 'attended', 'expired')), 0)::int as rsvp,
            (select entered_n from event_dates where id = $2::bigint) as entraron,
            coalesce((select sum(x.entered_n) from ticket_entries x where x.event_date_id = $2::bigint), 0)::int
              + coalesce((select sum(v.arrived_n) from rsvps v where v.event_date_id = $2::bigint), 0)::int as llegaron,
            (select count(*) from door_incidents i where i.event_date_id = $2::bigint)::int as incid,
            (select count(*) from door_sessions s where s.event_date_id = $2::bigint and s.ended_at is null)::int as abiertas,
            coalesce((select sum(c.rejected_n) from door_counts c where c.event_date_id = $2::bigint), 0)::int as rechazados,
            coalesce((select sum(c.dup_n) from door_counts c where c.event_date_id = $2::bigint), 0)::int as repetidos
       from tickets t
      where t.event_id = $1::bigint and t.status in ('valid', 'used')
        and (t.event_date_id = $2::bigint or ($3::int = any(t.valid_days) and exists (select 1 from events e where e.id = t.event_id and e.kind = 'span')))`, [eventoId, fecha, dayIndex])).rows[0]!;
  // No vinieron = los que tenían boleto, cortesía o RSVP y no llegaron (la lista de la noche y los conteos no se esperan).
  return { ...r, noVinieron: Math.max(0, r.boletos + r.cortesias + r.rsvp - r.llegaron) };
}

/* ── Barrido ── */
/* Las sesiones abiertas que ya no valen (la ventana del día pasó, el evento se canceló, el portero perdió el evento) se cierran solas. */
export async function vencerSesionesPuerta(): Promise<number> {
  // También las que ya no tienen acceso (evento cancelado, negocio pausado, ventana pasada): así ninguna queda «abierta» en el panel.
  return (await db().query(`update door_sessions set ended_at = now(), ended_by = 'system' where ended_at is null and not puerta_acceso(id, user_id)`)).rowCount ?? 0;
}
/* «Hoy escaneas en la puerta» una hora antes de las puertas, a cada portero activo de ese evento (una vez por fecha y portero). */
export async function barrerPuertaAbre(): Promise<number> {
  const L = (await db().query<{ uid: string; fid: string; t: Bi; hora: string }>(
    `select distinct f.user_id::text as uid, d.id::text as fid, e.title as t, to_char(d.doors_at at time zone c.timezone, 'HH24:MI') as hora
       from event_dates d join events e on e.id = d.event_id join cities c on c.id = d.city_id
       join door_staff f on f.business_id = e.business_id and f.status = 'active' and (f.scope = 'all' or e.id = any(f.event_ids))
      where d.status = 'scheduled' and e.status in ('live', 'paused') and d.doors_at between now() and now() + interval '60 minutes'
        and not exists (select 1 from notifications n where n.user_id = f.user_id and n.tpl = 'puerta_abre' and n.ref_kind = 'event_date' and n.ref_id = d.id::text)
      limit 200`)).rows;
  const { avisar } = await import("./avisos");
  for (const x of L) await avisar(x.uid, "puerta_abre", { evento: x.t.es, hora: hora12(x.hora) }, { href: "/puerta", ref: ["event_date", x.fid] });
  return L.length;
}
