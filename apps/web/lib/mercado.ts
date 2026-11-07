import "server-only";
import type { PoolClient } from "pg";
import { comision, liberarOperacion, registrarRetencion, retenerPedido, tarjetaDe } from "./cobros";
import { db, tx } from "./db";
import { AGOTADO_SQL } from "./menu";
import { pasarela } from "./pagos/pasarela";
import { base, dirEntrega, topeFree } from "./pedir";

/* Pedido del mercado (4p · fase4-mercados-tiendas.md §3 y §4p; prototipo neg-merc-flow.js). Reglas del servidor:
   - Al enviar con tarjeta se RETIENE el estimado + 10 % de lo que va por peso + el envío. Pagar en el mercado (EBT, efectivo): $0
     en la app, solo pickup.
   - El mercado acepta en 10 min (si no, se libera). Pesa cada línea por libra con la FOTO de la balanza; lo que no hay: propone un
     sustituto que el cliente acepta en 10 min (si no contesta, se quita y no se cobra) o lo quita.
   - El total real lo calcula la base (operation_lines.final_cents); nunca pasa de lo retenido (si pasa, no se manda).
   - «Está bien, cobrar»: se captura lo real y se libera el resto. Si el cliente no toca nada, se cobra al recoger / entregar.
   - Todo idempotente; candado por negocio; cada paso queda en operation_events. */
type Bi = { es: string; en: string };
type Q = PoolClient | ReturnType<typeof db>;
const no = (es: string, en: string) => ({ ok: false as const, msg: { es, en } });
export type ResM = { ok: true; numero?: string } | { ok: false; msg: Bi; entrar?: true; tarjeta?: true };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const NUM = /^M-\d{1,10}$/;
const ID = /^\d{1,18}$/;
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
export const QTY_MERC: Record<string, number[]> = { peso: [1, 2, 3, 5, 10], unid: [1, 2, 3, 6, 12], plato: [1, 2, 3, 4] };
const hm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const hl = (m: number) => { const h = Math.floor(m / 60) % 24, mm = m % 60; return `${h % 12 || 12}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };

/* ── Franjas: pickup cada 30 min desde +45 min; envío en franjas de 1 h desde +1.5 h; hoy y mañana; con cupo. ── */
export type Franja = { v: string; l: string; lleno: boolean };
export type DiaMerc = { k: "hoy" | "man"; f: string; pk: Franja[]; dl: Franja[] };
async function franjas(c: Q, negocio: string, cap: number): Promise<DiaMerc[]> {
  const n = (await c.query<{ hoy: string; man: string; m: number; dow: number }>(
    `select (now() at time zone ci.timezone)::date::text as hoy, ((now() at time zone ci.timezone)::date + 1)::text as man,
            extract(hour from now() at time zone ci.timezone)::int * 60 + extract(minute from now() at time zone ci.timezone)::int as m,
            extract(dow from now() at time zone ci.timezone)::int as dow
       from businesses b join cities ci on ci.id = b.city_id where b.id = $1`, [negocio])).rows[0]!;
  const H = (await c.query<{ weekday: number; open: boolean; ranges: [string, string][] }>(`select weekday, open, ranges from business_hours where business_id = $1 and module = ''`, [negocio])).rows;
  const usados = (await c.query<{ d: string; v: string; mode: string; n: number }>(
    `select (o.scheduled_at at time zone ci.timezone)::date::text as d, to_char(o.scheduled_at at time zone ci.timezone, 'HH24:MI') as v, o.mode, count(*)::int as n
       from operations o join cities ci on ci.id = o.city_id
      where o.business_id = $1 and o.kind = 'market_order' and o.status in ('pending', 'confirmed') and o.scheduled_at > now() - interval '1 hour' group by 1, 2, 3`, [negocio])).rows;
  const lleno = (d: string, v: string, mode: string) => (usados.find((u) => u.d === d && u.v === v && u.mode === mode)?.n ?? 0) >= cap;
  const toM = (s: string) => { const [h = 0, m = 0] = s.split(":").map(Number); return h * 60 + m; };
  return ([["hoy", n.hoy, n.dow], ["man", n.man, (n.dow + 1) % 7]] as const).map(([k, f, dow]) => {
    const d = H.find((x) => x.weekday === dow), pk: Franja[] = [], dl: Franja[] = [];
    if (d?.open) for (const [a, z] of d.ranges ?? []) {
      const ini = toM(a), fin = z === "00:00" || z === "24:00" ? 1440 : toM(z);
      for (let m = Math.max(ini + 30, k === "hoy" ? Math.ceil((n.m + 45) / 30) * 30 : 0); m + 30 <= fin && pk.length < 24; m += 30) pk.push({ v: hm(m), l: hl(m), lleno: lleno(f, hm(m), "pickup") });
      for (let m = Math.max(ini + 60, k === "hoy" ? Math.ceil((n.m + 90) / 30) * 30 : 0); m + 60 <= fin && dl.length < 12; m += 60) dl.push({ v: hm(m), l: `${hl(m)}–${hl(m + 60)}`, lleno: lleno(f, hm(m), "delivery") });
    }
    return { k, f, pk, dl };
  });
}

/* ── Lo que necesita la pantalla del pedido (APP-NEG-MERC-PEDIDO) ── */
export type OpcionesMerc = {
  negocio: { id: string; nombre: string; dir: string; foto: string | null; tel: string | null };
  pk: boolean; env: boolean; fee: number; free: number; min: number; zona: number; sub: "call" | "similar" | "no"; ebt: boolean; tarjeta: boolean;
  dias: DiaMerc[]; prods: { id: string; name: Bi; cents: number; k: string; tax: number; foto: string | null; opc: { t: Bi; o: Bi[] } | null; puede: boolean }[];
  dir: { id: string; label: string; street: string; mi: number | null; dentro: boolean } | null;
};
export async function opcionesMercado(negocio: string, userId: string | null): Promise<OpcionesMerc | null> {
  if (!/^[a-z0-9-]{1,80}$/.test(negocio)) return null;
  const c = db();
  const b = await base(c, negocio);
  if (!b || b.cat !== "NEG-MERC" || !(b.mods ?? []).includes("pedidos") || (b.off ?? {}).menu || (b.off ?? {}).pedidos) return null;
  const r = (await c.query<{ sub_default: OpcionesMerc["sub"]; slot_cap: number; ebt: boolean }>(`select sub_default, slot_cap, ebt from retail_settings where business_id = $1`, [negocio])).rows[0];
  const P = (await c.query<{ id: string; name: Bi; cents: number; k: string; tax: number; foto: string | null; puede: boolean; g: { name: Bi; options: { es: string; en: string; on: boolean }[] } | null }>(
    `select i.id::text, i.name, i.price_cents as cents, coalesce(i.shop_kind, 'unid') as k, i.tax_pct::float as tax, i.photos[1] as foto,
            (i.sell and not i.in_store_only and i.age_min = 0 and i.status = 'live' and not ${AGOTADO_SQL("i", "$2")}) as puede,
            (select jsonb_build_object('name', g.name, 'options', g.options) from option_groups g where g.id = any(i.group_ids) and g.required and g.removed_at is null order by g.id limit 1) as g
       from items i where i.business_id = $1 and i.module = 'shop' and i.removed_at is null order by i.sort, i.id limit 200`, [negocio, b.tz])).rows;
  const T = await tarjetaDe(negocio);
  const d = userId ? await dirEntrega(c, userId, negocio, b.zone_mi, null) : null;
  return {
    negocio: { id: b.id, nombre: b.name, dir: b.address ?? "", foto: null, tel: b.phone ?? null },
    pk: b.pickup, env: b.delivery, fee: b.fee_cents, free: b.free_over_cents, min: b.min_order_cents, zona: b.zone_mi, sub: r?.sub_default ?? "call", ebt: !!r?.ebt, tarjeta: T.on,
    dias: await franjas(c, negocio, r?.slot_cap ?? 6),
    prods: P.map(({ g, ...x }) => ({ ...x, opc: g ? { t: g.name, o: g.options.filter((o) => o.on).map((o) => ({ es: o.es, en: o.en || o.es })) } : null })),
    dir: d ? { id: d.id, label: d.label, street: d.street, mi: d.mi, dentro: d.dentro } : null,
  };
}

/* ── Enviar el pedido ── */
export type MercLineaIn = { item: string; q: number; o: number | null };
export type MercIn = { negocio: string; clave: string; lineas: MercLineaIn[]; modo: string; sub: string; nota?: string; dia: string; hora: string; pago: { tipo: string; pm?: string }; direccion?: string | null };
export async function crearPedidoMercado(userId: string, p: MercIn, entorno: string): Promise<ResM> {
  if (!p || typeof p.negocio !== "string" || !/^[a-z0-9-]{1,80}$/.test(p.negocio)) return no("Ese mercado no existe.", "That market does not exist.");
  if (typeof p.clave !== "string" || !UUID.test(p.clave)) return no("No se pudo enviar. Prueba de nuevo.", "Could not send. Try again.");
  const lineas = Array.isArray(p.lineas) ? p.lineas.slice(0, 31) : [];
  if (!lineas.length) return no("Tu pedido está vacío.", "Your order is empty.");
  if (lineas.length > 30) return no("Tu pedido tiene demasiadas líneas.", "Your order has too many lines.");
  const modo = p.modo === "delivery" ? "delivery" : "pickup", sub = ["call", "similar", "no"].includes(p.sub) ? p.sub : "call";
  const dia = p.dia === "man" ? "man" : "hoy", hora = String(p.hora ?? "");
  if (!/^\d{2}:\d{2}$/.test(hora)) return no("Elige la hora.", "Pick the time.");
  const nota = typeof p.nota === "string" ? p.nota.replace(/[\u0000-\u001F]/g, " ").trim().slice(0, 200) : "";
  const conTarjeta = p.pago?.tipo === "tarjeta";
  const pm = conTarjeta && typeof p.pago?.pm === "string" && /^pm_[A-Za-z0-9_]{3,80}$/.test(p.pago.pm) ? p.pago.pm : null;
  if (conTarjeta && !pm) return { ...no("Elige con qué tarjeta pagas.", "Choose the card you pay with."), tarjeta: true };
  if (!conTarjeta && modo === "delivery") return no("El envío se paga con tarjeta. Para pagar en el mercado (EBT o efectivo), elige pickup.", "Delivery is paid by card. To pay at the market (EBT or cash), choose pickup.");
  const T = conTarjeta ? await tarjetaDe(p.negocio) : null;
  if (conTarjeta && !T?.on) return { ...no("Este mercado no está cobrando con tarjeta ahora. Elige pagar en el mercado.", "This market is not taking cards right now. Choose to pay at the market."), tarjeta: true };
  await vencerMercado({ negocio: p.negocio });
  let retenido: string | null = null;
  const c = await db().connect();
  try {
    await c.query("begin");
    await c.query(`select pg_advisory_xact_lock(hashtext('pedido:' || $1))`, [p.negocio]);
    const ya = (await c.query<{ number: string }>(`select number from operations where user_id = $1 and client_key = $2`, [userId, p.clave])).rows[0];
    if (ya) { await c.query("rollback"); return { ok: true, numero: ya.number }; }
    const pend = (await c.query<{ n: number }>(`select count(*)::int as n from operations where user_id = $1 and kind = 'market_order' and status = 'pending'`, [userId])).rows[0]!.n;
    if (pend >= 3) { await c.query("rollback"); return no("Tienes 3 pedidos esperando respuesta. Espera a que te contesten.", "You have 3 orders waiting for a reply. Wait for an answer."); }
    const b = await base(c, p.negocio);
    if (!b || b.cat !== "NEG-MERC" || !(b.mods ?? []).includes("pedidos") || (b.off ?? {}).menu || (b.off ?? {}).pedidos) { await c.query("rollback"); return no("Este mercado no toma pedidos en To’Latino.", "This market does not take To’Latino orders."); }
    if (modo === "pickup" ? !b.pickup : !b.delivery) { await c.query("rollback"); return modo === "pickup" ? no("Este mercado no tiene pickup ahora.", "This market has no pickup now.") : no("Este mercado no hace envíos ahora. Elige pickup.", "This market is not delivering now. Choose pickup."); }
    // Techo Free: los pedidos del mes que cuentan (Pro, sin techo).
    if (b.plan !== "pro") { const t = await topeFree(c, b.id, b.mes); if (t.usados >= t.cap) { await c.query("rollback"); return no("Este mercado no toma más pedidos en línea este mes. Ve directo.", "This market takes no more online orders this month. Walk in."); } }
    const rs = (await c.query<{ slot_cap: number }>(`select slot_cap from retail_settings where business_id = $1`, [b.id])).rows[0];
    const D = await franjas(c, b.id, rs?.slot_cap ?? 6), d = D.find((x) => x.k === dia)!, fr = (modo === "pickup" ? d.pk : d.dl).find((x) => x.v === hora);
    if (!fr) { await c.query("rollback"); return no("Esa hora ya no está. Elige otra.", "That time is no longer available. Pick another."); }
    if (fr.lleno) { await c.query("rollback"); return no("Esa franja ya está llena. Elige otra hora.", "That slot is full. Pick another time."); }
    // Productos: precio, impuesto y si se puede pedir los decide el servidor (lo que vino del teléfono solo dice cuál y cuánto).
    const ids = [...new Set(lineas.map((l) => String(l?.item ?? "")).filter((x) => ID.test(x)))];
    const I = (await c.query<{ id: string; name: Bi; cents: number; k: string; tax: number; puede: boolean; g: { name: Bi; options: { es: string; en: string; on: boolean }[] } | null; stk: string; left: number }>(
      `select i.id::text, i.name, i.price_cents as cents, coalesce(i.shop_kind, 'unid') as k, i.tax_pct::float as tax, i.stock_mode as stk, i.stock_left as left,
              (i.sell and not i.in_store_only and i.age_min = 0 and i.status = 'live' and not ${AGOTADO_SQL("i", "$3")}) as puede,
              (select jsonb_build_object('name', g.name, 'options', g.options) from option_groups g where g.id = any(i.group_ids) and g.required and g.removed_at is null order by g.id limit 1) as g
         from items i where i.business_id = $1 and i.module = 'shop' and i.removed_at is null and i.id = any($2::bigint[]) for update of i`, [b.id, ids, b.tz])).rows;
    const L: { it: (typeof I)[number]; q: number; peso: boolean; tot: number; ops: { g: Bi; o: Bi }[] }[] = [];
    for (const l of lineas) {
      const it = I.find((x) => x.id === String(l?.item ?? ""));
      if (!it) { await c.query("rollback"); return no("Un producto de tu pedido ya no está. Revisa tu pedido.", "A product in your order is no longer available. Check your order."); }
      if (!it.puede) { await c.query("rollback"); return no(`«${it.name.es}» no se puede pedir ahora. Quítalo de tu pedido.`, `“${it.name.en || it.name.es}” cannot be ordered now. Remove it from your order.`); }
      const q = Number(l.q);
      if (!(QTY_MERC[it.k] ?? QTY_MERC.unid!).includes(q)) { await c.query("rollback"); return no(`Revisa la cantidad de «${it.name.es}».`, `Check the quantity of “${it.name.en || it.name.es}”.`); }
      const ops: { g: Bi; o: Bi }[] = [];
      const on = it.g ? it.g.options.filter((o) => o.on) : [];
      if (on.length) {
        const o = l.o == null ? -1 : Number(l.o);
        if (!(Number.isInteger(o) && o >= 0 && o < on.length)) { await c.query("rollback"); return no(`Elige cómo quieres «${it.name.es}».`, `Choose how you want “${it.name.en || it.name.es}”.`); }
        ops.push({ g: it.g!.name, o: { es: on[o]!.es, en: on[o]!.en || on[o]!.es } });
      }
      const peso = it.k === "peso";
      if (!peso && it.stk !== "none" && it.left < q) { await c.query("rollback"); return no(`«${it.name.es}»: solo quedan ${it.left}.`, `“${it.name.en || it.name.es}”: only ${it.left} left.`); }
      L.push({ it, q, peso, tot: it.cents * q, ops });
    }
    const subt = L.reduce((a, x) => a + x.tot, 0), tax = L.reduce((a, x) => a + Math.round((x.tot * x.it.tax) / 100), 0);
    const pesoT = L.filter((x) => x.peso).reduce((a, x) => a + x.tot + Math.round((x.tot * x.it.tax) / 100), 0);
    let envio = 0, to: Record<string, unknown> | null = null;
    if (modo === "delivery") {
      const dir = await dirEntrega(c, userId, b.id, b.zone_mi, typeof p.direccion === "string" && UUID.test(p.direccion) ? p.direccion : null);
      if (!dir) { await c.query("rollback"); return no("Agrega la dirección a donde te lo llevan.", "Add the address to deliver to."); }
      if (dir.mi == null) { await c.query("rollback"); return no("No encontramos tu dirección en el mapa. Revisa la calle en Mis direcciones, o elige pickup.", "We couldn't find your address on the map. Check it in My addresses, or choose pickup."); }
      if (!dir.dentro) { await c.query("rollback"); return no(`Tu dirección queda a ${dir.mi} mi y el mercado lleva hasta ${b.zone_mi} mi. Elige pickup.`, `Your address is ${dir.mi} mi away and the market delivers up to ${b.zone_mi} mi. Choose pickup.`); }
      if (b.min_order_cents && subt < b.min_order_cents) { await c.query("rollback"); return no(`El envío pide un mínimo de ${money(b.min_order_cents)}: te faltan ${money(b.min_order_cents - subt)}.`, `Delivery needs a ${money(b.min_order_cents)} minimum: add ${money(b.min_order_cents - subt)}.`); }
      envio = b.free_over_cents && subt >= b.free_over_cents ? 0 : b.fee_cents;
      to = { label: dir.label, street: dir.street, apt: dir.apt, zip: dir.zip, mi: dir.mi, addressId: dir.id };
    }
    const est = subt + tax + envio, retener = est + Math.round(pesoT * 0.1);
    const num = `M-${(await c.query<{ n: string }>(`select nextval('market_seq')::text as n`)).rows[0]!.n}`;
    let ret: Awaited<ReturnType<typeof retenerPedido>> | null = null;
    if (conTarjeta && T?.cuenta && pm) {
      ret = await retenerPedido({ negocio: b.id, cuenta: T.cuenta, clave: p.clave, total: retener, subtotal: subt, pm, userId, numero: num, tipo: "merc" }, c);
      if (!ret.ok) { await c.query("rollback"); return { ...no(ret.mensaje.es, ret.mensaje.en), tarjeta: true }; }
      retenido = ret.pi;
      if (ret.estado === "accion") { await c.query("rollback"); await pasarela.liberar(ret.pi).catch(() => undefined); return { ...no("Tu banco pide una verificación extra que todavía no hacemos aquí. Prueba con otra tarjeta o paga en el mercado.", "Your bank asks for an extra verification we can't do here yet. Try another card or pay at the market."), tarjeta: true }; }
    }
    const fecha = d.f, min = Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));
    const op = (await c.query<{ id: string }>(
      `insert into operations (number, kind, city_id, business_id, user_id, status, stage, mode, scheduled_at, ready_at, customer_note, subtotal_cents, tax_cents, total_cents,
                               pay_mode, respond_by, free_quota_month, client_key, is_test, details, delivery_cents)
       values ($1, 'market_order', $2, $3, $4, 'pending', 'sent', $5, ($6::date + make_interval(mins => $7::int)) at time zone $8, ($6::date + make_interval(mins => $7::int)) at time zone $8,
               nullif($9, ''), $10, $11, $12, $13, now() + interval '10 minutes', $14, $15, $16, $17::jsonb, $18) returning id::text`,
      [num, b.city, b.id, userId, modo, fecha, min, b.tz, nota, subt, tax, est, ret?.ok ? "app" : "local", b.plan === "pro" ? null : b.mes, p.clave, entorno !== "produccion",
        JSON.stringify({ sub, est_cents: est, hold_est_cents: ret?.ok ? retener : 0, ...(modo === "delivery" ? { to, window_end: hm(min + 60) } : { address: b.address }) }), envio])).rows[0]!;
    if (ret?.ok) await registrarRetencion(c, { opId: op.id, userId, negocio: b.id, city: b.city, total: retener, comision: ret.comision, r: ret, pm: pm ?? undefined });
    for (const x of L) {
      await c.query(`insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct, options, weight_est) values ($1, $2, $3::jsonb, $4, $5, $6, $7, $8::jsonb, $9)`,
        [op.id, x.it.id, JSON.stringify({ es: x.it.name.es, en: x.it.name.en || x.it.name.es }), x.peso ? 1 : x.q, x.it.cents, x.tot, x.it.tax, JSON.stringify(x.ops), x.peso ? x.q : null]);
      if (!x.peso && x.it.stk !== "none") await c.query(`update items set stock_left = greatest(0, stock_left - $2), updated_at = now() where id = $1::bigint`, [x.it.id, x.q]);
    }
    await c.query(`insert into operation_events (operation_id, kind, actor, actor_id, note) values ($1, 'sent', 'user', $2, $3::jsonb)`, [op.id, userId,
      JSON.stringify(ret?.ok ? { es: `Se retuvieron ${money(retener)} (estimado + 10 % de lo que va por peso)`, en: `${money(retener)} held (estimate + 10% of by-weight items)` } : { es: "Paga en el mercado al recoger", en: "Pays at the market at pickup" })]);
    await c.query("commit");
    retenido = null;
    await avisar(num, "biz_merc", { modo: modo === "delivery" ? "envío" : "pickup", cuando: `${dia === "hoy" ? "hoy" : "mañana"} ${fr.l}`, n: String(L.length) });
    return { ok: true, numero: num };
  } catch (e) {
    await c.query("rollback").catch(() => undefined);
    if (retenido) await pasarela.liberar(retenido).catch(() => undefined);
    throw e;
  } finally { c.release(); }
}

/* ── Totales (siempre de la base) ── */
export type Totales = { est: number; real: number; sub: number; tax: number; envio: number; ret: number; cobrado: number; liberado: number; tarjeta: string | null; pendiente: boolean };
async function totales(c: Q, opId: string): Promise<Totales> {
  const r = (await c.query<{ est: number; sub: number; tax: number; envio: number; ret: number; cob: number; lib: number; tarjeta: string | null; pend: boolean }>(
    `select coalesce((o.details->>'est_cents')::int, o.total_cents) as est, coalesce(sum(l.final_cents), 0)::int as sub, coalesce(sum(round(l.final_cents * l.tax_pct / 100)), 0)::int as tax,
            coalesce(o.delivery_cents, 0) as envio,
            (select coalesce(sum(p.held_cents), 0)::int from payments p where p.operation_id = o.id and p.kind = 'full') as ret,
            (select coalesce(sum(p.amount_cents), 0)::int from payments p where p.operation_id = o.id and p.kind = 'full' and p.status in ('captured', 'partially_refunded', 'refunded')) as cob,
            (select coalesce(sum(case when p.status = 'released' then p.held_cents when p.status in ('captured', 'partially_refunded', 'refunded') then p.held_cents - p.amount_cents else 0 end), 0)::int from payments p where p.operation_id = o.id and p.kind = 'full') as lib,
            (select case when p.card_last4 is null then null else upper(coalesce(p.card_brand, '')) || ' ·· ' || p.card_last4 end from payments p where p.operation_id = o.id and p.kind = 'full' limit 1) as tarjeta,
            exists (select 1 from payments p where p.operation_id = o.id and p.kind = 'full' and p.status = 'held') as pend
       from operations o left join operation_lines l on l.operation_id = o.id where o.id = $1::bigint group by o.id`, [opId])).rows[0]!;
  return { est: r.est, real: r.sub + r.tax + r.envio, sub: r.sub, tax: r.tax, envio: r.envio, ret: r.ret, cobrado: r.cob, liberado: r.lib, tarjeta: r.tarjeta, pendiente: r.pend };
}

/* ── Cobrar lo real y liberar el resto (idempotente; repararMercado reintenta si la pasarela falla) ── */
export async function liquidarMercado(opId: string): Promise<{ cobrado: number; liberado: number }> {
  const p = (await db().query<{ id: string; pi: string; held: number; num: string }>(
    `select p.id::text, p.stripe_payment_intent as pi, p.held_cents as held, o.number as num from payments p join operations o on o.id = p.operation_id
      where p.operation_id = $1::bigint and p.kind = 'full' and p.status = 'held'`, [opId])).rows[0];
  if (!p) return { cobrado: 0, liberado: 0 };
  const t = await totales(db(), opId), monto = Math.min(t.real, p.held);
  if (monto <= 0) { await liberarOperacion(opId); return { cobrado: 0, liberado: p.held }; }
  // Comisión del mercado solo sobre lo vendido (sin impuesto ni envío).
  const fee = Math.min(await comision(db(), "merc", Math.min(t.sub, monto)), monto);
  const r = await pasarela.cobrar(p.pi, monto, fee);
  if (!r.ok) { await db().query(`update payments set failure_code = $2, updated_at = now() where id = $1::bigint`, [p.id, r.codigo ?? "error"]); return { cobrado: 0, liberado: 0 }; }
  const hecho = await tx(async (c) => {
    const u = await c.query(`update payments set status = 'captured', amount_cents = $2, fee_cents = $3, captured_at = now(), failure_code = null, updated_at = now() where id = $1::bigint and status = 'held'`, [p.id, monto, fee]);
    if (!u.rowCount) return false;
    await c.query(`update operations set pay_status = 'captured', details = details || jsonb_build_object('settled_at', now()) where id = $1::bigint`, [opId]);
    await ev(c, opId, "payment_captured", "system", null, { es: `Se cobraron ${money(monto)}${p.held > monto ? ` y se liberaron ${money(p.held - monto)}` : ""}`, en: `${money(monto)} charged${p.held > monto ? ` and ${money(p.held - monto)} released` : ""}` });
    return true;
  });
  if (hecho) await avisar(p.num, "merc_cobrado", { monto: money(monto), libre: p.held > monto ? ` · se liberan ${money(p.held - monto)}` : "" });
  return hecho ? { cobrado: monto, liberado: p.held - monto } : { cobrado: 0, liberado: 0 };
}

async function ev(c: Q, opId: string, kind: string, actor: "user" | "member" | "system", actorId: string | null, note: Bi) {
  await c.query(`insert into operation_events (operation_id, kind, actor, actor_id, note) values ($1::bigint, $2, $3, $4, $5::jsonb)`, [opId, kind, actor, actorId, JSON.stringify(note)]);
}

/* ── Vencer: 10 min para aceptar; 10 min para contestar una sustitución (se quita y no se cobra) ── */
export async function vencerMercado(f: { negocio?: string; numero?: string }) {
  const w = f.negocio ? "o.business_id = $1" : f.numero ? "o.number = $1" : "true", v = f.negocio ? [f.negocio] : f.numero ? [f.numero] : [];
  const exp = (await db().query<{ id: string; number: string }>(
    `update operations o set status = 'expired', updated_at = now() where o.kind = 'market_order' and o.status = 'pending' and o.respond_by <= now() and ${w} returning o.id::text, o.number`, v)).rows;
  for (const x of exp) { await ev(db(), x.id, "expired", "system", null, { es: "No aceptaron en 10 minutos", en: "Not accepted within 10 minutes" }); await liberarOperacion(x.id); await avisar(x.number, "merc_exp", {}); }
  await db().query(
    `update change_proposals cp set status = 'expired', answered_at = now() from operations o where o.id = cp.operation_id and o.kind = 'market_order' and cp.kind = 'items' and cp.status = 'open' and cp.respond_by <= now() and ${w}`, v);
}

/* ── Cliente ── */
export type LineaVista = { id: string; name: Bi; q: number; peso: boolean; est: number; lb: number | null; lbReal: number | null; final: number; foto: string | null; ops: string[]; st: string; subOf: string | null };
export type PropVista = { id: string; line: string; name: Bi; cents: number; vence: string };
export type MercadoVista = {
  numero: string; st: string; detalle: string | null; modo: string; cuando: string; win: string | null; negocio: { id: string; nombre: string; dir: string; tel: string | null };
  lineas: LineaVista[]; props: PropVista[]; t: Totales; local: boolean; sub: string; nota: string | null; aprobado: boolean; vence: string | null; eventos: { k: string; at: string; t: Bi }[];
};
const ISO = (x: string) => `to_char((${x}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
export async function vistaMercado(numero: string, filtro: { userId?: string; negocio?: string }): Promise<MercadoVista | null> {
  if (!NUM.test(numero)) return null;
  await vencerMercado({ numero });
  const o = (await db().query<{ id: string; status: string; detail: string | null; mode: string; cuando: string; det: Record<string, unknown>; bid: string; bname: string; addr: string | null; tel: string | null; pay: string; nota: string | null; resp: string | null }>(
    `select o.id::text, o.status, o.status_detail as detail, o.mode, ${ISO("o.scheduled_at")} as cuando, o.details as det,
            b.id as bid, b.name as bname, b.address as addr, b.phone as tel, o.pay_mode as pay, o.customer_note as nota, ${ISO("o.respond_by")} as resp
       from operations o join businesses b on b.id = o.business_id join cities ci on ci.id = o.city_id
      where o.number = $1 and o.kind = 'market_order' and ($2::uuid is null or o.user_id = $2::uuid) and ($3::text is null or o.business_id = $3)`, [numero, filtro.userId ?? null, filtro.negocio ?? null])).rows[0];
  if (!o) return null;
  const L = (await db().query<LineaVista & { ops0: { o: Bi }[] }>(
    `select l.id::text, l.name, l.qty as q, l.weight_est is not null as peso, l.line_total_cents as est, l.weight_est::float as lb, l.weight_final::float as "lbReal", l.final_cents as final,
            m.url as foto, l.options as ops0, l.status as st, l.sub_of::text as "subOf"
       from operation_lines l left join media m on m.id = l.weigh_photo_id where l.operation_id = $1::bigint order by l.id`, [o.id])).rows;
  const P = (await db().query<PropVista>(
    `select cp.id::text, cp.line_id::text as line, cp.proposed->'name' as name, (cp.proposed->>'cents')::int as cents, ${ISO("cp.respond_by")} as vence
       from change_proposals cp where cp.operation_id = $1::bigint and cp.kind = 'items' and cp.status = 'open' order by cp.id`, [o.id])).rows;
  const E = (await db().query<{ k: string; at: string; t: Bi }>(`select kind as k, ${ISO("at")} as at, coalesce(note, '{"es":"","en":""}'::jsonb) as t from operation_events where operation_id = $1::bigint order by id`, [o.id])).rows;
  return {
    numero, st: o.status, detalle: o.detail, modo: o.mode, cuando: o.cuando, win: (o.det.window_end as string) ?? null, negocio: { id: o.bid, nombre: o.bname, dir: o.addr ?? "", tel: o.tel },
    lineas: L.map(({ ops0, ...x }) => ({ ...x, ops: (ops0 ?? []).map((z) => z.o?.es ?? "").filter(Boolean) })), props: P, t: await totales(db(), o.id), local: o.pay !== "app", sub: String(o.det.sub ?? "call"),
    nota: o.nota, aprobado: !!o.det.approved_at || !!o.det.settled_at, vence: o.status === "pending" ? o.resp : null, eventos: E,
  };
}

async function opDe(c: Q, numero: string, filtro: { userId?: string; negocio?: string }, lock = false) {
  return (await c.query<{ id: string; status: string; detail: string | null; mode: string; bid: string; uid: string; pay: string; det: Record<string, unknown> }>(
    `select id::text, status, status_detail as detail, mode, business_id as bid, user_id::text as uid, pay_mode as pay, details as det from operations
      where number = $1 and kind = 'market_order' and ($2::uuid is null or user_id = $2::uuid) and ($3::text is null or business_id = $3)${lock ? " for update" : ""}`,
    [numero, filtro.userId ?? null, filtro.negocio ?? null])).rows[0] ?? null;
}

export async function decidirSustituto(userId: string, numero: string, prop: string, si: boolean): Promise<ResM> {
  if (!NUM.test(numero) || !ID.test(String(prop))) return no("Ese pedido no existe.", "That order does not exist.");
  await vencerMercado({ numero });
  const r = await tx(async (c): Promise<ResM> => {
    const o = await opDe(c, numero, { userId }, true);
    if (!o) return no("Ese pedido no existe.", "That order does not exist.");
    const cp = (await c.query<{ id: string; line: string; p: { item: string; name: Bi; cents: number; q: number; tax: number } }>(
      `select id::text, line_id::text as line, proposed as p from change_proposals where id = $1::bigint and operation_id = $2::bigint and kind = 'items' and status = 'open' and respond_by > now() for update`, [prop, o.id])).rows[0];
    if (!cp) return no("Ese cambio ya no está: pasaron los 10 minutos o ya contestaste.", "That swap is no longer open: 10 minutes passed or you already answered.");
    await c.query(`update change_proposals set status = $2, answered_at = now() where id = $1::bigint`, [cp.id, si ? "accepted" : "declined"]);
    if (si) await c.query(`insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct, sub_of) values ($1::bigint, $2, $3::jsonb, $4, $5, $6, $7, $8::bigint)`,
      [o.id, cp.p.item, JSON.stringify(cp.p.name), cp.p.q, cp.p.cents, cp.p.cents * cp.p.q, cp.p.tax, cp.line]);
    await ev(c, o.id, si ? "sub_ok" : "sub_no", "user", userId, si ? { es: `Aceptó el cambio: ${cp.p.name.es}`, en: `Accepted the swap: ${cp.p.name.en || cp.p.name.es}` } : { es: "No quiso el cambio: se quita y no se cobra", en: "Declined the swap: removed and not charged" });
    return { ok: true };
  });
  if (r.ok) await avisar(numero, "biz_merc_sust", { respuesta: si ? "aceptó" : "no quiso" });
  return r;
}

export async function aprobarPeso(userId: string, numero: string): Promise<ResM & { cobrado?: number; liberado?: number }> {
  if (!NUM.test(numero)) return no("Ese pedido no existe.", "That order does not exist.");
  const o = await opDe(db(), numero, { userId });
  if (!o) return no("Ese pedido no existe.", "That order does not exist.");
  if (o.status !== "confirmed" || !["pesado", "listo", "camino"].includes(o.detail ?? "")) return no("Todavía no lo han pesado.", "It has not been weighed yet.");
  if (o.det.approved_at) return { ok: true };
  if ((await db().query(`select 1 from change_proposals where operation_id = $1::bigint and kind = 'items' and status = 'open' limit 1`, [o.id])).rowCount) return no("Primero contesta el cambio que te proponen.", "First answer the proposed swap.");
  await db().query(`update operations set details = details || jsonb_build_object('approved_at', now()) where id = $1::bigint`, [o.id]);
  await ev(db(), o.id, "approved", "user", userId, { es: "Dijo que está bien", en: "Approved" });
  const t = await liquidarMercado(o.id);
  if (t.cobrado) await avisar(numero, "biz_merc_ok", { monto: money(t.cobrado) });
  return { ok: true, ...t };
}

export async function cancelarMercado(userId: string, numero: string): Promise<ResM> {
  if (!NUM.test(numero)) return no("Ese pedido no existe.", "That order does not exist.");
  await vencerMercado({ numero });
  const o = await tx(async (c) => {
    const x = await opDe(c, numero, { userId }, true);
    if (!x || x.status !== "pending") return null;
    await c.query(`update operations set status = 'cancelled', cancelled_by = 'user', cancelled_at = now(), updated_at = now() where id = $1::bigint`, [x.id]);
    await ev(c, x.id, "cancelled", "user", userId, { es: "Lo canceló el cliente antes de que lo aceptaran", en: "Cancelled by the customer before acceptance" });
    return x;
  });
  if (!o) return no("Ya no se puede cancelar: el mercado lo aceptó. Escríbeles o pide ayuda.", "It can no longer be cancelled: the market accepted it. Message them or ask for help.");
  await liberarOperacion(o.id);
  return { ok: true };
}

/* ── Negocio ── */
export type FilaMerc = { numero: string; who: string; modo: string; cuando: string; n: number; st: string; detalle: string | null; est: number; vence: string | null };
export async function mercadoHoy(negocio: string): Promise<FilaMerc[]> {
  await vencerMercado({ negocio });
  return (await db().query<FilaMerc>(
    `select o.number as numero, coalesce(u.first_name, 'Cliente') as who, o.mode as modo, to_char(o.scheduled_at at time zone ci.timezone, 'HH12:MI AM') as cuando,
            (select count(*)::int from operation_lines l where l.operation_id = o.id and l.sub_of is null) as n, o.status as st, o.status_detail as detalle,
            coalesce((o.details->>'est_cents')::int, o.total_cents) as est, case when o.status = 'pending' then ${ISO("o.respond_by")} end as vence
       from operations o join users u on u.id = o.user_id join cities ci on ci.id = o.city_id
      where o.business_id = $1 and o.kind = 'market_order' and (o.status in ('pending', 'confirmed') or (o.status = 'done' and o.done_at > now() - interval '12 hours'))
      order by o.status = 'pending' desc, o.scheduled_at limit 30`, [negocio])).rows;
}

export type PasoMerc = "aceptar" | "rechazar" | "mandar" | "listo" | "entregado";
export async function pasoMercado(negocio: string, numero: string, paso: PasoMerc, actorId: string): Promise<ResM> {
  if (!NUM.test(numero)) return no("Ese pedido no existe.", "That order does not exist.");
  await vencerMercado({ negocio });
  let despues: (() => Promise<void>) | null = null;
  const r = await tx(async (c): Promise<ResM> => {
    await c.query(`select pg_advisory_xact_lock(hashtext('pedido:' || $1))`, [negocio]);
    const o = await opDe(c, numero, { negocio }, true);
    if (!o) return no("Ese pedido no existe.", "That order does not exist.");
    const cambio = no("Este pedido ya cambió. Actualiza la pantalla.", "This order already changed. Refresh the screen.");
    if (paso === "aceptar" || paso === "rechazar") {
      if (o.status !== "pending") return cambio;
      if (paso === "aceptar") {
        await c.query(`update operations set status = 'confirmed', status_detail = 'preparando', stage = 'accepted', confirmed_at = now(), answered_at = now(), updated_at = now() where id = $1::bigint`, [o.id]);
        await ev(c, o.id, "accepted", "member", actorId, { es: "Aceptado · lo están armando", en: "Accepted · being prepared" });
        despues = () => avisar(numero, "merc_ok", {});
      } else {
        await c.query(`update operations set status = 'declined', answered_at = now(), updated_at = now() where id = $1::bigint`, [o.id]);
        await ev(c, o.id, "declined", "member", actorId, { es: "El mercado no puede hoy", en: "The market cannot today" });
        despues = async () => { await liberarOperacion(o.id); await avisar(numero, "merc_no", {}); };
      }
      return { ok: true };
    }
    if (o.status !== "confirmed") return cambio;
    if (paso === "mandar") {
      if (o.detail !== "preparando" && o.detail !== "pesado") return cambio;
      const f = (await c.query<{ sin: number; prop: number }>(
        `select count(*) filter (where l.weight_est is not null and l.status = 'ok' and l.weight_final is null)::int as sin,
                (select count(*)::int from change_proposals cp where cp.operation_id = $1::bigint and cp.kind = 'items' and cp.status = 'open') as prop
           from operation_lines l where l.operation_id = $1::bigint`, [o.id])).rows[0]!;
      if (f.sin) return no(`Falta pesar ${f.sin} ${f.sin === 1 ? "artículo" : "artículos"} con su foto.`, `${f.sin} ${f.sin === 1 ? "item still needs" : "items still need"} weighing with a photo.`);
      if (f.prop) return no("Espera la respuesta del cliente al cambio (10 min).", "Wait for the customer’s answer to the swap (10 min).");
      const t = await totales(c, o.id);
      if (o.pay === "app" && t.real > t.ret) return no(`El total real (${money(t.real)}) pasa lo retenido (${money(t.ret)}). Corta menos: sin su OK no se cobra más.`, `The real total (${money(t.real)}) is over the hold (${money(t.ret)}). Cut less: without their OK no more is charged.`);
      await c.query(`update operations set status_detail = 'pesado', details = details || jsonb_build_object('weighed_at', now()), updated_at = now() where id = $1::bigint`, [o.id]);
      await ev(c, o.id, "weighed", "member", actorId, { es: `Pesado · total real ${money(t.real)}`, en: `Weighed · real total ${money(t.real)}` });
      despues = () => avisar(numero, "merc_pesado", { monto: money(t.real) });
      return { ok: true };
    }
    if (paso === "listo") {
      if (o.detail !== "pesado") return no("Primero manda el peso al cliente.", "First send the weight to the customer.");
      const d = o.mode === "delivery" ? "camino" : "listo";
      await c.query(`update operations set status_detail = $2, stage = $3, ready_at = now(), updated_at = now() where id = $1::bigint`, [o.id, d, d === "camino" ? "on_the_way" : "ready"]);
      await ev(c, o.id, d === "camino" ? "on_the_way" : "ready", "member", actorId, d === "camino" ? { es: "Va en camino", en: "On the way" } : { es: "Listo para recoger", en: "Ready for pickup" });
      despues = () => avisar(numero, d === "camino" ? "merc_camino" : "merc_listo", {});
      return { ok: true };
    }
    if (o.detail !== "listo" && o.detail !== "camino") return no("Primero márcalo listo.", "Mark it ready first.");
    await c.query(`update operations set status = 'done', status_detail = 'done', stage = $2, done_at = now(), updated_at = now() where id = $1::bigint`, [o.id, o.mode === "delivery" ? "delivered" : "picked_up"]);
    await ev(c, o.id, o.mode === "delivery" ? "delivered" : "picked_up", "member", actorId, o.mode === "delivery" ? { es: "Entregado", en: "Delivered" } : { es: "Lo recogió", en: "Picked up" });
    // Si el cliente no tocó «Está bien», se cobra lo real al recoger o entregar (nunca más de lo retenido).
    despues = async () => { await liquidarMercado(o.id); };
    return { ok: true };
  });
  if (r.ok && despues) await (despues as () => Promise<void>)();
  return r;
}

/* Pesar una línea: peso real + foto de la balanza (subida por quien pesa). La base calcula lo que se cobra. */
export async function pesarLinea(negocio: string, numero: string, linea: string, lb: number, foto: string, actorId: string): Promise<ResM> {
  if (!NUM.test(numero) || !ID.test(String(linea))) return no("Esa línea no existe.", "That line does not exist.");
  if (!UUID.test(String(foto))) return no("Toma la foto de la balanza.", "Take the photo of the scale.");
  const w = Math.round(Number(lb) * 100) / 100;
  if (!(w > 0 && w <= 300)) return no("Escribe el peso en libras.", "Write the weight in pounds.");
  return tx(async (c): Promise<ResM> => {
    const o = await opDe(c, numero, { negocio }, true);
    if (!o || o.status !== "confirmed" || !["preparando", "pesado"].includes(o.detail ?? "") || o.det.approved_at) return no("Este pedido ya no se puede pesar.", "This order can no longer be weighed.");
    const l = (await c.query<{ est: number; name: string }>(`select weight_est::float as est, name->>'es' as name from operation_lines where id = $1::bigint and operation_id = $2::bigint and status = 'ok' and weight_est is not null for update`, [linea, o.id])).rows[0];
    if (!l) return no("Esa línea no se pesa.", "That line is not weighed.");
    if (w > l.est * 3) return no(`Pidieron ${l.est} lb: el peso no puede pasar de ${l.est * 3} lb.`, `They asked for ${l.est} lb: the weight cannot exceed ${l.est * 3} lb.`);
    const m = await c.query(`update media set owner_kind = 'line', owner_id = $1 where id = $2::uuid and uploaded_by = $3 and owner_kind in ('user', 'line') and status = 'visible'`, [linea, foto, actorId]);
    if (!m.rowCount) return no("Vuelve a tomar la foto de la balanza.", "Take the scale photo again.");
    await c.query(`update operation_lines set weight_final = $2, weigh_photo_id = $3::uuid where id = $1::bigint`, [linea, w, foto]);
    await ev(c, o.id, "line_weighed", "member", actorId, { es: `${l.name}: pidió ${l.est} lb · pesó ${w} lb`, en: `${l.name}: asked ${l.est} lb · weighed ${w} lb` });
    return { ok: true };
  });
}

/* «No hay»: se quita (no se cobra) o se propone un sustituto del mismo mercado que el cliente acepta en 10 min. */
export async function noHay(negocio: string, numero: string, linea: string, sustituto: string | null, actorId: string): Promise<ResM> {
  if (!NUM.test(numero) || !ID.test(String(linea)) || (sustituto != null && !ID.test(String(sustituto)))) return no("Esa línea no existe.", "That line does not exist.");
  let aviso: Record<string, string> | null = null;
  const r = await tx(async (c): Promise<ResM> => {
    const o = await opDe(c, numero, { negocio }, true);
    if (!o || o.status !== "confirmed" || !["preparando", "pesado"].includes(o.detail ?? "") || o.det.approved_at) return no("Este pedido ya no se puede cambiar.", "This order can no longer be changed.");
    const l = (await c.query<{ name: Bi; q: number; peso: boolean; item: string | null }>(`select name, qty as q, weight_est is not null as peso, item_id::text as item from operation_lines where id = $1::bigint and operation_id = $2::bigint and status = 'ok' and sub_of is null for update`, [linea, o.id])).rows[0];
    if (!l) return no("Esa línea ya no está.", "That line is gone.");
    await c.query(`update operation_lines set status = 'out', weight_final = null, weigh_photo_id = null where id = $1::bigint`, [linea]);
    if (sustituto) {
      const s = (await c.query<{ name: Bi; cents: number; tax: number; k: string }>(
        `select name, price_cents as cents, tax_pct::float as tax, coalesce(shop_kind, 'unid') as k from items where id = $1::bigint and business_id = $2 and module = 'shop' and removed_at is null and status = 'live' and sell and not in_store_only and age_min = 0`, [sustituto, negocio])).rows[0];
      if (!s || sustituto === l.item) return no("Ese producto no se puede ofrecer.", "That product cannot be offered.");
      if (s.k === "peso") return no("Por ahora el sustituto tiene que ser por unidad (con precio del estante).", "For now the substitute has to be sold by unit (shelf price).");
      await c.query(`insert into change_proposals (operation_id, kind, proposed, side, respond_by, created_by, line_id) values ($1::bigint, 'items', $2::jsonb, 'customer', now() + interval '10 minutes', $3, $4::bigint)`,
        [o.id, JSON.stringify({ item: sustituto, name: { es: s.name.es, en: s.name.en || s.name.es }, cents: s.cents, q: l.peso ? 1 : l.q, tax: s.tax }), actorId, linea]);
      await ev(c, o.id, "sub_proposed", "member", actorId, { es: `No hay ${l.name.es}: proponen ${s.name.es} (${money(s.cents)})`, en: `Out of ${l.name.en || l.name.es}: proposing ${s.name.en || s.name.es} (${money(s.cents)})` });
      aviso = { articulo: l.name.es, sustituto: `${s.name.es} ${money(s.cents)}` };
    } else await ev(c, o.id, "line_out", "member", actorId, { es: `No hay ${l.name.es}: se quita y no se cobra`, en: `Out of ${l.name.en || l.name.es}: removed and not charged` });
    return { ok: true };
  });
  if (r.ok && aviso) await avisar(numero, "merc_sust", aviso);
  return r;
}

/* Lo que quedó a medias (la pasarela falló): retenido de un pedido que no se dio → liberar; terminado sin cobrar → liquidar. */
export async function repararMercado(negocio: string) {
  const L = (await db().query<{ op: string; st: string }>(
    `select p.operation_id::text as op, o.status as st from payments p join operations o on o.id = p.operation_id
      where p.business_id = $1 and p.status = 'held' and o.kind = 'market_order' and o.status in ('declined', 'expired', 'cancelled', 'done') limit 20`, [negocio])).rows;
  for (const x of L) { if (x.st === "done") await liquidarMercado(x.op); else await liberarOperacion(x.op); }
}

/* Avisos (al cliente con enlace a su pedido; al negocio con enlace al detalle). */
async function avisar(numero: string, tpl: string, extra: Record<string, string>) {
  const { avisar: a, avisarNegocio } = await import("./avisos");
  const o = (await db().query<{ uid: string; biz: string; negocio: string; cliente: string | null }>(
    `select o.user_id::text as uid, b.id as biz, b.name as negocio, u.first_name as cliente from operations o join businesses b on b.id = o.business_id join users u on u.id = o.user_id where o.number = $1`, [numero])).rows[0];
  if (!o) return;
  if (tpl.startsWith("biz_")) await avisarNegocio(o.biz, tpl, { cliente: o.cliente ?? "", num: numero, ...extra }, { href: `/panel/${o.biz}/hoy?det=merc:${numero}`, ref: ["order", numero] });
  else await a(o.uid, tpl, { negocio: o.negocio, num: numero, ...extra }, { href: `/mercado/${numero}`, ref: ["order", numero] });
}
