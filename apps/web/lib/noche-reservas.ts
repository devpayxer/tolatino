import "server-only";
import { randomInt } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { cobrarOperacion, comision, devolverPago, liberarOperacion, registrarRetencion } from "./cobros";
import { db, tx } from "./db";
import { herramientaNoche, NOCHE_SQL } from "./noche";
import { diaNoche, hNoche, usdN, type Bi } from "./noche-comun";
import { pasarela } from "./pagos/pasarela";

/* La lista de la noche y la mesa / VIP (Fase 4 · 4nc · fase4-noche.md §3 y §4nc · neg-noche-flow.js).
   - Una lista o una mesa es una operación `night` (N-7101…). La noche es la fecha de la tarde en que abre (corte 6 AM).
   - LISTA: anotarse no cobra nada ($0, sin tarjeta). Queda al instante (confirmed) con su código de puerta. En la puerta paga lo
     COPIADO al enviar (precio de la lista hasta la hora de la lista; después, el cover de esa noche). Salir de la lista: siempre gratis.
   - MESA / VIP: con depósito, se RETIENE al enviar y se COBRA al confirmar; sin respuesta en `reply_min` (o 15 min antes de la llegada),
     «No hay mesa» u «Otra hora» que no aceptas → se libera completo. Cancelar antes del corte (6 PM de esa noche, o 2 h antes si llegas
     antes de las 8 PM) → devolución completa; después → el depósito se queda con el local. El local cancela → devolución completa siempre.
   - Cupo real: las mesas de ese tipo (svc_attrs.tables) menos las reservas vivas de ese tipo esa noche, con el candado
     `noche:{negocio}:{noche}:{item}` (dos clientes no se llevan la última mesa). Lo que el local cambie después no toca lo enviado.
   - To'Latino nunca cobra cover, tragos ni el mínimo (guardián coverNuncaEnLaApp). La app no pide fecha de nacimiento ni guarda
     imágenes de identificación (guardián sinImagenDeID). El código de puerta nunca sale en vistas públicas ni en SMS (codigoPuerta). */
type Q = Pool | PoolClient;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, ID = /^\d{1,18}$/, YMD = /^\d{4}-\d{2}-\d{2}$/;
export const NUM_N = /^N-\d{1,10}$/;
export const OCASION = ["bailar", "cumple", "despedida", "celebra"] as const;
const VIVAS = ["pending", "change_proposed", "confirmed"];
const no = (es: string, en: string, extra?: Record<string, true>) => ({ ok: false as const, msg: { es, en } as Bi, ...extra });
/* El corte para cancelar gratis (Preguntas #3): las 6 PM de esa noche, o 2 h antes de la llegada si llegas antes de las 8 PM. */
export const corteMin = (llegada: number) => (llegada < 480 ? Math.max(0, llegada - 120) : 360);

type Svc = { id: string; k: "lista" | "mesa" | "vip"; name: Bi; desc: Bi; cents: number; pax: number; tables: number; dep: number; hr: boolean; until: number | null; inc: Bi[]; foto: string | null; dows: number[] };
async function servicio(c: Q, negocio: string, id: string): Promise<Svc | null> {
  return (await c.query<Svc>(
    `select i.id::text, i.svc_kind as k, i.name, coalesce(i.descr, '{"es":"","en":""}'::jsonb) as desc, i.price_cents as cents, coalesce((i.svc_attrs->>'pax')::int, 10) as pax,
            greatest(1, coalesce((i.svc_attrs->>'tables')::int, 1)) as tables, coalesce(i.deposit_cents, 0) as dep, coalesce((i.svc_attrs->>'hr')::boolean, false) as hr,
            (i.svc_attrs->>'until')::int as until, coalesce(i.svc_attrs->'inc', '[]'::jsonb) as inc, i.photos[1] as foto,
            coalesce((select array_agg(x::int) from jsonb_array_elements_text(coalesce(i.svc_attrs->'dows', '[]'::jsonb)) x), '{}') as dows
       from items i where i.id = $2::bigint and i.business_id = $1 and i.module = 'svc' and i.removed_at is null and i.sell and i.status = 'live' and i.svc_kind in ('lista', 'mesa', 'vip')`, [negocio, id])).rows[0] ?? null;
}

/* El local y sus 7 noches: si abre, a qué hora abre y cierra (minutos desde las 12 PM), el cover de esa noche y los minutos de ahora. */
type Ctx = { id: string; name: string; city: string; tz: string; plan: string; mods: string[]; off: Record<string, unknown>; cuenta: string | null; mes: string; address: string | null;
  phone: string | null; foto: string | null; ciudad: string; hoy: string; ahoraN: number; reply: number; hold: number; listCap: number | null };
async function contexto(c: Q, negocio: string): Promise<Ctx | null> {
  return (await c.query<Ctx>(
    `select b.id, b.name, b.city_id as city, ci.timezone as tz, coalesce(st.plan, 'free') as plan, b.modules_on as mods, coalesce(b.modules_off, '{}'::jsonb) as off, b.address, b.phone, ci.name as ciudad,
            (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1) as foto,
            (select a.stripe_account_id from stripe_accounts a where a.business_id = b.id and a.charges_enabled and not a.payouts_paused) as cuenta,
            to_char(now() at time zone ci.timezone, 'YYYY-MM') as mes, ${NOCHE_SQL("now()", "ci.timezone")}::text as hoy,
            (extract(epoch from (now() at time zone ci.timezone) - (${NOCHE_SQL("now()", "ci.timezone")} + time '12:00')) / 60)::int as "ahoraN",
            coalesce(s.reply_min, 60) as reply, coalesce(s.hold_min, 30) as hold, s.list_cap as "listCap"
       from businesses b join cities ci on ci.id = b.city_id left join business_stats_cache st on st.business_id = b.id left join noche_settings s on s.business_id = b.id
      where b.id = $1 and b.status = 'active' and b.category_id = 'NEG-NOCHE'`, [negocio])).rows[0] ?? null;
}
const hm = (s: string) => { const [h, m] = s.split(":").map(Number) as [number, number]; return h * 60 + m; };
export type NocheOpcion = { fecha: string; dow: number; abre: boolean; slots: number[]; cupo: number | null; cover: number; after: { min: number; cents: number } | null; llena: boolean; cierra: number | null };
/* Las noches (hoy y 6 más) con las horas de llegada: cada 30 min desde que abre hasta la hora de la lista (lista) o 2 h antes del
   cierre (mesa); hoy, solo las que faltan (15 min de margen). El cupo de mesas sale de las reservas vivas, nunca al azar. */
async function noches(c: Q, x: Ctx, s: Svc): Promise<NocheOpcion[]> {
  const h = await herramientaNoche(x.id, c);
  if (!h) return [];
  const H = (await c.query<{ weekday: number; open: boolean; ranges: [string, string][] }>(`select weekday, open, ranges from business_hours where business_id = $1 and coalesce(module, '') = ''`, [x.id])).rows;
  const usados = (await c.query<{ d: string; n: number; p: number }>(
    `select night_date::text as d, count(*) filter (where details->>'item' = $2)::int as n, coalesce(sum(party_size) filter (where details->>'k' = 'lista'), 0)::int as p
       from operations where business_id = $1 and kind = 'night' and status = any($3::text[]) and night_date between $4::date and $4::date + 6 group by night_date`, [x.id, s.id, VIVAS, x.hoy])).rows;
  return h.noches.map((n, i) => {
    const r = H.find((z) => z.weekday === n.dow), rg = r?.open && r.ranges?.length ? r.ranges : null;
    const vale = !s.dows.length || s.dows.includes(n.dow);
    if (!rg || !vale || (s.k === "lista" && !h.lista)) return { fecha: n.fecha, dow: n.dow, abre: false, slots: [], cupo: null, cover: n.cover, after: null, llena: false, cierra: null };
    const abre = Math.max(0, hm(rg[0]![0]) - 720), ult = rg[rg.length - 1]!, cierra = hm(ult[1]) <= hm(ult[0]) ? hm(ult[1]) + 720 : hm(ult[1]) - 720;
    const hasta = s.k === "lista" ? (h.listaHasta ?? 660) - 30 : cierra - 120;
    const slots: number[] = [];
    for (let m = Math.ceil(abre / 30) * 30; m <= hasta; m += 30) if (i > 0 || m > x.ahoraN + 15) slots.push(m);
    const u = usados.find((z) => z.d === n.fecha);
    const cupo = s.k === "lista" ? null : Math.max(0, s.tables - (u?.n ?? 0));
    const llena = s.k === "lista" && x.listCap != null && (u?.p ?? 0) >= x.listCap;
    return { fecha: n.fecha, dow: n.dow, abre: true, slots, cupo, cover: n.cover, after: h.afterMin != null && h.afterCents != null && h.afterCents > n.cover ? { min: h.afterMin, cents: h.afterCents } : null, llena, cierra };
  });
}

/* ── La pantalla de reservar (APP-NEG-NOCHE-RESERVA): el servicio, las noches con sus horas y cupo, la edad y el depósito ── */
export type BookingNoche = {
  negocio: { id: string; nombre: string; direccion: string | null; ciudad: string; foto: string | null };
  svc: Omit<Svc, "dows" | "tables">; noches: NocheOpcion[]; edad: 18 | 21; listaHasta: number | null; hold: number; reply: number;
  booking: boolean; dep: number; free: boolean; mias: { numero: string; fecha: string }[];
};
export async function bookingNoche(negocio: string, svcId: string, userId: string | null): Promise<BookingNoche | null> {
  if (!ID.test(svcId)) return null;
  const x = await contexto(db(), negocio);
  const s = x ? await servicio(db(), negocio, svcId) : null;
  if (!x || !s) return null;
  const h = (await herramientaNoche(negocio))!;
  const pro = x.plan === "pro", booking = (x.mods ?? []).includes("rsv") && !x.off.rsv && !x.off.svc;
  // Free (Preguntas #7): lista y mesa sin depósito ni tarjeta, tope del mes. Pro sin cuenta de cobro: sin depósito.
  const dep = s.k !== "lista" && pro && x.cuenta ? s.dep : 0;
  const mias = userId ? (await db().query<{ numero: string; fecha: string }>(
    `select number as numero, night_date::text as fecha from operations where user_id = $1 and business_id = $2 and kind = 'night' and status = any($3::text[]) and night_date >= $4::date`, [userId, negocio, VIVAS, x.hoy])).rows : [];
  const { dows: _d, tables: _t, ...svc } = s;
  return { negocio: { id: x.id, nombre: x.name, direccion: x.address, ciudad: x.ciudad, foto: x.foto }, svc, noches: await noches(db(), x, s), edad: h.edad,
    listaHasta: h.listaHasta, hold: x.hold, reply: x.reply, booking, dep, free: !pro, mias };
}

/* ── Anotarse en la lista / pedir la mesa ── */
export type NocheIn = { svc: string; noche: string; llega: number; pax: number; ocasion?: string | null; nota?: string; sms?: boolean; pm?: string | null; clave: string };
type Res = { ok: true; numero: string } | { ok: false; msg: Bi; tarjeta?: true; hora?: true };
export async function reservarNoche(userId: string, negocio: string, f: NocheIn, entorno: string): Promise<Res> {
  if (!UUID.test(String(f?.clave)) || !ID.test(String(f?.svc)) || !YMD.test(String(f?.noche))) return no("Revisa tu solicitud y vuelve a intentarlo.", "Check your request and try again.");
  const nota = String(f.nota ?? "").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, 200);
  if (/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(nota)) return no("Por seguridad, sin teléfonos en la nota.", "For safety, no phone numbers in the note.");
  const llega = Math.floor(Number(f.llega)), pax = Math.floor(Number(f.pax));
  const ocasion = f.ocasion && (OCASION as readonly string[]).includes(f.ocasion) ? f.ocasion : null;
  const c = await db().connect();
  let retenido: string | null = null;
  try {
    await c.query("begin");
    const ya = (await c.query<{ number: string }>(`select number from operations where user_id = $1 and client_key = $2`, [userId, f.clave])).rows[0];
    if (ya) { await c.query("rollback"); return { ok: true, numero: ya.number }; }
    // El candado de ese tipo de mesa esa noche: el cupo se cuenta y se toma dentro de él.
    await c.query(`select pg_advisory_xact_lock(hashtext('noche:' || $1 || ':' || $2 || ':' || $3))`, [negocio, f.noche, f.svc]);
    const x = await contexto(c, negocio);
    const s = x ? await servicio(c, negocio, String(f.svc)) : null;
    if (!x || !s) { await c.query("rollback"); return no("Eso no se pide en línea.", "That is not requested online."); }
    if (!(x.mods ?? []).includes("rsv") || x.off.rsv || x.off.svc) { await c.query("rollback"); return no(`${x.name} no toma listas ni mesas en línea por ahora: llama al local.`, `${x.name} is not taking lists or tables online right now: call the venue.`); }
    const lista = s.k === "lista";
    if (!(pax >= 1 && pax <= Math.min(s.pax, lista ? 20 : 50))) { await c.query("rollback"); return no(`Hasta ${Math.min(s.pax, lista ? 20 : 50)} personas.`, `Up to ${Math.min(s.pax, lista ? 20 : 50)} people.`); }
    const N = (await noches(c, x, s)).find((n) => n.fecha === f.noche);
    if (!N || !N.abre) { await c.query("rollback"); return no("Esa noche no abre. Elige otra.", "That night it is closed. Pick another.", { hora: true }); }
    if (!N.slots.includes(llega)) { await c.query("rollback"); return no("Elige a qué hora llegan.", "Pick when you arrive.", { hora: true }); }
    if (!lista && (N.cupo ?? 0) < 1) { await c.query("rollback"); return no("Ya no quedan mesas de ese tipo esa noche. Elige otra noche.", "No tables of that kind are left that night. Pick another night.", { hora: true }); }
    if (lista && N.llena) { await c.query("rollback"); return no("La lista de esa noche está llena. Puedes entrar con el cover normal.", "That night's list is full. You can get in with the regular cover.", { hora: true }); }
    // Una lista viva por cliente, local y noche; como mucho 3 mesas esperando respuesta.
    if (lista && (await c.query(`select 1 from operations where user_id = $1 and business_id = $2 and kind = 'night' and night_date = $3::date and details->>'k' = 'lista' and status = any($4::text[])`, [userId, negocio, f.noche, VIVAS])).rowCount) {
      await c.query("rollback"); return no("Ya estás en la lista de esa noche.", "You are already on that night's list.");
    }
    if (!lista && ((await c.query<{ n: number }>(`select count(*)::int as n from operations where user_id = $1 and kind = 'night' and status in ('pending', 'change_proposed')`, [userId])).rows[0]?.n ?? 0) >= 3) {
      await c.query("rollback"); return no("Tienes 3 mesas esperando respuesta. Espera a que te contesten.", "You have 3 tables waiting for a reply. Wait for an answer.");
    }
    const pro = x.plan === "pro";
    if (!pro) {
      const r = (await c.query<{ cap: number; usados: number }>(`select coalesce((select (value #>> '{}')::int from platform_config where key = 'free_ops_cap'), 10) as cap, (select count(*)::int from operations where business_id = $1 and kind <> 'table' and free_quota_month = $2) as usados`, [x.id, x.mes])).rows[0];
      if (r && r.usados >= r.cap) { await c.query("rollback"); return no(`${x.name} no recibe más listas ni mesas en línea este mes. Llama al local.`, `${x.name} takes no more online lists or tables this month. Call the venue.`); }
    }
    // Mesa: el local responde en reply_min, y nunca después de 15 min antes de la llegada.
    const h = (await herramientaNoche(negocio, c))!;
    const dep = lista || !pro || !x.cuenta ? 0 : s.dep;
    const numero = `N-${(await c.query<{ n: string }>(`select nextval('night_seq')::text as n`)).rows[0]!.n}`;
    let ret: Awaited<ReturnType<typeof pasarela.retener>> | null = null, fee = 0;
    if (dep > 0) {
      const pm = typeof f.pm === "string" && /^pm_[A-Za-z0-9_]{3,200}$/.test(f.pm) ? f.pm : null;
      if (!pm) { await c.query("rollback"); return no("Elige la tarjeta para el depósito.", "Choose the card for the deposit.", { tarjeta: true }); }
      fee = Math.min(await comision(c, "noche", dep), dep);
      const cliente = await pasarela.cliente(userId).catch(() => null);
      ret = await pasarela.retener({ centavos: dep, comision: fee, destino: x.cuenta!, pm, cliente, idem: `noche-${f.clave}-${pm.slice(-24)}`, meta: { night: numero, business_id: x.id } });
      if (!ret.ok) { await c.query("rollback"); return no(ret.mensaje.es, ret.mensaje.en, { tarjeta: true }); }
      retenido = ret.pi;
      if (ret.estado === "accion") { await c.query("rollback"); await pasarela.liberar(ret.pi).catch(() => undefined); retenido = null; return no("Tu banco pide una verificación extra. Prueba con otra tarjeta.", "Your bank asks for an extra verification. Try another card.", { tarjeta: true }); }
    }
    // El código de la puerta: 4 cifras, único entre las reservas vivas de esa noche (el índice lo garantiza).
    const usados = new Set((await c.query<{ d: string }>(`select door_code as d from operations where business_id = $1 and night_date = $2::date and kind = 'night' and door_code is not null and status = any($3::text[])`, [negocio, f.noche, VIVAS])).rows.map((z) => z.d));
    let code = "";
    for (let k = 0; k < 50 && (!code || usados.has(code)); k++) code = String(randomInt(1000, 10000));
    // Lo de la puerta se COPIA al enviar: si el local cambia la herramienta después, lo enviado no cambia.
    const det = { k: s.k, item: s.id, svc: s.name, night: f.noche, arrive: llega, occ: ocasion, door_cents: lista ? s.cents : null, list_until: lista ? h.listaHasta : null,
      cover_cents: N.cover, after: N.after, min_cents: lista || s.hr ? null : s.cents, hr: s.hr, edad: h.edad, hold: x.hold, sms: f.sms !== false, cut: lista ? null : corteMin(llega), inc: s.inc };
    const op = (await c.query<{ id: string }>(
      `insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, duration_min, buffer_min, customer_note, details, party_size, night_date, door_code,
                               subtotal_cents, total_cents, deposit_cents, pay_mode, respond_by, confirmed_at, free_quota_month, client_key, is_test)
       values ($1, 'night', $2, $3, $4, $5, ($6::date + time '12:00' + make_interval(mins => $7::int)) at time zone $8, 60, 0, nullif($9, ''), $10::jsonb, $11, $6::date, $12,
               0, 0, $13, $14, case when $5 = 'pending' then least(now() + make_interval(mins => $15::int), ($6::date + time '12:00' + make_interval(mins => $7::int - 15)) at time zone $8) end,
               case when $5 = 'confirmed' then now() end, $16, $17, $18) returning id::text`,
      [numero, x.city, x.id, userId, lista ? "confirmed" : "pending", f.noche, llega, x.tz, nota, JSON.stringify(det), pax, code, dep, dep > 0 ? "app" : "none", x.reply,
        pro ? null : x.mes, f.clave, entorno !== "produccion"])).rows[0]!.id;
    if (!lista && (await c.query<{ ok: boolean }>(`select respond_by > now() + interval '4 minutes' as ok from operations where id = $1::bigint`, [op])).rows[0]?.ok === false) {
      await c.query("rollback"); if (retenido) await pasarela.liberar(retenido).catch(() => undefined); retenido = null;
      return no("Esa hora ya está muy cerca para que te confirmen: elige una más tarde o llama al local.", "That time is too close for them to confirm: pick a later one or call the venue.", { hora: true });
    }
    await c.query(`insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct, options) values ($1, $2, $3::jsonb, $4, 0, 0, 0, '[]'::jsonb)`, [op, s.id, JSON.stringify(s.name), pax]);
    if (ret?.ok) await registrarRetencion(c, { opId: op, userId, negocio: x.id, city: x.city, total: dep, comision: fee, r: ret, pm: f.pm ?? undefined, kind: "deposit" });
    await c.query(`insert into operation_events (operation_id, kind, actor, actor_id) values ($1, $2, 'user', $3)`, [op, lista ? "night_list" : "night_sent", userId]);
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
type Op = { id: string; num: string; biz: string; negocio: string; uid: string; cliente: string; status: string; detail: string | null; night: string; tz: string; city: string; det: Record<string, unknown>;
  pax: number; dep: number; pay: string | null; pid: string | null; amount: number | null; refunded: number | null; code: string | null; nowN: number; hoy: string };
const SEL = `select o.id::text, o.number as num, o.business_id as biz, b.name as negocio, o.user_id::text as uid, coalesce(nullif(u.first_name, ''), 'Cliente') as cliente, o.status, o.status_detail as detail,
                    o.night_date::text as night, c.timezone as tz, o.city_id as city, o.details as det, o.party_size as pax, o.deposit_cents as dep, o.pay_status as pay,
                    p.id::text as pid, p.amount_cents as amount, p.refunded_cents as refunded, o.door_code as code,
                    (extract(epoch from (now() at time zone c.timezone) - (o.night_date + time '12:00')) / 60)::int as "nowN", ${NOCHE_SQL("now()", "c.timezone")}::text as hoy
               from operations o join businesses b on b.id = o.business_id join cities c on c.id = o.city_id join users u on u.id = o.user_id
               left join payments p on p.operation_id = o.id and p.kind = 'deposit'`;
async function leer(c: Q, where: string, args: unknown[], lock = false): Promise<Op | null> {
  return (await c.query<Op>(`${SEL} where o.kind = 'night' and ${where}${lock ? " for update of o" : ""}`, args)).rows[0] ?? null;
}
const nocheL = (o: Pick<Op, "night" | "hoy">) => (o.night === o.hoy ? "esta noche" : `el ${diaNoche(new Date(`${o.night}T12:00:00Z`).getUTCDay(), true)}`);
async function avisarCliente(numero: string, tpl: string, extra: Record<string, string> = {}) {
  const o = await leer(db(), "o.number = $1", [numero]);
  if (!o) return;
  const { avisar } = await import("./avisos");
  await avisar(o.uid, tpl, { negocio: o.negocio, noche: nocheL(o), hora: hNoche(Number(o.det.arrive)), guarda: String(o.det.hold ?? 30), dev: "", dep: "", puerta: "", ...extra }, { href: `/noche/${numero}`, ref: ["night", numero] });
}
async function avisarNeg(numero: string, tpl: string, extra: Record<string, string> = {}) {
  const o = await leer(db(), "o.number = $1", [numero]);
  if (!o) return;
  const { avisarNegocio } = await import("./avisos");
  await avisarNegocio(o.biz, tpl, { cliente: o.cliente, noche: nocheL(o), hora: hNoche(Number(o.det.arrive)), servicio: (o.det.svc as Bi)?.es ?? "", personas: `${o.pax} personas`, dep: "", min: "60", ...extra },
    { href: `/panel/${o.biz}/hoy?det=noche:${numero}`, ref: ["night", numero] });
}
/* Lo que se paga en la puerta, como se copió al enviar (para el aviso y la pantalla). */
export function puertaTexto(det: Record<string, unknown>, es: boolean): string {
  const E2 = (a: string, b: string) => (es ? a : b);
  if (det.k === "lista") {
    const p = Number(det.door_cents ?? 0), u = det.list_until == null ? null : Number(det.list_until);
    return `${p ? E2(`${usdN(p)} por persona`, `${usdN(p)} per person`) : E2("Gratis", "Free")}${u != null ? E2(` antes de las ${hNoche(u)}`, ` before ${hNoche(u)}`) : ""}`;
  }
  return det.min_cents ? E2(`Mínimo ${usdN(Number(det.min_cents))} en consumo`, `${usdN(Number(det.min_cents))} minimum spend`) : E2("Sin mínimo", "No minimum");
}
export async function avisarNocheNueva(numero: string) {
  const o = await leer(db(), "o.number = $1", [numero]);
  if (!o) return;
  if (o.det.k === "lista") await avisarCliente(numero, "noche_lista", { puerta: `${puertaTexto(o.det, true)}.` });
  else await avisarNeg(numero, "biz_noche_mesa", { dep: o.dep ? ` Depósito ${usdN(o.dep)} retenido.` : "" });
}
async function ev(c: PoolClient, op: string, kind: string, actor: "user" | "member" | "system", actorId: string | null, note?: Bi) {
  await c.query(`insert into operation_events (operation_id, kind, actor, actor_id, note) values ($1::bigint, $2, $3, $4, $5::jsonb)`, [op, kind, actor, actorId, note ? JSON.stringify(note) : null]);
}
type ResN = { ok: true } | { ok: false; msg: Bi };
const lock = (c: PoolClient, o: Pick<Op, "biz" | "night" | "det">) => c.query(`select pg_advisory_xact_lock(hashtext('noche:' || $1 || ':' || $2 || ':' || $3))`, [o.biz, o.night, String(o.det.item)]);

/* ── El local responde una mesa (Panel › Hoy · detalle): Confirmar · Otra hora · No hay mesa ── */
export type PasoMesa = "confirmar" | "otra" | "nohay";
export async function responderMesa(negocio: string, numero: string, paso: PasoMesa, actorId: string, alt?: number): Promise<ResN> {
  if (!NUM_N.test(numero)) return no("Esa reserva no existe.", "That booking does not exist.");
  await vencerNoche({ negocio, numero });
  const o0 = await leer(db(), "o.business_id = $1 and o.number = $2", [negocio, numero]);
  if (!o0 || o0.det.k === "lista") return no("Esa reserva no existe.", "That booking does not exist.");
  let despues: (() => Promise<void>) | null = null;
  const r = await tx(async (c): Promise<ResN> => {
    await lock(c, o0);
    const o = await leer(c, "o.business_id = $1 and o.number = $2", [negocio, numero], true);
    if (!o) return no("Esa reserva no existe.", "That booking does not exist.");
    if (o.status !== "pending") return o.status === "expired" ? no("Pasó el tiempo para responder: la solicitud venció y se liberó el depósito.", "The time to reply passed: the request expired and the deposit was released.") : no("Esta solicitud ya cambió. Actualiza la pantalla.", "This request already changed. Refresh the screen.");
    if (paso === "nohay") {
      await c.query(`update operations set status = 'declined', answered_at = now(), respond_by = null, updated_at = now() where id = $1::bigint`, [o.id]);
      await ev(c, o.id, "night_no", "member", actorId);
      despues = async () => { await liberarOperacion(o.id); await avisarCliente(numero, "noche_no", { dev: o.dep ? ` Se liberó tu depósito de ${usdN(o.dep)}.` : " No se cobró nada." }); };
      return { ok: true };
    }
    if (paso === "confirmar" && o.dep > 0 && o.pay !== "held") return no("El depósito de esta solicitud ya no está retenido. Usa «No hay mesa»: el cliente puede pedirla otra vez.", "This request's deposit is no longer held. Use “No table”: the client can request again.");
    if (paso === "otra") {
      const x = (await contexto(c, negocio))!, s = await servicio(c, negocio, String(o.det.item));
      const N = s ? (await noches(c, x, s)).find((n) => n.fecha === o.night) : null;
      const m = Math.floor(Number(alt));
      if (!N || !N.slots.includes(m)) return no("Elige la otra hora.", "Pick the other time.");
      if (m === Number(o.det.arrive)) return no("Esa es la misma hora que pidieron.", "That is the same time they asked for.");
      await c.query(`insert into change_proposals (operation_id, kind, proposed, created_by, side, respond_by)
                     values ($1::bigint, 'time', $2::jsonb, $3, 'business', least(now() + interval '30 minutes', ($4::date + time '12:00' + make_interval(mins => $5::int - 15)) at time zone $6))`,
        [o.id, JSON.stringify({ m }), actorId, o.night, m, o.tz]);
      await c.query(`update operations set status = 'change_proposed', answered_at = now(), respond_by = least(now() + interval '30 minutes', ($2::date + time '12:00' + make_interval(mins => $3::int - 15)) at time zone $4), updated_at = now() where id = $1::bigint`, [o.id, o.night, m, o.tz]);
      await ev(c, o.id, "night_alt", "member", actorId, { es: `Propusiste las ${hNoche(m)}`, en: `You proposed ${hNoche(m)}` });
      despues = async () => { await avisarCliente(numero, "noche_alt", { alt: hNoche(m) }); };
      return { ok: true };
    }
    await c.query(`update operations set status = 'confirmed', answered_at = now(), confirmed_at = now(), respond_by = null, updated_at = now() where id = $1::bigint`, [o.id]);
    await ev(c, o.id, "night_ok", "member", actorId);
    despues = async () => { await cobrarOperacion(o.id); await avisarCliente(numero, "noche_ok", { dep: o.dep ? ` Depósito de ${usdN(o.dep)} cobrado; se descuenta de tu cuenta.` : "" }); };
    return { ok: true };
  });
  if (r.ok && despues) await (despues as () => Promise<void>)();
  return r;
}

/* ── El cliente: salir de la lista / cancelar, aceptar la otra hora o «No me sirve» ── */
export type QueNoche = "cancelar" | "aceptar" | "nogracias";
export async function nocheCliente(userId: string, numero: string, que: QueNoche): Promise<ResN & { quedo?: boolean }> {
  if (!NUM_N.test(numero)) return no("Esa reserva no existe.", "That booking does not exist.");
  await vencerNoche({ userId, numero });
  const o0 = await leer(db(), "o.user_id = $1 and o.number = $2", [userId, numero]);
  if (!o0) return no("Esa reserva no existe.", "That booking does not exist.");
  let despues: (() => Promise<void>) | null = null, quedo = false;
  const r = await tx(async (c): Promise<ResN> => {
    await lock(c, o0);
    const o = await leer(c, "o.user_id = $1 and o.number = $2", [userId, numero], true);
    if (!o) return no("Esa reserva no existe.", "That booking does not exist.");
    const ya = no("Esta reserva ya cambió. Actualiza la pantalla.", "This booking already changed. Refresh the screen.");
    const lista = o.det.k === "lista";
    if (que === "cancelar") {
      if (!VIVAS.includes(o.status)) return ya;
      if (lista && o.det.in_n) return no("Ya entraste esta noche.", "You already got in tonight.");
      // El corte se mide con la hora real de esa noche (nunca la fija del prototipo, Preguntas #14).
      const conf = o.status === "confirmed", aTiempo = lista || !conf || o.nowN < Number(o.det.cut ?? 360);
      const pierde = conf && !aTiempo && o.dep > 0 && o.pay === "captured";
      quedo = pierde;
      await c.query(`update operations set status = 'cancelled', cancelled_by = 'user', cancelled_at = now(), cancel_reason = $2, respond_by = null, details = details || $3::jsonb, updated_at = now() where id = $1::bigint`,
        [o.id, lista ? "salio" : conf ? (aTiempo ? "a_tiempo" : "tarde") : "solicitud", JSON.stringify({ perdio: pierde })]);
      await c.query(`update change_proposals set status = 'declined', answered_at = now() where operation_id = $1::bigint and status = 'open'`, [o.id]);
      await ev(c, o.id, pierde ? "night_cx_kept" : "night_cx", "user", userId, pierde ? { es: "Canceló después del corte: el depósito se queda con el local", en: "Cancelled after the cutoff: the venue keeps the deposit" } : undefined);
      despues = async () => {
        if (o.pay === "held") await liberarOperacion(o.id);
        else if (o.pay === "captured" && aTiempo && o.pid && o.amount) await devolverPago({ paymentId: o.pid, centavos: o.amount - (o.refunded ?? 0), por: "policy", actorId: userId, motivo: "Cancelación antes del corte", idem: `ncx-${numero}` });
        await avisarCliente(numero, "noche_cx", { dev: lista ? " Saliste de la lista." : o.dep ? (pierde ? ` El depósito de ${usdN(o.dep)} se quedó con ${o.negocio}.` : ` Te devolvemos ${usdN(o.dep)}.`) : "" });
        if (!lista) await avisarNeg(numero, "biz_noche_cx", { dep: pierde ? ` El depósito de ${usdN(o.dep)} se queda contigo.` : o.dep ? ` Se le devuelve el depósito de ${usdN(o.dep)}.` : "" });
      };
      return { ok: true };
    }
    if (o.status !== "change_proposed") return ya;
    const p = (await c.query<{ id: string; m: number }>(`select id::text, (proposed->>'m')::int as m from change_proposals where operation_id = $1::bigint and side = 'business' and status = 'open' order by id desc limit 1`, [o.id])).rows[0];
    if (!p) return ya;
    if (que === "nogracias") {
      await c.query(`update change_proposals set status = 'declined', answered_at = now() where id = $1`, [p.id]);
      await c.query(`update operations set status = 'cancelled', cancelled_by = 'user', cancelled_at = now(), cancel_reason = 'alt_no', respond_by = null, updated_at = now() where id = $1::bigint`, [o.id]);
      await ev(c, o.id, "alt_declined", "user", userId);
      despues = async () => { await liberarOperacion(o.id); await avisarNeg(numero, "biz_noche_alt_no"); };
      return { ok: true };
    }
    if (o.dep > 0 && o.pay !== "held") return no("Tu depósito ya no está retenido. Elige «No me sirve» y pide la mesa otra vez.", "Your deposit is no longer held. Choose “Doesn’t work” and request the table again.");
    await c.query(`update operations set status = 'confirmed', scheduled_at = ($2::date + time '12:00' + make_interval(mins => $3::int)) at time zone $4, details = details || $5::jsonb, confirmed_at = now(), respond_by = null, updated_at = now() where id = $1::bigint`,
      [o.id, o.night, p.m, o.tz, JSON.stringify({ arrive: p.m, cut: corteMin(p.m) })]);
    await c.query(`update change_proposals set status = 'accepted', answered_at = now() where id = $1`, [p.id]);
    await ev(c, o.id, "alt_accepted", "user", userId);
    despues = async () => { await cobrarOperacion(o.id); await avisarNeg(numero, "biz_noche_alt_ok", { hora: hNoche(p.m) }); };
    return { ok: true };
  });
  if (r.ok && despues) await (despues as () => Promise<void>)();
  return r.ok ? { ok: true, quedo } : r;
}

/* ── El local cancela una mesa (motivo obligatorio; devolución completa siempre) ── */
export async function cancelarNocheNegocio(negocio: string, numero: string, motivo: string, actorId: string): Promise<ResN> {
  const mot = String(motivo ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, 200);
  if (!NUM_N.test(numero)) return no("Esa reserva no existe.", "That booking does not exist.");
  if (mot.length < 4) return no("Escribe el motivo: el cliente lo ve.", "Write the reason: the client sees it.");
  const o0 = await leer(db(), "o.business_id = $1 and o.number = $2", [negocio, numero]);
  if (!o0) return no("Esa reserva no existe.", "That booking does not exist.");
  let despues: (() => Promise<void>) | null = null;
  const r = await tx(async (c): Promise<ResN> => {
    await lock(c, o0);
    const o = await leer(c, "o.business_id = $1 and o.number = $2", [negocio, numero], true);
    if (!o || o.status !== "confirmed" || o.det.in_n || o.det.llego) return no("Esta reserva ya cambió. Actualiza la pantalla.", "This booking already changed. Refresh the screen.");
    await c.query(`update operations set status = 'cancelled', cancelled_by = 'business', cancelled_at = now(), cancel_reason = 'negocio', details = details || $2::jsonb, updated_at = now() where id = $1::bigint`, [o.id, JSON.stringify({ motivoNeg: mot })]);
    await ev(c, o.id, "night_biz_cx", "member", actorId, { es: `Canceló el local: ${mot}`, en: `Cancelled by the venue: ${mot}` });
    despues = async () => {
      if (o.pay === "held") await liberarOperacion(o.id);
      else if (o.pay === "captured" && o.pid && o.amount) await devolverPago({ paymentId: o.pid, centavos: o.amount - (o.refunded ?? 0), por: "business", actorId, motivo: "El local canceló", idem: `nbx-${numero}` });
      await avisarCliente(numero, "noche_biz_cx", { motivo: mot });
    };
    return { ok: true };
  });
  if (r.ok && despues) await (despues as () => Promise<void>)();
  return r;
}

/* ── La puerta: la lista entra (cuántos de cuántos) y la mesa llegó / no llegó / no entró sin identificación ── */
export type MarcaMesa = "llegaron" | "nollegaron" | "noid";
export async function marcarNoche(negocio: string, numero: string, que: MarcaMesa | "entraron", actorId: string, n?: number): Promise<ResN> {
  if (!NUM_N.test(numero)) return no("Esa reserva no existe.", "That booking does not exist.");
  return tx(async (c): Promise<ResN> => {
    const o = await leer(c, "o.business_id = $1 and o.number = $2", [negocio, numero], true);
    if (!o || o.status !== "confirmed") return no("Esta reserva ya cambió. Actualiza la pantalla.", "This booking already changed. Refresh the screen.");
    if (o.night !== o.hoy) return no("Esto se marca la noche de la reserva.", "This is marked on the night of the booking.");
    const lista = o.det.k === "lista";
    if (que === "entraron") {
      const k = Math.floor(Number(n));
      if (!(k >= 0 && k <= o.pax)) return no(`Entre 0 y ${o.pax}.`, `Between 0 and ${o.pax}.`);
      await c.query(`update operations set details = details || $2::jsonb, updated_at = now() where id = $1::bigint`, [o.id, JSON.stringify({ in_n: k, in_at: new Date().toISOString(), in_by: actorId, ...(lista ? {} : { llego: k > 0 }) })]);
      await ev(c, o.id, "night_in", "member", actorId, { es: `Entraron ${k} de ${o.pax}`, en: `${k} of ${o.pax} got in` });
      return { ok: true };
    }
    if (lista) return no("Para la lista, marca cuántos entraron.", "For the list, mark how many got in.");
    if (que === "llegaron") {
      await c.query(`update operations set details = details || $2::jsonb, updated_at = now() where id = $1::bigint`, [o.id, JSON.stringify({ llego: true, in_n: o.pax, in_at: new Date().toISOString(), in_by: actorId })]);
      await ev(c, o.id, "night_in", "member", actorId);
      return { ok: true };
    }
    // «No llegaron» desde los 30 min (lo que se guarda la mesa) después de su hora; «sin identificación», cuando quieras.
    if (que === "nollegaron" && o.nowN < Number(o.det.arrive) + Number(o.det.hold ?? 30)) return no(`Su mesa se guarda hasta las ${hNoche(Number(o.det.arrive) + Number(o.det.hold ?? 30))}.`, `Their table is held until ${hNoche(Number(o.det.arrive) + Number(o.det.hold ?? 30))}.`);
    await c.query(`update operations set status = 'done', status_detail = $2, done_at = now(), door_code = null, updated_at = now() where id = $1::bigint`, [o.id, que]);
    await ev(c, o.id, que === "noid" ? "night_noid" : "night_noshow", "member", actorId);
    return { ok: true };
  });
}

/* ── El barrido (cada minuto): vence las mesas sin respuesta, la otra hora sin respuesta, y cierra la noche a las 6 AM ── */
export async function vencerNoche(f: { negocio?: string; userId?: string; numero?: string } = {}) {
  const w: string[] = [], a: unknown[] = [];
  if (f.negocio) { a.push(f.negocio); w.push(`o.business_id = $${a.length}`); }
  if (f.userId) { a.push(f.userId); w.push(`o.user_id = $${a.length}::uuid`); }
  if (f.numero) { a.push(f.numero); w.push(`o.number = $${a.length}`); }
  const y = w.length ? ` and ${w.join(" and ")}` : "";
  const vencidas = (await db().query<{ id: string; num: string; dep: number }>(
    `update operations o set status = 'expired', status_detail = 'sin_respuesta', door_code = null, updated_at = now() where o.kind = 'night' and o.status = 'pending' and o.respond_by < now()${y}
     returning o.id::text, o.number as num, o.deposit_cents as dep`, a)).rows;
  for (const v of vencidas) {
    await db().query(`insert into operation_events (operation_id, kind, actor, note) values ($1::bigint, 'night_exp', 'system', $2::jsonb)`, [v.id, JSON.stringify({ es: "El local no contestó a tiempo", en: "The venue did not reply in time" })]);
    await liberarOperacion(v.id);
    await avisarCliente(v.num, "noche_exp", { dev: v.dep ? ` Se liberó tu depósito de ${usdN(v.dep)}.` : " No se cobró nada." });
  }
  const sinAlt = (await db().query<{ id: string }>(
    `update operations o set status = 'cancelled', cancelled_by = 'system', cancelled_at = now(), cancel_reason = 'alt_vencida', door_code = null, updated_at = now()
      where o.kind = 'night' and o.status = 'change_proposed' and o.respond_by < now()${y} returning o.id::text`, a)).rows;
  for (const v of sinAlt) {
    await db().query(`update change_proposals set status = 'expired', answered_at = now() where operation_id = $1::bigint and status = 'open'`, [v.id]).catch(() => undefined);
    await db().query(`insert into operation_events (operation_id, kind, actor, note) values ($1::bigint, 'cancelled', 'system', $2::jsonb)`, [v.id, JSON.stringify({ es: "No respondió a la otra hora", en: "No answer to the new time" })]);
    await liberarOperacion(v.id);
  }
  // «Pasó la noche» (no es un botón): a las 6 AM se cierra. Lista con entrada / mesa que llegó → done; sin marcar → done «sin_marcar».
  const fin = (await db().query<{ num: string; uid: string }>(
    `update operations o set status = 'done', done_at = now(), door_code = null, updated_at = now(),
            status_detail = case when coalesce((o.details->>'in_n')::int, 0) > 0 then 'entro' when o.details->>'k' = 'lista' then 'sin_entrar' else 'sin_marcar' end
       from cities c where c.id = o.city_id and o.kind = 'night' and o.status = 'confirmed' and o.night_date < ${NOCHE_SQL("now()", "c.timezone")}${y}
     returning o.number as num, o.user_id::text as uid`, a)).rows;
  for (const v of fin) {
    const o = await leer(db(), "o.number = $1", [v.num]);
    if (o?.detail === "entro") await avisarCliente(v.num, "noche_done");
  }
  return vencidas.length + sinAlt.length + fin.length;
}

/* ── Si sube el cover de una noche con listas o mesas vivas: un SMS a cada una (lo enviado no cambia) ── */
export async function avisarCoverSube(negocio: string, antes: number) {
  const h = await herramientaNoche(negocio);
  if (!h || !h.prox || h.prox.cuando !== "hoy" || h.prox.cover <= antes) return 0;
  const L = (await db().query<{ num: string }>(
    `select o.number as num from operations o where o.business_id = $1 and o.kind = 'night' and o.status = any($2::text[]) and o.night_date = $3::date and coalesce((o.details->>'sms')::boolean, true)`,
    [negocio, VIVAS, h.hoy])).rows;
  for (const x of L) {
    const o = await leer(db(), "o.number = $1", [x.num]);
    if (o) await avisarCliente(x.num, "noche_cover", { cover: usdN(h.prox.cover), puerta: `${puertaTexto(o.det, true)}.` });
  }
  return L.length;
}

/* ── Tu noche (APP-NEG-NOCHE-ESTADO) ── */
export type NocheVista = {
  numero: string; status: string; detalle: string | null; k: "lista" | "mesa" | "vip"; negocio: { id: string; nombre: string; telefono: string | null; direccion: string | null; foto: string | null };
  svc: Bi; night: string; hoy: boolean; dow: number; llega: number; pax: number; occ: string | null; nota: string | null; code: string | null; puerta: { es: string; en: string };
  edad: number; hold: number; cut: number | null; nowN: number; dep: number; pago: { st: string | null; devuelto: number; marca: string | null; l4: string | null };
  alt: { m: number } | null; motivoNeg: string | null; perdio: boolean; inN: number | null; cover: number; resena: boolean;
  linea: { at: string; kind: string; note: Bi | null }[];
};
export async function nocheVista(userId: string, numero: string): Promise<NocheVista | null> {
  if (!NUM_N.test(numero)) return null;
  await vencerNoche({ userId, numero });
  const o = (await db().query<{ id: string; num: string; status: string; detail: string | null; det: Record<string, unknown>; night: string; hoy: string; nowN: number; pax: number; note: string | null; code: string | null;
    dep: number; biz: string; nombre: string; phone: string | null; address: string | null; foto: string | null; pst: string | null; dev: number | null; marca: string | null; l4: string | null }>(
    `select o.id::text, o.number as num, o.status, o.status_detail as detail, o.details as det, o.night_date::text as night, ${NOCHE_SQL("now()", "c.timezone")}::text as hoy,
            (extract(epoch from (now() at time zone c.timezone) - (o.night_date + time '12:00')) / 60)::int as "nowN", o.party_size as pax, o.customer_note as note, o.door_code as code,
            o.deposit_cents as dep, b.id as biz, b.name as nombre, b.phone, b.address, (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1) as foto,
            p.status as pst, p.refunded_cents as dev, p.card_brand as marca, p.card_last4 as l4
       from operations o join businesses b on b.id = o.business_id join cities c on c.id = o.city_id left join payments p on p.operation_id = o.id and p.kind = 'deposit'
      where o.kind = 'night' and o.number = $1 and o.user_id = $2`, [numero, userId])).rows[0];
  if (!o) return null;
  const alt = o.status === "change_proposed" ? (await db().query<{ m: number }>(`select (proposed->>'m')::int as m from change_proposals where operation_id = $1::bigint and status = 'open' order by id desc limit 1`, [o.id])).rows[0] ?? null : null;
  const L = (await db().query<{ at: string; kind: string; note: Bi | null }>(`select at::text, kind, note from operation_events where operation_id = $1::bigint order by at, id`, [o.id])).rows;
  const resena = (await db().query(`select 1 from reviews where operation_id = $1::bigint limit 1`, [o.id]).catch(() => ({ rowCount: 0 }))).rowCount! > 0;
  const d = o.det;
  return {
    numero: o.num, status: o.status, detalle: o.detail, k: d.k as NocheVista["k"], negocio: { id: o.biz, nombre: o.nombre, telefono: o.phone, direccion: o.address, foto: o.foto },
    svc: d.svc as Bi, night: o.night, hoy: o.night === o.hoy, dow: new Date(`${o.night}T12:00:00Z`).getUTCDay(), llega: Number(d.arrive), pax: o.pax, occ: (d.occ as string) ?? null, nota: o.note,
    // El código solo mientras la reserva está viva (y nunca antes de que el local confirme la mesa).
    code: o.status === "confirmed" ? o.code : null, puerta: { es: puertaTexto(d, true), en: puertaTexto(d, false) }, edad: Number(d.edad ?? 21), hold: Number(d.hold ?? 30),
    cut: d.cut == null ? null : Number(d.cut), nowN: o.nowN, dep: o.dep, pago: { st: o.pst, devuelto: o.dev ?? 0, marca: o.marca, l4: o.l4 }, alt, motivoNeg: (d.motivoNeg as string) ?? null,
    perdio: !!d.perdio, inN: d.in_n == null ? null : Number(d.in_n), cover: Number(d.cover_cents ?? 0), resena, linea: L,
  };
}

/* ── Panel: lo que espera respuesta, las mesas de esta noche y la lista de esta noche (la puerta) ── */
export type FilaNoche = { numero: string; st: string; detalle: string | null; who: string; k: string; svc: Bi; night: string; llega: number; pax: number; occ: string | null; nota: string | null;
  dep: number; pay: string | null; code: string | null; inN: number | null; llego: boolean; resp: number | null; cupo: number | null; nowN: number; hold: number; esHoy: boolean };
export async function nocheHoy(negocio: string): Promise<{ esperan: FilaNoche[]; mesas: FilaNoche[]; lista: FilaNoche[]; hoy: string; nowN: number }> {
  await vencerNoche({ negocio });
  const x = await contexto(db(), negocio);
  if (!x) return { esperan: [], mesas: [], lista: [], hoy: "", nowN: 0 };
  const R = (await db().query<FilaNoche & { item: string; tables: number }>(
    `select o.number as numero, o.status as st, o.status_detail as detalle, coalesce(nullif(u.first_name, ''), 'Cliente') || coalesce(' ' || left(nullif(u.last_name, ''), 1) || '.', '') as who,
            o.details->>'k' as k, o.details->'svc' as svc, o.night_date::text as night, (o.details->>'arrive')::int as llega, o.party_size as pax, o.details->>'occ' as occ, o.customer_note as nota,
            o.deposit_cents as dep, o.pay_status as pay, case when o.status = 'confirmed' then o.door_code end as code, (o.details->>'in_n')::int as "inN", coalesce((o.details->>'llego')::boolean, false) as llego,
            case when o.status = 'pending' then greatest(0, ceil(extract(epoch from o.respond_by - now()) / 60))::int end as resp, o.details->>'item' as item,
            coalesce((i.svc_attrs->>'tables')::int, 1) as tables, coalesce((o.details->>'hold')::int, 30) as hold, o.night_date = $2::date as "esHoy", $3::int as "nowN", null::int as cupo
       from operations o join users u on u.id = o.user_id left join items i on i.id = (o.details->>'item')::bigint
      where o.business_id = $1 and o.kind = 'night' and ((o.status in ('pending', 'change_proposed') and o.night_date >= $2::date) or (o.night_date = $2::date and o.status in ('confirmed', 'done')))
      order by o.night_date, (o.details->>'arrive')::int, o.id`, [negocio, x.hoy, x.ahoraN])).rows;
  // El cupo de cada mesa esa noche: las mesas de ese tipo menos TODAS las reservas vivas (esta incluida), de cualquier día de la lista.
  const C = (await db().query<{ d: string; item: string; n: number }>(
    `select night_date::text as d, details->>'item' as item, count(*)::int as n from operations where business_id = $1 and kind = 'night' and status = any($2::text[]) and night_date >= $3::date group by 1, 2`, [negocio, VIVAS, x.hoy])).rows;
  const vivas = (n: string, item: string) => C.find((z) => z.d === n && z.item === item)?.n ?? 0;
  const F = R.map(({ item, tables, ...z }) => ({ ...z, cupo: z.k === "lista" ? null : Math.max(0, tables - vivas(z.night, item)) }));
  return { esperan: F.filter((z) => z.st === "pending" || z.st === "change_proposed"), mesas: F.filter((z) => z.esHoy && z.k !== "lista" && (z.st === "confirmed" || z.st === "done")),
    lista: F.filter((z) => z.esHoy && z.k === "lista" && (z.st === "confirmed" || z.st === "done")), hoy: x.hoy, nowN: x.ahoraN };
}
export type NochePanelV = FilaNoche & { slots: number[]; puerta: Bi; edad: number; motivoNeg: string | null; linea: { at: string; kind: string; note: Bi | null }[] };
export async function nochePanel(negocio: string, numero: string): Promise<NochePanelV | null> {
  if (!NUM_N.test(numero)) return null;
  const H = await nocheHoy(negocio);
  let f = [...H.esperan, ...H.mesas, ...H.lista].find((z) => z.numero === numero) ?? null;
  const o = await leer(db(), "o.business_id = $1 and o.number = $2", [negocio, numero]);
  if (!o) return null;
  if (!f) f = { numero, st: o.status, detalle: o.detail, who: o.cliente, k: String(o.det.k), svc: o.det.svc as Bi, night: o.night, llega: Number(o.det.arrive), pax: o.pax, occ: (o.det.occ as string) ?? null,
    nota: null, dep: o.dep, pay: o.pay, code: null, inN: o.det.in_n == null ? null : Number(o.det.in_n), llego: !!o.det.llego, resp: null, cupo: null, nowN: o.nowN, hold: Number(o.det.hold ?? 30), esHoy: o.night === o.hoy };
  const x = (await contexto(db(), negocio))!, s = await servicio(db(), negocio, String(o.det.item));
  const slots = s && f.st === "pending" ? ((await noches(db(), x, s)).find((n) => n.fecha === o.night)?.slots ?? []).filter((m) => m !== f!.llega) : [];
  const L = (await db().query<{ at: string; kind: string; note: Bi | null }>(`select at::text, kind, note from operation_events where operation_id = $1::bigint order by at, id`, [o.id])).rows;
  return { ...f, slots, puerta: { es: puertaTexto(o.det, true), en: puertaTexto(o.det, false) }, edad: Number(o.det.edad ?? 21), motivoNeg: (o.det.motivoNeg as string) ?? null, linea: L };
}
