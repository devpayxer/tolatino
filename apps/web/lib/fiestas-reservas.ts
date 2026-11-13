import "server-only";
import type { PoolClient } from "pg";
import { contexto, type Ctx } from "./citas";
import { cobrarOperacion, comision, devolverPago, liberarOperacion, registrarRetencion } from "./cobros";
import { db, tx } from "./db";
import { diasOcupados, recalcularFiltrosFiesta } from "./fiestas";
import { diaFiesta, EVT, sumarDias, type Bi, type SvcFiesta } from "./fiestas-comun";
import { pasarela } from "./pagos/pasarela";

/* Pedir la fecha de una fiesta (Fase 4 · 4v · fase4-fiestas-transporte.md §3 y §4v · neg-fiesta-flow.js).
   - Una fiesta es una operación `party` (F-5101…). El depósito = mín(depósito del negocio, total) se RETIENE al enviar y se
     COBRA cuando el negocio confirma; si no confirma, propone otra hora que no aceptas o no contesta en 24 h, se libera completo.
   - Todo lo que toca el día va con candado `fiesta:{negocio}:{día}`: dos clientes que piden el mismo sábado no pueden quedar
     confirmados los dos si el negocio atiende una fiesta por día. Confirmar escribe la fila de party_days en la misma
     transacción y declina sola las demás solicitudes de ese día cuando el día se llena.
   - Cancelar (cliente): sin confirmar → se libera; confirmada y faltan los días de la regla del negocio o más → devolución
     completa; menos → el depósito se queda con el negocio. Cancelar (negocio): devolución completa siempre y motivo.
   - El resto se paga al negocio fuera de la app, como dice el acuerdo por escrito (versión 1 = el paquete copiado al enviar). */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, ID = /^\d{1,18}$/, YMD = /^\d{4}-\d{2}-\d{2}$/;
export const NUM_F = /^F-\d{1,10}$/;
export const HORAS_F = [600, 660, 720, 780, 840, 900, 960, 1020, 1080, 1140, 1200]; // 10 AM – 8 PM
export const HORAS_V = [600, 660, 780, 840, 900, 960]; // visita al salón 10 AM – 4 PM
const money = (c: number) => `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const no = (es: string, en: string, extra?: Record<string, true>) => ({ ok: false as const, msg: { es, en } as Bi, ...extra });

/* Lo que se cobra por lo elegido (el servidor; la pantalla muestra lo mismo con la misma función). */
export function calcularFiesta(s: Pick<SvcFiesta, "k" | "cents" | "h" | "per" | "min">, g: number | null, q: { qty?: number | null; horas?: number | null }) {
  const vis = s.k === "visita";
  const horas = s.k === "hora" ? Math.min(12, Math.max(s.min ?? 1, Math.round(Number(q.horas) || (s.min ?? 1)))) : null;
  const qty = s.k === "unid" ? Math.min(2000, Math.max(s.min ?? 1, s.per && g ? Math.ceil(g / s.per) : Math.round(Number(q.qty) || 1))) : 1;
  const tot = vis ? 0 : s.k === "hora" ? s.cents * horas! : s.cents * qty;
  const dur = vis ? 30 : s.k === "pack" && s.h ? Math.min(600, Math.max(60, s.h * 60)) : s.k === "hora" ? Math.min(600, horas! * 60) : 240;
  return { qty, horas, tot, dur, vis };
}

type Svc = SvcFiesta & { dur: number };
async function servicio(c: PoolClient | ReturnType<typeof db>, negocio: string, id: string): Promise<Svc | null> {
  if (!ID.test(id)) return null;
  return (await c.query<Svc>(
    `select i.id::text, i.section_id::text as sec, i.name, coalesce(i.descr, '{"es":"","en":""}'::jsonb) as desc, i.price_cents as cents, coalesce(i.svc_kind, 'fijo') as k,
            (i.svc_attrs->>'h')::int as h, (i.svc_attrs->>'cap')::int as cap, coalesce((i.svc_attrs->>'mont')::boolean, false) as mont,
            coalesce(i.svc_attrs->'inc', '[]'::jsonb) as inc, i.svc_attrs->'u' as u, (i.svc_attrs->>'per')::int as per, (i.svc_attrs->>'min')::int as min, i.photos[1] as foto, coalesce(i.duration_min, 120) as dur
       from items i where i.id = $1::bigint and i.business_id = $2 and i.module = 'svc' and i.removed_at is null and i.sell and i.status = 'live' and not i.is_extra`, [id, negocio])).rows[0] ?? null;
}
type Ajustes = { dep: number; guests: number | null; perDay: number; ahead: number; cancel: number };
async function ajustes(c: PoolClient | ReturnType<typeof db>, negocio: string): Promise<Ajustes> {
  const s = (await c.query<{ dep: number; guests: number | null; per: number; ahead: number; cancel: number }>(
    `select deposit_cents as dep, guests_max as guests, events_per_day as per, book_ahead_days as ahead, cancel_full_days as cancel from fiesta_settings where business_id = $1`, [negocio])).rows[0];
  return { dep: s?.dep ?? 0, guests: s?.guests ?? null, perDay: s?.per ?? 1, ahead: s?.ahead ?? 180, cancel: s?.cancel ?? 30 };
}
/* Las horas de inicio de ese día que ya toma otra fiesta (pendiente, con otra hora propuesta o confirmada) cuando el negocio
   no puede atender más a la vez. Nunca al azar: salen de las reservas del día. */
async function tomadas(c: PoolClient | ReturnType<typeof db>, x: Ctx, dia: string, sinOp: string | null = null) {
  return (await c.query<{ m: number; d: number }>(
    `select (extract(hour from o.scheduled_at at time zone $3) * 60 + extract(minute from o.scheduled_at at time zone $3))::int as m, o.duration_min as d
       from operations o where o.business_id = $1 and o.kind = 'party' and o.status in ('pending', 'change_proposed', 'confirmed') and not coalesce((o.details->>'visit')::boolean, false)
        and (o.scheduled_at at time zone $3)::date = $2::date and ($4::bigint is null or o.id <> $4::bigint)`, [x.id, dia, x.tz, sinOp])).rows;
}
const choca = (m: number, d: number, L: { m: number; d: number }[], perDay: number) => L.filter((z) => m < z.m + z.d && z.m < m + d).length >= perDay;

/* ── El Booking (APP-NEG-FIESTA-BOOKING): lo que la pantalla necesita para pedir la fecha. ── */
export type BookingFiesta = {
  negocio: { id: string; nombre: string; foto: string | null; ciudad: string; direccion: string | null; telefono: string | null };
  svc: SvcFiesta; dur: number; aj: Ajustes; depositoEnApp: boolean; hoy: string; hasta: string; ocupadas: string[];
  tomadas: Record<string, { m: number; d: number }[]>; zone: number | null; va: boolean; salones: { id: string; nombre: string; dir: string | null }[];
  dirs: { id: string; t: string; enZona: boolean; def: boolean }[]; booking: boolean;
};
export async function bookingFiesta(negocio: string, svcId: string, userId: string | null): Promise<BookingFiesta | null> {
  const c = db(), x = await contexto(c, negocio, ["NEG-FIESTA"]);
  if (!x) return null;
  const s = await servicio(c, negocio, svcId);
  if (!s) return null;
  const aj = await ajustes(c, negocio), hasta = sumarDias(x.hoy, s.k === "visita" ? 60 : aj.ahead);
  const b = (await c.query<{ zone: number | null; ciudad: string }>(`select b.service_radius_mi as zone, ci.name as ciudad from businesses b join cities ci on ci.id = b.city_id where b.id = $1`, [negocio])).rows[0]!;
  const D = await diasOcupados(negocio, x.hoy, hasta, c);
  const T = (await c.query<{ dia: string; m: number; d: number }>(
    `select (o.scheduled_at at time zone $2)::date::text as dia, (extract(hour from o.scheduled_at at time zone $2) * 60 + extract(minute from o.scheduled_at at time zone $2))::int as m, o.duration_min as d
       from operations o where o.business_id = $1 and o.kind = 'party' and o.status in ('pending', 'change_proposed', 'confirmed') and not coalesce((o.details->>'visit')::boolean, false)
        and o.scheduled_at >= now() limit 500`, [negocio, x.tz])).rows;
  const tom: BookingFiesta["tomadas"] = {};
  for (const t of T) (tom[t.dia] ??= []).push({ m: t.m, d: t.d });
  const va = (b.zone ?? 0) > 0 && s.k !== "visita";
  const S = await (va ? c.query<{ id: string; nombre: string; dir: string | null }>(
      `select b.id, b.name as nombre, b.address as dir from businesses b where b.city_id = $1 and b.category_id = 'NEG-FIESTA' and b.status = 'active' and b.subcategory_ids && array['NEG-FIESTA-07']::text[] and b.id <> $2 order by b.name limit 40`, [x.city, negocio]) : Promise.resolve({ rows: [] }));
  const A = await (va && userId ? c.query<{ id: string; t: string; enZona: boolean; def: boolean }>(
      `select a.id::text, concat_ws(', ', a.street || coalesce(' ' || nullif(a.apt, ''), ''), a.zip) as t, a.is_default as def,
              coalesce(a.geo is null or bz.geo is null or st_dwithin(a.geo, bz.geo, bz.service_radius_mi * 1609.344), true) as "enZona"
         from user_addresses a, businesses bz where bz.id = $2 and a.user_id = $1 and a.removed_at is null order by a.is_default desc, a.created_at limit 10`, [userId, negocio]) : Promise.resolve({ rows: [] }));
  return {
    negocio: { id: x.id, nombre: x.name, foto: x.foto, ciudad: b.ciudad, direccion: x.address, telefono: x.phone },
    svc: s, dur: calcularFiesta(s, null, {}).dur, aj, depositoEnApp: !!x.cuenta, hoy: x.hoy, hasta, ocupadas: D.filter((d) => d.ocupada).map((d) => d.day), tomadas: tom,
    zone: b.zone, va, salones: S.rows, dirs: A.rows, booking: x.mods.includes("citas") && !x.off.citas && !x.off.svc,
  };
}

/* ── Enviar la solicitud ── */
export type FiestaIn = {
  svc: string; day: string; m: number; e?: string; g?: number | null; qty?: number | null; horas?: number | null;
  donde?: { k: "local" | "casa" | "salon"; id?: string } | null; nota?: string; sms?: boolean; pm?: string | null; clave: string;
};
type Res = { ok: true; numero: string } | { ok: false; msg: Bi; tarjeta?: true; fecha?: true };
export async function pedirFecha(userId: string, negocio: string, f: FiestaIn, entorno: string, ip: string | null): Promise<Res> {
  if (!UUID.test(String(f?.clave)) || !ID.test(String(f?.svc)) || !YMD.test(String(f?.day))) return no("Revisa tu solicitud y vuelve a intentarlo.", "Check your request and try again.");
  const nota = String(f.nota ?? "").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, 300);
  if (/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(nota)) return no("Por seguridad, sin teléfonos en la nota.", "For safety, no phone numbers in the note.");
  const m = Math.floor(Number(f.m)), g = f.g == null ? null : Math.floor(Number(f.g));
  if (g != null && !(g >= 1 && g <= 2000)) return no("¿Cuántos invitados?", "How many guests?");
  const c = await db().connect();
  let retenido: string | null = null;
  try {
    await c.query("begin");
    const ya = (await c.query<{ number: string }>(`select number from operations where user_id = $1 and client_key = $2`, [userId, f.clave])).rows[0];
    if (ya) { await c.query("rollback"); return { ok: true, numero: ya.number }; }
    await c.query(`select pg_advisory_xact_lock(hashtext('fiesta:' || $1 || ':' || $2))`, [negocio, f.day]);
    const x = await contexto(c, negocio, ["NEG-FIESTA"]);
    const s = x ? await servicio(c, negocio, String(f.svc)) : null;
    if (!x || !s) { await c.query("rollback"); return no("Ese servicio no se pide en línea.", "That service is not requested online."); }
    if (!x.mods.includes("citas") || x.off.citas || x.off.svc) { await c.query("rollback"); return no(`${x.name} no toma fechas en línea por ahora: llama al negocio.`, `${x.name} is not taking dates online right now: call the business.`); }
    if (x.plan !== "pro") {
      const r = (await c.query<{ cap: number; usados: number }>(`select coalesce((select (value #>> '{}')::int from platform_config where key = 'free_ops_cap'), 10) as cap, (select count(*)::int from operations where business_id = $1 and kind <> 'table' and free_quota_month = $2) as usados`, [x.id, x.mes])).rows[0];
      if (r && r.usados >= r.cap) { await c.query("rollback"); return no(`${x.name} no recibe más solicitudes en línea este mes. Llama para tu fecha.`, `${x.name} takes no more online requests this month. Call about your date.`); }
    }
    const aj = await ajustes(c, negocio), vis = s.k === "visita";
    // El día: desde mañana y hasta lo que aparta en la app; libre en el calendario real (la visita no aparta nada).
    const hasta = sumarDias(x.hoy, vis ? 60 : aj.ahead);
    if (f.day <= x.hoy || f.day > hasta) { await c.query("rollback"); return no(vis ? "Elige un día de las próximas semanas." : `Esa fecha no se aparta en la app: llama a ${x.name}.`, vis ? "Pick a day in the coming weeks." : `That date is not booked in the app: call ${x.name}.`, { fecha: true }); }
    if (!vis && (await diasOcupados(negocio, f.day, f.day, c))[0]?.ocupada) { await c.query("rollback"); return no(`Esa fecha ya no está libre en ${x.name}. Elige otra.`, `That date is no longer free at ${x.name}. Pick another.`, { fecha: true }); }
    if (!(vis ? HORAS_V : HORAS_F).includes(m)) { await c.query("rollback"); return no("Elige la hora de inicio.", "Pick the start time.", { fecha: true }); }
    const calc = calcularFiesta(s, g, { qty: f.qty, horas: f.horas });
    if (!vis && choca(m, calc.dur, await tomadas(c, x, f.day), aj.perDay)) { await c.query("rollback"); return no("Esa hora ya la pidió otra fiesta. Elige otra hora.", "Another party already asked for that time. Pick another time.", { fecha: true }); }
    // La fiesta: qué celebras e invitados (la visita no lo pide); caben o no.
    const e = String(f.e ?? "");
    if (!vis && !EVT.some((z) => z[0] === e)) { await c.query("rollback"); return no("Elige qué celebras.", "Pick what you are celebrating."); }
    if (!vis && !g) { await c.query("rollback"); return no("¿Cuántos invitados?", "How many guests?"); }
    const max = Math.min(aj.guests ?? 99999, s.cap ?? 99999);
    if (!vis && g && g > max) { await c.query("rollback"); return no(`Caben hasta ${max} invitados.`, `Fits up to ${max} guests.`); }
    // Dónde: si van a tu lugar, tu dirección o un salón del directorio, dentro de su zona (el servidor mide con PostGIS).
    const zone = (await c.query<{ z: number | null }>(`select service_radius_mi as z from businesses where id = $1`, [negocio])).rows[0]?.z ?? 0;
    let donde: { k: string; id?: string; t: string; mi: number | null } = { k: "local", t: x.address ?? x.name, mi: null };
    if (zone > 0 && !vis) {
      const d = f.donde;
      if (!d || !["casa", "salon"].includes(d.k) || !d.id) { await c.query("rollback"); return no("Elige dónde es la fiesta.", "Pick where the party is."); }
      const r = d.k === "casa"
        ? (await c.query<{ t: string; mi: number | null; ok: boolean }>(
          `select concat_ws(', ', a.street || coalesce(' ' || nullif(a.apt, ''), ''), a.zip) as t, case when a.geo is null or b.geo is null then null else round((st_distance(a.geo, b.geo) / 1609.344)::numeric, 1)::float end as mi,
                  coalesce(a.geo is null or b.geo is null or st_dwithin(a.geo, b.geo, $3::int * 1609.344), true) as ok
             from user_addresses a, businesses b where a.id::text = $1 and a.user_id = $2 and a.removed_at is null and b.id = $4`, [d.id, userId, zone, negocio])).rows[0]
        : (await c.query<{ t: string; mi: number | null; ok: boolean }>(
          `select v.name || coalesce(' · ' || v.address, '') as t, case when v.geo is null or b.geo is null then null else round((st_distance(v.geo, b.geo) / 1609.344)::numeric, 1)::float end as mi,
                  coalesce(v.geo is null or b.geo is null or st_dwithin(v.geo, b.geo, $2::int * 1609.344), true) as ok
             from businesses v, businesses b where v.id = $1 and v.status = 'active' and v.category_id = 'NEG-FIESTA' and b.id = $3`, [d.id, zone, negocio])).rows[0];
      if (!r) { await c.query("rollback"); return no("Esa dirección ya no está. Elige otra.", "That address is gone. Pick another."); }
      if (!r.ok) { await c.query("rollback"); return no(`Queda fuera de la zona de ${x.name} (hasta ${zone} millas).`, `It is outside ${x.name}'s area (up to ${zone} miles).`); }
      donde = { k: d.k, id: d.id, t: r.t, mi: r.mi };
    }
    const pend = (await c.query<{ n: number }>(`select count(*)::int as n from operations where user_id = $1 and kind = 'party' and status in ('pending', 'change_proposed')`, [userId])).rows[0]?.n ?? 0;
    if (pend >= 3) { await c.query("rollback"); return no("Tienes 3 solicitudes esperando respuesta. Espera a que te contesten.", "You have 3 requests waiting for a reply. Wait for an answer."); }
    // El depósito: solo con la cuenta de cobro del negocio; nunca más que el total; la visita, $0.
    const dep = vis || !x.cuenta ? 0 : Math.min(aj.dep, calc.tot);
    const numero = `F-${(await c.query<{ n: string }>(`select nextval('party_seq')::text as n`)).rows[0]!.n}`;
    let ret: Awaited<ReturnType<typeof pasarela.retener>> | null = null, fee = 0;
    if (dep > 0) {
      const pm = typeof f.pm === "string" && /^pm_[A-Za-z0-9_]{3,200}$/.test(f.pm) ? f.pm : null;
      if (!pm) { await c.query("rollback"); return no("Elige la tarjeta para el depósito.", "Choose the card for the deposit.", { tarjeta: true }); }
      fee = Math.min(await comision(c, "fiesta", dep), dep);
      const cliente = await pasarela.cliente(userId).catch(() => null);
      ret = await pasarela.retener({ centavos: dep, comision: fee, destino: x.cuenta!, pm, cliente, idem: `fiesta-${f.clave}-${pm.slice(-24)}`, meta: { party: numero, business_id: x.id } });
      if (!ret.ok) { await c.query("rollback"); return no(ret.mensaje.es, ret.mensaje.en, { tarjeta: true }); }
      retenido = ret.pi;
      if (ret.estado === "accion") { await c.query("rollback"); await pasarela.liberar(ret.pi).catch(() => undefined); retenido = null; return no("Tu banco pide una verificación extra. Prueba con otra tarjeta.", "Your bank asks for an extra verification. Try another card.", { tarjeta: true }); }
    }
    // El paquete se copia al enviar: si el negocio cambia el precio o lo que incluye después, lo pedido no cambia.
    const det = {
      svc: s.name, svcId: s.id, k: s.k, qty: calc.qty, horas: calc.horas, unit: s.cents, u: s.u, inc: s.inc, h: s.h, cap: s.cap, mont: s.mont, visit: vis,
      e: vis ? null : e, g: vis ? null : g, donde, sms: f.sms !== false, terms: { v: 1, cancel: aj.cancel, dep, ip: ip ? ip.slice(0, 64) : null },
    };
    const op = (await c.query<{ id: string }>(
      `insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, duration_min, buffer_min, customer_note, details,
                               subtotal_cents, total_cents, deposit_cents, pay_mode, respond_by, free_quota_month, client_key, is_test)
       values ($1, 'party', $2, $3, $4, 'pending', ($5::date + make_interval(mins => $6::int)) at time zone $7, $8, 0, nullif($9, ''), $10::jsonb,
               $11, $11, $12, $13, least(now() + interval '24 hours', ($5::date + make_interval(mins => $6::int)) at time zone $7), $14, $15, $16) returning id::text`,
      [numero, x.city, x.id, userId, f.day, m, x.tz, calc.dur, nota, JSON.stringify(det), calc.tot, dep, dep > 0 ? "app" : "local", x.plan === "pro" ? null : x.mes, f.clave, entorno !== "produccion"])).rows[0]!.id;
    await c.query(`insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct, options) values ($1, $2, $3::jsonb, $4, $5, $6, 0, '[]'::jsonb)`,
      [op, s.id, JSON.stringify(s.name), s.k === "hora" ? calc.horas : calc.qty, s.cents, calc.tot]);
    if (ret?.ok) await registrarRetencion(c, { opId: op, userId, negocio: x.id, city: x.city, total: dep, comision: fee, r: ret, pm: f.pm ?? undefined, kind: "deposit" });
    await c.query(`insert into operation_events (operation_id, kind, actor, actor_id) values ($1, 'sent', 'user', $2)`, [op, userId]);
    await c.query("commit");
    retenido = null;
    return { ok: true, numero };
  } catch (err) {
    await c.query("rollback").catch(() => undefined);
    if (retenido) await pasarela.liberar(retenido).catch(() => undefined);
    throw err;
  } finally {
    c.release();
  }
}

/* ── Datos y avisos ── */
type Op = { id: string; num: string; biz: string; negocio: string; uid: string; cliente: string; status: string; ymd: string; m: number; dur: number; tz: string; city: string;
  det: Record<string, unknown>; dep: number; tot: number; pay: string | null; pid: string | null; amount: number | null; refunded: number | null; days_to: number; past: boolean };
const SEL = `select o.id::text, o.number as num, o.business_id as biz, b.name as negocio, o.user_id::text as uid, coalesce(nullif(u.first_name, ''), 'Cliente') as cliente, o.status,
                    (o.scheduled_at at time zone c.timezone)::date::text as ymd, (extract(hour from o.scheduled_at at time zone c.timezone) * 60 + extract(minute from o.scheduled_at at time zone c.timezone))::int as m,
                    o.duration_min as dur, c.timezone as tz, o.city_id as city, o.details as det, o.deposit_cents as dep, o.total_cents as tot, o.pay_status as pay,
                    p.id::text as pid, p.amount_cents as amount, p.refunded_cents as refunded,
                    ((o.scheduled_at at time zone c.timezone)::date - (now() at time zone c.timezone)::date)::int as days_to, o.scheduled_at < now() as past
               from operations o join businesses b on b.id = o.business_id join cities c on c.id = o.city_id join users u on u.id = o.user_id
               left join payments p on p.operation_id = o.id and p.kind = 'deposit'`;
async function leer(c: PoolClient | ReturnType<typeof db>, where: string, args: unknown[], lock = false): Promise<Op | null> {
  return (await c.query<Op>(`${SEL} where o.kind = 'party' and ${where}${lock ? " for update of o" : ""}`, args)).rows[0] ?? null;
}
const hora = (m: number) => `${Math.floor(m / 60) % 12 || 12}:${String(m % 60).padStart(2, "0")} ${m < 720 ? "AM" : "PM"}`;
async function avisarCliente(numero: string, tpl: string, extra: Record<string, string> = {}) {
  const o = await leer(db(), "o.number = $1", [numero]);
  if (!o) return;
  const { avisar } = await import("./avisos");
  await avisar(o.uid, tpl, { negocio: o.negocio, dia: diaFiesta(o.ymd, true), hora: hora(o.m), dev: "", dep: "", ...extra }, { href: `/fiesta/${numero}`, ref: ["party", numero] });
}
async function avisarNeg(numero: string, tpl: string, extra: Record<string, string> = {}) {
  const o = await leer(db(), "o.number = $1", [numero]);
  if (!o) return;
  const { avisarNegocio } = await import("./avisos");
  const g = o.det.g as number | null;
  await avisarNegocio(o.biz, tpl, { cliente: o.cliente, dia: diaFiesta(o.ymd, true), hora: hora(o.m), servicio: (o.det.svc as Bi)?.es ?? "", invitados: g ? `${g} invitados` : "", dep: "", ...extra },
    { href: `/panel/${o.biz}/hoy?det=fiesta:${numero}`, ref: ["party", numero] });
}
export async function avisarFiestaNueva(numero: string) {
  const o = await leer(db(), "o.number = $1", [numero]);
  if (o) await avisarNeg(numero, o.det.visit ? "biz_fiesta_visita" : "biz_fiesta");
}
async function ev(c: PoolClient, op: string, kind: string, actor: "user" | "member" | "system", actorId: string | null, note?: Bi) {
  await c.query(`insert into operation_events (operation_id, kind, actor, actor_id, note) values ($1::bigint, $2, $3, $4, $5::jsonb)`, [op, kind, actor, actorId, note ? JSON.stringify(note) : null]);
}

/* ── El negocio responde (Panel › Hoy · detalle): Confirmar · Otra hora · No puedo ── */
export type PasoFiesta = "confirmar" | "otra" | "nopuedo";
type ResF = { ok: true } | { ok: false; msg: Bi };
export async function responderFecha(negocio: string, numero: string, paso: PasoFiesta, actorId: string, alt?: number): Promise<ResF> {
  if (!NUM_F.test(numero)) return no("Esa fiesta no existe.", "That party does not exist.");
  await barrerFiestas({ negocio, numero });
  const o0 = await leer(db(), "o.business_id = $1 and o.number = $2", [negocio, numero]);
  if (!o0) return no("Esa fiesta no existe.", "That party does not exist.");
  let despues: (() => Promise<void>) | null = null;
  const r = await tx(async (c): Promise<ResF> => {
    await c.query(`select pg_advisory_xact_lock(hashtext('fiesta:' || $1 || ':' || $2))`, [negocio, o0.ymd]);
    const o = await leer(c, "o.business_id = $1 and o.number = $2", [negocio, numero], true);
    if (!o) return no("Esa fiesta no existe.", "That party does not exist.");
    if (o.status !== "pending") return o.status === "expired" ? no("Pasó el tiempo para responder: la solicitud venció y se liberó el depósito.", "The time to reply passed: the request expired and the deposit was released.") : no("Esta solicitud ya cambió. Actualiza la pantalla.", "This request already changed. Refresh the screen.");
    const vis = !!o.det.visit;
    if (paso === "confirmar" && o.dep > 0 && o.pay !== "held") return no("El depósito de esta solicitud ya no está retenido. Usa «No puedo»: el cliente puede pedir la fecha otra vez.", "This request's deposit is no longer held. Use “Can’t”: the client can request the date again.");
    if (paso === "nopuedo") {
      await c.query(`update operations set status = 'declined', answered_at = now(), updated_at = now() where id = $1::bigint`, [o.id]);
      await ev(c, o.id, "declined", "member", actorId);
      despues = async () => { await liberarOperacion(o.id); await avisarCliente(numero, "fiesta_no", { dev: o.dep ? ` Se liberó tu depósito de ${money(o.dep)}.` : "" }); };
      return { ok: true };
    }
    const aj = await ajustes(c, negocio), x = (await contexto(c, negocio, ["NEG-FIESTA"]))!;
    if (paso === "otra") {
      if (vis ? !HORAS_V.includes(Number(alt)) : !HORAS_F.includes(Number(alt))) return no("Elige la otra hora.", "Pick the other time.");
      if (Number(alt) === o.m) return no("Esa es la misma hora que pidieron.", "That is the same time they asked for.");
      if (!vis && choca(Number(alt), o.dur, await tomadas(c, x, o.ymd, o.id), aj.perDay)) return no("Esa hora la toma otra fiesta.", "Another party takes that time.");
      await c.query(`insert into change_proposals (operation_id, kind, proposed, created_by, side, respond_by)
                     values ($1::bigint, 'time', $2::jsonb, $3, 'business', least(now() + interval '24 hours', ($4::date + make_interval(mins => $5::int)) at time zone $6))`,
        [o.id, JSON.stringify({ ymd: o.ymd, m: Number(alt) }), actorId, o.ymd, Number(alt), o.tz]);
      await c.query(`update operations set status = 'change_proposed', answered_at = now(), respond_by = least(now() + interval '24 hours', scheduled_at), updated_at = now() where id = $1::bigint`, [o.id]);
      await ev(c, o.id, "change_proposed", "member", actorId, { es: `Propusiste las ${hora(Number(alt))}`, en: `You proposed ${hora(Number(alt))}` });
      despues = async () => { await avisarCliente(numero, "fiesta_alt", { alt: hora(Number(alt)) }); };
      return { ok: true };
    }
    // Confirmar: el día tiene que seguir libre (no marcado y sin llenar sus fiestas del día); ocupa el día aquí mismo.
    let llenos: string[] = [];
    if (!vis) {
      const d = (await diasOcupados(negocio, o.ymd, o.ymd, c))[0];
      if (d?.ocupada) return no("Ese día ya está ocupado en tu calendario. Usa «No puedo» u «Otra hora».", "That day is already booked in your calendar. Use “Can’t” or “Another time”.");
      await c.query(`insert into party_days (business_id, city_id, day, source, operation_id, created_by) values ($1, $2, $3::date, 'booking', $4::bigint, $5)`, [negocio, o.city, o.ymd, o.id, actorId]);
      // Si con esta el día se llena, las demás solicitudes de ese día ya no caben: se declinan solas con su depósito liberado.
      if ((d?.reservas.length ?? 0) + 1 >= aj.perDay) {
        llenos = (await c.query<{ num: string }>(
          `update operations o set status = 'declined', answered_at = now(), status_detail = 'lleno', updated_at = now()
             where o.business_id = $1 and o.kind = 'party' and o.status in ('pending', 'change_proposed') and o.id <> $2::bigint and not coalesce((o.details->>'visit')::boolean, false)
               and (o.scheduled_at at time zone $4)::date = $3::date returning o.number as num`, [negocio, o.id, o.ymd, o.tz])).rows.map((z) => z.num);
        for (const n of llenos) await c.query(`insert into operation_events (operation_id, kind, actor, note) select id, 'declined', 'system', $2::jsonb from operations where number = $1`, [n, JSON.stringify({ es: "El día se llenó con otra fiesta", en: "The day filled with another party" })]);
        await c.query(`update change_proposals set status = 'declined', answered_at = now() where status = 'open' and operation_id in (select id from operations where number = any($1::text[]))`, [llenos]);
      }
    }
    await c.query(`update operations set status = 'confirmed', answered_at = now(), confirmed_at = now(), respond_by = null, updated_at = now() where id = $1::bigint`, [o.id]);
    await ev(c, o.id, "accepted", "member", actorId);
    // El acuerdo por escrito (versión 1): el paquete como se pidió, aceptado por el cliente al enviar (hora e IP de ese momento).
    if (!vis) {
      const t = o.det.terms as { ip?: string | null } | undefined, inc = (o.det.inc as Bi[] | undefined) ?? [];
      const sent = (await c.query<{ at: string }>(`select sent_at::text as at from operations where id = $1::bigint`, [o.id])).rows[0]!.at;
      await c.query(
        `insert into written_totals (operation_id, business_id, city_id, version, fee_cents, gov_cents, credit_cents, extras, note, total_cents, valid_until, status, accepted_at, accepted_ip, created_by)
         values ($1::bigint, $2, $3, 1, $4, 0, $5, '[]'::jsonb, $6::jsonb, $7, (select scheduled_at from operations where id = $1::bigint), 'accepted', $8::timestamptz, $9, $10)
         on conflict (operation_id, version) do nothing`,
        [o.id, negocio, o.city, o.tot, Math.min(o.dep, o.tot), JSON.stringify({ es: inc.map((z) => z.es).join(" · "), en: inc.map((z) => z.en || z.es).join(" · ") }), Math.max(0, o.tot - o.dep), sent, t?.ip ?? null, actorId]);
    }
    despues = async () => {
      await cobrarOperacion(o.id);
      await avisarCliente(numero, vis ? "fiesta_visita_ok" : "fiesta_ok", { dep: o.dep ? ` Depósito de ${money(o.dep)} cobrado.` : "" });
      for (const n of llenos) { const z = await leer(db(), "o.number = $1", [n]); if (!z) continue; await liberarOperacion(z.id); await avisarCliente(n, "fiesta_no", { dev: z.dep ? ` Se liberó tu depósito de ${money(z.dep)}.` : "" }); }
      await recalcularFiltrosFiesta(db(), negocio);
    };
    return { ok: true };
  });
  if (r.ok && despues) await (despues as () => Promise<void>)();
  return r;
}

/* ── El cliente: cancelar, aceptar la otra hora o «No me sirve» ── */
export type QueFiesta = "cancelar" | "aceptar" | "nogracias";
export async function fiestaCliente(userId: string, numero: string, que: QueFiesta): Promise<ResF> {
  if (!NUM_F.test(numero)) return no("Esa fiesta no existe.", "That party does not exist.");
  await barrerFiestas({ userId, numero });
  const o0 = await leer(db(), "o.user_id = $1 and o.number = $2", [userId, numero]);
  if (!o0) return no("Esa fiesta no existe.", "That party does not exist.");
  let despues: (() => Promise<void>) | null = null;
  const r = await tx(async (c): Promise<ResF> => {
    await c.query(`select pg_advisory_xact_lock(hashtext('fiesta:' || $1 || ':' || $2))`, [o0.biz, o0.ymd]);
    const o = await leer(c, "o.user_id = $1 and o.number = $2", [userId, numero], true);
    if (!o) return no("Esa fiesta no existe.", "That party does not exist.");
    const ya = no("Esta fiesta ya cambió. Actualiza la pantalla.", "This party already changed. Refresh the screen.");
    if (que === "cancelar") {
      if (!["pending", "change_proposed", "confirmed"].includes(o.status)) return ya;
      const conf = o.status === "confirmed", reglaDias = Number((o.det.terms as { cancel?: number } | undefined)?.cancel ?? 30);
      const aTiempo = !conf || o.days_to >= reglaDias, pierde = conf && !aTiempo && o.dep > 0 && o.pay === "captured";
      await c.query(`update operations set status = 'cancelled', cancelled_by = 'user', cancelled_at = now(), cancel_reason = $2, details = details || $3::jsonb, updated_at = now() where id = $1::bigint`,
        [o.id, conf ? (aTiempo ? "a_tiempo" : "tarde") : "solicitud", JSON.stringify({ perdio: pierde })]);
      await c.query(`update change_proposals set status = 'declined', answered_at = now() where operation_id = $1::bigint and status = 'open'`, [o.id]);
      await c.query(`update party_days set removed_at = now() where operation_id = $1::bigint and removed_at is null`, [o.id]);
      await ev(c, o.id, "cancelled", "user", userId, pierde ? { es: `Canceló a menos de ${reglaDias} días: el depósito se queda con el negocio`, en: `Cancelled less than ${reglaDias} days before: the business keeps the deposit` } : undefined);
      despues = async () => {
        if (o.pay === "held") await liberarOperacion(o.id);
        else if (o.pay === "captured" && aTiempo && o.pid && o.amount) await devolverPago({ paymentId: o.pid, centavos: o.amount - (o.refunded ?? 0), por: "policy", actorId: userId, motivo: "Cancelación a tiempo", idem: `fcx-${numero}` });
        await avisarCliente(numero, "fiesta_cx", { dev: o.dep ? (pierde ? ` El depósito de ${money(o.dep)} se queda con ${o.negocio}.` : ` Te devolvemos ${money(o.dep)}.`) : "" });
        await avisarNeg(numero, "biz_fiesta_cx", { dep: pierde ? ` El depósito de ${money(o.dep)} se queda contigo.` : o.dep ? ` Se le devuelve el depósito de ${money(o.dep)}.` : "" });
        await recalcularFiltrosFiesta(db(), o.biz);
      };
      return { ok: true };
    }
    if (o.status !== "change_proposed") return ya;
    const p = (await c.query<{ id: string; m: number }>(`select id::text, (proposed->>'m')::int as m from change_proposals where operation_id = $1::bigint and side = 'business' and status = 'open' order by change_proposals.id desc limit 1`, [o.id])).rows[0];
    if (!p) return ya;
    if (que === "nogracias") {
      await c.query(`update change_proposals set status = 'declined', answered_at = now() where id = $1`, [p.id]);
      await c.query(`update operations set status = 'cancelled', cancelled_by = 'user', cancelled_at = now(), cancel_reason = 'alt_no', updated_at = now() where id = $1::bigint`, [o.id]);
      await ev(c, o.id, "alt_declined", "user", userId);
      despues = async () => { await liberarOperacion(o.id); await avisarNeg(numero, "biz_fiesta_alt_no"); };
      return { ok: true };
    }
    // Aceptar la otra hora = confirmar (el día tiene que seguir libre y el depósito, retenido).
    const vis = !!o.det.visit;
    if (o.dep > 0 && o.pay !== "held") return no("Tu depósito ya no está retenido. Elige «No me sirve» y pide la fecha otra vez.", "Your deposit is no longer held. Choose “Doesn’t work” and request the date again.");
    if (!vis) {
      const d = (await diasOcupados(o.biz, o.ymd, o.ymd, c))[0];
      if (d?.ocupada) return no("Ese día ya se ocupó. Te liberamos el depósito si eliges «No me sirve».", "That day is now booked. Choose “Doesn’t work” and we release your deposit.");
      await c.query(`insert into party_days (business_id, city_id, day, source, operation_id) values ($1, $2, $3::date, 'booking', $4::bigint)`, [o.biz, o.city, o.ymd, o.id]);
    }
    await c.query(`update operations set status = 'confirmed', scheduled_at = ($2::date + make_interval(mins => $3::int)) at time zone $4, confirmed_at = now(), respond_by = null, updated_at = now() where id = $1::bigint`, [o.id, o.ymd, p.m, o.tz]);
    await c.query(`update change_proposals set status = 'accepted', answered_at = now() where id = $1`, [p.id]);
    await ev(c, o.id, "alt_accepted", "user", userId);
    if (!vis) {
      const t = o.det.terms as { ip?: string | null } | undefined, inc = (o.det.inc as Bi[] | undefined) ?? [];
      await c.query(
        `insert into written_totals (operation_id, business_id, city_id, version, fee_cents, gov_cents, credit_cents, extras, note, total_cents, valid_until, status, accepted_at, accepted_ip, created_by)
         values ($1::bigint, $2, $3, 1, $4, 0, $5, '[]'::jsonb, $6::jsonb, $7, (select scheduled_at from operations where id = $1::bigint), 'accepted', now(), $8, $9) on conflict (operation_id, version) do nothing`,
        [o.id, o.biz, o.city, o.tot, Math.min(o.dep, o.tot), JSON.stringify({ es: inc.map((z) => z.es).join(" · "), en: inc.map((z) => z.en || z.es).join(" · ") }), Math.max(0, o.tot - o.dep), t?.ip ?? null, userId]);
    }
    despues = async () => { await cobrarOperacion(o.id); await avisarNeg(numero, "biz_fiesta_alt_ok", { hora: hora(p.m) }); await recalcularFiltrosFiesta(db(), o.biz); };
    return { ok: true };
  });
  if (r.ok && despues) await (despues as () => Promise<void>)();
  return r;
}

/* ── El negocio cancela una fecha confirmada (motivo obligatorio; devolución completa siempre) y «Terminó» ── */
export async function cancelarFechaNegocio(negocio: string, numero: string, motivo: string, actorId: string): Promise<ResF> {
  const mot = String(motivo ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, 200);
  if (!NUM_F.test(numero)) return no("Esa fiesta no existe.", "That party does not exist.");
  if (mot.length < 4) return no("Escribe el motivo: el cliente lo ve.", "Write the reason: the client sees it.");
  const o0 = await leer(db(), "o.business_id = $1 and o.number = $2", [negocio, numero]);
  if (!o0) return no("Esa fiesta no existe.", "That party does not exist.");
  let despues: (() => Promise<void>) | null = null;
  const r = await tx(async (c): Promise<ResF> => {
    await c.query(`select pg_advisory_xact_lock(hashtext('fiesta:' || $1 || ':' || $2))`, [negocio, o0.ymd]);
    const o = await leer(c, "o.business_id = $1 and o.number = $2", [negocio, numero], true);
    if (!o || o.status !== "confirmed" || o.past) return no("Esta fiesta ya cambió. Actualiza la pantalla.", "This party already changed. Refresh the screen.");
    await c.query(`update operations set status = 'cancelled', cancelled_by = 'business', cancelled_at = now(), cancel_reason = 'negocio', details = details || $2::jsonb, updated_at = now() where id = $1::bigint`, [o.id, JSON.stringify({ motivoNeg: mot })]);
    await c.query(`update party_days set removed_at = now() where operation_id = $1::bigint and removed_at is null`, [o.id]);
    await ev(c, o.id, "cancelled", "member", actorId, { es: `Canceló el negocio: ${mot}`, en: `Cancelled by the business: ${mot}` });
    despues = async () => {
      if (o.pay === "held") await liberarOperacion(o.id);
      else if (o.pay === "captured" && o.pid && o.amount) await devolverPago({ paymentId: o.pid, centavos: o.amount - (o.refunded ?? 0), por: "business", actorId, motivo: "El negocio canceló la fecha", idem: `fbx-${numero}` });
      await avisarCliente(numero, "fiesta_biz_cx", { motivo: mot });
      await recalcularFiltrosFiesta(db(), negocio);
    };
    return { ok: true };
  });
  if (r.ok && despues) await (despues as () => Promise<void>)();
  return r;
}
export async function terminarFiesta(negocio: string, numero: string, actorId: string | null): Promise<ResF> {
  if (!NUM_F.test(numero)) return no("Esa fiesta no existe.", "That party does not exist.");
  const r = await tx(async (c): Promise<ResF> => {
    const o = await leer(c, "o.business_id = $1 and o.number = $2", [negocio, numero], true);
    if (!o || o.status !== "confirmed") return no("Esta fiesta ya cambió. Actualiza la pantalla.", "This party already changed. Refresh the screen.");
    if (!o.past) return no("La fiesta todavía no empieza.", "The party has not started yet.");
    await c.query(`update operations set status = 'done', status_detail = 'done', done_at = now(), updated_at = now() where id = $1::bigint`, [o.id]);
    await ev(c, o.id, "done", actorId ? "member" : "system", actorId, actorId ? undefined : { es: "Pasó la fiesta", en: "The party is over" });
    return { ok: true };
  });
  if (r.ok) await avisarCliente(numero, "fiesta_done");
  return r;
}

/* ── El barrido (al mirar el panel, la fiesta o Mi cuenta): vence a las 24 h, la otra hora sin respuesta, el recordatorio de
   una semana antes y «Pasó la fiesta» a las 24 h del final si nadie pidió ayuda. Idempotente. ── */
export async function barrerFiestas(f: { negocio?: string; userId?: string; numero?: string } = {}) {
  const w: string[] = [], a: unknown[] = [];
  if (f.negocio) { a.push(f.negocio); w.push(`o.business_id = $${a.length}`); }
  if (f.userId) { a.push(f.userId); w.push(`o.user_id = $${a.length}::uuid`); }
  if (f.numero) { a.push(f.numero); w.push(`o.number = $${a.length}`); }
  const y = w.length ? ` and ${w.join(" and ")}` : "";
  const vencidas = (await db().query<{ id: string; num: string; dep: number }>(
    `update operations o set status = 'expired', status_detail = 'sin_respuesta', updated_at = now() where o.kind = 'party' and o.status = 'pending' and o.respond_by < now()${y}
     returning o.id::text, o.number as num, o.deposit_cents as dep`, a)).rows;
  for (const v of vencidas) {
    await db().query(`insert into operation_events (operation_id, kind, actor, note) values ($1::bigint, 'expired', 'system', $2::jsonb)`, [v.id, JSON.stringify({ es: "No contestaron en 24 h", en: "No reply within 24 h" })]);
    await liberarOperacion(v.id);
    await avisarCliente(v.num, "fiesta_exp", { dev: v.dep ? ` Se liberó tu depósito de ${money(v.dep)}.` : "" });
  }
  const sinAlt = (await db().query<{ id: string; num: string }>(
    `update operations o set status = 'cancelled', cancelled_by = 'system', cancelled_at = now(), cancel_reason = 'alt_vencida', updated_at = now()
      where o.kind = 'party' and o.status = 'change_proposed' and o.respond_by < now()${y} returning o.id::text, o.number as num`, a)).rows;
  for (const v of sinAlt) {
    await db().query(`update change_proposals set status = 'expired', answered_at = now() where operation_id = $1::bigint and status = 'open'`, [v.id]).catch(() => undefined);
    await db().query(`insert into operation_events (operation_id, kind, actor, note) values ($1::bigint, 'cancelled', 'system', $2::jsonb)`, [v.id, JSON.stringify({ es: "No respondió a la otra hora en 24 h", en: "No answer to the new time within 24 h" })]);
    await liberarOperacion(v.id);
  }
  // Recordatorio una semana antes (una vez).
  const rec = (await db().query<{ num: string }>(
    `update operations o set details = o.details || '{"rec7":true}'::jsonb from cities c
      where c.id = o.city_id and o.kind = 'party' and o.status = 'confirmed' and not coalesce((o.details->>'rec7')::boolean, false) and coalesce((o.details->>'sms')::boolean, true)
        and not coalesce((o.details->>'visit')::boolean, false) and (o.scheduled_at at time zone c.timezone)::date - (now() at time zone c.timezone)::date between 0 and 7${y}
      returning o.number as num`, a)).rows;
  for (const v of rec) await avisarCliente(v.num, "fiesta_7d");
  // «Pasó la fiesta»: a las 24 h del final, si no hay ayuda abierta.
  const fin = (await db().query<{ num: string; biz: string }>(
    `select o.number as num, o.business_id as biz from operations o where o.kind = 'party' and o.status = 'confirmed' and o.scheduled_at + make_interval(mins => o.duration_min) + interval '24 hours' < now()
        and not exists (select 1 from help_requests h where h.operation_id = o.id and h.status <> 'resolved')${y} limit 50`, a)).rows;
  for (const v of fin) await terminarFiesta(v.biz, v.num, null);
}

/* ── La fiesta del cliente (APP-NEG-FIESTA-CITA) ── */
export type FiestaVista = {
  numero: string; status: string; detalle: string | null; negocio: { id: string; nombre: string; telefono: string | null; foto: string | null; direccion: string | null };
  svc: Bi; svcId: string; k: string; visita: boolean; ymd: string; m: number; dur: number; e: string | null; g: number | null; qty: number; horas: number | null; donde: { k: string; t: string; mi: number | null } | null;
  tot: number; dep: number; pago: { st: string | null; devuelto: number; marca: string | null; l4: string | null }; cancelDias: number; diasFaltan: number; pasada: boolean;
  alt: { m: number; hasta: string } | null; libres: string[]; motivoNeg: string | null; perdio: boolean; inc: Bi[]; nota: string | null;
  linea: { at: number; kind: string; note: Bi | null }[]; resena: boolean; acuerdo: { v: number; fee: number; credit: number; total: number; at: string } | null;
};
export async function fiestaVista(userId: string, numero: string): Promise<FiestaVista | null> {
  if (!NUM_F.test(numero)) return null;
  await barrerFiestas({ userId, numero });
  const o = (await db().query<{ id: string; status: string; detail: string | null; biz: string; nombre: string; phone: string | null; foto: string | null; address: string | null; det: Record<string, unknown>;
    ymd: string; m: number; dur: number; tot: number; dep: number; pst: string | null; dev: number | null; marca: string | null; l4: string | null; days_to: number; past: boolean; nota: string | null; hoy: string; tz: string; resena: boolean }>(
    `select o.id::text, o.status, o.status_detail as detail, o.business_id as biz, b.name as nombre, b.phone, b.logo_url as foto, b.address, o.details as det,
            (o.scheduled_at at time zone c.timezone)::date::text as ymd, (extract(hour from o.scheduled_at at time zone c.timezone) * 60 + extract(minute from o.scheduled_at at time zone c.timezone))::int as m,
            o.duration_min as dur, o.total_cents as tot, o.deposit_cents as dep, p.status as pst, p.refunded_cents as dev, p.card_brand as marca, p.card_last4 as l4,
            ((o.scheduled_at at time zone c.timezone)::date - (now() at time zone c.timezone)::date)::int as days_to, o.scheduled_at < now() as past, o.customer_note as nota,
            (now() at time zone c.timezone)::date::text as hoy, c.timezone as tz,
            exists (select 1 from reviews r where r.operation_id = o.id) as resena
       from operations o join businesses b on b.id = o.business_id join cities c on c.id = o.city_id left join payments p on p.operation_id = o.id and p.kind = 'deposit'
      where o.number = $1 and o.user_id = $2 and o.kind = 'party'`, [numero, userId]).catch(() => ({ rows: [] }))).rows[0];
  if (!o) return null;
  const [P, E, W] = await Promise.all([
    db().query<{ m: number; hasta: string }>(`select (proposed->>'m')::int as m, respond_by::text as hasta from change_proposals where operation_id = $1::bigint and side = 'business' and status = 'open' order by id desc limit 1`, [o.id]),
    db().query<{ at: number; kind: string; note: Bi | null }>(`select (extract(epoch from at) * 1000)::float8 as at, kind, note from operation_events where operation_id = $1::bigint order by id`, [o.id]),
    db().query<{ v: number; fee: number; credit: number; total: number; at: string }>(`select version as v, fee_cents as fee, credit_cents as credit, total_cents as total, coalesce(accepted_at, created_at)::text as at from written_totals where operation_id = $1::bigint and status = 'accepted' order by version desc limit 1`, [o.id]),
  ]);
  // Si no pudieron o no contestaron: las fechas libres del negocio (sábados y domingos de las próximas semanas).
  let libres: string[] = [];
  if (["declined", "expired"].includes(o.status)) {
    const aj = await ajustes(db(), o.biz), D = await diasOcupados(o.biz, o.hoy, sumarDias(o.hoy, aj.ahead));
    const oc = new Set(D.filter((d) => d.ocupada).map((d) => d.day));
    for (let i = 1; i < aj.ahead && libres.length < 3; i++) { const d = sumarDias(o.hoy, i), w = new Date(`${d}T12:00:00Z`).getUTCDay(); if ((w === 6 || w === 0) && !oc.has(d)) libres.push(d); }
  }
  const det = o.det;
  return {
    numero, status: o.status, detalle: o.detail, negocio: { id: o.biz, nombre: o.nombre, telefono: o.phone, foto: o.foto, direccion: o.address },
    svc: det.svc as Bi, svcId: String(det.svcId ?? ""), k: String(det.k ?? ""), visita: !!det.visit, ymd: o.ymd, m: o.m, dur: o.dur, e: (det.e as string | null) ?? null, g: (det.g as number | null) ?? null,
    qty: Number(det.qty ?? 1), horas: (det.horas as number | null) ?? null, donde: (det.donde as FiestaVista["donde"]) ?? null,
    tot: o.tot, dep: o.dep, pago: { st: o.pst, devuelto: o.dev ?? 0, marca: o.marca, l4: o.l4 }, cancelDias: Number((det.terms as { cancel?: number } | undefined)?.cancel ?? 30),
    diasFaltan: o.days_to, pasada: o.past, alt: P.rows[0] ?? null, libres, motivoNeg: (det.motivoNeg as string | undefined) ?? null, perdio: !!det.perdio, inc: (det.inc as Bi[] | undefined) ?? [],
    nota: o.nota, linea: E.rows, resena: o.resena, acuerdo: W.rows[0] ?? null,
  };
}

/* ── El panel: Hoy (esperan tu respuesta · próximas · por cerrar) y el detalle ── */
export type FilaFiesta = { numero: string; st: string; who: string; svc: Bi; ymd: string; m: number; g: number | null; e: string | null; dep: number; visita: boolean; resp: number | null; mismoDia: number; pasada: boolean };
export async function fiestasHoy(negocio: string): Promise<FilaFiesta[]> {
  await barrerFiestas({ negocio });
  return (await db().query<FilaFiesta>(
    `select o.number as numero, o.status as st, coalesce(nullif(u.first_name, ''), 'Cliente') || coalesce(' ' || left(nullif(u.last_name, ''), 1) || '.', '') as who, o.details->'svc' as svc,
            (o.scheduled_at at time zone c.timezone)::date::text as ymd, (extract(hour from o.scheduled_at at time zone c.timezone) * 60 + extract(minute from o.scheduled_at at time zone c.timezone))::int as m,
            (o.details->>'g')::int as g, o.details->>'e' as e, o.deposit_cents as dep, coalesce((o.details->>'visit')::boolean, false) as visita, (extract(epoch from o.respond_by) * 1000)::float8 as resp, o.scheduled_at < now() as pasada,
            (select count(*)::int from operations z where z.business_id = o.business_id and z.kind = 'party' and z.id <> o.id and z.status in ('pending', 'change_proposed', 'confirmed')
                and (z.scheduled_at at time zone c.timezone)::date = (o.scheduled_at at time zone c.timezone)::date and not coalesce((z.details->>'visit')::boolean, false)) as "mismoDia"
       from operations o join users u on u.id = o.user_id join cities c on c.id = o.city_id
      where o.business_id = $1 and o.kind = 'party' and (o.status in ('pending', 'change_proposed') or (o.status = 'confirmed' and o.scheduled_at < now() + interval '45 days'))
      order by (o.status = 'pending') desc, o.scheduled_at limit 60`, [negocio])).rows;
}
export type FiestaPanelV = FilaFiesta & {
  dur: number; tot: number; qty: number; horas: number | null; k: string; donde: { k: string; t: string; mi: number | null } | null; nota: string | null; pay: string | null; alt: number | null;
  otras: { numero: string; st: string; who: string; m: number }[]; ocupadoManual: boolean; libreHoras: number[]; acuerdo: { v: number; fee: number; credit: number; total: number } | null;
  eventos: { at: number; kind: string; note: Bi | null }[]; cancel: number; motivoNeg: string | null;
};
export async function fiestaPanel(negocio: string, numero: string): Promise<FiestaPanelV | null> {
  if (!NUM_F.test(numero)) return null;
  await barrerFiestas({ negocio, numero });
  const L = (await fiestasHoy(negocio)).find((x) => x.numero === numero);
  const o = await leer(db(), "o.business_id = $1 and o.number = $2", [negocio, numero]);
  if (!o) return null;
  const base: FilaFiesta = L ?? { numero, st: o.status, who: o.cliente, svc: o.det.svc as Bi, ymd: o.ymd, m: o.m, g: (o.det.g as number | null) ?? null, e: (o.det.e as string | null) ?? null, dep: o.dep, visita: !!o.det.visit, resp: null, mismoDia: 0, pasada: o.past };
  const x = (await contexto(db(), negocio, ["NEG-FIESTA"]))!, aj = await ajustes(db(), negocio);
  const [O, E, P, W, D, N] = await Promise.all([
    db().query<{ numero: string; st: string; who: string; m: number }>(
      `select z.number as numero, z.status as st, coalesce(nullif(u.first_name, ''), 'Cliente') as who, (extract(hour from z.scheduled_at at time zone $3) * 60 + extract(minute from z.scheduled_at at time zone $3))::int as m
         from operations z join users u on u.id = z.user_id where z.business_id = $1 and z.kind = 'party' and z.number <> $2 and z.status in ('pending', 'change_proposed', 'confirmed')
          and (z.scheduled_at at time zone $3)::date = $4::date and not coalesce((z.details->>'visit')::boolean, false) order by z.scheduled_at`, [negocio, numero, x.tz, o.ymd]),
    db().query<{ at: number; kind: string; note: Bi | null }>(`select (extract(epoch from at) * 1000)::float8 as at, kind, note from operation_events where operation_id = $1::bigint order by id`, [o.id]),
    db().query<{ m: number }>(`select (proposed->>'m')::int as m from change_proposals where operation_id = $1::bigint and side = 'business' and status = 'open' order by id desc limit 1`, [o.id]),
    db().query<{ v: number; fee: number; credit: number; total: number }>(`select version as v, fee_cents as fee, credit_cents as credit, total_cents as total from written_totals where operation_id = $1::bigint and status = 'accepted' order by version desc limit 1`, [o.id]),
    diasOcupados(negocio, o.ymd, o.ymd),
    db().query<{ nota: string | null }>(`select customer_note as nota from operations where id = $1::bigint`, [o.id]),
  ]);
  const T = await tomadas(db(), x, o.ymd, o.id), vis = !!o.det.visit;
  const libreHoras = (vis ? HORAS_V : HORAS_F).filter((m) => m !== o.m && (vis || !choca(m, o.dur, T, aj.perDay)));
  return {
    ...base, dur: o.dur, tot: o.tot, qty: Number(o.det.qty ?? 1), horas: (o.det.horas as number | null) ?? null, k: String(o.det.k ?? ""), donde: (o.det.donde as FiestaPanelV["donde"]) ?? null,
    nota: N.rows[0]?.nota ?? null, pay: o.pay, alt: P.rows[0]?.m ?? null, otras: O.rows, ocupadoManual: !!D[0]?.manual, libreHoras, acuerdo: W.rows[0] ?? null, eventos: E.rows,
    cancel: Number((o.det.terms as { cancel?: number } | undefined)?.cancel ?? aj.cancel), motivoNeg: (o.det.motivoNeg as string | undefined) ?? null,
  };
}
