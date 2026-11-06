import "server-only";
import type { QueryResult, QueryResultRow } from "pg";
import { db } from "./db";
import type { Lang } from "./idioma";
import { AGOTADO_SQL, QUEDAN_SQL, type Av } from "./menu";
import { ITEMS_FREE, TOPE_FREE } from "./plan";

/* El menú que ve el cliente (pestaña Menú de la ficha, Resumen · menú y checkout) y las reglas del pedido de Comida
   con pago en el local (Fase 2 · bloque 2b). El servidor decide todo: qué se ve, qué se puede pedir, a qué precio,
   cuándo está listo. La pantalla solo muestra; al enviar, el servidor vuelve a calcular y validar cada línea. */

type Bi = { es: string; en: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Q = { query: <R extends QueryResultRow = any>(text: string, values?: unknown[]) => Promise<QueryResult<R>> };
const tx = (x: Partial<Bi> | null | undefined, es: boolean) => ((es ? x?.es : x?.en || x?.es) ?? "").trim();
const hm2m = (hm: string) => { const [h = 0, m = 0] = hm.split(":").map(Number); return h * 60 + m; };
export const hora = (m: number) => { m = ((Math.round(m) % 1440) + 1440) % 1440; const h = Math.floor(m / 60), mm = m % 60; return `${h % 12 || 12}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
const horaCorta = (m: number) => { m = ((m % 1440) + 1440) % 1440; const h = Math.floor(m / 60), mm = m % 60; return `${h % 12 || 12}${mm ? `:${String(mm).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`; };
const DN = [["DOM", "SUN"], ["LUN", "MON"], ["MAR", "TUE"], ["MIÉ", "WED"], ["JUE", "THU"], ["VIE", "FRI"], ["SÁB", "SAT"]] as const;
const diasL = (d: number[], es: boolean) => {
  const S = [...d].sort().join();
  return S === "0,1,2,3,4,5,6" ? "" : S === "1,2,3,4,5" ? (es ? "LUN–VIE" : "MON–FRI") : S === "0,6" ? (es ? "SÁB Y DOM" : "SAT AND SUN")
    : [1, 2, 3, 4, 5, 6, 0].filter((z) => d.includes(z)).map((z) => DN[z]![es ? 0 : 1]).join(" · ");
};
/* Horario propio de un plato o su categoría (Panel · Menú): fuera de la ventana = no se puede pedir; la etiqueta como el
   prototipo (TLMenu.hrs): otro día → los días; antes → DESDE; durante, si termina antes de medianoche → HASTA. */
function ventana(av: Av | null, dow: number, now: number, es: boolean): { off: boolean; l: string | null; hasta: number | null } | null {
  if (!av || !Array.isArray(av.d)) return null;
  const inDay = av.d.includes(dow), off = !inDay || now < av.f || now >= av.t;
  const l = !inDay ? diasL(av.d, es) : now < av.f ? `${es ? "DESDE" : "FROM"} ${horaCorta(av.f)}` : av.t < 1440 ? `${es ? "HASTA" : "UNTIL"} ${horaCorta(av.t)}` : null;
  return { off, l: l || null, hasta: inDay && av.t < 1440 ? av.t : null };
}

export type PItem = {
  id: string; sec: string; name: string; desc: string; cents: number; tax: number; img: string | null; tags: string[]; grp: string[];
  ago: boolean; left: number | null; maxQ: number; extra: number; nosell: boolean; chOff: boolean; hrsOff: boolean; hrsL: string | null; hasta: number | null;
};
export type PGrp = { id: string; name: string; req: boolean; max: number; o: { l: string; k: string; cents: number; off: boolean }[] };
export type PSec = { id: string; name: string; note: string; items: string[] };
export type PSlot = { v: string; l: string };
export type PEstado = {
  canOrd: boolean; later: boolean; closed: boolean; closedT: string; closedS: string; readyMin: number; now: number; openAt: number | null;
  sched: boolean; slots: PSlot[]; free: boolean; freeLeft: number | null; low: number; dia: string;
};
export type MenuPublico = {
  negocio: { id: string; nombre: string; direccion: string | null; telefono: string | null; pickupNote: string; lat: number | null; lng: number | null; pro: boolean };
  secs: PSec[]; items: Record<string, PItem>; grps: Record<string, PGrp>; pop: string[]; estado: PEstado; desde: number; vacio: boolean;
};

type Base = {
  id: string; name: string; cat: string; plan: string; address: string | null; phone: string | null; lat: number | null; lng: number | null; city: string;
  tz: string; dow: number; hm: string; hoy: string; mes: string; open: boolean; cerrado: boolean; off: Record<string, { reason?: string }>; mods: string[];
  last_min: number; pause_until: string | null; busy_min: number; low_alert: number;
  pickup: boolean; pay_cash_pickup: boolean; pay_card: boolean; prep_min: number; scheduled_orders: boolean; auto_accept: boolean; pickup_note: Bi | null;
};

async function base(c: Q, negocio: string) {
  const r = await c.query<Base>(
    `select b.id, b.name, b.category_id as cat, s.plan, b.address, b.phone, st_y(b.geo::geometry) as lat, st_x(b.geo::geometry) as lng, b.city_id as city,
            ci.timezone as tz, extract(dow from now() at time zone ci.timezone)::int as dow, to_char(now() at time zone ci.timezone, 'HH24:MI') as hm,
            (now() at time zone ci.timezone)::date::text as hoy, to_char(now() at time zone ci.timezone, 'YYYY-MM') as mes,
            negocio_abierto(b.id, now() at time zone ci.timezone) as open,
            coalesce(b.closed_on = (now() at time zone ci.timezone)::date, false) or coalesce(b.temp_closed_until > now(), false) as cerrado,
            b.modules_off as off, b.modules_on as mods,
            coalesce(ms.last_min, 15) as last_min, case when ms.pause_until > now() then ms.pause_until::text end as pause_until,
            coalesce(ms.busy_min, 0) as busy_min, coalesce(ms.low_alert, 3) as low_alert,
            coalesce(ds.pickup, true) as pickup, coalesce(ds.pay_cash_pickup, true) as pay_cash_pickup, coalesce(ds.pay_card, false) as pay_card,
            coalesce(ds.prep_min, 20) as prep_min, coalesce(ds.scheduled_orders, true) as scheduled_orders, coalesce(ds.auto_accept, false) as auto_accept,
            ds.pickup_note
       from businesses b join business_stats_cache s on s.business_id = b.id join cities ci on ci.id = b.city_id
       left join menu_settings ms on ms.business_id = b.id left join delivery_settings ds on ds.business_id = b.id
      where b.id = $1 and b.status = 'active'`,
    [negocio],
  );
  return r.rows[0] ?? null;
}

/* Rangos de hoy en minutos (el que pasa de medianoche termina después de 1440) y el de ayer que sigue abierto. */
async function rangosHoy(c: Q, negocio: string, dow: number) {
  const r = await c.query<{ weekday: number; open: boolean; ranges: [string, string][] }>(
    `select weekday, open, ranges from business_hours where business_id = $1 and module = '' and weekday in ($2, ($2 + 6) % 7)`, [negocio, dow]);
  const hoy = r.rows.find((d) => d.weekday === dow), ayer = r.rows.find((d) => d.weekday === (dow + 6) % 7);
  const R: [number, number][] = [];
  for (const [a, b] of ayer?.open ? ayer.ranges : []) { const A = hm2m(a), B = hm2m(b); if (B <= A && B > 0) R.push([0, B]); }
  for (const [a, b] of hoy?.open ? hoy.ranges : []) { const A = hm2m(a), B = hm2m(b); R.push([A, B <= A ? B + 1440 : B]); }
  return R.sort((x, y) => x[0] - y[0]);
}

const mitad = (m: number) => Math.ceil(m / 30) * 30;

/* Estado de los pedidos en línea ahora (prototipo menuVals: later, shut, canOrd, closedT/closedS). */
function calcEstado(b: Base, R: [number, number][], usados: number, cap: number, es: boolean): PEstado {
  const E2 = (x: string, y: string) => (es ? x : y), now = hm2m(b.hm), pro = b.plan === "pro";
  const free = !pro, freeLeft = pro ? null : Math.max(0, cap - usados), planOk = pro || (freeLeft ?? 0) > 0;
  const actual = b.open ? R.find(([a, z]) => a <= now && now < z) : undefined;
  const sig = !b.open && !b.cerrado ? R.find(([a]) => a > now) : undefined;
  // Pedidos en línea: el módulo encendido por el negocio, no pausado por To'Latino y con una forma de pagar el pickup.
  const ordOff = !b.mods.includes("pedidos") || !!b.off.pedidos || !(b.pickup && (b.pay_cash_pickup || b.pay_card));
  const paused = !!b.pause_until;
  const later = planOk && !ordOff && b.scheduled_orders && !!sig;
  const shut = !b.open && !later;
  const lastAt = actual && b.last_min ? actual[1] - b.last_min : null;
  const tarde = lastAt != null && now >= lastAt;
  const canOrd = planOk && !shut && !paused && !ordOff && !tarde;
  const readyMin = b.prep_min + b.busy_min;
  const pausa = b.pause_until ? new Date(b.pause_until).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: b.tz }) : "";
  let closedT = "", closedS = "";
  if (!planOk) { /* Free sin pedidos este mes: la ficha ofrece Llamar (no hay aviso en el menú). */ }
  else if (ordOff) { closedT = E2("Sin pedidos en línea", "No online orders"); closedS = E2("Puedes ver el menú. Para pedir, llama o pasa por el local.", "You can browse the menu. To order, call or stop by."); }
  else if (paused) { closedT = E2("Pedidos en línea en pausa", "Online orders paused"); closedS = E2(`Puedes ver el menú. ${b.name} vuelve a tomar pedidos a las ${pausa}.`, `You can browse the menu. ${b.name} takes orders again at ${pausa}.`); }
  else if (!b.open && sig && !b.scheduled_orders) { closedT = E2(`Abre a las ${hora(sig[0])}`, `Opens at ${hora(sig[0])}`); closedS = E2(`Puedes ver el menú. ${b.name} no toma pedidos programados: pide cuando abra.`, `You can browse the menu. ${b.name} does not take scheduled orders: order when they open.`); }
  else if (shut) { closedT = E2("Cerrado hoy", "Closed today"); closedS = E2(`Puedes ver el menú. Los pedidos se abren cuando ${b.name} abra.`, `You can browse the menu. Ordering opens when ${b.name} opens.`); }
  else if (later && sig) { closedT = E2(`Abre a las ${hora(sig[0])}`, `Opens at ${hora(sig[0])}`); closedS = E2("Programa tu pedido desde ahora: sale a la hora que elijas.", "Schedule your order now: it goes out at the time you choose."); }
  else if (tarde) { closedT = E2("Ya no toma pedidos en línea hoy", "No more online orders today"); closedS = E2("Puedes ver el menú. Para pedir, llama o pasa por el local.", "You can browse the menu. To order, call or stop by."); }
  // Programar para hoy (cada 30 min): abierto → desde una hora después; antes de abrir → desde 30 min después de abrir; hasta una hora antes de cerrar.
  const slots: PSlot[] = [];
  if (canOrd && b.scheduled_orders) {
    for (const [a, z] of R) {
      if (z <= now) continue;
      for (let m = later && a > now ? mitad(a + 30) : mitad(Math.max(a, now) + 60); m <= z - 60 && m < 1440; m += 30) slots.push({ v: `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`, l: hora(m) });
    }
  }
  const dia = new Date(`${b.hoy}T12:00:00`).toLocaleDateString(es ? "es-US" : "en-US", { weekday: "long", day: "numeric", month: "short" });
  return { canOrd: canOrd && (!later || slots.length > 0), later, closed: !!closedT, closedT, closedS, readyMin, now, openAt: sig?.[0] ?? null, sched: b.scheduled_orders, slots, free, freeLeft, low: b.low_alert, dia };
}

async function topeFree(c: Q, negocio: string, mes: string) {
  const r = await c.query<{ cap: number; usados: number }>(
    `select coalesce((select (value #>> '{}')::int from platform_config where key = 'free_ops_cap'), $3) as cap,
            (select count(*)::int from operations where business_id = $1 and free_quota_month = $2) as usados`, [negocio, mes, TOPE_FREE]);
  return r.rows[0] ?? { cap: TOPE_FREE, usados: 0 };
}

type FilaItem = {
  id: string; sec: string; name: Bi; desc: Bi; cents: number; tax: number; photos: string[]; sell: boolean; ch: string[]; agotado: boolean; stk: string; quedan: number;
  maxQ: number; tags: string[]; extra: number; feat: boolean; avail: string; av: Av | null; grp: string[]; sec_avail: string; sec_av: Av | null;
};
async function filas(c: Q, negocio: string, tz: string, lock = false) {
  const tzq = `(select c.timezone from cities c join businesses b on b.city_id = c.id where b.id = $1)`;
  const qS = () => c.query<{ id: string; name: Bi; avail: string; av: Av | null }>(
      `select id::text, name, avail, av from item_sections where business_id = $1 and module = 'menu' and removed_at is null and visible order by sort, id`, [negocio]);
  const qI = () => c.query<FilaItem>(
      `select i.id::text, i.section_id::text as sec, i.name, i.descr as "desc", i.price_cents as cents, i.tax_pct::float as tax, i.photos, i.sell, i.channels as ch,
              ${AGOTADO_SQL("i", tzq)} as agotado, i.stock_mode as stk, ${QUEDAN_SQL("i", tzq)} as quedan, i.max_qty as "maxQ", i.tags, i.extra_min as extra,
              i.featured as feat, i.avail, i.av, array(select x::text from unnest(i.group_ids) x) as grp, s.avail as sec_avail, s.av as sec_av
         from items i join item_sections s on s.id = i.section_id and s.removed_at is null and s.visible
        where i.business_id = $1 and i.module = 'menu' and i.removed_at is null and i.status = 'live'
        order by s.sort, s.id, i.sort, i.id${lock ? " for update of i" : ""}`, [negocio]);
  const qG = () => c.query<{ id: string; name: Bi; required: boolean; max_pick: number; options: { es: string; en: string; cents: number; on: boolean }[] }>(
      `select id::text, name, required, max_pick, options from option_groups where business_id = $1 and removed_at is null`, [negocio]);
  // Con un cliente de transacción (lock) van en fila: nunca dos consultas a la vez sobre el mismo cliente.
  const [s, i, g] = lock ? [await qS(), await qI(), await qG()] : await Promise.all([qS(), qI(), qG()]);
  return { s: s.rows, i: i.rows, g: g.rows, tz };
}

/* Arma el menú público. `ref` = minuto de referencia para los horarios propios (ahora, o la hora en que abre). */
function armar(b: Base, F: Awaited<ReturnType<typeof filas>>, est: PEstado, es: boolean) {
  const ref = est.later && est.openAt != null ? est.openAt : est.now;
  const grps: Record<string, PGrp> = {};
  for (const g of F.g) {
    const o = (Array.isArray(g.options) ? g.options : []).map((x) => ({ l: tx(x, es), k: x.es, cents: Math.max(0, Math.round(+x.cents || 0)), off: !x.on }));
    if (o.length) grps[g.id] = { id: g.id, name: tx(g.name, es), req: g.required, max: Math.max(1, g.max_pick), o };
  }
  const secsAll = F.s.map((s) => {
    const w = s.avail === "own" ? ventana(s.av, b.dow, ref, es) : null;
    return { id: s.id, name: tx(s.name, es), note: w?.l ?? "", items: [] as string[] };
  });
  const items: Record<string, PItem> = {};
  for (const i of F.i) {
    const sec = secsAll.find((s) => s.id === i.sec);
    if (!sec) continue;
    const own = i.avail === "own" ? ventana(i.av, b.dow, ref, es) : i.avail === "siempre" ? null : i.sec_avail === "own" ? ventana(i.sec_av, b.dow, ref, es) : null;
    const grp = i.grp.filter((k) => grps[k]);
    const reqAgotado = grp.some((k) => grps[k]!.req && grps[k]!.o.every((o) => o.off));
    items[i.id] = {
      id: i.id, sec: i.sec, name: tx(i.name, es), desc: tx(i.desc, es), cents: i.cents, tax: i.tax, img: i.photos[0] ?? null, tags: i.tags, grp,
      ago: i.agotado || (i.stk !== "none" && i.quedan <= 0) || reqAgotado, left: i.stk !== "none" ? Math.max(0, i.quedan) : null, maxQ: i.maxQ, extra: i.extra,
      nosell: !i.sell, chOff: !i.ch.includes("pick"), hrsOff: !!own?.off, hrsL: i.avail === "own" ? own?.l ?? null : null, hasta: own?.hasta ?? null,
    };
    sec.items.push(i.id);
  }
  let secs = secsAll.filter((s) => s.items.length);
  // Free: se ven 5 platos en la página (los primeros del menú, en su orden).
  if (b.plan !== "pro") {
    const cinco = new Set(secs.flatMap((s) => s.items).slice(0, ITEMS_FREE));
    secs = secs.map((s) => ({ ...s, items: s.items.filter((id) => cinco.has(id)) })).filter((s) => s.items.length);
    for (const k of Object.keys(items)) if (!cinco.has(k)) delete items[k];
  }
  const visibles = secs.flatMap((s) => s.items);
  const pop = F.i.filter((i) => i.feat && items[i.id]).map((i) => i.id);
  const precios = visibles.map((id) => items[id]!.cents);
  return { secs, items, grps, pop, desde: precios.length ? Math.min(...precios) : 0, vacio: !visibles.length };
}

/* Menú para la ficha y el checkout. null = no es Comida, no está activo, el negocio no encendió el Menú o To'Latino lo pausó. */
export async function menuPublico(negocio: string, lang: Lang): Promise<MenuPublico | null> {
  const es = lang === "es";
  const b = await base(db(), negocio);
  if (!b || b.cat !== "NEG-FOOD" || !b.mods.includes("menu") || b.off.menu) return null;
  const [R, tope, F] = await Promise.all([rangosHoy(db(), negocio, b.dow), topeFree(db(), negocio, b.mes), filas(db(), negocio, b.tz)]);
  const est = calcEstado(b, R, tope.usados, tope.cap, es);
  const m = armar(b, F, est, es);
  return {
    negocio: { id: b.id, nombre: b.name, direccion: b.address, telefono: b.phone, pickupNote: tx(b.pickup_note, es), lat: b.lat, lng: b.lng, pro: b.plan === "pro" },
    ...m, estado: est,
  };
}

/* ── Enviar el pedido ── */

export type LineaIn = { item: string; ch: Record<string, number[]>; k?: Record<string, string[]>; q: number; nota?: string };
export type PedidoIn = { negocio: string; lineas: LineaIn[]; cuando: string; nota?: string; clave: string };
export type PedidoOut = { ok: true; numero: string } | { ok: false; msg: Bi; entrar?: true; perfil?: true; menu?: true };

const ID = /^\d{1,18}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const no = (es: string, en: string, x: Partial<Extract<PedidoOut, { ok: false }>> = {}): PedidoOut => ({ ok: false, msg: { es, en }, ...x });

export async function crearPedido(userId: string, p: PedidoIn, entorno: string): Promise<PedidoOut> {
  if (!p || typeof p.negocio !== "string" || !/^[a-z0-9-]{1,80}$/.test(p.negocio)) return no("Ese negocio no existe.", "That business does not exist.");
  if (typeof p.clave !== "string" || !UUID.test(p.clave)) return no("No se pudo enviar. Prueba de nuevo.", "Could not send. Try again.");
  const lineas = Array.isArray(p.lineas) ? p.lineas : [];
  if (!lineas.length) return no("Tu pedido está vacío.", "Your order is empty.");
  if (lineas.length > 40) return no("Tu pedido tiene demasiadas líneas.", "Your order has too many lines.");
  const cuando = typeof p.cuando === "string" ? p.cuando : "asap";
  if (cuando !== "asap" && !/^\d{2}:\d{2}$/.test(cuando)) return no("Elige cuándo lo recoges.", "Pick when you pick it up.");
  const notaCliente = typeof p.nota === "string" ? p.nota.trim().slice(0, 200) : "";

  const c = await db().connect();
  try {
    await c.query("begin");
    // Un pedido a la vez por negocio: el techo Free y el inventario no se pasan aunque lleguen dos al mismo tiempo.
    await c.query(`select pg_advisory_xact_lock(hashtext('pedido:' || $1))`, [p.negocio]);
    const ya = await c.query<{ number: string }>(`select number from operations where user_id = $1 and client_key = $2`, [userId, p.clave]);
    if (ya.rows[0]) { await c.query("rollback"); return { ok: true, numero: ya.rows[0].number }; }
    const pend = await c.query<{ n: number }>(`select count(*)::int as n from operations where user_id = $1 and status = 'pending' and respond_by > now()`, [userId]);
    if ((pend.rows[0]?.n ?? 0) >= 3) { await c.query("rollback"); return no("Tienes 3 pedidos esperando respuesta. Espera a que te contesten.", "You have 3 orders waiting for a reply. Wait for an answer."); }

    const b = await base(c, p.negocio);
    if (!b || b.cat !== "NEG-FOOD" || !b.mods.includes("menu") || b.off.menu) { await c.query("rollback"); return no("Este negocio no toma pedidos en línea.", "This business does not take online orders."); }
    // Una conexión en transacción: las consultas van una tras otra (nunca en paralelo sobre el mismo cliente).
    const R = await rangosHoy(c, b.id, b.dow), tope = await topeFree(c, b.id, b.mes), F = await filas(c, b.id, b.tz, true);
    const est = calcEstado(b, R, tope.usados, tope.cap, true);
    if (!est.canOrd) { await c.query("rollback"); return no(est.closedT ? `${est.closedT}.` : "Este negocio no toma más pedidos en línea este mes. Llama para pedir.", est.closedT ? "Online ordering is not available right now." : "This business takes no more online orders this month. Call to order."); }
    let refMin = est.now, programado: number | null = null;
    if (cuando === "asap") { if (est.later) { await c.query("rollback"); return no("Elige la hora: el negocio todavía no abre.", "Pick a time: the business is not open yet."); } }
    else {
      const s = est.slots.find((x) => x.v === cuando);
      if (!s) { await c.query("rollback"); return no("Esa hora ya no está disponible. Elige otra.", "That time is no longer available. Pick another."); }
      programado = hm2m(cuando); refMin = programado;
    }
    const m = armar(b, F, { ...est, later: false, now: refMin }, true);
    const filasPorId = new Map(F.i.map((i) => [i.id, i]));
    const cuenta = new Map<string, number>();
    const L: { it: FilaItem; name: Bi; q: number; unit: number; tax: number; ops: { g: Bi; o: Bi; cents: number }[]; nota: string }[] = [];
    let extra = 0;
    for (const l of lineas) {
      const id = String(l?.item ?? "");
      const it = ID.test(id) ? m.items[id] : undefined, fila = filasPorId.get(id);
      if (!it || !fila) { await c.query("rollback"); return no("Un plato de tu pedido ya no está en el menú. Revisa tu pedido.", "A dish in your order is no longer on the menu. Check your order.", { menu: true }); }
      const nom = fila.name.es;
      const q = Math.floor(+l.q);
      if (!(q >= 1 && q <= 20)) { await c.query("rollback"); return no(`Revisa la cantidad de «${nom}».`, `Check the quantity of “${fila.name.en || nom}”.`); }
      if (it.ago || it.nosell || it.chOff || it.hrsOff) { await c.query("rollback"); return no(`«${nom}» no está disponible ${programado != null ? "a esa hora" : "ahora"}. Quítalo de tu pedido.`, `“${fila.name.en || nom}” is not available ${programado != null ? "at that time" : "now"}. Remove it from your order.`, { menu: true }); }
      const ch = l.ch && typeof l.ch === "object" ? l.ch : {};
      const ops: { g: Bi; o: Bi; cents: number }[] = [];
      for (const gk of Object.keys(ch)) if (!it.grp.includes(gk)) { await c.query("rollback"); return no("El menú cambió. Revisa tu pedido.", "The menu changed. Check your order.", { menu: true }); }
      for (const gk of it.grp) {
        const g = m.grps[gk]!, sel = Array.isArray(ch[gk]) ? [...new Set(ch[gk]!.map(Number))] : [];
        const gF = F.g.find((x) => x.id === gk)!;
        if (sel.length > g.max || (g.req && !sel.length)) { await c.query("rollback"); return no(`Elige ${g.req ? "" : "hasta "}${g.max === 1 ? "una opción" : `${g.max} opciones`} en «${gF.name.es}» de «${nom}».`, `Choose ${g.req ? "" : "up to "}${g.max === 1 ? "one option" : `${g.max} options`} in “${gF.name.en || gF.name.es}” for “${fila.name.en || nom}”.`); }
        const claves = l.k && Array.isArray(l.k[gk]) ? l.k[gk]! : null;
        for (const [n, ix] of sel.entries()) {
          const o = g.o[ix];
          if (!Number.isInteger(ix) || !o || (claves && claves[n] !== o.k)) { await c.query("rollback"); return no("El menú cambió. Revisa tu pedido.", "The menu changed. Check your order.", { menu: true }); }
          if (o.off) { await c.query("rollback"); return no(`«${o.k}» se agotó. Cambia la opción de «${nom}».`, `“${o.k}” sold out. Change the option for “${fila.name.en || nom}”.`, { menu: true }); }
          const oF = gF.options[ix]!;
          ops.push({ g: gF.name, o: { es: oF.es, en: oF.en || oF.es }, cents: o.cents });
        }
      }
      const total = (cuenta.get(id) ?? 0) + q;
      const cap = Math.min(it.left ?? 99, it.maxQ || 99);
      if (total > cap) { await c.query("rollback"); return no(it.maxQ && it.maxQ === cap ? `«${nom}»: máximo ${cap} por pedido.` : `«${nom}»: solo quedan ${cap}.`, it.maxQ && it.maxQ === cap ? `“${fila.name.en || nom}”: up to ${cap} per order.` : `“${fila.name.en || nom}”: only ${cap} left.`, { menu: true }); }
      cuenta.set(id, total);
      extra = Math.max(extra, it.extra);
      L.push({ it: fila, name: { es: nom, en: fila.name.en || nom }, q, unit: fila.cents + ops.reduce((a, o) => a + o.cents, 0), tax: fila.tax, ops, nota: typeof l.nota === "string" ? l.nota.trim().slice(0, 200) : "" });
    }
    // Un plato con horario que termina antes de la hora programada no puede ir programado después.
    if (programado != null) for (const x of L) { const h = m.items[x.it.id]!.hasta; if (h != null && programado > h - 30) { await c.query("rollback"); return no(`«${x.name.es}» se sirve hasta las ${hora(h)}: programa hasta las ${hora(h - 30)}.`, `“${x.name.en}” is served until ${hora(h)}: schedule up to ${hora(h - 30)}.`); } }

    const sub = L.reduce((a, x) => a + x.unit * x.q, 0);
    const tax = Math.round(L.reduce((a, x) => a + (x.unit * x.q * x.tax) / 100, 0));
    const total = sub + tax;
    const listoMin = programado ?? est.now + est.readyMin + extra;
    const auto = b.auto_accept && b.open && !b.pause_until && programado == null;
    const num = (await c.query<{ n: string }>(`select nextval('operations_order_seq')::text as n`)).rows[0]!.n;
    const op = await c.query<{ id: string }>(
      `insert into operations (number, kind, city_id, business_id, user_id, status, stage, mode, scheduled_at, ready_at, customer_note, subtotal_cents, tax_cents, total_cents,
                               pay_mode, respond_by, confirmed_at, answered_at, free_quota_month, client_key, is_test, details)
       values ($1, 'order', $2, $3, $4, $5, $6, 'pickup',
               case when $7::int is null then null else ($8::date + make_interval(mins => $7::int)) at time zone $9 end,
               ($8::date + make_interval(mins => $10::int)) at time zone $9, nullif($11, ''), $12, $13, $14, 'local',
               now() + interval '10 minutes', case when $5 = 'confirmed' then now() end, case when $5 = 'confirmed' then now() end, $15, $16, $17, $18::jsonb)
       returning id::text`,
      [num, b.city, b.id, userId, auto ? "confirmed" : "pending", auto ? "accepted" : "sent", programado, b.hoy, b.tz, listoMin, notaCliente, sub, tax, total,
        b.plan === "pro" ? null : b.mes, p.clave, entorno !== "produccion", JSON.stringify({ pickupNote: b.pickup_note ?? null, address: b.address })],
    );
    const opId = op.rows[0]!.id;
    for (const x of L) {
      await c.query(
        `insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct, options, instructions)
         values ($1, $2, $3::jsonb, $4, $5, $6, $7, $8::jsonb, nullif($9, ''))`,
        [opId, x.it.id, JSON.stringify(x.name), x.q, x.unit, x.unit * x.q, x.tax, JSON.stringify(x.ops), x.nota]);
    }
    // Inventario (Panel · Menú · Inventario): el pedido enviado descuenta lo que se cuenta; en 0 queda agotado solo.
    for (const [id, q] of cuenta) {
      const f = filasPorId.get(id)!;
      if (f.stk === "none") continue;
      await c.query(
        `update items set stock_left = greatest(0, $2::int - $3::int), stock_day = case when stock_mode = 'day' then (now() at time zone $4 - interval '6 hours')::date else stock_day end, updated_at = now()
          where id = $1::bigint`, [id, f.quedan, q, b.tz]);
    }
    await c.query(`insert into operation_events (operation_id, kind, actor, actor_id) values ($1, 'sent', 'user', $2)`, [opId, userId]);
    if (auto) await c.query(`insert into operation_events (operation_id, kind, actor, note) values ($1, 'accepted', 'system', $2::jsonb)`, [opId, JSON.stringify({ es: "Aceptado al instante", en: "Accepted instantly" })]);
    await c.query("commit");
    return { ok: true, numero: num };
  } catch (e) {
    await c.query("rollback").catch(() => undefined);
    throw e;
  } finally {
    c.release();
  }
}

/* ── El pedido (APP-NEG-PEDIDO): solo lo ve quien lo hizo. ── */
export type PedidoVista = {
  numero: string; negocio: { id: string; nombre: string; direccion: string | null; telefono: string | null; lat: number | null; lng: number | null };
  status: string; stage: string | null; sinRespuesta: boolean; enviado: string; listo: string; programado: string | null; respondeHasta: string;
  lineas: { q: number; name: string; sum: string; price: string; img: string | null }[]; nota: string | null; pickupNote: string;
  sub: string; tax: string; total: string; taxL: string; count: number;
};
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
export async function pedidoDe(userId: string, numero: string, lang: Lang): Promise<PedidoVista | null> {
  if (!/^\d{1,12}$/.test(numero)) return null;
  const es = lang === "es";
  const r = await db().query<{
    id: string; number: string; business_id: string; name: string; address: string | null; phone: string | null; lat: number | null; lng: number | null;
    status: string; stage: string | null; vencido: boolean; enviado: string; listo: string; programado: string | null; responde: string; customer_note: string | null;
    subtotal_cents: number; tax_cents: number; total_cents: number; pickup_note: Bi | null;
  }>(
    `select o.id::text, o.number, o.business_id, b.name, b.address, b.phone, st_y(b.geo::geometry) as lat, st_x(b.geo::geometry) as lng,
            o.status, o.stage, (o.status = 'pending' and o.respond_by <= now()) as vencido,
            to_char(o.sent_at at time zone c.timezone, 'HH24:MI') as enviado, to_char(o.ready_at at time zone c.timezone, 'HH24:MI') as listo,
            to_char(o.scheduled_at at time zone c.timezone, 'HH24:MI') as programado, to_char(o.respond_by at time zone c.timezone, 'HH24:MI') as responde,
            o.customer_note, o.subtotal_cents, o.tax_cents, o.total_cents, o.details->'pickupNote' as pickup_note
       from operations o join businesses b on b.id = o.business_id join cities c on c.id = o.city_id
      where o.number = $1 and o.user_id = $2 and o.kind = 'order'`, [numero, userId]);
  const o = r.rows[0];
  if (!o) return null;
  const ls = await db().query<{ q: number; name: Bi; options: { g: Bi; o: Bi }[]; instructions: string | null; total: number; img: string | null; tax: number }>(
    `select l.qty as q, l.name, l.options, l.instructions, l.line_total_cents as total, (select i.photos[1] from items i where i.id = l.item_id) as img, l.tax_pct::float as tax
       from operation_lines l where l.operation_id = $1 order by l.id`, [o.id]);
  const taxes = [...new Set(ls.rows.filter((l) => l.tax > 0).map((l) => l.tax))];
  return {
    numero: o.number, negocio: { id: o.business_id, nombre: o.name, direccion: o.address, telefono: o.phone, lat: o.lat, lng: o.lng },
    status: o.status, stage: o.stage, sinRespuesta: o.vencido, enviado: hora(hm2m(o.enviado)), listo: hora(hm2m(o.listo)), programado: o.programado ? hora(hm2m(o.programado)) : null,
    respondeHasta: hora(hm2m(o.responde)),
    lineas: ls.rows.map((l) => ({
      q: l.q, name: tx(l.name, es), img: l.img, price: money(l.total),
      sum: [(Array.isArray(l.options) ? l.options : []).map((x) => tx(x.o, es)).join(" · "), l.instructions ? `“${l.instructions}”` : ""].filter(Boolean).join(" · "),
    })),
    nota: o.customer_note, pickupNote: tx(o.pickup_note, es), sub: money(o.subtotal_cents), tax: money(o.tax_cents), total: money(o.total_cents),
    taxL: taxes.length === 1 ? (es ? `Impuestos (${taxes[0]}%)` : `Taxes (${taxes[0]}%)`) : es ? "Impuestos" : "Taxes", count: ls.rows.reduce((a, l) => a + l.q, 0),
  };
}

/* Techo Free del panel: cuántos pedidos o citas en línea van este mes (mes de la ciudad) y el techo vigente. */
export async function topeFreeDe(negocio: string) {
  const r = await db().query<{ mes: string }>(`select to_char(now() at time zone c.timezone, 'YYYY-MM') as mes from businesses b join cities c on c.id = b.city_id where b.id = $1`, [negocio]);
  return topeFree(db(), negocio, r.rows[0]?.mes ?? "");
}

/* Panel › Hoy · Esperan tu respuesta: los pedidos que el negocio todavía puede aceptar (aceptar y rechazar: bloque 2c). */
export type Esperando = { numero: string; quien: string; count: number; total: string; responde: string; programado: string | null };
export async function esperanRespuesta(negocio: string): Promise<Esperando[]> {
  const r = await db().query<{ number: string; first_name: string | null; last_name: string | null; n: number; total_cents: number; responde: string; programado: string | null }>(
    `select o.number, u.first_name, u.last_name, (select coalesce(sum(qty), 0)::int from operation_lines l where l.operation_id = o.id) as n, o.total_cents,
            to_char(o.respond_by at time zone c.timezone, 'HH24:MI') as responde, to_char(o.scheduled_at at time zone c.timezone, 'HH24:MI') as programado
       from operations o join users u on u.id = o.user_id join cities c on c.id = o.city_id
      where o.business_id = $1 and o.status = 'pending' and o.respond_by > now()
      order by o.respond_by limit 20`, [negocio]);
  return r.rows.map((x) => ({
    numero: x.number, quien: [x.first_name, x.last_name ? `${x.last_name[0]}.` : ""].filter(Boolean).join(" "), count: x.n, total: money(x.total_cents),
    responde: hora(hm2m(x.responde)), programado: x.programado ? hora(hm2m(x.programado)) : null,
  }));
}

/* Pedidos en línea de un negocio este mes (todos los planes). */
export async function usadosMes(negocio: string) {
  const r = await db().query<{ n: number }>(
    `select count(*)::int as n from operations o join cities c on c.id = o.city_id
      where o.business_id = $1 and o.sent_at >= date_trunc('month', now() at time zone c.timezone) at time zone c.timezone`, [negocio]);
  return r.rows[0]?.n ?? 0;
}
