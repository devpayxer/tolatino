import "server-only";
import { diasEspeciales, rangosDia } from "./dias-especiales";
import type { PoolClient } from "pg";
import { db, tx, type AlGuardar } from "./db";
import { comision } from "./cobros";
import { pasarela } from "./pagos/pasarela";

/* Renta de herramienta (Fase 4 · bloque 4f-2). Diseño: neg-hogar-plan.js (rentForm / rentStatus) y la pestaña Tienda de la
   ficha (neg-hogar-book.js › V.shop).
   - Apartar: días (1, 2, 3 o la semana, que paga 5) + el día que pasa a recoger. Hoy no se cobra nada; baja una unidad y se
     guarda 48 horas desde el día de recoger. Pide sesión y una tarjeta guardada (se cobra al recoger, fuera de sesión).
   - La recogió (el negocio): se retiene el depósito y se cobra la renta, con la comisión «renta» y el resto al negocio. Si el
     banco no deja, no se cobra nada y se le pide cambiar la tarjeta.
   - «Un día más» (el cliente, mientras la tiene): se cobra un día y se corre la fecha de devolver.
   - La devolvió: si llegó tarde, cada día tarde se descuenta del depósito (hasta el depósito); el resto se libera.
   - Un daño: el negocio lo enseña con foto y monto (hasta lo que queda del depósito). El cliente acepta (se descuenta) o no
     (lo decide To'Latino; sin respuesta en 72 h, también). El depósito sigue retenido mientras tanto (se renueva).
   - El barrido (al abrir la renta o el panel): vencen los apartados de más de 48 h (vuelve la unidad), se avisa una vez cuando
     se pasa del día de devolver, se renuevan los depósitos de más de 6 días y 20 horas, y los daños sin respuesta suben.
   - 4y-4 · Vehículos (Transporte): antes de «La recogió», el negocio confirma que revisó la licencia y la edad (21+) y anota las
     millas al salir; al volver anota las millas (nunca menos). Las millas de más (sobre las incluidas por día) se descuentan del
     depósito por el camino del daño, con la foto del odómetro: el cliente la ve antes. */
type Bi = { es: string; en: string };
type Res<T = object> = ({ ok: true } & T) | { ok: false; msg: Bi; tarjeta?: boolean; enCamino?: boolean };
const no = (es: string, en: string, x: { tarjeta?: boolean } = {}): { ok: false; msg: Bi; tarjeta?: boolean } => ({ ok: false, msg: { es, en }, ...x });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, YMD = /^\d{4}-\d{2}-\d{2}$/, NUM = /^T-\d{1,10}$/, ID = /^\d{1,18}$/;
export const DIAS_RENTA = [1, 2, 3, 7] as const;
export const costoRenta = (precio: number, dias: number) => (dias >= 7 ? precio * 5 : precio * dias);
const money = (c: number) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;
const d2s = (d: Date) => d.toISOString().slice(0, 10);
const s2d = (s: string) => new Date(`${s}T12:00:00Z`);
const addD = (s: string, n: number) => { const d = s2d(s); d.setUTCDate(d.getUTCDate() + n); return d2s(d); };
const diasEntre = (a: string, b: string) => Math.round((s2d(b).getTime() - s2d(a).getTime()) / 86400000);
const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const diaCorto = (f: string) => { const d = s2d(f); return `${d.getUTCDate()} ${MES[d.getUTCMonth()]}`; };
const mins = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));

async function cuentaDe(c: PoolClient | ReturnType<typeof db>, negocio: string): Promise<string | null> {
  const a = (await c.query<{ acct: string }>(`select stripe_account_id as acct from stripe_accounts where business_id = $1 and charges_enabled`, [negocio])).rows[0]?.acct ?? null;
  const modo = pasarela.modo();
  return a && modo !== "apagado" && a.startsWith("acct_sim_") === (modo === "simulador") ? a : null;
}
const ahoraDe = async (city: string) => (await db().query<{ h: string; m: number }>(`select (now() at time zone timezone)::date::text as h, extract(hour from now() at time zone timezone)::int * 60 + extract(minute from now() at time zone timezone)::int as m from cities where id = $1`, [city])).rows[0]!;

/* ── La tienda en la ficha (por ahora, lo que se renta; lo que se vende llega con el apartado de Tiendas) ── */
export type ArticuloRenta = { id: string; n: Bi; d: Bi; precio: number; dep: number; foto: string | null; quedan: number;
  veh: { mpd: number | null; mi: number | null } | null }; // 4y-4: vehículo (licencia y 21+, millas incluidas por día y la milla de más)
export async function tiendaPublica(negocio: string): Promise<ArticuloRenta[]> {
  return (await db().query<ArticuloRenta>(
    `select i.id::text, i.name as n, i.descr as d, i.price_cents as precio, i.deposit_cents as dep, i.photos[1] as foto, greatest(i.stock_left, 0) as quedan,
            case when b.category_id = 'NEG-TRANS' then jsonb_build_object('mpd', (i.svc_attrs->>'mpd')::int, 'mi', (i.svc_attrs->>'mi')::int) end as veh
       from items i join businesses b on b.id = i.business_id
      where i.business_id = $1 and i.module = 'renta' and i.removed_at is null and i.sell and i.status = 'live' and b.status = 'active' and 'renta' = any(b.modules_on) and not (b.modules_off ? 'renta')
      order by i.sort, i.id limit 60`, [negocio])).rows.map((x) => ({ ...x, d: { es: x.d?.es ?? "", en: x.d?.en ?? "" } }));
}

/* ── 9n-16 · Lo que se renta, para el editor del panel: las unidades = las libres (stock_left) + las que la gente tiene apartadas o
   fuera (rentals vivas); el panel nunca deja bajar de esas. Vehículo (Transporte): millas incluidas por día y la milla de más. ── */
export type ArtPanel = { id: string; n: Bi; d: Bi; p: number; dep: number; libres: number; vivas: number; fotos: string[]; on: boolean; veh: boolean; mpd: number | null; mi: number | null };
export async function articulosRentaPanel(negocio: string): Promise<ArtPanel[]> {
  return (await db().query<ArtPanel>(
    `select i.id::text, i.name as n, coalesce(i.descr, '{}'::jsonb) as d, i.price_cents as p, i.deposit_cents as dep, greatest(i.stock_left, 0) as libres,
            (select count(*)::int from rentals r where r.item_id = i.id and r.status in ('held', 'out')) as vivas, coalesce(i.photos, '{}') as fotos, i.sell as on,
            b.category_id = 'NEG-TRANS' as veh, (i.svc_attrs->>'mpd')::int as mpd, (i.svc_attrs->>'mi')::int as mi
       from items i join businesses b on b.id = i.business_id
      where i.business_id = $1 and i.module = 'renta' and i.removed_at is null order by i.sort, i.id limit 60`, [negocio])).rows
    .map((x) => ({ ...x, d: { es: x.d?.es ?? "", en: x.d?.en ?? "" } }));
}

/* ── Opciones para apartar: el artículo, los días para recoger (hoy si sigue abierto, mañana y el sábado) ── */
export type DiaRecoger = { f: string; k: "hoy" | "man" | "dia"; a: string; z: string; h24: boolean };
export type OpcionesRenta = { art: ArticuloRenta; dias: DiaRecoger[]; tarjeta: boolean; negocio: { id: string; nombre: string; dir: string } };
export async function opcionesRenta(negocio: string, itemId: string): Promise<OpcionesRenta | null> {
  if (!ID.test(String(itemId))) return null;
  const art = (await tiendaPublica(negocio)).find((x) => x.id === itemId);
  if (!art) return null;
  const b = (await db().query<{ nombre: string; dir: string; city: string }>(`select name as nombre, coalesce(address, '') as dir, city_id as city from businesses where id = $1`, [negocio])).rows[0]!;
  const H = (await db().query<{ weekday: number; open: boolean; ranges: [string, string][] }>(`select weekday, open, ranges from business_hours where business_id = $1 and module = ''`, [negocio])).rows;
  const now = await ahoraDe(b.city), dias: DiaRecoger[] = [];
  const de = await diasEspeciales(db(), negocio, now.h, 8); // 9n-10 · feriados, días propios y temporada
  for (let i = 0; i < 8 && dias.length < 3; i++) {
    const f = addD(now.h, i), dow = s2d(f).getUTCDay(), rg = rangosDia(H, de, f);
    if (!rg.length) continue;
    const a = rg[0]![0], z = rg[rg.length - 1]![1], h24 = a === "00:00" && (z === "24:00" || z === "23:59" || z === "00:00");
    if (i === 0 && !h24 && now.m > mins(z === "00:00" ? "24:00" : z) - 30) continue; // hoy ya cierra
    const k: DiaRecoger["k"] = i === 0 ? "hoy" : i === 1 ? "man" : "dia";
    // Como el diseño: hoy, mañana y el sábado; si alguno no abre, el siguiente día que abre.
    if (k === "dia" && dow !== 6 && H.find((x) => x.weekday === 6)?.open && !dias.some((d) => s2d(d.f).getUTCDay() === 6)) continue;
    dias.push({ f, k, a, z, h24 });
  }
  return { art, dias, tarjeta: !!(await cuentaDe(db(), negocio)), negocio: { id: negocio, nombre: b.nombre, dir: b.dir } };
}

/* ── Apartar ── */
export type RentaIn = { negocio: string; item: string; dias: number; recoger: string; pm: string; clave: string };
export async function apartarRenta(userId: string, f: RentaIn, entorno: string): Promise<Res<{ numero: string }>> {
  if (!UUID.test(String(f?.clave)) || !ID.test(String(f?.item)) || !YMD.test(String(f?.recoger)) || typeof f.negocio !== "string") return no("Revisa tu renta y vuelve a intentarlo.", "Check your rental and try again.");
  const dias = Number(f.dias);
  if (!(DIAS_RENTA as readonly number[]).includes(dias)) return no("Elige cuántos días.", "Pick how many days.");
  if (!/^pm_[A-Za-z0-9_]{3,200}$/.test(String(f.pm))) return no("Elige la tarjeta.", "Choose the card.", { tarjeta: true });
  const o = await opcionesRenta(f.negocio, f.item);
  if (!o) return no("Ese artículo ya no se renta.", "That item is no longer for rent.");
  if (!o.tarjeta) return no("Este negocio todavía no renta en la app. Llámalo para apartarla.", "This business does not take rentals in the app yet. Call them to hold it.");
  if (!o.dias.some((d) => d.f === f.recoger)) return no("Elige uno de los días para recoger.", "Pick one of the pickup days.");
  let aviso: { art: string; nombre: string; cliente: string } | null = null;
  const r = await tx(async (c): Promise<Res<{ numero: string }>> => {
    const ya = (await c.query<{ number: string }>(`select number from operations where user_id = $1 and client_key = $2::uuid`, [userId, f.clave])).rows[0];
    if (ya) return { ok: true, numero: ya.number };
    const own = (await c.query(`select 1 from payment_methods where user_id = $1 and stripe_pm_id = $2 and status = 'active'`, [userId, f.pm])).rowCount;
    if (!own && pasarela.modo() !== "simulador") return no("Esa tarjeta no es tuya.", "That card is not yours.", { tarjeta: true });
    // La unidad se toma con el artículo bloqueado: dos personas a la vez por la última → una se la lleva.
    const it = (await c.query<{ n: Bi; p: number; dep: number; left: number; mode: string; city: string; tz: string; bname: string }>(
      `select i.name as n, i.price_cents as p, i.deposit_cents as dep, i.stock_left as left, i.stock_mode as mode, b.city_id as city, ci.timezone as tz, b.name as bname
         from items i join businesses b on b.id = i.business_id join cities ci on ci.id = b.city_id
        where i.id = $1::bigint and i.business_id = $2 and i.module = 'renta' and i.removed_at is null and i.sell and i.status = 'live' for update of i`, [f.item, f.negocio])).rows[0];
    if (!it) return no("Ese artículo ya no se renta.", "That item is no longer for rent.");
    if (it.mode === "qty" && it.left < 1) return no("Ya no quedan para rentar. Mira otro día o llama al negocio.", "None left to rent. Try another day or call the business.");
    if ((await c.query(`select 1 from rentals where user_id = $1 and item_id = $2::bigint and status in ('held', 'out')`, [userId, f.item])).rowCount) return no("Ya tienes esta herramienta apartada o rentada.", "You already have this tool on hold or rented.");
    if (it.mode === "qty") await c.query(`update items set stock_left = stock_left - 1, updated_at = now() where id = $1::bigint`, [f.item]);
    const cliente = (await c.query<{ n: string }>(`select coalesce(nullif(first_name, ''), 'Un cliente') as n from users where id = $1`, [userId])).rows[0]?.n ?? "Un cliente";
    const numero = `T-${(await c.query<{ n: string }>(`select nextval('rental_seq')::text as n`)).rows[0]!.n}`;
    const rent = costoRenta(it.p, dias), due = addD(f.recoger, dias);
    const det = { art: it.n, itemId: f.item, dias, recoger: f.recoger, devolver: due };
    const op = (await c.query<{ id: string }>(
      `insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, details, subtotal_cents, total_cents, deposit_cents, pay_mode, confirmed_at, answered_at, client_key, is_test)
       values ($1, 'rental', $2, $3, $4, 'confirmed', ($5::date)::timestamp at time zone $6, $7::jsonb, $8, $8, $9, 'app', now(), now(), $10::uuid, $11) returning id::text`,
      [numero, it.city, f.negocio, userId, f.recoger, it.tz, JSON.stringify(det), rent, it.dep, f.clave, entorno !== "produccion"])).rows[0]!.id;
    await c.query(
      `insert into rentals (operation_id, business_id, user_id, city_id, item_id, item_name, price_cents, deposit_cents, days, week, rent_cents, pick_on, due_on, expires_at, payment_method)
       values ($1::bigint, $2, $3, $4, $5::bigint, $6::jsonb, $7, $8, $9, $10, $11, $12::date, $13::date, (($12::date + 2)::timestamp at time zone $14), $15)`,
      [op, f.negocio, userId, it.city, f.item, JSON.stringify(it.n), it.p, it.dep, dias, dias >= 7, rent, f.recoger, due, it.tz, f.pm]);
    await c.query(`insert into operation_events (operation_id, kind, actor, actor_id, note) values ($1::bigint, 'sent', 'user', $2, $3::jsonb)`, [op, userId, JSON.stringify({ es: "Apartó la herramienta", en: "Put the tool on hold" })]);
    aviso = { art: it.n.es, nombre: it.bname, cliente };
    return { ok: true, numero };
  });
  if (r.ok && aviso) {
    const a = aviso as { art: string; nombre: string; cliente: string }, av = await import("./avisos");
    await av.avisar(userId, "renta_apartada", { articulo: a.art, negocio: a.nombre, dia: diaCorto(f.recoger) }, { href: `/renta/${r.numero}`, ref: ["renta", r.numero] });
    await av.avisarNegocio(f.negocio, "biz_renta", { cliente: a.cliente, que: `apartó para recoger el ${diaCorto(f.recoger)}`, articulo: a.art }, { href: `/panel/${f.negocio}/hoy?det=renta:${r.numero}`, ref: ["renta", r.numero] });
  }
  return r;
}

/* ── Lectura ── */
type Fila = { rid: string; op: string; numero: string; biz: string; uid: string; city: string; st: "held" | "out" | "back" | "cancelled" | "expired"; n: Bi; p: number; dep: number; dias: number; week: boolean; rent: number;
  pick: string; due: string; exp: string; pm: string; cardFailed: boolean; lateD: number; lateC: number; dmgC: number | null; dmgNota: string | null; dmgFoto: string | null; dmgSt: string | null; dmgAt: string | null;
  outAt: string | null; backAt: string | null; at: string; cxBy: string | null; foto: string | null; itemId: string; bname: string; dir: string; tel: string | null; close: string | null; cliente: string; tz: string;
  // 4y-4: vehículo (Transporte): millas incluidas por día, precio de la milla de más, licencia revisada y odómetro.
  vehiculo: boolean; mpd: number | null; mi: number | null; lic: boolean; odoOut: number | null; odoIn: number | null };
const SEL = `select r.id::text as rid, r.operation_id::text as op, o.number as numero, r.business_id as biz, r.user_id::text as uid, r.city_id as city, r.status as st, r.item_name as n, r.price_cents as p, r.deposit_cents as dep,
    r.days as dias, r.week, r.rent_cents as rent, r.pick_on::text as pick, r.due_on::text as due, r.expires_at as exp, r.payment_method as pm, r.card_failed as "cardFailed", r.late_days as "lateD", r.late_cents as "lateC",
    r.damage_cents as "dmgC", r.damage_note as "dmgNota", m.url as "dmgFoto", r.damage_status as "dmgSt", r.damage_asked_at as "dmgAt", r.out_at as "outAt", r.back_at as "backAt", r.created_at as at, r.cancelled_by as "cxBy",
    i.photos[1] as foto, r.item_id::text as "itemId", b.name as bname, coalesce(b.address, '') as dir, b.phone as tel, ci.timezone as tz,
    (select h.ranges->-1->>1 from business_hours h where h.business_id = r.business_id and h.module = '' and h.weekday = extract(dow from r.due_on)::int and h.open) as close,
    coalesce(nullif(u.first_name, ''), 'Cliente') || coalesce(' ' || left(nullif(u.last_name, ''), 1) || '.', '') as cliente,
    b.category_id = 'NEG-TRANS' as vehiculo, (i.svc_attrs->>'mpd')::int as mpd, (i.svc_attrs->>'mi')::int as mi, r.license_checked_at is not null as lic, r.odometer_out as "odoOut", r.odometer_in as "odoIn"
  from rentals r join operations o on o.id = r.operation_id join items i on i.id = r.item_id join businesses b on b.id = r.business_id join cities ci on ci.id = r.city_id join users u on u.id = r.user_id
  left join media m on m.id = r.damage_photo and m.status = 'visible'`;

export type DepositoSt = "recoger" | "retenido" | "liberado" | "descontado" | "parcial" | "no_retenido";
export type RentaVista = Omit<Fila, "rid" | "op" | "uid" | "city" | "pm" | "tz" | "exp" | "dmgAt"> & { tarjeta: string | null; depSt: DepositoSt; depCobrado: number; hoy: string; tardeHoy: number; vence: string; dmgEsperaH: number | null };

async function depositoDe(op: string): Promise<{ st: DepositoSt; cobrado: number }> {
  const P = (await db().query<{ status: string; amt: number; held: number | null }>(`select status, amount_cents as amt, held_cents as held from payments where operation_id = $1::bigint and kind = 'security' order by seq desc limit 1`, [op])).rows[0];
  if (!P) return { st: "recoger", cobrado: 0 };
  if (P.status === "held") return { st: "retenido", cobrado: 0 };
  if (P.status === "released") return { st: "liberado", cobrado: 0 };
  if (P.status === "failed") return { st: "no_retenido", cobrado: 0 };
  return { st: P.amt >= (P.held ?? P.amt) ? "descontado" : "parcial", cobrado: P.amt };
}
async function vista(x: Fila): Promise<RentaVista> {
  const t = (await db().query<{ marca: string; l4: string }>(`select brand as marca, last4 as l4 from payment_methods where stripe_pm_id = $1 limit 1`, [x.pm])).rows[0];
  const sim = /^pm_sim_(visa|mc|amex|disc)_(\d{4})/.exec(x.pm);
  const tarjeta = t ? `${t.marca.toUpperCase()} ·· ${t.l4}` : sim ? `${sim[1]!.toUpperCase()} ·· ${sim[2]}` : null;
  const d = await depositoDe(x.op), now = await ahoraDe(x.city);
  const tardeHoy = x.st === "out" ? Math.max(0, diasEntre(x.due, now.h)) : 0;
  const { rid: _r, op: _o, uid: _u, city: _c, pm: _p, tz: _t, exp, dmgAt, ...pub } = x;
  return { ...pub, tarjeta, depSt: d.st, depCobrado: d.cobrado, hoy: now.h, tardeHoy, vence: new Date(exp).toISOString(),
    dmgEsperaH: x.dmgSt === "asked" && dmgAt ? Math.max(0, 72 - Math.floor((Date.now() - new Date(dmgAt).getTime()) / 3600000)) : null };
}
export async function rentaVista(userId: string, numero: string): Promise<RentaVista | null> {
  if (!NUM.test(String(numero))) return null;
  await barrerRentas({ numero });
  const x = (await db().query<Fila>(`${SEL} where o.number = $1 and r.user_id = $2`, [numero, userId])).rows[0];
  return x ? vista(x) : null;
}
export async function rentaPanel(negocio: string, numero: string): Promise<RentaVista | null> {
  if (!NUM.test(String(numero))) return null;
  await barrerRentas({ numero });
  const x = (await db().query<Fila>(`${SEL} where o.number = $1 and r.business_id = $2`, [numero, negocio])).rows[0];
  return x ? vista(x) : null;
}
/* Las rentas del negocio para Hoy: apartadas, las que tienen fuera y las devueltas con algo pendiente o de los últimos 2 días. */
export type RentaFila = { numero: string; st: Fila["st"]; n: Bi; cliente: string; pick: string; due: string; tarde: number; dmgSt: string | null; cardFailed: boolean };
export async function rentasNegocio(negocio: string): Promise<RentaFila[]> {
  await barrerRentas({ negocio });
  const L = (await db().query<Fila>(`${SEL} where r.business_id = $1 and (r.status in ('held', 'out') or (r.status = 'back' and (r.damage_status in ('asked', 'disputed') or r.back_at > now() - interval '2 days')))
    order by case r.status when 'out' then 0 when 'held' then 1 else 2 end, r.due_on, r.pick_on limit 40`, [negocio])).rows;
  const out: RentaFila[] = [];
  for (const x of L) { const now = await ahoraDe(x.city); out.push({ numero: x.numero, st: x.st, n: x.n, cliente: x.cliente, pick: x.pick, due: x.due, tarde: x.st === "out" ? Math.max(0, diasEntre(x.due, now.h)) : 0, dmgSt: x.dmgSt, cardFailed: x.cardFailed }); }
  return out;
}
/* Mi cuenta: las rentas de la persona. */
export async function misRentas(userId: string): Promise<{ numero: string; st: Fila["st"]; n: Bi; negocio: string; due: string; pick: string; at: string }[]> {
  await barrerRentas({ userId });
  return (await db().query<{ numero: string; st: Fila["st"]; n: Bi; negocio: string; due: string; pick: string; at: string }>(
    `select o.number as numero, r.status as st, r.item_name as n, b.name as negocio, r.due_on::text as due, r.pick_on::text as pick, r.created_at as at
       from rentals r join operations o on o.id = r.operation_id join businesses b on b.id = r.business_id where r.user_id = $1 order by r.created_at desc limit 30`, [userId])).rows;
}

/* ── Dinero ── */
async function ev(c: PoolClient | ReturnType<typeof db>, op: string, kind: string, actor: "user" | "business" | "system" | "admin", actorId: string | null, note: Bi) {
  await c.query(`insert into operation_events (operation_id, kind, actor, actor_id, note) values ($1::bigint, $2, $3, $4, $5::jsonb)`, [op, kind, actor, actorId, JSON.stringify(note)]);
}
const seqDe = async (c: PoolClient | ReturnType<typeof db>, op: string, kind: string) => Number((await c.query<{ n: number }>(`select coalesce(max(seq), 0)::int + 1 as n from payments where operation_id = $1::bigint and kind = $2`, [op, kind])).rows[0]!.n);

/* ── 9t4 · Los cobros con la tarjeta guardada de una renta (al recoger, un día más, los días tarde), con su intención anotada antes (lib/cobro-fuera.ts).
   terminarCobroRenta: pasos 2 y 3, desde el toque o desde el barrido (barrerCobrosFuera). Sin respuesta de Stripe, el estado de la renta no cambia y quien
   tocó lee «quedó en camino, no lo repitas»; un «no» del banco deja la intención rechazada (el siguiente toque es otra llave). ── */
const CAMINO_OTRO: Bi = { es: "Hay otro cobro de esta renta en camino: se termina solo en unos minutos. Vuelve a intentarlo después.", en: "Another charge for this rental is on its way: it finishes by itself in a few minutes. Try again afterwards." };
const CAMINO_RENTA: Bi = { es: "Stripe no contestó. El cobro de la renta quedó en camino y se termina solo en unos minutos: no lo repitas. Te avisamos cuando se cobre.", en: "Stripe did not answer. The rental charge is on its way and finishes by itself in a few minutes: do not repeat it. We will let you know once it is charged." };
const CAMINO_DIA: Bi = { es: "Stripe no contestó. El cobro del día de más quedó en camino y se termina solo en unos minutos: no lo repitas.", en: "Stripe did not answer. The extra day charge is on its way and finishes by itself in a few minutes: do not repeat it." };
type Intencion = import("./cobro-fuera").Intencion;
const cobroEnCamino = async (rid: string) => !!(await db().query(`select 1 from offsession_charges where kind = 'renta' and ref_id = $1 and status = 'pending'`, [rid])).rowCount;
async function pagoRenta(c: PoolClient, a: Intencion, pi: string, marca: string | null, l4: string | null) {
  await c.query(`insert into payments (operation_id, user_id, business_id, city_id, kind, seq, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, card_brand, card_last4, captured_at, simulated, payment_method)
                 values ($1::bigint, $2, $3, $4, 'rental', $5, 'card', $6, $7, $7, $8, 'captured', $9, $10, now(), $11, $12) on conflict (stripe_payment_intent) do nothing`,
    [a.op, a.payer, a.negocio, a.ciudad, await seqDe(c, a.op!, "rental"), pi, a.monto, a.fee, marca, l4, pi.startsWith("pi_sim_"), a.pm]);
}
/* Un «no» del banco al recoger: la renta sigue apartada, se le pide a la persona cambiar la tarjeta. */
async function falloRecoger(x: Fila, m: Bi): Promise<{ ok: false; msg: Bi }> {
  await db().query(`update rentals set card_failed = true, updated_at = now() where id = $1::bigint`, [x.rid]);
  await ev(db(), x.op, "payment_failed", "system", null, { es: `El banco no dejó cobrar al recoger (${m.es})`, en: `Declined at pickup (${m.en})` });
  await (await import("./avisos")).avisar(x.uid, "renta_tarjeta", { articulo: x.n.es, negocio: x.bname }, { href: `/renta/${x.numero}`, ref: ["renta", x.numero] });
  return no(`La tarjeta de ${x.cliente} no pasó: no se cobró nada. Ya le pedimos cambiarla; cuando lo haga, te avisamos.`, `${x.cliente}'s card did not go through: nothing was charged. We asked them to change it and will let you know.`);
}
export async function terminarCobroRenta(a: Intencion, desdeBarrido = false): Promise<Res> {
  const CF = await import("./cobro-fuera");
  if (a.st === "failed") return no(CF.YA_RECHAZADO.es, CF.YA_RECHAZADO.en, { tarjeta: true });
  const x = (await db().query<Fila>(`${SEL} where r.id = $1::bigint`, [a.ref])).rows[0];
  if (!x) return no("Esa renta no existe.", "That rental does not exist.");
  const d = a.detalle as { que: "recoger" | "dia" | "tarde"; dias?: number; dep?: number; actor?: string; lic?: boolean; odo?: number | null };
  // 9t5 · Ya cobrado (hecho) y la renta TODAVÍA lo espera (sigue apartada al recoger, o con los mismos días en «un día más»): en el flujo normal no pasa
  // (el cierre y el cambio de la renta van en la misma transacción); si pasa (un arreglo a mano, un fallo) no se contesta «listo» en silencio ni se cobra
  // otra vez: el equipo de dinero decide (offsession_unapplied, una vez) y quien tocó lo lee. La renta no se cambia sola: no sabemos si se entregó.
  if (a.st === "done") {
    const espera = (d.que === "recoger" && x.st === "held") || (d.que === "dia" && x.st === "out" && x.dias === d.dias);
    if (!espera) return { ok: true };
    await CF.alertaSinAplicar(a, { es: `la renta ${x.numero} seguía esperando ese cobro (${x.st}) aunque ya estaba hecho.`, en: `rental ${x.numero} was still waiting for that charge (${x.st}) although it was already done.` });
    return no("Ese cobro ya se hizo y no se aplicó: lo revisa To'Latino. No lo repitas.", "That charge was already made and was not applied: To'Latino reviews it. Do not repeat it.");
  }
  const av = await import("./avisos"), hrefN = { href: `/panel/${x.biz}/hoy?det=renta:${x.numero}`, ref: ["renta", x.numero] as [string, string] }, hrefC = { href: `/renta/${x.numero}`, ref: ["renta", x.numero] as [string, string] };

  if (d.que === "recoger") {
    if (x.st !== "held") {
      // La renta ya no está apartada (venció, se canceló o ya salió): lo retenido se suelta y, si la renta se cobró, lo decide el equipo de dinero.
      const r = await CF.noAplica(a, "renta_no_apartada", { es: `la renta ${x.numero} ya no estaba apartada (${x.st}).`, en: `rental ${x.numero} was no longer on hold (${x.st}).` }, (c, h) => pagoRenta(c, a, h.pi, null, null));
      if (a.hold) await pasarela.liberar(a.hold).catch(() => undefined);
      return r ? { ok: true } : no("Ya no está apartada.", "It is no longer on hold.");
    }
    // 1. El depósito (retenido, sin comisión), con la llave de esta intención. 2. La renta (cobrada). Si la renta no pasa, se suelta el depósito.
    let hold: { pi: string; marca: string | null; ultimos4: string | null } | null = null;
    // 9t5 · Una intención de más de HORAS_LLAVE no vuelve a la pasarela con su llave, tampoco la del depósito (podría retenerlo dos veces): el depósito es
    // el que ya quedó anotado, si quedó; la renta se cierra con lo que contestó la consulta (terminarCobro).
    if (a.vieja) hold = a.hold ? { pi: a.hold, marca: null, ultimos4: null } : null;
    else if ((d.dep ?? 0) > 0) {
      const destino = a.destino!, cliente = await pasarela.cliente(x.uid).catch(() => null);
      const dep = await pasarela.retener({ centavos: d.dep!, comision: 0, destino, pm: a.pm, cliente, idem: `${a.idem}-dep`, meta: { rental: x.numero, business_id: x.biz, kind: "security" }, fuera: true })
        .catch(() => ({ ok: false as const, codigo: "error", mensaje: CF.EN_CAMINO }));
      if (!(dep.ok && dep.estado === "retenido")) {
        if (!dep.ok && CF.SIN_RESPUESTA.has(String(dep.codigo))) { await CF.anotarIntento(a.id, `deposito_${dep.codigo}`); return { ...no(CAMINO_RENTA.es, CAMINO_RENTA.en), enCamino: true }; }
        if (dep.ok) await pasarela.liberar(dep.pi).catch(() => undefined);
        // La renta nunca se mandó: la intención se suelta (nada salió).
        // Si ya se había mandado (otro toque o el barrido), la renta pudo salir: sigue en camino y la termina quien la mandó.
        if (!(await CF.soltarSinMandar(a.id, "deposito_rechazado"))) { await CF.anotarIntento(a.id, "deposito_rechazado"); return { ...no(CAMINO_RENTA.es, CAMINO_RENTA.en), enCamino: true }; }
        return falloRecoger(x, dep.ok ? { es: "pide verificación", en: "needs verification" } : dep.mensaje);
      }
      hold = dep;
      await CF.anotarRetencion(a.id, dep.pi);
    }
    let aplicado = false;
    const r = await CF.terminarCobro(a, async (c, h) => {
      const u = await c.query(`update rentals set status = 'out', out_at = now(), card_failed = false, updated_at = now(),
                               license_checked_by = case when $2 then $3::uuid else license_checked_by end, license_checked_at = case when $2 then now() else license_checked_at end, odometer_out = coalesce($4::int, odometer_out)
                               where id = $1::bigint and status = 'held'`, [x.rid, !!d.lic, d.actor ?? null, d.odo ?? null]);
      aplicado = !!u.rowCount;
      await pagoRenta(c, a, h.pi, h.marca, h.l4);
      if (!aplicado) { await ev(c, x.op, "payment_captured", "system", null, { es: `Renta de ${money(a.monto)} cobrada cuando ya no estaba apartada: lo revisa To'Latino`, en: `Rent of ${money(a.monto)} charged when it was no longer on hold: To'Latino reviews it` }); return; }
      if (hold) await c.query(`insert into payments (operation_id, user_id, business_id, city_id, kind, seq, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, card_brand, card_last4, held_at, simulated, payment_method)
                     values ($1::bigint, $2, $3, $4, 'security', $5, 'card', $6, $7, $7, 0, 'held', $8, $9, now(), $10, $11) on conflict (stripe_payment_intent) do nothing`,
        [x.op, x.uid, x.biz, x.city, await seqDe(c, x.op, "security"), hold.pi, d.dep, hold.marca, hold.ultimos4, hold.pi.startsWith("pi_sim_"), a.pm]);
      await c.query(`update operations set stage = 'picked_up', pay_status = $2, updated_at = now() where id = $1::bigint`, [x.op, hold ? "held" : "captured"]);
      await ev(c, x.op, "payment_captured", "business", d.actor ?? null, { es: `La recogió: renta ${money(a.monto)}${d.dep ? ` · depósito ${money(d.dep)} retenido` : ""}`, en: `Picked up: rent ${money(a.monto)}${d.dep ? ` · ${money(d.dep)} deposit held` : ""}` });
    });
    if (r.ok) {
      if (r.ya) return { ok: true };
      if (!aplicado) {
        if (hold) await pasarela.liberar(hold.pi).catch(() => undefined);
        await CF.alertaSinAplicar(a, { es: `la renta ${x.numero} dejó de estar apartada en ese momento${hold ? "; el depósito se soltó" : ""}.`, en: `rental ${x.numero} stopped being on hold at that moment${hold ? "; the deposit was released" : ""}.` });
        return no("Ya no está apartada.", "It is no longer on hold.");
      }
      await av.avisar(x.uid, "renta_recogida", { articulo: x.n.es, monto: money(a.monto), deposito: money(d.dep ?? 0), dia: diaCorto(x.due) }, hrefC);
      if (desdeBarrido) await av.avisarNegocio(x.biz, "biz_renta", { cliente: x.cliente, que: "la renta que quedó en camino ya se cobró · ya la tiene", articulo: x.n.es }, hrefN);
      return { ok: true };
    }
    if (r.enCamino) {
      // 9t5 · Nunca llegó a Stripe (la consulta): nada se cobró y el depósito se soltó; la renta sigue apartada y puede volver a tocarse «La recogió».
      // 9t6 · O el equipo decidió que ninguno de los cobros que halló Stripe vale (salió de más): se devuelve y no queda nada cobrado.
      if (r.noLlego && desdeBarrido) await av.avisarNegocio(x.biz, "biz_renta", { cliente: x.cliente, que: r.devuelto ? "el cobro que quedó en camino salió de más en Stripe y se devuelve · no quedó nada cobrado: vuelve a tocar «La recogió»"
        : "el cobro que quedó en camino nunca llegó a Stripe · no se cobró nada: vuelve a tocar «La recogió»", articulo: x.n.es }, hrefN);
      return { ...no(r.msg === CF.EN_CAMINO ? CAMINO_RENTA.es : r.msg.es, r.msg === CF.EN_CAMINO ? CAMINO_RENTA.en : r.msg.en), enCamino: true };
    }
    if (hold) await pasarela.liberar(hold.pi).catch(() => undefined);
    const f = await falloRecoger(x, r.msg);
    if (desdeBarrido) await av.avisarNegocio(x.biz, "biz_renta", { cliente: x.cliente, que: "la tarjeta no pasó al terminar el cobro en camino · no se cobró nada", articulo: x.n.es }, hrefN);
    return f;
  }

  if (d.que === "dia") {
    if (x.st !== "out" || x.dias !== d.dias) {
      const r = await CF.noAplica(a, "renta_cambio", { es: `la renta ${x.numero} ya no esperaba ese día de más (${x.st}, ${x.dias} días).`, en: `rental ${x.numero} no longer expected that extra day (${x.st}, ${x.dias} days).` }, (c, h) => pagoRenta(c, a, h.pi, null, null));
      return r ? { ok: true } : no("Solo mientras la tienes.", "Only while you have it.");
    }
    let aplicado = false;
    const r = await CF.terminarCobro(a, async (c, h) => {
      const u = await c.query(`update rentals set days = days + 1, due_on = due_on + 1, rent_cents = rent_cents + price_cents, late_noticed_on = null, updated_at = now() where id = $1::bigint and status = 'out' and days = $2`, [x.rid, d.dias]);
      aplicado = !!u.rowCount;
      await pagoRenta(c, a, h.pi, h.marca, h.l4);
      if (!aplicado) { await ev(c, x.op, "payment_captured", "system", null, { es: `Un día más de ${money(a.monto)} cobrado cuando la renta ya había cambiado: lo revisa To'Latino`, en: `Extra day of ${money(a.monto)} charged after the rental changed: To'Latino reviews it` }); return; }
      await c.query(`update operations set subtotal_cents = subtotal_cents + $2, total_cents = total_cents + $2, details = jsonb_set(jsonb_set(details, '{dias}', to_jsonb($3::int)), '{devolver}', to_jsonb($4::text)), updated_at = now() where id = $1::bigint`, [x.op, a.monto, d.dias! + 1, addD(x.due, 1)]);
      await ev(c, x.op, "payment_captured", "user", d.actor ?? null, { es: `Un día más: ${money(a.monto)}`, en: `One more day: ${money(a.monto)}` });
    });
    if (r.ok) {
      if (r.ya) return { ok: true };
      if (!aplicado) { await CF.alertaSinAplicar(a, { es: `la renta ${x.numero} cambió en ese momento.`, en: `rental ${x.numero} changed at that moment.` }); return no("Solo mientras la tienes.", "Only while you have it."); }
      await av.avisarNegocio(x.biz, "biz_renta", { cliente: x.cliente, que: `se la queda un día más · la devuelve el ${diaCorto(addD(x.due, 1))}`, articulo: x.n.es }, hrefN);
      return { ok: true };
    }
    if (r.enCamino) return { ...no(r.msg === CF.EN_CAMINO ? CAMINO_DIA.es : r.msg.es, r.msg === CF.EN_CAMINO ? CAMINO_DIA.en : r.msg.en), enCamino: true };
    await ev(db(), x.op, "payment_failed", "system", null, { es: `Un día más: el banco no dejó (${money(a.monto)})`, en: `One more day: declined (${money(a.monto)})` });
    return no(r.msg.es, r.msg.en, { tarjeta: true });
  }

  // Los días tarde (sin depósito): la renta ya volvió; el cierre anota lo cobrado.
  const r = await CF.terminarCobro(a, async (c, h) => {
    await pagoRenta(c, a, h.pi, h.marca, h.l4);
    await c.query(`update rentals set late_cents = $2, updated_at = now() where id = $1::bigint`, [x.rid, a.monto]);
    await ev(c, x.op, "payment_captured", "system", null, { es: `Días tarde: ${money(a.monto)}`, en: `Late days: ${money(a.monto)}` });
  });
  if (r.ok) {
    if (!r.ya && desdeBarrido) await av.avisar(x.uid, "renta_devuelta", { articulo: x.n.es, que: `Se cobraron ${money(a.monto)} por los días tarde.` }, hrefC);
    return { ok: true };
  }
  // 9t5 · Los días tarde que nunca llegaron a Stripe (la consulta): nadie más los vuelve a anotar; otra intención, con otra llave.
  if (r.enCamino && r.noLlego) return terminarCobroRenta(await CF.reanotar(a), desdeBarrido);
  if (r.enCamino) return { ...no(r.msg.es, r.msg.en), enCamino: true };
  await db().query(`update rentals set late_cents = 0, updated_at = now() where id = $1::bigint`, [x.rid]);
  await ev(db(), x.op, "payment_failed", "system", null, { es: `Días tarde sin cobrar (${money(a.monto)}): se arregla en el local`, en: `Late days not charged (${money(a.monto)}): settled in person` });
  if (desdeBarrido) await av.avisar(x.uid, "renta_devuelta", { articulo: x.n.es, que: `No se pudo cobrar ${money(a.monto)} por los días tarde: se arregla en el local.` }, hrefC);
  return no(r.msg.es, r.msg.en);
}

/* Lo que se descuenta del depósito al cerrar: los días tarde (hasta el depósito) y el daño si se aceptó o lo decidió To'Latino. */
async function liquidarDeposito(rid: string): Promise<void> {
  const x = (await db().query<{ op: string; numero: string; lateC: number; dmgC: number | null; dmgSt: string | null; st: string }>(
    `select r.operation_id::text as op, o.number as numero, r.late_cents as "lateC", r.damage_cents as "dmgC", r.damage_status as "dmgSt", r.status as st from rentals r join operations o on o.id = r.operation_id where r.id = $1::bigint`, [rid])).rows[0];
  if (!x || x.st !== "back" || x.dmgSt === "asked" || x.dmgSt === "disputed") return;
  const P = (await db().query<{ id: string; pi: string; held: number }>(`select id::text, stripe_payment_intent as pi, coalesce(held_cents, amount_cents) as held from payments where operation_id = $1::bigint and kind = 'security' and status = 'held' order by seq desc limit 1`, [x.op])).rows[0];
  if (!P) return;
  const objetivo = Math.min(P.held, x.lateC + (x.dmgSt === "accepted" || x.dmgSt === "charged" ? x.dmgC ?? 0 : 0));
  if (objetivo > 0) {
    const fee = Math.min(await comision(db(), "renta", Math.min(objetivo, x.lateC)), objetivo); // la comisión va sobre los días tarde (renta), no sobre el daño
    const r = await pasarela.cobrar(P.pi, objetivo, fee);
    if (!r.ok) return; // se reintenta en el próximo barrido
    // 25 nov · Ya capturado (reintento o respuesta perdida): se anota lo que Stripe capturó de verdad (r.cobrado), no lo pedido.
    const real = r.cobrado ?? objetivo;
    const tocada = await tx(async (c) => {
      const u = await c.query(`update payments set status = 'captured', amount_cents = $2, fee_cents = least($3::int, $2::int), captured_at = now(), updated_at = now() where id = $1::bigint and status = 'held'`, [P.id, real, fee]);
      if (!u.rowCount) return false;
      if (x.dmgSt === "accepted") await c.query(`update rentals set damage_status = 'charged', updated_at = now() where id = $1::bigint`, [rid]);
      await ev(c, x.op, "payment_captured", "system", null, { es: `Del depósito se descontaron ${money(real)}; el resto se liberó`, en: `${money(real)} taken from the deposit; the rest was released` });
      return true;
    });
    // 25 nov (revisión de 621f214) · Otro monto que el pedido (Stripe ya lo había capturado): el equipo de dinero lo sabe (dinero-alertas › alertarOtroMonto).
    if (tocada) await (await import("./dinero-alertas")).alertarOtroMontoPago(P.id, objetivo, r.cobrado);
  } else {
    // 25 nov (LAUNCH g) · Se mira lo que contestó: sin soltar (o ya cobrado en Stripe) no se marca liberado; se reintenta en el próximo barrido. Guardián liberarMira.
    if (!(await pasarela.liberar(P.pi)).ok) return;
    await tx(async (c) => {
      const u = await c.query(`update payments set status = 'released', released_at = now(), updated_at = now() where id = $1::bigint and status = 'held'`, [P.id]);
      if (u.rowCount) await ev(c, x.op, "payment_released", "system", null, { es: "Se liberó el depósito", en: "The deposit was released" });
    });
  }
  await db().query(`update operations set pay_status = (select case when bool_or(status = 'held') then 'held' when bool_or(status = 'captured') then 'captured' else 'released' end from payments where operation_id = $1::bigint) where id = $1::bigint`, [x.op]);
}

/* ── Lo que hace el cliente ── */
export type QueCliente = "cancelar" | "dia" | "tarjeta" | "dano_ok" | "dano_no";
/* 9t8 · clave: la del toque («Un día más»): la pantalla la crea una vez por intento y la cambia solo cuando el servidor contestó. El mismo toque repetido (la red
   se cortó con el día ya cobrado) devuelve lo que ya pasó con ESA clave y nunca es otro día; otro toque (otra clave) sí es otro día. */
export async function rentaCliente(userId: string, numero: string, que: QueCliente, pm?: string, clave?: string): Promise<Res> {
  if (!NUM.test(String(numero))) return no("Esa renta no existe.", "That rental does not exist.");
  const x = (await db().query<Fila>(`${SEL} where o.number = $1 and r.user_id = $2`, [numero, userId])).rows[0];
  if (!x) return no("Esa renta no existe.", "That rental does not exist.");
  const av = await import("./avisos"), href = { href: `/panel/${x.biz}/hoy?det=renta:${numero}`, ref: ["renta", numero] as [string, string] };
  if (que === "cancelar") {
    const ok = await tx(async (c) => {
      const u = await c.query(`update rentals set status = 'cancelled', cancelled_at = now(), cancelled_by = 'user', updated_at = now() where id = $1::bigint and status = 'held' and not exists (select 1 from offsession_charges q where q.kind = 'renta' and q.ref_id = rentals.id::text and q.status = 'pending')`, [x.rid]);
      if (!u.rowCount) return false;
      await c.query(`update items set stock_left = stock_left + 1, updated_at = now() where id = $1::bigint and stock_mode = 'qty'`, [x.itemId]);
      await c.query(`update operations set status = 'cancelled', cancelled_at = now(), cancelled_by = 'user', updated_at = now() where id = $1::bigint`, [x.op]);
      await ev(c, x.op, "cancelled", "user", userId, { es: "Ya no la necesita", en: "No longer needed" });
      return true;
    });
    if (!ok) return (await cobroEnCamino(x.rid)) ? no(CAMINO_OTRO.es, CAMINO_OTRO.en) : no("Ya la recogiste o ya no está apartada.", "You already picked it up or it is no longer on hold.");
    await av.avisarNegocio(x.biz, "biz_renta", { cliente: x.cliente, que: "ya no la necesita · volvió a la tienda", articulo: x.n.es }, href);
    return { ok: true };
  }
  if (que === "tarjeta") {
    if (!/^pm_[A-Za-z0-9_]{3,200}$/.test(String(pm))) return no("Elige la tarjeta.", "Choose the card.", { tarjeta: true });
    const own = (await db().query(`select 1 from payment_methods where user_id = $1 and stripe_pm_id = $2 and status = 'active'`, [userId, pm])).rowCount;
    if (!own && pasarela.modo() !== "simulador") return no("Esa tarjeta no es tuya.", "That card is not yours.", { tarjeta: true });
    const u = await db().query(`update rentals set payment_method = $2, card_failed = false, updated_at = now() where id = $1::bigint and status in ('held', 'out')`, [x.rid, pm]);
    if (!u.rowCount) return no("Esta renta ya cerró.", "This rental is closed.");
    if (x.cardFailed) await av.avisarNegocio(x.biz, "biz_renta", { cliente: x.cliente, que: "cambió la tarjeta · ya puedes entregarla", articulo: x.n.es }, href);
    return { ok: true };
  }
  if (que === "dia") {
    if (!UUID.test(String(clave ?? ""))) return no("Vuelve a intentarlo.", "Try again.");
    // 9t8 · Ya hubo un cobro con esta clave del toque: lo mismo otra vez, por el mismo cierre (hecho y aplicado → listo; en camino → se termina ESE; rechazado →
    // lo que dijo el banco). Nunca otro día.
    const CF = await import("./cobro-fuera");
    const toque = async () => (await db().query<{ id: string }>(`select id::text from offsession_charges where kind = 'renta' and ref_id = $1 and detail->>'toque' = $2`, [x.rid, clave])).rows[0];
    const ya = await toque();
    if (ya) return terminarCobroRenta((await CF.intencion(ya.id))!);
    if (x.st !== "out") return no("Solo mientras la tienes.", "Only while you have it.");
    const destino = await cuentaDe(db(), x.biz);
    if (!destino) return no("Llama al negocio para quedártela un día más.", "Call the business to keep it one more day.");
    const fee = Math.min(await comision(db(), "renta", x.p), x.p);
    // 9t4 · La intención antes de la pasarela (lib/cobro-fuera.ts): el día que se agrega (dia-N) se cobra una sola vez, y el mismo toque otra vez (o con
    // Stripe sin contestar) termina ESA intención con su llave, no otra.
    // La clave del toque va con la intención (la base no deja dos con la misma: offsession_charges_toque). Dos a la vez con la misma: la segunda lee la primera.
    const a = await CF.anotarCobro({ kind: "renta", ref: x.rid, para: `dia-${x.dias}`, op: x.op, negocio: x.biz, ciudad: x.city, payer: x.uid, monto: x.p, fee, destino, pm: x.pm,
      idem: (k) => `renta-${x.rid}-dia${x.dias}-i${k}`, detalle: { meta: { rental: numero, business_id: x.biz }, que: "dia", dias: x.dias, actor: userId, toque: clave } })
      .catch(async (e) => { const b = (e as { code?: string })?.code === "23505" ? await toque() : null; if (!b) throw e; return (await CF.intencion(b.id))!; });
    if (a.para !== `dia-${x.dias}`) { await terminarCobroRenta(a); return no(CAMINO_OTRO.es, CAMINO_OTRO.en); }
    return terminarCobroRenta(a);
  }
  if (que === "dano_ok" || que === "dano_no") {
    const u = await db().query(`update rentals set damage_status = $2, updated_at = now() where id = $1::bigint and damage_status = 'asked'`, [x.rid, que === "dano_ok" ? "accepted" : "disputed"]);
    if (!u.rowCount) return no("Eso ya se decidió.", "That was already decided.");
    if (que === "dano_no") await aCola(x.rid);
    await ev(db(), x.op, que === "dano_ok" ? "damage_accepted" : "damage_disputed", "user", userId, que === "dano_ok" ? { es: `Aceptó el daño de ${money(x.dmgC ?? 0)}`, en: `Accepted the ${money(x.dmgC ?? 0)} damage` } : { es: "No está de acuerdo con el daño: lo decide To'Latino", en: "Disagrees with the damage: To'Latino decides" });
    if (que === "dano_ok") await liquidarDeposito(x.rid);
    await av.avisarNegocio(x.biz, "biz_renta", { cliente: x.cliente, que: que === "dano_ok" ? `aceptó el daño · se descontaron ${money(x.dmgC ?? 0)}` : "no está de acuerdo con el daño · lo revisa To'Latino", articulo: x.n.es }, href);
    return { ok: true };
  }
  return no("Eso no se puede.", "That cannot be done.");
}

/* ── Lo que hace el negocio ── */
export type QueNegocio = { que: "recogio"; lic?: boolean; odo?: number } | { que: "devolvio"; odo?: number } | { que: "cancelar" } | { que: "dano"; cents: number; foto: string; nota: string; odo?: number };
const odoOk = (v: unknown) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 && n <= 2_000_000 ? n : null; };
export async function rentaNegocio(negocio: string, numero: string, a: QueNegocio, actorId: string, alGuardar?: AlGuardar): Promise<Res<{ aviso?: Bi }>> {
  if (!NUM.test(String(numero))) return no("Esa renta no existe.", "That rental does not exist.");
  const x = (await db().query<Fila>(`${SEL} where o.number = $1 and r.business_id = $2`, [numero, negocio])).rows[0];
  if (!x) return no("Esa renta no existe.", "That rental does not exist.");
  const av = await import("./avisos"), href = { href: `/renta/${numero}`, ref: ["renta", numero] as [string, string] };
  if (a.que === "cancelar") {
    const ok = await tx(async (c) => {
      const u = await c.query(`update rentals set status = 'cancelled', cancelled_at = now(), cancelled_by = 'business', updated_at = now() where id = $1::bigint and status = 'held' and not exists (select 1 from offsession_charges q where q.kind = 'renta' and q.ref_id = rentals.id::text and q.status = 'pending')`, [x.rid]);
      if (!u.rowCount) return false;
      await c.query(`update items set stock_left = stock_left + 1, updated_at = now() where id = $1::bigint and stock_mode = 'qty'`, [x.itemId]);
      await c.query(`update operations set status = 'cancelled', cancelled_at = now(), cancelled_by = 'business', updated_at = now() where id = $1::bigint`, [x.op]);
      await ev(c, x.op, "cancelled", "business", actorId, { es: "El negocio canceló el apartado", en: "The business cancelled the hold" });
      await alGuardar?.(c);
      return true;
    });
    if (!ok) return (await cobroEnCamino(x.rid)) ? no(CAMINO_OTRO.es, CAMINO_OTRO.en) : no("Ya no está apartada.", "It is no longer on hold.");
    await av.avisar(x.uid, "renta_devuelta", { articulo: x.n.es, que: `${x.bname} canceló el apartado. No se cobró nada.` }, href);
    return { ok: true };
  }
  if (a.que === "recogio") {
    if (x.st !== "held") return no("Ya no está apartada.", "It is no longer on hold.");
    // Vehículo: la licencia y la edad se revisan en persona; las millas al salir quedan anotadas (antes de cobrar nada).
    const odoOut = x.vehiculo && x.mpd ? odoOk(a.odo) : null;
    if (x.vehiculo && a.lic !== true) return no("Antes de entregarla, revisa la licencia y que tenga 21 años o más.", "Before handing it over, check the license and that they are 21 or older.");
    if (x.vehiculo && x.mpd && odoOut == null) return no("Anota las millas del odómetro al salir.", "Write down the odometer miles at pickup.");
    const destino = await cuentaDe(db(), negocio);
    if (!destino) return no("Tu cuenta de cobro no está lista: no se puede cobrar en la app.", "Your payout account is not ready: the app cannot charge.");
    // 9t4 · La intención del cobro de la renta ANTES de la pasarela (lib/cobro-fuera.ts), con la auditoría de quien tocó «La recogió» en su transacción y lo
    // que el cierre necesita (licencia, millas). El depósito va con la llave de ESTA intención: otro toque, o el barrido, retienen y cobran con las mismas
    // llaves (nunca dos depósitos ni dos rentas). Sin respuesta de Stripe, la renta sigue apartada y el cobro en camino.
    const fee = Math.min(await comision(db(), "renta", x.rent), x.rent);
    const ia = await (await import("./cobro-fuera")).anotarCobro({ kind: "renta", ref: x.rid, para: "recoger", op: x.op, negocio, ciudad: x.city, payer: x.uid, monto: x.rent, fee, destino, pm: x.pm,
      idem: (k) => `renta-${x.rid}-renta-i${k}`, detalle: { meta: { rental: numero, business_id: negocio }, que: "recoger", dep: x.dep, actor: actorId, lic: x.vehiculo, odo: odoOut } }, null, alGuardar);
    if (ia.para !== "recoger") { await terminarCobroRenta(ia); return no(CAMINO_OTRO.es, CAMINO_OTRO.en); }
    return terminarCobroRenta(ia);
  }
  if (a.que === "devolvio" || a.que === "dano") {
    if (x.st !== "out") return no("Todavía no la tiene o ya volvió.", "They do not have it yet or it is already back.");
    const odoIn = x.vehiculo && x.odoOut != null ? odoOk(a.odo) : null;
    if (x.vehiculo && x.odoOut != null && (odoIn == null || odoIn < x.odoOut)) return no(`Anota las millas al volver (desde ${x.odoOut.toLocaleString("en-US")}).`, `Write down the miles at return (from ${x.odoOut.toLocaleString("en-US")}).`);
    const now = await ahoraDe(x.city), tarde = Math.max(0, diasEntre(x.due, now.h)), lateC = Math.min(tarde * x.p, x.dep);
    let dano: { cents: number; foto: string; nota: string } | null = null;
    if (a.que === "dano") {
      if (!x.dep) return no("Sin depósito no se descuenta un daño en la app: arréglalo con el cliente en el local.", "With no deposit, damage is not deducted in the app: settle it with the customer in person.");
      const cents = Math.round(Number(a.cents)), max = x.dep - lateC, nota = String(a.nota ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
      if (!(cents >= 100 && cents <= max)) return no(`El daño va de $1 a ${money(max)} (lo que queda del depósito).`, `Damage goes from $1 to ${money(max)} (what is left of the deposit).`);
      if (!UUID.test(String(a.foto))) return no("El daño va con foto: el cliente la ve antes de que se descuente.", "Damage needs a photo: the customer sees it before it is deducted.");
      if (nota.length < 4) return no("Di qué se dañó.", "Say what was damaged.");
      // F3 · La foto la subió quien la manda (con destino «privado»: el cliente y el negocio la ven por /api/medios/privada, que da permiso desde
      // rentals.damage_photo), recién subida y sin usar en otro daño: nunca la foto de otra persona u otra operación.
      if (!(await db().query(`select 1 from media m where m.id = $1::uuid and m.status = 'visible' and m.uploaded_by = $2::uuid and m.owner_kind = 'user' and m.purged_at is null
                                and not exists (select 1 from rentals r where r.damage_photo = m.id)`, [a.foto, actorId])).rowCount) return no("Vuelve a subir la foto.", "Upload the photo again.");
      dano = { cents, foto: a.foto, nota };
    }
    // Sin depósito y tarde: los días tarde se cobran con la tarjeta. 9t4 · La intención entra en la MISMA transacción que la devolución (lib/cobro-fuera.ts):
    // si el proceso muere después, el barrido la termina con su llave; antes la llave era fija y sin tope de 23 h, y un «sin respuesta» quedaba como
    // «sin cobrar, se arregla en el local» aunque Stripe hubiera cobrado.
    const destinoT = !x.dep && tarde > 0 ? await cuentaDe(db(), negocio) : null, montoT = tarde * x.p, feeT = destinoT ? Math.min(await comision(db(), "renta", montoT), montoT) : 0;
    let tardeA: import("./cobro-fuera").Intencion | null = null;
    const ok = await tx(async (c) => {
      const u = await c.query(`update rentals set status = 'back', back_at = now(), late_days = $2, late_cents = $3, damage_cents = $4, damage_photo = $5::uuid, damage_note = $6, damage_status = $7, damage_asked_at = case when $7::text is null then null else now() end, odometer_in = coalesce($8::int, odometer_in), updated_at = now()
                               where id = $1::bigint and status = 'out'`, [x.rid, tarde, lateC, dano?.cents ?? null, dano?.foto ?? null, dano?.nota ?? null, dano ? "asked" : null, odoIn]);
      if (!u.rowCount) return false;
      await c.query(`update items set stock_left = stock_left + 1, updated_at = now() where id = $1::bigint and stock_mode = 'qty'`, [x.itemId]);
      await c.query(`update operations set status = 'done', done_at = now(), updated_at = now() where id = $1::bigint`, [x.op]);
      await ev(c, x.op, "returned", "business", actorId, { es: `La devolvió${tarde ? ` ${tarde} ${tarde === 1 ? "día" : "días"} tarde` : ""}${dano ? ` · daño de ${money(dano.cents)} enseñado con foto` : ""}`, en: `Returned${tarde ? ` ${tarde} ${tarde === 1 ? "day" : "days"} late` : ""}${dano ? ` · ${money(dano.cents)} damage shown with a photo` : ""}` });
      if (destinoT) tardeA = await (await import("./cobro-fuera")).anotarCobro({ kind: "renta", ref: x.rid, para: "tarde", op: x.op, negocio, ciudad: x.city, payer: x.uid, monto: montoT, fee: feeT, destino: destinoT, pm: x.pm,
        idem: (k) => `renta-${x.rid}-tarde-i${k}`, detalle: { meta: { rental: numero, business_id: negocio }, que: "tarde", dias: tarde } }, c);
      await alGuardar?.(c);
      return true;
    });
    if (!ok) return no("Ya volvió.", "It is already back.");
    // El cobro de los días tarde (sin depósito): sin cuenta de cobro, no se intenta (se arregla en el local, como siempre).
    let tardeSt: "cobrado" | "camino" | "no" | null = null;
    if (!x.dep && tarde > 0) {
      let t = tardeA as import("./cobro-fuera").Intencion | null;
      // Otro cobro de esta renta iba en camino (un día más): se termina ese; los días tarde no se cobran a la vez (se arreglan en el local).
      if (t && t.para !== "tarde") { await terminarCobroRenta(t); t = null; }
      if (t) { const r = await terminarCobroRenta(t); tardeSt = r.ok ? "cobrado" : r.enCamino ? "camino" : "no"; }
      else { tardeSt = "no"; await ev(db(), x.op, "payment_failed", "system", null, { es: `Días tarde sin cobrar (${money(montoT)}): se arregla en el local`, en: `Late days not charged (${money(montoT)}): settled in person` }); }
    }
    await liquidarDeposito(x.rid);
    const que = dano ? `${x.bname} pide descontar ${money(dano.cents)} del depósito por un daño. Mira la foto y decide.`
      : tarde && tardeSt === "camino" ? `Llegó ${tarde} ${tarde === 1 ? "día" : "días"} tarde: el cobro de ${money(montoT)} quedó en camino y se termina solo en unos minutos.`
      : tarde && tardeSt === "no" ? `Llegó ${tarde} ${tarde === 1 ? "día" : "días"} tarde: no se pudo cobrar ${money(montoT)} a tu tarjeta; se arregla en el local.`
      : tarde ? `Llegó ${tarde} ${tarde === 1 ? "día" : "días"} tarde: se ${x.dep ? "descontaron del depósito" : "cobraron"} ${money(x.dep ? lateC : tarde * x.p)}${x.dep && x.dep > lateC ? `; se liberó el resto (${money(x.dep - lateC)})` : ""}.`
      : x.dep ? `Se liberó el depósito de ${money(x.dep)}.` : "Gracias por devolverla.";
    await av.avisar(x.uid, dano ? "renta_dano" : "renta_devuelta", dano ? { articulo: x.n.es, negocio: x.bname, monto: money(dano.cents) } : { articulo: x.n.es, que }, href);
    return { ok: true };
  }
  return no("Eso no se puede.", "That cannot be done.");
}

/* Un daño en desacuerdo entra a la cola «Daños de rentas» del Super Admin (una vez). */
async function aCola(rid: string) {
  await db().query(`insert into queue_items (queue, subject_kind, subject_id, business_id, city_id, priority) select 'renta', 'rental', id::text, business_id, city_id, 'normal' from rentals where id = $1::bigint on conflict do nothing`, [rid]);
}

/* ── Super Admin: un daño en desacuerdo (o sin respuesta) se cobra o se perdona ── */
export async function resolverDano(numero: string, cobrar: boolean, adminId: string): Promise<Res> {
  if (!NUM.test(String(numero))) return no("Esa renta no existe.", "That rental does not exist.");
  const x = (await db().query<{ rid: string; op: string; uid: string; biz: string; n: Bi; c: number }>(`select r.id::text as rid, r.operation_id::text as op, r.user_id::text as uid, r.business_id as biz, r.item_name as n, r.damage_cents as c from rentals r join operations o on o.id = r.operation_id where o.number = $1`, [numero])).rows[0];
  if (!x) return no("Esa renta no existe.", "That rental does not exist.");
  const u = await db().query(`update rentals set damage_status = $2, updated_at = now() where id = $1::bigint and damage_status in ('asked', 'disputed')`, [x.rid, cobrar ? "accepted" : "waived"]);
  if (!u.rowCount) return no("Ese daño ya se decidió.", "That damage was already decided.");
  await ev(db(), x.op, cobrar ? "damage_charged" : "damage_waived", "admin", adminId, cobrar ? { es: `To'Latino decidió descontar el daño (${money(x.c)})`, en: `To'Latino decided to deduct the damage (${money(x.c)})` } : { es: "To'Latino decidió no descontar el daño", en: "To'Latino decided not to deduct the damage" });
  await liquidarDeposito(x.rid);
  const av = await import("./avisos"), que = cobrar ? `To'Latino revisó el daño: se descontaron ${money(x.c)} del depósito.` : "To'Latino revisó el daño: no se descuenta. Se liberó tu depósito.";
  await av.avisar(x.uid, "renta_devuelta", { articulo: x.n.es, que }, { href: `/renta/${numero}`, ref: ["renta", numero] });
  await av.avisarNegocio(x.biz, "biz_renta", { cliente: "To'Latino", que: cobrar ? "decidió descontar el daño" : "decidió no descontar el daño", articulo: x.n.es }, { href: `/panel/${x.biz}/hoy?det=renta:${numero}`, ref: ["renta", numero] });
  return { ok: true };
}
export async function numeroDeRenta(rid: string): Promise<string | null> {
  if (!ID.test(String(rid))) return null;
  return (await db().query<{ n: string }>(`select o.number as n from rentals r join operations o on o.id = r.operation_id where r.id = $1::bigint`, [rid])).rows[0]?.n ?? null;
}
/* ── El barrido (idempotente) ── */
export async function barrerRentas(f: { negocio?: string; userId?: string; numero?: string }): Promise<void> {
  const W = f.numero ? "o.number = $1" : f.negocio ? "r.business_id = $1" : f.userId ? "r.user_id = $1" : "true", A = f.numero ? [f.numero] : f.negocio ? [f.negocio] : f.userId ? [f.userId] : [];
  const av = await import("./avisos");
  // 9t9 · Cada paso y cada renta por su cuenta (lib/barrido-uno.ts): una que falla no deja a las demás (ni a los pasos de después) sin hacer; la tarea
  // sale fallida diciendo cuáles. Cada selección con su orden (lo más atrasado primero).
  const B = new (await import("./barrido-uno")).Fallos("rentas");
  // 1. Apartados que pasaron las 48 h: vencen y vuelve la unidad.
  const V = (await db().query<{ rid: string; op: string; item: string; uid: string; numero: string; n: Bi; bname: string; biz: string }>(
    `select r.id::text as rid, r.operation_id::text as op, r.item_id::text as item, r.user_id::text as uid, o.number as numero, r.item_name as n, b.name as bname, r.business_id as biz
       from rentals r join operations o on o.id = r.operation_id join businesses b on b.id = r.business_id where ${W} and r.status = 'held' and r.expires_at < now()
        and not exists (select 1 from offsession_charges q where q.kind = 'renta' and q.ref_id = r.id::text and q.status = 'pending') order by r.expires_at, r.id limit 50`, A)).rows;
  await B.cada(V, (x) => x.numero, async (x) => {
    const ok = await tx(async (c) => {
      // 9t4 · Un cobro al recoger que va en camino no deja vencer el apartado (la persona ya pudo llevársela): lo termina el barrido de los cobros.
      const u = await c.query(`update rentals set status = 'expired', cancelled_at = now(), cancelled_by = 'system', updated_at = now() where id = $1::bigint and status = 'held' and expires_at < now() and not exists (select 1 from offsession_charges q where q.kind = 'renta' and q.ref_id = rentals.id::text and q.status = 'pending')`, [x.rid]);
      if (!u.rowCount) return false;
      await c.query(`update items set stock_left = stock_left + 1, updated_at = now() where id = $1::bigint and stock_mode = 'qty'`, [x.item]);
      await c.query(`update operations set status = 'expired', cancelled_at = now(), cancelled_by = 'system', updated_at = now() where id = $1::bigint`, [x.op]);
      await ev(c, x.op, "expired", "system", null, { es: "Pasaron las 48 horas: volvió a la tienda", en: "48 hours passed: back on the shelf" });
      return true;
    });
    if (ok) await av.avisar(x.uid, "renta_vence", { articulo: x.n.es, negocio: x.bname }, { href: `/renta/${x.numero}`, ref: ["renta", x.numero] });
  });
  // 2. Se pasó el día de devolver: un aviso (al cliente y al negocio).
  const T = (await db().query<{ rid: string; uid: string; numero: string; n: Bi; p: number; due: string; biz: string; cliente: string; hoy: string }>(
    `select r.id::text as rid, r.user_id::text as uid, o.number as numero, r.item_name as n, r.price_cents as p, r.due_on::text as due, r.business_id as biz, coalesce(nullif(u.first_name, ''), 'Cliente') as cliente, (now() at time zone ci.timezone)::date::text as hoy
       from rentals r join operations o on o.id = r.operation_id join users u on u.id = r.user_id join cities ci on ci.id = r.city_id
      where ${W} and r.status = 'out' and r.due_on < (now() at time zone ci.timezone)::date and r.late_noticed_on is null order by r.due_on, r.id limit 50`, A)).rows;
  await B.cada(T, (x) => x.numero, async (x) => {
    const u = await db().query(`update rentals set late_noticed_on = $2::date, updated_at = now() where id = $1::bigint and late_noticed_on is null`, [x.rid, x.hoy]);
    if (!u.rowCount) return;
    await av.avisar(x.uid, "renta_tarde", { articulo: x.n.es, dia: diaCorto(x.due), monto: money(x.p) }, { href: `/renta/${x.numero}`, ref: ["renta", x.numero] });
    await av.avisarNegocio(x.biz, "biz_renta", { cliente: x.cliente, que: `se pasó del día de devolver (${diaCorto(x.due)})`, articulo: x.n.es }, { href: `/panel/${x.biz}/hoy?det=renta:${x.numero}`, ref: ["renta", x.numero] });
  });
  // 3. Daños sin respuesta en 72 h: los decide To'Latino.
  const D = (await db().query<{ rid: string }>(`update rentals r set damage_status = 'disputed', updated_at = now() from operations o where o.id = r.operation_id and ${W} and r.damage_status = 'asked' and r.damage_asked_at < now() - interval '72 hours' returning r.id::text as rid`, A)).rows;
  await B.cada(D, (x) => `renta ${x.rid}`, (x) => aCola(x.rid));
  // 4. Depósitos retenidos de más de 6 días y 20 horas (la tarjeta los suelta a los 7): se renuevan fuera de sesión.
  // 9t6 · Como una intención (lib/renovar-retencion.ts): «sin respuesta» no suelta la vieja ni avisa; se reintenta con la misma llave mientras se puede y
  // después se le pregunta a la pasarela. La vieja sigue retenida en el libro mientras la renovación va en camino (este paso la vuelve a recorrer); las que
  // ya se preguntaron hace menos de CADA_MIN esperan su turno sin tapar a las demás.
  const RR = await import("./renovar-retencion");
  const R = (await db().query<{ id: string }>(
    `select p.id::text from payments p join rentals r on r.operation_id = p.operation_id join operations o on o.id = r.operation_id
      where ${W} and p.kind = 'security' and p.status = 'held' and p.held_at < now() - make_interval(hours => ${RR.HORAS_RENOVAR})
        and not exists (select 1 from hold_renewals h join gateway_checks g on g.subject_kind = 'hold_renewals' and g.subject_id = h.id
                         where h.payment_id = p.id and h.status = 'pending' and g.at > now() - make_interval(mins => ${(await import("./consulta-pasarela")).CADA_MIN}))
      order by p.held_at limit 10`, A)).rows;
  // 9t9 · Antes el error de una renovación se tragaba (solo el registro): ahora la tarea sale fallida diciendo cuál.
  await B.cada(R, (p) => `deposito ${p.id}`, async (p) => {
    const x = await renovacionDeposito(p.id);
    if (x) await RR.renovarRetencion(x);
  });
  // 5. Devueltas con el depósito todavía retenido y nada pendiente (un cobro que falló): se reintenta.
  // 9t6 · (Una renovación en camino no estorba: si la renta vuelve mientras tanto, el depósito viejo se liquida y la nueva, si salió, se suelta sola.)
  const L = (await db().query<{ rid: string }>(`select r.id::text as rid from rentals r join operations o on o.id = r.operation_id join payments p on p.operation_id = r.operation_id and p.kind = 'security' and p.status = 'held'
      where ${W} and r.status = 'back' and (r.damage_status is null or r.damage_status in ('accepted', 'waived', 'charged')) order by p.held_at, r.id limit 10`, A)).rows;
  await B.cada(L, (x) => `renta ${x.rid}`, (x) => liquidarDeposito(x.rid));
  B.fin();
}
/* 9t6 · La renovación del depósito retenido (lib/renovar-retencion.ts), armada desde la base: la usan el paso 4 del barrido, el barrido central de las
   renovaciones, «Preguntar a Stripe ahora» y la decisión del equipo. Lo que ve el negocio dice el motivo verdadero: el banco dijo que no, o no se pudo
   renovar (Stripe no la tiene, o se soltó la que salió de más). Mientras va en camino no se le avisa nada a nadie. */
export async function renovacionDeposito(pago: string): Promise<import("./renovar-retencion").Renovar | null> {
  if (!ID.test(String(pago))) return null;
  const p = (await db().query<{ id: string; op: string; pi: string; held: number; pm: string | null; uid: string; biz: string; city: string; numero: string; n: Bi; cliente: string }>(
    `select p.id::text, p.operation_id::text as op, p.stripe_payment_intent as pi, coalesce(p.held_cents, p.amount_cents) as held, r.payment_method as pm, r.user_id::text as uid, r.business_id as biz,
            r.city_id as city, o.number as numero, r.item_name as n, coalesce(nullif(u.first_name, ''), 'Cliente') as cliente
       from payments p join rentals r on r.operation_id = p.operation_id join operations o on o.id = r.operation_id join users u on u.id = r.user_id
      where p.id = $1::bigint and p.kind = 'security'`, [pago])).rows[0];
  if (!p) return null;
  const destino = await cuentaDe(db(), p.biz);
  const href = { href: `/panel/${p.biz}/hoy?det=renta:${p.numero}`, ref: ["renta", p.numero] as [string, string] };
  return {
    kind: "renta", pago: p.id, pi: p.pi, op: p.op, negocio: p.biz, ciudad: p.city, uid: p.uid, monto: p.held, fee: 0, destino, pm: p.pm, idem: `renta-renov-${p.id}`,
    meta: { rental: p.numero, business_id: p.biz, kind: "security" },
    nueva: async (c, r) => {
      const id = (await c.query<{ id: string }>(
        `insert into payments (operation_id, user_id, business_id, city_id, kind, seq, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, card_brand, card_last4, held_at, simulated, payment_method, renewed_from)
         values ($1::bigint, $2, $3, $4, 'security', $5, 'card', $6, $7, $7, 0, 'held', coalesce($8, (select v.card_brand from payments v where v.id = $12::bigint)),
                 coalesce($9, (select v.card_last4 from payments v where v.id = $12::bigint)), now(), $10, $11, $12::bigint) returning id::text`,
        // La marca y los últimos 4: los que dio la pasarela; cerrada por la consulta no los trae, y es la misma tarjeta que el depósito viejo.
        [p.op, p.uid, p.biz, p.city, await seqDe(c, p.op, "security"), r.pi, p.held, r.marca, r.l4, r.pi.startsWith("pi_sim_"), p.pm, p.id])).rows[0]!.id;
      await ev(c, p.op, "hold_renewed", "system", null, { es: `Se renovó el depósito de ${money(p.held)}`, en: `The ${money(p.held)} deposit was renewed` });
      return id;
    },
    fallo: async (c, m) => ev(c, p.op, "hold_failed", "system", null, m === "banco" ? { es: `El depósito de ${money(p.held)} no se pudo renovar: el banco no dejó`, en: `The ${money(p.held)} deposit could not be renewed: the bank declined` }
      : { es: `El depósito de ${money(p.held)} no se pudo renovar`, en: `The ${money(p.held)} deposit could not be renewed` }),
    avisar: async (m) => { await (await import("./avisos")).avisarNegocio(p.biz, "biz_renta", { cliente: p.cliente, articulo: p.n.es,
      que: m === "banco" ? `el banco ya no deja retener el depósito de ${money(p.held)}` : `no se pudo renovar la retención del depósito de ${money(p.held)} (la tarjeta la suelta a los 7 días): ya no hay depósito retenido` }, href); },
  };
}
