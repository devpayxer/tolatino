import "server-only";
import type { PoolClient } from "pg";
import { db, tx } from "./db";

/* Apartar productos (Fase 4 · bloque 4f-3). Diseño: TLApartar.hold → el apartado de Tiendas (neg-tienda-flow.js:
   APP-NEG-TIENDA-APARTADO / -ESTADO). Mismo motor para las tiendas de Auto y Hogar y, después, para Tiendas.
   - Apartar no cobra nada: pagas en la caja lo mismo que ves. «El precio que ves es el que pagas en la caja.»
   - Eliges cuándo pasas (hoy, mañana o pasado, a una hora en que abre). Las unidades se reservan al enviarlo.
   - La tienda confirma que lo tiene (te lo guardan hasta tu hora + las horas de la tienda: 24/48/72; Auto y Hogar, 48), dice que falta algo (lo quitas y sigue, o
     cancelas) o que no lo tiene. Si no responde antes de tu hora (con al menos 30 min), vence sin cobrar nada.
   - El negocio marca «Lo recogió». Si no pasas a tiempo, vuelve al estante. Lo que no se lleva vuelve a la tienda.
   - Envío de la tienda (4q-2, solo Tiendas con envío y tarjeta): se retiene lo apartado + el envío al mandarlo; la tienda
     confirma, lo envía (con enlace de seguimiento si tiene) y al marcar «Enviado» se cobra lo que de verdad va (nunca más de
     lo retenido; lo demás se libera). Si no lo tiene, se cancela o no lo envía a tiempo, se libera todo. */
type Bi = { es: string; en: string };
type Res<T = object> = ({ ok: true } & T) | { ok: false; msg: Bi };
const no = (es: string, en: string): { ok: false; msg: Bi } => ({ ok: false, msg: { es, en } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, YMD = /^\d{4}-\d{2}-\d{2}$/, NUM = /^A-\d{1,10}$/, ID = /^\d{1,18}$/;
const money = (c: number) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;
const d2s = (d: Date) => d.toISOString().slice(0, 10);
const s2d = (s: string) => new Date(`${s}T12:00:00Z`);
const addD = (s: string, n: number) => { const d = s2d(s); d.setUTCDate(d.getUTCDate() + n); return d2s(d); };
const mins = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
const DIA = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"], MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const horaL = (m: number) => { const h = Math.floor(m / 60) % 24, mm = m % 60; return `${h % 12 || 12}${mm ? `:${String(mm).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`; };
export const MAX_LINEAS = 10, MAX_QTY = 3;

/* ── Lo que se vende en la tienda (ficha › Tienda) ── */
export type TallaVenta = { id: string; label: string; quedan: number };
export type ArticuloVenta = { id: string; n: Bi; d: Bi; precio: number; foto: string | null; quedan: number; cond: "n" | "u" | null; size: string | null;
  // Tiendas (4q): cómo se vende, sección y tallas con lo que queda («Talla» / «Número»).
  k: string | null; sec: string | null; tallas: TallaVenta[]; label: Bi | null };
export async function tiendaVenta(negocio: string): Promise<ArticuloVenta[]> {
  return (await db().query<ArticuloVenta & { a: { cond?: string; size?: string } }>(
    `select i.id::text, i.name as n, i.descr as d, i.price_cents as precio, i.photos[1] as foto, i.attrs as a, i.shop_kind as k, i.section_id::text as sec, i.size_label as label,
            coalesce((select jsonb_agg(jsonb_build_object('id', v.id::text, 'label', v.label, 'quedan', v.stock_left) order by v.sort, v.id) from item_variants v where v.item_id = i.id and v.removed_at is null), '[]'::jsonb) as tallas,
            case when exists (select 1 from item_variants v where v.item_id = i.id and v.removed_at is null) then (select coalesce(sum(v.stock_left), 0)::int from item_variants v where v.item_id = i.id and v.removed_at is null)
                 when i.stock_mode = 'qty' then greatest(i.stock_left, 0) else 99 end as quedan
       from items i join businesses b on b.id = i.business_id
      where i.business_id = $1 and i.module = 'shop' and i.removed_at is null and i.sell and not i.in_store_only and i.age_min = 0 and i.status = 'live' and b.status = 'active' and 'shop' = any(b.modules_on) and not (b.modules_off ? 'shop')
      order by i.sort, i.id limit 120`, [negocio])).rows.map(({ a, ...x }) => ({ ...x, d: { es: x.d?.es ?? "", en: x.d?.en ?? "" }, cond: a?.cond === "n" || a?.cond === "u" ? a.cond : null, size: typeof a?.size === "string" ? a.size : null }));
}

/* ── Cuándo pasas: hoy, mañana y pasado; horas en que abre (desde una hora después de abrir; hoy, desde dentro de una hora) ── */
export type DiaApartar = { f: string; k: "hoy" | "man" | "pas"; horas: number[] };
export type EnvioTienda = { fee: number; free: number; dias: string };
export type OpcionesApartar = { negocio: { id: string; nombre: string; dir: string; foto: string | null }; dias: DiaApartar[]; arts: ArticuloVenta[]; horas: number; envio: EnvioTienda | null };
/* El envío de la tienda (Tu herramienta de Tiendas) solo si la tienda cobra con tarjeta ahora (Preguntas #10). */
async function envioDe(negocio: string): Promise<EnvioTienda | null> {
  const r = (await db().query<{ fee: number; free: number; dias: string }>(`select d.ship_fee_cents as fee, coalesce(d.ship_free_over_cents, 0) as free, coalesce(nullif(d.ship_days, ''), '3-5') as dias
     from delivery_settings d join businesses b on b.id = d.business_id where d.business_id = $1 and b.category_id = 'NEG-TIENDA' and d.ship`, [negocio])).rows[0];
  if (!r) return null;
  const T = await (await import("./cobros")).tarjetaDe(negocio);
  return T.on ? { fee: Math.max(0, r.fee), free: Math.max(0, r.free), dias: /^\d{1,2}(-\d{1,2})?$/.test(r.dias) ? r.dias : "3-5" } : null;
}
/* La dirección a donde se envía (la predeterminada de Mis direcciones); la distancia no importa: va por correo o camión. */
export async function dirEnvio(userId: string, negocio: string): Promise<{ id: string; label: string; street: string } | null> {
  const d = await (await import("./pedir")).dirEntrega(db(), userId, negocio, 100000, null);
  return d ? { id: d.id, label: d.label, street: d.street } : null;
}
export const envioCosto = (e: EnvioTienda, sub: number) => (e.free > 0 && sub >= e.free ? 0 : e.fee);
/* Las horas que la tienda guarda un apartado (Tu herramienta de Tiendas: 24, 48 o 72); Auto y Hogar, 48. */
export async function horasApartado(negocio: string): Promise<number> {
  return Number((await db().query<{ h: number }>(`select coalesce((select r.hold_hours from retail_settings r join businesses b on b.id = r.business_id where r.business_id = $1 and b.category_id = 'NEG-TIENDA'), 48)::int as h`, [negocio])).rows[0]!.h);
}
async function diasDe(negocio: string, city: string): Promise<DiaApartar[]> {
  const now = (await db().query<{ h: string; m: number }>(`select (now() at time zone timezone)::date::text as h, extract(hour from now() at time zone timezone)::int * 60 + extract(minute from now() at time zone timezone)::int as m from cities where id = $1`, [city])).rows[0]!;
  const H = (await db().query<{ weekday: number; open: boolean; ranges: [string, string][] }>(`select weekday, open, ranges from business_hours where business_id = $1 and module = ''`, [negocio])).rows;
  return ([0, 1, 2] as const).map((i) => {
    const f = addD(now.h, i), h = H.find((x) => x.weekday === s2d(f).getUTCDay()), horas: number[] = [];
    if (h?.open && h.ranges?.length) for (const [a, z] of h.ranges) {
      const ini = mins(a), fin = z === "00:00" || z === "24:00" ? 1440 : mins(z);
      let m = i === 0 ? Math.max(ini + 60, Math.ceil((now.m + 60) / 30) * 30) : ini + 60;
      for (; m + 30 <= fin && horas.length < 16; m += 60) horas.push(m);
    }
    return { f, k: (["hoy", "man", "pas"] as const)[i], horas };
  });
}
export async function opcionesApartar(negocio: string): Promise<OpcionesApartar | null> {
  const b = (await db().query<{ nombre: string; dir: string; city: string; foto: string | null }>(`select name as nombre, coalesce(address, '') as dir, city_id as city, logo_url as foto from businesses where id = $1 and status = 'active'`, [negocio])).rows[0];
  if (!b) return null;
  const arts = await tiendaVenta(negocio);
  if (!arts.length) return null;
  return { negocio: { id: negocio, nombre: b.nombre, dir: b.dir, foto: b.foto }, dias: await diasDe(negocio, b.city), arts, horas: await horasApartado(negocio), envio: await envioDe(negocio) };
}

/* ── Apartar ── */
export type ApartarIn = { negocio: string; lineas: { item: string; qty: number; v?: string | null }[]; dia: string; hora: number; nota?: string; sms?: boolean; clave: string; envio?: { pm: string; dir: string | null } | null };
export async function apartar(userId: string, f: ApartarIn, entorno: string): Promise<Res<{ numero: string }>> {
  const ship = !!f?.envio;
  if (!UUID.test(String(f?.clave)) || typeof f.negocio !== "string" || (!ship && (!YMD.test(String(f?.dia)) || !Number.isInteger(f?.hora))) || !Array.isArray(f?.lineas)) return no("Revisa tu apartado y vuelve a intentarlo.", "Check your hold and try again.");
  if (ship && (typeof f.envio?.pm !== "string" || !/^pm_[A-Za-z0-9_]{3,80}$/.test(f.envio.pm) || (f.envio.dir != null && !UUID.test(String(f.envio.dir))))) return no("Elige la tarjeta con que pagas el envío.", "Choose the card for the shipment.");
  const L = f.lineas.filter((l) => ID.test(String(l?.item)) && Number.isInteger(l?.qty) && l.qty >= 1 && l.qty <= MAX_QTY && (l.v == null || ID.test(String(l.v))));
  if (!L.length || L.length !== f.lineas.length || L.length > MAX_LINEAS || new Set(L.map((l) => `${l.item}:${l.v ?? ""}`)).size !== L.length) return no("Revisa los artículos de tu apartado.", "Check the items in your hold.");
  const nota = String(f.nota ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  if (/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(nota)) return no("Por seguridad, sin teléfonos en la nota.", "For safety, no phone numbers in the note.");
  const o = await opcionesApartar(f.negocio);
  if (!o) return no("Esta tienda no aparta en la app ahora.", "This store is not taking holds in the app right now.");
  const dia = o.dias.find((d) => d.f === f.dia);
  if (!ship && (!dia || !dia.horas.includes(f.hora))) return no("Elige cuándo pasas de las horas que se ofrecen.", "Pick when you come from the offered times.");
  if (ship && !o.envio) return no("Esta tienda no está enviando ahora. Elige recogerlo en la tienda.", "This store is not shipping right now. Choose pickup.");
  const cob = await import("./cobros"), T = ship ? await cob.tarjetaDe(f.negocio) : null;
  if (ship && (!T?.on || !T.cuenta)) return no("Esta tienda no está cobrando con tarjeta ahora. Elige recogerlo en la tienda.", "This store is not taking cards right now. Choose pickup.");
  let aviso: { cliente: string; n: number } | null = null, retenido: string | null = null;
  try {
  const r = await tx(async (c): Promise<Res<{ numero: string }>> => {
    const ya = (await c.query<{ number: string }>(`select number from operations where user_id = $1 and client_key = $2::uuid`, [userId, f.clave])).rows[0];
    if (ya) return { ok: true, numero: ya.number };
    if (Number((await c.query<{ n: number }>(`select count(*)::int as n from operations where user_id = $1 and business_id = $2 and kind = 'hold' and status in ('pending', 'change_proposed', 'confirmed')`, [userId, f.negocio])).rows[0]!.n) >= 3)
      return no("Ya tienes 3 apartados abiertos en esta tienda.", "You already have 3 open holds at this store.");
    // Los artículos bloqueados en orden: dos personas a la vez por las últimas unidades → una se las lleva.
    const I = (await c.query<{ id: string; n: Bi; p: number; tax: number; mode: string; left: number }>(
      `select id::text, name as n, price_cents as p, tax_pct::float as tax, stock_mode as mode, stock_left as left from items
        where business_id = $1 and id = any($2::bigint[]) and module = 'shop' and removed_at is null and sell and not in_store_only and age_min = 0 and status = 'live' order by id for update`, [f.negocio, [...new Set(L.map((l) => l.item))]])).rows;
    if (I.length !== new Set(L.map((l) => l.item)).size) return no("Algo de tu apartado ya no está en la tienda. Revísalo.", "Something in your hold is no longer in the store. Check it.");
    // Tallas: si el artículo tiene tallas, la talla es obligatoria y se reserva (una talla en 0 no se aparta).
    const V = (await c.query<{ id: string; item: string; label: string; left: number }>(
      `select id::text, item_id::text as item, label, stock_left as left from item_variants where item_id = any($1::bigint[]) and removed_at is null order by id for update`, [I.map((x) => x.id)])).rows;
    for (const l of L) {
      const it = I.find((x) => x.id === l.item)!, vs = V.filter((v) => v.item === l.item);
      if (vs.length) {
        const v = vs.find((z) => z.id === String(l.v ?? ""));
        if (!v) return no(`Elige la talla de «${it.n.es}».`, `Choose the size of “${it.n.en || it.n.es}”.`);
        if (v.left < l.qty) return no(v.left ? `De «${it.n.es}» talla ${v.label} quedan ${v.left}.` : `«${it.n.es}» está agotado en talla ${v.label}.`, v.left ? `Only ${v.left} of “${it.n.en || it.n.es}” size ${v.label} left.` : `“${it.n.en || it.n.es}” is sold out in size ${v.label}.`);
      } else if (l.v != null) return no("Ese artículo no tiene tallas.", "That item has no sizes.");
      else if (it.mode === "qty" && it.left < l.qty) return no(it.left ? `De «${it.n.es}» quedan ${it.left}.` : `«${it.n.es}» se agotó.`, it.left ? `Only ${it.left} of “${it.n.en || it.n.es}” left.` : `“${it.n.en || it.n.es}” sold out.`);
    }
    const holdH = o.horas;
    const b = (await c.query<{ city: string; tz: string }>(`select b.city_id as city, ci.timezone as tz from businesses b join cities ci on ci.id = b.city_id where b.id = $1`, [f.negocio])).rows[0]!;
    const tot = L.reduce((s, l) => s + (I.find((x) => x.id === l.item)?.p ?? 0) * l.qty, 0);
    const numero = `A-${(await c.query<{ n: string }>(`select nextval('hold_seq')::text as n`)).rows[0]!.n}`;
    // Envío: la dirección (cualquier distancia: va por correo o en el camión de la tienda), el costo y la retención.
    let fee = 0, to: Record<string, unknown> | null = null, ret: Awaited<ReturnType<typeof cob.retenerPedido>> | null = null;
    if (ship) {
      const dir = await (await import("./pedir")).dirEntrega(c, userId, f.negocio, 100000, f.envio!.dir);
      if (!dir) return no("Agrega la dirección a donde te lo envían.", "Add the address to ship to.");
      fee = envioCosto(o.envio!, tot);
      to = { label: dir.label, street: dir.street, apt: dir.apt, zip: dir.zip, addressId: dir.id };
      ret = await cob.retenerPedido({ negocio: f.negocio, cuenta: T!.cuenta!, clave: f.clave, total: tot + fee, subtotal: tot, pm: f.envio!.pm, userId, numero, tipo: "apt" }, c);
      if (!ret.ok) return no(ret.mensaje.es, ret.mensaje.en);
      retenido = ret.pi;
      if (ret.estado === "accion") return no("Tu banco pide una verificación extra que todavía no hacemos aquí. Prueba con otra tarjeta o recógelo en la tienda.", "Your bank asks for an extra verification we can't do here yet. Try another card or pick it up in store.");
    }
    const det = ship ? { sms: f.sms !== false, como: "envio", ship: true, to, ship_days: o.envio!.dias, hold_hours: holdH } : { dia: f.dia, hora: f.hora, sms: f.sms !== false, como: "tienda", hold_hours: holdH };
    const op = ship ? (await c.query<{ id: string }>(
      `insert into operations (number, kind, city_id, business_id, user_id, status, stage, mode, scheduled_at, ready_at, respond_by, customer_note, details, subtotal_cents, delivery_cents, total_cents, pay_mode, client_key, is_test)
       values ($1, 'hold', $2, $3, $4, 'pending', 'sent', 'delivery', now(), now() + interval '6 days', now() + interval '4 hours', nullif($5, ''), $6::jsonb, $7::int, $8::int, $7::int + $8::int, 'app', $9::uuid, $10) returning id::text`,
      [numero, b.city, f.negocio, userId, nota, JSON.stringify(det), tot, fee, f.clave, entorno !== "produccion"])).rows[0]!.id
      : (await c.query<{ id: string }>(
      `insert into operations (number, kind, city_id, business_id, user_id, status, stage, mode, scheduled_at, ready_at, respond_by, customer_note, details, subtotal_cents, total_cents, pay_mode, client_key, is_test)
       values ($1, 'hold', $2, $3, $4, 'pending', 'sent', 'pickup', $5::timestamptz, $5::timestamptz + make_interval(hours => $11::int), greatest(now() + interval '30 minutes', $5::timestamptz - interval '30 minutes'), nullif($6, ''), $7::jsonb, $8, $8, 'local', $9::uuid, $10) returning id::text`,
      [numero, b.city, f.negocio, userId, (await c.query<{ t: string }>(`select (($1::date + make_interval(mins => $2::int)) at time zone $3)::text as t`, [f.dia, f.hora, b.tz])).rows[0]!.t, nota, JSON.stringify(det), tot, f.clave, entorno !== "produccion", holdH])).rows[0]!.id;
    if (ret?.ok) await cob.registrarRetencion(c, { opId: op, userId, negocio: f.negocio, city: b.city, total: tot + fee, comision: ret.comision, r: ret, pm: f.envio!.pm });
    for (const l of L) {
      const it = I.find((x) => x.id === l.item)!;
      const v = V.find((z) => z.id === String(l.v ?? ""));
      await c.query(`insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct, variant_id, variant_label) values ($1::bigint, $2::bigint, $3::jsonb, $4, $5, $6, $7, $8::bigint, $9)`, [op, l.item, JSON.stringify(it.n), l.qty, it.p, it.p * l.qty, it.tax, v?.id ?? null, v?.label ?? null]);
      if (v) await c.query(`update item_variants set stock_left = stock_left - $2, updated_at = now() where id = $1::bigint`, [v.id, l.qty]);
      else if (it.mode === "qty") await c.query(`update items set stock_left = stock_left - $2, updated_at = now() where id = $1::bigint`, [l.item, l.qty]);
    }
    await ev(c, op, "sent", "user", userId, ship ? { es: `Mandó el pedido con envío · se retuvieron ${money(tot + fee)}`, en: `Sent the order to ship · ${money(tot + fee)} held` } : { es: "Mandó el apartado", en: "Sent the hold" });
    aviso = { cliente: (await c.query<{ n: string }>(`select coalesce(nullif(first_name, ''), 'Un cliente') as n from users where id = $1`, [userId])).rows[0]?.n ?? "Un cliente", n: L.reduce((s, l) => s + l.qty, 0) };
    return { ok: true, numero };
  });
  // Lo retenido de un pedido que no se guardó (la base dijo que no) se libera en el acto.
  if (!r.ok && retenido) await (await import("./pagos/pasarela")).pasarela.liberar(retenido).catch(() => undefined);
  if (r.ok && aviso) {
    const a = aviso as { cliente: string; n: number }, av = await import("./avisos"), n = `${a.n} ${a.n === 1 ? "artículo" : "artículos"}`;
    const d = ship ? null : s2d(f.dia);
    await av.avisarNegocio(f.negocio, "biz_apartado", { cliente: a.cliente, que: d ? `apartó ${n} para el ${DIA[d.getUTCDay()]} ${d.getUTCDate()} a las ${horaL(f.hora)} · confirma que lo tienes` : `pidió ${n} con envío · confirma que lo tienes` }, { href: `/panel/${f.negocio}/hoy?det=apt:${r.numero}`, ref: ["apartado", r.numero] });
  }
  return r;
  } catch (e) {
    if (retenido) await (await import("./pagos/pasarela")).pasarela.liberar(retenido).catch(() => undefined);
    throw e;
  }
}

/* ── Lectura ── */
type St = "pending" | "change_proposed" | "confirmed" | "declined" | "expired" | "cancelled" | "done";
export type LineaApartado = { id: string; item: string | null; n: Bi; qty: number; precio: number; total: number; st: "ok" | "out" | "removed"; foto: string | null; talla: string | null;
  otra: { prop: string; label: string } | null; alt: { id: string; label: string; quedan: number }[] };
export type ApartadoVista = { numero: string; st: St; detalle: string | null; biz: string; bname: string; dir: string; tel: string | null; foto: string | null; cliente: string; tot: number; lineas: LineaApartado[];
  dia: string; hora: number; sms: boolean; hasta: string; responde: string; nota: string | null; enviado: string; guardado: string | null; recogido: string | null; cxBy: string | null; horas: number;
  // Envío de la tienda (4q-2): a dónde, cuánto, en cuántos días, seguimiento, cuándo salió y el dinero (retenido / cobrado).
  ship: boolean; envio: number; to: string | null; dias: string; track: string | null; salio: string | null; etapa: string; retenido: number | null; cobrado: number | null; tarjeta: string | null };
async function leer(where: string, args: unknown[]): Promise<(ApartadoVista & { op: string; uid: string }) | null> {
  const x = (await db().query<ApartadoVista & { op: string; uid: string }>(
    `select o.id::text as op, o.user_id::text as uid, o.number as numero, o.status as st, o.status_detail as detalle, o.business_id as biz, b.name as bname, coalesce(b.address, '') as dir, b.phone as tel, b.logo_url as foto,
            coalesce(nullif(u.first_name, ''), 'Cliente') || coalesce(' ' || left(nullif(u.last_name, ''), 1) || '.', '') as cliente, o.total_cents as tot,
            o.details->>'dia' as dia, (o.details->>'hora')::int as hora, coalesce((o.details->>'sms')::boolean, true) as sms, o.ready_at as hasta, o.respond_by as responde, o.customer_note as nota, o.sent_at as enviado, o.confirmed_at as guardado, o.done_at as recogido, o.cancelled_by as "cxBy", coalesce((o.details->>'hold_hours')::int, 48) as horas,
            o.mode = 'delivery' as ship, coalesce(o.delivery_cents, 0) as envio, nullif(concat_ws(' · ', o.details->'to'->>'label', o.details->'to'->>'street'), '') as "to", coalesce(o.details->>'ship_days', '3-5') as dias,
            o.details->>'tracking' as track, o.details->>'shipped_at' as salio, o.stage as etapa,
            (select p.held_cents from payments p where p.operation_id = o.id and p.kind = 'full' order by p.id desc limit 1) as retenido,
            (select p.amount_cents from payments p where p.operation_id = o.id and p.kind = 'full' and p.status in ('captured', 'partially_refunded', 'refunded') order by p.id desc limit 1) as cobrado,
            (select nullif(concat_ws(' ', upper(p.card_brand), p.card_last4), '') from payments p where p.operation_id = o.id and p.kind = 'full' order by p.id desc limit 1) as tarjeta
       from operations o join businesses b on b.id = o.business_id join users u on u.id = o.user_id where o.kind = 'hold' and ${where}`, args)).rows[0];
  if (!x) return null;
  x.lineas = (await db().query<LineaApartado>(`select l.id::text, l.item_id::text as item, l.name as n, l.qty, l.unit_price_cents as precio, l.line_total_cents as total, l.status as st, i.photos[1] as foto, l.variant_label as talla,
      (select jsonb_build_object('prop', cp.id::text, 'label', cp.proposed->>'label') from change_proposals cp where cp.line_id = l.id and cp.kind = 'items' and cp.status = 'open' order by cp.id desc limit 1) as otra,
      case when l.variant_id is null then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('id', v.id::text, 'label', v.label, 'quedan', v.stock_left) order by v.sort, v.id) from item_variants v
        where v.item_id = l.item_id and v.id <> l.variant_id and v.removed_at is null and v.stock_left >= l.qty), '[]'::jsonb) end as alt
    from operation_lines l left join items i on i.id = l.item_id where l.operation_id = $1::bigint order by l.id`, [x.op])).rows;
  return x;
}
export async function apartadoVista(userId: string, numero: string): Promise<ApartadoVista | null> {
  if (!NUM.test(String(numero))) return null;
  await barrerApartados({ numero });
  const x = await leer("o.number = $1 and o.user_id = $2", [numero, userId]);
  if (!x) return null;
  const { op: _o, uid: _u, ...v } = x;
  return v;
}
export async function apartadoPanel(negocio: string, numero: string): Promise<ApartadoVista | null> {
  if (!NUM.test(String(numero))) return null;
  await barrerApartados({ numero });
  const x = await leer("o.number = $1 and o.business_id = $2", [numero, negocio]);
  if (!x) return null;
  const { op: _o, uid: _u, ...v } = x;
  return v;
}
export type ApartadoFila = { numero: string; st: St; cliente: string; tot: number; n: number; dia: string; hora: number; hasta: string; responde: string; ship: boolean; etapa: string };
export async function apartadosNegocio(negocio: string): Promise<ApartadoFila[]> {
  await barrerApartados({ negocio });
  return (await db().query<ApartadoFila>(
    `select o.number as numero, o.status as st, coalesce(nullif(u.first_name, ''), 'Cliente') || coalesce(' ' || left(nullif(u.last_name, ''), 1) || '.', '') as cliente, o.total_cents as tot,
            (select coalesce(sum(qty), 0)::int from operation_lines l where l.operation_id = o.id and l.status = 'ok') as n, o.details->>'dia' as dia, (o.details->>'hora')::int as hora, o.ready_at as hasta, o.respond_by as responde, o.mode = 'delivery' as ship, o.stage as etapa
       from operations o join users u on u.id = o.user_id
      where o.business_id = $1 and o.kind = 'hold' and (o.status in ('pending', 'change_proposed', 'confirmed') or (o.status = 'done' and o.done_at > now() - interval '1 day'))
      order by case o.status when 'pending' then 0 when 'change_proposed' then 1 when 'confirmed' then 2 else 3 end, o.scheduled_at limit 40`, [negocio])).rows;
}
export async function misApartados(userId: string): Promise<{ numero: string; st: St; negocio: string; tot: number; at: string }[]> {
  await barrerApartados({ userId });
  return (await db().query<{ numero: string; st: St; negocio: string; tot: number; at: string }>(
    `select o.number as numero, o.status as st, b.name as negocio, o.total_cents as tot, o.sent_at as at from operations o join businesses b on b.id = o.business_id where o.user_id = $1 and o.kind = 'hold' order by o.id desc limit 30`, [userId])).rows;
}

/* ── Movimientos ── */
async function ev(c: PoolClient | ReturnType<typeof db>, op: string, kind: string, actor: "user" | "business" | "system", actorId: string | null, note: Bi) {
  await c.query(`insert into operation_events (operation_id, kind, actor, actor_id, note) values ($1::bigint, $2, $3, $4, $5::jsonb)`, [op, kind, actor, actorId, JSON.stringify(note)]);
}
/* Lo que no se lleva vuelve al estante (líneas que siguen apartadas). */
async function devolverStock(c: PoolClient, op: string) {
  await c.query(`update items i set stock_left = i.stock_left + l.qty, updated_at = now() from operation_lines l where l.operation_id = $1::bigint and l.item_id = i.id and l.status = 'ok' and l.variant_id is null and i.stock_mode = 'qty'`, [op]);
  await c.query(`update item_variants v set stock_left = least(9999, v.stock_left + l.qty), updated_at = now() from operation_lines l where l.operation_id = $1::bigint and l.variant_id = v.id and l.status = 'ok'`, [op]);
}
const cerrarPropuestas = (c: PoolClient, op: string, st: "declined" | "expired") => c.query(`update change_proposals set status = $2, answered_at = now() where operation_id = $1::bigint and status = 'open'`, [op, st]);
const recalcular = (c: PoolClient, op: string) => c.query(`update operations set total_cents = (select coalesce(sum(line_total_cents), 0) from operation_lines where operation_id = $1::bigint and status = 'ok') + coalesce(delivery_cents, 0), subtotal_cents = (select coalesce(sum(line_total_cents), 0) from operation_lines where operation_id = $1::bigint and status = 'ok'), updated_at = now() where id = $1::bigint`, [op]);
const hastaL = (iso: string, tz: string) => new Date(iso).toLocaleString("es-US", { timeZone: tz, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export type QueClienteApt = { que: "cancelar" } | { que: "quitar" } | { que: "otraTalla" };
export async function apartadoCliente(userId: string, numero: string, a: QueClienteApt): Promise<Res> {
  const x = NUM.test(String(numero)) ? await leer("o.number = $1 and o.user_id = $2", [numero, userId]) : null;
  if (!x) return no("Ese apartado no existe.", "That hold does not exist.");
  const av = await import("./avisos"), href = { href: `/panel/${x.biz}/hoy?det=apt:${numero}`, ref: ["apartado", numero] as [string, string] };
  if (a?.que === "cancelar") {
    const ok = await tx(async (c) => {
      const u = await c.query(`update operations set status = 'cancelled', cancelled_at = now(), cancelled_by = 'user', updated_at = now() where id = $1::bigint and status in ('pending', 'change_proposed', 'confirmed') and stage <> 'on_the_way'`, [x.op]);
      if (!u.rowCount) return false;
      await devolverStock(c, x.op);
      await cerrarPropuestas(c, x.op, "declined");
      await ev(c, x.op, "cancelled", "user", userId, { es: "Canceló el apartado", en: "Cancelled the hold" });
      return true;
    });
    if (!ok) return no("Este apartado ya cerró.", "This hold is already closed.");
    await (await import("./cobros")).liberarOperacion(x.op);
    await av.avisarNegocio(x.biz, "biz_apartado", { cliente: x.cliente, que: "canceló el apartado · vuelve al estante" }, href);
    return { ok: true };
  }
  if (a?.que === "quitar") {
    const ok = await tx(async (c) => {
      const u = await c.query(`update operations set status = 'confirmed', confirmed_at = coalesce(confirmed_at, now()), answered_at = coalesce(answered_at, now()), stage = 'accepted', updated_at = now() where id = $1::bigint and status = 'change_proposed'`, [x.op]);
      if (!u.rowCount) return false;
      await c.query(`update operation_lines set status = 'removed' where operation_id = $1::bigint and status = 'out'`, [x.op]);
      await cerrarPropuestas(c, x.op, "declined");
      await recalcular(c, x.op);
      await ev(c, x.op, "accepted", "user", userId, { es: "Quitó lo que faltaba y siguió con lo demás", en: "Removed the missing item and kept the rest" });
      return true;
    });
    if (!ok) return no("Eso ya se decidió.", "That was already decided.");
    await av.avisarNegocio(x.biz, "biz_apartado", { cliente: x.cliente, que: "quitó lo que faltaba · guárdale lo demás" }, href);
    return { ok: true };
  }
  if (a?.que === "otraTalla") {
    // «Sí, la otra talla»: la línea pasa a la talla ofrecida (mismo precio) si todavía queda; lo demás sigue guardado.
    const r = await tx(async (c): Promise<Res> => {
      const o = (await c.query(`select 1 from operations where id = $1::bigint and status = 'change_proposed' for update`, [x.op])).rowCount;
      if (!o) return no("Eso ya se decidió.", "That was already decided.");
      const P = (await c.query<{ id: string; line: string; v: string; label: string }>(
        `select cp.id::text, cp.line_id::text as line, cp.proposed->>'variant' as v, cp.proposed->>'label' as label from change_proposals cp where cp.operation_id = $1::bigint and cp.kind = 'items' and cp.status = 'open' order by cp.id for update`, [x.op])).rows;
      if (!P.length) return no("No te ofrecieron otra talla.", "No other size was offered.");
      for (const p of P) {
        const q = (await c.query<{ qty: number }>(`select qty from operation_lines where id = $1::bigint`, [p.line])).rows[0]!.qty;
        const v = await c.query(`update item_variants set stock_left = stock_left - $2, updated_at = now() where id = $1::bigint and stock_left >= $2 and removed_at is null`, [p.v, q]);
        if (!v.rowCount) return no(`La talla ${p.label} ya se acabó. Quítalo o cancela.`, `Size ${p.label} just sold out. Remove it or cancel.`);
        await c.query(`update operation_lines set status = 'ok', variant_id = $2::bigint, variant_label = $3 where id = $1::bigint`, [p.line, p.v, p.label]);
        await c.query(`update change_proposals set status = 'accepted', answered_at = now() where id = $1::bigint`, [p.id]);
      }
      await c.query(`update operation_lines set status = 'removed' where operation_id = $1::bigint and status = 'out'`, [x.op]);
      await recalcular(c, x.op);
      await c.query(`update operations set status = 'confirmed', confirmed_at = coalesce(confirmed_at, now()), answered_at = coalesce(answered_at, now()), stage = 'accepted', updated_at = now() where id = $1::bigint`, [x.op]);
      await ev(c, x.op, "accepted", "user", userId, { es: `Aceptó la otra talla (${P.map((p) => p.label).join(", ")})`, en: `Accepted the other size (${P.map((p) => p.label).join(", ")})` });
      return { ok: true };
    });
    if (r.ok) await av.avisarNegocio(x.biz, "biz_apartado", { cliente: x.cliente, que: "aceptó la otra talla · guárdasela" }, href);
    return r;
  }
  return no("Eso no se puede.", "That cannot be done.");
}

export type QueNegocioApt = { que: "tengo" | "no" | "recogio" | "entregado" } | { que: "falta"; linea: string } | { que: "talla"; linea: string; variante: string } | { que: "enviado"; track?: string | null };
export async function apartadoNegocio(negocio: string, numero: string, a: QueNegocioApt, actorId: string): Promise<Res> {
  const x = NUM.test(String(numero)) ? await leer("o.number = $1 and o.business_id = $2", [numero, negocio]) : null;
  if (!x) return no("Ese apartado no existe.", "That hold does not exist.");
  const tz = (await db().query<{ tz: string }>(`select ci.timezone as tz from businesses b join cities ci on ci.id = b.city_id where b.id = $1`, [negocio])).rows[0]!.tz;
  const av = await import("./avisos"), href = { href: `/apartado/${numero}`, ref: ["apartado", numero] as [string, string], sinSms: !x.sms };
  if (a?.que === "tengo") {
    const u = await db().query(`update operations set status = 'confirmed', stage = 'accepted', confirmed_at = now(), answered_at = now(), updated_at = now() where id = $1::bigint and status = 'pending'`, [x.op]);
    if (!u.rowCount) return no("Este apartado ya se respondió.", "This hold was already answered.");
    await ev(db(), x.op, "accepted", "business", actorId, x.ship ? { es: "La tienda lo tiene: lo prepara para enviar", en: "The store has it: preparing to ship" } : { es: "La tienda lo tiene: se lo guarda", en: "The store has it: held" });
    if (x.ship) await av.avisar(x.uid, "apt_prepara", { negocio: x.bname, dias: x.dias }, href);
    else await av.avisar(x.uid, "apt_ok", { negocio: x.bname, hasta: hastaL(x.hasta, tz), monto: money(x.tot) }, href);
    return { ok: true };
  }
  if (a?.que === "no") {
    const ok = await tx(async (c) => {
      const u = await c.query(`update operations set status = 'declined', answered_at = now(), status_detail = 'sin_existencia', updated_at = now() where id = $1::bigint and status = 'pending'`, [x.op]);
      if (!u.rowCount) return false;
      // No lo tiene: la existencia de la app estaba mal. Lo apartado no vuelve al estante (no estaba) y queda en 0.
      await c.query(`update items i set stock_left = 0, updated_at = now() from operation_lines l where l.operation_id = $1::bigint and l.item_id = i.id and l.variant_id is null and i.stock_mode = 'qty'`, [x.op]);
      await c.query(`update item_variants v set stock_left = 0, updated_at = now() from operation_lines l where l.operation_id = $1::bigint and l.variant_id = v.id`, [x.op]);
      await ev(c, x.op, "declined", "business", actorId, { es: "La tienda no lo tiene", en: "The store does not have it" });
      return true;
    });
    if (!ok) return no("Este apartado ya se respondió.", "This hold was already answered.");
    await (await import("./cobros")).liberarOperacion(x.op);
    await av.avisar(x.uid, "apt_no", { negocio: x.bname }, href);
    return { ok: true };
  }
  if (a?.que === "falta") {
    const ln = x.lineas.find((l) => l.id === String(a.linea) && l.st === "ok");
    if (!ln) return no("Elige qué falta.", "Pick what is missing.");
    if (x.lineas.filter((l) => l.st === "ok").length < 2) return no("Si es lo único del apartado, usa «No lo tengo».", "If it is the only item, use “Not in stock”.");
    const ok = await tx(async (c) => {
      const u = await c.query(`update operations set status = 'change_proposed', answered_at = now(), respond_by = now() + interval '24 hours', updated_at = now() where id = $1::bigint and status = 'pending'`, [x.op]);
      if (!u.rowCount) return false;
      await c.query(`update operation_lines set status = 'out' where id = $1::bigint and operation_id = $2::bigint`, [ln.id, x.op]);
      if (ln.talla) await c.query(`update item_variants v set stock_left = 0, updated_at = now() from operation_lines l where l.id = $1::bigint and l.variant_id = v.id`, [ln.id]);
      else await c.query(`update items set stock_left = 0, updated_at = now() where id = $1::bigint and stock_mode = 'qty'`, [ln.item]);
      await ev(c, x.op, "change_proposed", "business", actorId, { es: `Falta «${ln.n.es}»`, en: `Missing “${ln.n.en || ln.n.es}”` });
      return true;
    });
    if (!ok) return no("Este apartado ya se respondió.", "This hold was already answered.");
    await av.avisar(x.uid, "apt_falta", { negocio: x.bname, articulo: ln.n.es }, href);
    return { ok: true };
  }
  if (a?.que === "talla") {
    const ln = x.lineas.find((l) => l.id === String(a.linea) && l.st === "ok" && l.talla);
    if (!ln || !ID.test(String(a.variante))) return no("Elige la talla que ofreces.", "Pick the size you offer.");
    let otra = "";
    const ok = await tx(async (c): Promise<Res> => {
      const v = (await c.query<{ label: string; left: number }>(`select v.label, v.stock_left as left from item_variants v join operation_lines l on l.item_id = v.item_id where l.id = $1::bigint and v.id = $2::bigint and v.removed_at is null and v.id <> l.variant_id`, [ln.id, a.variante])).rows[0];
      if (!v) return no("Esa talla no es de este artículo.", "That size is not for this item.");
      if (v.left < ln.qty) return no(`De la talla ${v.label} no quedan suficientes.`, `Not enough left in size ${v.label}.`);
      const u = await c.query(`update operations set status = 'change_proposed', answered_at = now(), respond_by = now() + interval '24 hours', updated_at = now() where id = $1::bigint and status = 'pending'`, [x.op]);
      if (!u.rowCount) return no("Este apartado ya se respondió.", "This hold was already answered.");
      // La talla pedida no estaba (queda en 0); la otra se reserva solo si el cliente dice que sí.
      await c.query(`update operation_lines set status = 'out' where id = $1::bigint`, [ln.id]);
      await c.query(`update item_variants v set stock_left = 0, updated_at = now() from operation_lines l where l.id = $1::bigint and l.variant_id = v.id`, [ln.id]);
      await c.query(`insert into change_proposals (operation_id, kind, proposed, side, respond_by, created_by, line_id) values ($1::bigint, 'items', $2::jsonb, 'customer', now() + interval '24 hours', $3, $4::bigint)`, [x.op, JSON.stringify({ variant: a.variante, label: v.label }), actorId, ln.id]);
      await ev(c, x.op, "change_proposed", "business", actorId, { es: `Falta «${ln.n.es}» talla ${ln.talla}: ofrecen la ${v.label}`, en: `Missing “${ln.n.en || ln.n.es}” size ${ln.talla}: offering ${v.label}` });
      otra = v.label;
      return { ok: true };
    });
    if (!ok.ok) return ok;
    await av.avisar(x.uid, "apt_talla", { negocio: x.bname, articulo: ln.n.es, talla: ln.talla ?? "", otra }, href);
    return { ok: true };
  }
  if (a?.que === "enviado") {
    // Lo envió: se cobra lo que de verdad va (lo apartado que sigue + el envío; nunca más de lo retenido).
    const t = String((a as { track?: string | null }).track ?? "").trim().slice(0, 300);
    if (t) { let okU = false; try { const z = new URL(t); okU = z.protocol === "https:" && !!z.hostname; } catch { okU = false; } if (!okU) return no("Pega el enlace completo del seguimiento (empieza con https://).", "Paste the full tracking link (starts with https://)."); }
    const u = await db().query(`update operations set stage = 'on_the_way', details = details || jsonb_build_object('shipped_at', now(), 'tracking', nullif($2, '')), updated_at = now() where id = $1::bigint and status = 'confirmed' and mode = 'delivery' and stage <> 'on_the_way'`, [x.op, t]);
    if (!u.rowCount) return no("Este pedido no está listo para enviar.", "This order is not ready to ship.");
    await ev(db(), x.op, "on_the_way", "business", actorId, { es: t ? "Lo envió · con enlace de seguimiento" : "Lo envió", en: t ? "Shipped · with tracking link" : "Shipped" });
    const r = await cobrarApartado(x.op);
    await av.avisar(x.uid, "apt_enviado", { negocio: x.bname, monto: money(r.cobrado) }, href);
    return { ok: true };
  }
  if (a?.que === "entregado") {
    const u = await db().query(`update operations set status = 'done', stage = 'delivered', done_at = now(), updated_at = now() where id = $1::bigint and status = 'confirmed' and mode = 'delivery' and stage = 'on_the_way'`, [x.op]);
    if (!u.rowCount) return no("Primero márcalo como enviado.", "Mark it as shipped first.");
    await ev(db(), x.op, "delivered", "business", actorId, { es: "Entregado", en: "Delivered" });
    await av.avisar(x.uid, "apt_entregado", { negocio: x.bname }, href);
    return { ok: true };
  }
  if (a?.que === "recogio") {
    const u = await db().query(`update operations set status = 'done', stage = 'picked_up', done_at = now(), updated_at = now() where id = $1::bigint and status = 'confirmed' and mode = 'pickup'`, [x.op]);
    if (!u.rowCount) return no("Este apartado no está guardado.", "This hold is not being kept.");
    await ev(db(), x.op, "picked_up", "business", actorId, { es: `Lo recogió · pagó ${money(x.tot)} en la caja`, en: `Picked up · paid ${money(x.tot)} at the register` });
    return { ok: true };
  }
  return no("Eso no se puede.", "That cannot be done.");
}

/* ── El barrido (idempotente): sin respuesta a tiempo y no pasó en 48 h → vence y vuelve al estante ── */
export async function barrerApartados(f: { negocio?: string; userId?: string; numero?: string }): Promise<void> {
  const W = f.numero ? "o.number = $1" : f.negocio ? "o.business_id = $1" : f.userId ? "o.user_id = $1" : "true", A = f.numero ? [f.numero] : f.negocio ? [f.negocio] : f.userId ? [f.userId] : [];
  const V = (await db().query<{ op: string; numero: string; st: St; uid: string; biz: string; bname: string; cliente: string; sms: boolean; hh: number; ship: boolean }>(
    `select o.id::text as op, o.number as numero, o.status as st, coalesce((o.details->>'sms')::boolean, true) as sms, coalesce((o.details->>'hold_hours')::int, 48) as hh, o.mode = 'delivery' as ship, o.user_id::text as uid, o.business_id as biz, b.name as bname, coalesce(nullif(u.first_name, ''), 'Cliente') as cliente
       from operations o join businesses b on b.id = o.business_id join users u on u.id = o.user_id
      where ${W} and o.kind = 'hold' and ((o.status in ('pending', 'change_proposed') and o.respond_by < now()) or (o.status = 'confirmed' and o.ready_at < now() and o.stage <> 'on_the_way')) limit 50`, A)).rows;
  const av = await import("./avisos");
  for (const x of V) {
    const det = x.st === "pending" ? "sin_respuesta" : x.st === "change_proposed" ? "sin_decision" : x.ship ? "no_envio" : "no_paso";
    const ok = await tx(async (c) => {
      const u = await c.query(`update operations set status = 'expired', status_detail = $2, cancelled_at = now(), cancelled_by = 'system', updated_at = now() where id = $1::bigint and status = $3`, [x.op, det, x.st]);
      if (!u.rowCount) return false;
      await devolverStock(c, x.op);
      await cerrarPropuestas(c, x.op, "expired");
      await ev(c, x.op, "expired", "system", null, det === "no_envio" ? { es: "La tienda no lo envió a tiempo: se liberó lo retenido", en: "The store did not ship in time: the hold was released" } : det === "no_paso" ? { es: `Pasaron las ${x.hh} horas: volvió al estante`, en: `${x.hh} hours passed: back on the shelf` } : det === "sin_respuesta" ? { es: "La tienda no respondió a tiempo", en: "The store did not reply in time" } : { es: "No decidió a tiempo qué hacer con lo que faltaba", en: "No decision in time on the missing item" });
      return true;
    });
    if (!ok) continue;
    await (await import("./cobros")).liberarOperacion(x.op);
    const que = det === "no_envio" ? `${x.bname} no envió tu pedido a tiempo. Se liberó lo retenido en tu tarjeta.` : det === "no_paso" ? `Pasaron las ${x.hh} horas y tu apartado en ${x.bname} volvió al estante.` : det === "sin_respuesta" ? `${x.bname} no respondió a tiempo a tu apartado.` : `Tu apartado en ${x.bname} se cerró sin decidir qué hacer con lo que faltaba.`;
    await av.avisar(x.uid, "apt_vence", { que }, { href: `/apartado/${x.numero}`, ref: ["apartado", x.numero], sinSms: !x.sms });
    if (det === "sin_respuesta") await av.avisarNegocio(x.biz, "biz_apartado", { cliente: x.cliente, que: "su apartado venció sin tu respuesta" }, { href: `/panel/${x.biz}/hoy?det=apt:${x.numero}`, ref: ["apartado", x.numero] });
  }
}
export const horaApartado = horaL;
export const diaApartado = (f: string) => { const d = s2d(f); return `${DIA[d.getUTCDay()]} ${d.getUTCDate()} ${MES[d.getUTCMonth()]}`; };
/* Ficha › Tienda: los apartados abiertos de la persona en esta tienda (la tarjeta «Tu apartado») y la medida de goma de su
   carro (el filtro «Para tu …»). */
export async function tiendaMia(userId: string | null, negocio: string): Promise<{ abiertos: { numero: string; st: St; n: number; tot: number }[]; goma: { modelo: string; size: string } | null }> {
  if (!userId) return { abiertos: [], goma: null };
  await barrerApartados({ userId });
  const [A, G] = await Promise.all([
    db().query<{ numero: string; st: St; n: number; tot: number }>(`select o.number as numero, o.status as st, (select coalesce(sum(qty), 0)::int from operation_lines l where l.operation_id = o.id and l.status <> 'removed') as n, o.total_cents as tot
      from operations o where o.user_id = $1 and o.business_id = $2 and o.kind = 'hold' and o.status in ('pending', 'change_proposed', 'confirmed') order by o.id desc limit 3`, [userId, negocio]),
    db().query<{ modelo: string; size: string }>(`select model as modelo, tire_size as size from user_vehicles where user_id = $1 and removed_at is null and tire_size is not null order by is_default desc, created_at desc limit 1`, [userId]),
  ]);
  return { abiertos: A.rows, goma: G.rows[0] ?? null };
}

/* ── Dinero del envío de la tienda (4q-2) ── */
/* Cobrar al marcar «Enviado»: lo apartado que sigue + el envío, nunca más de lo retenido (la captura parcial libera el resto).
   Comisión del apartado (fee_rules 'apt') solo sobre los artículos. Idempotente: un pago ya cobrado no se toca. */
export async function cobrarApartado(opId: string): Promise<{ cobrado: number; liberado: number }> {
  const cob = await import("./cobros"), { pasarela } = await import("./pagos/pasarela");
  const p = (await db().query<{ id: string; pi: string; held: number; tot: number; sub: number }>(
    `select p.id::text, p.stripe_payment_intent as pi, p.held_cents as held, o.total_cents as tot,
            (select coalesce(sum(l.line_total_cents), 0)::int from operation_lines l where l.operation_id = o.id and l.status = 'ok') as sub
       from payments p join operations o on o.id = p.operation_id where p.operation_id = $1::bigint and o.kind = 'hold' and p.kind = 'full' and p.status = 'held'`, [opId])).rows[0];
  if (!p) return { cobrado: 0, liberado: 0 };
  const monto = Math.min(p.tot, p.held);
  if (monto <= 0) { await cob.liberarOperacion(opId); return { cobrado: 0, liberado: p.held }; }
  const fee = Math.min(await cob.comision(db(), "apt", Math.min(p.sub, monto)), monto);
  const r = await pasarela.cobrar(p.pi, monto, fee);
  if (!r.ok) { await db().query(`update payments set failure_code = $2, updated_at = now() where id = $1::bigint`, [p.id, r.codigo ?? "error"]); return { cobrado: 0, liberado: 0 }; }
  const hecho = await tx(async (c) => {
    const u = await c.query(`update payments set status = 'captured', amount_cents = $2, fee_cents = $3, captured_at = now(), failure_code = null, updated_at = now() where id = $1::bigint and status = 'held'`, [p.id, monto, fee]);
    if (!u.rowCount) return false;
    await c.query(`update operations set pay_status = 'captured' where id = $1::bigint`, [opId]);
    await ev(c, opId, "payment_captured", "system", null, { es: `Se cobraron ${money(monto)}${p.held > monto ? ` y se liberaron ${money(p.held - monto)}` : ""}`, en: `${money(monto)} charged${p.held > monto ? ` and ${money(p.held - monto)} released` : ""}` });
    return true;
  });
  return hecho ? { cobrado: monto, liberado: p.held - monto } : { cobrado: 0, liberado: 0 };
}
/* Lo que quedó a medias (una llamada a la pasarela que falló): enviado o entregado → cobrar; ya no sigue → liberar. */
export async function repararApartados(negocio: string) {
  const L = (await db().query<{ op: string; st: string; stage: string }>(
    `select p.operation_id::text as op, o.status as st, o.stage from payments p join operations o on o.id = p.operation_id
      where p.business_id = $1 and p.status = 'held' and o.kind = 'hold' and (o.stage in ('on_the_way', 'delivered') or o.status in ('declined', 'cancelled', 'expired')) limit 20`, [negocio])).rows;
  for (const x of L) {
    if (x.stage === "on_the_way" || x.stage === "delivered") await cobrarApartado(x.op);
    else await (await import("./cobros")).liberarOperacion(x.op);
  }
}
