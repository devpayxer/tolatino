import "server-only";
import type { PoolClient } from "pg";
import { auditar, type Staff } from "./admin";
import { RUTA_AVISO } from "./apelaciones";
import { avisarNegocio } from "./avisos";
import { cfgSql, valor } from "./config";
import { db, tx } from "./db";
import { aBorrador, aplicarPendiente, filaEvento, registrar } from "./evt";
import { EVT_NO, cambiosQueImportan, type Bi, type BorradorEvt, type EstadoEvt, type FormatoKey } from "./evt-comun";

/* 6a · Revisión de eventos y organizadores (Super Admin › Eventos y boletos, Colas › Eventos a revisar; adm-data.js QUEUES evt,
   TPL.evtNo, secEvt Organizadores). Cada decisión: el permiso lo revisa quien llama (app/admin/acciones-eventos.ts), aquí la fila
   bloqueada, el estado que se puede decidir, la auditoría con antes → después y el motivo, el libro event_review_log (solo inserción),
   el caso de la cola cerrado y el aviso al negocio (con el motivo; ocultar y bloquear llevan a apelar). Nada se borra. */
type Q = Pick<PoolClient, "query">;
type R = { err: string | null };
const ID = /^\d{1,18}$/, NEG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const motivoDe = (razon: string | null, nota: string) => {
  const r = EVT_NO.find((x) => x.k === razon);
  return [r && r.k !== "otro" ? r.es : "", nota.trim()].filter(Boolean).join(": ").slice(0, 500);
};
async function cerrarCaso(c: Q, id: string, decision: string, motivo: string, staffId: string) {
  await c.query(`update queue_items set status = 'decided', decision = $2, reason = $3, decided_by = $4, decided_at = now() where queue = 'evt' and subject_kind = 'event' and subject_id = $1 and status = 'open'`, [id, decision, motivo || null, staffId]);
}
const titulo = (e: { title: Bi }) => e.title.es;
const panel = (negocio: string, id: string) => `/panel/${negocio}/eventos?det=evt:${id}`;

/* Avisos de lo que To'Latino oculta o bloquea: siempre con el motivo y la ruta para apelar (guardián ocultarAvisaYApela). */
export async function avisarEvtOculto(negocio: string, id: string, evento: string, motivo: string) {
  await avisarNegocio(negocio, "evt_oculto", { evento, motivo: motivo.slice(0, 160) }, { href: RUTA_AVISO("event", id), ref: ["event", id] }).catch(() => undefined);
}
export async function avisarOrgBloqueado(negocio: string, nombre: string, motivo: string) {
  await avisarNegocio(negocio, "evt_bloqueado", { negocio: nombre, motivo: motivo.slice(0, 160) }, { href: RUTA_AVISO("evt_org", negocio), ref: ["business", negocio] }).catch(() => undefined);
}

export type Decision = "aprobar" | "cambios" | "rechazar";
/* Aprobar · Pedir cambios · No aprobar. Sirve igual para un evento nuevo (status review) y para un cambio que importa (pending review). */
export async function decidirEvento(s: Staff, id: string, d: Decision, razon: string | null, nota: string): Promise<R> {
  if (!ID.test(id)) return { err: "Ese evento no existe." };
  const motivo = motivoDe(razon, nota);
  if (d !== "aprobar" && motivo.length < 3) return { err: "Escribe el motivo: el negocio lo recibe tal cual." };
  if (razon && !EVT_NO.some((x) => x.k === razon)) return { err: "Ese motivo no existe." };
  const r = await tx(async (c): Promise<R & { aviso?: [string, string, string, string, string] }> => {
    const e = await filaEvento(c, id, null, true);
    if (!e || (s.cities.length && !s.cities.includes(e.city_id))) return { err: "Ese evento no existe." };
    const nuevo = e.status === "review", cambio = e.pending_status === "review";
    if (!nuevo && !cambio) return { err: "Este evento ya se decidió." };
    const antes = { estado: nuevo ? "En revisión" : "Cambio en revisión" };
    if (nuevo) {
      if (d === "aprobar") await c.query(`update events set status = 'live', approved_at = now(), approved_by = $2, reviewed_at = now(), reviewed_by = $2, review_note = null, review_reason_key = null where id = $1::bigint`, [id, s.id]);
      else await c.query(`update events set status = $3, reviewed_at = now(), reviewed_by = $2, review_note = $4, review_reason_key = $5 where id = $1::bigint`, [id, s.id, d === "cambios" ? "changes" : "rejected", motivo, razon]);
    } else if (d === "aprobar") {
      await aplicarPendiente(c as PoolClient, id);
      await c.query(`update events set reviewed_at = now(), reviewed_by = $2 where id = $1::bigint`, [id, s.id]);
    } else {
      await c.query(`update events set pending_status = $2, pending_note = $3, reviewed_at = now(), reviewed_by = $4 where id = $1::bigint`, [id, d === "cambios" ? "changes" : "rejected", motivo, s.id]);
    }
    await registrar(c, id, d === "aprobar" ? "approved" : d === "cambios" ? "changes" : "rejected", "staff", s.id, razon, motivo || null);
    await cerrarCaso(c, id, d, motivo, s.id);
    const despues = { estado: d === "aprobar" ? "Publicado" : d === "cambios" ? "Cambios pedidos" : nuevo ? "No aprobado" : "Cambio no aprobado (sigue la versión anterior)" };
    await auditar(c as PoolClient, { actor: s.id, action: `evt.${d}`, targetKind: "event", targetId: id, city: e.city_id, before: antes, after: despues, reason: motivo || "Cumple las reglas" });
    const tpl = d === "aprobar" ? "evt_aprobado" : d === "cambios" ? "evt_cambios" : "evt_rechazado";
    return { err: null, aviso: [e.business_id, tpl, titulo(e), motivo, nuevo && d === "rechazar" ? RUTA_AVISO("event", id) : panel(e.business_id, id)] };
  });
  // 8g · Aprobar un cambio (nombre, lugar) o rechazar ya tocó los pases de Wallet en la transacción (trigger de 0129): que salga ya.
  if (!r.err) (await import("./pases/pronto")).pasesPronto();
  if (!r.err && r.aviso) {
    const [neg, tpl, evento, motivo, href] = r.aviso;
    // Un cambio no aprobado no se apela (la versión publicada sigue): el aviso lleva al panel para corregirlo.
    await avisarNegocio(neg, tpl, { evento, motivo: motivo.slice(0, 160) }, { href, ref: ["event", id] }).catch(() => undefined);
  }
  return { err: r.err };
}

/* Ocultar del módulo / volver a mostrar (aparte del estado: volver a mostrar devuelve lo que era). */
export async function ocultarEvento(s: Staff, id: string, ocultar: boolean, motivo: string): Promise<R> {
  if (!ID.test(id)) return { err: "Ese evento no existe." };
  const m = motivo.trim().slice(0, 500);
  if (m.length < 3) return { err: "Escribe el motivo." };
  const r = await tx(async (c): Promise<R & { neg?: string; t?: string }> => {
    const e = await filaEvento(c, id, null, true);
    if (!e || (s.cities.length && !s.cities.includes(e.city_id))) return { err: "Ese evento no existe." };
    if (ocultar === !!e.hidden_at) return { err: ocultar ? "Ya está oculto." : "Ya se ve." };
    if (ocultar) await c.query(`update events set hidden_at = now(), hidden_by = $2, hidden_reason = $3 where id = $1::bigint`, [id, s.id, m]);
    else await c.query(`update events set hidden_at = null, hidden_by = null, hidden_reason = null where id = $1::bigint`, [id]);
    await auditar(c as PoolClient, { actor: s.id, action: ocultar ? "evt.ocultar" : "evt.mostrar", targetKind: "event", targetId: id, city: e.city_id,
      before: { visible: ocultar ? "Sí" : "No" }, after: { visible: ocultar ? "No · oculto por To'Latino" : "Sí" }, reason: m });
    return { err: null, neg: e.business_id, t: titulo(e) };
  });
  if (r.err || !r.neg) return { err: r.err };
  if (ocultar) await avisarEvtOculto(r.neg, id, r.t!, m);
  else await avisarNegocio(r.neg, "evt_visible", { evento: r.t! }, { href: panel(r.neg, id), ref: ["event", id] }).catch(() => undefined);
  return { err: null };
}

/* Organizadores: verificado (publica sin revisión previa) y bloqueado (no publica; aviso con motivo y apelación). */
export async function organizadorPaso(s: Staff, negocio: string, paso: "verificar" | "quitar_verificado" | "bloquear" | "desbloquear", motivo: string): Promise<R> {
  if (!NEG.test(negocio)) return { err: "Ese negocio no existe." };
  const m = motivo.trim().slice(0, 500);
  if (m.length < 3) return { err: "Escribe el motivo." };
  const r = await tx(async (c): Promise<R & { nombre?: string }> => {
    const b = (await c.query<{ name: string; city_id: string }>(`select name, city_id from businesses where id = $1`, [negocio])).rows[0];
    if (!b || (s.cities.length && !s.cities.includes(b.city_id))) return { err: "Ese negocio no existe." };
    await c.query(`insert into event_organizers (business_id, city_id) values ($1, $2) on conflict (business_id) do nothing`, [negocio, b.city_id]);
    const o = (await c.query<{ v: boolean; bl: boolean }>(`select verified_at is not null as v, blocked_at is not null as bl from event_organizers where business_id = $1 for update`, [negocio])).rows[0]!;
    if (paso === "verificar" && (o.v || o.bl)) return { err: o.bl ? "Está bloqueado: primero permite que publique." : "Ya está verificado." };
    if (paso === "quitar_verificado" && !o.v) return { err: "No está verificado." };
    if (paso === "bloquear" && o.bl) return { err: "Ya está bloqueado." };
    if (paso === "desbloquear" && !o.bl) return { err: "No está bloqueado." };
    if (paso === "verificar") await c.query(`update event_organizers set verified_at = now(), verified_by = $2, updated_at = now() where business_id = $1`, [negocio, s.id]);
    if (paso === "quitar_verificado") await c.query(`update event_organizers set verified_at = null, verified_by = null, updated_at = now() where business_id = $1`, [negocio]);
    if (paso === "bloquear") await c.query(`update event_organizers set blocked_at = now(), blocked_by = $2, blocked_reason = $3, verified_at = null, verified_by = null, updated_at = now() where business_id = $1`, [negocio, s.id, m]);
    if (paso === "desbloquear") await c.query(`update event_organizers set blocked_at = null, blocked_by = null, blocked_reason = null, updated_at = now() where business_id = $1`, [negocio]);
    const L: Record<typeof paso, [string, string]> = { verificar: ["Sin verificar", "Verificado"], quitar_verificado: ["Verificado", "Sin verificar"], bloquear: [o.v ? "Verificado" : "Publica con revisión", "Bloqueado"], desbloquear: ["Bloqueado", "Publica con revisión"] };
    await auditar(c as PoolClient, { actor: s.id, action: `evt.organizador.${paso}`, targetKind: "business", targetId: negocio, city: b.city_id, before: { organizador: L[paso][0] }, after: { organizador: L[paso][1] }, reason: m });
    return { err: null, nombre: b.name };
  });
  if (r.err || !r.nombre) return { err: r.err };
  if (paso === "bloquear") await avisarOrgBloqueado(negocio, r.nombre, m);
  if (paso === "desbloquear") await avisarNegocio(negocio, "evt_desbloqueado", { negocio: r.nombre }, { href: `/panel/${negocio}/eventos`, ref: ["business", negocio] }).catch(() => undefined);
  if (paso === "verificar") await avisarNegocio(negocio, "evt_verificado", { negocio: r.nombre }, { href: `/panel/${negocio}/eventos`, ref: ["business", negocio] }).catch(() => undefined);
  return { err: null };
}

/* ── Lo que ve el Super Admin ── */
export type FiltrosEvt = { tab: "list" | "org" | "bol"; q: string; chips: string[]; antes: string | null };
export const CHIPS_EVT = ["rev", "hoy", "paid", "free", "hid"] as const;
export function leerFiltrosEvt(sp: Record<string, string | undefined>): FiltrosEvt {
  return { tab: sp.tab === "org" ? "org" : sp.tab === "bol" ? "bol" : "list", q: String(sp.q ?? "").trim().slice(0, sp.tab === "bol" ? 200 : 60), chips: String(sp.f ?? "").split(",").filter((x) => (CHIPS_EVT as readonly string[]).includes(x)), antes: /^\d{1,18}$/.test(sp.antes ?? "") ? sp.antes! : null };
}
export type FilaEvtAdm = { id: string; t: Bi; fmt: FormatoKey; st: EstadoEvt; hidden: boolean; pending: string | null; dia: string; h0: number; venue: string; org: string; orgId: string; entrada: string; foto: string | null; ciudad: string;
  kind: "single" | "series" | "span"; rep: import("./evt-comun").Repite | null; span: number; nf: number };
export const POR_PAGINA_EVT = 20;
export async function listaEventosAdmin(s: Staff, f: FiltrosEvt) {
  const w: string[] = ["(cardinality($1::text[]) = 0 or e.city_id = any($1::text[]))", "e.status <> 'draft'"], p: unknown[] = [s.cities];
  if (f.q) { p.push(`%${f.q}%`); w.push(`(e.title->>'es' ilike $${p.length} or e.title->>'en' ilike $${p.length} or b.name ilike $${p.length} or coalesce(e.venue_name, '') ilike $${p.length})`); }
  if (f.chips.includes("rev")) w.push("(e.status = 'review' or e.pending_status = 'review')");
  if (f.chips.includes("hoy")) w.push("e.start_date = (now() at time zone c.timezone)::date");
  if (f.chips.includes("paid")) w.push("e.entry = 'tickets'");
  if (f.chips.includes("free")) w.push("e.entry <> 'tickets'");
  w.push(f.chips.includes("hid") ? "(e.hidden_at is not null or e.status in ('cancelled', 'rejected'))" : "e.hidden_at is null");
  const base = `from events e join businesses b on b.id = e.business_id join cities c on c.id = e.city_id where ${w.join(" and ")}`;
  const pc = [...p];
  if (f.antes) { p.push(f.antes); w.push(`e.id < $${p.length}::bigint`); }
  const [L, N, K] = await Promise.all([
    db().query<FilaEvtAdm>(
      `select e.id::text, e.title as t, e.format as fmt, e.status as st, e.hidden_at is not null as hidden, e.pending_status as pending, e.start_date::text as dia, e.start_min as h0,
              coalesce(e.venue_name, b.name) as venue, b.name as org, b.id as "orgId", e.entry as entrada, c.name as ciudad, e.kind, e.rep, e.span_days as span,
              (select count(*)::int from event_dates d where d.event_id = e.id and d.status = 'scheduled' and d.ends_at > now()) as nf,
              (select m.url from media m where m.owner_kind = 'event' and m.owner_id = e.id::text and m.status = 'visible' order by m.sort limit 1) as foto
         from events e join businesses b on b.id = e.business_id join cities c on c.id = e.city_id where ${w.join(" and ")} order by e.id desc limit ${POR_PAGINA_EVT + 1}`, p),
    db().query<{ n: number }>(`select count(*)::int as n ${base}`, pc),
    db().query<{ n: number; rev: number; semana: number }>(
      `select count(*) filter (where e.status <> 'draft')::int as n, count(*) filter (where e.status = 'review' or e.pending_status = 'review')::int as rev,
              count(*) filter (where e.status in ('live', 'paused') and e.start_date between (now() at time zone c.timezone)::date and (now() at time zone c.timezone)::date + 7)::int as semana
         from events e join cities c on c.id = e.city_id where cardinality($1::text[]) = 0 or e.city_id = any($1::text[])`, [s.cities]),
  ]);
  const mas = L.rows.length > POR_PAGINA_EVT, filas = L.rows.slice(0, POR_PAGINA_EVT);
  return { filas, total: N.rows[0]?.n ?? 0, cab: K.rows[0] ?? { n: 0, rev: 0, semana: 0 }, siguiente: mas ? filas[filas.length - 1]!.id : null, sla: await valor("evt_revision_h") };
}
export type EvtAdm = {
  id: string; slug: string; st: EstadoEvt; t: Bi; desc: Bi; fmt: FormatoKey; fmtL: Bi; dark: boolean; org: { id: string; name: string; verificado: boolean; bloqueado: string | null; eventos: number; rechazados: number };
  ciudad: string; d: BorradorEvt; pendiente: BorradorEvt | null; cambios: string[]; hidden: string | null; nota: string | null; caso: string | null; enviado: string | null; esperaH: number | null; sla: number;
  log: { decision: string; by: string; quien: string | null; at: string; nota: string | null }[]; version: number; origen: string; generos: Bi[];
  kind: "single" | "series" | "span";
};
/* Todo lo que hace falta para decidir (la cola y la ficha del admin): lo publicado y, si hay, el cambio que espera. */
export async function eventoAdmin(s: Staff, id: string): Promise<EvtAdm | null> {
  if (!ID.test(id)) return null;
  const e = await filaEvento(db(), id, null);
  if (!e || (s.cities.length && !s.cities.includes(e.city_id))) return null;
  const [x, org, log, caso, extra] = await Promise.all([
    Promise.all([
      db().query<{ h: number; who: string; role: Bi }>(`select at_min as h, who, role from event_lineup where event_id = $1::bigint and removed_at is null order by sort`, [id]),
      db().query<{ id: string; url: string }>(`select id::text, url from media where owner_kind = 'event' and owner_id = $1 and status = 'visible' order by sort, created_at`, [id]),
    ]),
    db().query<{ name: string; verificado: boolean; bloqueado: string | null; eventos: number; rechazados: number }>(
      `select b.name, coalesce(o.verified_at is not null, false) as verificado, o.blocked_reason as bloqueado,
              (select count(*)::int from events z where z.business_id = b.id and z.status <> 'draft') as eventos, (select count(*)::int from events z where z.business_id = b.id and z.status = 'rejected') as rechazados
         from businesses b left join event_organizers o on o.business_id = b.id where b.id = $1`, [e.business_id]),
    db().query<{ decision: string; by: string; quien: string | null; at: string; nota: string | null }>(
      `select l.decision, l.by_kind as by, nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), '') as quien, l.at, l.note as nota
         from event_review_log l left join users u on u.id = l.by_user where l.event_id = $1::bigint order by l.at desc, l.id desc limit 20`, [id]),
    db().query<{ id: string; h: number }>(`select id::text, extract(epoch from now() - opened_at) / 3600 as h from queue_items where queue = 'evt' and subject_kind = 'event' and subject_id = $1 and status = 'open'`, [id]),
    db().query<{ ciudad: string; label: Bi; dark: boolean; sla: number }>(`select c.name as ciudad, f.label, f.dark, ${cfgSql("evt_revision_h")} as sla from cities c, event_formats f where c.id = $1 and f.key = $2`, [e.city_id, e.format]),
  ]);
  const vivo = aBorrador(e, { lu: x[0].rows, fotos: x[1].rows }), pend = e.pending ? { ...vivo, ...e.pending } as BorradorEvt : null;
  const G = (await db().query<{ label: Bi }>(`select label from event_genres where key = any($1::text[]) order by sort`, [e.genres])).rows;
  return {
    id: e.id, slug: e.slug, st: e.status, t: e.title, desc: e.description, fmt: e.format, fmtL: extra.rows[0]!.label, dark: extra.rows[0]!.dark,
    org: { id: e.business_id, ...org.rows[0]! }, ciudad: extra.rows[0]!.ciudad, d: vivo, pendiente: e.pending_status === "review" ? pend : null, cambios: pend ? cambiosQueImportan(vivo, pend) : [],
    hidden: e.hidden_reason, nota: e.review_note ?? e.pending_note, caso: caso.rows[0]?.id ?? null, enviado: e.pending_at ?? e.submitted_at, esperaH: caso.rows[0] ? Math.floor(caso.rows[0].h) : null,
    sla: extra.rows[0]!.sla, log: log.rows, version: e.version, origen: e.origin, generos: G.map((g) => g.label), kind: e.kind,
  };
}
/* Organizadores: quién publica eventos, cuántos, verificado o bloqueado. */
export async function organizadoresAdmin(s: Staff, q: string) {
  return (await db().query<{ id: string; name: string; foto: string | null; eventos: number; tickets: number; verificado: boolean; bloqueado: string | null; ciudad: string }>(
    `select b.id, b.name, (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1) as foto,
            count(e.id) filter (where e.status <> 'draft')::int as eventos, count(e.id) filter (where e.status <> 'draft' and e.entry = 'tickets')::int as tickets,
            coalesce(o.verified_at is not null, false) as verificado, o.blocked_reason as bloqueado, c.name as ciudad
       from businesses b join cities c on c.id = b.city_id left join events e on e.business_id = b.id left join event_organizers o on o.business_id = b.id
      where (cardinality($1::text[]) = 0 or b.city_id = any($1::text[])) and ($2 = '' or b.name ilike '%' || $2 || '%')
      group by b.id, b.name, o.verified_at, o.blocked_at, o.blocked_reason, c.name
     having count(e.id) filter (where e.status <> 'draft') > 0 or o.verified_at is not null or o.blocked_at is not null
      order by o.blocked_at is not null desc, count(e.id) desc, b.name limit 100`, [s.cities, q])).rows;
}
/* Negocios 360° › Contenido › Eventos. */
export async function eventosDeNegocioAdmin(negocio: string) {
  const [L, o] = await Promise.all([
    db().query<{ id: string; t: Bi; st: EstadoEvt; hidden: boolean; pending: string | null; dia: string; h0: number; entrada: string }>(
      `select id::text, title as t, status as st, hidden_at is not null as hidden, pending_status as pending, start_date::text as dia, start_min as h0, entry as entrada
         from events where business_id = $1 and status <> 'draft' order by start_date desc, events.id desc limit 30`, [negocio]),
    db().query<{ verificado: boolean; bloqueado: string | null }>(`select verified_at is not null as verificado, blocked_reason as bloqueado from event_organizers where business_id = $1`, [negocio]),
  ]);
  return { filas: L.rows, org: o.rows[0] ?? { verificado: false, bloqueado: null } };
}
