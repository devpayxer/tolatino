import "server-only";
import { cerradoElDia, diasEspeciales } from "./dias-especiales";
import { hoyEn } from "./fecha-local";
import type { PoolClient } from "pg";
import { db, tx } from "./db";
import { comision } from "./cobros";
import { pasarela } from "./pagos/pasarela";

/* Planes recurrentes del Hogar (Fase 4 · bloque 4f-1). Diseño: neg-hogar-plan.js (planForm / planStatus).
   - Día fijo: el N-ésimo día de la semana de cada mes (p. ej. el 2.º martes), en una franja de 2 h desde que abre el negocio.
     Si el servicio dice meses de visita (svc_attrs.vis, p. ej. [10, 4]), solo esos meses (Plan de confort).
   - Hoy no se cobra nada. Primer cobro el día de la primera visita; después cada mes ese mismo día del mes (tope 28).
     El cobro es fuera de sesión con la tarjeta que eligió, con la comisión «plan» y el resto al negocio.
   - Cada visita es una cita confirmada de $0 (la paga el plan) que entra a Hoy: se sigue como cualquier visita (4c) y lo
     que haga falta de más va por «algo más» (4d), con su OK.
   - Saltar la próxima o pausar un mes: no hay visita ni cobro ese mes. Cancelar: no se cobra el mes siguiente.
   - Si el banco rechaza: se reintenta a los 2 y 4 días; al tercer rechazo el plan queda en pausa y se avisa.
   - Todo lo hace el barrido (idempotente: un cobro por período con `idem`); corre al abrir el plan o el panel. */
type Q = PoolClient | ReturnType<typeof db>;
type Bi = { es: string; en: string };
/* «21/11» · «11/21»: el día y el mes de una fecha YMD, en el orden de cada idioma (avisos › avisar pone el de quien lo recibe). */
const diaMes = (ymd: string): Bi => { const d = new Date(`${ymd}T12:00:00Z`); return { es: `${d.getUTCDate()}/${d.getUTCMonth() + 1}`, en: `${d.getUTCMonth() + 1}/${d.getUTCDate()}` }; };
type Res<T = object> = ({ ok: true } & T) | { ok: false; msg: Bi; tarjeta?: boolean };
const no = (es: string, en: string, x: { tarjeta?: boolean } = {}): { ok: false; msg: Bi; tarjeta?: boolean } => ({ ok: false, msg: { es, en }, ...x });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, YMD = /^\d{4}-\d{2}-\d{2}$/, NUM = /^PL-\d{1,10}$/;
const TEL = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
const money = (c: number) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;

/* ── Fechas (en días locales del negocio; las horas van aparte en minutos) ── */
const d2s = (d: Date) => d.toISOString().slice(0, 10);
const s2d = (s: string) => new Date(`${s}T12:00:00Z`);
const addD = (s: string, n: number) => { const d = s2d(s); d.setUTCDate(d.getUTCDate() + n); return d2s(d); };
/* El N-ésimo `dow` del mes (n 1..4). */
function nthDow(y: number, m0: number, dow: number, n: number): string {
  const d = new Date(Date.UTC(y, m0, 1, 12)), off = (dow - d.getUTCDay() + 7) % 7;
  d.setUTCDate(1 + off + (n - 1) * 7);
  return d2s(d);
}
/* La siguiente visita después de `desde` (exclusivo), respetando los meses de visita si los hay. */
export function siguienteVisita(desde: string, dow: number, nth: number, meses: number[] | null): string {
  const d = s2d(desde);
  for (let k = 0; k < 24; k++) {
    const y = d.getUTCFullYear(), m0 = (d.getUTCMonth() + k) % 12, yy = y + Math.floor((d.getUTCMonth() + k) / 12);
    if (meses && !meses.includes(m0 + 1)) continue;
    const f = nthDow(yy, m0, dow, nth);
    if (f > desde) return f;
  }
  return addD(desde, 28);
}
/* El mismo día del mes, el mes siguiente (tope 28). */
const mesSiguiente = (s: string, dia: number) => { const d = s2d(s); return d2s(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, dia, 12))); };
const hoyDe = async (c: Q, city: string) => (await c.query<{ h: string }>(`select (now() at time zone timezone)::date::text as h from cities where id = $1`, [city])).rows[0]!.h;

async function cuentaDe(c: Q, negocio: string): Promise<string | null> {
  const a = (await c.query<{ acct: string }>(`select stripe_account_id as acct from stripe_accounts where business_id = $1 and charges_enabled`, [negocio])).rows[0]?.acct ?? null;
  const modo = pasarela.modo();
  return a && modo !== "apagado" && a.startsWith("acct_sim_") === (modo === "simulador") ? a : null;
}

/* ── Opciones para empezar (días que abre el negocio, las 3 primeras fechas de cada uno y la franja) ── */
export type OpcionesPlan = { dias: { dow: number; m: number; fechas: string[] }[]; meses: number[] | null; precio: number; tarjeta: boolean };
export async function opcionesPlan(negocio: string, svc: string): Promise<OpcionesPlan | null> {
  if (!/^\d{1,18}$/.test(svc)) return null;
  const it = (await db().query<{ cents: number; a: { fr?: string; vis?: number[] } | null; city: string }>(
    `select i.price_cents as cents, i.svc_attrs as a, b.city_id as city from items i join businesses b on b.id = i.business_id
      where i.id = $1::bigint and i.business_id = $2 and i.svc_kind = 'plan' and i.removed_at is null and i.sell and i.status = 'live' and b.status = 'active'`, [svc, negocio])).rows[0];
  if (!it || !["mes", undefined].includes(it.a?.fr)) return null;
  const hoy = await hoyDe(db(), it.city);
  const H = (await db().query<{ weekday: number; open: boolean; ranges: [string, string][] }>(`select weekday, open, ranges from business_hours where business_id = $1 and module = ''`, [negocio])).rows;
  const de = await diasEspeciales(db(), negocio, hoy, 60); // 9n-10 · la primera visita no cae en un feriado, vacaciones ni fuera de temporada
  const meses = Array.isArray(it.a?.vis) && it.a!.vis!.length ? it.a!.vis!.filter((m) => m >= 1 && m <= 12) : null;
  const dias: OpcionesPlan["dias"] = [];
  for (const dow of [1, 2, 3, 4, 5, 6]) {
    const h = H.find((x) => x.weekday === dow);
    if (!h?.open || !h.ranges?.length) continue;
    const [a, z] = h.ranges[0]!, m = Number(a.slice(0, 2)) * 60 + Number(a.slice(3, 5)), fin = Number(z.slice(0, 2)) * 60 + Number(z.slice(3, 5));
    if (fin && fin - m < 120 && fin > m) continue;
    // Las 3 primeras de ese día (desde mañana), como el N-ésimo del mes (si cae en el 5.º, no se ofrece).
    const fechas: string[] = [];
    for (let i = 1; i < 60 && fechas.length < 3; i++) { const f = addD(hoy, i), d = s2d(f); if (d.getUTCDay() !== dow || d.getUTCDate() > 28) continue; if (meses && !meses.includes(d.getUTCMonth() + 1)) continue; if (cerradoElDia(de, f)) continue; fechas.push(f); }
    if (fechas.length) dias.push({ dow, m, fechas });
  }
  return { dias, meses, precio: it.cents, tarjeta: !!(await cuentaDe(db(), negocio)) };
}

/* ── Empezar el plan ── */
export type PlanIn = { negocio: string; svc: string; fecha: string; nota?: string; acceso?: string; pm: string; clave: string };
export async function empezarPlan(userId: string, f: PlanIn, entorno: string): Promise<Res<{ numero: string }>> {
  if (!UUID.test(String(f?.clave)) || !/^\d{1,18}$/.test(String(f?.svc)) || !YMD.test(String(f?.fecha)) || typeof f.negocio !== "string") return no("Revisa tu plan y vuelve a intentarlo.", "Check your plan and try again.");
  const nota = String(f.nota ?? "").trim().replace(/\s+/g, " ").slice(0, 300), acceso = String(f.acceso ?? "").trim().slice(0, 100);
  if (TEL.test(nota) || TEL.test(acceso)) return no("Por seguridad, sin teléfonos en la nota.", "For safety, no phone numbers in the note.");
  if (!/^pm_[A-Za-z0-9_]{3,200}$/.test(String(f.pm))) return no("Elige la tarjeta del plan.", "Choose the plan card.", { tarjeta: true });
  const o = await opcionesPlan(f.negocio, f.svc);
  if (!o) return no("Ese plan ya no está.", "That plan is no longer available.");
  if (!o.tarjeta) return no("Este negocio todavía no cobra planes en la app. Llámalo para empezar.", "This business does not charge plans in the app yet. Call them to start.");
  const dia = o.dias.find((d) => d.fechas.includes(f.fecha));
  if (!dia) return no("Elige la primera visita de las que se ofrecen.", "Pick one of the offered first visits.");
  let numero = "", aviso: { negocio: string; plan: Bi; dia: string; cliente: string | null } | null = null;
  const r = await tx(async (c): Promise<Res<{ numero: string }>> => {
    const ya = (await c.query<{ number: string }>(`select o.number from operations o where o.user_id = $1 and o.client_key = $2::uuid`, [userId, f.clave])).rows[0];
    if (ya) return { ok: true, numero: ya.number };
    await c.query(`select pg_advisory_xact_lock(hashtext('cita:' || $1))`, [f.negocio]);
    if ((await c.query(`select 1 from plan_subscriptions where user_id = $1 and item_id = $2::bigint and status <> 'cancelled'`, [userId, f.svc])).rowCount) return no("Ya tienes este plan.", "You already have this plan.");
    const own = (await c.query(`select 1 from payment_methods where user_id = $1 and stripe_pm_id = $2 and status = 'active'`, [userId, f.pm])).rowCount;
    if (!own && pasarela.modo() !== "simulador") return no("Esa tarjeta no es tuya.", "That card is not yours.", { tarjeta: true });
    const x = (await c.query<{ name: Bi; cents: number; city: string; bname: string; cl: string | null; tz: string }>(
      `select i.name, i.price_cents as cents, b.city_id as city, b.name as bname, nullif(u.first_name, '') as cl, ci.timezone as tz
         from items i join businesses b on b.id = i.business_id join cities ci on ci.id = b.city_id, users u where i.id = $1::bigint and u.id = $2`, [f.svc, userId])).rows[0]!;
    const casa = (await c.query<{ id: string; dir: string; tenure: string; enZona: boolean }>(
      `select h.id::text, concat_ws(', ', a.street || coalesce(' ' || nullif(a.apt, ''), ''), a.zip) as dir, h.tenure,
              coalesce(a.geo is null or b.geo is null or ST_DWithin(a.geo, b.geo, coalesce(b.service_radius_mi, 20) * 1609.344), true) as "enZona"
         from user_homes h join user_addresses a on a.id = h.address_id join businesses b on b.id = $2
        where h.user_id = $1 and h.removed_at is null and a.removed_at is null order by h.is_default desc, h.created_at desc limit 1`, [userId, f.negocio])).rows[0];
    if (!casa) return no("Agrega tu casa.", "Add your home.");
    if (!casa.enZona) return no(`Tu casa queda fuera de la zona de ${x.bname}.`, `Your home is outside ${x.bname}'s area.`);
    const day = s2d(f.fecha).getUTCDate(), nth = Math.min(4, Math.ceil(day / 7)), chargeDay = Math.min(28, day);
    numero = `PL-${(await c.query<{ n: string }>(`select nextval('plan_seq')::text as n`)).rows[0]!.n}`;
    const plan = { svc: x.name, svcId: f.svc, dow: dia.dow, nth, win: dia.m, meses: o.meses, casa: { dir: casa.dir, tenure: casa.tenure } };
    const op = (await c.query<{ id: string }>(
      `insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, details, subtotal_cents, total_cents, pay_mode, confirmed_at, answered_at, client_key, is_test)
       values ($1, 'plan', $2, $3, $4, 'confirmed', ($5::date + make_interval(mins => $6::int)) at time zone $7, $8::jsonb, $9, $9, 'app', now(), now(), $10::uuid, $11) returning id::text`,
      [numero, x.city, f.negocio, userId, f.fecha, dia.m, x.tz, JSON.stringify(plan), x.cents, f.clave, entorno !== "produccion"])).rows[0]!.id;
    await c.query(
      `insert into plan_subscriptions (operation_id, business_id, user_id, city_id, item_id, home_id, price_cents, dow, nth, window_m, visit_months, charge_day, first_visit_on, next_visit_on, next_charge_on, note, access, payment_method)
       values ($1::bigint, $2, $3, $4, $5::bigint, $6::uuid, $7, $8, $9, $10, $11::smallint[], $12, $13::date, $13::date, $13::date, nullif($14, ''), nullif($15, ''), $16)`,
      [op, f.negocio, userId, x.city, f.svc, casa.id, x.cents, dia.dow, nth, dia.m, o.meses, chargeDay, f.fecha, nota, acceso, f.pm]);
    await c.query(`insert into operation_events (operation_id, kind, actor, actor_id, note) values ($1::bigint, 'sent', 'user', $2, $3::jsonb)`, [op, userId, JSON.stringify({ es: "Empezó el plan", en: "Started the plan" })]);
    await crearVisita(c, numero, f.fecha, entorno);
    aviso = { negocio: f.negocio, plan: x.name, dia: f.fecha, cliente: x.cl };
    return { ok: true, numero };
  });
  if (r.ok && aviso) {
    const a = aviso as { negocio: string; plan: Bi; dia: string; cliente: string | null }, av = await import("./avisos"), diaL = diaMes(a.dia);
    await av.avisar(userId, "plan_activo", { plan: a.plan, negocio: "", dia: diaL }, { href: `/plan/${r.numero}`, ref: ["plan", r.numero] });
    await av.avisarNegocio(a.negocio, "biz_plan_nuevo", { cliente: a.cliente ?? { es: "Un cliente", en: "A customer" }, plan: a.plan, dia: diaL }, { href: `/panel/${a.negocio}/hoy`, ref: ["plan", r.numero] });
  }
  return r;
}

/* La visita de un plan: una cita confirmada de $0 (la paga el plan) ese día, en la franja. Idempotente por día. */
async function crearVisita(c: PoolClient, numero: string, fecha: string, entorno: string): Promise<void> {
  const p = (await c.query<{ op: string; biz: string; city: string; uid: string; win: number; tz: string; plan: Record<string, unknown>; note: string | null; access: string | null; home: string | null }>(
    `select o.id::text as op, o.business_id as biz, o.city_id as city, o.user_id::text as uid, s.window_m as win, ci.timezone as tz, o.details as plan, s.note, s.access, s.home_id::text as home
       from operations o join plan_subscriptions s on s.operation_id = o.id join cities ci on ci.id = o.city_id where o.number = $1`, [numero])).rows[0];
  if (!p) return;
  if ((await c.query(`select 1 from operations where kind = 'appointment' and details->>'plan' = $1 and (scheduled_at at time zone $3)::date = $2::date and status <> 'cancelled'`, [numero, fecha, p.tz])).rowCount) return;
  const mem = (await c.query<{ id: string }>(`select id::text from business_members where business_id = $1 and kind = 'owner' and status = 'active' limit 1`, [p.biz])).rows[0]?.id ?? null;
  const pl = p.plan as { svc: Bi; svcId: string; casa: { dir: string; tenure: string } };
  const cita = `C-${(await c.query<{ n: string }>(`select nextval('operations_appt_seq')::text as n`)).rows[0]!.n}`;
  const det = { rubro: "hogar", svc: pl.svc, svcId: pl.svcId, k: "plan", plan: numero, sel: {}, opts: [], adds: [], sms: true, casa: { id: p.home, dir: pl.casa.dir, tenure: pl.casa.tenure },
    win: p.win + 120, area: null, acceso: p.access ? "llave" : "casa", accesoNota: p.access, landlord: pl.casa.tenure === "inq" ? true : null };
  const op = (await c.query<{ id: string }>(
    `insert into operations (number, kind, city_id, business_id, user_id, member_id, status, scheduled_at, duration_min, buffer_min, customer_note, details, subtotal_cents, total_cents, deposit_cents, pay_mode, confirmed_at, answered_at, client_key, is_test)
     values ($1, 'appointment', $2, $3, $4, $5, 'confirmed', ($6::date + make_interval(mins => $7::int)) at time zone $8, 120, 0, $9, $10::jsonb, 0, 0, 0, 'app', now(), now(), gen_random_uuid(), $11) returning id::text`,
    [cita, p.city, p.biz, p.uid, mem, fecha, p.win, p.tz, p.note, JSON.stringify(det), entorno !== "produccion"])).rows[0]!.id;
  await c.query(`insert into operation_events (operation_id, kind, actor, note) values ($1::bigint, 'accepted', 'system', $2::jsonb)`, [op, JSON.stringify({ es: `Visita del plan ${numero}`, en: `Plan visit ${numero}` })]);
}

/* ── El barrido (idempotente): cobros que tocan, visitas que siguen, pausas que terminan ── */
/* 9t9 · Lo que TOCA hoy (el día de la ciudad del plan): la pausa que terminó, la visita que pasó, el cobro del período (o su reintento), una intención en
   camino y la visita que falta de un plan que cambió en el último día (saltar la próxima la quita y deja la siguiente al barrido). Antes el barrido central
   tomaba 50 planes vivos cualesquiera (sin orden ni filtro): con más de 50, los demás no se cobraban nunca. Cada rama con su índice (0208); el tope de UTC
   + 1 día deja usar el índice y el día exacto de la ciudad decide. Lo más atrasado primero; por tandas sin repetir el mismo plan en la corrida. */
const TOCA_PLAN = `with h as (select (now() at time zone 'UTC')::date + 1 as tope)
  select s.id::text, o.number as numero, s.city_id as city from plan_subscriptions s join operations o on o.id = s.operation_id join cities ci on ci.id = s.city_id
   where s.id in (select id from plan_subscriptions, h where status = 'paused' and paused_until <= h.tope
                  union select id from plan_subscriptions, h where status = 'active' and next_visit_on < h.tope
                  union select id from plan_subscriptions, h where status = 'active' and next_charge_on <= h.tope
                  union select ref_id::bigint from offsession_charges where kind = 'plan' and status = 'pending' and ref_id ~ '^[0-9]{1,18}$'
                  union select id from plan_subscriptions where status = 'active' and updated_at > now() - interval '1 day')
     and s.status <> 'cancelled' and not (s.id = any($1::bigint[]))
     and ((s.status = 'paused' and s.paused_until <= (now() at time zone ci.timezone)::date)
       or (s.status = 'active' and s.next_visit_on < (now() at time zone ci.timezone)::date)
       or (s.status = 'active' and s.next_charge_on <= (now() at time zone ci.timezone)::date and (s.retry_on is null or s.retry_on <= (now() at time zone ci.timezone)::date))
       or exists (select 1 from offsession_charges q where q.kind = 'plan' and q.ref_id = s.id::text and q.status = 'pending')
       or (s.status = 'active' and s.next_visit_on is not null and s.updated_at > now() - interval '1 day'
           and not exists (select 1 from operations v where v.kind = 'appointment' and v.details->>'plan' = o.number and v.status <> 'cancelled'
                             and (v.scheduled_at at time zone ci.timezone)::date = s.next_visit_on)))
   order by least(case when s.status = 'paused' then s.paused_until end, s.next_charge_on, s.next_visit_on) nulls last, s.id
   limit 50`;
export async function barrerPlanes(f: { negocio?: string; userId?: string; numero?: string } = {}, entorno = process.env.TOLATINO_ENTORNO ?? "pruebas"): Promise<void> {
  const U = await import("./barrido-uno"), B = new U.Fallos("planes");
  type P = { id: string; numero: string; city: string };
  // La app al abrir una página (un plan, un negocio, una persona): todos los suyos, como siempre. El barrido central: solo lo que toca, por tandas.
  if (f.numero || f.negocio || f.userId) {
    const W = f.numero ? "o.number = $1" : f.negocio ? "s.business_id = $1" : "s.user_id = $1";
    const L = (await db().query<P>(`select s.id::text, o.number as numero, s.city_id as city from plan_subscriptions s join operations o on o.id = s.operation_id where ${W} and s.status <> 'cancelled' order by s.id limit 50`,
      [f.numero ?? f.negocio ?? f.userId])).rows;
    await B.cada(L, (x) => x.numero, (x) => unPlan(x, entorno));
  } else {
    await U.porTandas(B, 50, async (vistos) => (await db().query<P>(TOCA_PLAN, [vistos])).rows, (x) => x.numero, (x) => unPlan(x, entorno), { clave: (x) => x.id });
  }
  B.fin();
}
async function unPlan(x: { id: string; numero: string; city: string }, entorno: string): Promise<void> {
  const hoy = await hoyDe(db(), x.city);
  // 1. Pausa que terminó.
  await db().query(`update plan_subscriptions set status = 'active', paused_until = null, updated_at = now() where id = $1::bigint and status = 'paused' and paused_until is not null and paused_until <= $2::date`, [x.id, hoy]);
  // 2. Visitas: la próxima ya pasó → la siguiente (y se crea su cita); siempre existe la cita de la próxima.
  await tx(async (c) => {
    const s = (await c.query<{ next: string | null; dow: number; nth: number; meses: number[] | null; st: string }>(`select next_visit_on::text as next, dow, nth, visit_months as meses, status as st from plan_subscriptions where id = $1::bigint for update`, [x.id])).rows[0]!;
    if (s.st !== "active" || !s.next) return;
    let next = s.next;
    while (next < hoy) next = siguienteVisita(next, s.dow, s.nth, s.meses);
    if (next !== s.next) await c.query(`update plan_subscriptions set next_visit_on = $2::date, updated_at = now() where id = $1::bigint`, [x.id, next]);
    await crearVisita(c, x.numero, next, entorno);
  });
  // 3. Cobro del período (uno por período: idem = plan + fecha del cobro).
  await cobrarPeriodo(x.id, hoy);
}

/* 21 nov (9t4) · El cobro del período, como el de Pro (lib/cobro-fuera.ts): (1) la INTENCIÓN se anota (offsession_charges 'pending': la llave, el monto,
   la comisión, la tarjeta y el período fijos); (2) la pasarela con ESA llave; (3) el cierre (el período avanza, el pago y su evento) en otra transacción,
   una vez. Antes, la llave era el número de intento (cobros + rechazos) y un «sin respuesta» contaba como rechazo: el siguiente intento iba con OTRA llave
   y podía cobrar dos veces el mismo período. Ahora un «sin respuesta» deja la intención en camino (el plan no cambia: ni fallo, ni reintento, ni aviso)
   y la terminan el siguiente barrido del plan o el de los cobros (barrerCobrosFuera) con la MISMA llave; pasadas 23 h, la alerta y ningún cobro más.
   Un «no» del banco sí cuenta: reintento a los 2 y 4 días (otra intención, otra llave); al tercero, el plan queda en pausa. Nunca dos cobros del mismo
   período (la base: un solo 'done' por plan y período). */
async function cobrarPeriodo(subId: string, hoy: string): Promise<void> {
  const CF = await import("./cobro-fuera");
  // Una intención en camino de este plan (de cualquier período) se termina primero: nadie le cobra otra cosa mientras tanto.
  const camino = await CF.enCamino("plan", subId);
  if (camino) { await terminarCobroPlan(camino); return; }
  const s = (await db().query<{ op: string; num: string; biz: string; uid: string; city: string; cents: number; pm: string; next: string; day: number }>(
    `select s.operation_id::text as op, o.number as num, s.business_id as biz, s.user_id::text as uid, s.city_id as city, s.price_cents as cents, s.payment_method as pm, s.next_charge_on::text as next,
            s.charge_day as day
       from plan_subscriptions s join operations o on o.id = s.operation_id where s.id = $1::bigint and s.status = 'active' and s.next_charge_on <= $2::date and (s.retry_on is null or s.retry_on <= $2::date)`, [subId, hoy])).rows[0];
  if (!s) return;
  const destino = await cuentaDe(db(), s.biz);
  // Sin cuenta de cobro del negocio no se anota nada (no hay a quién cobrarle): cuenta como un intento fallido, como siempre.
  if (!destino) { await rechazoPlan(subId, s.op, s.num, s.uid); return; }
  const fee = Math.min(await comision(db(), "plan", s.cents), s.cents);
  const a = await CF.anotarCobro({ kind: "plan", ref: subId, para: `periodo-${s.next}`, op: s.op, negocio: s.biz, ciudad: s.city, payer: s.uid, monto: s.cents, fee, destino, pm: s.pm,
    idem: (k) => `plan-${subId}-${s.next}-i${k}`, detalle: { meta: { plan: s.num, business_id: s.biz }, next: s.next, day: s.day } });
  await terminarCobroPlan(a);
}
/* Pasos 2 y 3 (también desde barrerCobrosFuera). true = el cobro quedó hecho. */
export async function terminarCobroPlan(a: import("./cobro-fuera").Intencion): Promise<boolean> {
  const CF = await import("./cobro-fuera");
  const d = a.detalle as { next: string; day: number };
  const p0 = (await db().query<{ num: string; uid: string; plan: string; plan_en: string; st: string; next: string | null }>(
    `select o.number as num, s.user_id::text as uid, o.details#>>'{svc,es}' as plan, coalesce(nullif(o.details#>>'{svc,en}', ''), o.details#>>'{svc,es}') as plan_en, s.status as st, s.next_charge_on::text as next from plan_subscriptions s join operations o on o.id = s.operation_id where s.id = $1::bigint`, [a.ref])).rows[0];
  if (!p0) return false;
  const p = { ...p0, plan: { es: p0.plan, en: p0.plan_en } as Bi };
  // El plan se canceló, se pausó o su período se movió mientras el cobro iba en camino: si nunca se mandó, se suelta; si se mandó y Stripe cobró, el pago
  // queda en el libro y el equipo de dinero decide si se devuelve (offsession_unapplied). Nunca se aplica a otro período.
  if (p.st !== "active" || p.next !== d.next) {
    return CF.noAplica(a, "plan_cambio", { es: `el plan ${p.num} ya no esperaba ese cobro (${p.st}, próximo cobro ${p.next ?? "ninguno"}).`, en: `plan ${p.num} no longer expected that charge (${p.st}, next charge ${p.next ?? "none"}).` },
      (c, r) => pagoDelPlan(c, a, r.pi, null, null, false));
  }
  let aplicado = false;
  const r = await CF.terminarCobro(a, async (c, h) => {
    const u = await c.query(`update plan_subscriptions set charges_ok = charges_ok + 1, next_charge_on = $2::date, fail_count = 0, retry_on = null, updated_at = now() where id = $1::bigint and next_charge_on = $3::date and status = 'active'`,
      [a.ref, mesSiguiente(d.next, d.day), d.next]);
    aplicado = !!u.rowCount;
    await pagoDelPlan(c, a, h.pi, h.marca, h.l4, aplicado);
  });
  if (r.ok) {
    // 9t5 · «Ya cobrado»: si el plan TODAVÍA espera ese mismo período, se pone al día (ver periodoYaPagado); nunca se cobra otra vez.
    if (r.ya) { await periodoYaPagado(a); return true; }
    if (aplicado) await (await import("./avisos")).avisar(p.uid, "plan_cobro", { plan: p.plan, monto: money(a.monto) }, { href: `/plan/${p.num}`, ref: ["plan", p.num] });
    else await CF.alertaSinAplicar(a, { es: `el plan ${p.num} cambió en ese momento.`, en: `plan ${p.num} changed at that moment.` });
    return true;
  }
  if (r.enCamino) return false;
  await rechazoPlan(a.ref, a.op!, p.num, p.uid);
  return false;
}
/* 9t5 · El cobro de ESTE período ya está hecho (la intención de su propósito, 'done') y el plan sigue esperándolo (activo, el mismo next_charge_on): en el
   flujo normal no pasa (el cierre marca hecho y avanza en la misma transacción); si pasa (un arreglo a mano, un fallo), antes era mudo y el plan quedaba
   atascado para siempre (cada barrido encontraba «ya», nunca avanzaba, las visitas seguían sin cobrarse). Decisión: el período ESTÁ pagado (Stripe lo
   cobró y el pago está en el libro), así que el plan se pone al día: el próximo cobro pasa al mes siguiente, SIN otro pago, con su evento y su
   auditoría, una vez (where next_charge_on = el período). Si ese cobro salió «sin aplicar» (el equipo de dinero tiene su offsession_unapplied y puede
   haberlo devuelto), no se pone al día: lo decide el equipo con esa alerta, que ya le llegó. Nunca otro cobro. */
async function periodoYaPagado(a: import("./cobro-fuera").Intencion): Promise<void> {
  const d = a.detalle as { next: string; day: number };
  if ((await db().query(`select 1 from money_alerts where kind = 'offsession_unapplied' and subject_id = $1`, [a.idem])).rowCount) return;
  await tx(async (c) => {
    const u = (await c.query<{ ciudad: string | null }>(`update plan_subscriptions set next_charge_on = $2::date, fail_count = 0, retry_on = null, updated_at = now()
                                                          where id = $1::bigint and next_charge_on = $3::date and status = 'active' returning city_id as ciudad`, [a.ref, mesSiguiente(d.next, d.day), d.next])).rows[0];
    if (!u) return;
    await c.query(`insert into operation_events (operation_id, kind, actor, note) values ($1::bigint, 'period_caught_up', 'system', $2::jsonb)`, [a.op, JSON.stringify(
      { es: `El cobro del ${d.next} ya estaba hecho (${money(a.monto)}): el plan se puso al día sin cobrar otra vez`, en: `The ${d.next} charge was already made (${money(a.monto)}): the plan caught up without charging again` })]);
    await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, after) values ('system', null, 'plan.periodo_al_dia', 'plan_subscription', $1, $2, $3::jsonb)`,
      [a.ref, u.ciudad, JSON.stringify({ periodo: d.next, siguiente: mesSiguiente(d.next, d.day), cobro: a.pi, motivo: "el período ya estaba cobrado: no se cobra otra vez" })]);
  });
}
/* El pago en el libro (el dinero salió, se haya aplicado o no) y su evento, en la transacción del cierre. */
async function pagoDelPlan(c: PoolClient, a: import("./cobro-fuera").Intencion, pi: string, marca: string | null, l4: string | null, aplicado: boolean) {
  const seq = Number((await c.query<{ n: number }>(`select coalesce(max(seq), 0)::int + 1 as n from payments where operation_id = $1::bigint and kind = 'plan'`, [a.op])).rows[0]!.n);
  await c.query(`insert into payments (operation_id, user_id, business_id, city_id, kind, seq, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, card_brand, card_last4, captured_at, simulated, payment_method)
                 values ($1::bigint, $2, $3, $4, 'plan', $5, 'card', $6, $7, $7, $8, 'captured', $9, $10, now(), $11, $12) on conflict (stripe_payment_intent) do nothing`,
    [a.op, a.payer, a.negocio, a.ciudad, seq, pi, a.monto, a.fee, marca, l4, pi.startsWith("pi_sim_"), a.pm]);
  await c.query(`insert into operation_events (operation_id, kind, actor, note) values ($1::bigint, 'payment_captured', 'system', $2::jsonb)`, [a.op, JSON.stringify(aplicado
    ? { es: `Cobro ${seq} del plan: ${money(a.monto)}`, en: `Plan charge ${seq}: ${money(a.monto)}` }
    : { es: `Cobro del plan de ${money(a.monto)} que llegó cuando el plan ya había cambiado: lo revisa To'Latino`, en: `Plan charge of ${money(a.monto)} that arrived after the plan changed: To'Latino reviews it` })]);
}
/* Un «no» del banco: reintento a los 2 y 4 días; al tercero, el plan queda en pausa (sin visita) hasta que cambie la tarjeta. */
async function rechazoPlan(subId: string, op: string, num: string, uid: string) {
  const p0 = (await db().query<{ plan: string; plan_en: string }>(`select o.details#>>'{svc,es}' as plan, coalesce(nullif(o.details#>>'{svc,en}', ''), o.details#>>'{svc,es}') as plan_en from operations o where o.id = $1::bigint`, [op])).rows[0];
  const p = p0 ? { plan: { es: p0.plan, en: p0.plan_en } as Bi } : undefined;
  const u = (await db().query<{ fails: number; pausa: boolean }>(
    `update plan_subscriptions s set fail_count = s.fail_count + 1, retry_on = case when s.fail_count + 1 >= 3 then null else (now() at time zone ci.timezone)::date + 2 end,
            status = case when s.fail_count + 1 >= 3 then 'paused' else s.status end, paused_until = null, updated_at = now()
       from cities ci where ci.id = s.city_id and s.id = $1::bigint and s.status = 'active' returning s.fail_count as fails, s.status = 'paused' as pausa`, [subId])).rows[0];
  if (!u) return;
  await db().query(`insert into operation_events (operation_id, kind, actor, note) values ($1::bigint, 'payment_failed', 'system', $2::jsonb)`, [op, JSON.stringify(u.pausa ? { es: "El banco rechazó el cobro 3 veces: plan en pausa", en: "The bank declined 3 times: plan paused" } : { es: `El banco rechazó el cobro (intento ${u.fails})`, en: `The bank declined the charge (attempt ${u.fails})` })]);
  if (u.pausa) await db().query(`update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now(), cancel_reason = 'plan_pausa' where kind = 'appointment' and details->>'plan' = $1 and status = 'confirmed' and scheduled_at > now()`, [num]);
  await (await import("./avisos")).avisar(uid, "plan_fallo", { plan: p?.plan ?? "" }, { href: `/plan/${num}`, ref: ["plan", num] });
}

/* ── La persona: saltar la próxima, pausar un mes, reanudar, cancelar, cambiar la tarjeta ── */
export async function planCliente(userId: string, numero: string, que: "saltar" | "pausar" | "reanudar" | "cancelar" | "tarjeta", pm?: string): Promise<Res> {
  if (!NUM.test(numero)) return no("Ese plan no existe.", "That plan does not exist.");
  await barrerPlanes({ numero });
  let aviso: { tpl: string; v: Record<string, string | Bi>; biz: string; que: Bi; cl: string | null; plan: Bi } | null = null;
  const r = await tx(async (c): Promise<Res> => {
    const s0 = (await c.query<{ id: string; st: string; next: string | null; charge: string | null; dow: number; nth: number; meses: number[] | null; day: number; biz: string; city: string; plan: string; plan_en: string; cl: string | null }>(
      `select s.id::text, s.status as st, s.next_visit_on::text as next, s.next_charge_on::text as charge, s.dow, s.nth, s.visit_months as meses, s.charge_day as day, s.business_id as biz, s.city_id as city,
              o.details#>>'{svc,es}' as plan, coalesce(nullif(o.details#>>'{svc,en}', ''), o.details#>>'{svc,es}') as plan_en, nullif(u.first_name, '') as cl
         from plan_subscriptions s join operations o on o.id = s.operation_id join users u on u.id = s.user_id where s.user_id = $1 and o.number = $2 for update of s`, [userId, numero])).rows[0];
    if (!s0) return no("Ese plan no existe.", "That plan does not exist.");
    const s = { ...s0, plan: { es: s0.plan, en: s0.plan_en } as Bi };
    const hoy = await hoyDe(c, s.city);
    const quitarProxima = async () => c.query(`update operations set status = 'cancelled', cancelled_by = 'user', cancelled_at = now(), cancel_reason = 'plan' where kind = 'appointment' and details->>'plan' = $1 and status in ('confirmed', 'pending') and coalesce(status_detail, '') = '' and scheduled_at > now()`, [numero]);
    if (que === "tarjeta") {
      if (!pm || !/^pm_[A-Za-z0-9_]{3,200}$/.test(pm)) return no("Elige la tarjeta.", "Choose the card.", { tarjeta: true });
      if (!(await c.query(`select 1 from payment_methods where user_id = $1 and stripe_pm_id = $2 and status = 'active'`, [userId, pm])).rowCount && pasarela.modo() !== "simulador") return no("Esa tarjeta no es tuya.", "That card is not yours.", { tarjeta: true });
      // Cambiar la tarjeta reanuda un plan pausado por el banco y reintenta hoy.
      await c.query(`update plan_subscriptions set payment_method = $2, retry_on = null, fail_count = 0, status = case when status = 'paused' and paused_until is null then 'active' else status end, updated_at = now() where id = $1::bigint`, [s.id, pm]);
      return { ok: true };
    }
    if (que === "cancelar") {
      if (s.st === "cancelled") return no("Este plan ya está cancelado.", "This plan is already cancelled.");
      await c.query(`update plan_subscriptions set status = 'cancelled', cancelled_at = now(), next_charge_on = null, retry_on = null, updated_at = now() where id = $1::bigint`, [s.id]);
      await c.query(`update operations set status = 'cancelled', cancelled_by = 'user', cancelled_at = now() where number = $1`, [numero]);
      await quitarProxima();
      aviso = { tpl: "plan_cancelado", v: { plan: s.plan }, biz: s.biz, que: { es: "canceló el plan", en: "canceled the plan" }, cl: s.cl, plan: s.plan };
      return { ok: true };
    }
    if (que === "reanudar") {
      if (s.st !== "paused") return no("Este plan no está en pausa.", "This plan is not paused.");
      const next = siguienteVisita(hoy, s.dow, s.nth, s.meses);
      await c.query(`update plan_subscriptions set status = 'active', paused_until = null, next_visit_on = $2::date, next_charge_on = greatest(coalesce(next_charge_on, $2::date), $2::date), retry_on = null, fail_count = 0, updated_at = now() where id = $1::bigint`, [s.id, next]);
      aviso = { tpl: "", v: {}, biz: s.biz, que: { es: "reanudó el plan", en: "resumed the plan" }, cl: s.cl, plan: s.plan };
      return { ok: true };
    }
    // Saltar la próxima / pausar un mes: no hay visita ni cobro ese mes.
    if (s.st !== "active" || !s.next) return no("Este plan no está activo.", "This plan is not active.");
    const next = siguienteVisita(s.next, s.dow, s.nth, s.meses), charge = s.charge && s.charge <= mesSiguiente(s.next, 28) ? mesSiguiente(s.charge, s.day) : s.charge;
    await quitarProxima();
    await c.query(`update plan_subscriptions set next_visit_on = $2::date, next_charge_on = $3::date, status = case when $4 then 'paused' else status end, paused_until = case when $4 then $2::date end, updated_at = now() where id = $1::bigint`,
      [s.id, next, charge, que === "pausar"]);
    if (que === "pausar") aviso = { tpl: "plan_pausa", v: { plan: s.plan, dia: diaMes(next) }, biz: s.biz, que: { es: "pausó un mes", en: "paused for a month" }, cl: s.cl, plan: s.plan };
    else aviso = { tpl: "", v: {}, biz: s.biz, que: { es: "saltó la próxima visita", en: "skipped the next visit" }, cl: s.cl, plan: s.plan };
    return { ok: true };
  });
  if (r.ok && aviso) {
    const a = aviso as { tpl: string; v: Record<string, string | Bi>; biz: string; que: Bi; cl: string | null; plan: Bi }, av = await import("./avisos");
    if (a.tpl) await av.avisar(userId, a.tpl, a.v, { href: `/plan/${numero}`, ref: ["plan", numero] });
    await av.avisarNegocio(a.biz, "biz_plan_cambio", { cliente: a.cl ?? { es: "El cliente", en: "The customer" }, que: a.que, plan: a.plan }, { ref: ["plan", numero] });
  }
  if (r.ok && (que === "tarjeta" || que === "reanudar")) await barrerPlanes({ numero });
  return r;
}

/* ── Lo que ve la persona ── */
export type PlanVista = {
  numero: string; st: "active" | "paused" | "cancelled"; negocio: { id: string; nombre: string; telefono: string | null; foto: string | null; quien: string | null };
  svc: Bi; precio: number; inc: Bi[]; dow: number; nth: number; win: number; meses: number[] | null; casa: string | null; nota: string | null; acceso: string | null;
  proximas: { fecha: string; cita: string | null }[]; cobros: { seq: number; monto: number; at: string }[]; proxCobro: string | null; fallos: number; reintento: string | null;
  tarjeta: string | null; empezo: string; visitas: number; cancelado: string | null;
};
export async function planVista(userId: string, numero: string): Promise<PlanVista | null> {
  if (!NUM.test(numero)) return null;
  await barrerPlanes({ numero });
  const p = (await db().query<Omit<PlanVista, "proximas" | "cobros"> & { next: string | null; tz: string }>(
    `select o.number as numero, s.status as st, jsonb_build_object('id', b.id, 'nombre', b.name, 'telefono', b.phone, 'foto', b.logo_url,
              'quien', (select display_name from business_members m where m.business_id = b.id and m.kind = 'owner' and m.status = 'active' limit 1)) as negocio,
            i.name as svc, s.price_cents as precio, coalesce(i.svc_attrs->'inc', '[]'::jsonb) as inc, s.dow, s.nth, s.window_m as win, s.visit_months as meses, o.details#>>'{casa,dir}' as casa,
            s.note as nota, s.access as acceso, s.next_visit_on::text as next, s.next_charge_on::text as "proxCobro", s.fail_count as fallos, s.retry_on::text as reintento,
            (select upper(coalesce(pm.brand, '')) || ' ·· ' || pm.last4 from payment_methods pm where pm.stripe_pm_id = s.payment_method limit 1) as tarjeta,
            to_char(s.created_at at time zone ci.timezone, 'FMHH12:MI AM') as empezo, (select count(*)::int from operations v where v.kind = 'appointment' and v.details->>'plan' = o.number and v.status = 'done') as visitas, s.cancelled_at::text as cancelado, ci.timezone as tz
       from plan_subscriptions s join operations o on o.id = s.operation_id join businesses b on b.id = s.business_id join items i on i.id = s.item_id join cities ci on ci.id = s.city_id
      where s.user_id = $1 and o.number = $2`, [userId, numero])).rows[0];
  if (!p) return null;
  const proximas: PlanVista["proximas"] = [];
  if (p.st !== "cancelled") {
    let f = p.st === "paused" ? null : p.next;
    if (!f && p.st === "paused") f = siguienteVisita(addD(hoyEn(), 0), p.dow, p.nth, p.meses);
    for (let k = 0; f && k < 4; k++) {
      const cita = (await db().query<{ n: string }>(`select number as n from operations where kind = 'appointment' and details->>'plan' = $1 and (scheduled_at at time zone $3)::date = $2::date and status <> 'cancelled'`, [numero, f, p.tz])).rows[0]?.n ?? null;
      proximas.push({ fecha: f, cita }); f = siguienteVisita(f, p.dow, p.nth, p.meses);
    }
  }
  const cobros = (await db().query<{ seq: number; monto: number; at: string }>(`select seq, amount_cents as monto, captured_at::text as at from payments py join operations o on o.id = py.operation_id where o.number = $1 and py.kind = 'plan' and py.status in ('captured', 'partially_refunded') order by seq desc limit 12`, [numero])).rows;
  const { next: _n, tz: _t, ...rest } = p;
  return { ...rest, proximas, cobros };
}

/* ── El panel: los planes del negocio (próxima visita de cada uno) ── */
export type PlanPanelFila = { numero: string; quien: string; svc: Bi; st: string; next: string | null; precio: number; cobros: number; fallos: number };
export async function planesNegocio(negocio: string): Promise<PlanPanelFila[]> {
  await barrerPlanes({ negocio });
  return (await db().query<PlanPanelFila>(
    `select /* pantalla */ o.number as numero, coalesce(nullif(u.first_name, ''), 'Cliente') || coalesce(' ' || left(nullif(u.last_name, ''), 1) || '.', '') as quien, i.name as svc, s.status as st,
            s.next_visit_on::text as next, s.price_cents as precio, s.charges_ok as cobros, s.fail_count as fallos
       from plan_subscriptions s join operations o on o.id = s.operation_id join users u on u.id = s.user_id join items i on i.id = s.item_id
      where s.business_id = $1 and s.status <> 'cancelled' order by s.next_visit_on nulls last limit 50`, [negocio])).rows;
}
