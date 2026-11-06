import "server-only";
import { estadoEstimado, type EstadoEstimado } from "./estimados";
import type { PoolClient } from "pg";
import { db } from "./db";
import { pasarela } from "./pagos/pasarela";
import { cobrarOperacion, comision, registrarRetencion } from "./cobros";
import { TOPE_FREE } from "./plan";

/* Citas (Fase 3 · 3b). Lo que el cliente ve en la ficha (pestaña Servicios, hoja del servicio) y el Booking: el motor de
   disponibilidad y el envío. Fuente: prototipo neg-bell-book.js (priceOf, slotsFor, bookVals, submit) con los conflictos
   resueltos en docs/diseno/plan/fase3-citas.md.
   - Disponibilidad real: el horario de la persona (o el del negocio, menos los días cerrados) menos sus citas vivas
     (pendientes, con cambio propuesto o confirmadas), cada una con su tiempo entre citas. Pasos de 30 min (60 si el
     servicio dura 3 h o más), el servicio cabe antes de cerrar y hoy solo desde ahora + 30 min. 14 días.
   - El servidor decide todo: precio por persona, opciones, extras, duración, depósito y si la hora sigue libre (con un
     candado por negocio al enviar: dos personas no toman la misma hora).
   - Depósito: se retiene en la tarjeta al enviar; se cobra al confirmar (al instante si confirma al instante) y se libera
     si no se confirma. Lo pone el negocio o cada silla. Las sillas rentadas cobran con su propia cuenta (bloque 3d); hasta
     entonces una silla rentada no pide depósito.
   - Comisión de To'Latino: 8 % de lo que pasa por la tarjeta (fee_rules 'cita'); el depósito liberado no paga nada. */
type Bi = { es: string; en: string };
export type Q = PoolClient | ReturnType<typeof db>;
export const hm2m = (hm: string) => { const [h = 0, m = 0] = hm.split(":").map(Number); return h * 60 + m; };
export const horaL = (m: number) => { m = ((Math.round(m) % 1440) + 1440) % 1440; const h = Math.floor(m / 60), mm = m % 60; return `${h % 12 || 12}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
export const fecha = (hoy: string, i: number) => { const d = new Date(`${hoy}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + i); return d.toISOString().slice(0, 10); };
const dowDe = (ymd: string) => new Date(`${ymd}T12:00:00Z`).getUTCDay();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ID = /^\d{1,18}$/;
export const DIAS = 14;

export type Politica = { auto: boolean; resp: number; dep: number; cxh: number; tol: number; pick: boolean; exp: number };
const POL: Politica = { auto: false, resp: 30, dep: 0, cxh: 2, tol: 15, pick: true, exp: 2 };

export type OpcionPub = { t: Bi; o: { n: Bi; p: number; m: number }[] };
export type ServicioPub = {
  id: string; sec: string | null; name: Bi; desc: Bi; cents: number; dur: number; desde: boolean; opts: OpcionPub[]; extra: boolean; foto: string | null;
  hacen: { id: string; cents: number }[]; // quién lo hace y a qué precio (con sillas rentadas, el de cada silla)
};
export type PersonaPub = {
  id: string; nombre: string; corto: string; kind: "owner" | "staff" | "renter"; silla: number | null; foto: string | null;
  auto: boolean; resp: number; dep: number; // reglas efectivas: las de su silla (sillas rentadas) o las del negocio
};
export type MiaCita = { numero: string; st: "pend" | "ok" | "alt"; svc: string; ymd: string; i: number; m: number; con: string; resp: number };
export type CitasPublica = {
  negocio: { id: string; nombre: string; direccion: string | null; telefono: string | null; foto: string | null };
  model: "emp" | "comm" | "chair"; secciones: { id: string; name: Bi }[]; servicios: ServicioPub[]; extras: ServicioPub[]; gente: PersonaPub[];
  w: { uno: Bi; varios: Bi; silla: Bi }; // barbero/silla o estilista/estación (prototipo CH)
  pol: Politica; can: boolean; off: "pausa" | "tope" | "apagado" | null; mia: MiaCita | null; hoy: string;
};

export type Ctx = {
  id: string; name: string; tz: string; city: string; plan: string; address: string | null; phone: string | null; foto: string | null; mods: string[];
  off: Record<string, { reason?: string }>; hoy: string; now: number; model: CitasPublica["model"]; mes: string;
  horas: Record<number, [number, number][]>; especiales: { desde: string; hasta: string; closed: boolean; ranges: [number, number][] }[];
  cerradoHasta: string | null; cerradoHoy: boolean; pol: Politica; cuenta: string | null; barberia: boolean;
};
export type Persona = PersonaPub & { recibe: boolean; mismo: boolean; wk: ([number, number] | null)[] | null; cuenta: string | null }; // cuenta: a dónde va el depósito

export async function contexto(c: Q, negocio: string, cats: string[] = ["NEG-BELL", "NEG-AUTO", "NEG-HOGAR"]): Promise<Ctx | null> {
  const b = (await c.query<{
    id: string; name: string; tz: string; city: string; plan: string; address: string | null; phone: string | null; foto: string | null; mods: string[]; off: Record<string, { reason?: string }> | null;
    hoy: string; hm: string; mes: string; model: CitasPublica["model"] | null; cerrado_hasta: string | null; cerrado_hoy: boolean; pol: Record<string, unknown> | null; acct: string | null; subs: string[];
  }>(
    `select b.id, b.name, ci.timezone as tz, b.city_id as city, coalesce(st.plan, 'free') as plan, b.address, b.phone, b.logo_url as foto, b.modules_on as mods, b.modules_off as off,
            (now() at time zone ci.timezone)::date::text as hoy, to_char(now() at time zone ci.timezone, 'HH24:MI') as hm, to_char(now() at time zone ci.timezone, 'YYYY-MM') as mes,
            b.svc_model as model, b.subcategory_ids as subs, (b.temp_closed_until at time zone ci.timezone)::date::text as cerrado_hasta, coalesce(b.closed_on = (now() at time zone ci.timezone)::date, false) as cerrado_hoy,
            to_jsonb(p) as pol, (select a.stripe_account_id from stripe_accounts a where a.business_id = b.id and a.charges_enabled and not a.payouts_paused) as acct
       from businesses b join cities ci on ci.id = b.city_id left join business_stats_cache st on st.business_id = b.id left join booking_policies p on p.business_id = b.id
      where b.id = $1 and b.status = 'active' and b.category_id = any($2::text[])`, [negocio, cats])).rows[0]; // el Booking de Belleza pide solo Belleza (Auto y Hogar tienen el suyo, Fase 4)
  if (!b) return null;
  // Una tras otra: `c` puede ser el cliente de la transacción de enviarCita.
  const h = await c.query<{ weekday: number; open: boolean; ranges: [string, string][] }>(`select weekday, open, ranges from business_hours where business_id = $1 and module = ''`, [negocio]);
  const e = await c.query<{ desde: string; hasta: string; closed: boolean; ranges: [string, string][] }>(
    `select date_from::text as desde, date_to::text as hasta, closed, ranges from special_hours where business_id = $1 and date_to >= $2::date and date_from <= $2::date + ${DIAS}`, [negocio, b.hoy]);
  const rng = (L: [string, string][]) => L.map(([a, z]) => { const A = hm2m(a), Z = hm2m(z); return [A, Z <= A ? Math.min(Z + 1440, 1440) : Z] as [number, number]; });
  const horas: Ctx["horas"] = {};
  for (const d of h.rows) horas[d.weekday] = d.open ? rng(d.ranges) : [];
  const p = b.pol as Record<string, never> | null;
  const pol: Politica = p ? { auto: !!p.auto_approve, resp: p.response_min ?? 30, dep: p.deposit_cents ?? 0, cxh: p.cancel_free_h ?? 2, tol: p.tolerance_min ?? 15, pick: p.staff_pick ?? true, exp: p.expires_h ?? 2 } : POL;
  // Cuenta de cobro para depósitos: una simulada solo en el sandbox; una real, solo con la clave de Stripe.
  const modo = pasarela.modo(), cuenta = b.acct && modo !== "apagado" && b.acct.startsWith("acct_sim_") === (modo === "simulador") ? b.acct : null;
  return {
    id: b.id, name: b.name, tz: b.tz, city: b.city, plan: b.plan, address: b.address, phone: b.phone, foto: b.foto, mods: b.mods ?? [], off: b.off ?? {}, hoy: b.hoy, now: hm2m(b.hm), mes: b.mes,
    model: b.model ?? "emp", horas, especiales: e.rows.map((x) => ({ desde: x.desde, hasta: x.hasta, closed: x.closed, ranges: rng(x.ranges ?? []) })),
    cerradoHasta: b.cerrado_hasta, cerradoHoy: b.cerrado_hoy, pol, cuenta, barberia: (b.subs ?? []).includes("NEG-BELL-01"),
  };
}

export async function gente(c: Q, x: Ctx): Promise<Persona[]> {
  const r = await c.query<{ id: string; nombre: string; kind: Persona["kind"]; silla: number | null; foto: string | null; auto: boolean; resp: number | null; dep: number | null; recibe: boolean; mismo: boolean; wk: Persona["wk"]; macct: string | null }>(
    `select m.id::text, m.display_name as nombre, m.kind, m.chair_seat as silla, m.photo_url as foto, m.chair_auto as auto, m.chair_response_min as resp, m.chair_deposit_cents as dep,
            m.takes_bookings as recibe, m.same_as_business_hours as mismo, m.weekly_schedule as wk, mp.stripe_account_id as macct
       from business_members m left join member_payout_accounts mp on mp.member_id = m.id and mp.charges_enabled
      where m.business_id = $1 and m.status = 'active' and m.show_on_page and m.hidden_by_admin is null
      order by (m.kind = 'owner') desc, m.chair_seat nulls last, m.sort, m.id`, [x.id]);
  const silla = x.model === "chair", modo = pasarela.modo();
  // Una cuenta simulada solo cobra en el sandbox; una real, solo con la clave de Stripe.
  const valida = (a: string | null) => (a && modo !== "apagado" && a.startsWith("acct_sim_") === (modo === "simulador") ? a : null);
  return r.rows.map((m) => {
    const dep = silla ? (m.dep ?? x.pol.dep) : x.pol.dep;
    // Silla rentada: el depósito va a SU cuenta de cobro (3d); sin cuenta conectada no pide depósito en línea.
    const cuenta = silla && m.kind === "renter" ? valida(m.macct) : x.cuenta;
    return {
      id: m.id, nombre: m.nombre, corto: m.nombre.split(" ")[0] ?? m.nombre, kind: m.kind, silla: silla ? m.silla : null, foto: m.foto,
      auto: silla ? m.auto : x.pol.auto, resp: silla ? (m.resp ?? x.pol.resp) : x.pol.resp,
      dep: cuenta ? dep : 0,
      recibe: m.recibe, mismo: m.mismo, wk: m.wk, cuenta,
    };
  });
}

async function servicios(c: Q, x: Ctx, G: Persona[]) {
  const S = await c.query<{ id: string; name: Bi }>(`select id::text, name from item_sections where business_id = $1 and module = 'svc' and removed_at is null order by sort, id`, [x.id]);
  const I = await c.query<Omit<ServicioPub, "hacen">>(
      `select i.id::text, i.section_id::text as sec, i.name, coalesce(i.descr, '{"es":"","en":""}'::jsonb) as desc, i.price_cents as cents, coalesce(i.duration_min, 30) as dur,
              i.price_from as desde, i.svc_opts as opts, i.is_extra as extra, i.photos[1] as foto
         from items i where i.business_id = $1 and i.module = 'svc' and i.removed_at is null and i.sell and i.status <> 'hidden' order by i.is_extra, i.sort, i.id`, [x.id]);
  const H = await c.query<{ item: string; member: string; cents: number | null }>(
      `select s.item_id::text as item, s.member_id::text as member, s.price_cents as cents from staff_services s join items i on i.id = s.item_id where i.business_id = $1`, [x.id]);
  const ok = G.filter((p) => p.recibe);
  const L: ServicioPub[] = I.rows.map((s) => {
    const rows = H.rows.filter((h) => h.item === s.id);
    // Sin nadie marcado: lo hace cualquiera que recibe citas, al precio del local.
    const hacen = rows.length ? rows.filter((h) => ok.some((p) => p.id === h.member)).map((h) => ({ id: h.member, cents: h.cents ?? s.cents })) : ok.map((p) => ({ id: p.id, cents: s.cents }));
    return { ...s, opts: Array.isArray(s.opts) ? s.opts : [], hacen };
  });
  return { secciones: S.rows, servicios: L.filter((s) => !s.extra && s.hacen.length), extras: L.filter((s) => s.extra) };
}

/* ¿Se puede pedir hora en línea? Módulo de citas encendido, sin pausa de To'Latino y, con Free, solicitudes del mes. */
async function puede(c: Q, x: Ctx): Promise<CitasPublica["off"]> {
  if (!x.mods.includes("citas")) return "apagado";
  if (x.off.citas || x.off.svc) return "pausa";
  if (x.plan === "pro") return null;
  const r = (await c.query<{ cap: number; usados: number }>(
    `select coalesce((select (value #>> '{}')::int from platform_config where key = 'free_ops_cap'), $3) as cap,
            (select count(*)::int from operations where business_id = $1 and kind <> 'table' and free_quota_month = $2) as usados`, [x.id, x.mes, TOPE_FREE])).rows[0];
  return r && r.usados >= r.cap ? "tope" : null;
}

export async function citasPublica(negocio: string, userId: string | null): Promise<CitasPublica | null> {
  const pool = db(), x = await contexto(pool, negocio, ["NEG-BELL"]); // el pool (sin transacción): se puede en paralelo
  if (!x || !(x.mods.includes("svc") || x.mods.includes("citas"))) return null;
  const G = await gente(pool, x);
  const [{ secciones, servicios: S, extras }, off, mia] = await Promise.all([servicios(pool, x, G), puede(pool, x), userId ? miaCita(pool, x, userId) : Promise.resolve(null)]);
  if (!S.length) return null;
  const usados = new Set(S.flatMap((s) => s.hacen.map((h) => h.id)));
  return {
    negocio: { id: x.id, nombre: x.name, direccion: x.address, telefono: x.phone, foto: x.foto }, model: x.model, secciones: secciones.filter((s) => S.some((v) => v.sec === s.id)),
    servicios: S, extras, gente: G.filter((p) => p.recibe && usados.has(p.id)).map(({ recibe: _r, mismo: _m, wk: _w, cuenta: _c, ...p }) => p),
    pol: x.pol, can: off === null, off, mia, hoy: x.hoy,
    w: x.barberia ? { uno: { es: "barbero", en: "barber" }, varios: { es: "barberos", en: "barbers" }, silla: { es: "Silla", en: "Chair" } }
      : { uno: { es: "estilista", en: "stylist" }, varios: { es: "estilistas", en: "stylists" }, silla: { es: "Estación", en: "Station" } },
  };
}

async function miaCita(c: Q, x: Ctx, userId: string): Promise<MiaCita | null> {
  const r = (await c.query<{ numero: string; status: string; svc: string; ymd: string; hm: string; con: string | null; resp: number | null }>(
    `select o.number as numero, o.status, coalesce(o.details #>> '{svc,es}', '') as svc, (o.scheduled_at at time zone $3)::date::text as ymd, to_char(o.scheduled_at at time zone $3, 'HH24:MI') as hm,
            m.display_name as con, m.chair_response_min as resp
       from operations o left join business_members m on m.id = o.member_id
      where o.user_id = $1 and o.business_id = $2 and o.kind = 'appointment' and o.status in ('pending', 'change_proposed', 'confirmed') and o.scheduled_at > now() - interval '1 hour'
      order by o.sent_at desc limit 1`, [userId, x.id, x.tz])).rows[0];
  if (!r) return null;
  return { numero: r.numero, st: r.status === "confirmed" ? "ok" : r.status === "change_proposed" ? "alt" : "pend", svc: r.svc, ymd: r.ymd, i: Math.round((Date.parse(r.ymd) - Date.parse(x.hoy)) / 864e5), m: hm2m(r.hm),
    con: r.con?.split(" ")[0] ?? x.name, resp: x.model === "chair" ? (r.resp ?? x.pol.resp) : x.pol.resp };
}

/* ── Precio y tiempo de lo elegido con una persona (el mismo cálculo al mostrar y al enviar) ── */
export type Eleccion = { svc: string; opts: Record<string, number>; adds: string[] };
export function calcular(s: ServicioPub, extras: ServicioPub[], e: Eleccion, persona: string | null) {
  const base = persona ? s.hacen.find((h) => h.id === persona)?.cents : Math.min(...s.hacen.map((h) => h.cents));
  if (base == null) return null;
  let cents = base, dur = s.dur;
  const ol: { g: Bi; o: Bi; p: number }[] = [];
  for (const [gi, g] of s.opts.entries()) {
    const k = e.opts[String(gi)];
    const o = k == null ? undefined : g.o[k];
    if (!o) return null; // cada grupo es obligatorio: «Elige 1»
    cents += o.p; dur += o.m; ol.push({ g: g.t, o: o.n, p: o.p });
  }
  const al: { id: string; name: Bi; cents: number; dur: number }[] = [];
  for (const id of [...new Set(e.adds)]) {
    const a = extras.find((z) => z.id === id);
    if (!a) return null;
    const ac = persona ? a.hacen.find((h) => h.id === persona)?.cents ?? a.cents : a.cents;
    cents += ac; dur += a.dur; al.push({ id: a.id, name: a.name, cents: ac, dur: a.dur });
  }
  return { cents: Math.max(0, cents), dur: Math.max(5, Math.min(600, dur)), base, ol, al };
}

/* ── Disponibilidad ── */
type Ocupa = { m: string; ymd: string; s: number; e: number };
export async function ocupadas(c: Q, x: Ctx, sinOp?: string | null): Promise<Ocupa[]> {
  // Lo que ocupa la agenda: pendientes y confirmadas en su hora; con «otra hora» del negocio, la hora propuesta (la pedida
  // quedó libre); con un cambio pedido por el cliente, su hora actual y la que pide.
  const r = await c.query<{ m: string; ymd: string; hm: string; d: number; b: number }>(
    `select o.member_id::text as m, (t.at at time zone $2)::date::text as ymd, to_char(t.at at time zone $2, 'HH24:MI') as hm, coalesce(o.duration_min, 30) as d, o.buffer_min as b
       from operations o
       cross join lateral (
         select o.scheduled_at as at where o.status in ('pending', 'confirmed')
         union all
         select ((p.proposed->>'ymd')::date + make_interval(mins => (p.proposed->>'m')::int)) at time zone $2 from change_proposals p
          where p.operation_id = o.id and p.status = 'open' and p.proposed ? 'm'
       ) t
      where o.business_id = $1 and o.kind = 'appointment' and o.member_id is not null and o.status in ('pending', 'change_proposed', 'confirmed')
        and coalesce(o.status_detail, '') not in ('done', 'noshow')
        and t.at >= ($3::date at time zone $2) and t.at < (($3::date + ${DIAS + 1}) at time zone $2) and ($4::bigint is null or o.id <> $4::bigint)`,
    [x.id, x.tz, x.hoy, sinOp ?? null]);
  return r.rows.map((o) => { const s = hm2m(o.hm); return { m: o.m, ymd: o.ymd, s, e: s + o.d + o.b }; });
}
function rangos(x: Ctx, p: Persona, i: number): [number, number][] {
  const ymd = fecha(x.hoy, i), dow = dowDe(ymd);
  if (i === 0 && x.cerradoHoy) return [];
  if (x.cerradoHasta && ymd <= x.cerradoHasta) return [];
  const esp = x.especiales.find((e) => e.desde <= ymd && ymd <= e.hasta);
  if (esp?.closed) return [];
  if (esp && esp.ranges.length) return esp.ranges;
  if (!p.mismo && Array.isArray(p.wk) && p.wk.length === 7) { const t = p.wk[dow]; return t ? [[Math.round(t[0] * 60), Math.round(t[1] * 60)]] : []; }
  return x.horas[dow] ?? [];
}
export type Hueco = { m: number; l: string; free: boolean; who?: string };
export function huecos(x: Ctx, cand: Persona[], i: number, dur: number, buf: number, occ: Ocupa[]): Hueco[] {
  const ymd = fecha(x.hoy, i), step = dur >= 180 ? 60 : 30, desde = i === 0 ? x.now + 30 : -1;
  const porM = new Map<number, Hueco>();
  // Carga del día de cada uno: «Cualquiera» toma a quien tiene menos.
  const carga = new Map(cand.map((p) => [p.id, occ.filter((o) => o.m === p.id && o.ymd === ymd).reduce((n, o) => n + o.e - o.s, 0)]));
  for (const p of [...cand].sort((a, b) => (carga.get(a.id) ?? 0) - (carga.get(b.id) ?? 0))) {
    const mias = occ.filter((o) => o.m === p.id && o.ymd === ymd);
    for (const [a, z] of rangos(x, p, i)) {
      for (let t = Math.ceil(a / step) * step; t + dur <= z; t += step) {
        if (t < desde) continue;
        const libre = !mias.some((o) => t < o.e && o.s < t + dur + buf);
        const h = porM.get(t);
        if (!h) porM.set(t, { m: t, l: horaL(t), free: libre, who: libre ? p.id : undefined });
        else if (!h.free && libre) { h.free = true; h.who = p.id; }
      }
    }
  }
  return [...porM.values()].sort((a, b) => a.m - b.m);
}

export type HorasCita = {
  dias: { i: number; ymd: string; dow: number; num: string; off: boolean }[]; grupos: { k: "m" | "t" | "n"; sl: Hueco[] }[];
  sig: { i: number; m: number } | null; dur: number; cents: number | null;
};
type Pedido = Eleccion & { con: string; i: number };
export async function preparar(c: Q, negocio: string, q: Pedido, sinOp?: string | null) {
  const x = await contexto(c, negocio, ["NEG-BELL"]);
  if (!x) return null;
  const G = await gente(c, x);
  const { servicios: S, extras } = await servicios(c, x, G);
  const s = S.find((v) => v.id === q.svc);
  if (!s) return null;
  const hacen = G.filter((p) => p.recibe && s.hacen.some((h) => h.id === p.id));
  const elegido = q.con !== "any" ? hacen.find((p) => p.id === q.con) ?? null : null;
  // Con sillas rentadas siempre se elige con quién; con empleados, «Cualquiera» si el negocio lo deja.
  const cand = elegido ? [elegido] : x.model === "chair" ? [] : hacen;
  const calc = calcular(s, extras, q, elegido?.id ?? null);
  // El tiempo entre citas: el del servicio (no se le muestra al cliente).
  const buf = (await c.query<{ b: number }>(`select buffer_min as b from items where id = $1::bigint`, [s.id])).rows[0]?.b ?? 0;
  return { x, G, s, extras, cand, elegido, calc, buf, occ: await ocupadas(c, x, sinOp) };
}
export async function idCita(userId: string, numero: string) {
  return (await db().query<{ id: string }>(`select id::text from operations where number = $1 and user_id = $2 and kind = 'appointment'`, [numero, userId])).rows[0]?.id ?? null;
}
export async function horasCita(negocio: string, q: Pedido, sinOp?: string | null): Promise<HorasCita | null> {
  const c = db(), P = await preparar(c, negocio, q, sinOp);
  if (!P || !P.calc || !P.cand.length) return null;
  const { x, cand, calc, buf, occ } = P;
  const i = Math.max(0, Math.min(DIAS - 1, Math.floor(q.i) || 0));
  const dias = Array.from({ length: DIAS }, (_, k) => {
    const ymd = fecha(x.hoy, k);
    return { i: k, ymd, dow: dowDe(ymd), num: String(Number(ymd.slice(8))), off: !huecos(x, cand, k, calc.dur, buf, occ).some((h) => h.free) };
  });
  const sl = huecos(x, cand, i, calc.dur, buf, occ);
  const grupos = ([["m", (m: number) => m < 720], ["t", (m: number) => m >= 720 && m < 1020], ["n", (m: number) => m >= 1020]] as const)
    .map(([k, f]) => ({ k, sl: sl.filter((h) => f(h.m)).map((h) => (q.con === "any" ? h : { ...h, who: undefined })) })).filter((g) => g.sl.length);
  let sig: HorasCita["sig"] = null;
  if (!sl.some((h) => h.free)) for (let k = i + 1; k < DIAS && !sig; k++) { const h = huecos(x, cand, k, calc.dur, buf, occ).find((z) => z.free); if (h) sig = { i: k, m: h.m }; }
  return { dias, grupos, sig, dur: calc.dur, cents: calc.cents };
}

/* Próxima hora libre de cada persona para un servicio típico de 40 min (pestaña Servicios › Por barbero, la hoja). */
export async function proximas(negocio: string, dur = 40): Promise<Record<string, { i: number; m: number } | null>> {
  const pool = db(), x = await contexto(pool, negocio, ["NEG-BELL"]);
  if (!x) return {};
  const [G, occ] = await Promise.all([gente(pool, x), ocupadas(pool, x)]);
  const out: Record<string, { i: number; m: number } | null> = {};
  for (const p of G.filter((z) => z.recibe)) {
    out[p.id] = null;
    for (let k = 0; k < DIAS && !out[p.id]; k++) { const h = huecos(x, [p], k, dur, 0, occ).find((z) => z.free); if (h) out[p.id] = { i: k, m: h.m }; }
  }
  return out;
}

/* ── Enviar la solicitud (o la cita, si confirma al instante) ── */
export type CitaIn = Pedido & {
  m: number; para: "me" | "other" | "kid"; nombre?: string; edad?: string; nota?: string; sms?: boolean; pm?: string | null; clave: string; fotos?: string[]; cambiar?: string | null;
};
type ResCita = { ok: true; numero: string; st: "pend" | "ok"; cambio?: "pend" } | { ok: false; msg: Bi; tarjeta?: true; hora?: true; entrar?: true };
const no = (es: string, en: string, x: { tarjeta?: true; hora?: true } = {}): ResCita => ({ ok: false, msg: { es, en }, ...x });
const EDADES = ["1–3", "4–7", "8–12"];

export async function enviarCita(userId: string, negocio: string, f: CitaIn, entorno: string): Promise<ResCita> {
  if (!UUID.test(String(f?.clave)) || !ID.test(String(f?.svc)) || !(f?.con === "any" || UUID.test(String(f?.con)))) return no("Revisa tu cita y vuelve a intentarlo.", "Check your booking and try again.");
  const para = ["me", "other", "kid"].includes(f.para) ? f.para : "me";
  const nombre = String(f.nombre ?? "").replace(/\s+/g, " ").trim().slice(0, 40), edad = EDADES.includes(String(f.edad)) ? String(f.edad) : null;
  if (para !== "me" && nombre.length < 2) return no("Falta el nombre.", "Name missing.");
  if (para === "kid" && !edad) return no("Elige la edad.", "Choose the age.");
  const nota = String(f.nota ?? "").trim().slice(0, 280);
  if (/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(nota)) return no("Por seguridad, sin teléfonos en la nota.", "For safety, no phone numbers in the note.");
  const m = Math.floor(Number(f.m)), i = Math.floor(Number(f.i));
  if (!(m >= 0 && m < 1440 && i >= 0 && i < DIAS)) return no("Elige día y hora.", "Choose day and time.");
  const adds = Array.isArray(f.adds) ? f.adds.map(String).filter((a) => ID.test(a)).slice(0, 10) : [];
  const fotos = Array.isArray(f.fotos) ? [...new Set(f.fotos.map(String).filter((x) => UUID.test(x)))] : [];
  if (fotos.length > 3) return no("Hasta 3 fotos.", "Up to 3 photos.");
  const opts: Record<string, number> = {};
  for (const [k, v] of Object.entries(f.opts && typeof f.opts === "object" ? f.opts : {})) if (/^[0-2]$/.test(k) && Number.isInteger(v) && v >= 0 && v < 5) opts[k] = v;

  const c = await db().connect();
  let retenido: string | null = null;
  try {
    await c.query("begin");
    const ya = (await c.query<{ number: string; status: string }>(`select number, status from operations where user_id = $1 and client_key = $2`, [userId, f.clave])).rows[0];
    if (ya) { await c.query("rollback"); return { ok: true, numero: ya.number, st: ya.status === "confirmed" ? "ok" : "pend" }; }
    // Un candado por negocio: la hora se revisa y se toma sin que otra solicitud se cruce.
    await c.query(`select pg_advisory_xact_lock(hashtext('cita:' || $1))`, [negocio]);
    // Cambiar una cita propia (pendiente o confirmada): mismo servicio y misma persona; su hora actual no cuenta como ocupada.
    const cam = typeof f.cambiar === "string" && /^C-\d{1,10}$/.test(f.cambiar) ? (await c.query<{ id: string; number: string; status: string; mid: string; svc: string; start: string; detail: string | null }>(
      `select id::text, number, status, member_id::text as mid, details->>'svcId' as svc, scheduled_at::text as start, status_detail as detail from operations
        where number = $1 and user_id = $2 and kind = 'appointment' and business_id = $3 for update`, [f.cambiar, userId, negocio])).rows[0] ?? null : null;
    if (f.cambiar && (!cam || !["pending", "confirmed"].includes(cam.status) || cam.detail || cam.svc !== f.svc)) { await c.query("rollback"); return no("Esa cita ya no se puede cambiar desde aquí.", "That booking can no longer be changed here."); }
    const P = await preparar(c, negocio, { svc: f.svc, opts, adds, con: cam ? cam.mid : f.con, i }, cam?.id ?? null);
    if (!P) { await c.query("rollback"); return no("Ese servicio ya no está disponible.", "That service is no longer available."); }
    const off = await puede(c, P.x);
    if (off) { await c.query("rollback"); return off === "tope" ? no(`${P.x.name} no recibe más citas en línea este mes. Llama para pedir tu hora.`, `${P.x.name} takes no more online bookings this month. Call for a time.`) : no(`${P.x.name} no toma citas en línea por ahora: llama o pasa por el local.`, `${P.x.name} is not taking online bookings right now: call or stop by.`); }
    if (!P.cand.length) { await c.query("rollback"); return no("Elige con quién.", "Choose who."); }
    if (!P.calc) { await c.query("rollback"); return no("Elige las opciones del servicio.", "Choose the service options."); }
    const h = huecos(P.x, P.cand, i, P.calc.dur, P.buf, P.occ).find((z) => z.m === m);
    if (!h?.free || !h.who) { await c.query("rollback"); return no("Esa hora ya no está libre. Elige otra.", "That time is no longer open. Pick another.", { hora: true }); }
    const quien = P.G.find((p) => p.id === h.who)!;
    // Con «Cualquiera» el precio es el de quien queda (con empleados es el mismo del local).
    const calc = calcular(P.s, P.extras, { svc: f.svc, opts, adds }, quien.id)!;
    if (cam) {
      const ymd0 = fecha(P.x.hoy, i), at = `(($2::date + make_interval(mins => $3::int)) at time zone $4)`;
      if (cam.status === "pending" || quien.auto) {
        await c.query(`update operations set scheduled_at = ${at}, late_notice_at = null, details = details - 'rec24' - 'rec2', updated_at = now(),
                              respond_by = case when status = 'pending' then least(now() + make_interval(hours => $5::int), ${at}) else respond_by end where id = $1::bigint`,
          [cam.id, ymd0, m, P.x.tz, P.x.pol.exp]);
        await c.query(`insert into operation_events (operation_id, kind, actor, actor_id, note) values ($1::bigint, 'changed', 'user', $2, $3::jsonb)`, [cam.id, userId, JSON.stringify({ es: `Cambió a ${horaL(m)}`, en: `Moved to ${horaL(m)}` })]);
        await c.query("commit");
        return { ok: true, numero: cam.number, st: cam.status === "pending" ? "pend" : "ok" };
      }
      if ((await c.query(`select 1 from change_proposals where operation_id = $1::bigint and side = 'customer' and status = 'open'`, [cam.id])).rowCount) { await c.query("rollback"); return no("Ya pediste un cambio: espera la respuesta.", "You already asked for a change: wait for the reply."); }
      await c.query(`insert into change_proposals (operation_id, kind, proposed, created_by, side, respond_by)
                     values ($1::bigint, 'time', $2::jsonb, $3, 'customer', least(now() + make_interval(hours => $4::int), $5::timestamptz, (($6::date + make_interval(mins => $7::int)) at time zone $8)))`,
        [cam.id, JSON.stringify({ ymd: ymd0, m, member: cam.mid }), userId, P.x.pol.exp, cam.start, ymd0, m, P.x.tz]);
      await c.query(`insert into operation_events (operation_id, kind, actor, actor_id) values ($1::bigint, 'change_requested', 'user', $2)`, [cam.id, userId]);
      await c.query("commit");
      return { ok: true, numero: cam.number, st: "ok", cambio: "pend" };
    }
    const pend = (await c.query<{ n: number }>(`select count(*)::int as n from operations where user_id = $1 and kind = 'appointment' and status = 'pending'`, [userId])).rows[0]?.n ?? 0;
    if (pend >= 3) { await c.query("rollback"); return no("Tienes 3 solicitudes de cita esperando respuesta. Espera a que te contesten.", "You have 3 booking requests waiting for a reply. Wait for an answer."); }
    const dep = Math.min(quien.dep, calc.cents), auto = quien.auto, ymd = fecha(P.x.hoy, i);
    const numero = `C-${(await c.query<{ n: string }>(`select nextval('operations_appt_seq')::text as n`)).rows[0]!.n}`;
    // Depósito: se retiene antes de guardar la cita (si el banco la rechaza, no hay cita).
    let ret: Awaited<ReturnType<typeof pasarela.retener>> | null = null, fee = 0;
    if (dep > 0) {
      const pm = typeof f.pm === "string" && /^pm_[A-Za-z0-9_]{3,200}$/.test(f.pm) ? f.pm : null;
      if (!pm || !quien.cuenta) { await c.query("rollback"); return no("Elige la tarjeta para el depósito.", "Choose the card for the deposit.", { tarjeta: true }); }
      fee = Math.min(await comision(c, "cita", dep), dep);
      const cliente = await pasarela.cliente(userId).catch(() => null);
      ret = await pasarela.retener({ centavos: dep, comision: fee, destino: quien.cuenta, pm, cliente, idem: `cita-${f.clave}-${pm.slice(-24)}`, meta: { appointment: numero, business_id: P.x.id } });
      if (!ret.ok) { await c.query("rollback"); return no(ret.mensaje.es, ret.mensaje.en, { tarjeta: true }); }
      retenido = ret.pi;
      if (ret.estado === "accion") { await c.query("rollback"); await pasarela.liberar(ret.pi).catch(() => undefined); retenido = null; return no("Tu banco pide una verificación extra que todavía no hacemos aquí. Prueba con otra tarjeta.", "Your bank asks for an extra verification we can't do here yet. Try another card.", { tarjeta: true }); }
    }
    const det = {
      svc: P.s.name, svcId: P.s.id, opts: calc.ol, adds: calc.al.map((a) => ({ id: a.id, name: a.name, cents: a.cents })), para, nombre: para === "me" ? null : nombre, edad: para === "kid" ? edad : null,
      sms: f.sms !== false, cualquiera: f.con === "any", base: calc.base, sel: opts,
    };
    const op = (await c.query<{ id: string }>(
      `insert into operations (number, kind, city_id, business_id, user_id, member_id, status, scheduled_at, duration_min, buffer_min, customer_note, details,
                               subtotal_cents, total_cents, deposit_cents, pay_mode, respond_by, confirmed_at, answered_at, free_quota_month, client_key, is_test)
       values ($1, 'appointment', $2, $3, $4, $5, $6, ($7::date + make_interval(mins => $8::int)) at time zone $9, $10, $11, nullif($12, ''), $13::jsonb,
               $14, $14, $15, $16, case when $6 = 'pending' then least(now() + make_interval(hours => $17::int), ($7::date + make_interval(mins => $8::int)) at time zone $9) end,
               case when $6 = 'confirmed' then now() end, case when $6 = 'confirmed' then now() end, $18, $19, $20) returning id::text`,
      [numero, P.x.city, P.x.id, userId, quien.id, auto ? "confirmed" : "pending", ymd, m, P.x.tz, calc.dur, P.buf, nota, JSON.stringify(det),
        calc.cents, dep, dep > 0 ? "app" : "local", P.x.pol.exp, P.x.plan === "pro" ? null : P.x.mes, f.clave, entorno !== "produccion"])).rows[0]!.id;
    await c.query(`insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct, options) values ($1, $2, $3::jsonb, 1, $4, $4, 0, $5::jsonb)`,
      [op, P.s.id, JSON.stringify(P.s.name), calc.base + calc.ol.reduce((n, o) => n + o.p, 0), JSON.stringify(calc.ol.map((o) => ({ g: o.g, o: o.o, cents: o.p })))]);
    for (const a of calc.al) await c.query(`insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct, options) values ($1, $2, $3::jsonb, 1, $4, $4, 0, '[]'::jsonb)`, [op, a.id, JSON.stringify(a.name), a.cents]);
    if (ret?.ok) await registrarRetencion(c, { opId: op, userId, negocio: P.x.id, city: P.x.city, total: dep, comision: fee, r: ret, pm: f.pm ?? undefined, kind: "deposit" });
    // Fotos de referencia: pasan de la persona a la cita (solo las suyas, recién subidas).
    if (fotos.length) {
      const ok = await c.query(`update media set owner_kind = 'appointment', owner_id = $1, sort = array_position($3::uuid[], id)
                                 where id = any($3::uuid[]) and uploaded_by = $2 and owner_kind = 'user' and status = 'visible'`, [op, userId, fotos]);
      if (ok.rowCount !== fotos.length) { await c.query("rollback"); if (retenido) { await pasarela.liberar(retenido).catch(() => undefined); retenido = null; } return no("Una de las fotos ya no está. Súbela otra vez.", "One of the photos is gone. Upload it again."); }
    }
    await c.query(`insert into operation_events (operation_id, kind, actor, actor_id) values ($1, 'sent', 'user', $2)`, [op, userId]);
    if (auto) await c.query(`insert into operation_events (operation_id, kind, actor, note) values ($1, 'accepted', 'system', $2::jsonb)`, [op, JSON.stringify({ es: "Confirmada al instante", en: "Confirmed instantly" })]);
    // Ya no hace falta avisarle de una hora libre ese día en este negocio.
    await c.query(`update appointment_alerts set removed_at = now() where user_id = $1 and business_id = $2 and day = $3::date and removed_at is null`, [userId, P.x.id, ymd]);
    await c.query("commit");
    retenido = null;
    if (auto && dep > 0) await cobrarOperacion(op); // confirma al instante: el depósito se cobra al confirmar
    return { ok: true, numero, st: auto ? "ok" : "pend" };
  } catch (e) {
    await c.query("rollback").catch(() => undefined);
    if (retenido) await pasarela.liberar(retenido).catch(() => undefined); // se retuvo y la cita no se guardó
    throw e;
  } finally {
    c.release();
  }
}

/* «Avísame si se libera una hora»: una por persona, negocio, con quién y día. */
export async function alertaHora(userId: string, negocio: string, con: string, i: number, on: boolean): Promise<boolean> {
  const x = await contexto(db(), negocio);
  if (!x || !(i >= 0 && i < DIAS)) return false;
  const ymd = fecha(x.hoy, Math.floor(i)), mid = UUID.test(con) ? con : null;
  if (on) await db().query(`insert into appointment_alerts (user_id, business_id, member_id, day) values ($1, $2, $3, $4::date) on conflict do nothing`, [userId, x.id, mid, ymd]);
  else await db().query(`update appointment_alerts set removed_at = now() where user_id = $1 and business_id = $2 and coalesce(member_id::text, '') = coalesce($3, '') and day = $4::date and removed_at is null`, [userId, x.id, mid, ymd]);
  return on;
}
export async function alertaDe(userId: string, negocio: string, con: string, i: number) {
  const x = await contexto(db(), negocio);
  if (!x) return false;
  const r = await db().query(`select 1 from appointment_alerts where user_id = $1 and business_id = $2 and coalesce(member_id::text, '') = coalesce($3, '') and day = $4::date and removed_at is null`,
    [userId, x.id, UUID.test(con) ? con : null, fecha(x.hoy, Math.floor(i))]);
  return !!r.rowCount;
}

/* Avisos al enviar: al negocio (solicitud o cita confirmada) y al cliente si quedó confirmada. */
export async function avisarCitaNueva(numero: string, cliente: string) {
  const o = (await db().query<{ biz: string; uid: string; negocio: string; st: string; svc: string; dia: string; hora: string; con: string | null; cualquiera: boolean; resp: number; dep: number }>(
    `select o.business_id as biz, o.user_id::text as uid, b.name as negocio, o.status as st, coalesce(o.details #>> '{svc,es}', '') as svc,
            to_char(o.scheduled_at at time zone c.timezone, 'FMDD/FMMM') as dia, to_char(o.scheduled_at at time zone c.timezone, 'FMHH12:MI AM') as hora, m.display_name as con,
            coalesce((o.details->>'cualquiera')::boolean, false) as cualquiera, coalesce(case when b.svc_model = 'chair' then m.chair_response_min end, p.response_min, 30) as resp, o.deposit_cents as dep
       from operations o join businesses b on b.id = o.business_id join cities c on c.id = o.city_id left join business_members m on m.id = o.member_id
       left join booking_policies p on p.business_id = o.business_id where o.number = $1 and o.kind = 'appointment'`, [numero]).catch(() => ({ rows: [] }))).rows[0];
  if (!o) return;
  const { avisar, avisarNegocio } = await import("./avisos");
  const con = o.con ? ` con ${o.con.split(" ")[0]}` : "";
  const href = `/panel/${o.biz}/hoy?det=cita:${numero}`;
  await avisarNegocio(o.biz, o.st === "confirmed" ? "biz_cita_ok" : "biz_cita", { cliente, servicio: o.svc, dia: o.dia, hora: o.hora, con, min: o.resp }, { href, ref: ["appointment", numero] });
  if (o.st === "confirmed") await avisar(o.uid, o.dep > 0 ? "cita_ok_dep" : "cita_ok", { negocio: o.negocio, dia: o.dia, hora: o.hora, dep: `$${(o.dep / 100).toFixed(2)}` }, { href: `/cita/${numero}`, ref: ["appointment", numero] });
}

/* ── La cita (APP-NEG-CITA): solo la ve quien la pidió. ── */
export type CitaVista = {
  numero: string; st: "pend" | "ok" | "alt" | "no" | "exp" | "cx" | "done"; negocio: { id: string; nombre: string; direccion: string | null; telefono: string | null; foto: string | null };
  model: CitasPublica["model"]; con: { nombre: string; corto: string; silla: number | null; foto: string | null } | null; silla: Bi;
  svc: Bi; opts: { g: Bi; o: Bi; p: number }[]; adds: { name: Bi; cents: number }[]; ymd: string; i: number; m: number; dur: number; total: number; dep: number;
  para: "me" | "other" | "kid"; nombre: string | null; edad: string | null; nota: string | null; fotos: string[]; auto: boolean; resp: number; exp: number;
  enviada: number; contestada: number | null; tarjeta: string | null; pago: string | null; cxPor: string | null;
  svcId: string | null; optIdx: string; addIds: string[]; mid: string | null; late: number | null; perdio: boolean; cxRazon: string | null; mins: number;
  alt: { ymd: string; i: number; m: number; hasta: string } | null; chg: { ymd: string; i: number; m: number } | null; resena: boolean; cxh: number; tol: number;
  ayuda: { n: string; st: "open" | "answered" | "escalated" | "resolved" } | null; noshow: boolean;
  // Auto y Hogar (4b–4c): el rubro, el paso en curso y el vehículo o la casa.
  rubro: "auto" | "hogar" | null; paso: string | null; veh: string | null; casa: string | null; w: string | null; win: number | null;
  // 4d: el estimado, «algo más» y el dinero (lo calcula el servidor).
  est: EstadoEstimado | null; garantia: string | null;
  pre: { num: string; lo: number; hi: number } | null; // 4e: el pre-estimado o presupuesto con que reservó
  // Doctores (4j): el seguro copiado a la cita, si lo aceptan, el precio en la consulta, para quién y si es por video.
  pro: { modo: string; precio: Bi; legal: boolean; total: import("./total-escrito").TotalVista | null } | null; // Profesionales (4l): la consulta y el total por escrito
  salud: { seguro: Bi; acepta: boolean; ninguno: boolean; precio: Bi; para: "yo" | "hijo" | "otro"; tele: boolean; seg: boolean; segHasta: string | null; sinSeg: number } | null;
};
export async function citaVista(userId: string, numero: string): Promise<CitaVista | null> {
  if (!/^C-\d{1,10}$/.test(numero)) return null;
  const r = (await db().query<{
    numero: string; status: string; biz: string; nombre: string; direccion: string | null; telefono: string | null; foto: string | null; model: CitasPublica["model"]; subs: string[];
    con: string | null; silla: number | null; cfoto: string | null; det: Record<string, unknown>; mid: string | null; razon: string | null; mins: number; resena: boolean;
    alt: { ymd: string; m: number } | null; alt_hasta: string | null; chg: { ymd: string; m: number } | null; ymd: string; hm: string; hoy: string; dur: number; total: number; dep: number; nota: string | null;
    enviada: string; contestada: string | null; cxh: number; tol: number; brand: string | null; l4: string | null; pago: string | null; auto: boolean; resp: number; exp: number; cx: string | null; fotos: string[];
    ayuda: { n: string; st: "open" | "answered" | "escalated" | "resolved" } | null; noshow: boolean; paso: string | null; oid: string; warr: { m: number | null; mi: number | null } | null; seg_hasta: string | null;
  }>(
    `select o.number as numero, o.status, b.id as biz, b.name as nombre, b.address as direccion, b.phone as telefono, b.logo_url as foto, b.svc_model as model, b.subcategory_ids as subs,
            m.display_name as con, case when b.svc_model = 'chair' then m.chair_seat end as silla, m.photo_url as cfoto, o.details as det, o.member_id::text as mid, o.cancel_reason as razon,
            floor(extract(epoch from o.scheduled_at - now()) / 60)::int as mins,
            exists (select 1 from reviews r where r.user_id = o.user_id and r.business_id = o.business_id and r.status <> 'removed') as resena,
            (select p.proposed from change_proposals p where p.operation_id = o.id and p.side = 'business' and p.status = 'open' order by p.id desc limit 1) as alt,
            (select to_char(p.respond_by at time zone c.timezone, 'FMHH12:MI AM') from change_proposals p where p.operation_id = o.id and p.side = 'business' and p.status = 'open' order by p.id desc limit 1) as alt_hasta,
            (select p.proposed from change_proposals p where p.operation_id = o.id and p.side = 'customer' and p.status = 'open' order by p.id desc limit 1) as chg,
            (o.scheduled_at at time zone c.timezone)::date::text as ymd, to_char(o.scheduled_at at time zone c.timezone, 'HH24:MI') as hm, (now() at time zone c.timezone)::date::text as hoy,
            coalesce(o.duration_min, 30) as dur, o.total_cents as total, o.deposit_cents as dep, o.customer_note as nota,
            to_char(o.sent_at at time zone c.timezone, 'HH24:MI') as enviada, to_char(o.answered_at at time zone c.timezone, 'HH24:MI') as contestada,
            p.card_brand as brand, p.card_last4 as l4, p.status as pago,
            coalesce(case when b.svc_model = 'chair' then m.chair_auto end, bp.auto_approve, false) as auto,
            coalesce(case when b.svc_model = 'chair' then m.chair_response_min end, bp.response_min, 30) as resp, coalesce(bp.expires_h, 2) as exp, o.cancelled_by as cx, coalesce(bp.cancel_free_h, 2) as cxh, coalesce(bp.tolerance_min, 15) as tol,
            array(select x.url from media x where x.owner_kind = 'appointment' and x.owner_id = o.id::text and x.status = 'visible' order by x.sort) as fotos,
            (select jsonb_build_object('n', h.number, 'st', h.status) from help_requests h where h.operation_id = o.id) as ayuda, coalesce(o.status_detail = 'noshow', false) as noshow, o.status_detail as paso, o.id::text as oid,
            (select jsonb_build_object('m', t.warranty_months, 'mi', t.warranty_miles) from trade_settings t where t.business_id = o.business_id) as warr,
            to_char(o.respond_by at time zone c.timezone, 'FMHH12:MI AM') as seg_hasta
       from operations o join businesses b on b.id = o.business_id join cities c on c.id = o.city_id left join business_members m on m.id = o.member_id
       left join booking_policies bp on bp.business_id = o.business_id left join payments p on p.operation_id = o.id and p.kind = 'deposit'
      where o.number = $1 and o.user_id = $2 and o.kind = 'appointment'`, [numero, userId])).rows[0];
  if (!r) return null;
  const ST: Record<string, CitaVista["st"]> = { pending: "pend", change_proposed: "alt", confirmed: "ok", declined: "no", expired: "exp", cancelled: "cx", done: "done" };
  const d = r.det as { svc?: Bi; svcId?: string; sel?: Record<string, number>; opts?: CitaVista["opts"]; adds?: { id?: string; name: Bi; cents: number }[]; para?: CitaVista["para"]; nombre?: string | null; edad?: string | null; late?: number; perdio?: boolean };
  const idx = (ymd: string) => Math.round((Date.parse(ymd) - Date.parse(r.hoy)) / 864e5);
  const BR: Record<string, string> = { visa: "Visa", mastercard: "Mastercard", mc: "Mastercard", amex: "Amex", discover: "Discover", disc: "Discover" };
  const barberia = (r.subs ?? []).includes("NEG-BELL-01");
  return {
    numero: r.numero, st: ST[r.status] ?? "pend", negocio: { id: r.biz, nombre: r.nombre, direccion: r.direccion, telefono: r.telefono, foto: r.foto }, model: r.model,
    con: r.con ? { nombre: r.con, corto: r.con.split(" ")[0] ?? r.con, silla: r.silla, foto: r.cfoto } : null, silla: barberia ? { es: "Silla", en: "Chair" } : { es: "Estación", en: "Station" },
    svc: d.svc ?? { es: "", en: "" }, opts: d.opts ?? [], adds: d.adds ?? [], ymd: r.ymd, i: Math.round((Date.parse(r.ymd) - Date.parse(r.hoy)) / 864e5), m: hm2m(r.hm), dur: r.dur,
    total: r.total, dep: r.dep, para: d.para ?? "me", nombre: d.nombre ?? null, edad: d.edad ?? null, nota: r.nota, fotos: r.fotos ?? [], auto: r.auto, resp: r.resp, exp: r.exp,
    enviada: hm2m(r.enviada), contestada: r.contestada ? hm2m(r.contestada) : null, tarjeta: r.brand && r.l4 ? `${BR[r.brand] ?? r.brand} ·· ${r.l4}` : null, pago: r.pago, cxPor: r.cx,
    svcId: d.svcId ?? null, optIdx: Object.entries(d.sel ?? {}).map(([g, k]) => `${g}-${k}`).join(","), addIds: (d.adds ?? []).map((a) => a.id).filter((x): x is string => !!x), mid: r.mid,
    late: d.late ?? null, perdio: !!d.perdio, cxRazon: r.razon, mins: r.mins, resena: r.resena, cxh: r.cxh, tol: r.tol,
    alt: r.alt ? { ymd: r.alt.ymd, i: idx(r.alt.ymd), m: r.alt.m, hasta: r.alt_hasta ?? "" } : null, chg: r.chg ? { ymd: r.chg.ymd, i: idx(r.chg.ymd), m: r.chg.m } : null,
    ayuda: r.ayuda, noshow: r.noshow,
    rubro: ((r.det as { rubro?: string }).rubro === "auto" || (r.det as { rubro?: string }).rubro === "hogar" ? (r.det as { rubro: "auto" | "hogar" }).rubro : null), paso: r.paso, veh: (r.det as { veh?: { t: string } }).veh?.t ?? null, casa: (r.det as { casa?: { dir: string } }).casa?.dir ?? null,
    w: (r.det as { w?: string }).w ?? null, win: (r.det as { win?: number }).win ?? null,
    est: ["auto", "hogar"].includes(String((r.det as { rubro?: string }).rubro)) ? await estadoEstimado(db(), r.oid) : null,
    garantia: r.warr?.m ? `${r.warr.m}|${r.warr.mi ?? 0}` : null,
    pre: (r.det as { pre?: { num: string; lo: number; hi: number } }).pre ?? null,
    pro: (r.det as { rubro?: string }).rubro === "pro" ? await (async () => { const z = r.det as { modo?: string; precio?: Bi; legal?: boolean }; const { totalDe } = await import("./total-escrito"); return { modo: z.modo ?? "oficina", precio: z.precio ?? { es: "", en: "" }, legal: !!z.legal, total: await totalDe(r.oid) }; })() : null,
    salud: (r.det as { rubro?: string }).rubro === "salud" ? (() => {
      const z = r.det as { seguro?: { kind?: string; acepta?: boolean; nombre?: Bi }; precio?: Bi; para?: "yo" | "hijo" | "otro"; tele?: boolean; sinSeg?: number };
      return { seguro: z.seguro?.nombre ?? { es: "", en: "" }, acepta: !!z.seguro?.acepta, ninguno: z.seguro?.kind === "none", precio: z.precio ?? { es: "", en: "" }, para: z.para ?? "yo", tele: !!z.tele,
        seg: r.paso === "seg", segHasta: r.paso === "seg" ? r.seg_hasta : null, sinSeg: Number(z.sinSeg ?? 0) };
    })() : null,
  };
}

/* La página de una silla (3d): la persona de esa silla en un local que renta sillas, si sale en la página. */
export async function sillaPublica(negocio: string, n: number) {
  if (!Number.isInteger(n) || n < 1 || n > 30) return null;
  const r = (await db().query<{ id: string; nombre: string; foto: string | null; silla: number; since: number | null; bio: Bi | null; kind: string; negocio: string; logo: string | null; direccion: string | null; subs: string[] }>(
    `select m.id::text, m.display_name as nombre, m.photo_url as foto, m.chair_seat as silla, m.since_year as since, m.bio, m.kind,
            b.name as negocio, b.logo_url as logo, b.address as direccion, b.subcategory_ids as subs
       from business_members m join businesses b on b.id = m.business_id
      where m.business_id = $1 and m.chair_seat = $2 and m.status = 'active' and m.show_on_page and m.hidden_by_admin is null and b.svc_model = 'chair' and b.status = 'active'`, [negocio, n])).rows[0];
  if (!r) return null;
  const barberia = (r.subs ?? []).includes("NEG-BELL-01");
  return { ...r, oficio: barberia ? { es: "Barbero", en: "Barber" } : { es: "Estilista", en: "Stylist" }, puesto: barberia ? { es: "Silla", en: "Chair" } : { es: "Estación", en: "Station" } };
}
