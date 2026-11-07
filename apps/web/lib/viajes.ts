import "server-only";
import type { PoolClient } from "pg";
import { contexto } from "./citas";
import { cobrarOperacion, comision, devolverPago, liberarOperacion, registrarRetencion } from "./cobros";
import { db, tx } from "./db";
import { pasarela } from "./pagos/pasarela";
import { kindTrans, salidasDe } from "./transporte";
import { LIC_TRANS, type Bi, type SvcTrans } from "./transporte-comun";

/* Reservar un viaje (Fase 4 · 4y-1 · fase4-fiestas-transporte.md §3 y §4y · neg-trans-flow.js).
   - Un viaje es una operación `trip` (V-9101…). El TOTAL cerrado (asientos × precio + niños × precio de niño + maletas extra, o el
     precio del vehículo) se RETIENE al reservar y se COBRA cuando el negocio confirma. Si no confirma, propone otra salida que no
     aceptas o no contesta a tiempo, se libera completo.
   - Los asientos van en run_seats y trip_runs.seats_booked es su suma: todo lo que toca una salida va con el candado
     «salida:{id}» y en la misma transacción, así nadie vende un asiento que no queda.
   - Cancelar (cliente): sin confirmar → se libera; confirmado y faltan 24 h o más → devolución completa; menos → se cobra la mitad
     (la otra mitad vuelve; redondeo a favor del cliente). Si el negocio cancela la salida: devolución completa a cada pasajero.
   - Pasos de la salida: va tarde (aviso a todos) · salió · llegó (el viaje queda terminado). */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, ID = /^\d{1,18}$/;
export const NUM_V = /^V-\d{1,10}$/;
export const HORAS_PRIV = Array.from({ length: 18 }, (_, i) => (i + 5) * 60); // vehículo completo: 5 AM – 10 PM
export const DIAS_VIAJE = 7; // hoy y los 6 días siguientes (DN L12)
const money = (c: number) => `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const no = (es: string, en: string, extra?: Record<string, true>) => ({ ok: false as const, msg: { es, en } as Bi, ...extra });
const horaL = (m: number) => `${Math.floor(m / 60) % 12 || 12}:${String(m % 60).padStart(2, "0")} ${m < 720 ? "AM" : "PM"}`;
type Q = PoolClient | ReturnType<typeof db>;

/* Lo que se cobra (el servidor; la pantalla muestra lo mismo con la misma regla). */
export function calcularViaje(s: Pick<SvcTrans, "k" | "cents" | "child">, q: { adults?: number; kids?: number; bagsExtra?: number }, extraBag: number | null) {
  if (s.k === "asiento") {
    const adults = Math.max(0, Math.round(Number(q.adults) || 0)), kids = Math.max(0, Math.round(Number(q.kids) || 0)), bags = extraBag == null ? 0 : Math.max(0, Math.min(6, Math.round(Number(q.bagsExtra) || 0)));
    return { seats: adults + kids, adults, kids, bags, tot: adults * s.cents + kids * (s.child ?? s.cents) + bags * (extraBag ?? 0) };
  }
  return { seats: 0, adults: Math.max(1, Math.round(Number(q.adults) || 1)), kids: 0, bags: 0, tot: s.cents };
}

type SvcV = SvcTrans & { dur: number };
async function servicio(c: Q, negocio: string, id: string): Promise<SvcV | null> {
  if (!ID.test(id)) return null;
  return (await c.query<SvcV>(
    `select i.id::text, i.section_id::text as sec, i.name, coalesce(i.descr, '{"es":"","en":""}'::jsonb) as desc, i.price_cents as cents, i.svc_kind as k,
            coalesce((select array_agg(x::int order by x::int) from jsonb_array_elements_text(coalesce(i.svc_attrs->'sal', '[]'::jsonb)) x), '{}') as sal,
            (i.svc_attrs->>'pax')::int as pax, (i.svc_attrs->>'child')::int as child, i.svc_attrs->'to' as "to", i.svc_attrs->'from' as "from", (i.svc_attrs->>'dmin')::int as dmin,
            (i.svc_attrs->>'wait')::int as wait, coalesce(i.svc_attrs->'inc', '[]'::jsonb) as inc, i.photos[1] as foto, null::jsonb as prox, coalesce((i.svc_attrs->>'dmin')::int, 60) as dur
       from items i where i.id = $1::bigint and i.business_id = $2 and i.module = 'svc' and i.removed_at is null and i.sell and i.status = 'live' and i.svc_kind in ('asiento', 'priv')`, [id, negocio])).rows[0] ?? null;
}
async function licOk(c: Q, negocio: string) {
  const k = await kindTrans(negocio, c), req = LIC_TRANS[k?.kind ?? "taxi"] ?? [];
  if (!req.length) return true;
  return (await c.query(`select 1 from licenses where business_id = $1 and member_id is null and status = 'valid' and kind = any($2::text[]) limit 1`, [negocio, req])).rowCount! > 0;
}
async function ajustes(c: Q, negocio: string) {
  const s = (await c.query<{ bags: number; extra: number | null; nino: boolean }>(`select bags_included as bags, extra_bag_cents as extra, child_seat as nino from trans_settings where business_id = $1`, [negocio])).rows[0];
  return { bags: s?.bags ?? 2, extra: s?.extra ?? null, nino: !!s?.nino };
}

/* ── El Booking (APP-NEG-TRANS-RESERVA) ── */
export type DiaViaje = { ymd: string; salidas: { run: string; m: number; quedan: number; libre: boolean }[] };
export type BookingViaje = {
  negocio: { id: string; nombre: string; foto: string | null; ciudad: string; direccion: string | null }; svc: SvcV; hoy: string; dias: DiaViaje[];
  aj: { bags: number; extra: number | null; nino: boolean }; enApp: boolean; booking: boolean; zone: number | null; dirs: { id: string; t: string; enZona: boolean; def: boolean }[];
};
export async function bookingViaje(negocio: string, svcId: string, userId: string | null): Promise<BookingViaje | null> {
  const c = db(), x = await contexto(c, negocio, ["NEG-TRANS"]);
  if (!x) return null;
  const s = await servicio(c, negocio, svcId);
  if (!s) return null;
  const b = (await c.query<{ zone: number | null; ciudad: string }>(`select b.service_radius_mi as zone, ci.name as ciudad from businesses b join cities ci on ci.id = b.city_id where b.id = $1`, [negocio])).rows[0]!;
  const dias: DiaViaje[] = [];
  for (let i = 0; i < DIAS_VIAJE; i++) {
    const ymd = (await c.query<{ d: string }>(`select ($1::date + $2::int)::text as d`, [x.hoy, i])).rows[0]!.d;
    if (s.k === "asiento") {
      const L = (await salidasDe(negocio, ymd)).filter((r) => r.item === s.id);
      dias.push({ ymd, salidas: L.map((r) => ({ run: r.run, m: r.m, quedan: r.quedan, libre: r.futura && !r.cancelada && r.quedan > 0 })) });
    } else dias.push({ ymd, salidas: HORAS_PRIV.map((m) => ({ run: "", m, quedan: 0, libre: i > 0 || m > x.now + 60 })) });
  }
  const dirs = s.k === "priv" && userId ? (await c.query<{ id: string; t: string; enZona: boolean; def: boolean }>(
    `select a.id::text, concat_ws(', ', a.street || coalesce(' ' || nullif(a.apt, ''), ''), a.zip) as t, a.is_default as def,
            coalesce(a.geo is null or bz.geo is null or bz.service_radius_mi is null or st_dwithin(a.geo, bz.geo, bz.service_radius_mi * 1609.344), true) as "enZona"
       from user_addresses a, businesses bz where bz.id = $2 and a.user_id = $1 and a.removed_at is null order by a.is_default desc, a.created_at limit 10`, [userId, negocio])).rows : [];
  return { negocio: { id: x.id, nombre: x.name, foto: x.foto, ciudad: b.ciudad, direccion: x.address }, svc: s, hoy: x.hoy, dias, aj: await ajustes(c, negocio), enApp: !!x.cuenta,
    booking: x.plan === "pro" && x.mods.includes("citas") && !x.off.citas && !x.off.svc && await licOk(c, negocio), zone: b.zone, dirs };
}

/* Mover asientos (siempre con el candado de la salida). */
async function tomarAsientos(c: PoolClient, op: string, run: string, seats: number): Promise<boolean> {
  await c.query(`select pg_advisory_xact_lock(hashtext('salida:' || $1))`, [run]);
  const r = await c.query(`update trip_runs set seats_booked = seats_booked + $2, updated_at = now() where id = $1::bigint and status = 'scheduled' and run_at > now() and seats_total - seats_outside - seats_booked >= $2`, [run, seats]);
  if (!r.rowCount) return false;
  await c.query(`insert into run_seats (operation_id, run_id, seats) values ($1::bigint, $2::bigint, $3)
                 on conflict (operation_id, run_id) do update set seats = excluded.seats, status = 'held', updated_at = now()`, [op, run, seats]);
  return true;
}
async function soltarAsientos(c: PoolClient, op: string) {
  const L = (await c.query<{ run: string; seats: number }>(`select run_id::text as run, seats from run_seats where operation_id = $1::bigint and status in ('held', 'boarded', 'noshow')`, [op])).rows;
  for (const x of L) {
    await c.query(`select pg_advisory_xact_lock(hashtext('salida:' || $1))`, [x.run]);
    await c.query(`update run_seats set status = 'cancelled', updated_at = now() where operation_id = $1::bigint and run_id = $2::bigint and status in ('held', 'boarded', 'noshow')`, [op, x.run]);
    await c.query(`update trip_runs set seats_booked = greatest(0, seats_booked - $2), updated_at = now() where id = $1::bigint`, [x.run, x.seats]);
  }
}

/* ── Reservar ── */
export type ViajeIn = { svc: string; day: string; m: number; run?: string | null; adults: number; kids?: number; childSeat?: boolean; bagsExtra?: number;
  pickup?: string | null; nota?: string; sms?: boolean; pm?: string | null; clave: string };
type Res = { ok: true; numero: string } | { ok: false; msg: Bi; tarjeta?: true; salida?: true };
export async function reservarViaje(userId: string, negocio: string, f: ViajeIn, entorno: string): Promise<Res> {
  if (!UUID.test(String(f?.clave)) || !ID.test(String(f?.svc)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(f?.day))) return no("Revisa tu reserva y vuelve a intentarlo.", "Check your booking and try again.");
  const nota = String(f.nota ?? "").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, 200);
  if (/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(nota)) return no("Por seguridad, sin teléfonos en la nota.", "For safety, no phone numbers in the note.");
  const c = await db().connect();
  let retenido: string | null = null;
  try {
    await c.query("begin");
    const ya = (await c.query<{ number: string }>(`select number from operations where user_id = $1 and client_key = $2`, [userId, f.clave])).rows[0];
    if (ya) { await c.query("rollback"); return { ok: true, numero: ya.number }; }
    const x = await contexto(c, negocio, ["NEG-TRANS"]), s = x ? await servicio(c, negocio, String(f.svc)) : null;
    if (!x || !s) { await c.query("rollback"); return no("Ese servicio no se reserva en línea.", "That service is not booked online."); }
    if (x.plan !== "pro" || !x.mods.includes("citas") || x.off.citas || x.off.svc) { await c.query("rollback"); return no(`${x.name} no toma reservas en línea por ahora: llama al negocio.`, `${x.name} is not taking online bookings right now: call the business.`); }
    if (!(await licOk(c, negocio))) { await c.query("rollback"); return no(`La licencia de ${x.name} está en revisión: por ahora se reserva llamando.`, `${x.name}'s license is under review: book by phone for now.`); }
    if (s.k !== "asiento" && s.k !== "priv") { await c.query("rollback"); return no("Ese servicio se pide llamando al negocio.", "That service is requested by calling the business."); }
    const dias = (await c.query<{ d: number }>(`select ($1::date - $2::date)::int as d`, [f.day, x.hoy])).rows[0]!.d;
    if (!(dias >= 0 && dias < DIAS_VIAJE)) { await c.query("rollback"); return no("Elige un día de esta semana.", "Pick a day this week.", { salida: true }); }
    const aj = await ajustes(c, negocio), calc = calcularViaje(s, { adults: f.adults, kids: f.kids, bagsExtra: f.bagsExtra }, aj.extra);
    let run: string | null = null, m = Math.floor(Number(f.m)), people = calc.adults + calc.kids;
    if (s.k === "asiento") {
      if (!calc.adults) { await c.query("rollback"); return no("¿Cuántos viajan? Al menos un adulto.", "How many are traveling? At least one adult."); }
      if (calc.seats > 14) { await c.query("rollback"); return no("Hasta 14 asientos por reserva.", "Up to 14 seats per booking."); }
      const L = (await salidasDe(negocio, f.day, c)).filter((r) => r.item === s.id);
      const r = L.find((z) => z.run === String(f.run ?? "")) ?? L.find((z) => z.m === m);
      if (!r || r.cancelada || !r.futura) { await c.query("rollback"); return no("Esa salida ya no está. Elige otra.", "That departure is no longer available. Pick another.", { salida: true }); }
      run = r.run; m = r.m;
    } else {
      if (!HORAS_PRIV.includes(m) || (dias === 0 && m <= x.now + 60)) { await c.query("rollback"); return no("Elige la hora: desde una hora a partir de ahora.", "Pick the time: from one hour from now.", { salida: true }); }
      if (s.pax && people > s.pax) { await c.query("rollback"); return no(`Caben hasta ${s.pax} personas.`, `Fits up to ${s.pax} people.`); }
    }
    // Recogida (vehículo completo): una de tus direcciones, dentro de su zona (PostGIS).
    let pickup: { id: string; t: string } | null = null;
    if (s.k === "priv") {
      if (!f.pickup || !UUID.test(String(f.pickup))) { await c.query("rollback"); return no("Elige dónde te recogen.", "Pick where they pick you up."); }
      const p = (await c.query<{ t: string; ok: boolean }>(
        `select concat_ws(', ', a.street || coalesce(' ' || nullif(a.apt, ''), ''), a.zip) as t,
                coalesce(a.geo is null or b.geo is null or b.service_radius_mi is null or st_dwithin(a.geo, b.geo, b.service_radius_mi * 1609.344), true) as ok
           from user_addresses a, businesses b where a.id = $1::uuid and a.user_id = $2 and a.removed_at is null and b.id = $3`, [f.pickup, userId, negocio])).rows[0];
      if (!p) { await c.query("rollback"); return no("Esa dirección ya no está.", "That address is gone."); }
      if (!p.ok) { await c.query("rollback"); return no(`Esa dirección queda fuera de la zona de ${x.name}.`, `That address is outside ${x.name}'s area.`); }
      pickup = { id: String(f.pickup), t: p.t };
    }
    const pend = (await c.query<{ n: number }>(`select count(*)::int as n from operations where user_id = $1 and kind = 'trip' and status in ('pending', 'change_proposed')`, [userId])).rows[0]!.n;
    if (pend >= 3) { await c.query("rollback"); return no("Tienes 3 reservas esperando respuesta. Espera a que te contesten.", "You have 3 bookings waiting for a reply. Wait for an answer."); }
    const tot = calc.tot, enApp = !!x.cuenta && tot > 0;
    const numero = `V-${(await c.query<{ n: string }>(`select nextval('trip_seq')::text as n`)).rows[0]!.n}`;
    let ret: Awaited<ReturnType<typeof pasarela.retener>> | null = null, fee = 0;
    if (enApp) {
      const pm = typeof f.pm === "string" && /^pm_[A-Za-z0-9_]{3,200}$/.test(f.pm) ? f.pm : null;
      if (!pm) { await c.query("rollback"); return no("Elige la tarjeta.", "Choose the card.", { tarjeta: true }); }
      fee = Math.min(await comision(c, "viaje", tot), tot);
      const cliente = await pasarela.cliente(userId).catch(() => null);
      ret = await pasarela.retener({ centavos: tot, comision: fee, destino: x.cuenta!, pm, cliente, idem: `viaje-${f.clave}-${pm.slice(-24)}`, meta: { trip: numero, business_id: x.id } });
      if (!ret.ok) { await c.query("rollback"); return no(`${ret.mensaje.es} No se retuvo nada.`, `${ret.mensaje.en} Nothing was held.`, { tarjeta: true }); }
      retenido = ret.pi;
      if (ret.estado === "accion") { await c.query("rollback"); await pasarela.liberar(ret.pi).catch(() => undefined); retenido = null; return no("Tu banco pide una verificación extra. Prueba con otra tarjeta.", "Your bank asks for an extra verification. Try another card.", { tarjeta: true }); }
    }
    const det = { svc: s.name, svcId: s.id, k: s.k, unit: s.cents, child: s.child, adults: calc.adults, kids: calc.kids, childSeat: !!f.childSeat && aj.nino, bagsIncl: aj.bags, bagsExtra: calc.bags, extraBag: aj.extra,
      inc: s.inc, from: s.from, to: s.to, run, pickup, sms: f.sms !== false, terms: { cancelH: 24, feePct: 50 } };
    const op = (await c.query<{ id: string }>(
      `insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, duration_min, buffer_min, customer_note, details, party_size,
                               subtotal_cents, total_cents, pay_mode, respond_by, free_quota_month, client_key, is_test)
       values ($1, 'trip', $2, $3, $4, 'pending', ($5::date + make_interval(mins => $6::int)) at time zone $7, $8, 0, nullif($9, ''), $10::jsonb, $11,
               $12, $12, $13, least(now() + case when $5::date = (now() at time zone $7)::date then interval '2 hours' else interval '24 hours' end, ($5::date + make_interval(mins => $6::int)) at time zone $7),
               null, $14, $15) returning id::text`,
      [numero, x.city, x.id, userId, f.day, m, x.tz, Math.min(600, Math.max(15, s.dur)), nota, JSON.stringify(det), Math.min(500, Math.max(1, people)), tot, enApp ? "app" : "local", f.clave, entorno !== "produccion"])).rows[0]!.id;
    if (run && !(await tomarAsientos(c, op, run, calc.seats))) { await c.query("rollback"); if (retenido) { await pasarela.liberar(retenido).catch(() => undefined); retenido = null; } return no("Ya no quedan tantos asientos en esa salida. Elige otra.", "Not enough seats left on that departure. Pick another.", { salida: true }); }
    await c.query(`insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct, options) values ($1, $2, $3::jsonb, $4, $5, $6, 0, '[]'::jsonb)`,
      [op, s.id, JSON.stringify(s.name), Math.max(1, calc.seats || 1), s.cents, tot]);
    if (ret?.ok) await registrarRetencion(c, { opId: op, userId, negocio: x.id, city: x.city, total: tot, comision: fee, r: ret, pm: f.pm ?? undefined, kind: "full" });
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

/* ── Leer y avisar ── */
type Op = { id: string; num: string; biz: string; negocio: string; uid: string; cliente: string; status: string; detail: string | null; ymd: string; m: number; tz: string;
  det: Record<string, unknown>; tot: number; pay: string | null; pid: string | null; amount: number | null; refunded: number | null; hours_to: number; past: boolean };
const SEL = `select o.id::text, o.number as num, o.business_id as biz, b.name as negocio, o.user_id::text as uid, coalesce(nullif(u.first_name, ''), 'Cliente') as cliente, o.status, o.status_detail as detail,
                    (o.scheduled_at at time zone c.timezone)::date::text as ymd, (extract(hour from o.scheduled_at at time zone c.timezone) * 60 + extract(minute from o.scheduled_at at time zone c.timezone))::int as m,
                    c.timezone as tz, o.details as det, o.total_cents as tot, o.pay_status as pay, p.id::text as pid, p.amount_cents as amount, p.refunded_cents as refunded,
                    (extract(epoch from (o.scheduled_at - now())) / 3600)::float8 as hours_to, o.scheduled_at < now() as past
               from operations o join businesses b on b.id = o.business_id join cities c on c.id = o.city_id join users u on u.id = o.user_id
               left join payments p on p.operation_id = o.id and p.kind = 'full'`;
async function leer(c: Q, where: string, args: unknown[], lock = false): Promise<Op | null> {
  return (await c.query<Op>(`${SEL} where o.kind = 'trip' and ${where}${lock ? " for update of o" : ""}`, args)).rows[0] ?? null;
}
const diaL = (ymd: string) => { const d = new Date(`${ymd}T12:00:00Z`); return `${["dom", "lun", "mar", "mié", "jue", "vie", "sáb"][d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`; };
async function avisarCliente(numero: string, tpl: string, extra: Record<string, string> = {}) {
  const o = await leer(db(), "o.number = $1", [numero]);
  if (!o) return;
  const { avisar } = await import("./avisos");
  await avisar(o.uid, tpl, { negocio: o.negocio, dia: diaL(o.ymd), hora: horaL(o.m), total: money(o.tot), dev: "", ...extra }, { href: `/viaje/${numero}`, ref: ["trip", numero] });
}
async function avisarNeg(numero: string, tpl: string, extra: Record<string, string> = {}) {
  const o = await leer(db(), "o.number = $1", [numero]);
  if (!o) return;
  const { avisarNegocio } = await import("./avisos");
  const a = Number(o.det.adults ?? 1), k = Number(o.det.kids ?? 0);
  await avisarNegocio(o.biz, tpl, { cliente: o.cliente, dia: diaL(o.ymd), hora: horaL(o.m), servicio: (o.det.svc as Bi)?.es ?? "", personas: `${a + k} ${a + k === 1 ? "persona" : "personas"}`, dep: "", ...extra },
    { href: `/panel/${o.biz}/hoy?det=viaje:${numero}`, ref: ["trip", numero] });
}
export async function avisarViajeNuevo(numero: string) { await avisarNeg(numero, "biz_viaje"); }
async function ev(c: PoolClient, op: string, kind: string, actor: "user" | "member" | "system", actorId: string | null, note?: Bi) {
  await c.query(`insert into operation_events (operation_id, kind, actor, actor_id, note) values ($1::bigint, $2, $3, $4, $5::jsonb)`, [op, kind, actor, actorId, note ? JSON.stringify(note) : null]);
}
const ok1 = { ok: true as const };
type ResV = { ok: true } | { ok: false; msg: Bi };

/* ── El negocio responde: Confirmar · Otra salida · No hay cupo ── */
export async function responderViaje(negocio: string, numero: string, paso: "confirmar" | "otra" | "nopuedo", actorId: string, alt?: { run?: string; day?: string; m?: number }): Promise<ResV> {
  if (!NUM_V.test(numero)) return no("Ese viaje no existe.", "That trip does not exist.");
  await barrerViajes({ negocio, numero });
  let despues: (() => Promise<void>) | null = null;
  const r = await tx(async (c): Promise<ResV> => {
    const o = await leer(c, "o.business_id = $1 and o.number = $2", [negocio, numero], true);
    if (!o) return no("Ese viaje no existe.", "That trip does not exist.");
    if (o.status !== "pending") return no("Esta reserva ya cambió. Actualiza la pantalla.", "This booking already changed. Refresh the screen.");
    if (paso === "confirmar") {
      if (o.tot > 0 && o.pay && o.pay !== "held") return no("Lo retenido ya no está: usa «No hay cupo».", "The hold is gone: use “No room”.");
      await c.query(`update operations set status = 'confirmed', answered_at = now(), confirmed_at = now(), respond_by = null, updated_at = now() where id = $1::bigint`, [o.id]);
      await ev(c, o.id, "accepted", "member", actorId);
      despues = async () => { await cobrarOperacion(o.id); await avisarCliente(numero, "viaje_ok"); };
      return ok1;
    }
    if (paso === "nopuedo") {
      await soltarAsientos(c, o.id);
      await c.query(`update operations set status = 'declined', answered_at = now(), updated_at = now() where id = $1::bigint`, [o.id]);
      await ev(c, o.id, "declined", "member", actorId, { es: "No hay cupo", en: "No room" });
      despues = async () => { await liberarOperacion(o.id); await avisarCliente(numero, "viaje_no"); };
      return ok1;
    }
    // Otra salida: la ruta propone otra salida con asientos; el vehículo, otra hora o día.
    let prop: { run?: string; ymd: string; m: number };
    if (o.det.k === "asiento") {
      if (!alt?.run || !ID.test(alt.run)) return no("Elige la otra salida.", "Pick the other departure.");
      const seats = Number(o.det.adults ?? 0) + Number(o.det.kids ?? 0);
      const z = (await c.query<{ ymd: string; m: number; ok: boolean }>(
        `select (r.run_at at time zone $3)::date::text as ymd, (extract(hour from r.run_at at time zone $3) * 60 + extract(minute from r.run_at at time zone $3))::int as m,
                r.status = 'scheduled' and r.run_at > now() and r.seats_total - r.seats_outside - r.seats_booked >= $4 and r.id::text <> coalesce($5, '') as ok
           from trip_runs r where r.id = $1::bigint and r.business_id = $2 and r.item_id::text = $6`, [alt.run, negocio, o.tz, seats, o.det.run ?? null, String(o.det.svcId)])).rows[0];
      if (!z?.ok) return no("Esa salida no tiene cupo.", "That departure has no room.");
      prop = { run: alt.run, ymd: z.ymd, m: z.m };
    } else {
      if (!alt?.day || !/^\d{4}-\d{2}-\d{2}$/.test(alt.day) || !HORAS_PRIV.includes(Number(alt.m))) return no("Elige la otra hora.", "Pick the other time.");
      prop = { ymd: alt.day, m: Number(alt.m) };
    }
    await c.query(`insert into change_proposals (operation_id, kind, proposed, created_by, side, respond_by) values ($1::bigint, 'time', $2::jsonb, $3, 'business', least(now() + interval '24 hours', ($4::date + make_interval(mins => $5::int)) at time zone $6))`,
      [o.id, JSON.stringify(prop), actorId, prop.ymd, prop.m, o.tz]);
    await c.query(`update operations set status = 'change_proposed', answered_at = now(), respond_by = least(now() + interval '24 hours', scheduled_at), updated_at = now() where id = $1::bigint`, [o.id]);
    await ev(c, o.id, "change_proposed", "member", actorId, { es: `Propusiste ${diaL(prop.ymd)} a las ${horaL(prop.m)}`, en: `You proposed ${prop.ymd} at ${horaL(prop.m)}` });
    despues = async () => { await avisarCliente(numero, "viaje_alt", { alt: `${diaL(prop.ymd)} a las ${horaL(prop.m)}` }); };
    return ok1;
  });
  if (r.ok && despues) await (despues as () => Promise<void>)();
  return r;
}

/* ── El cliente: cancelar (24 h; después la mitad), aceptar la otra salida o «No me sirve» ── */
export async function viajeCliente(userId: string, numero: string, que: "cancelar" | "aceptar" | "nogracias"): Promise<ResV> {
  if (!NUM_V.test(numero)) return no("Ese viaje no existe.", "That trip does not exist.");
  await barrerViajes({ userId, numero });
  let despues: (() => Promise<void>) | null = null;
  const r = await tx(async (c): Promise<ResV> => {
    const o = await leer(c, "o.user_id = $1 and o.number = $2", [userId, numero], true);
    if (!o) return no("Ese viaje no existe.", "That trip does not exist.");
    const ya = no("Este viaje ya cambió. Actualiza la pantalla.", "This trip already changed. Refresh the screen.");
    if (que === "cancelar") {
      if (!["pending", "change_proposed", "confirmed"].includes(o.status) || o.detail === "camino") return ya;
      const conf = o.status === "confirmed", aTiempo = !conf || o.hours_to >= 24;
      // Tarde: se cobra la mitad (redondeo a favor del cliente: se queda con la mitad hacia abajo).
      const cobra = conf && !aTiempo && o.tot > 0 ? Math.floor(o.tot / 2) : 0;
      await soltarAsientos(c, o.id);
      await c.query(`update change_proposals set status = 'declined', answered_at = now() where operation_id = $1::bigint and status = 'open'`, [o.id]);
      await c.query(`update operations set status = 'cancelled', cancelled_by = 'user', cancelled_at = now(), cancel_reason = $2, details = details || $3::jsonb, updated_at = now() where id = $1::bigint`,
        [o.id, conf ? (aTiempo ? "a_tiempo" : "tarde") : "solicitud", JSON.stringify({ cobroMitad: cobra })]);
      await ev(c, o.id, "cancelled", "user", userId, cobra ? { es: `Canceló a menos de 24 h: se cobra la mitad (${money(cobra)})`, en: `Cancelled less than 24 h before: half is charged (${money(cobra)})` } : undefined);
      despues = async () => {
        if (!conf || (aTiempo && o.pay === "held")) await liberarOperacion(o.id);
        else {
          if (o.pay === "held") await cobrarOperacion(o.id); // confirmado sin capturar todavía: se cobra y se devuelve lo que toca
          const p = (await db().query<{ id: string; amount: number; refunded: number; status: string }>(`select id::text, amount_cents as amount, refunded_cents as refunded, status from payments where operation_id = $1::bigint and kind = 'full'`, [o.id])).rows[0];
          if (p && ["captured", "partially_refunded"].includes(p.status)) {
            const dev = aTiempo ? p.amount - p.refunded : Math.max(0, p.amount - cobra - p.refunded);
            if (dev > 0) await devolverPago({ paymentId: p.id, centavos: dev, por: "policy", actorId: userId, motivo: aTiempo ? "Cancelación a tiempo" : "Cancelación tarde: se cobra la mitad", idem: `vcx-${numero}` });
          }
        }
        await avisarCliente(numero, "viaje_cx", { dev: cobra ? ` Se cobró la mitad: ${money(cobra)}.` : o.tot ? " Te devolvemos todo." : "" });
        await avisarNeg(numero, "biz_viaje_cx", { dep: cobra ? ` Se cobró la mitad: ${money(cobra)}.` : "" });
      };
      return ok1;
    }
    if (o.status !== "change_proposed") return ya;
    const p = (await c.query<{ id: string; run: string | null; ymd: string; m: number }>(`select id::text, proposed->>'run' as run, proposed->>'ymd' as ymd, (proposed->>'m')::int as m from change_proposals where operation_id = $1::bigint and side = 'business' and status = 'open' order by id desc limit 1`, [o.id])).rows[0];
    if (!p) return ya;
    if (que === "nogracias") {
      await soltarAsientos(c, o.id);
      await c.query(`update change_proposals set status = 'declined', answered_at = now() where id = $1`, [p.id]);
      await c.query(`update operations set status = 'cancelled', cancelled_by = 'user', cancelled_at = now(), cancel_reason = 'alt_no', updated_at = now() where id = $1::bigint`, [o.id]);
      await ev(c, o.id, "alt_declined", "user", userId);
      despues = async () => { await liberarOperacion(o.id); };
      return ok1;
    }
    if (o.tot > 0 && o.pay !== "held") return no("Lo retenido ya no está. Elige «No me sirve» y reserva otra vez.", "The hold is gone. Choose “Doesn’t work” and book again.");
    if (p.run) {
      const seats = Number(o.det.adults ?? 0) + Number(o.det.kids ?? 0);
      await soltarAsientos(c, o.id);
      if (!(await tomarAsientos(c, o.id, p.run, seats))) return no("Esa salida ya se llenó. Elige «No me sirve».", "That departure filled up. Choose “Doesn’t work”.");
    }
    await c.query(`update operations set status = 'confirmed', scheduled_at = ($2::date + make_interval(mins => $3::int)) at time zone $4, details = case when $5::text is null then details else jsonb_set(details, '{run}', to_jsonb($5::text)) end,
                     confirmed_at = now(), respond_by = null, updated_at = now() where id = $1::bigint`, [o.id, p.ymd, p.m, o.tz, p.run]);
    await c.query(`update change_proposals set status = 'accepted', answered_at = now() where id = $1`, [p.id]);
    await ev(c, o.id, "alt_accepted", "user", userId);
    despues = async () => { await cobrarOperacion(o.id); await avisarNeg(numero, "biz_viaje_alt_ok"); };
    return ok1;
  });
  if (r.ok && despues) await (despues as () => Promise<void>)();
  return r;
}

/* ── La salida (Panel › Hoy › Salidas): va tarde · salió · llegó · el negocio la cancela (devolución completa a todos) ── */
export async function pasoSalida(negocio: string, run: string, paso: "tarde" | "salio" | "llego", actorId: string, min?: number): Promise<ResV> {
  if (!ID.test(run)) return no("Esa salida no existe.", "That departure does not exist.");
  let despues: (() => Promise<void>) | null = null;
  const r = await tx(async (c): Promise<ResV> => {
    await c.query(`select pg_advisory_xact_lock(hashtext('salida:' || $1))`, [run]);
    const R = (await c.query<{ st: string; at: string; tz: string; dep: string | null }>(`select r.status as st, r.run_at::text as at, ci.timezone as tz, r.departed_at::text as dep from trip_runs r join cities ci on ci.id = r.city_id where r.id = $1::bigint and r.business_id = $2 for update`, [run, negocio])).rows[0];
    if (!R) return no("Esa salida no existe.", "That departure does not exist.");
    const ops = (await c.query<{ id: string; num: string }>(`select o.id::text, o.number as num from run_seats s join operations o on o.id = s.operation_id where s.run_id = $1::bigint and s.status in ('held', 'boarded', 'noshow') and o.status = 'confirmed'`, [run])).rows;
    if (paso === "tarde") {
      const n = [10, 15, 20, 30, 45, 60].includes(Number(min)) ? Number(min) : 15;
      if (R.st !== "scheduled") return no("Esa salida ya cambió.", "That departure already changed.");
      await c.query(`update trip_runs set late_until = run_at + make_interval(mins => $2::int), updated_at = now() where id = $1::bigint`, [run, n]);
      const nueva = (await c.query<{ m: number }>(`select (extract(hour from (run_at + make_interval(mins => $2::int)) at time zone $3) * 60 + extract(minute from (run_at + make_interval(mins => $2::int)) at time zone $3))::int as m from trip_runs where id = $1::bigint`, [run, n, R.tz])).rows[0]!.m;
      for (const o of ops) await ev(c, o.id, "run_late", "member", actorId, { es: `La salida va tarde: sale a las ${horaL(nueva)}`, en: `The departure is late: leaves at ${horaL(nueva)}` });
      despues = async () => { for (const o of ops) await avisarCliente(o.num, "viaje_tarde", { nueva: horaL(nueva) }); };
      return ok1;
    }
    if (paso === "salio") {
      if (R.st !== "scheduled") return no("Esa salida ya cambió.", "That departure already changed.");
      await c.query(`update trip_runs set status = 'departed', departed_at = now(), updated_at = now() where id = $1::bigint`, [run]);
      for (const o of ops) { await c.query(`update operations set status_detail = 'camino', updated_at = now() where id = $1::bigint`, [o.id]); await ev(c, o.id, "run_departed", "member", actorId); }
      despues = async () => { for (const o of ops) await avisarCliente(o.num, "viaje_salio"); };
      return ok1;
    }
    if (R.st !== "departed") return no("Primero marca «Salió».", "Mark “Left” first.");
    await c.query(`update trip_runs set status = 'arrived', arrived_at = now(), updated_at = now() where id = $1::bigint`, [run]);
    for (const o of ops) { await c.query(`update operations set status = 'done', status_detail = 'llego', done_at = now(), updated_at = now() where id = $1::bigint`, [o.id]); await ev(c, o.id, "run_arrived", "member", actorId); }
    despues = async () => { for (const o of ops) await avisarCliente(o.num, "viaje_llego"); };
    return ok1;
  });
  if (r.ok && despues) await (despues as () => Promise<void>)();
  return r;
}
export async function cancelarSalida(negocio: string, run: string, motivo: string, actorId: string): Promise<ResV & { n?: number }> {
  const mot = String(motivo ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, 200);
  if (!ID.test(run)) return no("Esa salida no existe.", "That departure does not exist.");
  if (mot.length < 4) return no("Escribe el motivo: los pasajeros lo ven.", "Write the reason: passengers see it.");
  let ops: { id: string; num: string; pay: string | null }[] = [];
  const r = await tx(async (c): Promise<ResV> => {
    await c.query(`select pg_advisory_xact_lock(hashtext('salida:' || $1))`, [run]);
    const R = (await c.query<{ st: string; futura: boolean }>(`select status as st, run_at > now() - interval '2 hours' as futura from trip_runs where id = $1::bigint and business_id = $2 for update`, [run, negocio])).rows[0];
    if (!R || R.st !== "scheduled" || !R.futura) return no("Esa salida ya cambió.", "That departure already changed.");
    ops = (await c.query<{ id: string; num: string; pay: string | null }>(
      `select o.id::text, o.number as num, o.pay_status as pay from run_seats s join operations o on o.id = s.operation_id where s.run_id = $1::bigint and s.status in ('held', 'boarded', 'noshow') and o.status in ('pending', 'change_proposed', 'confirmed') for update of o`, [run])).rows;
    for (const o of ops) {
      await c.query(`update run_seats set status = 'cancelled', updated_at = now() where operation_id = $1::bigint and run_id = $2::bigint`, [o.id, run]);
      await c.query(`update operations set status = 'cancelled', cancelled_by = 'business', cancelled_at = now(), cancel_reason = 'salida', details = details || $2::jsonb, updated_at = now() where id = $1::bigint`, [o.id, JSON.stringify({ motivoNeg: mot })]);
      await c.query(`update change_proposals set status = 'declined', answered_at = now() where operation_id = $1::bigint and status = 'open'`, [o.id]);
      await ev(c, o.id, "run_cancelled", "member", actorId, { es: `El negocio canceló la salida: ${mot}`, en: `The business cancelled the departure: ${mot}` });
    }
    await c.query(`update trip_runs set status = 'cancelled', cancel_reason = $2, seats_booked = 0, updated_at = now() where id = $1::bigint`, [run, mot]);
    return ok1;
  });
  if (!r.ok) return r;
  for (const o of ops) {
    if (o.pay === "held") await liberarOperacion(o.id);
    else if (o.pay === "captured" || o.pay === "partially_refunded") {
      const p = (await db().query<{ id: string; amount: number; refunded: number }>(`select id::text, amount_cents as amount, refunded_cents as refunded from payments where operation_id = $1::bigint and kind = 'full'`, [o.id])).rows[0];
      if (p && p.amount > p.refunded) await devolverPago({ paymentId: p.id, centavos: p.amount - p.refunded, por: "business", actorId, motivo: "El negocio canceló la salida", idem: `vsx-${o.num}` });
    }
    await avisarCliente(o.num, "viaje_cancelada", { motivo: mot });
  }
  return { ok: true, n: ops.length };
}
/* Abordó / No llegó (por pasajero; el cobro no cambia). */
export async function abordo(negocio: string, numero: string, si: boolean, actorId: string): Promise<ResV> {
  if (!NUM_V.test(numero)) return no("Ese viaje no existe.", "That trip does not exist.");
  return tx(async (c): Promise<ResV> => {
    const o = await leer(c, "o.business_id = $1 and o.number = $2", [negocio, numero], true);
    if (!o || o.status !== "confirmed" || !o.det.run) return no("Este viaje ya cambió.", "This trip already changed.");
    await c.query(`update run_seats set status = $3, updated_at = now() where operation_id = $1::bigint and run_id = $2::bigint and status in ('held', 'boarded', 'noshow')`, [o.id, o.det.run, si ? "boarded" : "noshow"]);
    await ev(c, o.id, si ? "boarded" : "noshow", "member", actorId);
    return ok1;
  });
}
/* Vehículo completo: salió · llegó (por viaje). */
export async function pasoViaje(negocio: string, numero: string, paso: "salio" | "llego", actorId: string): Promise<ResV> {
  if (!NUM_V.test(numero)) return no("Ese viaje no existe.", "That trip does not exist.");
  let despues: (() => Promise<void>) | null = null;
  const r = await tx(async (c): Promise<ResV> => {
    const o = await leer(c, "o.business_id = $1 and o.number = $2", [negocio, numero], true);
    if (!o || o.status !== "confirmed" || o.det.k !== "priv") return no("Este viaje ya cambió.", "This trip already changed.");
    if (paso === "salio") {
      if (o.detail === "camino") return no("Ya salió.", "Already left.");
      await c.query(`update operations set status_detail = 'camino', updated_at = now() where id = $1::bigint`, [o.id]); await ev(c, o.id, "run_departed", "member", actorId);
      despues = async () => { await avisarCliente(numero, "viaje_salio"); }; return ok1;
    }
    if (o.detail !== "camino") return no("Primero marca «Salió».", "Mark “Left” first.");
    await c.query(`update operations set status = 'done', status_detail = 'llego', done_at = now(), updated_at = now() where id = $1::bigint`, [o.id]); await ev(c, o.id, "run_arrived", "member", actorId);
    despues = async () => { await avisarCliente(numero, "viaje_llego"); }; return ok1;
  });
  if (r.ok && despues) await (despues as () => Promise<void>)();
  return r;
}

/* ── El barrido: vence lo pendiente, la otra salida sin respuesta. Idempotente. ── */
export async function barrerViajes(f: { negocio?: string; userId?: string; numero?: string } = {}) {
  const w: string[] = [], a: unknown[] = [];
  if (f.negocio) { a.push(f.negocio); w.push(`o.business_id = $${a.length}`); }
  if (f.userId) { a.push(f.userId); w.push(`o.user_id = $${a.length}::uuid`); }
  if (f.numero) { a.push(f.numero); w.push(`o.number = $${a.length}`); }
  const y = w.length ? ` and ${w.join(" and ")}` : "";
  const L = (await db().query<{ id: string; num: string; st: string }>(
    `select o.id::text, o.number as num, o.status as st from operations o where o.kind = 'trip' and o.status in ('pending', 'change_proposed') and o.respond_by < now()${y} limit 50`, a)).rows;
  for (const v of L) {
    const hecho = await tx(async (c) => {
      const o = (await c.query<{ st: string }>(`select status as st from operations where id = $1::bigint for update`, [v.id])).rows[0];
      if (!o || o.st !== v.st) return false;
      await soltarAsientos(c, v.id);
      if (v.st === "pending") await c.query(`update operations set status = 'expired', status_detail = 'sin_respuesta', updated_at = now() where id = $1::bigint`, [v.id]);
      else { await c.query(`update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now(), cancel_reason = 'alt_vencida', updated_at = now() where id = $1::bigint`, [v.id]); await c.query(`update change_proposals set status = 'expired', answered_at = now() where operation_id = $1::bigint and status = 'open'`, [v.id]); }
      await ev(c, v.id, v.st === "pending" ? "expired" : "cancelled", "system", null, v.st === "pending" ? { es: "No contestaron a tiempo", en: "No reply in time" } : { es: "No respondió a la otra salida", en: "No answer to the other departure" });
      return true;
    });
    if (!hecho) continue;
    await liberarOperacion(v.id);
    if (v.st === "pending") await avisarCliente(v.num, "viaje_exp");
  }
}

/* ── El viaje del cliente (APP-NEG-TRANS-ESTADO) ── */
export type ViajeVista = {
  numero: string; status: string; detalle: string | null; negocio: { id: string; nombre: string; telefono: string | null; direccion: string | null }; svc: Bi; svcId: string; k: string;
  ymd: string; m: number; adults: number; kids: number; childSeat: boolean; bagsIncl: number; bagsExtra: number; inc: Bi[]; from: Bi | null; to: Bi | null; pickup: string | null;
  tot: number; pago: { st: string | null; devuelto: number; marca: string | null; l4: string | null }; horasFaltan: number; cobroMitad: number; motivoNeg: string | null;
  alt: { ymd: string; m: number } | null; tarde: number | null; linea: { at: number; kind: string; note: Bi | null }[];
};
export async function viajeVista(userId: string, numero: string): Promise<ViajeVista | null> {
  if (!NUM_V.test(numero)) return null;
  await barrerViajes({ userId, numero });
  const o = await leer(db(), "o.user_id = $1 and o.number = $2", [userId, numero]);
  if (!o) return null;
  const [B, P, E, R] = await Promise.all([
    db().query<{ phone: string | null; address: string | null; marca: string | null; l4: string | null }>(`select b.phone, b.address, p.card_brand as marca, p.card_last4 as l4 from businesses b left join payments p on p.operation_id = $2::bigint and p.kind = 'full' where b.id = $1`, [o.biz, o.id]),
    db().query<{ ymd: string; m: number }>(`select proposed->>'ymd' as ymd, (proposed->>'m')::int as m from change_proposals where operation_id = $1::bigint and side = 'business' and status = 'open' order by id desc limit 1`, [o.id]),
    db().query<{ at: number; kind: string; note: Bi | null }>(`select (extract(epoch from at) * 1000)::float8 as at, kind, note from operation_events where operation_id = $1::bigint order by id`, [o.id]),
    o.det.run ? db().query<{ m: number | null }>(`select case when late_until is null then null else (extract(hour from late_until at time zone $2) * 60 + extract(minute from late_until at time zone $2))::int end as m from trip_runs where id = $1::bigint`, [String(o.det.run), o.tz]) : Promise.resolve({ rows: [] as { m: number | null }[] }),
  ]);
  const d = o.det, b = B.rows[0];
  return {
    numero, status: o.status, detalle: o.detail, negocio: { id: o.biz, nombre: o.negocio, telefono: b?.phone ?? null, direccion: b?.address ?? null }, svc: d.svc as Bi, svcId: String(d.svcId ?? ""), k: String(d.k),
    ymd: o.ymd, m: o.m, adults: Number(d.adults ?? 1), kids: Number(d.kids ?? 0), childSeat: !!d.childSeat, bagsIncl: Number(d.bagsIncl ?? 0), bagsExtra: Number(d.bagsExtra ?? 0),
    inc: (d.inc as Bi[] | undefined) ?? [], from: (d.from as Bi | null) ?? null, to: (d.to as Bi | null) ?? null, pickup: (d.pickup as { t: string } | null)?.t ?? null,
    tot: o.tot, pago: { st: o.pay, devuelto: o.refunded ?? 0, marca: b?.marca ?? null, l4: b?.l4 ?? null }, horasFaltan: o.hours_to, cobroMitad: Number(d.cobroMitad ?? 0), motivoNeg: (d.motivoNeg as string | undefined) ?? null,
    alt: P.rows[0] ?? null, tarde: R.rows[0]?.m ?? null, linea: E.rows,
  };
}

/* ── El panel: Hoy › Salidas y los que esperan respuesta ── */
export type FilaViaje = { numero: string; st: string; who: string; svc: Bi; k: string; ymd: string; m: number; adults: number; kids: number; childSeat: boolean; bagsExtra: number; tot: number; resp: number | null; detalle: string | null; run: string | null; abordo: string | null };
export type SalidaPanel = { run: string; svc: Bi; ymd: string; m: number; total: number; fuera: number; booked: number; st: string; tarde: number | null; pasajeros: FilaViaje[] };
export async function viajesHoy(negocio: string): Promise<{ esperan: FilaViaje[]; salidas: SalidaPanel[]; privados: FilaViaje[] }> {
  await barrerViajes({ negocio });
  const L = (await db().query<FilaViaje>(
    `select o.number as numero, o.status as st, coalesce(nullif(u.first_name, ''), 'Cliente') || coalesce(' ' || left(nullif(u.last_name, ''), 1) || '.', '') as who, o.details->'svc' as svc, o.details->>'k' as k,
            (o.scheduled_at at time zone c.timezone)::date::text as ymd, (extract(hour from o.scheduled_at at time zone c.timezone) * 60 + extract(minute from o.scheduled_at at time zone c.timezone))::int as m,
            coalesce((o.details->>'adults')::int, 1) as adults, coalesce((o.details->>'kids')::int, 0) as kids, coalesce((o.details->>'childSeat')::boolean, false) as "childSeat",
            coalesce((o.details->>'bagsExtra')::int, 0) as "bagsExtra", o.total_cents as tot, (extract(epoch from o.respond_by) * 1000)::float8 as resp, o.status_detail as detalle, o.details->>'run' as run,
            (select s.status from run_seats s where s.operation_id = o.id and s.run_id::text = o.details->>'run') as abordo
       from operations o join users u on u.id = o.user_id join cities c on c.id = o.city_id
      where o.business_id = $1 and o.kind = 'trip' and (o.status in ('pending', 'change_proposed') or (o.status = 'confirmed' and o.scheduled_at < now() + interval '2 days'))
      order by o.scheduled_at limit 120`, [negocio])).rows;
  const runs = [...new Set(L.filter((x) => x.st === "confirmed" && x.run).map((x) => x.run!))];
  const R = runs.length ? (await db().query<Omit<SalidaPanel, "pasajeros">>(
    `select r.id::text as run, i.name as svc, (r.run_at at time zone c.timezone)::date::text as ymd, (extract(hour from r.run_at at time zone c.timezone) * 60 + extract(minute from r.run_at at time zone c.timezone))::int as m,
            r.seats_total as total, r.seats_outside as fuera, r.seats_booked as booked, r.status as st,
            case when r.late_until is null then null else (extract(hour from r.late_until at time zone c.timezone) * 60 + extract(minute from r.late_until at time zone c.timezone))::int end as tarde
       from trip_runs r join items i on i.id = r.item_id join cities c on c.id = r.city_id where r.id = any($1::bigint[]) order by r.run_at`, [runs])).rows : [];
  return { esperan: L.filter((x) => x.st === "pending" || x.st === "change_proposed"), salidas: R.map((r) => ({ ...r, pasajeros: L.filter((x) => x.st === "confirmed" && x.run === r.run) })),
    privados: L.filter((x) => x.st === "confirmed" && !x.run) };
}
export type ViajePanelV = FilaViaje & { pickup: string | null; nota: string | null; pay: string | null; alt: { ymd: string; m: number } | null; otras: { run: string; ymd: string; m: number; quedan: number }[]; eventos: { at: number; kind: string; note: Bi | null }[] };
export async function viajePanel(negocio: string, numero: string): Promise<ViajePanelV | null> {
  if (!NUM_V.test(numero)) return null;
  await barrerViajes({ negocio, numero });
  const o = await leer(db(), "o.business_id = $1 and o.number = $2", [negocio, numero]);
  if (!o) return null;
  const d = o.det;
  const [E, P, N] = await Promise.all([
    db().query<{ at: number; kind: string; note: Bi | null }>(`select (extract(epoch from at) * 1000)::float8 as at, kind, note from operation_events where operation_id = $1::bigint order by id`, [o.id]),
    db().query<{ ymd: string; m: number }>(`select proposed->>'ymd' as ymd, (proposed->>'m')::int as m from change_proposals where operation_id = $1::bigint and side = 'business' and status = 'open' order by id desc limit 1`, [o.id]),
    db().query<{ nota: string | null; resp: number | null }>(`select customer_note as nota, (extract(epoch from respond_by) * 1000)::float8 as resp from operations where id = $1::bigint`, [o.id]),
  ]);
  // Otras salidas con cupo de la misma ruta (hoy y los próximos días) para «Otra salida».
  const seats = Number(d.adults ?? 0) + Number(d.kids ?? 0);
  let otras: ViajePanelV["otras"] = [];
  if (d.k === "asiento") {
    const hoy = (await db().query<{ d: string }>(`select (now() at time zone $1)::date::text as d`, [o.tz])).rows[0]!.d;
    // Las 6 salidas con cupo más cercanas a la que pidió (antes o después), en orden.
    const t0 = (await db().query<{ d: number }>(`select ($1::date - $2::date)::int as d`, [o.ymd, hoy])).rows[0]!.d * 1440 + o.m;
    const cand: (ViajePanelV["otras"][number] & { t: number })[] = [];
    for (let i = 0; i < DIAS_VIAJE; i++) {
      const ymd = (await db().query<{ d: string }>(`select ($1::date + $2::int)::text as d`, [hoy, i])).rows[0]!.d;
      for (const r of await salidasDe(negocio, ymd)) if (r.item === String(d.svcId) && r.run !== d.run && r.futura && !r.cancelada && r.quedan >= seats) cand.push({ run: r.run, ymd, m: r.m, quedan: r.quedan, t: i * 1440 + r.m });
    }
    otras = cand.sort((a, z) => Math.abs(a.t - t0) - Math.abs(z.t - t0)).slice(0, 6).sort((a, z) => a.t - z.t).map(({ t: _t, ...r }) => r);
  }
  return { numero, st: o.status, who: o.cliente, svc: d.svc as Bi, k: String(d.k), ymd: o.ymd, m: o.m, adults: Number(d.adults ?? 1), kids: Number(d.kids ?? 0), childSeat: !!d.childSeat, bagsExtra: Number(d.bagsExtra ?? 0),
    tot: o.tot, resp: N.rows[0]?.resp ?? null, detalle: o.detail, run: (d.run as string | null) ?? null, abordo: null, pickup: (d.pickup as { t: string } | null)?.t ?? null, nota: N.rows[0]?.nota ?? null, pay: o.pay,
    alt: P.rows[0] ?? null, otras, eventos: E.rows };
}
