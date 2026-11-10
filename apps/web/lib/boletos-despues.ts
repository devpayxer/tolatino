import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { cfgSql, valores } from "./config";
import { normalizarTelefono } from "./cuenta";
import { db, tx } from "./db";
import { bi, diaCorto, dinero, hora, type Bi } from "./evt-comun";
import { pasarela } from "./pagos/pasarela";

/* 6d · Después de comprar (fase6-eventos.md §3 «Devoluciones» y §4 6d): transferir, recibir, cancelar con devolución, cambiar el nombre,
   cortesías del organizador y «Devolver» desde el panel. El servidor decide TODO: quién, hasta cuándo y cuánto.
   - Transferir: solo quien tiene el boleto; hasta inicio − bol_transferir_h; a un teléfono que no es el suyo; con tope al día. El QR sube de
     versión al mandarlo (el anterior queda anulado) y mientras está pendiente nadie tiene un QR vigente (no se firma). Lo recibe SOLO la
     cuenta con ese teléfono (la huella del teléfono de quien entra = la guardada), nunca quien lo mandó (también lo dice la base); al
     recibirlo el original queda «replaced» y nace otro boleto a su nombre. El token del enlace es de un uso y la base solo guarda su huella.
   - Cancelar (el comprador): hasta inicio − bol_cancelar_h; se devuelve lo pagado por cada boleto MENOS su cargo de servicio (fee_cents,
     copiado al comprar); si la orden queda sin boletos vivos, también los extras (menos su 5 %). Un boleto recibido de otra persona no
     se cancela (el dinero es de quien pagó): se transfiere. Un boleto usado no se devuelve.
   - Devolver (el organizador, desde el panel): 100 % de cada boleto (y de los extras si la orden queda vacía); la comisión no se cobra.
   - Devolución SIEMPRE en dos pasos: (1) en una transacción, con el pago y los boletos bloqueados: los boletos pasan a 'refunded' (la base
     suelta su lugar), se anota la devolución 'pending' (la base no deja que lo pendiente + lo hecho pase de lo cobrado) y cada boleto en
     ticket_refund_lines (único por boleto: nada se devuelve dos veces); (2) Stripe (o el simulador) con la llave de la devolución: la
     misma llave nunca devuelve dos veces. Si (2) falla, el barrido la reintenta con la MISMA llave (barrerDevolucionesBoletos).
   - Cortesías: solo el panel, con tope por fecha (evt_cortesias_max), toman existencia como una venta (update condicional), van en una
     orden sin cobro (pay_mode 'none') y nunca entran a una devolución (la base lo impide). */
type Q = Pick<PoolClient, "query">;
const ID = /^\d{1,18}$/, UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, NUM_B = /^B-\d{1,10}$/, CODIGO_BOL = /^TL-[A-HJ-NP-Z2-9]{3}-[2-9]{4}$/;
const TOKEN = /^[A-Za-z0-9_-]{32}$/;
type Res<T = object> = ({ ok: true } & T) | { ok: false; msg: Bi };
class NoD extends Error { constructor(public msg: Bi) { super(msg.es); } }
const no = (es: string, en: string) => new NoD({ es, en });
const falla = (es: string, en: string): { ok: false; msg: Bi } => ({ ok: false, msg: { es, en } });
const atrapa = <T>(e: unknown): Res<T> => { if (e instanceof NoD) return { ok: false, msg: e.msg }; throw e; };
const sha = (t: string) => createHash("sha256").update(t).digest("hex");
const QUIEN = (u: string) => `coalesce(nullif(trim(coalesce(${u}.first_name, '') || ' ' || left(coalesce(${u}.last_name, ''), 1)), ''), 'Vecino')`;
const ISO = (x: string) => `to_char((${x}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
const H0 = (d: string) => `(extract(hour from ${d}.starts_at at time zone ci.timezone) * 60 + extract(minute from ${d}.starts_at at time zone ci.timezone))::int`;
/* La fecha sigue en pie: evento publicado o pausado, fecha programada y sin terminar. */
const EN_PIE = `e.status in ('live', 'paused') and d.status = 'scheduled' and d.ends_at > now()`;
const cuantosL = (n: number, mesa: boolean, admits: number, es = true) => mesa ? (es ? `1 mesa (${admits} entradas)` : `1 table (${admits} entries)`) : es ? `${n} ${n === 1 ? "boleto" : "boletos"}` : `${n} ${n === 1 ? "ticket" : "tickets"}`;
const limpiarNombre = (x: unknown) => String(x ?? "").replace(/[\u0000-\u001F\u007F]/g, "").replace(/\d{3,}/g, "").replace(/\s+/g, " ").trim().slice(0, 40);
async function base() { return (await import("./correo")).BASE_URL(); }

/* ── Transferir ── */
export async function transferir(userId: string, code: string, telRaw: unknown): Promise<Res<{ a: string }>> {
  if (!CODIGO_BOL.test(String(code))) return falla("Ese boleto no existe.", "That ticket does not exist.");
  const tel = normalizarTelefono(String(telRaw ?? ""));
  if (!tel) return falla("Escribe un teléfono de 10 dígitos.", "Enter a 10-digit phone number.");
  const cfg = await valores("bol_transferir_h");
  const { cifrar, huella } = await import("./cifrado");
  const token = randomBytes(24).toString("base64url");
  let r: { id: string; title: Bi; dia: string; h0: number; city: string; mesa: boolean; admits: number; de: string; code: string };
  try {
    r = await tx(async (c) => {
      const yo = (await c.query<{ phone: string; de: string }>(`select u.phone, ${QUIEN("u")} as de from users u where u.id = $1`, [userId])).rows[0];
      if (!yo) throw no("Entra a tu cuenta.", "Sign in to your account.");
      if (yo.phone === tel) throw no("Ese es tu teléfono. Escribe el de la persona que va a usar el boleto.", "That is your phone. Enter the phone of the person who will use the ticket.");
      const b = (await c.query<{ id: string; st: string; op: string; fid: string; city: string; admits: number; mesa: boolean; title: Bi; dia: string; h0: number; vivo: boolean; abierto: boolean; hasta: string; pend: boolean }>(
        `select t.id::text, t.status as st, t.operation_id::text as op, t.event_date_id::text as fid, t.city_id as city, t.admits, t.table_id is not null as mesa, e.title, d.local_date::text as dia, ${H0("d")} as h0,
                (${EN_PIE}) as vivo, d.starts_at - make_interval(hours => ${cfgSql("bol_transferir_h")}) > now() as abierto,
                ${ISO(`d.starts_at - make_interval(hours => ${cfgSql("bol_transferir_h")})`)} as hasta,
                exists (select 1 from ticket_transfers x where x.ticket_id = t.id and x.status = 'pending') as pend
           from tickets t join event_dates d on d.id = t.event_date_id join events e on e.id = t.event_id join cities ci on ci.id = d.city_id
          where t.code = $1 and t.holder_user_id = $2 for update of t`, [code, userId])).rows[0];
      // De otra persona = no existe (no se dice que existe).
      if (!b) throw no("Ese boleto no existe.", "That ticket does not exist.");
      if (b.st !== "valid") throw no("Este boleto ya no se puede transferir.", "This ticket can no longer be transferred.");
      if (!b.vivo) throw no("Esta fecha ya no está en pie: el boleto no se transfiere.", "This date is no longer on: the ticket cannot be transferred.");
      if (!b.abierto) throw no(`Se transfiere hasta ${cfg.bol_transferir_h} h antes del evento. Ya pasó.`, `Transfers close ${cfg.bol_transferir_h} h before the event. That has passed.`);
      if (b.pend) throw no("Este boleto ya va en camino a otra persona. Deshazlo primero.", "This ticket is already on its way to someone. Undo that first.");
      // El tope al día lo decide la base en el momento (Configuración, sin caché).
      const t0 = (await c.query<{ n: number; max: number }>(`select count(*)::int as n, ${cfgSql("bol_transferencias_dia_max")} as max from ticket_transfers where from_user_id = $1 and kind = 'transfer' and created_at > now() - interval '1 day'`, [userId])).rows[0]!;
      if (t0.n >= t0.max) throw no(`Hasta ${t0.max} transferencias al día. Prueba mañana.`, `Up to ${t0.max} transfers a day. Try tomorrow.`);
      const x = (await c.query<{ id: string }>(
        `insert into ticket_transfers (kind, ticket_id, operation_id, event_date_id, city_id, from_user_id, to_phone_enc, to_phone_hash, to_last2, claim_hash, expires_at)
         select 'transfer', $1::bigint, $2::bigint, $3::bigint, $4, $5, $6, $7, $8, $9, d.starts_at - make_interval(hours => ${cfgSql("bol_transferir_h")}) from event_dates d where d.id = $3::bigint returning id::text`,
        [b.id, b.op, b.fid, b.city, userId, cifrar(tel), huella(tel), tel.slice(-2), sha(token)])).rows[0]!;
      // EL QR ANTERIOR QUEDA ANULADO: la versión sube ya; mientras está pendiente no se firma ningún QR de este boleto.
      await c.query(`update tickets set qr_ver = qr_ver + 1 where id = $1::bigint`, [b.id]);
      await c.query(`insert into ticket_log (ticket_id, operation_id, city_id, kind, by_user, by_kind, reason) values ($1::bigint, $2::bigint, $3, 'transfer_enviado', $4, 'user', $5)`, [b.id, b.op, b.city, userId, `A un teléfono que termina en ${tel.slice(-2)}`]);
      return { id: x.id, title: b.title, dia: b.dia, h0: b.h0, city: b.city, mesa: b.mesa, admits: b.admits, de: yo.de, code };
    });
  } catch (e) { return atrapa(e); }
  const { avisarTelefono } = await import("./avisos");
  await avisarTelefono(tel, "bol_transfer_in", { de: r.de, cuantos: cuantosL(1, r.mesa, r.admits), evento: r.title.es, cuando: `${diaCorto(r.dia, true)} · ${hora(r.h0)}`, enlace: `${await base()}/eventos/recibir/${token}` },
    { href: `/eventos/recibir/${token}`, ref: ["ticket_transfer", r.id], city: r.city });
  return { ok: true, a: `••${tel.slice(-2)}` };
}

/* Deshacer mientras nadie lo reciba: el boleto vuelve con un QR nuevo. */
export async function cancelarTransferencia(userId: string, code: string): Promise<Res> {
  if (!CODIGO_BOL.test(String(code))) return falla("Ese boleto no existe.", "That ticket does not exist.");
  try {
    await tx(async (c) => {
      const t = (await c.query<{ id: string; op: string; city: string; xid: string | null }>(
        `select t.id::text, t.operation_id::text as op, t.city_id as city, (select x.id::text from ticket_transfers x where x.ticket_id = t.id and x.status = 'pending' and x.kind = 'transfer') as xid
           from tickets t where t.code = $1 and t.holder_user_id = $2 for update of t`, [code, userId])).rows[0];
      if (!t) throw no("Ese boleto no existe.", "That ticket does not exist.");
      if (!t.xid) throw no("Ya no hay nada que deshacer: lo recibieron o venció.", "Nothing to undo: it was received or it expired.");
      const u = await c.query(`update ticket_transfers set status = 'cancelled', ended_at = now() where id = $1::bigint and status = 'pending'`, [t.xid]);
      if (!u.rowCount) throw no("Ya no hay nada que deshacer: lo recibieron o venció.", "Nothing to undo: it was received or it expired.");
      await c.query(`update tickets set qr_ver = qr_ver + 1 where id = $1::bigint`, [t.id]);
      await c.query(`insert into ticket_log (ticket_id, operation_id, city_id, kind, by_user, by_kind) values ($1::bigint, $2::bigint, $3, 'transfer_cancelado', $4, 'user')`, [t.id, t.op, t.city, userId]);
    });
    return { ok: true };
  } catch (e) { return atrapa(e); }
}

/* Barrido: lo que nadie recibió a tiempo vuelve a quien lo mandó (QR nuevo); una cortesía sin recibir queda sin dueño (la puerta la busca por nombre). */
export async function vencerTransferencias(): Promise<number> {
  const L = (await db().query<{ id: string }>(`select id::text from ticket_transfers where status = 'pending' and expires_at <= now() order by expires_at limit 200`)).rows;
  let n = 0;
  for (const x of L) {
    const r = await tx(async (c) => {
      const t = (await c.query<{ kind: string; tid: string; op: string; city: string; uid: string; code: string; title: Bi }>(
        `update ticket_transfers x set status = 'expired', ended_at = now() from tickets t join events e on e.id = t.event_id
          where x.id = $1::bigint and x.status = 'pending' and x.expires_at <= now() and t.id = x.ticket_id
          returning x.kind, t.id::text as tid, t.operation_id::text as op, t.city_id as city, x.from_user_id::text as uid, t.code, e.title`, [x.id])).rows[0];
      if (!t) return null;
      if (t.kind === "transfer") {
        await c.query(`update tickets set qr_ver = qr_ver + 1 where id = $1::bigint and status = 'valid'`, [t.tid]);
        await c.query(`insert into ticket_log (ticket_id, operation_id, city_id, kind, by_kind) values ($1::bigint, $2::bigint, $3, 'transfer_vencido', 'system')`, [t.tid, t.op, t.city]);
      }
      return t;
    }).catch(() => null);
    if (!r) continue;
    n++;
    if (r.kind === "transfer") await (await import("./avisos")).avisar(r.uid, "bol_transfer_vuelve", { codigo: r.code, evento: r.title.es }, { href: `/cuenta/boletos/${r.code}`, ref: ["tickets", r.code] });
  }
  return n;
}

/* ── Recibir (/eventos/recibir/[token], hueco #4) ── */
export type Recibir = {
  estado: "pendiente" | "entrar" | "otro_telefono" | "tuya" | "recibida" | "usada" | "vencida" | "cancelada";
  kind: "transfer" | "comp"; de: string; tipo: string; admits: number; cuantas: number; hasta: string; codigo: string | null;
  evento: { slug: string; fecha: string; title: string; dia: string; h0: number; venue: string; img: string | null; dark: boolean; edad: number; tz: string };
};
export async function verTransferencia(token: string, viewer: { id: string; phone: string } | null, es: boolean): Promise<Recibir | null> {
  if (!TOKEN.test(String(token))) return null;
  const x = (await db().query<{ kind: "transfer" | "comp"; st: string; vence: boolean; hasta: string; ph: string; from: string; claimed: string | null; nuevo: string | null; de: string; org: string;
    tn: Bi | null; mz: Bi | null; admits: number; cuantas: number; slug: string; fid: string; title: Bi; dia: string; h0: number; venue: string; img: string | null; dark: boolean; edad: number; tz: string; ok: boolean }>(
    `select x.kind, x.status as st, x.expires_at <= now() as vence, ${ISO("x.expires_at")} as hasta, x.to_phone_hash as ph, x.from_user_id::text as "from", x.claimed_by::text as claimed,
            (select n.code from tickets n where n.id = x.new_ticket_id) as nuevo, ${QUIEN("u")} as de, b.name as org,
            tt.name as tn, et.zone as mz, t.admits, case when x.kind = 'comp' then (select count(*)::int from tickets z where z.operation_id = x.operation_id and z.kind = 'comp' and z.status in ('valid', 'used')) else 1 end as cuantas,
            e.slug, d.id::text as fid, e.title, d.local_date::text as dia, ${H0("d")} as h0, case when e.venue_mode = 'other' then e.venue_name else b.name end as venue, f.dark, e.min_age as edad, ci.timezone as tz,
            (select m.url from media m where m.owner_kind = 'event' and m.owner_id = e.id::text and m.status = 'visible' order by m.sort, m.created_at limit 1) as img, (${EN_PIE}) as ok
       from ticket_transfers x join tickets t on t.id = x.ticket_id join event_dates d on d.id = x.event_date_id join events e on e.id = d.event_id join businesses b on b.id = e.business_id
       join cities ci on ci.id = d.city_id join event_formats f on f.key = e.format join users u on u.id = x.from_user_id
       left join ticket_types tt on tt.id = t.ticket_type_id left join event_tables et on et.id = t.table_id
      where x.claim_hash = $1`, [sha(token)])).rows[0];
  if (!x) return null;
  const { huella } = await import("./cifrado");
  const estado: Recibir["estado"] = x.st === "claimed" ? (viewer && x.claimed === viewer.id ? "recibida" : "usada") : x.st === "cancelled" ? "cancelada"
    : x.st === "expired" || x.vence || !x.ok ? "vencida" : !viewer ? "entrar" : viewer.id === x.from ? "tuya" : huella(viewer.phone) !== x.ph ? "otro_telefono" : "pendiente";
  return {
    estado, kind: x.kind, de: x.kind === "comp" ? x.org : x.de, tipo: x.kind === "comp" ? (es ? "Cortesía" : "Comp") : x.tn ? bi(x.tn, es) : x.mz ? bi(x.mz, es) : "", admits: x.admits, cuantas: x.cuantas, hasta: x.hasta,
    codigo: estado === "recibida" ? x.nuevo : null,
    evento: { slug: x.slug, fecha: x.fid, title: bi(x.title, es), dia: x.dia, h0: x.h0, venue: x.venue, img: x.img, dark: x.dark, edad: x.edad, tz: x.tz },
  };
}

export async function reclamar(userId: string, token: string): Promise<Res<{ codigo: string }>> {
  if (!TOKEN.test(String(token))) return falla("Ese enlace no existe.", "That link does not exist.");
  const { huella } = await import("./cifrado");
  let aviso: { uid: string; code: string; title: Bi } | null = null;
  try {
    const codigo = await tx(async (c) => {
      const yo = (await c.query<{ phone: string; verificado: boolean }>(`select phone, phone_verified_at is not null as verificado from users where id = $1`, [userId])).rows[0];
      if (!yo?.verificado) throw no("Entra con tu teléfono para recibirlo.", "Sign in with your phone to get it.");
      const x = (await c.query<{ id: string; kind: string; st: string; vence: boolean; ph: string; from: string; tid: string; op: string }>(
        `select id::text, kind, status as st, expires_at <= now() as vence, to_phone_hash as ph, from_user_id::text as "from", ticket_id::text as tid, operation_id::text as op
           from ticket_transfers where claim_hash = $1 for update`, [sha(token)])).rows[0];
      if (!x) throw no("Ese enlace no existe.", "That link does not exist.");
      if (x.st === "claimed") throw no("Este boleto ya se recibió.", "This ticket was already received.");
      if (x.st !== "pending" || x.vence) throw no("Este enlace ya no vale: venció o quien lo mandó lo deshizo.", "This link is no longer valid: it expired or the sender undid it.");
      if (x.from === userId) throw no("Tú mandaste este boleto: lo recibe la otra persona.", "You sent this ticket: the other person receives it.");
      if (huella(yo.phone) !== x.ph) throw no("Este boleto se mandó a otro teléfono. Entra con el número al que te lo mandaron.", "This ticket was sent to another phone. Sign in with the number it was sent to.");
      const t = (await c.query<{ id: string; st: string; vivo: boolean; city: string; code: string; title: Bi }>(
        `select t.id::text, t.status as st, (${EN_PIE}) as vivo, t.city_id as city, t.code, e.title from tickets t join event_dates d on d.id = t.event_date_id join events e on e.id = t.event_id
          where t.id = $1::bigint for update of t`, [x.tid])).rows[0];
      if (!t || t.st !== "valid" || !t.vivo) throw no("Este boleto ya no vale (se devolvió, se anuló o el evento ya no está).", "This ticket is no longer valid (refunded, voided or the event is off).");
      if (x.kind === "comp") {
        // La cortesía: todas las de esa entrega pasan a su cuenta (todavía sin dueño: nadie tenía su QR).
        const L = (await c.query<{ id: string; code: string }>(
          `update tickets set holder_user_id = $2 where operation_id = $1::bigint and kind = 'comp' and status = 'valid' and holder_user_id is null returning id::text, code`, [x.op, userId])).rows;
        if (!L.length) throw no("Esta cortesía ya no está.", "This comp is no longer available.");
        await c.query(`update ticket_transfers set status = 'claimed', new_ticket_id = $2::bigint, claimed_by = $3, claimed_at = now(), ended_at = now() where id = $1::bigint and status = 'pending'`, [x.id, L[0]!.id, userId]);
        await c.query(`insert into ticket_log (ticket_id, operation_id, city_id, kind, by_user, by_kind) select id, operation_id, city_id, 'cortesia_recibida', $2, 'user' from tickets where id = any($1::bigint[])`, [L.map((z) => z.id), userId]);
        return L[0]!.code;
      }
      // Transferencia: nace otro boleto a su nombre (mismo tipo, mismas entradas, lo pagado se queda en la orden de quien pagó) y el original
      // queda reemplazado. El QR nuevo es versión 1 de otro boleto: el del original no entra.
      const n = (await c.query<{ id: string; code: string }>(
        `insert into tickets (event_date_id, event_id, city_id, valid_days, ticket_type_id, table_id, operation_id, holder_user_id, admits, kind, price_cents, fee_cents, discount_cents, comp_name, comp_by)
         select event_date_id, event_id, city_id, valid_days, ticket_type_id, table_id, operation_id, $2, admits, kind, price_cents, fee_cents, discount_cents, comp_name, comp_by from tickets where id = $1::bigint
         returning id::text, code`, [t.id, userId])).rows[0]!;
      await c.query(`update tickets set status = 'replaced', replaced_by = $2::bigint where id = $1::bigint and status = 'valid'`, [t.id, n.id]);
      await c.query(`update ticket_transfers set status = 'claimed', new_ticket_id = $2::bigint, claimed_by = $3, claimed_at = now(), ended_at = now() where id = $1::bigint and status = 'pending'`, [x.id, n.id, userId]);
      await c.query(`insert into ticket_log (ticket_id, operation_id, city_id, kind, by_user, by_kind, reason) values ($1::bigint, $2::bigint, $3, 'transferido', $4, 'user', $5), ($6::bigint, $2::bigint, $3, 'recibido', $4, 'user', $7)`,
        [t.id, x.op, t.city, userId, `Ahora es ${n.code}`, n.id, `Antes ${t.code}`]);
      aviso = { uid: x.from, code: t.code, title: t.title };
      return n.code;
    });
    if (aviso) { const a = aviso as { uid: string; code: string; title: Bi }; await (await import("./avisos")).avisar(a.uid, "bol_transfer_ok", { codigo: a.code, evento: a.title.es }, { href: `/cuenta/boletos/${a.code}`, ref: ["tickets", a.code] }); }
    return { ok: true, codigo };
  } catch (e) { return atrapa(e); }
}

/* «Cambiar un nombre» (gratis hasta inicio − bol_transferir_h). El nombre no va en el QR. */
export async function cambiarNombre(userId: string, code: string, nombreRaw: unknown): Promise<Res> {
  if (!CODIGO_BOL.test(String(code))) return falla("Ese boleto no existe.", "That ticket does not exist.");
  const nombre = limpiarNombre(nombreRaw);
  try {
    await tx(async (c) => {
      const t = (await c.query<{ id: string; op: string; city: string; st: string; abierto: boolean; pend: boolean }>(
        `select t.id::text, t.operation_id::text as op, t.city_id as city, t.status as st, (${EN_PIE}) and d.starts_at - make_interval(hours => ${cfgSql("bol_transferir_h")}) > now() as abierto,
                exists (select 1 from ticket_transfers x where x.ticket_id = t.id and x.status = 'pending') as pend
           from tickets t join event_dates d on d.id = t.event_date_id join events e on e.id = t.event_id where t.code = $1 and t.holder_user_id = $2 for update of t`, [code, userId])).rows[0];
      if (!t) throw no("Ese boleto no existe.", "That ticket does not exist.");
      if (t.st !== "valid" || t.pend) throw no("A este boleto ya no se le cambia el nombre.", "This ticket's name can no longer be changed.");
      if (!t.abierto) { const h = (await valores("bol_transferir_h")).bol_transferir_h; throw no(`El nombre se cambia hasta ${h} h antes del evento.`, `The name can be changed up to ${h} h before the event.`); }
      await c.query(`update tickets set holder_name = $2 where id = $1::bigint`, [t.id, nombre || null]);
      await c.query(`insert into ticket_log (ticket_id, operation_id, city_id, kind, by_user, by_kind) values ($1::bigint, $2::bigint, $3, 'nombre', $4, 'user')`, [t.id, t.op, t.city, userId]);
    });
    return { ok: true };
  } catch (e) { return atrapa(e); }
}

/* ── Lo que se devuelve (un solo cálculo para la hoja, el comprador y el panel) ── */
type FilaDev = { id: string; code: string; st: string; kind: string; precio: number; cargo: number; mesa: boolean; tipo: Bi | null; pend: boolean; holder: string | null };
type Calc = { boletos: (FilaDev & { devuelve: number; queda: number; cede: number })[]; extras: { ids: string[]; monto: number; cargo: number; devuelve: number } | null; total: number };
/* El comprador: se le devuelve cada boleto menos su cargo (que se queda To'Latino). El organizador: el 100 % y To'Latino cede su comisión. */
async function calcular(c: Q, op: string, pagoFee: number, sel: FilaDev[], quien: "buyer" | "business"): Promise<Calc> {
  const boletos = sel.map((b) => quien === "buyer" ? { ...b, devuelve: Math.max(0, b.precio - b.cargo), queda: Math.min(b.cargo, b.precio), cede: 0 } : { ...b, devuelve: b.precio, queda: 0, cede: b.cargo });
  // Los extras vuelven solo si la orden se queda sin boletos vivos (también los de quien los recibió).
  const otros = (await c.query<{ n: number }>(`select count(*)::int as n from tickets where operation_id = $1::bigint and status in ('valid', 'used') and not (id = any($2::bigint[]))`, [op, sel.map((b) => b.id)])).rows[0]!.n;
  let extras: Calc["extras"] = null;
  if (!otros) {
    const L = (await c.query<{ id: string; t: number }>(`select l.id::text, l.line_total_cents as t from operation_lines l where l.operation_id = $1::bigint and l.options->0->>'k' = 'a'
                                                          and not exists (select 1 from ticket_refund_lines r where r.line_id = l.id)`, [op])).rows;
    const monto = L.reduce((s, l) => s + l.t, 0);
    if (monto > 0) {
      // El cargo de los extras = la comisión de la orden − la de sus boletos originales (los que nacieron de una transferencia copian la suya).
      const orig = (await c.query<{ f: number }>(`select coalesce(sum(t.fee_cents), 0)::int as f from tickets t where t.operation_id = $1::bigint and not exists (select 1 from ticket_transfers x where x.new_ticket_id = t.id and x.kind = 'transfer')`, [op])).rows[0]!.f;
      const cargo = Math.max(0, Math.min(monto, pagoFee - orig));
      extras = { ids: L.map((l) => l.id), monto, cargo, devuelve: quien === "buyer" ? monto - cargo : monto };
    }
  }
  return { boletos, extras, total: boletos.reduce((s, b) => s + b.devuelve, 0) + (extras?.devuelve ?? 0) };
}
const SEL_DEV = `select t.id::text, t.code, t.status as st, t.kind, t.price_cents as precio, t.fee_cents as cargo, t.table_id is not null as mesa, coalesce(tt.name, et.zone) as tipo,
                        exists (select 1 from ticket_transfers x where x.ticket_id = t.id and x.status = 'pending') as pend, t.holder_user_id::text as holder
                   from tickets t left join ticket_types tt on tt.id = t.ticket_type_id left join event_tables et on et.id = t.table_id`;

/* La hoja «Cancelar mis boletos»: qué se devuelve y hasta cuándo (lo que la persona puede cancelar de esta orden). */
export type PrevioCancelar = {
  abierto: boolean; hasta: string; horas: number; transferirHasta: string; total: number;
  boletos: { code: string; tipo: string; mesa: boolean; precio: number; cargo: number; devuelve: number }[]; extras: { monto: number; cargo: number; devuelve: number } | null;
};
export async function previoCancelar(userId: string, numero: string, es: boolean): Promise<PrevioCancelar | null> {
  if (!NUM_B.test(String(numero))) return null;
  const c = db();
  const o = (await c.query<{ id: string; fee: number; abierto: boolean; hasta: string; th: string; pago: string | null }>(
    `select o.id::text, coalesce(p.fee_cents, 0) as fee, (${EN_PIE}) and d.starts_at - make_interval(hours => ${cfgSql("bol_cancelar_h")}) > now() as abierto,
            ${ISO(`d.starts_at - make_interval(hours => ${cfgSql("bol_cancelar_h")})`)} as hasta, ${ISO(`d.starts_at - make_interval(hours => ${cfgSql("bol_transferir_h")})`)} as th, p.status as pago
       from operations o join event_dates d on d.id = (o.details->>'event_date_id')::bigint join events e on e.id = d.event_id
       left join payments p on p.operation_id = o.id and p.kind = 'full'
      where o.number = $1 and o.kind = 'tickets' and o.user_id = $2 and o.pay_mode = 'app' and o.status = 'confirmed'`, [numero, userId])).rows[0];
  if (!o) return null;
  const sel = (await c.query<FilaDev>(`${SEL_DEV} where t.operation_id = $1::bigint and t.holder_user_id = $2 and t.status = 'valid' and t.kind = 'paid' order by t.table_id nulls first, t.id`, [o.id, userId])).rows.filter((b) => !b.pend);
  const k = await calcular(c, o.id, o.fee, sel, "buyer");
  const horas = (await valores("bol_cancelar_h")).bol_cancelar_h;
  return { abierto: o.abierto && ["captured", "partially_refunded"].includes(o.pago ?? ""), hasta: o.hasta, horas, transferirHasta: o.th, total: k.total,
    boletos: k.boletos.map((b) => ({ code: b.code, tipo: b.tipo ? bi(b.tipo, es) : "", mesa: b.mesa, precio: b.precio, cargo: b.queda, devuelve: b.devuelve })),
    extras: k.extras ? { monto: k.extras.monto, cargo: k.extras.cargo, devuelve: k.extras.devuelve } : null };
}

/* Paso 1 de toda devolución de boletos (dentro de la transacción): boletos → 'refunded' (la base suelta su lugar), la devolución 'pending'
   (la base no deja pasar de lo cobrado) y sus líneas (únicas por boleto y por extra). Devuelve el id de la devolución. */
async function anotarDevolucion(c: Q, x: { op: string; pid: string; city: string; k: Calc; por: "buyer" | "business" | "event_cancelled" | "event_moved"; actor: string | null; idem: string; motivo: string; logKind: "cancelado" | "devuelto"; byKind: "user" | "business" | "staff" | "system";
  estados?: "valid" | "vivos" }): Promise<string> {
  const ids = x.k.boletos.map((b) => b.id);
  const rf = (await c.query<{ id: string }>(
    `insert into refunds (payment_id, amount_cents, reason, initiated_by, actor_id, status, idem_key, fee_absorbed_by) values ($1::bigint, $2, $3, $4, $5, 'pending', $6, 'platform') returning id::text`,
    [x.pid, x.k.total, x.motivo.slice(0, 300), x.por, x.actor, x.idem])).rows[0]!.id;
  for (const b of x.k.boletos) await c.query(`insert into ticket_refund_lines (refund_id, operation_id, ticket_id, city_id, amount_cents, fee_kept_cents, fee_waived_cents) values ($1::bigint, $2::bigint, $3::bigint, $4, $5, $6, $7)`, [rf, x.op, b.id, x.city, b.devuelve, b.queda, b.cede]);
  if (x.k.extras) {
    const L = (await c.query<{ id: string; t: number }>(`select id::text, line_total_cents as t from operation_lines where id = any($1::bigint[]) order by id`, [x.k.extras.ids])).rows;
    let cargo = x.k.extras.cargo;
    for (const l of L) {
      const q = Math.min(cargo, l.t); cargo -= q;
      // El comprador: el extra vuelve menos su parte del cargo (se queda). El organizador: vuelve completo y To'Latino cede esa parte.
      const comprador = x.por === "buyer";
      await c.query(`insert into ticket_refund_lines (refund_id, operation_id, line_id, city_id, amount_cents, fee_kept_cents, fee_waived_cents) values ($1::bigint, $2::bigint, $3::bigint, $4, $5, $6, $7)`,
        [rf, x.op, l.id, x.city, comprador ? l.t - q : l.t, comprador ? q : 0, comprador ? 0 : q]);
    }
  }
  // 6e · Al cancelar el organizador también vuelve un boleto ya usado (se devuelve todo); en el resto, solo los válidos.
  const u = x.estados === "vivos" ? await c.query(`update tickets set status = 'refunded' where id = any($1::bigint[]) and status in ('valid', 'used')`, [ids])
    : await c.query(`update tickets set status = 'refunded' where id = any($1::bigint[]) and status = 'valid'`, [ids]);
  if (u.rowCount !== ids.length) throw no("Esos boletos cambiaron mientras tanto. Actualiza la pantalla.", "Those tickets changed meanwhile. Refresh the screen.");
  await c.query(`insert into ticket_log (ticket_id, operation_id, city_id, kind, by_user, by_kind, reason) select id, operation_id, city_id, $2, $3, $4, $5 from tickets where id = any($1::bigint[])`,
    [ids, x.logKind, x.actor, x.byKind, x.motivo.slice(0, 300)]);
  await c.query(`insert into operation_events (operation_id, kind, actor, actor_id, note) values ($1::bigint, $2, $3, $4, $5::jsonb)`,
    [x.op, x.por === "buyer" ? "tickets_cancelled" : "tickets_refunded", x.por === "buyer" ? "user" : x.byKind === "staff" ? "admin" : x.byKind === "system" ? "system" : "business", x.actor,
      JSON.stringify({ es: `${ids.length} ${ids.length === 1 ? "boleto" : "boletos"} · se devuelven ${dinero(x.k.total)}`, en: `${ids.length} ${ids.length === 1 ? "ticket" : "tickets"} · ${dinero(x.k.total)} refunded` })]);
  return rf;
}

/* Paso 2: la devolución en Stripe (o el simulador) con su llave; idempotente (la misma llave nunca devuelve dos veces) y la marca 'done'
   una sola vez (update … where status = 'pending'). Si falla, queda pendiente y el barrido la reintenta. */
export async function ejecutarDevolucion(refundId: string): Promise<boolean> {
  const r = (await db().query<{ id: string; amt: number; idem: string; st: string; pi: string; pid: string; op: string; pg: boolean }>(
    `select r.id::text, r.amount_cents as amt, r.idem_key as idem, r.status as st, p.stripe_payment_intent as pi, p.id::text as pid, p.operation_id::text as op, p.transfer_group is not null as pg
       from refunds r join payments p on p.id = r.payment_id where r.id = $1::bigint`, [refundId])).rows[0];
  if (!r) return false;
  if (r.st !== "pending") return r.st === "done";
  const x = await pasarela.devolver(r.pi, r.amt, r.idem, { plataforma: r.pg }).catch(() => ({ ok: false as const, codigo: "error" }));
  if (!x.ok) {
    await db().query(`update refunds set attempts = least(10000, attempts + 1), last_error = left($2, 120) where id = $1::bigint and status = 'pending'`, [r.id, ("codigo" in x && x.codigo) || "error"]);
    return false;
  }
  await tx(async (c) => {
    const u = await c.query(`update refunds set status = 'done', stripe_refund_id = coalesce(stripe_refund_id, $2), done_at = now(), last_error = null where id = $1::bigint and status = 'pending'`, [r.id, x.id ?? null]);
    if (!u.rowCount) return;
    const p = (await c.query<{ status: string }>(
      `update payments set refunded_cents = refunded_cents + $2, status = case when refunded_cents + $2 >= amount_cents then 'refunded' else 'partially_refunded' end, updated_at = now()
        where id = $1::bigint returning status`, [r.pid, r.amt])).rows[0]!;
    await c.query(`update operations set pay_status = $2 where id = $1::bigint`, [r.op, p.status]);
    await c.query(`insert into operation_events (operation_id, kind, actor, note) values ($1::bigint, 'refunded', 'system', $2::jsonb)`, [r.op, JSON.stringify({ es: `Devolución de ${dinero(r.amt)} a la tarjeta`, en: `${dinero(r.amt)} refunded to the card` })]);
  });
  return true;
}
/* Barrido: reintenta las devoluciones de boletos pendientes (con la MISMA llave). */
export async function barrerDevolucionesBoletos(): Promise<number> {
  const L = (await db().query<{ id: string }>(
    `select r.id::text from refunds r where r.status = 'pending' and r.created_at < now() - interval '30 seconds' and exists (select 1 from ticket_refund_lines l where l.refund_id = r.id) order by r.created_at limit 50`)).rows;
  let n = 0;
  for (const r of L) if (await ejecutarDevolucion(r.id)) n++;
  return n;
}

/* 6e · Devolución TOTAL de una orden por un cambio del organizador (fase6 §3: cancelar la fecha o el evento → 100 % de cada boleto, mesa y
   extra; la comisión no se cobra y el costo de la tarjeta lo absorbe To'Latino, §6 #24; «Devolución total» ante un cambio de fecha, §6 #21).
   Va dentro de la transacción de quien llama, con la orden, el pago y los boletos bloqueados. Idempotente por `idem` (la misma llave = la
   misma devolución) y por boleto (ticket_refund_lines única); nunca más de lo que queda del cobro (se recorta y la base lo vuelve a
   impedir). Un cobro con disputa abierta o perdida no se devuelve aquí (el dinero ya va por el banco): sus boletos se anulan. */
export type DevTotal = { rf: string | null; total: number; n: number; holders: string[]; uid: string | null; ya?: true; disputa?: true };
export async function anotarDevolucionTotal(c: Q, x: { op: string; por: "event_cancelled" | "event_moved"; actor: string | null; byKind: "business" | "staff" | "system" | "user"; idem: string; motivo: string; usados: boolean; codes?: string[] }): Promise<DevTotal> {
  const o = (await c.query<{ id: string; city: string; uid: string; pid: string | null; pst: string | null; fee: number; amt: number; ya: number; disp: boolean }>(
    `select o.id::text, o.city_id as city, o.user_id::text as uid, p.id::text as pid, p.status as pst, coalesce(p.fee_cents, 0) as fee, coalesce(p.amount_cents, 0) as amt,
            coalesce((select sum(r.amount_cents) from refunds r where r.payment_id = p.id and r.status in ('pending', 'done')), 0)::int as ya,
            exists (select 1 from disputes d where d.payment_id = p.id and d.status in ('needs_response', 'under_review', 'lost', 'accepted')) as disp
       from operations o left join payments p on p.operation_id = o.id and p.kind = 'full'
      where o.id = $1::bigint and o.kind = 'tickets' and o.pay_mode = 'app' and o.status = 'confirmed' for update of o`, [x.op])).rows[0];
  const nada: DevTotal = { rf: null, total: 0, n: 0, holders: [], uid: o?.uid ?? null };
  if (!o) return nada;
  const ya = (await c.query<{ amt: number }>(`select amount_cents as amt from refunds where idem_key = $1`, [x.idem])).rows[0];
  if (ya) return { ...nada, total: ya.amt, ya: true };
  if (o.pid) await c.query(`select 1 from payments where id = $1::bigint for update`, [o.pid]);
  const sel = (await c.query<FilaDev>(`${SEL_DEV} where t.operation_id = $1::bigint and t.kind = 'paid' and t.status in (${x.usados ? "'valid', 'used'" : "'valid'"})
                                       ${x.codes ? "and t.code = any($2::text[])" : ""} order by t.id for update of t`, x.codes ? [x.op, x.codes] : [x.op])).rows;
  if (!sel.length) return nada;
  const holders = [...new Set(sel.map((b) => b.holder).filter((h): h is string => !!h))];
  // Una transferencia pendiente se cae: el boleto se devuelve a quien pagó.
  await c.query(`update ticket_transfers set status = 'cancelled', ended_at = now() where ticket_id = any($1::bigint[]) and status = 'pending'`, [sel.map((b) => b.id)]);
  const resto = Math.max(0, o.amt - o.ya);
  if (!o.pid || !["captured", "partially_refunded"].includes(o.pst ?? "") || o.disp || resto <= 0) {
    // Sin cobro que devolver (o el banco ya lo lleva): los boletos dejan de entrar, sin dinero.
    await c.query(`update tickets set status = 'void', void_reason = $2 where id = any($1::bigint[]) and status in ('valid', 'used')`,
      [sel.map((b) => b.id), o.disp ? "Evento cancelado · el cobro está en disputa con el banco" : x.motivo.slice(0, 300)]);
    await c.query(`insert into ticket_log (ticket_id, operation_id, city_id, kind, by_user, by_kind, reason) select id, operation_id, city_id, 'anulado', $2, $3, $4 from tickets where id = any($1::bigint[])`,
      [sel.map((b) => b.id), x.actor, x.byKind, x.motivo.slice(0, 300)]);
    return { ...nada, n: sel.length, holders, ...(o.disp ? { disputa: true as const } : {}) };
  }
  const k = await calcular(c, o.id, o.fee, sel, "business");
  // Nunca más de lo que queda del cobro (p. ej. To'Latino ya devolvió algo desde Ayuda): se recorta de lo último.
  let sobra = k.total - resto;
  if (sobra > 0 && k.extras) { const q = Math.min(sobra, k.extras.devuelve); k.extras.devuelve -= q; sobra -= q; }
  for (let i = k.boletos.length - 1; sobra > 0 && i >= 0; i--) { const b = k.boletos[i]!, q = Math.min(sobra, b.devuelve); b.devuelve -= q; sobra -= q; }
  k.total = Math.min(k.total, resto);
  const rf = await anotarDevolucion(c, { op: o.id, pid: o.pid, city: o.city, k, por: x.por, actor: x.actor, idem: x.idem, motivo: x.motivo, logKind: "devuelto", byKind: x.byKind, estados: x.usados ? "vivos" : "valid" });
  return { rf, total: k.total, n: sel.length, holders, uid: o.uid };
}

/* ── Cancelar mis boletos (el comprador) ── */
export async function cancelarBoletos(userId: string, numero: string, codesRaw: unknown, clave: string): Promise<Res<{ monto: number; ya?: true }>> {
  if (!NUM_B.test(String(numero))) return falla("Esa orden no existe.", "That order does not exist.");
  if (!UUID.test(String(clave))) return falla("Prueba de nuevo.", "Try again.");
  const codes = [...new Set((Array.isArray(codesRaw) ? codesRaw : []).map((x) => String(x).toUpperCase()).filter((x) => CODIGO_BOL.test(x)))].slice(0, 40);
  if (!codes.length) return falla("Elige qué boletos cancelas.", "Pick which tickets you cancel.");
  const idem = `bolcx-${clave}`;
  let hecho: { rf: string; fid: string; title: Bi; n: number; total: number; biz: string; num: string } | null = null;
  try {
    hecho = await tx(async (c) => {
      const o = (await c.query<{ id: string; city: string; fid: string; biz: string; title: Bi; abierto: boolean; pid: string | null; pst: string | null; fee: number }>(
        `select o.id::text, o.city_id as city, o.details->>'event_date_id' as fid, o.business_id as biz, e.title,
                (${EN_PIE}) and d.starts_at - make_interval(hours => ${cfgSql("bol_cancelar_h")}) > now() as abierto, p.id::text as pid, p.status as pst, coalesce(p.fee_cents, 0) as fee
           from operations o join event_dates d on d.id = (o.details->>'event_date_id')::bigint join events e on e.id = d.event_id left join payments p on p.operation_id = o.id and p.kind = 'full'
          where o.number = $1 and o.kind = 'tickets' and o.user_id = $2 and o.pay_mode = 'app' and o.status = 'confirmed' for update of o`, [numero, userId])).rows[0];
      if (!o) throw no("Esa orden no existe.", "That order does not exist.");
      // Doble toque (o la red repite): la misma llave ya hizo su devolución.
      const ya = (await c.query<{ amt: number }>(`select amount_cents as amt from refunds where idem_key = $1`, [idem])).rows[0];
      if (ya) return { rf: "", fid: o.fid, title: o.title, n: 0, total: ya.amt, biz: o.biz, num: numero };
      if (!o.pid || !["captured", "partially_refunded"].includes(o.pst ?? "")) throw no("Esta orden no tiene un cobro que devolver.", "This order has no charge to refund.");
      if (!o.abierto) throw no("Ya no se puede cancelar con devolución: faltan menos horas de las que dice la política. Todavía puedes transferirlo.", "You can no longer cancel with a refund: it is past the policy window. You can still transfer it.");
      const sel = (await c.query<FilaDev>(`${SEL_DEV} where t.operation_id = $1::bigint and t.code = any($2::text[]) and t.holder_user_id = $3 order by t.id for update of t`, [o.id, codes, userId])).rows;
      if (sel.length !== codes.length) throw no("Uno de esos boletos ya no es tuyo o no es de esta orden.", "One of those tickets is no longer yours or is not in this order.");
      if (sel.some((b) => b.st === "used")) throw no("Un boleto usado no se devuelve.", "A used ticket is not refunded.");
      if (sel.some((b) => b.st !== "valid" || b.kind !== "paid")) throw no("Uno de esos boletos ya se canceló, se devolvió o se transfirió.", "One of those tickets was already cancelled, refunded or transferred.");
      if (sel.some((b) => b.pend)) throw no("Uno de esos boletos va en camino a otra persona. Deshaz la transferencia primero.", "One of those tickets is on its way to someone. Undo the transfer first.");
      const k = await calcular(c, o.id, o.fee, sel, "buyer");
      if (!(k.total > 0)) throw no("Ese boleto no tiene nada que devolver (su precio es el cargo de servicio). Puedes transferirlo.", "That ticket has nothing to refund (its price is the service fee). You can transfer it.");
      const rf = await anotarDevolucion(c, { op: o.id, pid: o.pid, city: o.city, k, por: "buyer", actor: userId, idem, motivo: "Cancelado por el comprador", logKind: "cancelado", byKind: "user" });
      return { rf, fid: o.fid, title: o.title, n: sel.length, total: k.total, biz: o.biz, num: numero };
    });
  } catch (e) {
    if (e instanceof Error && /devolucion_de_mas|devolucion_sin_cobro/.test(e.message)) return falla("Esta orden ya no tiene tanto por devolver.", "This order no longer has that much to refund.");
    if (e instanceof Error && (e as { code?: string }).code === "23505") return { ok: true, monto: 0, ya: true }; // la misma llave, a la vez
    return atrapa(e);
  }
  if (!hecho.rf) return { ok: true, monto: hecho.total, ya: true };
  await ejecutarDevolucion(hecho.rf);
  const { avisar, avisarNegocio } = await import("./avisos");
  await avisar(userId, "bol_cancelado", { evento: hecho.title.es, cuantos: cuantosL(hecho.n, false, 1), monto: dinero(hecho.total) }, { href: `/eventos/orden/${numero}`, ref: ["tickets", numero] });
  await avisarNegocio(hecho.biz, "evt_devolucion", { evento: hecho.title.es, cuantos: cuantosL(hecho.n, false, 1), num: numero }, { href: `/panel/${hecho.biz}/eventos`, ref: ["tickets", numero] });
  await (await import("./espera")).ofrecer(hecho.fid).catch(() => 0);
  return { ok: true, monto: hecho.total };
}

/* ── «Devolver» desde el panel (el organizador): total o por boleto, 100 %; nunca un boleto usado. ── */
export async function devolverDesdePanel(negocio: string, actorId: string, numero: string, codesRaw: unknown, clave: string): Promise<Res<{ monto: number }>> {
  if (!NUM_B.test(String(numero))) return falla("Esa orden no existe.", "That order does not exist.");
  if (!UUID.test(String(clave))) return falla("Prueba de nuevo.", "Try again.");
  const codes = [...new Set((Array.isArray(codesRaw) ? codesRaw : []).map((x) => String(x).toUpperCase()).filter((x) => CODIGO_BOL.test(x)))].slice(0, 40);
  if (!codes.length) return falla("Elige qué boletos devuelves.", "Pick which tickets you refund.");
  const idem = `bolneg-${clave}`;
  let hecho: { rf: string; fid: string; title: Bi; n: number; total: number; uid: string; org: string; holders: string[] } | null = null;
  try {
    hecho = await tx(async (c) => {
      const o = (await c.query<{ id: string; city: string; fid: string; uid: string; title: Bi; org: string; pid: string | null; pst: string | null; fee: number }>(
        `select o.id::text, o.city_id as city, o.details->>'event_date_id' as fid, o.user_id::text as uid, e.title, b.name as org, p.id::text as pid, p.status as pst, coalesce(p.fee_cents, 0) as fee
           from operations o join event_dates d on d.id = (o.details->>'event_date_id')::bigint join events e on e.id = d.event_id join businesses b on b.id = o.business_id
           left join payments p on p.operation_id = o.id and p.kind = 'full'
          where o.number = $1 and o.kind = 'tickets' and o.business_id = $2 and o.pay_mode = 'app' and o.status = 'confirmed' for update of o`, [numero, negocio])).rows[0];
      if (!o) throw no("Esa orden no existe.", "That order does not exist.");
      const ya = (await c.query<{ amt: number }>(`select amount_cents as amt from refunds where idem_key = $1`, [idem])).rows[0];
      if (ya) return { rf: "", fid: o.fid, title: o.title, n: 0, total: ya.amt, uid: o.uid, org: o.org, holders: [] };
      if (!o.pid || !["captured", "partially_refunded"].includes(o.pst ?? "")) throw no("Esta orden no tiene un cobro que devolver.", "This order has no charge to refund.");
      const sel = (await c.query<FilaDev>(`${SEL_DEV} where t.operation_id = $1::bigint and t.code = any($2::text[]) order by t.id for update of t`, [o.id, codes])).rows;
      if (sel.length !== codes.length) throw no("Uno de esos boletos no es de esta orden.", "One of those tickets is not in this order.");
      if (sel.some((b) => b.st === "used")) throw no("Un boleto usado no se devuelve.", "A used ticket is not refunded.");
      if (sel.some((b) => b.st !== "valid" || b.kind !== "paid")) throw no("Uno de esos boletos ya se devolvió, se anuló o se transfirió.", "One of those tickets was already refunded, voided or transferred.");
      // Una transferencia pendiente se cae: el boleto se devuelve.
      await c.query(`update ticket_transfers set status = 'cancelled', ended_at = now() where ticket_id = any($1::bigint[]) and status = 'pending'`, [sel.map((b) => b.id)]);
      const k = await calcular(c, o.id, o.fee, sel, "business");
      const rf = await anotarDevolucion(c, { op: o.id, pid: o.pid, city: o.city, k, por: "business", actor: actorId, idem, motivo: "Devuelto por el organizador", logKind: "devuelto", byKind: "business" });
      return { rf, fid: o.fid, title: o.title, n: sel.length, total: k.total, uid: o.uid, org: o.org, holders: [...new Set(sel.map((b) => b.holder).filter((h): h is string => !!h && h !== o.uid))] };
    });
  } catch (e) {
    if (e instanceof Error && /devolucion_de_mas|devolucion_sin_cobro/.test(e.message)) return falla("Esta orden ya no tiene tanto por devolver.", "This order no longer has that much to refund.");
    if (e instanceof Error && (e as { code?: string }).code === "23505") return { ok: true, monto: 0 };
    return atrapa(e);
  }
  if (!hecho.rf) return { ok: true, monto: hecho.total };
  await ejecutarDevolucion(hecho.rf);
  const { avisar } = await import("./avisos");
  await avisar(hecho.uid, "bol_devuelto", { negocio: hecho.org, monto: dinero(hecho.total), evento: hecho.title.es, cuantos: cuantosL(hecho.n, false, 1) }, { href: `/eventos/orden/${numero}`, ref: ["tickets", numero] });
  for (const h of hecho.holders) await avisar(h, "bol_anulado", { codigo: "", evento: hecho.title.es, motivo: "El organizador devolvió este boleto a quien lo pagó" }, { href: "/cuenta/boletos", ref: ["tickets", numero] });
  await (await import("./espera")).ofrecer(hecho.fid).catch(() => 0);
  return { ok: true, monto: hecho.total };
}

/* ── Cortesías (Panel › Dar cortesía, evCompDet): nombre, teléfono opcional, cuántas (1–10); el tipo de boleto del que salen. ── */
export async function darCortesia(negocio: string, actorId: string, eventoId: string, x: { nombre?: unknown; tel?: unknown; q?: unknown; tipo?: unknown }): Promise<Res<{ numero: string; sms: boolean }>> {
  if (!ID.test(String(eventoId))) return falla("Ese evento no existe.", "That event does not exist.");
  const nombre = limpiarNombre(x?.nombre);
  if (nombre.length < 2) return falla("Escribe a nombre de quién va.", "Write who it is for.");
  const telTxt = String(x?.tel ?? "").trim(), tel = telTxt ? normalizarTelefono(telTxt) : null;
  if (telTxt && !tel) return falla("El teléfono es de 10 dígitos (o déjalo vacío).", "The phone is 10 digits (or leave it empty).");
  const q = Math.floor(Number(x?.q));
  if (!(q >= 1 && q <= 10)) return falla("De 1 a 10 entradas por cortesía.", "1 to 10 entries per comp.");
  const tipo = x?.tipo != null && ID.test(String(x.tipo)) ? String(x.tipo) : null;
  const { cifrar, huella } = await import("./cifrado");
  const token = randomBytes(24).toString("base64url");
  let r: { numero: string; city: string; title: Bi; dia: string; h0: number; org: string; xid: string | null };
  try {
    r = await tx(async (c) => {
      const d = (await c.query<{ fid: string; eid: string; city: string; title: Bi; dia: string; h0: number; org: string; venue: string }>(
        `select d.id::text as fid, e.id::text as eid, d.city_id as city, e.title, d.local_date::text as dia, ${H0("d")} as h0, b.name as org, case when e.venue_mode = 'other' then e.venue_name else b.name end as venue
           from events e join event_dates d on d.event_id = e.id join businesses b on b.id = e.business_id join cities ci on ci.id = d.city_id
          where e.id = $1::bigint and e.business_id = $2 and e.entry = 'tickets' and ${EN_PIE} order by d.starts_at limit 1`, [eventoId, negocio])).rows[0];
      if (!d) throw no("Las cortesías se dan para una fecha publicada que no ha pasado.", "Comps are given for a published date that has not passed.");
      // Tope por fecha: la fila de la fecha bloqueada (dos cortesías a la vez no pasan del tope).
      await c.query(`select 1 from event_dates where id = $1::bigint for update`, [d.fid]);
      const k0 = (await c.query<{ n: number; max: number }>(`select coalesce(sum(admits), 0)::int as n, ${cfgSql("evt_cortesias_max")} as max from tickets where event_date_id = $1::bigint and kind = 'comp' and status in ('valid', 'used')`, [d.fid])).rows[0]!;
      const ya = k0.n;
      if (ya + q > k0.max) throw no(`Hasta ${k0.max} cortesías por fecha (ya diste ${ya}).`, `Up to ${k0.max} comps per date (you gave ${ya}).`);
      const t = (await c.query<{ id: string }>(
        `select t.id::text from ticket_types t join ticket_stock s on s.ticket_type_id = t.id and s.event_date_id = $2::bigint where t.event_id = $1::bigint and not t.off and ($3::bigint is null or t.id = $3::bigint) order by t.sort, t.id limit 1`,
        [d.eid, d.fid, tipo])).rows[0];
      if (!t) throw no("Ese boleto no existe en este evento.", "That ticket does not exist in this event.");
      // Cuentan en el aforo: toman existencia con el mismo update condicional que una venta.
      const u = await c.query(`update ticket_stock set sold_n = sold_n + $3, updated_at = now() where ticket_type_id = $1::bigint and event_date_id = $2::bigint and sold_n + held_n + $3 <= quantity`, [t.id, d.fid, q]);
      if (!u.rowCount) throw no("No quedan boletos de ese tipo para cortesías. Sube la cantidad en el editor.", "No tickets of that type left for comps. Raise the quantity in the editor.");
      const numero = `B-${(await c.query<{ n: string }>(`select nextval('ticket_order_seq')::text as n`)).rows[0]!.n}`;
      const op = (await c.query<{ id: string }>(
        `insert into operations (number, kind, city_id, business_id, user_id, status, details, subtotal_cents, total_cents, pay_mode, confirmed_at, client_key, is_test)
         values ($1, 'tickets', $2, $3, $4, 'confirmed', $5::jsonb, 0, 0, 'none', now(), $6::uuid, $7) returning id::text`,
        [numero, d.city, negocio, actorId, JSON.stringify({ comp: true, comp_name: nombre, event_id: d.eid, event_date_id: d.fid, title: d.title, venue: d.venue, local_date: d.dia, h0: d.h0 }), randomUUID(),
          (await import("./entorno")).ENTORNO !== "produccion"])).rows[0]!.id;
      const enc = tel ? cifrar(tel) : null;
      const T = (await c.query<{ id: string }>(
        `insert into tickets (event_date_id, event_id, city_id, ticket_type_id, operation_id, holder_user_id, admits, kind, price_cents, fee_cents, discount_cents, comp_name, comp_phone_enc, comp_by)
         select $1::bigint, $2::bigint, $3, $4::bigint, $5::bigint, null, 1, 'comp', 0, 0, 0, $6, $7, $8 from generate_series(1, $9::int) returning id::text`,
        [d.fid, d.eid, d.city, t.id, op, nombre, enc, actorId, q])).rows;
      await c.query(`insert into ticket_log (ticket_id, operation_id, city_id, kind, by_user, by_kind, reason) select id, operation_id, city_id, 'cortesia', $2, 'business', $3 from tickets where operation_id = $1::bigint`, [op, actorId, nombre]);
      await c.query(`insert into operation_events (operation_id, kind, actor, actor_id, note) values ($1::bigint, 'comp_given', 'business', $2, $3::jsonb)`, [op, actorId, JSON.stringify({ es: `Cortesía para ${nombre} · ${q}`, en: `Comp for ${nombre} · ${q}` })]);
      let xid: string | null = null;
      if (tel) {
        xid = (await c.query<{ id: string }>(
          `insert into ticket_transfers (kind, ticket_id, operation_id, event_date_id, city_id, from_user_id, to_phone_enc, to_phone_hash, to_last2, claim_hash, expires_at)
           select 'comp', $1::bigint, $2::bigint, $3::bigint, $4, $5, $6, $7, $8, $9, d.ends_at from event_dates d where d.id = $3::bigint returning id::text`,
          [T[0]!.id, op, d.fid, d.city, actorId, enc, huella(tel), tel.slice(-2), sha(token)])).rows[0]!.id;
      }
      return { numero, city: d.city, title: d.title, dia: d.dia, h0: d.h0, org: d.org, xid };
    });
  } catch (e) { return atrapa(e); }
  if (tel && r.xid) {
    const { avisarTelefono } = await import("./avisos");
    await avisarTelefono(tel, "bol_cortesia", { negocio: r.org, cuantos: q === 1 ? "1 entrada" : `${q} entradas`, evento: r.title.es, cuando: `${diaCorto(r.dia, true)} · ${hora(r.h0)}`, enlace: `${await base()}/eventos/recibir/${token}` },
      { href: `/eventos/recibir/${token}`, ref: ["ticket_transfer", r.xid], city: r.city });
  }
  return { ok: true, numero: r.numero, sms: !!tel };
}

/* Quitar una cortesía (antes de usarla): sus boletos se anulan y el lugar vuelve (la base lo suelta). */
export async function quitarCortesia(negocio: string, actorId: string, numero: string): Promise<Res> {
  if (!NUM_B.test(String(numero))) return falla("Esa cortesía no existe.", "That comp does not exist.");
  try {
    await tx(async (c) => {
      const o = (await c.query<{ id: string }>(`select id::text from operations where number = $1 and business_id = $2 and kind = 'tickets' and pay_mode = 'none' for update`, [numero, negocio])).rows[0];
      if (!o) throw no("Esa cortesía no existe.", "That comp does not exist.");
      const L = (await c.query<{ id: string }>(`update tickets set status = 'void', void_reason = 'El organizador quitó la cortesía' where operation_id = $1::bigint and kind = 'comp' and status = 'valid' returning id::text`, [o.id])).rows;
      if (!L.length) throw no("Esa cortesía ya se usó o ya se quitó.", "That comp was already used or removed.");
      await c.query(`update ticket_transfers set status = 'cancelled', ended_at = now() where operation_id = $1::bigint and status = 'pending'`, [o.id]);
      await c.query(`insert into ticket_log (ticket_id, operation_id, city_id, kind, by_user, by_kind, reason) select id, operation_id, city_id, 'anulado', $2, 'business', 'Cortesía quitada' from tickets where id = any($1::bigint[])`, [L.map((x) => x.id), actorId]);
    });
    return { ok: true };
  } catch (e) { return atrapa(e); }
}

/* ── Lo que ve el panel de una fecha: cortesías, devoluciones y transferencias (sin teléfonos) ── */
export type DespuesPanel = {
  cortesias: { num: string; nombre: string; q: number; vivas: number; usadas: number; sms: "pendiente" | "recibida" | "vencida" | null; at: string }[];
  cortesiasTope: number; cortesiasDadas: number;
  devoluciones: { num: string; quien: string; monto: number; boletos: number; por: "buyer" | "business"; estado: string; at: string }[];
  transferidos: number; pendientes: number;
  ayudas: { num: string; orden: string; quien: string; motivo: string; estado: string; at: string }[];
};
export async function despuesPanel(negocio: string, eventoId: string): Promise<DespuesPanel | null> {
  if (!ID.test(eventoId)) return null;
  const e = (await db().query(`select 1 from events where id = $1::bigint and business_id = $2`, [eventoId, negocio])).rowCount;
  if (!e) return null;
  const [C, D, X, A, K] = await Promise.all([
    db().query<{ num: string; nombre: string; q: number; vivas: number; usadas: number; sms: string | null; at: string }>(
      `select o.number as num, o.details->>'comp_name' as nombre, count(t.id)::int as q, count(t.id) filter (where t.status = 'valid')::int as vivas, count(t.id) filter (where t.status = 'used')::int as usadas,
              (select case x.status when 'pending' then 'pendiente' when 'claimed' then 'recibida' when 'expired' then 'vencida' end from ticket_transfers x where x.operation_id = o.id and x.kind = 'comp' order by x.id desc limit 1) as sms,
              ${ISO("o.sent_at")} as at
         from operations o join tickets t on t.operation_id = o.id where o.kind = 'tickets' and o.pay_mode = 'none' and o.business_id = $2 and (o.details->>'event_id')::bigint = $1::bigint
        group by o.id order by o.id desc limit 60`, [eventoId, negocio]),
    db().query<{ num: string; quien: string; monto: number; boletos: number; por: "buyer" | "business"; estado: string; at: string }>(
      `select o.number as num, ${QUIEN("u")} as quien, r.amount_cents as monto, (select count(*)::int from ticket_refund_lines l where l.refund_id = r.id and l.ticket_id is not null) as boletos,
              r.initiated_by as por, r.status as estado, ${ISO("r.created_at")} as at
         from refunds r join payments p on p.id = r.payment_id join operations o on o.id = p.operation_id join users u on u.id = o.user_id
        where o.kind = 'tickets' and o.business_id = $2 and (o.details->>'event_id')::bigint = $1::bigint order by r.id desc limit 60`, [eventoId, negocio]),
    db().query<{ hechas: number; pend: number }>(
      `select count(*) filter (where x.status = 'claimed')::int as hechas, count(*) filter (where x.status = 'pending')::int as pend from ticket_transfers x join tickets t on t.id = x.ticket_id
        where x.kind = 'transfer' and t.event_id = $1::bigint`, [eventoId]),
    db().query<{ num: string; orden: string; quien: string; motivo: string; estado: string; at: string }>(
      `select h.number as num, o.number as orden, ${QUIEN("u")} as quien, h.reason as motivo, h.status as estado, ${ISO("h.created_at")} as at
         from help_requests h join operations o on o.id = h.operation_id join users u on u.id = h.user_id
        where o.kind = 'tickets' and o.business_id = $2 and (o.details->>'event_id')::bigint = $1::bigint order by h.id desc limit 30`, [eventoId, negocio]),
    db().query<{ n: number }>(`select coalesce(sum(t.admits), 0)::int as n from tickets t join event_dates d on d.id = t.event_date_id where t.event_id = $1::bigint and t.kind = 'comp' and t.status in ('valid', 'used') and d.ends_at > now()`, [eventoId]),
  ]);
  return {
    cortesias: C.rows.map((x) => ({ ...x, sms: x.sms as DespuesPanel["cortesias"][number]["sms"] })), cortesiasTope: (await valores("evt_cortesias_max")).evt_cortesias_max, cortesiasDadas: K.rows[0]!.n,
    devoluciones: D.rows, transferidos: X.rows[0]!.hechas, pendientes: X.rows[0]!.pend, ayudas: A.rows,
  };
}
/* Los boletos de una orden para «Devolver» en el panel (código, tipo, estado; quién lo tiene solo nombre + inicial). */
export async function boletosOrdenPanel(negocio: string, numero: string): Promise<{ code: string; tipo: string; precio: number; estado: string; quien: string }[]> {
  if (!NUM_B.test(numero)) return [];
  return (await db().query<{ code: string; tipo: string; precio: number; estado: string; quien: string }>(
    `select t.code, coalesce(tt.name->>'es', et.zone->>'es', '') as tipo, t.price_cents as precio, t.status as estado, ${QUIEN("u")} as quien
       from tickets t join operations o on o.id = t.operation_id left join users u on u.id = t.holder_user_id left join ticket_types tt on tt.id = t.ticket_type_id left join event_tables et on et.id = t.table_id
      where o.number = $1 and o.business_id = $2 and o.kind = 'tickets' and o.pay_mode = 'app' and t.status <> 'replaced' order by t.table_id nulls first, t.id`, [numero, negocio])).rows;
}
