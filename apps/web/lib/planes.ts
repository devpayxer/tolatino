import "server-only";
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
  const meses = Array.isArray(it.a?.vis) && it.a!.vis!.length ? it.a!.vis!.filter((m) => m >= 1 && m <= 12) : null;
  const dias: OpcionesPlan["dias"] = [];
  for (const dow of [1, 2, 3, 4, 5, 6]) {
    const h = H.find((x) => x.weekday === dow);
    if (!h?.open || !h.ranges?.length) continue;
    const [a, z] = h.ranges[0]!, m = Number(a.slice(0, 2)) * 60 + Number(a.slice(3, 5)), fin = Number(z.slice(0, 2)) * 60 + Number(z.slice(3, 5));
    if (fin && fin - m < 120 && fin > m) continue;
    // Las 3 primeras de ese día (desde mañana), como el N-ésimo del mes (si cae en el 5.º, no se ofrece).
    const fechas: string[] = [];
    for (let i = 1; i < 60 && fechas.length < 3; i++) { const f = addD(hoy, i), d = s2d(f); if (d.getUTCDay() !== dow || d.getUTCDate() > 28) continue; if (meses && !meses.includes(d.getUTCMonth() + 1)) continue; fechas.push(f); }
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
  let numero = "", aviso: { negocio: string; plan: string; dia: string; cliente: string } | null = null;
  const r = await tx(async (c): Promise<Res<{ numero: string }>> => {
    const ya = (await c.query<{ number: string }>(`select o.number from operations o where o.user_id = $1 and o.client_key = $2::uuid`, [userId, f.clave])).rows[0];
    if (ya) return { ok: true, numero: ya.number };
    await c.query(`select pg_advisory_xact_lock(hashtext('cita:' || $1))`, [f.negocio]);
    if ((await c.query(`select 1 from plan_subscriptions where user_id = $1 and item_id = $2::bigint and status <> 'cancelled'`, [userId, f.svc])).rowCount) return no("Ya tienes este plan.", "You already have this plan.");
    const own = (await c.query(`select 1 from payment_methods where user_id = $1 and stripe_pm_id = $2 and status = 'active'`, [userId, f.pm])).rowCount;
    if (!own && pasarela.modo() !== "simulador") return no("Esa tarjeta no es tuya.", "That card is not yours.", { tarjeta: true });
    const x = (await c.query<{ name: Bi; cents: number; city: string; bname: string; cl: string; tz: string }>(
      `select i.name, i.price_cents as cents, b.city_id as city, b.name as bname, coalesce(nullif(u.first_name, ''), 'Un cliente') as cl, ci.timezone as tz
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
    aviso = { negocio: f.negocio, plan: x.name.es, dia: f.fecha, cliente: x.cl };
    return { ok: true, numero };
  });
  if (r.ok && aviso) {
    const a = aviso as { negocio: string; plan: string; dia: string; cliente: string }, av = await import("./avisos"), d = s2d(a.dia), diaL = `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
    await av.avisar(userId, "plan_activo", { plan: a.plan, negocio: "", dia: diaL }, { href: `/plan/${r.numero}`, ref: ["plan", r.numero] });
    await av.avisarNegocio(a.negocio, "biz_plan_nuevo", { cliente: a.cliente, plan: a.plan, dia: diaL }, { href: `/panel/${a.negocio}/hoy`, ref: ["plan", r.numero] });
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
export async function barrerPlanes(f: { negocio?: string; userId?: string; numero?: string } = {}, entorno = process.env.TOLATINO_ENTORNO ?? "pruebas"): Promise<void> {
  const W = f.numero ? "o.number = $1" : f.negocio ? "s.business_id = $1" : f.userId ? "s.user_id = $1" : "true";
  const A = f.numero ? [f.numero] : f.negocio ? [f.negocio] : f.userId ? [f.userId] : [];
  const L = (await db().query<{ id: string; numero: string; city: string }>(`select s.id::text, o.number as numero, s.city_id as city from plan_subscriptions s join operations o on o.id = s.operation_id where ${W} and s.status <> 'cancelled' limit 50`, A)).rows;
  for (const x of L) {
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
}

async function cobrarPeriodo(subId: string, hoy: string): Promise<void> {
  const s = (await db().query<{ op: string; num: string; biz: string; uid: string; city: string; cents: number; pm: string; next: string; retry: string | null; fails: number; seq: number; intento: number; day: number; plan: string }>(
    `select s.operation_id::text as op, o.number as num, s.business_id as biz, s.user_id::text as uid, s.city_id as city, s.price_cents as cents, s.payment_method as pm, s.next_charge_on::text as next,
            s.retry_on::text as retry, s.fail_count as fails, s.charges_ok + 1 as seq,
            (select count(*)::int from operation_events e where e.operation_id = s.operation_id and e.kind in ('payment_captured', 'payment_failed')) as intento, s.charge_day as day, o.details#>>'{svc,es}' as plan
       from plan_subscriptions s join operations o on o.id = s.operation_id where s.id = $1::bigint and s.status = 'active' and s.next_charge_on <= $2::date and (s.retry_on is null or s.retry_on <= $2::date)`, [subId, hoy])).rows[0];
  if (!s) return;
  const destino = await cuentaDe(db(), s.biz);
  const fee = Math.min(await comision(db(), "plan", s.cents), s.cents);
  const r = destino ? await pasarela.cobrarFuera({ centavos: s.cents, comision: fee, destino, pm: s.pm, cliente: await pasarela.cliente(s.uid).catch(() => null), idem: `plan-${subId}-a${s.intento}` /* el número de intento (cobros + rechazos): nunca se repite (ni la fecha ni el contador de fallos sirven: se repiten al reanudar o al cambiar la tarjeta) y dos barridos a la vez dan la misma clave */, meta: { plan: s.num, business_id: s.biz } })
    : { ok: false as const, codigo: "sin_cuenta", mensaje: { es: "", en: "" } };
  const av = await import("./avisos");
  if (r.ok) {
    const hecho = await tx(async (c) => {
      const u = await c.query(`update plan_subscriptions set charges_ok = charges_ok + 1, next_charge_on = $2::date, fail_count = 0, retry_on = null, updated_at = now() where id = $1::bigint and next_charge_on = $3::date`, [subId, mesSiguiente(s.next, s.day), s.next]);
      if (!u.rowCount) return false;
      await c.query(`insert into payments (operation_id, user_id, business_id, city_id, kind, seq, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, card_brand, card_last4, captured_at, simulated, payment_method)
                     values ($1::bigint, $2, $3, $4, 'plan', $5, 'card', $6, $7, $7, $8, 'captured', $9, $10, now(), $11, $12) on conflict (stripe_payment_intent) do nothing`,
        [s.op, s.uid, s.biz, s.city, s.seq, r.id, s.cents, fee, r.marca, r.ultimos4, r.id.startsWith("pi_sim_"), s.pm]);
      await c.query(`insert into operation_events (operation_id, kind, actor, note) values ($1::bigint, 'payment_captured', 'system', $2::jsonb)`, [s.op, JSON.stringify({ es: `Cobro ${s.seq} del plan: ${money(s.cents)}`, en: `Plan charge ${s.seq}: ${money(s.cents)}` })]);
      return true;
    });
    if (hecho) await av.avisar(s.uid, "plan_cobro", { plan: s.plan, monto: money(s.cents) }, { href: `/plan/${s.num}`, ref: ["plan", s.num] });
    return;
  }
  // Rechazo: reintento a los 2 y 4 días; al tercero, el plan queda en pausa (sin visita) hasta que cambie la tarjeta.
  const fails = s.fails + 1, pausa = fails >= 3;
  await db().query(`update plan_subscriptions set fail_count = $2, retry_on = case when $3 then null else $4::date end, status = case when $3 then 'paused' else status end, paused_until = null, updated_at = now() where id = $1::bigint`,
    [subId, fails, pausa, addD(hoy, 2)]);
  await db().query(`insert into operation_events (operation_id, kind, actor, note) values ($1::bigint, 'payment_failed', 'system', $2::jsonb)`, [s.op, JSON.stringify(pausa ? { es: "El banco rechazó el cobro 3 veces: plan en pausa", en: "The bank declined 3 times: plan paused" } : { es: `El banco rechazó el cobro (intento ${fails})`, en: `The bank declined the charge (attempt ${fails})` })]);
  if (pausa) await db().query(`update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now(), cancel_reason = 'plan_pausa' where kind = 'appointment' and details->>'plan' = $1 and status = 'confirmed' and scheduled_at > now()`, [s.num]);
  await av.avisar(s.uid, "plan_fallo", { plan: s.plan }, { href: `/plan/${s.num}`, ref: ["plan", s.num] });
}

/* ── La persona: saltar la próxima, pausar un mes, reanudar, cancelar, cambiar la tarjeta ── */
export async function planCliente(userId: string, numero: string, que: "saltar" | "pausar" | "reanudar" | "cancelar" | "tarjeta", pm?: string): Promise<Res> {
  if (!NUM.test(numero)) return no("Ese plan no existe.", "That plan does not exist.");
  await barrerPlanes({ numero });
  let aviso: { tpl: string; v: Record<string, string>; biz: string; que: string; cl: string; plan: string } | null = null;
  const r = await tx(async (c): Promise<Res> => {
    const s = (await c.query<{ id: string; st: string; next: string | null; charge: string | null; dow: number; nth: number; meses: number[] | null; day: number; biz: string; city: string; plan: string; cl: string }>(
      `select s.id::text, s.status as st, s.next_visit_on::text as next, s.next_charge_on::text as charge, s.dow, s.nth, s.visit_months as meses, s.charge_day as day, s.business_id as biz, s.city_id as city,
              o.details#>>'{svc,es}' as plan, coalesce(nullif(u.first_name, ''), 'El cliente') as cl
         from plan_subscriptions s join operations o on o.id = s.operation_id join users u on u.id = s.user_id where s.user_id = $1 and o.number = $2 for update of s`, [userId, numero])).rows[0];
    if (!s) return no("Ese plan no existe.", "That plan does not exist.");
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
      aviso = { tpl: "plan_cancelado", v: { plan: s.plan }, biz: s.biz, que: "canceló el plan", cl: s.cl, plan: s.plan };
      return { ok: true };
    }
    if (que === "reanudar") {
      if (s.st !== "paused") return no("Este plan no está en pausa.", "This plan is not paused.");
      const next = siguienteVisita(hoy, s.dow, s.nth, s.meses);
      await c.query(`update plan_subscriptions set status = 'active', paused_until = null, next_visit_on = $2::date, next_charge_on = greatest(coalesce(next_charge_on, $2::date), $2::date), retry_on = null, fail_count = 0, updated_at = now() where id = $1::bigint`, [s.id, next]);
      aviso = { tpl: "", v: {}, biz: s.biz, que: "reanudó el plan", cl: s.cl, plan: s.plan };
      return { ok: true };
    }
    // Saltar la próxima / pausar un mes: no hay visita ni cobro ese mes.
    if (s.st !== "active" || !s.next) return no("Este plan no está activo.", "This plan is not active.");
    const next = siguienteVisita(s.next, s.dow, s.nth, s.meses), charge = s.charge && s.charge <= mesSiguiente(s.next, 28) ? mesSiguiente(s.charge, s.day) : s.charge;
    await quitarProxima();
    await c.query(`update plan_subscriptions set next_visit_on = $2::date, next_charge_on = $3::date, status = case when $4 then 'paused' else status end, paused_until = case when $4 then $2::date end, updated_at = now() where id = $1::bigint`,
      [s.id, next, charge, que === "pausar"]);
    if (que === "pausar") aviso = { tpl: "plan_pausa", v: { plan: s.plan, dia: `${s2d(next).getUTCDate()}/${s2d(next).getUTCMonth() + 1}` }, biz: s.biz, que: "pausó un mes", cl: s.cl, plan: s.plan };
    else aviso = { tpl: "", v: {}, biz: s.biz, que: "saltó la próxima visita", cl: s.cl, plan: s.plan };
    return { ok: true };
  });
  if (r.ok && aviso) {
    const a = aviso as { tpl: string; v: Record<string, string>; biz: string; que: string; cl: string; plan: string }, av = await import("./avisos");
    if (a.tpl) await av.avisar(userId, a.tpl, a.v, { href: `/plan/${numero}`, ref: ["plan", numero] });
    await av.avisarNegocio(a.biz, "biz_plan_cambio", { cliente: a.cl, que: a.que, plan: a.plan }, { ref: ["plan", numero] });
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
    `select o.number as numero, coalesce(nullif(u.first_name, ''), 'Cliente') || coalesce(' ' || left(nullif(u.last_name, ''), 1) || '.', '') as quien, i.name as svc, s.status as st,
            s.next_visit_on::text as next, s.price_cents as precio, s.charges_ok as cobros, s.fail_count as fallos
       from plan_subscriptions s join operations o on o.id = s.operation_id join users u on u.id = s.user_id join items i on i.id = s.item_id
      where s.business_id = $1 and s.status <> 'cancelled' order by s.next_visit_on nulls last limit 50`, [negocio])).rows;
}
