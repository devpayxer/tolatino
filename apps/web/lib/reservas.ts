import "server-only";
import type { PoolClient } from "pg";
import { db, tx } from "./db";
import { foto } from "./directorio";
import type { Lang } from "./idioma";

/* Reservación de mesa (Fase 2 · bloque 2e; prototipo neg-rsv.js TLRsv y rsvVals / rsvDetVals / rsvStVals; Panel v2
   Lo que vendes › Reservaciones). La disponibilidad es real: las mesas de cada área por tamaño (menos las que no se
   reservan), contra las reservaciones y retenciones que se cruzan en el tiempo. El servidor decide; la pantalla muestra.
   Minutos desde las 0:00 de la ciudad del negocio. Sin tareas programadas: lo vencido se cierra al leer. */

type Bi = { es: string; en: string };
export const AREAS: Record<string, Bi> = { salon: { es: "Salón", en: "Dining room" }, terraza: { es: "Terraza", en: "Patio" }, barra: { es: "Barra", en: "Bar" } };
export const TURNOS: Record<string, Bi> = { almuerzo: { es: "Almuerzo", en: "Lunch" }, cena: { es: "Cena", en: "Dinner" } };
const SZ = [2, 4, 6, 8] as const;
export const hora = (m: number) => { m = ((Math.round(m) % 1440) + 1440) % 1440; const h = Math.floor(m / 60), mm = m % 60; return `${h % 12 || 12}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
const hm2m = (hm: string) => { const [h = 0, m = 0] = hm.split(":").map(Number); return h * 60 + m; };

export type Ajustes = {
  areas: Record<string, { on: boolean; t: Record<string, number> }>; join: boolean; joinMax: number; walk: number; dur: number; days: number[] | null;
  periods: Record<string, { on: boolean; f: number; t: number }>; auto: boolean; hold: number; cxH: number; minH: number; maxD: number; reply: number;
};
const FABRICA: Ajustes = {
  areas: { salon: { on: true, t: { 2: 4, 4: 6, 6: 2, 8: 0 } }, terraza: { on: true, t: { 2: 3, 4: 3, 6: 0, 8: 0 } }, barra: { on: false, t: { 2: 4, 4: 0, 6: 0, 8: 0 } } },
  join: true, joinMax: 8, walk: 0, dur: 90, days: null, periods: { almuerzo: { on: true, f: 720, t: 930 }, cena: { on: true, f: 1050, t: 1230 } },
  auto: false, hold: 15, cxH: 2, minH: 1, maxD: 14, reply: 10,
};

type Q = { query: PoolClient["query"] } | ReturnType<typeof db>;
type Ctx = {
  id: string; name: string; tz: string; plan: string; phone: string | null; address: string | null; lat: number | null; lng: number | null;
  mods: string[]; off: Record<string, { reason?: string }>; hoy: string; dow: number; now: number; s: Ajustes;
  horas: Record<number, [number, number][]>; cerradoHasta: string | null; cerradoHoy: boolean;
};

/* El negocio, sus ajustes (o los de fábrica) y su horario. */
async function contexto(c: Q, negocio: string): Promise<Ctx | null> {
  const r = await (c as ReturnType<typeof db>).query<{
    id: string; name: string; tz: string; plan: string; phone: string | null; address: string | null; lat: number | null; lng: number | null; mods: string[];
    off: Record<string, { reason?: string }>; hoy: string; dow: number; hm: string; cat: string; s: Record<string, unknown> | null; cerrado_hasta: string | null; cerrado_hoy: boolean;
  }>(
    `select b.id, b.name, ci.timezone as tz, coalesce(st.plan, 'free') as plan, b.phone, b.address, st_y(b.geo::geometry) as lat, st_x(b.geo::geometry) as lng,
            b.modules_on as mods, b.modules_off as off, b.category_id as cat,
            (now() at time zone ci.timezone)::date::text as hoy, extract(dow from now() at time zone ci.timezone)::int as dow, to_char(now() at time zone ci.timezone, 'HH24:MI') as hm,
            to_jsonb(rs) as s, (b.temp_closed_until at time zone ci.timezone)::date::text as cerrado_hasta, coalesce(b.closed_on = (now() at time zone ci.timezone)::date, false) as cerrado_hoy
       from businesses b join cities ci on ci.id = b.city_id left join business_stats_cache st on st.business_id = b.id
       left join reservation_settings rs on rs.business_id = b.id
      where b.id = $1 and b.status = 'active'`, [negocio]);
  const b = r.rows[0];
  if (!b) return null;
  const h = await (c as ReturnType<typeof db>).query<{ weekday: number; open: boolean; ranges: [string, string][] }>(`select weekday, open, ranges from business_hours where business_id = $1 and module = ''`, [negocio]);
  const horas: Record<number, [number, number][]> = {};
  for (const d of h.rows) horas[d.weekday] = d.open ? d.ranges.map(([a, z]) => { const A = hm2m(a), Z = hm2m(z); return [A, Z <= A ? Z + 1440 : Z] as [number, number]; }) : [];
  const x = b.s as Record<string, never> | null;
  const s: Ajustes = x ? {
    areas: x.areas ?? FABRICA.areas, join: x.join_tables ?? true, joinMax: x.join_max ?? 8, walk: x.walk_in ?? 0, dur: x.dur_min ?? 90, days: x.days ?? null,
    periods: x.periods ?? FABRICA.periods, auto: x.auto_confirm ?? false, hold: x.hold_min ?? 15, cxH: x.cancel_free_h ?? 2, minH: x.min_ahead_h ?? 1, maxD: x.max_days ?? 14, reply: x.reply_min ?? 10,
  } : FABRICA;
  return { id: b.id, name: b.name, tz: b.tz, plan: b.plan, phone: b.phone, address: b.address, lat: b.lat, lng: b.lng, mods: b.mods ?? [], off: b.off ?? {}, hoy: b.hoy, dow: b.dow,
    now: hm2m(b.hm), s, horas, cerradoHasta: b.cerrado_hasta, cerradoHoy: b.cerrado_hoy };
}

const fecha = (hoy: string, i: number) => { const d = new Date(`${hoy}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + i); return d.toISOString().slice(0, 10); };
const dowDe = (ymd: string) => new Date(`${ymd}T12:00:00Z`).getUTCDay();
const tablasDe = (a: { t: Record<string, number> }) => Object.fromEntries(SZ.map((z) => [z, Math.max(0, Math.round(Number(a.t?.[z]) || 0))])) as Record<number, number>;
const total = (t: Record<number, number>) => SZ.reduce((x, z) => x + (t[z] ?? 0), 0);
/* Áreas que se reservan (encendidas y con mesas) y el grupo más grande en línea. */
export function areasOn(s: Ajustes) { return Object.keys(AREAS).filter((k) => s.areas[k]?.on && total(tablasDe(s.areas[k]!)) > 0); }
export function maxGrupo(s: Ajustes) {
  const on = areasOn(s);
  if (!on.length) return 0;
  const big = Math.max(...on.map((k) => Math.max(...SZ.filter((z) => (tablasDe(s.areas[k]!)[z] ?? 0) > 0))));
  return s.join ? Math.max(big, s.joinMax) : big;
}
/* ¿Caben todos estos grupos en estas mesas? Del más grande al más chico, cada uno en la mesa más chica que le sirve;
   si juntan mesas, un grupo grande usa las dos más grandes que le alcancen. */
function caben(tablas: Record<number, number>, grupos: number[], join: boolean, joinMax: number) {
  const t = { ...tablas };
  for (const p of [...grupos].sort((a, b) => b - a)) {
    const z = SZ.find((x) => x >= p && (t[x] ?? 0) > 0);
    if (z) { t[z]! -= 1; continue; }
    if (!join || p > joinMax) return false;
    const L = SZ.flatMap((x) => Array(t[x] ?? 0).fill(x) as number[]).sort((a, b) => b - a);
    if (L.length < 2 || L[0]! + L[1]! < p) return false;
    t[L[0]!]! -= 1; t[L[1]!]! -= 1;
  }
  return true;
}

type Ocupa = { start: number; party: number; area: string; dur: number };
/* Lo que ya ocupa mesas ese día: reservaciones vivas y retenciones de 5 minutos (menos la propia). */
async function ocupacion(c: Q, x: Ctx, ymd: string, sin?: { op?: string | null; hold?: string | null }) {
  const r = await (c as ReturnType<typeof db>).query<{ hm: string; party: number; area: string; dur: number }>(
    `select to_char(o.scheduled_at at time zone $3, 'HH24:MI') as hm, o.party_size as party, coalesce(o.details->>'area', 'salon') as area, coalesce(o.duration_min, $4) as dur
       from operations o where o.business_id = $1 and o.kind = 'table' and o.status in ('pending', 'change_proposed', 'confirmed')
        and coalesce(o.status_detail, '') <> 'done' and (o.scheduled_at at time zone $3)::date = $2::date and ($5::bigint is null or o.id <> $5::bigint)
     union all
     select to_char(h.starts_at at time zone $3, 'HH24:MI'), h.party_size, h.area, $4
       from reservation_holds h where h.business_id = $1 and h.expires_at > now() and (h.starts_at at time zone $3)::date = $2::date
        and ($6::uuid is null or h.id <> $6::uuid)`, [x.id, ymd, x.tz, x.s.dur, sin?.op ?? null, sin?.hold ?? null]);
  return r.rows.map((o) => ({ start: hm2m(o.hm), party: o.party, area: o.area, dur: o.dur }));
}
async function bloqueos(c: Q, x: Ctx, desde: string, hasta: string) {
  const r = await (c as ReturnType<typeof db>).query<{ day: string; period: string; area: string; id: string }>(
    `select day::text, period, area, id::text from reservation_blocks where business_id = $1 and removed_at is null and day between $2::date and $3::date order by reservation_blocks.day, reservation_blocks.id`, [x.id, desde, hasta]);
  return r.rows;
}

type Dia = { i: number; ymd: string; dow: number; abierto: boolean };
function dia(x: Ctx, i: number): Dia {
  const ymd = fecha(x.hoy, i), dow = dowDe(ymd);
  const cerradoTemp = !!x.cerradoHasta && ymd <= x.cerradoHasta;
  const abierto = !(i === 0 && x.cerradoHoy) && !cerradoTemp && (x.s.days ? x.s.days.includes(dow) : true) && (x.horas[dow] ?? []).length > 0;
  return { i, ymd, dow, abierto };
}
const enHorario = (x: Ctx, d: Dia, h: number) => (x.horas[d.dow] ?? []).some(([a, z]) => h >= a && h + x.s.dur <= z);
const turnoDe = (x: Ctx, h: number) => Object.keys(TURNOS).find((k) => { const p = x.s.periods[k]; return p?.on && h >= p.f && h <= p.t; }) ?? "";

/* ¿Hay mesa para p personas a las h (minutos) del día d? Devuelve el área (la pedida o la primera que sirva) o "". */
function areaLibre(x: Ctx, d: Dia, h: number, p: number, area: string, occ: Ocupa[], blk: { day: string; period: string; area: string }[]) {
  if (!d.abierto || p > maxGrupo(x.s) || d.i >= x.s.maxD) return "";
  if (d.i * 1440 + h - x.now < x.s.minH * 60) return "";
  if (!enHorario(x, d, h)) return "";
  const tu = turnoDe(x, h);
  if (!tu) return "";
  const todas = areasOn(x.s), all = todas.reduce((a, k) => a + total(tablasDe(x.s.areas[k]!)), 0);
  for (const k of area ? [area] : todas) {
    if (!todas.includes(k)) continue;
    if (blk.some((b) => b.day === d.ymd && (b.period === "all" || b.period === tu) && (b.area === "all" || b.area === k))) continue;
    // Mesas que no se reservan: se quitan de las más chicas, repartidas entre áreas.
    const t = tablasDe(x.s.areas[k]!), nA = total(t);
    let quita = Math.round((x.s.walk * nA) / Math.max(1, all));
    for (const z of SZ) { const q = Math.min(quita, t[z] ?? 0); t[z] = (t[z] ?? 0) - q; quita -= q; }
    const cruzan = occ.filter((o) => o.area === k && o.start < h + x.s.dur && h < o.start + o.dur).map((o) => o.party);
    if (caben(t, [...cruzan, p], x.s.join, x.s.joinMax)) return k;
  }
  return "";
}

export type Grupo = { k: string; t: Bi; f: number; z: number; sl: { h: number; l: string; free: boolean }[] };
async function grupos(c: Q, x: Ctx, i: number, p: number, area: string, sin?: { op?: string | null; hold?: string | null }): Promise<Grupo[]> {
  const d = dia(x, i);
  if (!d.abierto || p > maxGrupo(x.s)) return [];
  const occ = await ocupacion(c, x, d.ymd, sin), blk = await bloqueos(c, x, d.ymd, d.ymd);
  return Object.keys(TURNOS).filter((k) => x.s.periods[k]?.on).map((k) => {
    const pr = x.s.periods[k]!, sl: Grupo["sl"] = [];
    for (let h = pr.f; h <= pr.t; h += 30) if (enHorario(x, d, h) && !(i === 0 && h < x.now + 60)) sl.push({ h, l: hora(h), free: !!areaLibre(x, d, h, p, area, occ, blk) });
    return { k, t: TURNOS[k]!, f: pr.f, z: pr.t, sl };
  }).filter((g) => g.sl.length);
}

/* ── Lo que ve el cliente ── */
export type RsvPublica = {
  negocio: { id: string; nombre: string; telefono: string | null; direccion: string | null };
  on: boolean; auto: boolean; reply: number; hold: number; cxH: number; dur: number; max: number;
  areas: { k: string; l: Bi }[]; dias: { i: number; ymd: string; dow: number; num: number; off: boolean }[]; turnos: { k: string; t: Bi; f: number; z: number }[];
  mia: { numero: string; st: string; at: string; dia: number; h: number; p: number; area: string } | null;
  /* 6i · ¿Recibe eventos privados? (la tarjeta de grupo grande dice «Pedir evento privado» en vez de solo «Llamar»). */
  evp: boolean;
};
/* La pestaña Reservaciones: null = no es un restaurante con Reservaciones encendido, o To'Latino las pausó. */
export async function rsvPublica(negocio: string, userId: string | null): Promise<RsvPublica | null> {
  const x = await contexto(db(), negocio);
  // Reservaciones es de Pro (Free: solo el módulo principal y pedidos o citas, decisión del 3 nov).
  if (!x || x.plan !== "pro" || !x.mods.includes("rsv") || x.off.rsv || !areasOn(x.s).length) return null;
  await vencerMesas({ negocio });
  let mia: RsvPublica["mia"] = null;
  if (userId) {
    const r = await db().query<{ number: string; status: string; detail: string | null; ymd: string; hm: string; party: number; area: string }>(
      `select o.number, o.status, o.status_detail as detail, (o.scheduled_at at time zone $3)::date::text as ymd, to_char(o.scheduled_at at time zone $3, 'HH24:MI') as hm, o.party_size as party, coalesce(o.details->>'area', '') as area
         from operations o where o.business_id = $1 and o.user_id = $2 and o.kind = 'table' and o.status in ('pending', 'change_proposed', 'confirmed')
          and coalesce(o.status_detail, '') <> 'done' and o.scheduled_at > now() - interval '3 hours' order by o.scheduled_at desc limit 1`, [x.id, userId, x.tz]);
    const m = r.rows[0];
    if (m) mia = { numero: m.number, st: m.status === "pending" ? "pend" : m.status === "change_proposed" ? "alt" : "ok", at: m.ymd, dia: Math.round((Date.parse(m.ymd) - Date.parse(x.hoy)) / 864e5), h: hm2m(m.hm), p: m.party, area: m.area };
  }
  return {
    negocio: { id: x.id, nombre: x.name, telefono: x.phone, direccion: x.address }, on: true, auto: x.s.auto, reply: x.s.reply, hold: x.s.hold, cxH: x.s.cxH, dur: x.s.dur, max: maxGrupo(x.s),
    areas: areasOn(x.s).map((k) => ({ k, l: AREAS[k]! })),
    dias: Array.from({ length: x.s.maxD }, (_, i) => { const d = dia(x, i); return { i, ymd: d.ymd, dow: d.dow, num: Number(d.ymd.slice(8)), off: !d.abierto }; }),
    turnos: Object.keys(TURNOS).filter((k) => x.s.periods[k]?.on).map((k) => ({ k, t: TURNOS[k]!, f: x.s.periods[k]!.f, z: x.s.periods[k]!.t })),
    mia, evp: !!(await db().query(`select 1 from private_event_settings where business_id = $1 and is_on`, [x.id])).rowCount,
  };
}

/* Las horas de un día para un grupo (y área). Con «editar», su propia mesa cuenta como libre. */
export async function rsvHoras(negocio: string, i: number, p: number, area: string, editar?: string | null) {
  const x = await contexto(db(), negocio);
  if (!x || !x.mods.includes("rsv") || x.off.rsv) return { grupos: [] as Grupo[], siguientes: [] as number[] };
  const ii = Math.max(0, Math.min(x.s.maxD - 1, Math.floor(i))), pp = Math.max(1, Math.min(40, Math.floor(p))), ar = area && AREAS[area] ? area : "";
  const op = editar ? (await db().query<{ id: string }>(`select id::text from operations where number = $1 and business_id = $2 and kind = 'table'`, [editar, x.id])).rows[0]?.id ?? null : null;
  const g = await grupos(db(), x, ii, pp, ar, { op });
  const siguientes: number[] = [];
  if (!g.some((z) => z.sl.some((s) => s.free))) {
    for (let k = 0; k < x.s.maxD && siguientes.length < 3; k++) if (k !== ii && (await grupos(db(), x, k, pp, ar)).some((z) => z.sl.some((s) => s.free))) siguientes.push(k);
  }
  return { grupos: g, siguientes };
}

/* Resumen › «Reservar mesa»: el primer día con mesa para p personas y sus primeras 4 horas libres. */
export async function rsvRapido(negocio: string, p: number) {
  const x = await contexto(db(), negocio);
  if (!x || !x.mods.includes("rsv") || x.off.rsv) return { i: 0, horas: [] as { h: number; l: string }[] };
  for (let k = 0; k < Math.min(x.s.maxD, 7); k++) {
    const libres = (await grupos(db(), x, k, p, "")).flatMap((g) => g.sl.filter((s) => s.free));
    if (libres.length) return { i: k, horas: libres.slice(0, 4).map((s) => ({ h: s.h, l: s.l })) };
  }
  return { i: 0, horas: [] };
}

/* ── Retener 5 minutos y enviar la solicitud ── */
type ResR<T = object> = ({ ok: true } & T) | { ok: false; msg: Bi };
const no = (es: string, en: string): ResR<never> => ({ ok: false, msg: { es, en } });

export async function rsvRetener(userId: string, negocio: string, i: number, h: number, p: number, area: string, editar?: string | null): Promise<ResR<{ hold: string; area: string; vence: string }>> {
  return tx(async (c) => {
    await c.query(`select pg_advisory_xact_lock(hashtext('mesa:' || $1))`, [negocio]);
    const x = await contexto(c, negocio);
    if (!x || x.plan !== "pro" || !x.mods.includes("rsv") || x.off.rsv) return no("Este restaurante no toma reservaciones en línea.", "This restaurant does not take online reservations.");
    const pp = Math.floor(p), hh = Math.floor(h), ii = Math.floor(i);
    if (!(pp >= 1 && pp <= 40) || !(hh >= 0 && hh < 1440 && hh % 30 === 0) || !(ii >= 0)) return no("Elige otra vez la hora.", "Pick the time again.");
    let op: string | null = null;
    if (editar) {
      // Una solicitud sin respuesta, o una confirmada que todavía no empieza y sin otro cambio esperando respuesta.
      op = (await c.query<{ id: string }>(
        `select o.id::text from operations o where o.number = $1 and o.business_id = $2 and o.user_id = $3 and o.kind = 'table'
            and (o.status = 'pending' or (o.status = 'confirmed' and o.status_detail is null and o.scheduled_at > now()
                 and not exists (select 1 from change_proposals p where p.operation_id = o.id and p.side = 'customer' and p.status = 'open')))`, [editar, x.id, userId])).rows[0]?.id ?? null;
      if (!op) return no("Esa reservación ya no se puede cambiar.", "That reservation can no longer be changed.");
    }
    await c.query(`delete from reservation_holds where user_id = $1 and business_id = $2`, [userId, x.id]); // una retención a la vez por persona y restaurante
    const d = dia(x, ii), [occ, blk] = [await ocupacion(c, x, d.ymd, { op }), await bloqueos(c, x, d.ymd, d.ymd)];
    if (ii === 0 && hh < x.now + 60) return no("Esa hora ya pasó. Elige otra.", "That time has passed. Pick another.");
    const ar = areaLibre(x, d, hh, pp, area && AREAS[area] ? area : "", occ, blk);
    if (!ar) return no("Esa mesa se acaba de ocupar. Elige otra hora.", "That table was just taken. Pick another time.");
    const r = await c.query<{ id: string; vence: string }>(
      `insert into reservation_holds (business_id, user_id, starts_at, party_size, area, edit_of) values ($1, $2, ($3::date + make_interval(mins => $4::int)) at time zone $5, $6, $7, $8::bigint)
       returning id::text, expires_at::text as vence`, [x.id, userId, d.ymd, hh, x.tz, pp, ar, op]);
    return { ok: true, hold: r.rows[0]!.id, area: ar, vence: r.rows[0]!.vence };
  });
}

/* La solicitud en curso (APP-NEG-RESERVA): lo retenido y cuánto le queda. Solo quien la retuvo. */
export type RsvHold = {
  id: string; negocio: { id: string; nombre: string; foto: string | null }; ymd: string; dia: number; h: number; p: number; area: string; segundos: number;
  editar: string | null; editarConfirmada: boolean; auto: boolean; reply: number; hold: number; cxH: number; dur: number; quien: string; telefono: string;
};
export async function rsvHold(userId: string, holdId: string): Promise<RsvHold | null> {
  if (!/^[0-9a-f-]{36}$/.test(String(holdId))) return null;
  const h = (await db().query<{ business_id: string; name: string; url: string | null; ymd: string; hoy: string; hm: string; party: number; area: string; seg: number; editar: string | null; edconf: boolean | null;
    first_name: string | null; last_name: string | null; phone: string }>(
    `select h.business_id, b.name, (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1) as url,
            (h.starts_at at time zone ci.timezone)::date::text as ymd, (now() at time zone ci.timezone)::date::text as hoy, to_char(h.starts_at at time zone ci.timezone, 'HH24:MI') as hm,
            h.party_size as party, h.area, greatest(0, floor(extract(epoch from h.expires_at - now())))::int as seg,
            (select o.number from operations o where o.id = h.edit_of and o.status in ('pending', 'confirmed')) as editar,
            (select o.status = 'confirmed' from operations o where o.id = h.edit_of) as edconf, u.first_name, u.last_name, u.phone
       from reservation_holds h join businesses b on b.id = h.business_id join cities ci on ci.id = b.city_id join users u on u.id = h.user_id
      where h.id = $1 and h.user_id = $2`, [holdId, userId])).rows[0];
  if (!h) return null;
  const x = await contexto(db(), h.business_id);
  if (!x) return null;
  return {
    id: holdId, negocio: { id: h.business_id, nombre: h.name, foto: h.url ? foto(h.url, 200) : null }, ymd: h.ymd, dia: Math.round((Date.parse(h.ymd) - Date.parse(h.hoy)) / 864e5),
    h: hm2m(h.hm), p: h.party, area: h.area, segundos: h.seg, editar: h.editar, editarConfirmada: !!h.edconf && !!h.editar, auto: x.s.auto, reply: x.s.reply, hold: x.s.hold, cxH: x.s.cxH, dur: x.s.dur,
    quien: [h.first_name, h.last_name].filter(Boolean).join(" "), telefono: h.phone,
  };
}

export type DetallesIn = { occ?: string; needs?: string[]; note?: string; other?: boolean; otherName?: string; sms?: boolean };
const OCC = new Set(["cumple", "aniv", "cita", "neg", "cele"]), NEED = new Set(["bebe", "ruedas", "alergia", "tranq"]);
/* Mueve una reservación confirmada a la hora, personas y área del cambio (el aviso de «voy tarde» ya no aplica). */
type Cambio = { ymd: string; at: string; party: number; area: string };
async function aplicarCambio(c: Q, opId: string, p: Cambio, tz: string) {
  await (c as ReturnType<typeof db>).query(
    `update operations set scheduled_at = ($2::date + make_interval(mins => $3::int)) at time zone $4, party_size = $5,
            details = (details - 'late') || jsonb_build_object('area', $6::text), late_notice_at = null, updated_at = now() where id = $1::bigint`,
    [opId, p.ymd, hm2m(p.at), tz, p.party, p.area]);
}
export async function rsvEnviar(userId: string, holdId: string, f: DetallesIn, entorno: string): Promise<ResR<{ numero: string; cambio?: "pend" | "ok" }>> {
  if (!/^[0-9a-f-]{36}$/.test(String(holdId))) return no("Elige otra vez la hora.", "Pick the time again.");
  return tx(async (c) => {
    const h = (await c.query<{ business_id: string; ymd: string; hm: string; party: number; area: string; vivo: boolean; edit_of: string | null }>(
      `select h.business_id, (h.starts_at at time zone ci.timezone)::date::text as ymd, to_char(h.starts_at at time zone ci.timezone, 'HH24:MI') as hm, h.party_size as party, h.area,
              h.expires_at > now() as vivo, h.edit_of::text
         from reservation_holds h join businesses b on b.id = h.business_id join cities ci on ci.id = b.city_id where h.id = $1 and h.user_id = $2`, [holdId, userId])).rows[0];
    if (!h) return no("Se liberó la mesa. Elige la hora otra vez: puede que siga libre.", "The table was released. Pick the time again: it may still be free.");
    await c.query(`select pg_advisory_xact_lock(hashtext('mesa:' || $1))`, [h.business_id]);
    const x = (await contexto(c, h.business_id))!;
    if (!h.vivo) {
      // Pasaron los 5 minutos: si sigue libre, se toma igual (nadie la reservó entretanto).
      const d0 = dia(x, Math.round((Date.parse(h.ymd) - Date.parse(x.hoy)) / 864e5));
      if (!areaLibre(x, d0, hm2m(h.hm), h.party, h.area, await ocupacion(c, x, h.ymd, { op: h.edit_of, hold: holdId }), await bloqueos(c, x, h.ymd, h.ymd)))
        return no("Se liberó la mesa y ya la tomó otra persona. Elige otra hora.", "The table was released and someone else took it. Pick another time.");
    }
    const det = {
      area: h.area, occ: f.occ && OCC.has(f.occ) ? f.occ : null, needs: Array.isArray(f.needs) ? f.needs.filter((n) => NEED.has(n)).slice(0, 4) : [],
      otherName: f.other ? String(f.otherName ?? "").trim().slice(0, 60) || null : null, sms: f.sms !== false,
    };
    const nota = String(f.note ?? "").trim().slice(0, 200);
    let numero: string;
    const ed = h.edit_of ? (await c.query<{ status: string; number: string }>(`select status, number from operations where id = $1::bigint and user_id = $2 for update`, [h.edit_of, userId])).rows[0] : null;
    if (h.edit_of && ed?.status === "confirmed") {
      // Cambiar una reservación confirmada (prototipo: el cambio queda pendiente y la actual sigue en pie). Los detalles
      // (ocasión, necesidades, nota) se actualizan ya; la hora, las personas y el área esperan al restaurante. Con
      // «Confirmar al instante» el cambio se hace solo.
      const abierto = await c.query(`select 1 from change_proposals where operation_id = $1::bigint and side = 'customer' and status = 'open'`, [h.edit_of]);
      if (abierto.rowCount) return no("Ya pediste un cambio: espera la respuesta del restaurante.", "You already asked for a change: wait for the restaurant's reply.");
      await c.query(`update operations set details = details || $2::jsonb, customer_note = nullif($3, ''), updated_at = now() where id = $1::bigint`,
        [h.edit_of, JSON.stringify({ occ: det.occ, needs: det.needs, otherName: det.otherName, sms: det.sms }), nota]);
      const prop = { ymd: h.ymd, at: h.hm, party: h.party, area: h.area };
      if (x.s.auto) {
        await aplicarCambio(c, h.edit_of, prop, x.tz);
        await c.query(`insert into change_proposals (operation_id, kind, proposed, created_by, side, status, answered_at) values ($1::bigint, 'time', $2::jsonb, $3, 'customer', 'accepted', now())`, [h.edit_of, JSON.stringify(prop), userId]);
        await c.query(`insert into operation_events (operation_id, kind, actor, actor_id, note) values ($1::bigint, 'change_accepted', 'system', $2, $3::jsonb)`, [h.edit_of, userId, JSON.stringify({ es: "Cambio confirmado al instante", en: "Change confirmed instantly" })]);
        await c.query(`delete from reservation_holds where id = $1`, [holdId]);
        return { ok: true, numero: ed.number, cambio: "ok" };
      }
      await c.query(
        `insert into change_proposals (operation_id, kind, proposed, created_by, side, respond_by)
         select $1::bigint, 'time', $2::jsonb, $3, 'customer', least(now() + interval '30 minutes', o.scheduled_at, ($4::date + make_interval(mins => $5::int)) at time zone $6) from operations o where o.id = $1::bigint`,
        [h.edit_of, JSON.stringify(prop), userId, h.ymd, hm2m(h.hm), x.tz]);
      await c.query(`insert into operation_events (operation_id, kind, actor, actor_id) values ($1::bigint, 'change_requested', 'user', $2)`, [h.edit_of, userId]);
      await c.query(`delete from reservation_holds where id = $1`, [holdId]);
      return { ok: true, numero: ed.number, cambio: "pend" };
    }
    if (h.edit_of) {
      // Cambiar una solicitud que el restaurante todavía no contestó: misma solicitud, nueva hora.
      const r = await c.query<{ number: string }>(
        `update operations set scheduled_at = ($2::date + make_interval(mins => $3::int)) at time zone $4, party_size = $5, details = details || $6::jsonb, customer_note = nullif($7, ''),
                respond_by = least(now() + interval '30 minutes', ($2::date + make_interval(mins => $3::int)) at time zone $4), updated_at = now()
          where id = $1::bigint and user_id = $8 and status = 'pending' returning number`,
        [h.edit_of, h.ymd, hm2m(h.hm), x.tz, h.party, JSON.stringify(det), nota, userId]);
      if (!r.rows[0]) return no("El restaurante ya contestó: esa reservación no se puede cambiar desde aquí.", "The restaurant already replied: that reservation can't be changed here.");
      numero = r.rows[0].number;
      await c.query(`insert into operation_events (operation_id, kind, actor, actor_id) values ($1::bigint, 'changed', 'user', $2)`, [h.edit_of, userId]);
    } else {
      const dup = await c.query(`select 1 from operations where user_id = $1 and business_id = $2 and kind = 'table' and status in ('pending', 'change_proposed', 'confirmed') and coalesce(status_detail, '') <> 'done'
                                   and (scheduled_at at time zone $4)::date = $3::date`, [userId, x.id, h.ymd, x.tz]);
      void dup; // El diseño deja pedir otra mesa aparte (avisa en la pestaña); no se bloquea.
      const pend = await c.query<{ n: number }>(`select count(*)::int as n from operations where user_id = $1 and kind = 'table' and status = 'pending'`, [userId]);
      if ((pend.rows[0]?.n ?? 0) >= 3) return no("Tienes 3 solicitudes de mesa esperando respuesta. Espera a que te contesten.", "You have 3 table requests waiting for a reply. Wait for an answer.");
      numero = `R-${(await c.query<{ n: string }>(`select nextval('operations_table_seq')::text as n`)).rows[0]!.n}`;
      const auto = x.s.auto;
      const op = await c.query<{ id: string }>(
        `insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, duration_min, party_size, customer_note, details, pay_mode, respond_by, confirmed_at, answered_at, client_key, is_test)
         values ($1, 'table', (select city_id from businesses where id = $2), $2, $3, $4, ($5::date + make_interval(mins => $6::int)) at time zone $7, $8, $9, nullif($10, ''), $11::jsonb, 'none',
                 least(now() + interval '30 minutes', ($5::date + make_interval(mins => $6::int)) at time zone $7), case when $4 = 'confirmed' then now() end, case when $4 = 'confirmed' then now() end,
                 gen_random_uuid(), $12) returning id::text`,
        [numero, x.id, userId, auto ? "confirmed" : "pending", h.ymd, hm2m(h.hm), x.tz, x.s.dur, h.party, nota, JSON.stringify(det), entorno !== "produccion"]);
      await c.query(`insert into operation_events (operation_id, kind, actor, actor_id) values ($1, 'sent', 'user', $2)`, [op.rows[0]!.id, userId]);
      if (auto) await c.query(`insert into operation_events (operation_id, kind, actor, note) values ($1, 'accepted', 'system', $2::jsonb)`, [op.rows[0]!.id, JSON.stringify({ es: "Confirmada al instante", en: "Confirmed instantly" })]);
    }
    await c.query(`delete from reservation_holds where id = $1`, [holdId]);
    return { ok: true, numero };
  });
}

/* Cierra lo que nadie contestó: solicitudes después de 30 min (o a la hora) y propuestas de otra hora después de 15. */
export async function vencerMesas(f: { negocio?: string; userId?: string; numero?: string }) {
  const w: string[] = [], v: unknown[] = [];
  if (f.negocio) { v.push(f.negocio); w.push(`business_id = $${v.length}`); }
  if (f.userId) { v.push(f.userId); w.push(`user_id = $${v.length}::uuid`); }
  if (f.numero) { v.push(f.numero); w.push(`number = $${v.length}`); }
  if (v.length === 0) return;
  const cond = `((status = 'pending' and respond_by <= now()) or (status = 'change_proposed' and exists (select 1 from change_proposals p where p.operation_id = operations.id and p.side = 'business' and p.status = 'open' and p.created_at < now() - interval '15 minutes')))`;
  // Un cambio pedido por el cliente que el restaurante no contestó a tiempo: se cierra y la reservación sigue como está.
  const chg = (await db().query<{ id: string; num: string }>(
    `update change_proposals p set status = 'expired', answered_at = now() from operations o
      where p.operation_id = o.id and p.side = 'customer' and p.status = 'open' and p.respond_by <= now() and o.kind = 'table' and ${w.map((z) => `o.${z}`).join(" and ")}
      returning o.id::text, o.number as num`, v)).rows;
  for (const z of chg) {
    await db().query(`insert into operation_events (operation_id, kind, actor, note) values ($1, 'change_expired', 'system', $2::jsonb)`, [z.id, JSON.stringify({ es: "El cambio no se contestó a tiempo", en: "The change got no reply in time" })]);
    await (await import("./avisos")).avisarMesa(z.num, "rsv_chg_no");
  }
  const hay = await db().query(`select 1 from operations where kind = 'table' and ${w.join(" and ")} and ${cond} limit 1`, v);
  if (!hay.rowCount) return;
  await tx(async (c) => {
    const ids = (await c.query<{ id: string }>(`update operations set status = 'expired', updated_at = now() where kind = 'table' and ${w.join(" and ")} and ${cond} returning id::text`, v)).rows;
    for (const { id } of ids) {
      await c.query(`update change_proposals set status = 'expired', answered_at = now() where operation_id = $1 and status = 'open'`, [id]);
      await c.query(`insert into operation_events (operation_id, kind, actor, note) values ($1, 'expired', 'system', $2::jsonb)`, [id, JSON.stringify({ es: "Nadie contestó a tiempo", en: "No reply in time" })]);
    }
  });
}

/* ── El estado de una reservación (APP-NEG-RESERVA-ESTADO): solo quien la hizo ── */
export type RsvVista = {
  numero: string; negocio: { id: string; nombre: string; telefono: string | null; direccion: string | null; lat: number | null; lng: number | null };
  st: "pend" | "alt" | "ok" | "in" | "done" | "nos" | "no" | "exp" | "cx"; cxPorAlt: boolean; ymd: string; dia: number; h: number; p: number; area: string; dur: number;
  hold: number; cxH: number; reply: number; enviado: string; respondido: string | null; occ: string | null; needs: string[]; nota: string | null; otro: string | null; sms: boolean;
  alt: { h: number; area: string; hasta: string } | null; tarde: number | null;
  chg: { st: "pend" | "no"; ymd: string; dia: number; h: number; p: number; area: string; hasta: string | null } | null; chgOk: boolean; minutosFaltan: number; quien: string; responde: string | null;
};
const estadoMesa = (s: string, d: string | null): RsvVista["st"] =>
  s === "pending" ? "pend" : s === "change_proposed" ? "alt" : s === "confirmed" ? (d === "seated" ? "in" : "ok") : s === "done" ? (d === "noshow" ? "nos" : "done") : s === "declined" ? "no" : s === "expired" ? "exp" : "cx";
export async function rsvDe(userId: string | null, numero: string, negocio?: string): Promise<RsvVista | null> {
  if (!/^R-\d{1,10}$/.test(numero)) return null;
  await vencerMesas({ numero });
  const r = await db().query<{
    id: string; number: string; business_id: string; name: string; phone: string | null; address: string | null; lat: number | null; lng: number | null; status: string; detail: string | null;
    ymd: string; hm: string; party: number; dur: number; details: Record<string, unknown>; customer_note: string | null; sent: string; answered: string | null; tz: string; hoy: string;
    late: number | null; faltan: number; first_name: string | null; last_name: string | null; s: Record<string, number> | null; resp: string | null;
  }>(
    `select o.id::text, o.number, o.business_id, b.name, b.phone, b.address, st_y(b.geo::geometry) as lat, st_x(b.geo::geometry) as lng, o.status, o.status_detail as detail,
            (o.scheduled_at at time zone c.timezone)::date::text as ymd, to_char(o.scheduled_at at time zone c.timezone, 'HH24:MI') as hm, o.party_size as party, coalesce(o.duration_min, 90) as dur,
            o.details, o.customer_note, to_char(o.sent_at at time zone c.timezone, 'HH24:MI') as sent, to_char(o.answered_at at time zone c.timezone, 'HH24:MI') as answered, c.timezone as tz,
            (now() at time zone c.timezone)::date::text as hoy, (o.details->>'late')::int as late, floor(extract(epoch from o.scheduled_at - now()) / 60)::int as faltan,
            u.first_name, u.last_name, to_jsonb(rs) as s, to_char(o.respond_by at time zone c.timezone, 'HH24:MI') as resp
       from operations o join businesses b on b.id = o.business_id join cities c on c.id = o.city_id join users u on u.id = o.user_id
       left join reservation_settings rs on rs.business_id = o.business_id
      where o.number = $1 and o.kind = 'table' and ($2::uuid is null or o.user_id = $2::uuid) and ($3::text is null or o.business_id = $3)`, [numero, userId, negocio ?? null]);
  const o = r.rows[0];
  if (!o) return null;
  const p = (await db().query<{ proposed: { at: string; area: string }; hasta: string }>(
    `select p.proposed, to_char((p.created_at + interval '15 minutes') at time zone $2, 'HH24:MI') as hasta from change_proposals p where p.operation_id = $1 and p.side = 'business' and p.status = 'open' order by p.created_at desc limit 1`, [o.id, o.tz])).rows[0];
  // El último cambio que pidió el cliente: esperando, no confirmado (hasta que toque «Entendido») o confirmado (24 h).
  const ch = (await db().query<{ proposed: Cambio; status: string; visto: boolean; reciente: boolean; hoy: string; hasta: string | null }>(
    `select p.proposed, p.status, p.seen_at is not null as visto, coalesce(p.answered_at, now()) > now() - interval '24 hours' as reciente,
            (now() at time zone $2)::date::text as hoy, to_char(p.respond_by at time zone $2, 'HH24:MI') as hasta
       from change_proposals p where p.operation_id = $1 and p.side = 'customer' order by p.created_at desc limit 1`, [o.id, o.tz])).rows[0];
  const vivaC = o.status === "confirmed" && !o.detail;
  const chg: RsvVista["chg"] = ch && vivaC && (ch.status === "open" || ((ch.status === "declined" || ch.status === "expired") && !ch.visto))
    ? { st: ch.status === "open" ? "pend" : "no", ymd: ch.proposed.ymd, dia: Math.round((Date.parse(ch.proposed.ymd) - Date.parse(ch.hoy)) / 864e5), h: hm2m(ch.proposed.at), p: ch.proposed.party, area: ch.proposed.area, hasta: ch.hasta ? hora(hm2m(ch.hasta)) : null }
    : null;
  const d = o.details as { area?: string; occ?: string; needs?: string[]; otherName?: string; sms?: boolean; cxWhy?: string };
  return {
    numero: o.number, negocio: { id: o.business_id, nombre: o.name, telefono: o.phone, direccion: o.address, lat: o.lat, lng: o.lng },
    st: estadoMesa(o.status, o.detail), cxPorAlt: d.cxWhy === "alt", ymd: o.ymd, dia: Math.round((Date.parse(o.ymd) - Date.parse(o.hoy)) / 864e5), h: hm2m(o.hm), p: o.party, area: d.area ?? "salon", dur: o.dur,
    hold: o.s?.hold_min ?? 15, cxH: o.s?.cancel_free_h ?? 2, reply: o.s?.reply_min ?? 10, enviado: hora(hm2m(o.sent)), respondido: o.answered ? hora(hm2m(o.answered)) : null,
    occ: d.occ ?? null, needs: d.needs ?? [], nota: o.customer_note, otro: d.otherName ?? null, sms: d.sms !== false,
    alt: p ? { h: hm2m(p.proposed.at), area: p.proposed.area, hasta: hora(hm2m(p.hasta)) } : null, tarde: o.late,
    chg, chgOk: !!ch && vivaC && ch.status === "accepted" && ch.reciente, minutosFaltan: o.faltan,
    quien: [o.first_name, o.last_name].filter(Boolean).join(" ") || "—", responde: o.status === "pending" && o.resp ? hora(hm2m(o.resp)) : null,
  };
}

/* ── El cliente: cancelar, aceptar la hora propuesta, avisar que llega tarde ── */
const CX = new Set(["planes", "otro", "hora", "grupo"]);
/* 7d · `por`: «compa» = la cancelación la preparó El Compa y la persona la confirmó; el evento queda con actor 'compa'. Nada más cambia. */
export async function rsvCliente(userId: string, numero: string, que: "cancelar" | "aceptar" | "nogracias" | "tarde" | "chgvisto", extra?: string | number, por: "user" | "compa" = "user"): Promise<ResR> {
  if (!/^R-\d{1,10}$/.test(numero)) return no("Esa reservación no existe.", "That reservation does not exist.");
  await vencerMesas({ numero });
  return tx(async (c) => {
    const o = (await c.query<{ id: string; status: string; detail: string | null; business_id: string; faltan: number; cxh: number }>(
      `select o.id::text, o.status, o.status_detail as detail, o.business_id, floor(extract(epoch from o.scheduled_at - now()) / 60)::int as faltan,
              coalesce((select cancel_free_h from reservation_settings where business_id = o.business_id), 2) as cxh
         from operations o where o.number = $1 and o.user_id = $2 and o.kind = 'table' for update`, [numero, userId])).rows[0];
    if (!o) return no("Esa reservación no existe.", "That reservation does not exist.");
    if (que === "chgvisto") {
      await c.query(`update change_proposals set seen_at = now() where operation_id = $1 and side = 'customer' and status in ('declined', 'expired') and seen_at is null`, [o.id]);
      return { ok: true };
    }
    if (que === "cancelar") {
      if (!["pending", "confirmed", "change_proposed"].includes(o.status) || o.detail) return no("Esta reservación ya no se puede cancelar.", "This reservation can no longer be cancelled.");
      const why = typeof extra === "string" && CX.has(extra) ? extra : "user";
      await c.query(`update operations set status = 'cancelled', cancelled_at = now(), cancelled_by = 'user', cancel_reason = $2, details = details || jsonb_build_object('cxWhy', $2::text), updated_at = now() where id = $1`, [o.id, why]);
      await c.query(`update change_proposals set status = 'declined', answered_at = now() where operation_id = $1 and status = 'open'`, [o.id]);
      // Con menos aviso que el que pide el restaurante, cuenta como cancelación tardía (sin cargo).
      const tardia = o.status === "confirmed" && o.faltan < o.cxh * 60;
      await c.query(`insert into operation_events (operation_id, kind, actor, actor_id, note) values ($1, 'cancelled', $4, $2, $3::jsonb)`,
        [o.id, userId, tardia ? JSON.stringify({ es: "Cancelación tardía · sin cargo", en: "Late cancellation · no charge" }) : null, por === "compa" ? "compa" : "user"]);
      return { ok: true };
    }
    if (que === "aceptar" || que === "nogracias") {
      if (o.status !== "change_proposed") return no("Esa propuesta ya no está.", "That proposal is no longer available.");
      const p = (await c.query<{ id: string; proposed: { at: string; area: string } }>(`select id::text, proposed from change_proposals where operation_id = $1 and side = 'business' and status = 'open' order by created_at desc limit 1 for update`, [o.id])).rows[0];
      if (!p) return no("Esa propuesta ya no está.", "That proposal is no longer available.");
      if (que === "nogracias") {
        await c.query(`update change_proposals set status = 'declined', answered_at = now() where id = $1`, [p.id]);
        await c.query(`update operations set status = 'cancelled', cancelled_at = now(), cancelled_by = 'user', cancel_reason = 'alt', details = details || '{"cxWhy":"alt"}'::jsonb, updated_at = now() where id = $1`, [o.id]);
        await c.query(`insert into operation_events (operation_id, kind, actor, actor_id) values ($1, 'proposal_declined', 'user', $2)`, [o.id, userId]);
        return { ok: true };
      }
      await c.query(`update change_proposals set status = 'accepted', answered_at = now() where id = $1`, [p.id]);
      await c.query(
        `update operations o set status = 'confirmed', confirmed_at = now(), scheduled_at = ((o.scheduled_at at time zone ci.timezone)::date + make_interval(mins => $2::int)) at time zone ci.timezone,
                details = o.details || jsonb_build_object('area', $3::text), updated_at = now()
           from businesses b join cities ci on ci.id = b.city_id where o.id = $1 and b.id = o.business_id`, [o.id, hm2m(p.proposed.at), p.proposed.area]);
      await c.query(`insert into operation_events (operation_id, kind, actor, actor_id) values ($1, 'proposal_accepted', 'user', $2)`, [o.id, userId]);
      return { ok: true };
    }
    // Voy tarde (5, 10 o 15 min): solo el día, ya confirmada y faltando 2 horas o menos.
    const n = Number(extra);
    if (![5, 10, 15].includes(n) || o.status !== "confirmed" || o.detail || o.faltan > 120) return no("Ya no se puede avisar.", "You can no longer let them know.");
    await c.query(`update operations set late_notice_at = now(), details = details || jsonb_build_object('late', $2::int), updated_at = now() where id = $1`, [o.id, n]);
    await c.query(`insert into operation_events (operation_id, kind, actor, actor_id, note) values ($1, 'late', 'user', $2, $3::jsonb)`, [o.id, userId, JSON.stringify({ es: `Llega ${n} min tarde`, en: `${n} min late` })]);
    return { ok: true };
  });
}

/* ── El restaurante (panel): confirmar, proponer otra hora, no hay mesa, llegaron, no llegaron, se fueron ── */
export type PasoMesa = "confirmar" | "otra" | "nohay" | "llegaron" | "nollegaron" | "sefueron";
export async function rsvPaso(negocio: string, numero: string, paso: PasoMesa, actorId: string): Promise<ResR> {
  if (!/^R-\d{1,10}$/.test(numero)) return no("Esa reservación no existe.", "That reservation does not exist.");
  await vencerMesas({ negocio, numero });
  return tx(async (c) => {
    await c.query(`select pg_advisory_xact_lock(hashtext('mesa:' || $1))`, [negocio]);
    const o = (await c.query<{ id: string; status: string; detail: string | null; ymd: string; hm: string; party: number; area: string }>(
      `select o.id::text, o.status, o.status_detail as detail, (o.scheduled_at at time zone ci.timezone)::date::text as ymd, to_char(o.scheduled_at at time zone ci.timezone, 'HH24:MI') as hm,
              o.party_size as party, coalesce(o.details->>'area', 'salon') as area
         from operations o join businesses b on b.id = o.business_id join cities ci on ci.id = b.city_id
        where o.business_id = $1 and o.number = $2 and o.kind = 'table' for update of o`, [negocio, numero])).rows[0];
    if (!o) return no("Esa reservación no existe.", "That reservation does not exist.");
    const ya = no("Esta reservación ya cambió. Actualiza la pantalla.", "This reservation already changed. Refresh the screen.");
    const ev = async (kind: string, note?: Bi) => c.query(`insert into operation_events (operation_id, kind, actor, actor_id, note) values ($1, $2, 'member', $3, $4::jsonb)`, [o.id, kind, actorId, note ? JSON.stringify(note) : null]);
    if (paso === "confirmar" || paso === "nohay") {
      if (o.status !== "pending") return o.status === "expired" ? no("Pasó el tiempo para responder: la solicitud se cerró.", "The time to reply passed: the request was closed.") : ya;
      await c.query(`update operations set status = $2, answered_at = now(), confirmed_at = case when $2 = 'confirmed' then now() end, updated_at = now() where id = $1`, [o.id, paso === "confirmar" ? "confirmed" : "declined"]);
      await ev(paso === "confirmar" ? "accepted" : "declined");
      return { ok: true };
    }
    if (paso === "otra") {
      if (o.status !== "pending") return ya;
      // La hora más cercana con mesa para ese grupo (±30, ±60, +90 min), como el prototipo (TLRsv.near).
      const x = (await contexto(c, negocio))!, d = dia(x, Math.round((Date.parse(o.ymd) - Date.parse(x.hoy)) / 864e5));
      const occ = await ocupacion(c, x, o.ymd, { op: o.id }), blk = await bloqueos(c, x, o.ymd, o.ymd), h0 = hm2m(o.hm);
      let alt: { h: number; area: string } | null = null;
      for (const dd of [30, -30, 60, -60, 90]) { const ar = areaLibre(x, d, h0 + dd, o.party, "", occ, blk); if (ar) { alt = { h: h0 + dd, area: ar }; break; } }
      if (!alt) return no("No hay otra hora con mesa cerca de esa. Usa «No hay mesa».", "There is no other time with a table near that one. Use “No table”.");
      await c.query(`insert into change_proposals (operation_id, kind, proposed, created_by) values ($1, 'time', $2::jsonb, $3)`,
        [o.id, JSON.stringify({ at: `${String(Math.floor(alt.h / 60)).padStart(2, "0")}:${String(alt.h % 60).padStart(2, "0")}`, area: alt.area }), actorId]);
      await c.query(`update operations set status = 'change_proposed', answered_at = now(), updated_at = now() where id = $1`, [o.id]);
      await ev("change_proposed", { es: `Propusiste las ${hora(alt.h)}`, en: `You proposed ${hora(alt.h)}` });
      return { ok: true };
    }
    if (o.status !== "confirmed") return ya;
    if (paso === "llegaron") { if (o.detail) return ya; await c.query(`update operations set status_detail = 'seated', updated_at = now() where id = $1`, [o.id]); await ev("seated"); return { ok: true }; }
    if (paso === "nollegaron") { if (o.detail) return ya; await c.query(`update operations set status = 'done', status_detail = 'noshow', done_at = now(), updated_at = now() where id = $1`, [o.id]); await ev("noshow"); return { ok: true }; }
    if (o.detail !== "seated") return ya;
    await c.query(`update operations set status = 'done', status_detail = null, done_at = now(), updated_at = now() where id = $1`, [o.id]);
    await ev("left");
    return { ok: true };
  });
}

/* ── El restaurante responde al cambio que pidió el cliente: aceptarlo (si la mesa sigue libre) o «no se puede» ── */
export async function rsvCambio(negocio: string, numero: string, que: "aceptar" | "rechazar", actorId: string): Promise<ResR> {
  if (!/^R-\d{1,10}$/.test(numero)) return no("Esa reservación no existe.", "That reservation does not exist.");
  await vencerMesas({ negocio, numero });
  return tx(async (c) => {
    await c.query(`select pg_advisory_xact_lock(hashtext('mesa:' || $1))`, [negocio]);
    const o = (await c.query<{ id: string; status: string; detail: string | null }>(
      `select o.id::text, o.status, o.status_detail as detail from operations o where o.business_id = $1 and o.number = $2 and o.kind = 'table' for update`, [negocio, numero])).rows[0];
    if (!o) return no("Esa reservación no existe.", "That reservation does not exist.");
    const p = (await c.query<{ id: string; proposed: Cambio }>(`select id::text, proposed from change_proposals where operation_id = $1 and side = 'customer' and status = 'open' for update`, [o.id])).rows[0];
    if (!p || o.status !== "confirmed" || o.detail) return no("Ese cambio ya no está: actualiza la pantalla.", "That change is no longer there: refresh the screen.");
    if (que === "rechazar") {
      await c.query(`update change_proposals set status = 'declined', answered_at = now() where id = $1`, [p.id]);
      await c.query(`insert into operation_events (operation_id, kind, actor, actor_id) values ($1, 'change_declined', 'member', $2)`, [o.id, actorId]);
      return { ok: true };
    }
    const x = (await contexto(c, negocio))!, d = dia(x, Math.round((Date.parse(p.proposed.ymd) - Date.parse(x.hoy)) / 864e5));
    const libre = areaLibre(x, d, hm2m(p.proposed.at), p.proposed.party, p.proposed.area, await ocupacion(c, x, p.proposed.ymd, { op: o.id }), await bloqueos(c, x, p.proposed.ymd, p.proposed.ymd));
    if (!libre) return no("Ya no tienes mesa a esa hora para ese grupo. Usa «No se puede»: su reservación sigue como está.", "You no longer have a table at that time for that group. Use “Can't”: the reservation stays as it is.");
    await aplicarCambio(c, o.id, { ...p.proposed, area: libre }, x.tz);
    await c.query(`update change_proposals set status = 'accepted', answered_at = now() where id = $1`, [p.id]);
    await c.query(`insert into operation_events (operation_id, kind, actor, actor_id) values ($1, 'change_accepted', 'member', $2)`, [o.id, actorId]);
    return { ok: true };
  });
}

/* ── El panel: listas y detalle ── */
const DIAS_C: [string, string][] = [["dom", "Sun"], ["lun", "Mon"], ["mar", "Tue"], ["mié", "Wed"], ["jue", "Thu"], ["vie", "Fri"], ["sáb", "Sat"]];
const MESES_C: [string, string][] = [["ene", "Jan"], ["feb", "Feb"], ["mar", "Mar"], ["abr", "Apr"], ["may", "May"], ["jun", "Jun"], ["jul", "Jul"], ["ago", "Aug"], ["sep", "Sep"], ["oct", "Oct"], ["nov", "Nov"], ["dic", "Dec"]];
// «sáb 7 nov» / «Sat Nov 7»: nunca la fecha en crudo (2026-11-07) en una pantalla.
function fechaCorta(ymd: string): Bi {
  const d = new Date(`${ymd}T12:00:00Z`), w = DIAS_C[d.getUTCDay()]!, m = MESES_C[d.getUTCMonth()]!, n = d.getUTCDate();
  return { es: `${w[0]} ${n} ${m[0]}`, en: `${w[1]} ${m[1]} ${n}` };
}
export type FilaMesa = { numero: string; who: string; p: number; ymd: string; h: number; dia: number; area: string; st: RsvVista["st"]; s: Bi; tarde: number | null; hace: number; occ: string | null; needs: string[]; nota: string | null; chg: boolean };
/* Clientes › Reservaciones: los mismos filtros que Pedidos. */
export type FiltroMesa = "all" | "pend" | "cur" | "done" | "no";
const FILTRO_MESA: Record<FiltroMesa, string> = {
  all: "true", pend: "(o.status in ('pending', 'change_proposed') or exists (select 1 from change_proposals p where p.operation_id = o.id and p.side = 'customer' and p.status = 'open'))", cur: "o.status = 'confirmed'",
  done: "o.status = 'done'", no: "o.status in ('declined', 'expired', 'cancelled')",
};
export async function mesasPanel(negocio: string, lang: Lang, f?: { estado?: FiltroMesa; q?: string; antes?: string | null }) {
  void lang;
  await vencerMesas({ negocio });
  const v: unknown[] = [negocio], w = ["o.business_id = $1"];
  const busca = (f?.q ?? "").trim().slice(0, 40);
  if (busca) { v.push(`%${busca.toLowerCase()}%`); w.push(`(lower(o.number) like $${v.length} or lower(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')) like $${v.length})`); }
  if (f?.antes && /^R-\d{1,10}$/.test(f.antes)) { v.push(f.antes); w.push(`o.id < (select id from operations where number = $${v.length})`); }
  if (!f) w.push(`(o.status in ('pending', 'change_proposed') or (o.status = 'confirmed' and o.scheduled_at > now() - interval '4 hours'))`);
  else w.push(FILTRO_MESA[f.estado && FILTRO_MESA[f.estado] ? f.estado : "all"]);
  const r = await db().query<{ number: string; first_name: string | null; last_name: string | null; party: number; ymd: string; hm: string; status: string; detail: string | null; area: string; hoy: string; late: number | null; sent_mins: number; occ: string | null; needs: string[]; nota: string | null; chg: boolean }>(
    `select o.number, u.first_name, u.last_name, o.party_size as party, (o.scheduled_at at time zone c.timezone)::date::text as ymd, to_char(o.scheduled_at at time zone c.timezone, 'HH24:MI') as hm,
            o.status, o.status_detail as detail, coalesce(o.details->>'area', 'salon') as area, (now() at time zone c.timezone)::date::text as hoy, (o.details->>'late')::int as late,
            floor(extract(epoch from now() - o.sent_at) / 60)::int as sent_mins, o.details->>'occ' as occ, coalesce(o.details->'needs', '[]'::jsonb) as needs, o.customer_note as nota,
            exists (select 1 from change_proposals p where p.operation_id = o.id and p.side = 'customer' and p.status = 'open') as chg
       from operations o join users u on u.id = o.user_id join cities c on c.id = o.city_id where o.kind = 'table' and ${w.join(" and ")}
      order by ${f ? "o.id desc" : "o.scheduled_at"} limit ${f ? 31 : 200}`, v);
  const filas: FilaMesa[] = r.rows.map((x) => {
    const st = estadoMesa(x.status, x.detail), dia = Math.round((Date.parse(x.ymd) - Date.parse(x.hoy)) / 864e5), h = hm2m(x.hm);
    const cuando: Bi = dia === 0 ? { es: "Hoy", en: "Today" } : dia === 1 ? { es: "Mañana", en: "Tomorrow" } : fechaCorta(x.ymd);
    const per: Bi = { es: `${x.party} ${x.party === 1 ? "persona" : "personas"}`, en: `${x.party} ${x.party === 1 ? "guest" : "guests"}` };
    const ar = AREAS[x.area] ?? AREAS.salon!;
    return { numero: x.number, who: [x.first_name, x.last_name ? `${x.last_name[0]}.` : ""].filter(Boolean).join(" ") || "—", p: x.party, ymd: x.ymd, h, dia, area: x.area, st, tarde: x.late,
      hace: x.sent_mins, occ: x.occ, needs: x.needs, nota: x.nota, chg: x.chg,
      s: { es: `${cuando.es} · ${hora(h)} · ${per.es} · ${ar.es}${x.late ? ` · llega ${x.late} min tarde` : ""}`, en: `${cuando.en} · ${hora(h)} · ${per.en} · ${ar.en}${x.late ? ` · ${x.late} min late` : ""}` } };
  });
  // Cuentas por filtro (con la misma búsqueda), para los chips de Clientes.
  let cuentas: Record<FiltroMesa, number> | null = null;
  if (f) {
    const vc: unknown[] = [negocio], wc = ["o.business_id = $1"];
    if (busca) { vc.push(`%${busca.toLowerCase()}%`); wc.push(`(lower(o.number) like $2 or lower(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')) like $2)`); }
    const k = (await db().query<Record<FiltroMesa, number>>(
      `select ${(Object.keys(FILTRO_MESA) as FiltroMesa[]).map((z) => `count(*) filter (where ${FILTRO_MESA[z]})::int as "${z}"`).join(", ")}
         from operations o join users u on u.id = o.user_id where o.kind = 'table' and ${wc.join(" and ")}`, vc)).rows[0]!;
    cuentas = k;
  }
  return { filas: filas.slice(0, f ? 30 : 200), mas: f && r.rows.length > 30 ? filas[29]!.numero : null, cuentas, total: cuentas ? cuentas.all : filas.length };
}
export async function mesaDetalle(negocio: string, numero: string) {
  const v = await rsvDe(null, numero, negocio);
  if (!v) return null;
  const ev = await db().query<{ kind: string; at: string; quien: string | null; note: Bi | null }>(
    `select e.kind, to_char(e.at at time zone c.timezone, 'HH24:MI') as at, e.note,
            case when e.actor in ('member', 'business') then (select coalesce(nullif(u.first_name, ''), 'Alguien') from users u where u.id::text = e.actor_id) end as quien
       from operation_events e join operations o on o.id = e.operation_id join cities c on c.id = o.city_id where o.number = $1 order by e.at, e.id`, [numero]);
  const T: Record<string, (q: string | null, n: Bi | null) => Bi> = {
    sent: () => ({ es: "Llegó por To’Latino", en: "Came in through To’Latino" }),
    accepted: (q) => (q ? { es: `Confirmada por ${q}`, en: `Confirmed by ${q}` } : { es: "Confirmada al instante", en: "Confirmed instantly" }),
    declined: (q) => ({ es: `Sin mesa${q ? ` · ${q}` : ""}`, en: `No table${q ? ` · ${q}` : ""}` }),
    change_proposed: (_q, n) => n ?? { es: "Propusiste otra hora", en: "You proposed another time" },
    proposal_accepted: () => ({ es: "El cliente aceptó la hora propuesta", en: "The client accepted the proposed time" }),
    proposal_declined: () => ({ es: "El cliente no tomó la hora propuesta", en: "The client didn't take the proposed time" }),
    changed: () => ({ es: "El cliente cambió la solicitud", en: "The client changed the request" }),
    change_requested: () => ({ es: "El cliente pidió un cambio", en: "The client asked for a change" }),
    change_accepted: (q, n) => n ?? (q ? { es: `Cambio aceptado por ${q}`, en: `Change accepted by ${q}` } : { es: "Cambio aceptado", en: "Change accepted" }),
    change_declined: (q) => ({ es: `Cambio no se pudo${q ? ` · ${q}` : ""}`, en: `Change declined${q ? ` · ${q}` : ""}` }),
    change_expired: () => ({ es: "El cambio no se contestó a tiempo", en: "The change got no reply in time" }),
    late: (_q, n) => n ?? { es: "Llega tarde", en: "Running late" },
    seated: () => ({ es: "Llegaron · en su mesa", en: "Arrived · seated" }),
    noshow: () => ({ es: "No llegaron · queda en su historial", en: "No-show · noted on their history" }),
    left: () => ({ es: "Se fueron · mesa libre", en: "Left · table free" }),
    expired: () => ({ es: "Nadie contestó a tiempo", en: "No reply in time" }),
    cancelled: (_q, n) => n ?? { es: "La canceló el cliente", en: "Cancelled by the client" },
  };
  return { ...v, tl: ev.rows.map((e) => ({ t: (T[e.kind] ?? (() => e.note ?? { es: e.kind, en: e.kind }))(e.quien, e.note), at: hora(hm2m(e.at)) })) };
}

/* Cuántas solicitudes esperan respuesta del negocio (pestañas de Clientes). */
export async function mesasPendientes(negocio: string) {
  await vencerMesas({ negocio });
  return (await db().query<{ n: number }>(`select count(*)::int as n from operations o where o.business_id = $1 and o.kind = 'table' and (o.status = 'pending' or (o.status = 'confirmed' and exists (select 1 from change_proposals p where p.operation_id = o.id and p.side = 'customer' and p.status = 'open')))`, [negocio])).rows[0]?.n ?? 0;
}

/* ── Ajustes (Panel › Lo que vendes › Reservaciones) ── */
export async function rsvAjustes(negocio: string) {
  const x = await contexto(db(), negocio);
  if (!x) return null;
  const blk = await bloqueos(db(), x, x.hoy, fecha(x.hoy, 60));
  const hoyR = await db().query<{ n: number; p: number }>(
    `select count(*)::int as n, coalesce(sum(party_size), 0)::int as p from operations o join cities c on c.id = o.city_id
      where o.business_id = $1 and o.kind = 'table' and o.status in ('pending', 'confirmed', 'change_proposed') and coalesce(o.status_detail, '') <> 'noshow'
        and (o.scheduled_at at time zone c.timezone)::date = (now() at time zone c.timezone)::date`, [negocio]);
  return { s: x.s, on: x.mods.includes("rsv"), admOff: x.off.rsv?.reason ?? null, pro: x.plan === "pro", hoy: x.hoy, dow: x.dow, now: x.now, cerradoHoy: x.cerradoHoy,
    abiertos: Object.entries(x.horas).filter(([, r]) => r.length).map(([k]) => Number(k)),
    // Por día de la semana: la hora en que abre y la última en que cierra (minutos), para avisar si un turno no cabe.
    horas: Object.fromEntries(Object.entries(x.horas).filter(([, r]) => r.length).map(([k, r]) => [k, [Math.min(...r.map((z) => z[0])), Math.max(...r.map((z) => z[1]))]])) as Record<string, [number, number]>,
    blk: blk.map((b) => ({ ...b, dia: Math.round((Date.parse(b.day) - Date.parse(x.hoy)) / 864e5) })), hoyN: hoyR.rows[0]?.n ?? 0, hoyP: hoyR.rows[0]?.p ?? 0 };
}
export { FABRICA as AJUSTES_FABRICA, tablasDe, total as totalMesas, SZ as TAMANOS };
