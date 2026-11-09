import "server-only";
import type { PoolClient } from "pg";
import { avisarNegocio } from "./avisos";
import { valores } from "./config";
import { db, tx } from "./db";
import {
  EXTRA_KINDS, IMPORTA, LIM, cambiosQueImportan, esAlcohol, faltaEvt, sumarDias,
  type Bi, type BorradorEvt, type Boleto, type Entrada, type EstadoEvt, type Extra, type FormatoEvt, type FormatoKey, type Linea, type Mesa,
} from "./evt-comun";

/* 6a · Eventos del negocio (fase6-eventos.md §4 6a; Panel v2 evtBlocks / evEdit / evDup; Publica tu evento). El servidor decide:
   - formatosDe(categoria): lo que puede publicar cada categoría (event_format_categories) con sus campos y palabras (event_formats).
   - guardarEvento(): valida por formato con las mismas reglas que el editor (faltaEvt) y además los límites, lo que cada formato permite
     y que un extra nunca sea alcohol, botellas ni hookah (la base lo vuelve a imponer). Un borrador se guarda con nombre y día; enviar
     pide todo. Enviar = revisión (cola «evt», plazo de Configuración) o, si el organizador está verificado, publicado al instante.
   - Un evento publicado: lo que no importa se aplica; lo que importa (fecha, hora, puertas, lugar, edad, entrada) de un organizador sin
     verificar se guarda en `pending` y vuelve a la cola: la versión anterior sigue en vivo hasta que To'Latino decida.
   - Un organizador bloqueado no envía ni publica (lo dice aquí y lo impone la base).
   - repetirEvento(): «Repetir otro día» (evDup): copia como borrador 7 días después.
   Boletos, mesas y extras se guardan pero NO se venden hasta 6c. */
type Res<T = object> = ({ ok: true } & T) | { ok: false; msg: Bi };
const no = (es: string, en: string): { ok: false; msg: Bi } => ({ ok: false, msg: { es, en } });
const ID = /^\d{1,18}$/, UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const txt = (x: unknown, n: number) => String(x ?? "").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, n);
const bi = (x: unknown, n: number): Bi => { const o = (x && typeof x === "object" ? x : {}) as Partial<Bi>; return { es: txt(o.es, n), en: txt(o.en, n) }; };
const ent = (x: unknown, a: number, b: number, d = a) => { const n = Math.round(Number(x)); return Number.isFinite(n) ? Math.max(a, Math.min(b, n)) : d; };

/* ── Formatos ── */
type FilaFmt = { key: FormatoKey; label: Bi; sub: Bi; icon: string; dark: boolean; ages: number[]; fields: FormatoEvt["f"] };
export async function formatosDe(categoria: string): Promise<FormatoEvt[]> {
  const r = await db().query<FilaFmt>(
    `select f.key, f.label, f.sub, f.icon, f.dark, f.ages::int[] as ages, f.fields from event_format_categories c join event_formats f on f.key = c.format
      where c.category_id = $1 and f.enabled order by c.sort, f.sort`, [categoria]);
  return r.rows.map((x) => ({ key: x.key, label: x.label, sub: x.sub, icon: x.icon, dark: x.dark, ages: x.ages, f: x.fields }));
}
export async function generos() {
  return (await db().query<{ key: string; label: Bi }>(`select key, label from event_genres where enabled order by sort`)).rows;
}
export async function organizadorDe(negocio: string) {
  const o = (await db().query<{ verificado: boolean; bloqueado: string | null; at: string | null }>(
    `select verified_at is not null as verificado, blocked_reason as bloqueado, to_char(blocked_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at
       from event_organizers where business_id = $1`, [negocio])).rows[0];
  return o ?? { verificado: false, bloqueado: null, at: null };
}

/* ── Validar (servidor): lo del cliente nunca se guarda tal cual ── */
type Ctx = { F: FormatoEvt; generos: string[]; hoy: string; diasAdelante: number; fotosMax: number };
function normalizar(raw: unknown, c: Ctx): { ok: true; d: BorradorEvt } | { ok: false; msg: Bi } {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>, F = c.F;
  const entrada: Entrada = r.entrada === "free" || r.entrada === "rsvp" || r.entrada === "tickets" ? r.entrada : F.f.entry;
  const dia = typeof r.dia === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.dia) && !Number.isNaN(Date.parse(`${r.dia}T12:00:00Z`)) ? r.dia : "";
  if (dia && dia < c.hoy) return no("Ese día ya pasó. Elige otro.", "That day has passed. Pick another.");
  if (dia && dia > sumarDias(c.hoy, c.diasAdelante)) return no(`Se publica con hasta ${c.diasAdelante} días de anticipación.`, `Events can be published up to ${c.diasAdelante} days ahead.`);
  const h0 = ent(r.h0, 0, 1410, F.f.h0), h1 = ent(r.h1, h0 + 30, h0 + 720, h0 + F.f.len);
  const puertas = r.puertas === 30 || r.puertas === 60 ? r.puertas : 0;
  const donde = r.donde === "other" ? "other" : "own";
  const tickets = entrada === "tickets";
  const boletos: Boleto[] = tickets ? (Array.isArray(r.boletos) ? r.boletos : []).slice(0, LIM.boletos).map((b: any, i: number) => ({
    id: txt(b?.id, 24) || `t${i + 1}`, n: bi(b?.n, LIM.boletoN), s: bi(b?.s, LIM.boletoS), p: ent(b?.p, 0, 50000, 0), cap: ent(b?.cap, 0, 5000, 0), off: !!b?.off })) : [];
  const mesas: Mesa[] = tickets && F.f.mesas ? (Array.isArray(r.mesas) ? r.mesas : []).slice(0, LIM.mesas).map((m: any, i: number) => {
    const min = ent(m?.min, 2000, 300000, 12000);
    return { id: txt(m?.id, 24) || `m${i + 1}`, z: bi(m?.z, LIM.mesaZ), seats: ent(m?.seats, 2, 20, 4), min, dep: ent(m?.dep, 500, min, Math.min(4000, min)), cap: ent(m?.cap, 1, 60, 1) };
  }) : [];
  const extras: Extra[] = tickets && F.f.adds ? (Array.isArray(r.extras) ? r.extras : []).slice(0, LIM.extras).map((a: any, i: number) => ({
    id: txt(a?.id, 24) || `a${i + 1}`, n: bi(a?.n, LIM.extraN), s: bi(a?.s, LIM.extraS), p: ent(a?.p, 100, 100000, 2000),
    kind: (EXTRA_KINDS as string[]).includes(a?.kind) ? a.kind : "otro", mesa: !!(F.f.mesas && a?.mesa) })) : [];
  if (extras.some(esAlcohol)) return no("To'Latino no vende alcohol, botellas ni hookah. La mesa con consumo mínimo sí: el consumo se paga en el local.", "To'Latino does not sell alcohol, bottles or hookah. Tables with a minimum spend are fine: the spend is paid at the venue.");
  if (tickets && boletos.some((b) => b.p > 0 && b.p < 100)) return no("Cada boleto cuesta al menos $1.", "Each ticket costs at least $1.");
  const lu: Linea[] = (Array.isArray(r.lu) ? r.lu : []).slice(0, LIM.lu).map((l: any) => ({ h: ent(l?.h, Math.max(0, h0 - 60), Math.min(2879, h1), h0), who: txt(l?.who, LIM.quien), role: bi(l?.role, LIM.rol) }));
  const gen = F.f.gen ? [...new Set((Array.isArray(r.gen) ? r.gen : []).map(String))].filter((g) => c.generos.includes(g)).slice(0, LIM.gen) : [];
  const edad = F.ages.includes(Number(r.edad)) ? Number(r.edad) : F.f.age0;
  const antes = (Array.isArray(r.antes) ? r.antes : []).slice(0, LIM.antesN).map((x) => bi(x, LIM.antes));
  const fotos = (Array.isArray(r.fotos) ? r.fotos : []).map((f: any) => ({ id: String(f?.id ?? ""), url: String(f?.url ?? "") })).filter((f) => UUID.test(f.id));
  if (fotos.length > c.fotosMax) return no(`Hasta ${c.fotosMax} fotos.`, `Up to ${c.fotosMax} photos.`);
  return { ok: true, d: {
    fmt: F.key, ti: bi(r.ti, LIM.titulo), desc: bi(r.desc, LIM.desc), fotos, dia, h0, h1, puertas, donde,
    lugar: donde === "other" ? txt(r.lugar, LIM.lugar) : "", dir: donde === "other" ? txt(r.dir, LIM.dir) : "",
    entrada, cupo: entrada === "tickets" ? 0 : ent(r.cupo, 0, 20000, 0), personas: entrada !== "tickets" && F.f.party ? ent(r.personas, 1, 10, 6) : 1, contar: entrada !== "tickets" && !!r.contar,
    boletos, mesas, extras, maxP: tickets ? ent(r.maxP, 0, 50, 0) : 0, hasta: tickets && (r.hasta === "doors" || r.hasta === "day_before") ? r.hasta : "start",
    lu, gen, edad, pideId: edad > 0 ? true : !!r.pideId, vest: F.f.dress ? bi(r.vest, LIM.vest) : { es: "", en: "" }, ninos: !!F.f.kids && !!r.ninos,
    comidaLocal: F.f.payAt && entrada !== "tickets" && !!r.comidaLocal, antes,
  } };
}

/* ── Fila ↔ borrador ── */
type Fila = {
  id: string; slug: string; business_id: string; city_id: string; format: FormatoKey; title: Bi; description: Bi; genres: string[]; min_age: number; id_required: boolean;
  dress_code: Bi | null; kids: "fam" | "care" | null; food_paid_at_venue: boolean; before_you_go: Bi[]; venue_mode: "own" | "other"; venue_name: string | null; venue_address: string | null;
  start_date: string; start_min: number; end_min: number; doors_before_min: 0 | 30 | 60; entry: Entrada; rsvp_capacity: number; party_max: number; door_count: boolean;
  sales_until: "start" | "doors" | "day_before"; max_per_person: number | null; tickets_cfg: Boleto[]; tables_cfg: Mesa[]; addons_cfg: Extra[];
  status: EstadoEvt; hidden_at: string | null; hidden_reason: string | null; review_note: string | null; review_reason_key: string | null; reviewed_at: string | null;
  pending: Partial<BorradorEvt> | null; pending_status: "review" | "changes" | "rejected" | null; pending_note: string | null; pending_at: string | null;
  submitted_at: string | null; approved_at: string | null; version: number; origin: "panel" | "publica"; cancel_reason: string | null; created_at: string;
};
const COLS = `e.id::text, e.slug, e.business_id, e.city_id, e.format, e.title, e.description, e.genres, e.min_age, e.id_required, e.dress_code, e.kids, e.food_paid_at_venue, e.before_you_go,
  e.venue_mode, e.venue_name, e.venue_address, e.start_date::text, e.start_min, e.end_min, e.doors_before_min, e.entry, e.rsvp_capacity, e.party_max, e.door_count, e.sales_until,
  e.max_per_person, e.tickets_cfg, e.tables_cfg, e.addons_cfg, e.status, e.hidden_at, e.hidden_reason, e.review_note, e.review_reason_key, e.reviewed_at, e.pending, e.pending_status,
  e.pending_note, e.pending_at, e.submitted_at, e.approved_at, e.version, e.origin, e.cancel_reason, e.created_at`;
export async function filaEvento(q: Pick<PoolClient, "query">, id: string, negocio: string | null, lock = false) {
  return (await q.query<Fila>(`select ${COLS} from events e where e.id = $1::bigint and ($2::text is null or e.business_id = $2) ${lock ? "for update" : ""}`, [id, negocio])).rows[0] ?? null;
}
async function lineasYFotos(q: Pick<PoolClient, "query">, id: string) {
  const [l, f] = await Promise.all([
    q.query<Linea>(`select at_min as h, who, role from event_lineup where event_id = $1::bigint and removed_at is null order by day_index, sort, at_min`, [id]),
    q.query<{ id: string; url: string }>(`select id::text, url from media where owner_kind = 'event' and owner_id = $1 and status = 'visible' order by sort, created_at`, [id]),
  ]);
  return { lu: l.rows, fotos: f.rows };
}
export function aBorrador(e: Fila, x: { lu: Linea[]; fotos: { id: string; url: string }[] }): BorradorEvt {
  return {
    fmt: e.format, ti: { es: e.title.es ?? "", en: e.title.en ?? "" }, desc: { es: e.description.es ?? "", en: e.description.en ?? "" }, fotos: x.fotos,
    dia: e.start_date, h0: e.start_min, h1: e.end_min, puertas: e.doors_before_min, donde: e.venue_mode, lugar: e.venue_name ?? "", dir: e.venue_address ?? "",
    entrada: e.entry, cupo: e.rsvp_capacity, personas: e.party_max, contar: e.door_count, boletos: e.tickets_cfg, mesas: e.tables_cfg, extras: e.addons_cfg,
    maxP: e.max_per_person ?? 0, hasta: e.sales_until, lu: x.lu, gen: e.genres, edad: e.min_age, pideId: e.id_required, vest: e.dress_code ?? { es: "", en: "" },
    ninos: !!e.kids, comidaLocal: e.food_paid_at_venue, antes: e.before_you_go,
  };
}
const conPendiente = (d: BorradorEvt, p: Partial<BorradorEvt> | null): BorradorEvt => (p ? { ...d, ...Object.fromEntries(IMPORTA.filter((k) => k in p).map((k) => [k, p[k]])) } as BorradorEvt : d);
const soloImporta = (d: BorradorEvt) => Object.fromEntries(IMPORTA.map((k) => [k, d[k]]));

/* Escribe en la fila lo que no importa (siempre) y, si `todo`, también lo que importa. */
async function escribir(c: PoolClient, id: string, d: BorradorEvt, F: FormatoEvt, todo: boolean, geo: string | null) {
  const p: unknown[] = [id, d.fmt, JSON.stringify(d.ti), JSON.stringify(d.desc), d.gen, d.pideId, F.f.dress && (d.vest.es || d.vest.en) ? JSON.stringify(d.vest) : null,
    F.f.kids && d.ninos ? F.f.kids : null, d.comidaLocal, JSON.stringify(d.antes.filter((x) => x.es || x.en)), d.cupo, d.personas, d.contar, d.hasta, d.maxP || null];
  let set = `format = $2, title = $3::jsonb, description = $4::jsonb, genres = $5::text[], id_required = $6, dress_code = $7::jsonb, kids = $8, food_paid_at_venue = $9,
             before_you_go = $10::jsonb, rsvp_capacity = $11, party_max = $12, door_count = $13, sales_until = $14, max_per_person = $15`;
  if (todo) {
    p.push(d.dia, d.h0, d.h1, d.puertas, d.donde, d.lugar || null, d.dir || null, d.edad, d.entrada, JSON.stringify(d.boletos), JSON.stringify(d.mesas), JSON.stringify(d.extras), geo);
    set += `, start_date = $16::date, start_min = $17, end_min = $18, doors_before_min = $19, venue_mode = $20, venue_name = $21, venue_address = $22, min_age = $23, entry = $24,
             tickets_cfg = $25::jsonb, tables_cfg = $26::jsonb, addons_cfg = $27::jsonb, geom = case when $20 = 'own' then $28::geography else null end`;
  }
  await c.query(`update events set ${set} where id = $1::bigint`, p);
}
/* Line-up (lo de antes queda con removed_at) y fotos (la primera es el cartel; las quitadas pasan a «removed», nada se borra). */
async function lineupYFotos(c: PoolClient, id: string, d: BorradorEvt, userId: string) {
  const viejo = (await c.query<Linea>(`select at_min as h, who, role from event_lineup where event_id = $1::bigint and removed_at is null order by sort`, [id])).rows;
  if (JSON.stringify(viejo) !== JSON.stringify(d.lu)) {
    await c.query(`update event_lineup set removed_at = now() where event_id = $1::bigint and removed_at is null`, [id]);
    for (const [i, l] of d.lu.entries()) await c.query(`insert into event_lineup (event_id, at_min, who, role, sort) values ($1::bigint, $2, $3, $4::jsonb, $5)`, [id, l.h, l.who, JSON.stringify(l.role), i]);
  }
  const ids = d.fotos.map((f) => f.id);
  await c.query(`update media set owner_kind = 'event', owner_id = $1, sort = array_position($3::uuid[], id)
                  where id = any($3::uuid[]) and status = 'visible' and ((owner_kind = 'user' and uploaded_by = $2) or (owner_kind = 'event' and owner_id = $1))`, [id, userId, ids]);
  await c.query(`update media set status = 'removed', removed_reason = 'autor', removed_at = now() where owner_kind = 'event' and owner_id = $1 and status = 'visible' and not (id = any($2::uuid[]))`, [id, ids]);
}

async function contexto(negocio: string, fmt: unknown) {
  const b = (await db().query<{ cat: string; city: string; geo: string | null; hoy: string }>(
    `select b.category_id as cat, b.city_id as city, b.geo::text as geo, to_char(now() at time zone c.timezone, 'YYYY-MM-DD') as hoy
       from businesses b join cities c on c.id = b.city_id where b.id = $1`, [negocio])).rows[0];
  if (!b) return null;
  const [Fs, G, cfg] = await Promise.all([formatosDe(b.cat), generos(), valores("evt_dias_adelante", "evt_fotos_max", "evt_revision_h")]);
  const F = Fs.find((x) => x.key === fmt);
  return { b, F, Fs, generos: G.map((g) => g.key), cfg };
}

export type Envio = "borrador" | "guardado" | "revision" | "publicado" | "cambio_revision" | "cambio_publicado";
/* Guardar desde el panel o desde Publica tu evento. `enviar`: mandarlo a revisión (o publicar si el organizador está verificado). */
export async function guardarEvento(a: { userId: string; negocio: string }, id: string | null, raw: unknown, o: { enviar: boolean; origen?: "panel" | "publica" }): Promise<Res<{ id: string; envio: Envio }>> {
  if (id !== null && !ID.test(id)) return no("Ese evento no existe.", "That event does not exist.");
  const x = await contexto(a.negocio, (raw as { fmt?: unknown })?.fmt);
  if (!x) return no("Ese negocio no existe.", "That business does not exist.");
  if (!x.F) return no("Ese tipo de evento no está en tu categoría.", "That kind of event is not in your category.");
  const n = normalizar(raw, { F: x.F, generos: x.generos, hoy: x.b.hoy, diasAdelante: x.cfg.evt_dias_adelante, fotosMax: x.cfg.evt_fotos_max });
  if (!n.ok) return n;
  const d = n.d, F = x.F;
  const org = await organizadorDe(a.negocio);
  const r = await tx(async (c): Promise<Res<{ id: string; envio: Envio; aviso?: string }>> => {
    let e = id ? await filaEvento(c, id, a.negocio, true) : null;
    if (id && !e) return no("Ese evento no existe.", "That event does not exist.");
    const vivo = !!e && (e.status === "live" || e.status === "paused");
    // Lo que se puede tocar: un borrador, en revisión, con cambios pedidos o publicado. Lo cancelado, no aprobado o terminado, no.
    if (e && ["cancelled", "rejected", "done"].includes(e.status)) return no("Este evento ya no se edita. Usa «Repetir otro día» para crear otro.", "This event can no longer be edited. Use «Repeat another day» to create another.");
    if (e && e.format !== d.fmt && vivo) return no("El tipo de un evento publicado no se cambia.", "The kind of a live event cannot change.");
    const enviar = o.enviar || (vivo);
    const falta = faltaEvt(d, F, { enviar });
    if (falta.length) return no(`Para guardar falta: ${falta.map((m) => m.es).join(" · ")}.`, `To save, add: ${falta.map((m) => m.en).join(" · ")}.`);
    if (o.enviar && org.bloqueado) return no(`No puedes publicar eventos: ${org.bloqueado}. Puedes apelar.`, `You cannot publish events: ${org.bloqueado}. You can appeal.`);
    if (!e) {
      const ins = (await c.query<{ id: string }>(
        `insert into events (slug, city_id, business_id, format, title, start_date, start_min, end_min, entry, created_by, origin) values ('', $1, $2, $3, $4::jsonb, $5::date, $6, $7, $8, $9, $10) returning id::text`,
        [x.b.city, a.negocio, d.fmt, JSON.stringify(d.ti), d.dia, d.h0, d.h1, d.entrada, a.userId, o.origen ?? "panel"])).rows[0]!;
      await escribir(c, ins.id, d, F, true, x.b.geo);
      await lineupYFotos(c, ins.id, d, a.userId);
      await c.query(`select evt_sincronizar_fechas($1::bigint)`, [ins.id]);
      if (!o.enviar) return { ok: true, id: ins.id, envio: "borrador" };
      return { ok: true, id: ins.id, ...(await enviarEn(c, ins.id, a.userId, org.verificado, "submitted")) };
    }
    if (!vivo) {
      await escribir(c, e.id, d, F, true, x.b.geo);
      await lineupYFotos(c, e.id, d, a.userId);
      await c.query(`select evt_sincronizar_fechas($1::bigint)`, [e.id]);
      if (!o.enviar || e.status === "review") return { ok: true, id: e.id, envio: e.status === "review" ? "revision" : "borrador" };
      return { ok: true, id: e.id, ...(await enviarEn(c, e.id, a.userId, org.verificado, e.status === "changes" ? "resubmitted" : "submitted")) };
    }
    // Publicado: lo que no importa se aplica; lo que importa se compara con la versión en vivo.
    const actual = aBorrador(e, await lineasYFotos(c, e.id)), cambia = cambiosQueImportan(actual, d);
    await escribir(c, e.id, d, F, false, x.b.geo);
    await lineupYFotos(c, e.id, d, a.userId);
    if (!cambia.length) {
      if (e.pending) {
        await c.query(`update events set pending = null, pending_status = null, pending_at = null, pending_note = null where id = $1::bigint`, [e.id]);
        await c.query(`update queue_items set status = 'decided', decision = 'retirado', reason = 'El negocio volvió a la versión publicada', decided_at = now() where queue = 'evt' and subject_kind = 'event' and subject_id = $1 and status = 'open'`, [e.id]);
      }
      return { ok: true, id: e.id, envio: "guardado" };
    }
    if (org.bloqueado) return no(`No puedes publicar cambios: ${org.bloqueado}. Puedes apelar.`, `You cannot publish changes: ${org.bloqueado}. You can appeal.`);
    if (org.verificado) {
      await escribir(c, e.id, d, F, true, x.b.geo);
      await c.query(`update events set version = version + 1, pending = null, pending_status = null, pending_at = null, pending_note = null where id = $1::bigint`, [e.id]);
      await c.query(`select evt_sincronizar_fechas($1::bigint)`, [e.id]);
      return { ok: true, id: e.id, envio: "cambio_publicado" };
    }
    await c.query(`update events set pending = $2::jsonb, pending_status = 'review', pending_at = now(), pending_note = null where id = $1::bigint`, [e.id, JSON.stringify(soloImporta(d))]);
    await registrar(c, e.id, "resubmitted", "business", a.userId, null, null);
    await abrirCaso(c, e.id);
    return { ok: true, id: e.id, envio: "cambio_revision", aviso: "evt_revision" };
  });
  if (!r.ok) return r;
  await avisoEnvio(a.negocio, r.id, r.envio, x.cfg.evt_revision_h);
  return { ok: true, id: r.id, envio: r.envio };
}

/* Enviar lo guardado (desde la ficha del panel: «Enviar a revisión»). */
export async function enviarEvento(a: { userId: string; negocio: string }, id: string): Promise<Res<{ envio: Envio }>> {
  if (!ID.test(id)) return no("Ese evento no existe.", "That event does not exist.");
  const e = await filaEvento(db(), id, a.negocio);
  if (!e) return no("Ese evento no existe.", "That event does not exist.");
  if (e.status !== "draft" && e.status !== "changes") return no("Este evento ya se envió.", "This event was already sent.");
  return guardarEvento(a, id, aBorrador(e, await lineasYFotos(db(), id)), { enviar: true });
}

/* Revisión o, para un organizador verificado, publicado al instante (aprobado por el sistema: approved_by null). */
async function enviarEn(c: PoolClient, id: string, userId: string, verificado: boolean, como: "submitted" | "resubmitted"): Promise<{ envio: Envio }> {
  if (verificado) {
    await c.query(`update events set status = 'live', submitted_at = now(), approved_at = now(), approved_by = null, review_note = null, review_reason_key = null where id = $1::bigint`, [id]);
    await registrar(c, id, como, "business", userId, null, null);
    await registrar(c, id, "approved", "auto", null, null, null);
    return { envio: "publicado" };
  }
  await c.query(`update events set status = 'review', submitted_at = now() where id = $1::bigint`, [id]);
  await registrar(c, id, como, "business", userId, null, null);
  await abrirCaso(c, id);
  return { envio: "revision" };
}
export async function registrar(c: Pick<PoolClient, "query">, id: string, decision: "submitted" | "approved" | "changes" | "rejected" | "resubmitted", byKind: "business" | "staff" | "auto", by: string | null, razon: string | null, nota: string | null) {
  await c.query(
    `insert into event_review_log (event_id, city_id, version, decision, reason_key, note, by_user, by_kind, snapshot)
     select e.id, e.city_id, e.version, $2, $3, $4, $5, $6, jsonb_build_object('title', e.title, 'status', e.status, 'start_date', e.start_date, 'start_min', e.start_min, 'end_min', e.end_min,
            'venue', coalesce(e.venue_name, 'own'), 'min_age', e.min_age, 'entry', e.entry, 'pending', e.pending)
       from events e where e.id = $1::bigint`, [id, decision, razon, nota, by, byKind]);
}
async function abrirCaso(c: Pick<PoolClient, "query">, id: string) {
  await c.query(`insert into queue_items (queue, subject_kind, subject_id, business_id, city_id, priority)
                 select 'evt', 'event', e.id::text, e.business_id, e.city_id, 'normal' from events e where e.id = $1::bigint
                 on conflict (queue, subject_kind, subject_id) where status = 'open' do nothing`, [id]);
}
async function avisoEnvio(negocio: string, id: string, envio: Envio, horas: number) {
  if (envio !== "revision" && envio !== "publicado" && envio !== "cambio_revision") return;
  const t = (await db().query<{ t: string }>(`select title->>'es' as t from events where id = $1::bigint`, [id])).rows[0]?.t ?? "";
  await avisarNegocio(negocio, envio === "publicado" ? "evt_aprobado" : "evt_revision", { evento: t, horas }, { href: `/panel/${negocio}/eventos?det=evt:${id}`, ref: ["event", id] });
}

/* «Repetir otro día» (evDup): una copia como borrador, 7 días después (o desde mañana si ya pasó). Sin ventas, sin revisión. */
export async function repetirEvento(a: { userId: string; negocio: string }, id: string): Promise<Res<{ id: string }>> {
  if (!ID.test(id)) return no("Ese evento no existe.", "That event does not exist.");
  const e = await filaEvento(db(), id, a.negocio);
  if (!e) return no("Ese evento no existe.", "That event does not exist.");
  const x = await contexto(a.negocio, e.format);
  if (!x?.F) return no("Ese tipo de evento ya no está en tu categoría.", "That kind of event is no longer in your category.");
  const d = conPendiente(aBorrador(e, await lineasYFotos(db(), id)), e.pending);
  const dia = [sumarDias(d.dia, 7), sumarDias(x.b.hoy, 1)].sort().pop()!;
  const copia: BorradorEvt = { ...d, dia, fotos: [], boletos: d.boletos.map((b) => ({ ...b, off: false })) };
  const r = await guardarEvento(a, null, copia, { enviar: false });
  if (!r.ok) return r;
  // Las fotos se copian (filas nuevas de media con la misma imagen): la copia no le quita fotos al original.
  await db().query(`insert into media (owner_kind, owner_id, url, w, h, status, sort, uploaded_by)
                    select 'event', $2, url, w, h, 'visible', sort, $3 from media where owner_kind = 'event' and owner_id = $1 and status = 'visible'`, [id, r.id, a.userId]).catch(() => undefined);
  return { ok: true, id: r.id };
}

/* ── Lo que ve el panel ── */
export type FilaPanelEvt = {
  id: string; t: Bi; fmt: FormatoKey; st: EstadoEvt; hidden: boolean; pending: "review" | "changes" | "rejected" | null; dia: string; h0: number; entrada: Entrada;
  cupo: number; cap: number; desde: number | null; foto: string | null; origen: "panel" | "publica"; nota: string | null; pasado: boolean;
};
export async function eventosDelNegocio(negocio: string): Promise<FilaPanelEvt[]> {
  return (await db().query<FilaPanelEvt>(
    `select e.id::text, e.title as t, e.format as fmt, e.status as st, e.hidden_at is not null as hidden, e.pending_status as pending, e.start_date::text as dia, e.start_min as h0,
            e.entry as entrada, e.rsvp_capacity as cupo, coalesce((select sum((x->>'cap')::int) from jsonb_array_elements(e.tickets_cfg) x), 0)::int as cap,
            (select min((x->>'p')::int) from jsonb_array_elements(e.tickets_cfg) x) as desde,
            (select m.url from media m where m.owner_kind = 'event' and m.owner_id = e.id::text and m.status = 'visible' order by m.sort, m.created_at limit 1) as foto,
            e.origin as origen, coalesce(e.hidden_reason, case when e.status in ('changes', 'rejected') then e.review_note end, case when e.pending_status in ('changes', 'rejected') then e.pending_note end) as nota,
            e.start_date < (now() at time zone c.timezone)::date as pasado
       from events e join cities c on c.id = e.city_id where e.business_id = $1 order by e.start_date, e.start_min, e.id limit 200`, [negocio])).rows;
}
export type EvtPanel = {
  id: string; slug: string; st: EstadoEvt; hidden: string | null; nota: string | null; razon: string | null; pending: "review" | "changes" | "rejected" | null; pendingNota: string | null;
  cambios: string[]; version: number; origen: "panel" | "publica"; d: BorradorEvt; vivo: BorradorEvt; enviado: string | null; aprobado: string | null;
  log: { decision: string; by: "business" | "staff" | "auto"; at: string; nota: string | null }[];
  apelacion: { numero: string; estado: string } | null; puedeApelar: boolean;
};
export async function eventoPanel(negocio: string, id: string): Promise<EvtPanel | null> {
  if (!ID.test(id)) return null;
  const e = await filaEvento(db(), id, negocio);
  if (!e) return null;
  const [x, log, ap] = await Promise.all([
    lineasYFotos(db(), id),
    db().query<{ decision: string; by: "business" | "staff" | "auto"; at: string; nota: string | null }>(`select decision, by_kind as by, at, note as nota from event_review_log where event_id = $1::bigint order by at desc, id desc limit 20`, [id]),
    db().query<{ numero: string; estado: string }>(`select number as numero, status as estado from appeals where target_kind = 'event' and target_id = $1 order by created_at desc limit 1`, [id]),
  ]);
  const vivo = aBorrador(e, x), d = conPendiente(vivo, e.pending);
  return {
    id: e.id, slug: e.slug, st: e.status, hidden: e.hidden_reason, nota: e.review_note, razon: e.review_reason_key, pending: e.pending_status, pendingNota: e.pending_note,
    cambios: e.pending ? cambiosQueImportan(vivo, d) : [], version: e.version, origen: e.origin, d, vivo, enviado: e.submitted_at, aprobado: e.approved_at, log: log.rows,
    apelacion: ap.rows[0] ?? null, puedeApelar: !ap.rows[0] && (!!e.hidden_at || e.status === "rejected"),
  };
}

/* Aprobar un cambio que importa (lo llama lib/evt-revision.ts dentro de su transacción): lo pendiente pasa a la fila, sube la
   versión y la fecha se pone al día. */
export async function aplicarPendiente(c: PoolClient, id: string) {
  const e = await filaEvento(c, id, null, true);
  if (!e?.pending) return false;
  const b = (await c.query<{ cat: string; geo: string | null }>(`select category_id as cat, geo::text as geo from businesses where id = $1`, [e.business_id])).rows[0]!;
  const F = (await formatosDe(b.cat)).find((x) => x.key === e.format);
  if (!F) return false;
  const d = conPendiente(aBorrador(e, await lineasYFotos(c, id)), e.pending);
  await escribir(c, id, d, F, true, b.geo);
  await c.query(`update events set version = version + 1, pending = null, pending_status = null, pending_at = null, pending_note = null where id = $1::bigint`, [id]);
  await c.query(`select evt_sincronizar_fechas($1::bigint)`, [id]);
  return true;
}
