import "server-only";
import type { PoolClient } from "pg";
import { avisarNegocio } from "./avisos";
import { valores } from "./config";
import { db, tx } from "./db";
import {
  EXTRA_KINDS, IMPORTA, LIM, cambiosQueImportan, esAlcohol, faltaEvt, fechasSerie, sumarDias,
  type Bi, type BorradorEvt, type Boleto, type Entrada, type EstadoEvt, type Extra, type FormatoEvt, type FormatoKey, type HorarioDia, type Linea, type Mesa, type Repite,
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
type Ctx = { F: FormatoEvt; generos: string[]; hoy: string; diasAdelante: number; fotosMax: number; fechasMax: number; diasMax: number };
function normalizar(raw: unknown, c: Ctx): { ok: true; d: BorradorEvt } | { ok: false; msg: Bi } {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>, F = c.F;
  const entrada: Entrada = r.entrada === "free" || r.entrada === "rsvp" || r.entrada === "tickets" ? r.entrada : F.f.entry;
  const dia = typeof r.dia === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.dia) && !Number.isNaN(Date.parse(`${r.dia}T12:00:00Z`)) ? r.dia : "";
  if (dia && dia < c.hoy) return no("Ese día ya pasó. Elige otro.", "That day has passed. Pick another.");
  if (dia && dia > sumarDias(c.hoy, c.diasAdelante)) return no(`Se publica con hasta ${c.diasAdelante} días de anticipación.`, `Events can be published up to ${c.diasAdelante} days ahead.`);
  const h0 = ent(r.h0, 0, 1410, F.f.h0), h1 = ent(r.h1, h0 + 30, h0 + 720, h0 + F.f.len);
  // 6f · Duración: una fecha, una serie o varios días seguidos (no las dos cosas). Los topes son los de Configuración (la base los vuelve a mirar).
  const rr = (r.rep && typeof r.rep === "object" ? r.rep : {}) as Partial<Repite>;
  const span = ent(r.span, 1, LIM.diasMax, 1);
  if (span > c.diasMax) return no(`Hasta ${c.diasMax} días seguidos.`, `Up to ${c.diasMax} days in a row.`);
  const repK: Repite["k"] = span > 1 ? "none" : rr.k === "w" || rr.k === "2w" || rr.k === "m" ? rr.k : "none";
  const repN = Math.round(Number(rr.n));
  if (repK !== "none" && !(repN >= 1 && repN <= c.fechasMax)) return no(`Una serie tiene de 1 a ${c.fechasMax} fechas.`, `A series has 1 to ${c.fechasMax} dates.`);
  const rep: Repite = repK === "none" ? { k: "none", days: [], n: 8, skip: [] }
    : { k: repK, days: repK === "m" ? [] : [...new Set((Array.isArray(rr.days) ? rr.days : []).map(Number).filter((x) => Number.isInteger(x) && x >= 0 && x <= 6))].sort(), n: repN,
        skip: [...new Set((Array.isArray(rr.skip) ? rr.skip : []).map(String).filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x) && x >= c.hoy))].sort().slice(0, 104) };
  if (span > 1 && dia && sumarDias(dia, span - 1) > sumarDias(c.hoy, c.diasAdelante)) return no(`El último día tiene que estar dentro de los ${c.diasAdelante} días que se publican.`, `The last day has to be within the ${c.diasAdelante} days that can be published.`);
  const dh: HorarioDia[] | null = span > 1 && Array.isArray(r.dh) ? Array.from({ length: span }, (_, j) => {
    const x = (r.dh as any[])[j] ?? {}, a = j === 0 ? h0 : ent(x?.h0, 0, 1410, h0);
    return { h0: a, h1: j === 0 ? h1 : ent(x?.h1, a + 30, a + 720, Math.max(a + 30, a + (h1 - h0))) };
  }) : null;
  const puertas = r.puertas === 30 || r.puertas === 60 ? r.puertas : 0;
  const donde = r.donde === "other" ? "other" : "own";
  const tickets = entrada === "tickets";
  const boletos: Boleto[] = tickets ? (Array.isArray(r.boletos) ? r.boletos : []).slice(0, span > 1 ? LIM.boletosDias : LIM.boletos).map((b: any, i: number) => ({
    id: txt(b?.id, 24) || `t${i + 1}`, n: bi(b?.n, LIM.boletoN), s: bi(b?.s, LIM.boletoS), p: ent(b?.p, 0, 50000, 0), cap: ent(b?.cap, 0, 5000, 0), off: !!b?.off,
    ...(span > 1 ? { dy: b?.dy == null || b?.dy === "" ? null : ent(b.dy, 0, span - 1, 0) } : {}) })) : [];
  // Una mesa es de una noche: un evento de varios días no vende mesas (la base lo impide también).
  if (span > 1 && tickets && Array.isArray(r.mesas) && r.mesas.length) return no("Un evento de varios días no vende mesas: hazlo como serie o como eventos aparte.", "A multi-day event does not sell tables: make it a series or separate events.");
  const mesas: Mesa[] = tickets && F.f.mesas && span === 1 ? (Array.isArray(r.mesas) ? r.mesas : []).slice(0, LIM.mesas).map((m: any, i: number) => {
    const min = ent(m?.min, 2000, 300000, 12000);
    return { id: txt(m?.id, 24) || `m${i + 1}`, z: bi(m?.z, LIM.mesaZ), seats: ent(m?.seats, 2, 20, 4), min, dep: ent(m?.dep, 500, min, Math.min(4000, min)), cap: ent(m?.cap, 1, 60, 1) };
  }) : [];
  const extras: Extra[] = tickets && F.f.adds ? (Array.isArray(r.extras) ? r.extras : []).slice(0, LIM.extras).map((a: any, i: number) => ({
    id: txt(a?.id, 24) || `a${i + 1}`, n: bi(a?.n, LIM.extraN), s: bi(a?.s, LIM.extraS), p: ent(a?.p, 100, 100000, 2000),
    kind: (EXTRA_KINDS as string[]).includes(a?.kind) ? a.kind : "otro", mesa: !!(F.f.mesas && a?.mesa) })) : [];
  if (extras.some(esAlcohol)) return no("To'Latino no vende alcohol, botellas ni hookah. La mesa con consumo mínimo sí: el consumo se paga en el local.", "To'Latino does not sell alcohol, bottles or hookah. Tables with a minimum spend are fine: the spend is paid at the venue.");
  if (tickets && boletos.some((b) => b.p > 0 && b.p < 100)) return no("Cada boleto cuesta al menos $1.", "Each ticket costs at least $1.");
  const lu: Linea[] = (Array.isArray(r.lu) ? r.lu : []).slice(0, span > 1 ? LIM.luDias : LIM.lu).map((l: any) => {
    const dy = span > 1 ? ent(l?.dy, 0, span - 1, 0) : 0, hd = dh?.[dy] ?? { h0, h1 };
    return { h: ent(l?.h, Math.max(0, hd.h0 - 60), Math.min(2879, hd.h1), hd.h0), who: txt(l?.who, LIM.quien), role: bi(l?.role, LIM.rol), ...(span > 1 ? { dy } : {}) };
  });
  const gen = F.f.gen ? [...new Set((Array.isArray(r.gen) ? r.gen : []).map(String))].filter((g) => c.generos.includes(g)).slice(0, LIM.gen) : [];
  const edad = F.ages.includes(Number(r.edad)) ? Number(r.edad) : F.f.age0;
  const antes = (Array.isArray(r.antes) ? r.antes : []).slice(0, LIM.antesN).map((x) => bi(x, LIM.antes));
  const fotos = (Array.isArray(r.fotos) ? r.fotos : []).map((f: any) => ({ id: String(f?.id ?? ""), url: String(f?.url ?? "") })).filter((f) => UUID.test(f.id));
  if (fotos.length > c.fotosMax) return no(`Hasta ${c.fotosMax} fotos.`, `Up to ${c.fotosMax} photos.`);
  return { ok: true, d: {
    fmt: F.key, ti: bi(r.ti, LIM.titulo), desc: bi(r.desc, LIM.desc), fotos, dia, h0, h1, puertas, donde,
    lugar: donde === "other" ? txt(r.lugar, LIM.lugar) : "", dir: donde === "other" ? txt(r.dir, LIM.dir) : "", cp: donde === "other" ? txt(r.cp, 5).replace(/\D/g, "") : "",
    entrada, cupo: entrada === "tickets" ? 0 : ent(r.cupo, 0, 20000, 0), personas: entrada !== "tickets" && F.f.party ? ent(r.personas, 1, 10, 6) : 1, contar: entrada !== "tickets" && !!r.contar,
    boletos, mesas, extras, maxP: tickets ? ent(r.maxP, 0, 50, 0) : 0, hasta: tickets && (r.hasta === "doors" || r.hasta === "day_before") ? r.hasta : "start",
    lu, gen, edad, pideId: edad > 0 ? true : !!r.pideId, vest: F.f.dress ? bi(r.vest, LIM.vest) : { es: "", en: "" }, ninos: !!F.f.kids && !!r.ninos,
    comidaLocal: F.f.payAt && entrada !== "tickets" && !!r.comidaLocal, antes,
    rep, span, dh, dcap: span > 1 ? ent(r.dcap, 0, 20000, 0) : 0,
  } };
}

/* ── Fila ↔ borrador ── */
type Fila = {
  id: string; slug: string; business_id: string; city_id: string; format: FormatoKey; title: Bi; description: Bi; genres: string[]; min_age: number; id_required: boolean;
  dress_code: Bi | null; kids: "fam" | "care" | null; food_paid_at_venue: boolean; before_you_go: Bi[]; venue_mode: "own" | "other"; venue_name: string | null; venue_address: string | null; venue_zip: string | null;
  start_date: string; start_min: number; end_min: number; doors_before_min: 0 | 30 | 60; entry: Entrada; rsvp_capacity: number; party_max: number; door_count: boolean;
  sales_until: "start" | "doors" | "day_before"; max_per_person: number | null; tickets_cfg: Boleto[]; tables_cfg: Mesa[]; addons_cfg: Extra[];
  status: EstadoEvt; hidden_at: string | null; hidden_reason: string | null; review_note: string | null; review_reason_key: string | null; reviewed_at: string | null;
  pending: Partial<BorradorEvt> | null; pending_status: "review" | "changes" | "rejected" | null; pending_note: string | null; pending_at: string | null;
  submitted_at: string | null; approved_at: string | null; version: number; origin: "panel" | "publica"; cancel_reason: string | null; created_at: string;
  kind: "single" | "series" | "span"; rep: Repite | null; span_days: number; day_hours: HorarioDia[] | null; day_cap: number;
};
const COLS = `e.id::text, e.slug, e.business_id, e.city_id, e.format, e.title, e.description, e.genres, e.min_age, e.id_required, e.dress_code, e.kids, e.food_paid_at_venue, e.before_you_go,
  e.venue_mode, e.venue_name, e.venue_address, e.venue_zip, e.start_date::text, e.start_min, e.end_min, e.doors_before_min, e.entry, e.rsvp_capacity, e.party_max, e.door_count, e.sales_until,
  e.max_per_person, e.tickets_cfg, e.tables_cfg, e.addons_cfg, e.status, e.hidden_at, e.hidden_reason, e.review_note, e.review_reason_key, e.reviewed_at, e.pending, e.pending_status,
  e.pending_note, e.pending_at, e.submitted_at, e.approved_at, e.version, e.origin, e.cancel_reason, e.created_at, e.kind, e.rep, e.span_days, e.day_hours, e.day_cap`;
export async function filaEvento(q: Pick<PoolClient, "query">, id: string, negocio: string | null, lock = false) {
  return (await q.query<Fila>(`select ${COLS} from events e where e.id = $1::bigint and ($2::text is null or e.business_id = $2) ${lock ? "for update" : ""}`, [id, negocio])).rows[0] ?? null;
}
async function lineasYFotos(q: Pick<PoolClient, "query">, id: string) {
  const [l, f] = await Promise.all([
    q.query<Linea>(`select at_min as h, who, role, day_index as dy from event_lineup where event_id = $1::bigint and removed_at is null order by day_index, sort, at_min`, [id]),
    q.query<{ id: string; url: string }>(`select id::text, url from media where owner_kind = 'event' and owner_id = $1 and status = 'visible' order by sort, created_at`, [id]),
  ]);
  return { lu: l.rows, fotos: f.rows };
}
export function aBorrador(e: Fila, x: { lu: Linea[]; fotos: { id: string; url: string }[] }): BorradorEvt {
  return {
    fmt: e.format, ti: { es: e.title.es ?? "", en: e.title.en ?? "" }, desc: { es: e.description.es ?? "", en: e.description.en ?? "" }, fotos: x.fotos,
    dia: e.start_date, h0: e.start_min, h1: e.end_min, puertas: e.doors_before_min, donde: e.venue_mode, lugar: e.venue_name ?? "", dir: e.venue_address ?? "", cp: e.venue_zip ?? "",
    entrada: e.entry, cupo: e.rsvp_capacity, personas: e.party_max, contar: e.door_count, boletos: e.tickets_cfg, mesas: e.tables_cfg, extras: e.addons_cfg,
    maxP: e.max_per_person ?? 0, hasta: e.sales_until, gen: e.genres, edad: e.min_age, pideId: e.id_required, vest: e.dress_code ?? { es: "", en: "" },
    ninos: !!e.kids, comidaLocal: e.food_paid_at_venue, antes: e.before_you_go,
    rep: e.kind === "series" && e.rep ? { k: e.rep.k, days: e.rep.days ?? [], n: e.rep.n, skip: e.rep.skip ?? [] } : { k: "none", days: [], n: 8, skip: [] },
    span: e.kind === "span" ? e.span_days : 1, dh: e.kind === "span" ? e.day_hours : null, dcap: e.kind === "span" ? e.day_cap : 0,
    lu: e.kind === "span" ? x.lu : x.lu.map(({ dy: _d, ...l }) => l),
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
    const rep = d.span > 1 || !d.rep || d.rep.k === "none" ? null : d.rep;
    p.push(d.dia, d.h0, d.h1, d.puertas, d.donde, d.lugar || null, d.dir || null, d.edad, d.entrada, JSON.stringify(d.boletos), JSON.stringify(d.mesas), JSON.stringify(d.extras), geo, d.donde === "other" && d.cp ? d.cp : null,
      d.span > 1 ? "span" : rep ? "series" : "single", rep ? JSON.stringify(rep) : null, Math.max(1, d.span), d.span > 1 && d.dh ? JSON.stringify(d.dh) : null, d.span > 1 ? d.dcap : 0);
    // 6b · «Otro lugar» se ubica con el geocodificador propio (calles del Censo, dir_ubicar de 0025) con la dirección y el código postal;
    // si no se encuentra, queda sin punto (sale con la dirección escrita y sin mapa). En mi local: el punto del negocio.
    set += `, start_date = $16::date, start_min = $17, end_min = $18, doors_before_min = $19, venue_mode = $20, venue_name = $21, venue_address = $22, min_age = $23, entry = $24,
             tickets_cfg = $25::jsonb, tables_cfg = $26::jsonb, addons_cfg = $27::jsonb, venue_zip = $29,
             kind = $30, rep = $31::jsonb, span_days = $32, day_hours = $33::jsonb, day_cap = $34,
             geom = case when $20 = 'own' then $28::geography
                         else (select st_setsrid(st_point(u.lng, u.lat), 4326)::geography from dir_ubicar(coalesce($22, ''), coalesce($29, '')) u limit 1) end`;
  }
  await c.query(`update events set ${set} where id = $1::bigint`, p);
}
/* Line-up (lo de antes queda con removed_at) y fotos (la primera es el cartel; las quitadas pasan a «removed», nada se borra). */
async function lineupYFotos(c: PoolClient, id: string, d: BorradorEvt, userId: string) {
  const viejo = (await c.query<Linea>(`select at_min as h, who, role, day_index as dy from event_lineup where event_id = $1::bigint and removed_at is null order by sort`, [id])).rows;
  const nuevo = d.lu.map((l) => ({ h: l.h, who: l.who, role: l.role, dy: d.span > 1 ? l.dy ?? 0 : 0 }));
  if (JSON.stringify(viejo) !== JSON.stringify(nuevo)) {
    await c.query(`update event_lineup set removed_at = now() where event_id = $1::bigint and removed_at is null`, [id]);
    // 6f · En varios días, cada línea es de su día (day_index); en una serie, el programa es el de siempre (una fecha lo cambia aparte).
    for (const [i, l] of nuevo.entries()) await c.query(`insert into event_lineup (event_id, day_index, at_min, who, role, sort) values ($1::bigint, $2, $3, $4, $5::jsonb, $6)`, [id, l.dy, l.h, l.who, JSON.stringify(l.role), i]);
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
  const [Fs, G, cfg] = await Promise.all([formatosDe(b.cat), generos(), valores("evt_dias_adelante", "evt_fotos_max", "evt_revision_h", "evt_fechas_max", "evt_dias_seguidos_max")]);
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
  const n = normalizar(raw, { F: x.F, generos: x.generos, hoy: x.b.hoy, diasAdelante: x.cfg.evt_dias_adelante, fotosMax: x.cfg.evt_fotos_max, fechasMax: x.cfg.evt_fechas_max, diasMax: Math.min(LIM.diasMax, x.cfg.evt_dias_seguidos_max) });
  if (!n.ok) return n;
  const d = n.d, F = x.F;
  const org = await organizadorDe(a.negocio);
  let r: Res<{ id: string; envio: Envio; aviso?: string }>;
  try { r = await tx(async (c): Promise<Res<{ id: string; envio: Envio; aviso?: string }>> => {
    let e = id ? await filaEvento(c, id, a.negocio, true) : null;
    if (id && !e) return no("Ese evento no existe.", "That event does not exist.");
    const vivo = !!e && (e.status === "live" || e.status === "paused");
    // Lo que se puede tocar: un borrador, en revisión, con cambios pedidos o publicado. Lo cancelado, no aprobado o terminado, no.
    if (e && ["cancelled", "rejected", "done"].includes(e.status)) return no("Este evento ya no se edita. Usa «Repetir otro día» para crear otro.", "This event can no longer be edited. Use «Repeat another day» to create another.");
    if (e && e.format !== d.fmt && vivo) return no("El tipo de un evento publicado no se cambia.", "The kind of a live event cannot change.");
    // 6c · Con boletos vendidos o apartados: la entrada sigue con boletos y la cantidad de cada boleto o mesa no baja de ahí.
    if (e) { const v = await chequeoVenta(c, e, d, sumarDias(x.b.hoy, x.cfg.evt_dias_adelante)); if (v) return v; }
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
  }); } catch (err) { const m = errorDeLaBase(err); if (m) return m; throw err; }
  if (!r.ok) return r;
  await avisoEnvio(a.negocio, r.id, r.envio, x.cfg.evt_revision_h);
  return { ok: true, id: r.id, envio: r.envio };
}

/* 6c · Lo vendido manda: lo que ya se vendió o está apartado no se puede quitar de la venta con un cambio del editor (la base lo
   vuelve a imponer en evt_sincronizar_venta). Quitar un boleto con ventas lo apaga: lo vendido sigue valiendo. */
async function chequeoVenta(c: Pick<PoolClient, "query">, e: Fila, d: BorradorEvt, hasta: string): Promise<{ ok: false; msg: Bi } | null> {
  const id = e.id;
  // 6f · Las fechas con gente (boletos, RSVP, apartados) no se pierden con un cambio de la regla: se cancelan con devolución, una por una.
  const G = (await c.query<{ id: string; dia: string; serie: string | null; moved: boolean; n: number }>(
    `select d.id::text, d.local_date::text as dia, d.serie_dia::text as serie, d.moved_at is not null as moved, (d.sold_n + d.rsvp_n)::int as n from event_dates d
      where d.event_id = $1::bigint and d.status = 'scheduled' and d.ends_at > now() and evt_fecha_con_gente(d.id) order by d.starts_at`, [id])).rows;
  if (G.length) {
    const kind = d.span > 1 ? "span" : d.rep?.k && d.rep.k !== "none" ? "series" : "single";
    if (kind !== e.kind) return no("Ya hay gente en una fecha: la duración del evento no cambia. Cancela y crea otro si hace falta.", "People are already in on a date: the event's duration cannot change. Cancel and create another if needed.");
    if (kind === "span" && (d.span !== e.span_days || d.dia !== e.start_date)) return no("Ya vendiste: los días del evento no cambian.", "You already sold: the event's days cannot change.");
    if (kind === "series") {
      const nuevas = new Set(fechasSerie(d.dia, d.rep, d.rep.n, hasta));
      const fuera = G.find((g) => !g.moved && (!g.serie || !nuevas.has(g.serie) || d.rep.skip.includes(g.serie)));
      if (fuera) return no(`El ${fuera.dia} ya tiene gente: con este cambio esa fecha saldría de la serie. Cámbiala o cancélala con devolución desde la ficha, en FECHAS.`, `${fuera.dia} already has people: this change would drop that date from the series. Move it or cancel it with refunds from the event page, under DATES.`);
    }
  }
  if (d.span > 1 && d.dcap > 0) {
    const m = (await c.query<{ n: number }>(`select coalesce(max(sold_n + held_n), 0)::int as n from event_day_stock where event_id = $1::bigint`, [id])).rows[0]?.n ?? 0;
    if (m > d.dcap) return no(`Un día ya tiene ${m}: el aforo por día no baja de ahí.`, `A day already has ${m}: the daily capacity cannot go below that.`);
  }
  const L = (await c.query<{ k: string; tipo: "t" | "m"; n: number }>(
    `select t.cfg_key as k, 't' as tipo, coalesce(sum(s.sold_n + s.held_n), 0)::int as n from ticket_types t join ticket_stock s on s.ticket_type_id = t.id where t.event_id = $1::bigint group by t.cfg_key
     union all
     select t.cfg_key, 'm', coalesce(sum(s.sold_n + s.held_n), 0)::int from event_tables t join table_stock s on s.table_id = t.id where t.event_id = $1::bigint group by t.cfg_key`, [id])).rows.filter((x) => x.n > 0);
  if (!L.length) return null;
  if (d.entrada !== "tickets") return no("Ya hay boletos vendidos: la entrada sigue con boletos. Para cancelar con devolución, usa Cancelar.", "Tickets are already sold: entry stays ticketed. To cancel with refunds, use Cancel.");
  for (const x of L) {
    const cfg = x.tipo === "t" ? d.boletos.find((b) => b.id === x.k) : d.mesas.find((m) => m.id === x.k);
    if (cfg && cfg.cap < x.n) return no(`La cantidad no baja de lo vendido o apartado (${x.n}).`, `The quantity cannot go below what is sold or held (${x.n}).`);
    const antes = x.tipo === "t" ? e.tickets_cfg.find((b) => b.id === x.k) : null;
    if (cfg && antes && x.tipo === "t" && ((cfg as Boleto).dy ?? null) !== (antes.dy ?? null)) return no("Ese boleto ya se vendió: el día para el que vale no cambia.", "That ticket already sold: the day it is valid for cannot change.");
  }
  return null;
}
/* Lo que la base rechaza (aunque el código de arriba lo deje pasar) se dice con palabras. */
function errorDeLaBase(err: unknown): { ok: false; msg: Bi } | null {
  const m = String((err as Error)?.message ?? "");
  if (/evt_forma_vendida/.test(m)) return no("Ya hay boletos vendidos: la duración del evento no cambia. Cancela y crea otro.", "Tickets are already sold: the event's duration cannot change. Cancel and create another.");
  if (/evt_aforo_bajo/.test(m) || /event_day_stock_cupo/.test(m)) return no("Un día ya tiene más gente que ese aforo: el aforo por día no baja de ahí.", "A day already has more people than that capacity: the daily capacity cannot go below that.");
  if (/bol_dia_vendido/.test(m)) return no("Ese boleto ya se vendió: el día para el que vale no cambia.", "That ticket already sold: the day it is valid for cannot change.");
  if (/bol_cantidad_baja/.test(m)) return no("La cantidad no baja de lo vendido o apartado.", "The quantity cannot go below what is sold or held.");
  if (/evt_fechas_max|evt_dias_max/.test(m)) return no("Pasa del tope de Configuración (fechas de una serie o días seguidos).", "It goes over the Settings limit (dates in a series or days in a row).");
  if (/events_span_sin_mesas/.test(m)) return no("Un evento de varios días no vende mesas.", "A multi-day event does not sell tables.");
  return null;
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
  // 6b · Enviar a publicar enciende el módulo Eventos del negocio si estaba apagado (sin él, nada sale al público; el panel lo muestra).
  await c.query(`update businesses b set modules_on = array(select distinct x from unnest(b.modules_on || array['eventos']) x), updated_at = now()
                  from events e where e.id = $1::bigint and b.id = e.business_id and not ('eventos' = any(b.modules_on))`, [id]);
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
  const copia: BorradorEvt = { ...d, dia, fotos: [], boletos: d.boletos.map((b) => ({ ...b, off: false })), rep: { ...d.rep, skip: [] } };
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
  /* 6f · Serie o varios días: la próxima fecha (dia), cuántas quedan por delante, la regla y los días. */
  kind: "single" | "series" | "span"; rep: Repite | null; span: number; nf: number; inicio: string;
};
export async function eventosDelNegocio(negocio: string): Promise<FilaPanelEvt[]> {
  return (await db().query<FilaPanelEvt>(
    `select e.id::text, e.title as t, e.format as fmt, e.status as st, e.hidden_at is not null as hidden, e.pending_status as pending,
            coalesce(case when e.kind = 'series' then (select min(d.local_date) from event_dates d where d.event_id = e.id and d.status = 'scheduled' and d.ends_at > now()) end, e.start_date)::text as dia,
            e.start_date::text as inicio, e.kind, e.rep, e.span_days as span, e.start_min as h0,
            (select count(*)::int from event_dates d where d.event_id = e.id and d.status = 'scheduled' and d.ends_at > now()) as nf,
            e.entry as entrada, e.rsvp_capacity as cupo, coalesce((select sum((x->>'cap')::int) from jsonb_array_elements(e.tickets_cfg) x), 0)::int as cap,
            (select min((x->>'p')::int) from jsonb_array_elements(e.tickets_cfg) x) as desde,
            (select m.url from media m where m.owner_kind = 'event' and m.owner_id = e.id::text and m.status = 'visible' order by m.sort, m.created_at limit 1) as foto,
            e.origin as origen, coalesce(e.hidden_reason, case when e.status in ('changes', 'rejected') then e.review_note end, case when e.pending_status in ('changes', 'rejected') then e.pending_note end) as nota,
            e.start_date + (e.span_days - 1) < (now() at time zone c.timezone)::date
              and not exists (select 1 from event_dates d where d.event_id = e.id and d.status = 'scheduled' and d.ends_at > now()) as pasado
       from events e join cities c on c.id = e.city_id where e.business_id = $1 order by e.start_date, e.start_min, e.id limit 200`, [negocio])).rows;
}
export type EvtPanel = {
  id: string; slug: string; st: EstadoEvt; hidden: string | null; nota: string | null; razon: string | null; pending: "review" | "changes" | "rejected" | null; pendingNota: string | null;
  cambios: string[]; version: number; origen: "panel" | "publica"; d: BorradorEvt; vivo: BorradorEvt; enviado: string | null; aprobado: string | null;
  /* 6f · Todas las fechas (una serie o los días de varios días) con lo de cada una. */
  kind: "single" | "series" | "span"; fechas: FechaPanel[];
  log: { decision: string; by: "business" | "staff" | "auto"; at: string; nota: string | null }[];
  apelacion: { numero: string; estado: string } | null; puedeApelar: boolean;
};
export async function eventoPanel(negocio: string, id: string): Promise<EvtPanel | null> {
  if (!ID.test(id)) return null;
  const e = await filaEvento(db(), id, negocio);
  if (!e) return null;
  const [x, log, ap, fechas] = await Promise.all([
    lineasYFotos(db(), id),
    db().query<{ decision: string; by: "business" | "staff" | "auto"; at: string; nota: string | null }>(`select decision, by_kind as by, at, note as nota from event_review_log where event_id = $1::bigint order by at desc, id desc limit 20`, [id]),
    db().query<{ numero: string; estado: string }>(`select number as numero, status as estado from appeals where target_kind = 'event' and target_id = $1 order by created_at desc limit 1`, [id]),
    fechasDe(db(), id),
  ]);
  const vivo = aBorrador(e, x), d = conPendiente(vivo, e.pending);
  return {
    id: e.id, slug: e.slug, st: e.status, hidden: e.hidden_reason, nota: e.review_note, razon: e.review_reason_key, pending: e.pending_status, pendingNota: e.pending_note,
    cambios: e.pending ? cambiosQueImportan(vivo, d) : [], version: e.version, origen: e.origin, d, vivo, enviado: e.submitted_at, aprobado: e.approved_at, log: log.rows,
    apelacion: ap.rows[0] ?? null, puedeApelar: !ap.rows[0] && (!!e.hidden_at || e.status === "rejected"),
    kind: e.kind, fechas,
  };
}

/* 6f · Las fechas de un evento en UNA consulta (sin una consulta por fecha): estado, hora, lo vendido, quién va, el programa de esa fecha y el
   aforo del día. La usan la ficha del panel y la del Super Admin. */
export type FechaPanel = {
  id: string; dia: string; h0: number; h1: number; st: "scheduled" | "skipped" | "cancelled" | "done"; idx: number; serie: string | null; movida: boolean; empezo: boolean; pasada: boolean;
  vendidos: number; rsvp: number; gente: boolean; motivo: string | null; lu: Linea[] | null; cap: number; dia_n: number;
};
export async function fechasDe(q: Pick<PoolClient, "query">, eventoId: string): Promise<FechaPanel[]> {
  return (await q.query<FechaPanel>(
    `select d.id::text, d.local_date::text as dia, (extract(hour from d.starts_at at time zone ci.timezone) * 60 + extract(minute from d.starts_at at time zone ci.timezone))::int as h0,
            (extract(epoch from d.ends_at - d.starts_at) / 60)::int + (extract(hour from d.starts_at at time zone ci.timezone) * 60 + extract(minute from d.starts_at at time zone ci.timezone))::int as h1,
            d.status as st, d.day_index as idx, d.serie_dia::text as serie, d.moved_at is not null as movida, d.starts_at <= now() as empezo, d.ends_at <= now() as pasada,
            d.sold_n as vendidos, d.rsvp_n as rsvp, evt_fecha_con_gente(d.id) as gente, d.cancel_reason as motivo, d.lineup_override as lu,
            coalesce(k.capacity, d.day_capacity, 0) as cap, coalesce(k.sold_n + k.held_n, 0)::int as dia_n
       from event_dates d join cities ci on ci.id = d.city_id left join event_day_stock k on k.event_date_id = d.id
      where d.event_id = $1::bigint and (d.status <> 'skipped' or d.serie_dia is not null) order by d.starts_at, d.id limit 120`, [eventoId])).rows;
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
