import "server-only";
import type { PoolClient } from "pg";
import { contexto } from "./citas";
import { cobrarOperacion, comision, devolverPago, liberarOperacion, registrarRetencion } from "./cobros";
import { valores } from "./config";
import { db, tx } from "./db";
import { AREAS_EVP, DURACIONES, EXTRAS_FABRICA, HORAS_EVP, MENUS_FABRICA, NUM_EP, OCASIONES, PRESUPUESTOS, diaEvp, dinero, horaL, lbl, type AjustesEvp, type Bi, type ExtraEvp, type MenuEvp } from "./evento-privado-comun";
import { pasarela } from "./pagos/pasarela";

/* Evento privado (Fase 6 · 6i · fase6-eventos.md §4 6i, §6 #9; diseño To'Latino Evento privado.dc.html + evp-flow.js). La solicitud de un grupo
   grande a un restaurante: una operación 'private_event' con número EP-4101….
   Patrón seguido (REVISION «### 6i»): la mudanza de 4y-2 (lib/envios.ts): el negocio manda una PROPUESTA versionada que vence; el cliente acepta
   LA VERSIÓN exacta y en la misma pasada se RETIENE y se COBRA el depósito con destino a la cuenta del negocio (como toda la app, no como los
   boletos); y las reglas de cancelar de Fiestas (4v) y Noche (4nc): gratis hasta el plazo (evp_cancelar_h, escrito en la propuesta), después el
   depósito se queda con el negocio; si cancela el negocio, devolución completa siempre.
   - Nada se cobra al pedir. El dinero lo decide la base: cada línea, el subtotal, el impuesto de la ciudad, el total, el depósito (el % del
     negocio en ese momento) y el plazo salen del trigger de private_event_quotes; la app nunca escribe un monto que se cobre.
   - Aceptar: solo la ÚLTIMA versión, vigente, con la solicitud en «te mandaron su propuesta» (lo revisa también la base al insertar la
     aceptación). Un solo pago por solicitud (índice único de la aceptación con depósito y de payments(operation, kind, seq)); un doble toque
     espera el candado de la fila y responde «ya está».
   - Devolver: lo calcula el servidor con la regla y nunca pasa de lo cobrado menos lo devuelto (devolverPago lo vuelve a acotar). Si Stripe
     falla, el barrido lo reintenta con la misma llave (una sola devolución).
   - Sin teléfonos: el restaurante ve nombre + inicial; la nota y los cambios no admiten teléfonos; hablar = Mensajes (2p), con el contexto. */
type Q = PoolClient | ReturnType<typeof db>;
type Res<T = object> = ({ ok: true } & T) | { ok: false; msg: Bi; tarjeta?: true; fecha?: true };
const no = (es: string, en: string, extra?: { tarjeta?: true; fecha?: true }) => ({ ok: false as const, msg: { es, en }, ...extra });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, YMD = /^\d{4}-\d{2}-\d{2}$/;
const TEL = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
const limpio = (t: unknown, n: number) => String(t ?? "").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").replace(/[ \t]+/g, " ").trim().slice(0, n);
const masDias = (ymd: string, n: number) => { const d = new Date(`${ymd}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
/* Los errores de la base (triggers «evp: …») dichos para la persona. */
function deLaBase(e: unknown): { ok: false; msg: Bi } | null {
  const m = String((e as Error)?.message ?? "");
  if (!m.startsWith("evp:")) return null;
  if (/reemplazada/.test(m)) return no("El restaurante mandó una propuesta nueva. Mírala antes de aceptar.", "The restaurant sent a new proposal. Check it before accepting.");
  if (/venció/.test(m)) return no("Esta propuesta ya venció. No se cobró nada.", "This proposal expired. Nothing was charged.");
  if (/máximo de propuestas/.test(m)) return no("Ya mandaste el máximo de propuestas para esta solicitud. Escríbele por Mensajes.", "You already sent the most proposals for this request. Write them in Messages.");
  if (/máximo de cambios/.test(m)) return no("Ya pediste el máximo de cambios. Escríbele por Mensajes.", "You already asked for the most changes. Write them in Messages.");
  if (/menor que el depósito/.test(m)) return no("El nuevo total no puede ser menor que el depósito ya pagado.", "The new total cannot be less than the deposit already paid.");
  if (/fuera de rango|nombre/.test(m)) return no("Revisa las líneas: cada una con su nombre, cantidad y precio.", "Check the lines: each one with its name, quantity and price.");
  if (/fecha ya pasó/.test(m)) return no("Esa fecha ya pasó.", "That date has passed.");
  return no("Esta solicitud ya cambió. Actualiza la pantalla.", "This request already changed. Refresh the screen.");
}

/* ── Los ajustes del restaurante (el interruptor y sus reglas) ── */
type FilaAj = { on: boolean; min: number; cap: number; lead: number; pct: number; areas: string[]; whole: number | null; menus: MenuEvp[]; extras: ExtraEvp[]; reply: number };
export async function ajustesEvp(negocio: string, c: Q = db()): Promise<AjustesEvp> {
  const r = (await c.query<FilaAj>(
    `select is_on as on, min_party as min, capacity as cap, lead_days as lead, deposit_pct as pct, areas, whole_cents as whole, menus, extras, reply_h as reply from private_event_settings where business_id = $1`, [negocio])).rows[0];
  if (r) return { on: r.on, minParty: r.min, capacity: r.cap, leadDays: r.lead, depositPct: r.pct, areas: r.areas, wholeCents: r.whole, menus: r.menus, extras: r.extras, replyH: r.reply };
  const cfg = await valores("evp_deposito_pct", "evp_anticipacion_dias");
  // De fábrica: desde el grupo más grande de Reservaciones + 1 (o 9), 40 personas, el % de Configuración y los menús del diseño.
  const jm = (await c.query<{ m: number | null }>(`select case when join_tables then join_max end as m from reservation_settings where business_id = $1`, [negocio])).rows[0]?.m ?? null;
  const min = Math.max(2, Math.min(200, (jm ?? 8) + 1));
  return { on: false, minParty: min, capacity: Math.max(40, min), leadDays: cfg.evp_anticipacion_dias, depositPct: cfg.evp_deposito_pct, areas: ["salon"], wholeCents: 25000, menus: MENUS_FABRICA, extras: EXTRAS_FABRICA, replyH: 2 };
}
export type AjustesIn = Partial<{ on: boolean; minParty: number; capacity: number; leadDays: number; depositPct: number; areas: string[]; wholeCents: number | null; menus: MenuEvp[]; extras: ExtraEvp[]; replyH: number }>;
export async function guardarAjustesEvp(negocio: string, actorId: string, p: AjustesIn): Promise<Res> {
  const ent = (v: unknown, lo: number, hi: number) => { const z = Math.round(Number(v)); return Number.isFinite(z) && z >= lo && z <= hi ? z : null; };
  const a0 = await ajustesEvp(negocio), cfg = await valores("evp_anticipacion_dias");
  const min = p.minParty === undefined ? a0.minParty : ent(p.minParty, 2, 200), cap = p.capacity === undefined ? a0.capacity : ent(p.capacity, 2, 500);
  const lead = p.leadDays === undefined ? a0.leadDays : ent(p.leadDays, 1, 60), pct = p.depositPct === undefined ? a0.depositPct : ent(p.depositPct, 10, 50);
  const reply = p.replyH === undefined ? a0.replyH : ent(p.replyH, 1, 24);
  if (min == null || cap == null || lead == null || pct == null || reply == null) return no("Revisa los números.", "Check the numbers.");
  if (cap < min) return no("La capacidad no puede ser menor que el grupo mínimo.", "Capacity cannot be less than the minimum group.");
  if (lead < cfg.evp_anticipacion_dias) return no(`La anticipación mínima es de ${cfg.evp_anticipacion_dias} días.`, `The minimum notice is ${cfg.evp_anticipacion_dias} days.`);
  const areas = p.areas === undefined ? a0.areas : [...new Set((Array.isArray(p.areas) ? p.areas : []).filter((k) => ["salon", "terraza", "barra"].includes(String(k))).map(String))];
  if (!areas.length) return no("Elige al menos un área.", "Pick at least one area.");
  const whole = p.wholeCents === undefined ? a0.wholeCents : p.wholeCents === null ? null : ent(p.wholeCents, 0, 1_000_000);
  if (p.wholeCents !== undefined && p.wholeCents !== null && whole == null) return no("Revisa el cargo de «Todo el local».", "Check the “Whole place” charge.");
  const lista = <T extends { k: string; es: string; en: string; cents: number | null }>(L: unknown, max: number, tope: number, extra?: (x: Record<string, unknown>) => Partial<T>): T[] | null => {
    if (!Array.isArray(L) || L.length > max) return null;
    const out: T[] = [], ks = new Set<string>();
    for (const x0 of L) {
      const x = (x0 ?? {}) as Record<string, unknown>, es = limpio(x.es, 60), en = limpio(x.en, 60);
      const k = /^[a-z0-9]{2,12}$/.test(String(x.k)) ? String(x.k) : Math.random().toString(36).slice(2, 10);
      const cents = x.cents === null || x.cents === undefined || x.cents === "" ? null : ent(x.cents, 0, tope);
      if (es.length < 2 || ks.has(k) || (x.cents != null && x.cents !== "" && cents == null) || TEL.test(es) || TEL.test(en)) return null;
      ks.add(k);
      out.push({ k, es, en, cents, ...(extra ? extra(x) : {}) } as T);
    }
    return out;
  };
  const menus = p.menus === undefined ? a0.menus : lista<MenuEvp>(p.menus, 8, 100_000, (x) => ({ des: limpio(x.des, 120), desEn: limpio(x.desEn, 120) }));
  const extras = p.extras === undefined ? a0.extras : lista<ExtraEvp>(p.extras, 10, 500_000);
  if (!menus || !extras) return no("Revisa los menús y los extras: cada uno con su nombre y un precio válido, sin teléfonos.", "Check the menus and extras: each one with a name and a valid price, no phone numbers.");
  if (!menus.length) return no("Agrega al menos un menú (o «Que me propongan»).", "Add at least one menu (or “Let them suggest”).");
  const on = p.on === undefined ? a0.on : p.on === true;
  if (on) {
    const t = await (await import("./cobros")).tarjetaDe(negocio);
    if (!t.cuenta) return no("Para encender Evento privado, conecta Cobros con tarjeta: el depósito se cobra en la app.", "To turn on Private event, connect Card payouts: the deposit is charged in the app.");
  }
  return tx(async (c): Promise<Res> => {
    const b = (await c.query<{ city: string; cat: string }>(`select city_id as city, category_id as cat from businesses where id = $1 for update`, [negocio])).rows[0];
    if (!b || b.cat !== "NEG-FOOD") return no("Evento privado es para restaurantes.", "Private event is for restaurants.");
    const antes = (await c.query(`select is_on, min_party, capacity, lead_days, deposit_pct, areas, whole_cents, jsonb_array_length(menus) as menus, jsonb_array_length(extras) as extras from private_event_settings where business_id = $1`, [negocio])).rows[0] ?? null;
    await c.query(
      `insert into private_event_settings (business_id, city_id, is_on, min_party, capacity, lead_days, deposit_pct, areas, whole_cents, menus, extras, reply_h, updated_by, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8::text[], $9, $10::jsonb, $11::jsonb, $12, $13, now())
       on conflict (business_id) do update set is_on = $3, min_party = $4, capacity = $5, lead_days = $6, deposit_pct = $7, areas = $8::text[], whole_cents = $9, menus = $10::jsonb, extras = $11::jsonb,
         reply_h = $12, updated_by = $13, updated_at = now()`,
      [negocio, b.city, on, min, cap, lead, pct, areas, whole, JSON.stringify(menus), JSON.stringify(extras), reply, actorId]);
    await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, 'evp.ajustes', 'business', $2, $3, $4::jsonb, $5::jsonb)`,
      [actorId, negocio, b.city, antes ? JSON.stringify(antes) : null, JSON.stringify({ is_on: on, min_party: min, capacity: cap, lead_days: lead, deposit_pct: pct, areas, whole_cents: whole, menus: menus.length, extras: extras.length })]);
    return { ok: true };
  });
}

/* ── La pantalla de pedir (APP-NEG-EVENTO-PRIVADO, formulario) ── */
export type PaginaEvp = {
  negocio: { id: string; nombre: string; foto: string | null; direccion: string | null; ciudad: string };
  aj: AjustesEvp; desde: string; hasta: string; hoy: string; yo: { nombre: string; tel4: string } | null; pendientes: number; maxPend: number;
};
export async function paginaEvp(negocio: string, userId: string | null): Promise<PaginaEvp | null> {
  const x = await contexto(db(), negocio, ["NEG-FOOD"]);
  if (!x) return null;
  const aj = await ajustesEvp(negocio);
  if (!aj.on) return null;
  const cfg = await valores("evp_anticipacion_dias", "evp_dias_adelante", "evp_pendientes_max");
  const ciudad = (await db().query<{ n: string }>(`select name as n from cities where id = $1`, [x.city])).rows[0]?.n ?? "";
  const u = userId ? (await db().query<{ nombre: string; tel4: string; n: number }>(
    `select coalesce(nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), ''), '') as nombre, right(phone, 4) as tel4,
            (select count(*)::int from operations where user_id = $1 and kind = 'private_event' and status in ('pending', 'change_proposed')) as n from users where id = $1`, [userId])).rows[0] : null;
  return {
    negocio: { id: x.id, nombre: x.name, foto: x.foto, direccion: x.address, ciudad }, aj, hoy: x.hoy,
    desde: masDias(x.hoy, Math.max(aj.leadDays, cfg.evp_anticipacion_dias)), hasta: masDias(x.hoy, cfg.evp_dias_adelante),
    yo: u ? { nombre: u.nombre, tel4: u.tel4 } : null, pendientes: u?.n ?? 0, maxPend: cfg.evp_pendientes_max,
  };
}

/* ── Pedir (sin dinero) ── */
export type EvpIn = { fecha: string; m: number; horas: number; personas: number; occ: string; area: string; menu: string; bud: string; ext: string[]; nota?: string; clave: string };
export async function pedirEvp(userId: string, negocio: string, f: EvpIn, entorno: string): Promise<Res<{ numero: string }>> {
  if (!UUID.test(String(f?.clave)) || !YMD.test(String(f?.fecha))) return no("Revisa tu solicitud y vuelve a intentarlo.", "Check your request and try again.");
  const nota = limpio(f.nota, 300);
  if (TEL.test(nota)) return no("Por seguridad, sin teléfonos en la nota. Para hablar con el restaurante usa Mensajes.", "For safety, no phone numbers in the note. To talk to the restaurant use Messages.");
  const m = Math.round(Number(f.m)), horas = Math.round(Number(f.horas)), p = Math.round(Number(f.personas));
  if (!HORAS_EVP.includes(m)) return no("Elige la hora.", "Pick the time.", { fecha: true });
  if (!DURACIONES.includes(horas)) return no("Elige cuánto dura.", "Pick how long it lasts.");
  if (!OCASIONES.some((z) => z[0] === f.occ)) return no("Elige qué celebran.", "Pick what you are celebrating.");
  if (!PRESUPUESTOS.some((z) => z[0] === f.bud)) return no("Elige el presupuesto por persona.", "Pick the budget per person.");
  const cfg = await valores("evp_anticipacion_dias", "evp_dias_adelante", "evp_pendientes_max", "evp_responder_h");
  return tx(async (c): Promise<Res<{ numero: string }>> => {
    const ya = (await c.query<{ number: string }>(`select number from operations where user_id = $1 and client_key = $2`, [userId, f.clave])).rows[0];
    if (ya) return { ok: true, numero: ya.number };
    await c.query(`select pg_advisory_xact_lock(hashtext('evp:' || $1::text))`, [userId]);
    const x = await contexto(c, negocio, ["NEG-FOOD"]);
    if (!x) return no("Este restaurante no está disponible.", "This restaurant is not available.");
    const aj = await ajustesEvp(negocio, c);
    if (!aj.on) return no(`${x.name} no recibe eventos privados en la app por ahora: llámalo.`, `${x.name} is not taking private events in the app right now: call them.`);
    if (p < aj.minParty || p > aj.capacity) return no(`Desde ${aj.minParty} hasta ${aj.capacity} personas.`, `From ${aj.minParty} to ${aj.capacity} guests.`);
    const desde = masDias(x.hoy, Math.max(aj.leadDays, cfg.evp_anticipacion_dias)), hasta = masDias(x.hoy, cfg.evp_dias_adelante);
    if (f.fecha < desde || f.fecha > hasta) return no(`Pídelo con ${Math.max(aj.leadDays, cfg.evp_anticipacion_dias)} días o más, para que preparen la comida.`, `Request it at least ${Math.max(aj.leadDays, cfg.evp_anticipacion_dias)} days ahead, so they can prepare the food.`, { fecha: true });
    if (!(aj.areas.includes(f.area) || (f.area === "todo" && aj.wholeCents != null))) return no("Elige dónde los sientan.", "Pick where you sit.");
    const menu = aj.menus.find((z) => z.k === f.menu);
    if (!menu) return no("Elige qué van a comer.", "Pick what you will eat.");
    const ext = [...new Set((Array.isArray(f.ext) ? f.ext : []).map(String))];
    if (ext.some((k) => !aj.extras.some((z) => z.k === k))) return no("Ese extra ya no está. Revisa lo que necesitan.", "That extra is gone. Check what you need.");
    const pend = (await c.query<{ n: number }>(`select count(*)::int as n from operations where user_id = $1 and kind = 'private_event' and status in ('pending', 'change_proposed')`, [userId])).rows[0]?.n ?? 0;
    if (pend >= cfg.evp_pendientes_max) return no(`Tienes ${pend} solicitudes esperando. Espera a que te contesten.`, `You have ${pend} requests waiting. Wait for a reply.`);
    if (x.plan !== "pro") {
      const r = (await c.query<{ cap: number; usados: number }>(`select coalesce((select (value #>> '{}')::int from platform_config where key = 'free_ops_cap'), 10) as cap, (select count(*)::int from operations where business_id = $1 and kind <> 'table' and free_quota_month = $2) as usados`, [x.id, x.mes])).rows[0];
      if (r && r.usados >= r.cap) return no(`${x.name} no recibe más solicitudes en línea este mes. Llama.`, `${x.name} takes no more online requests this month. Call.`);
    }
    const numero = `EP-${(await c.query<{ n: string }>(`select nextval('private_event_seq')::text as n`)).rows[0]!.n}`;
    // Lo pedido se copia (si el restaurante cambia sus menús después, la solicitud no cambia).
    const det = { occ: f.occ, area: f.area, menu: { k: menu.k, es: menu.es, en: menu.en, cents: menu.cents }, bud: f.bud, ext: aj.extras.filter((z) => ext.includes(z.k)).map((z) => ({ k: z.k, es: z.es, en: z.en, cents: z.cents })), horas };
    const op = (await c.query<{ id: string }>(
      `insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, duration_min, party_size, customer_note, details, pay_mode, respond_by, free_quota_month, client_key, is_test)
       values ($1, 'private_event', $2, $3, $4, 'pending', ($5::date + make_interval(mins => $6::int)) at time zone $7, $8, $9, nullif($10, ''), $11::jsonb, 'app',
               least(now() + make_interval(hours => $12::int), ($5::date + make_interval(mins => $6::int)) at time zone $7), $13, $14, $15) returning id::text`,
      [numero, x.city, x.id, userId, f.fecha, m, x.tz, horas * 60, p, nota, JSON.stringify(det), cfg.evp_responder_h, x.plan === "pro" ? null : x.mes, f.clave, entorno !== "produccion"])).rows[0]!.id;
    await c.query(`insert into operation_events (operation_id, kind, actor, actor_id) values ($1::bigint, 'sent', 'user', $2)`, [op, userId]);
    return { ok: true, numero };
  });
}

/* ── Leer una solicitud ── */
type Op = { id: string; num: string; biz: string; negocio: string; uid: string; cliente: string; status: string; detail: string | null; ymd: string; m: number; dur: number; p: number; tz: string; city: string;
  det: Record<string, unknown>; tot: number; dep: number; pay: string | null; pid: string | null; amount: number | null; refunded: number | null; pst: string | null; h_left: number; past: boolean; nota: string | null };
const SEL = `select o.id::text, o.number as num, o.business_id as biz, b.name as negocio, o.user_id::text as uid,
                    coalesce(nullif(u.first_name, ''), 'Cliente') || coalesce(' ' || left(nullif(u.last_name, ''), 1) || '.', '') as cliente, o.status, o.status_detail as detail,
                    (o.scheduled_at at time zone c.timezone)::date::text as ymd, (extract(hour from o.scheduled_at at time zone c.timezone) * 60 + extract(minute from o.scheduled_at at time zone c.timezone))::int as m,
                    o.duration_min as dur, o.party_size as p, c.timezone as tz, o.city_id as city, o.details as det, o.total_cents as tot, o.deposit_cents as dep, o.pay_status as pay,
                    p.id::text as pid, p.amount_cents as amount, p.refunded_cents as refunded, p.status as pst,
                    (extract(epoch from (o.scheduled_at - now())) / 3600)::float8 as h_left, o.scheduled_at < now() as past, o.customer_note as nota
               from operations o join businesses b on b.id = o.business_id join cities c on c.id = o.city_id join users u on u.id = o.user_id
               left join payments p on p.operation_id = o.id and p.kind = 'deposit'`;
async function leer(c: Q, where: string, args: unknown[], lock = false): Promise<Op | null> {
  return (await c.query<Op>(`${SEL} where o.kind = 'private_event' and ${where}${lock ? " for update of o" : ""}`, args)).rows[0] ?? null;
}
type Quote = { id: string; v: number; kind: "quote" | "alt" | "change"; ymd: string; m: number; dur: number; p: number; lines: { l: Bi; q: number; unit: number; cents: number; k: string }[]; inc: Bi; nota: string | null;
  sub: number; taxBp: number; tax: number; tot: number; pct: number; dep: number; cancelH: number; vence: number; st: "sent" | "accepted" | "superseded" | "expired" | "closed"; at: number };
const QSEL = `select q.id::text, q.version as v, q.kind, (q.starts_at at time zone c.timezone)::date::text as ymd,
                     (extract(hour from q.starts_at at time zone c.timezone) * 60 + extract(minute from q.starts_at at time zone c.timezone))::int as m, q.duration_min as dur, q.party_size as p,
                     q.lines, q.includes as inc, q.note as nota, q.subtotal_cents as sub, q.tax_bp as "taxBp", q.tax_cents as tax, q.total_cents as tot, q.deposit_pct as pct, q.deposit_cents as dep,
                     q.cancel_h as "cancelH", (extract(epoch from q.valid_until) * 1000)::float8 as vence, q.status as st, (extract(epoch from q.created_at) * 1000)::float8 as at
                from private_event_quotes_ef q join cities c on c.id = q.city_id`;
async function propuestas(c: Q, opId: string): Promise<Quote[]> {
  return (await c.query<Quote>(`${QSEL} where q.operation_id = $1::bigint order by q.version`, [opId])).rows;
}
const acuerdoDe = (Q: Quote[]) => [...Q].reverse().find((q) => q.st === "accepted") ?? null;
async function ev(c: Q, op: string, kind: string, actor: "user" | "member" | "system" | "admin", actorId: string | null, note?: Bi) {
  await c.query(`insert into operation_events (operation_id, kind, actor, actor_id, note) values ($1::bigint, $2, $3, $4, $5::jsonb)`, [op, kind, actor, actorId, note ? JSON.stringify(note) : null]);
}

/* ── Avisos ── */
async function avisarEvp(numero: string, quien: "cliente" | "negocio", tpl: string, extra: Record<string, string> = {}) {
  const o = await leer(db(), "o.number = $1", [numero]);
  if (!o) return;
  const A = await import("./avisos"), cfg = await valores("evp_responder_h", "evp_propuesta_h");
  const vars = { negocio: o.negocio, cliente: o.cliente, dia: diaEvp(o.ymd, true), hora: horaL(o.m), personas: String(o.p), total: dinero(o.tot), dep: dinero(o.dep), resto: dinero(Math.max(0, o.tot - o.dep)),
    horas: String(quien === "negocio" ? cfg.evp_responder_h : cfg.evp_propuesta_h), dev: "", motivo: "", que: "", ...extra };
  if (quien === "cliente") await A.avisar(o.uid, tpl, vars, { href: `/privado/${numero}`, ref: ["private_event", numero] });
  else await A.avisarNegocio(o.biz, tpl, vars, { href: `/panel/${o.biz}/hoy?det=evp:${numero}`, ref: ["private_event", numero] });
}
export async function avisarEvpNueva(numero: string) { await avisarEvp(numero, "negocio", "evp_nueva"); }

/* ── El restaurante responde: propuesta (su fecha u otra fecha), un cambio de un evento confirmado, «No puedo» ── */
export type PropuestaIn = { tipo: "quote" | "alt" | "change"; fecha?: string | null; m?: number | null; horas: number; personas: number; lineas: { k?: string; l: string; lEn?: string; q: number; unit: number }[]; incluye: string; nota?: string };
export async function proponerEvp(negocio: string, numero: string, actorId: string, p: PropuestaIn): Promise<Res<{ v: number }>> {
  if (!NUM_EP.test(numero) || !["quote", "alt", "change"].includes(String(p?.tipo))) return no("Esa solicitud no existe.", "That request does not exist.");
  const horas = Math.round(Number(p.horas)), personas = Math.round(Number(p.personas));
  if (!DURACIONES.includes(horas)) return no("Elige cuánto dura.", "Pick how long it lasts.");
  if (!(personas >= 2 && personas <= 500)) return no("Revisa cuántas personas.", "Check how many guests.");
  const incluye = limpio(p.incluye, 300), nota = limpio(p.nota, 300);
  if (incluye.length < 4) return no("Escribe qué incluye: comida, bebidas sin alcohol, el área, el servicio…", "Write what it includes: food, soft drinks, the area, the service…");
  if (TEL.test(incluye) || TEL.test(nota)) return no("Sin teléfonos: el cliente te escribe por Mensajes.", "No phone numbers: the client writes you in Messages.");
  const L = Array.isArray(p.lineas) ? p.lineas.slice(0, 21) : [];
  if (!L.length || L.length > 20) return no("Agrega al menos una línea (el menú por persona).", "Add at least one line (the menu per person).");
  const lineas = L.map((x) => ({ k: /^[a-z0-9_]{1,16}$/.test(String(x?.k)) ? String(x.k) : "otro", l: { es: limpio(x?.l, 80), en: limpio(x?.lEn, 80) || limpio(x?.l, 80) }, q: Math.round(Number(x?.q)), unit: Math.round(Number(x?.unit)) }));
  if (lineas.some((x) => x.l.es.length < 2 || TEL.test(x.l.es) || !(x.q >= 1 && x.q <= 500) || !(x.unit >= 0 && x.unit <= 1_000_000))) return no("Revisa las líneas: cada una con su nombre, cantidad y precio.", "Check the lines: each one with its name, quantity and price.");
  const cfg = await valores("evp_dias_adelante");
  let tpl = "evp_propuesta";
  try {
    const r = await tx(async (c): Promise<Res<{ v: number }>> => {
      const o = await leer(c, "o.business_id = $1 and o.number = $2", [negocio, numero], true);
      if (!o) return no("Esa solicitud no existe.", "That request does not exist.");
      if (p.tipo === "change" ? !(o.status === "confirmed" && ["change_req", "change_quote"].includes(o.detail ?? "") && !o.past) : !["pending", "change_proposed"].includes(o.status))
        return no("Esta solicitud ya cambió. Actualiza la pantalla.", "This request already changed. Refresh the screen.");
      const hoy = (await c.query<{ h: string }>(`select (now() at time zone $1)::date::text as h`, [o.tz])).rows[0]!.h;
      let ymd = o.ymd, m = o.m;
      if (p.tipo !== "quote") {
        ymd = YMD.test(String(p.fecha)) ? String(p.fecha) : o.ymd; m = p.m == null ? o.m : Math.round(Number(p.m));
        if (!HORAS_EVP.includes(m)) return no("Elige la hora.", "Pick the time.");
        if (ymd <= hoy || ymd > masDias(hoy, cfg.evp_dias_adelante)) return no("Elige una fecha de los próximos meses (desde mañana).", "Pick a date in the coming months (from tomorrow).");
        if (p.tipo === "alt" && ymd === o.ymd && m === o.m) return no("Esa es la misma fecha que pidieron: manda tu propuesta normal.", "That is the same date they asked for: send your regular proposal.");
      }
      const q = (await c.query<{ v: number; tot: number; dep: number; vence: string }>(
        `insert into private_event_quotes (operation_id, business_id, city_id, version, kind, starts_at, duration_min, party_size, lines, includes, note, subtotal_cents, tax_bp, tax_cents, total_cents, deposit_pct, deposit_cents, cancel_h, valid_until, created_by)
         values ($1::bigint, $2, $3, 1, $4, ($5::date + make_interval(mins => $6::int)) at time zone $7, $8, $9, $10::jsonb, $11::jsonb, nullif($12, ''), 0, 0, 0, 0, 0, 0, 0, now(), $13)
         returning version as v, total_cents as tot, deposit_cents as dep, valid_until::text as vence`,
        [o.id, o.biz, o.city, p.tipo, ymd, m, o.tz, horas * 60, personas, JSON.stringify(lineas), JSON.stringify({ es: incluye, en: incluye }), nota, actorId])).rows[0]!;
      if (p.tipo === "change") await c.query(`update operations set status_detail = 'change_quote', updated_at = now() where id = $1::bigint`, [o.id]);
      else await c.query(`update operations set status = 'change_proposed', status_detail = $2, answered_at = coalesce(answered_at, now()), respond_by = (select valid_until from private_event_quotes where operation_id = $1::bigint and version = $3),
                                 total_cents = $4, deposit_cents = $5, updated_at = now() where id = $1::bigint`, [o.id, p.tipo, q.v, q.tot, q.dep]);
      await ev(c, o.id, p.tipo === "change" ? "change_sent" : "quote_sent", "member", actorId, { es: `${p.tipo === "alt" ? "Otra fecha" : p.tipo === "change" ? "Cambio" : "Propuesta"} v${q.v}: total ${dinero(q.tot)} · depósito ${dinero(q.dep)}`, en: `${p.tipo === "alt" ? "Another date" : p.tipo === "change" ? "Change" : "Proposal"} v${q.v}: total ${dinero(q.tot)} · deposit ${dinero(q.dep)}` });
      tpl = p.tipo === "alt" ? "evp_otra_fecha" : p.tipo === "change" ? "evp_cambio" : "evp_propuesta";
      return { ok: true, v: q.v };
    });
    if (r.ok) {
      const ult = (await db().query<{ ymd: string; m: number; p: number; tot: number; dep: number }>(
        `select (q.starts_at at time zone c.timezone)::date::text as ymd, (extract(hour from q.starts_at at time zone c.timezone) * 60 + extract(minute from q.starts_at at time zone c.timezone))::int as m, q.party_size as p, q.total_cents as tot, q.deposit_cents as dep
           from private_event_quotes q join cities c on c.id = q.city_id join operations o on o.id = q.operation_id where o.number = $1 order by q.version desc limit 1`, [numero])).rows[0];
      if (ult) await avisarEvp(numero, "cliente", tpl, { dia: diaEvp(ult.ymd, true), hora: horaL(ult.m), personas: String(ult.p), total: dinero(ult.tot), dep: dinero(ult.dep) }).catch(() => undefined);
    }
    return r;
  } catch (e) {
    const x = deLaBase(e);
    if (x) return x;
    throw e;
  }
}
export async function noPuedoEvp(negocio: string, numero: string, actorId: string, motivo: string): Promise<Res> {
  const mot = limpio(motivo, 200);
  if (!NUM_EP.test(numero)) return no("Esa solicitud no existe.", "That request does not exist.");
  if (mot.length < 4) return no("Escribe el motivo: el cliente lo ve.", "Write the reason: the client sees it.");
  if (TEL.test(mot)) return no("Sin teléfonos en el motivo.", "No phone numbers in the reason.");
  let tpl: string | null = null;
  const r = await tx(async (c): Promise<Res> => {
    const o = await leer(c, "o.business_id = $1 and o.number = $2", [negocio, numero], true);
    if (!o) return no("Esa solicitud no existe.", "That request does not exist.");
    if (o.status === "confirmed" && ["change_req", "change_quote"].includes(o.detail ?? "")) {
      // No puede hacer el CAMBIO: el evento sigue como se acordó.
      await c.query(`update operations set status_detail = null, details = details || jsonb_build_object('motivoCambioNo', $2::text), updated_at = now() where id = $1::bigint`, [o.id, mot]);
      await ev(c, o.id, "change_declined", "member", actorId, { es: `No puede hacer el cambio: ${mot}`, en: `Cannot make the change: ${mot}` });
      tpl = "evp_cambio_no";
      return { ok: true };
    }
    if (!["pending", "change_proposed"].includes(o.status)) return no("Esta solicitud ya cambió. Actualiza la pantalla.", "This request already changed. Refresh the screen.");
    await c.query(`update operations set status = 'declined', status_detail = 'negocio', answered_at = now(), respond_by = null, details = details || jsonb_build_object('motivoNo', $2::text), updated_at = now() where id = $1::bigint`, [o.id, mot]);
    await ev(c, o.id, "declined", "member", actorId, { es: `No puede: ${mot}`, en: `Cannot: ${mot}` });
    tpl = "evp_no";
    return { ok: true };
  });
  if (r.ok && tpl) await avisarEvp(numero, "cliente", tpl, { motivo: mot }).catch(() => undefined);
  return r;
}
/* El restaurante cancela un evento confirmado: motivo obligatorio y devolución COMPLETA de lo cobrado (lo calcula el servidor). */
export async function cancelarEvpNegocio(negocio: string, numero: string, actorId: string, motivo: string): Promise<Res> {
  const mot = limpio(motivo, 200);
  if (!NUM_EP.test(numero)) return no("Esa solicitud no existe.", "That request does not exist.");
  if (mot.length < 4) return no("Escribe el motivo: el cliente lo ve.", "Write the reason: the client sees it.");
  if (TEL.test(mot)) return no("Sin teléfonos en el motivo.", "No phone numbers in the reason.");
  let o: Op | null = null;
  const r = await tx(async (c): Promise<Res> => {
    o = await leer(c, "o.business_id = $1 and o.number = $2", [negocio, numero], true);
    if (!o || o.status !== "confirmed" || o.past) return no("Este evento ya cambió. Actualiza la pantalla.", "This event already changed. Refresh the screen.");
    const dev = o.pst === "captured" || o.pst === "partially_refunded" ? Math.max(0, (o.amount ?? 0) - (o.refunded ?? 0)) : 0;
    await c.query(`update operations set status = 'cancelled', status_detail = null, cancelled_by = 'business', cancelled_at = now(), cancel_reason = 'negocio', details = details || $2::jsonb, updated_at = now() where id = $1::bigint`,
      [o.id, JSON.stringify({ motivoNeg: mot, dev, devIdem: `evpbx-${numero}`, devPor: "business" })]);
    await ev(c, o.id, "cancelled", "member", actorId, { es: `Canceló el restaurante: ${mot}`, en: `Cancelled by the restaurant: ${mot}` });
    return { ok: true };
  });
  if (r.ok && o) await moverDinero(numero).catch(() => undefined);
  if (r.ok && o) await avisarEvp(numero, "cliente", "evp_cancelado_negocio", { motivo: mot, dep: dinero((o as Op).amount ?? (o as Op).dep) }).catch(() => undefined);
  return r;
}
/* Lo que una cancelación le debe a la tarjeta (con su llave: idempotente; si Stripe falla, el barrido lo vuelve a intentar). */
async function moverDinero(numero: string) {
  const o = await leer(db(), "o.number = $1", [numero]);
  if (!o || o.status !== "cancelled") return;
  if (o.pst === "held") { await liberarOperacion(o.id); return; }
  const dev = Number(o.det.dev ?? 0), idem = String(o.det.devIdem ?? "");
  if (!(dev > 0) || !o.pid || !/^evp(bx|cx)-EP-\d+$/.test(idem)) return;
  const yaHecha = (await db().query(`select 1 from refunds where idem_key = $1`, [idem])).rowCount;
  if (yaHecha) return;
  // Nunca más de lo cobrado menos lo devuelto (devolverPago lo vuelve a acotar).
  const cap = Math.max(0, (o.amount ?? 0) - (o.refunded ?? 0));
  const n = Math.min(dev, cap);
  if (n > 0) await devolverPago({ paymentId: o.pid, centavos: n, por: o.det.devPor === "business" ? "business" : "policy", actorId: null, motivo: o.det.devPor === "business" ? "El restaurante canceló el evento privado" : "Cancelación a tiempo del evento privado", idem });
}

/* ── El cliente: aceptar y pagar el depósito, pedir un cambio, «No, gracias», aceptar un cambio, cancelar ── */
export async function aceptarEvp(userId: string, numero: string, version: number, pm: string | null, ip: string | null, clave: string): Promise<Res> {
  if (!NUM_EP.test(numero) || !UUID.test(String(clave))) return no("No se pudo. Recarga la página.", "Could not do it. Reload the page.");
  const pmOk = typeof pm === "string" && /^pm_[A-Za-z0-9_]{3,200}$/.test(pm) ? pm : null;
  if (!pmOk) return no("Elige la tarjeta del depósito.", "Choose the card for the deposit.", { tarjeta: true });
  const c = await db().connect();
  let retenido: string | null = null, opId = "", ya = false;
  try {
    await c.query("begin");
    const o = await leer(c, "o.user_id = $1 and o.number = $2", [userId, numero], true);
    if (!o) { await c.query("rollback"); return no("Esa solicitud no existe.", "That request does not exist."); }
    opId = o.id;
    const Q = await propuestas(c, o.id), q = Q[Q.length - 1];
    // Doble toque: la primera ya confirmó con esta versión → «listo», sin cobrar otra vez.
    if (o.status === "confirmed" && q && q.v === Math.round(Number(version)) && q.st === "accepted") { await c.query("rollback"); ya = true; return { ok: true }; }
    if (o.status !== "change_proposed" || !q || q.kind === "change") { await c.query("rollback"); return no("Esta solicitud ya cambió. Actualiza la pantalla.", "This request already changed. Refresh the screen."); }
    if (q.v !== Math.round(Number(version)) || q.st === "superseded") { await c.query("rollback"); return no("El restaurante mandó una propuesta nueva. Mírala antes de aceptar.", "The restaurant sent a new proposal. Check it before accepting."); }
    if (q.st !== "sent") { await c.query("rollback"); return no("Esta propuesta ya venció. No se cobró nada.", "This proposal expired. Nothing was charged."); }
    const x = await contexto(c, o.biz, ["NEG-FOOD"]);
    if (!x?.cuenta) { await c.query("rollback"); return no("El restaurante no puede cobrar el depósito ahora. Escríbele por Mensajes; no se cobró nada.", "The restaurant cannot take the deposit right now. Write them in Messages; nothing was charged."); }
    // El depósito sale SOLO de la propuesta guardada (la calculó la base); la comisión, de fee_rules «evp».
    const dep = q.dep, fee = Math.min(await comision(c, "evp", dep), dep);
    const cliente = await pasarela.cliente(userId).catch(() => null);
    const ret = await pasarela.retener({ centavos: dep, comision: fee, destino: x.cuenta, pm: pmOk, cliente, idem: `evp-${q.id}-${pmOk.slice(-24)}`, meta: { private_event: numero, business_id: x.id } });
    if (!ret.ok) { await c.query("rollback"); return no(`${ret.mensaje.es} No se cobró nada; la propuesta sigue.`, `${ret.mensaje.en} Nothing was charged; the proposal still stands.`, { tarjeta: true }); }
    retenido = ret.pi;
    if (ret.estado === "accion") { await c.query("rollback"); await pasarela.liberar(ret.pi).catch(() => undefined); retenido = null; return no("Tu banco pide una verificación extra. Prueba con otra tarjeta.", "Your bank asks for an extra verification. Try another card.", { tarjeta: true }); }
    await registrarRetencion(c, { opId: o.id, userId, negocio: x.id, city: x.city, total: dep, comision: fee, r: ret, pm: pmOk, kind: "deposit" });
    // La aceptación: la base vuelve a revisar última versión, vigencia y estado; una sola con depósito por solicitud.
    await c.query(`insert into private_event_acceptances (quote_id, operation_id, kind, user_id, ip, payment_id) values ($1::bigint, $2::bigint, 'quote', $3, $4, (select id from payments where stripe_payment_intent = $5))`,
      [q.id, o.id, userId, ip ? String(ip).slice(0, 64) : null, ret.pi]);
    await c.query(
      `update operations set status = 'confirmed', status_detail = null, scheduled_at = ($2::date + make_interval(mins => $3::int)) at time zone $4, duration_min = $5, party_size = $6,
              (subtotal_cents, tax_cents, total_cents, deposit_cents) = ($7, $8, $9, $10), pay_mode = 'app', confirmed_at = now(), respond_by = null, updated_at = now() where id = $1::bigint`,
      [o.id, q.ymd, q.m, o.tz, q.dur, q.p, q.sub, q.tax, q.tot, q.dep]);
    await ev(c, o.id, "quote_ok", "user", userId, { es: `Aceptó la propuesta v${q.v}: total ${dinero(q.tot)} · depósito ${dinero(q.dep)}`, en: `Accepted proposal v${q.v}: total ${dinero(q.tot)} · deposit ${dinero(q.dep)}` });
    await c.query("commit");
    retenido = null;
  } catch (err) {
    await c.query("rollback").catch(() => undefined);
    if (retenido) await pasarela.liberar(retenido).catch(() => undefined);
    const x = deLaBase(err);
    if (x) return x;
    if (/private_event_acceptances_deposito_uq|payments_operation_kind_seq_key/.test(String((err as Error)?.message))) return no("Este depósito ya se pagó.", "This deposit is already paid.");
    throw err;
  } finally {
    c.release();
  }
  if (ya) return { ok: true };
  await cobrarOperacion(opId);
  await avisarEvp(numero, "cliente", "evp_ok").catch(() => undefined);
  await avisarEvp(numero, "negocio", "evp_biz_ok").catch(() => undefined);
  return { ok: true };
}
export type CambioIn = { nota: string; personas?: number | null; fecha?: string | null; m?: number | null };
export async function pedirCambioEvp(userId: string, numero: string, f: CambioIn): Promise<Res> {
  if (!NUM_EP.test(numero)) return no("Esa solicitud no existe.", "That request does not exist.");
  const nota = limpio(f?.nota, 300);
  if (nota.length < 4) return no("Escribe qué quieres cambiar.", "Write what you want to change.");
  if (TEL.test(nota)) return no("Por seguridad, sin teléfonos. Para hablar usa Mensajes.", "For safety, no phone numbers. To talk use Messages.");
  const p = f.personas == null ? null : Math.round(Number(f.personas)), m = f.m == null ? null : Math.round(Number(f.m)), fecha = f.fecha && YMD.test(String(f.fecha)) ? String(f.fecha) : null;
  if (p != null && !(p >= 2 && p <= 500)) return no("Revisa cuántas personas.", "Check how many guests.");
  if (m != null && !HORAS_EVP.includes(m)) return no("Elige la hora.", "Pick the time.");
  let biz = "";
  try {
    const r = await tx(async (c): Promise<Res> => {
      const o = await leer(c, "o.user_id = $1 and o.number = $2", [userId, numero], true);
      if (!o) return no("Esa solicitud no existe.", "That request does not exist.");
      const conf = o.status === "confirmed";
      if (!(o.status === "change_proposed" || (conf && !o.past && !["change_req", "change_quote"].includes(o.detail ?? "")))) return no("Esta solicitud ya cambió. Actualiza la pantalla.", "This request already changed. Refresh the screen.");
      biz = o.biz;
      await c.query(`insert into private_event_asks (operation_id, kind, party_size, starts_at, note, user_id) values ($1::bigint, $2, $3, case when $4::date is null then null else ($4::date + make_interval(mins => coalesce($5::int, $6::int))) at time zone $7 end, $8, $9)`,
        [o.id, conf ? "change" : "counter", p, fecha, m, o.m, o.tz, nota, userId]);
      if (conf) await c.query(`update operations set status_detail = 'change_req', updated_at = now() where id = $1::bigint`, [o.id]);
      else await c.query(`update operations set status_detail = 'counter', updated_at = now() where id = $1::bigint`, [o.id]);
      await ev(c, o.id, conf ? "change_asked" : "counter", "user", userId, { es: `Pidió un cambio: ${nota}`, en: `Asked for a change: ${nota}` });
      return { ok: true };
    });
    if (r.ok) {
      // La nota también va a Mensajes (2p), con el contexto «Evento privado #EP-…»: el hilo de la solicitud.
      const { enviarCliente } = await import("./mensajes");
      await enviarCliente(userId, biz, `${p ? `${p} personas. ` : ""}${fecha ? `${diaEvp(fecha, true)}${m != null ? ` ${horaL(m)}` : ""}. ` : ""}${nota}`, numero).catch(() => undefined);
      await avisarEvp(numero, "negocio", "evp_biz_pide").catch(() => undefined);
    }
    return r;
  } catch (e) {
    const x = deLaBase(e);
    if (x) return x;
    throw e;
  }
}
export async function noGraciasEvp(userId: string, numero: string): Promise<Res> {
  if (!NUM_EP.test(numero)) return no("Esa solicitud no existe.", "That request does not exist.");
  const r = await tx(async (c): Promise<Res> => {
    const o = await leer(c, "o.user_id = $1 and o.number = $2", [userId, numero], true);
    if (!o || o.status !== "change_proposed") return no("Esta solicitud ya cambió. Actualiza la pantalla.", "This request already changed. Refresh the screen.");
    await c.query(`update operations set status = 'cancelled', status_detail = null, cancelled_by = 'user', cancelled_at = now(), cancel_reason = 'propuesta_no', respond_by = null, updated_at = now() where id = $1::bigint`, [o.id]);
    await ev(c, o.id, "quote_no", "user", userId);
    return { ok: true };
  });
  if (r.ok) await avisarEvp(numero, "negocio", "evp_biz_no").catch(() => undefined);
  return r;
}
export async function aceptarCambioEvp(userId: string, numero: string, version: number): Promise<Res> {
  if (!NUM_EP.test(numero)) return no("Esa solicitud no existe.", "That request does not exist.");
  try {
    const r = await tx(async (c): Promise<Res> => {
      const o = await leer(c, "o.user_id = $1 and o.number = $2", [userId, numero], true);
      if (!o || o.status !== "confirmed" || o.detail !== "change_quote") return no("Este cambio ya no está abierto.", "This change is no longer open.");
      const Q = await propuestas(c, o.id), q = Q[Q.length - 1];
      if (!q || q.kind !== "change" || q.v !== Math.round(Number(version))) return no("El restaurante mandó otro cambio. Míralo antes de aceptar.", "The restaurant sent another change. Check it before accepting.");
      if (q.st !== "sent") return no("Este cambio ya venció. Tu evento sigue como lo acordaron.", "This change expired. Your event stays as agreed.");
      // Sin cobro: el depósito es el ya pagado; cambia la fecha, las personas y lo que pagas en el local.
      await c.query(`insert into private_event_acceptances (quote_id, operation_id, kind, user_id) values ($1::bigint, $2::bigint, 'change', $3)`, [q.id, o.id, userId]);
      await c.query(`update operations set status_detail = null, scheduled_at = ($2::date + make_interval(mins => $3::int)) at time zone $4, duration_min = $5, party_size = $6, (subtotal_cents, tax_cents, total_cents) = ($7, $8, $9),
                            details = details - 'rec1', updated_at = now() where id = $1::bigint`, [o.id, q.ymd, q.m, o.tz, q.dur, q.p, q.sub, q.tax, q.tot]);
      await ev(c, o.id, "change_ok", "user", userId, { es: `Aceptó el cambio v${q.v}: total ${dinero(q.tot)}`, en: `Accepted change v${q.v}: total ${dinero(q.tot)}` });
      return { ok: true };
    });
    if (r.ok) await avisarEvp(numero, "negocio", "evp_biz_cambio_ok").catch(() => undefined);
    return r;
  } catch (e) {
    const x = deLaBase(e);
    if (x) return x;
    throw e;
  }
}
export async function rechazarCambioEvp(userId: string, numero: string): Promise<Res> {
  if (!NUM_EP.test(numero)) return no("Esa solicitud no existe.", "That request does not exist.");
  const r = await tx(async (c): Promise<Res> => {
    const o = await leer(c, "o.user_id = $1 and o.number = $2", [userId, numero], true);
    if (!o || o.status !== "confirmed" || o.detail !== "change_quote") return no("Este cambio ya no está abierto.", "This change is no longer open.");
    await c.query(`update operations set status_detail = null, updated_at = now() where id = $1::bigint`, [o.id]);
    await ev(c, o.id, "change_rejected", "user", userId, { es: "Siguió como estaba", en: "Kept it as it was" });
    return { ok: true };
  });
  if (r.ok) await avisarEvp(numero, "negocio", "evp_biz_cambio_no").catch(() => undefined);
  return r;
}
/* Cancelar (cliente): sin confirmar → nada se cobró; confirmado y faltan el plazo de la propuesta aceptada o más → devolución completa del
   depósito; menos → el depósito se queda con el restaurante. La regla y el monto los decide el servidor aquí, con la fila bloqueada. */
export async function cancelarEvp(userId: string, numero: string): Promise<Res<{ devuelto: number; perdio: boolean }>> {
  if (!NUM_EP.test(numero)) return no("Esa solicitud no existe.", "That request does not exist.");
  let pago: { dev: number; perdio: boolean; held: boolean; dep: number } | null = null, biz = "";
  const r = await tx(async (c): Promise<Res<{ devuelto: number; perdio: boolean }>> => {
    const o = await leer(c, "o.user_id = $1 and o.number = $2", [userId, numero], true);
    if (!o || !["pending", "change_proposed", "confirmed"].includes(o.status) || (o.status === "confirmed" && o.past)) return no("Esta solicitud ya cambió. Actualiza la pantalla.", "This request already changed. Refresh the screen.");
    biz = o.biz;
    if (o.status !== "confirmed") {
      await c.query(`update operations set status = 'cancelled', status_detail = null, cancelled_by = 'user', cancelled_at = now(), cancel_reason = 'solicitud', respond_by = null, updated_at = now() where id = $1::bigint`, [o.id]);
      await ev(c, o.id, "cancelled", "user", userId);
      return { ok: true, devuelto: 0, perdio: false };
    }
    const ac = acuerdoDe(await propuestas(c, o.id)), plazo = ac?.cancelH ?? 72, aTiempo = o.h_left >= plazo;
    const cobrado = o.pst === "captured" || o.pst === "partially_refunded" ? Math.max(0, (o.amount ?? 0) - (o.refunded ?? 0)) : 0;
    const dev = aTiempo ? cobrado : 0, perdio = !aTiempo && (o.amount ?? 0) > 0;
    await c.query(`update operations set status = 'cancelled', status_detail = null, cancelled_by = 'user', cancelled_at = now(), cancel_reason = $2, details = details || $3::jsonb, updated_at = now() where id = $1::bigint`,
      [o.id, aTiempo ? "a_tiempo" : "tarde", JSON.stringify({ perdio, dev, devIdem: `evpcx-${numero}`, devPor: "policy", plazo })]);
    await ev(c, o.id, "cancelled", "user", userId, perdio ? { es: `Canceló a menos de ${plazo} h: el depósito se queda con el restaurante`, en: `Cancelled less than ${plazo} h before: the restaurant keeps the deposit` } : { es: `Canceló con ${plazo} h o más: se devuelve el depósito`, en: `Cancelled ${plazo} h or more before: the deposit is refunded` });
    pago = { dev, perdio, held: o.pst === "held", dep: o.amount ?? 0 };
    return { ok: true, devuelto: dev, perdio };
  });
  if (r.ok && pago) {
    const P = pago as { dev: number; perdio: boolean; held: boolean; dep: number };
    // Lo retenido (si la captura había fallado): a tiempo se libera; tarde se cobra (se queda con el restaurante).
    if (P.held) { const o = await leer(db(), "o.number = $1", [numero]); if (o) { if (P.perdio) await cobrarOperacion(o.id); else await liberarOperacion(o.id); } }
    else await moverDinero(numero).catch(() => undefined);
    await avisarEvp(numero, "cliente", "evp_cancelado", { dev: P.perdio ? ` El depósito de ${dinero(P.dep)} se queda con el restaurante.` : P.dev ? ` Te devolvemos ${dinero(P.dev)} en 3 a 5 días hábiles.` : "" }).catch(() => undefined);
    await avisarEvp(numero, "negocio", "evp_biz_cx", { dep: P.perdio ? ` El depósito de ${dinero(P.dep)} se queda contigo.` : P.dev ? ` Se le devuelve el depósito de ${dinero(P.dev)}.` : "" }).catch(() => undefined);
  } else if (r.ok && biz) await avisarEvp(numero, "negocio", "evp_biz_cx", { dep: " No se había cobrado nada." }).catch(() => undefined);
  return r;
}

/* ── El barrido (cada minuto y al abrir la pantalla): sin respuesta, propuesta vencida, cambio vencido, recordatorio del día antes,
   «Pasó el evento» y las devoluciones que Stripe no hizo (misma llave). Idempotente. ── */
export async function vencerEvp(f: { negocio?: string; userId?: string; numero?: string } = {}) {
  const w: string[] = [], a: unknown[] = [];
  if (f.negocio) { a.push(f.negocio); w.push(`o.business_id = $${a.length}`); }
  if (f.userId) { a.push(f.userId); w.push(`o.user_id = $${a.length}::uuid`); }
  if (f.numero) { a.push(f.numero); w.push(`o.number = $${a.length}`); }
  const y = w.length ? ` and ${w.join(" and ")}` : "";
  const sinResp = (await db().query<{ id: string; num: string }>(
    `update operations o set status = 'expired', status_detail = 'sin_respuesta', respond_by = null, updated_at = now() where o.kind = 'private_event' and o.status = 'pending' and o.respond_by < now()${y}
     returning o.id::text, o.number as num`, a)).rows;
  for (const v of sinResp) {
    await ev(db(), v.id, "expired", "system", null, { es: "No respondieron a tiempo", en: "No reply in time" });
    await avisarEvp(v.num, "cliente", "evp_vence", { que: "No respondieron a tiempo." }).catch(() => undefined);
    await avisarEvp(v.num, "negocio", "evp_biz_vence", { que: "No respondiste a tiempo." }).catch(() => undefined);
  }
  const propVencida = (await db().query<{ id: string; num: string }>(
    `update operations o set status = 'expired', status_detail = 'propuesta_vencida', respond_by = null, updated_at = now()
      where o.kind = 'private_event' and o.status = 'change_proposed' and (select q.valid_until from private_event_quotes q where q.operation_id = o.id order by q.version desc limit 1) <= now()${y}
     returning o.id::text, o.number as num`, a)).rows;
  for (const v of propVencida) {
    await ev(db(), v.id, "expired", "system", null, { es: "La propuesta venció sin aceptarse", en: "The proposal expired without being accepted" });
    await avisarEvp(v.num, "cliente", "evp_vence", { que: "La propuesta venció sin aceptarse." }).catch(() => undefined);
    await avisarEvp(v.num, "negocio", "evp_biz_vence", { que: "Tu propuesta venció sin aceptarse." }).catch(() => undefined);
  }
  // Un cambio que nadie aceptó a tiempo: el evento sigue como se acordó.
  const cambioV = (await db().query<{ id: string }>(
    `update operations o set status_detail = null, updated_at = now()
      where o.kind = 'private_event' and o.status = 'confirmed' and o.status_detail = 'change_quote' and (select q.valid_until from private_event_quotes q where q.operation_id = o.id order by q.version desc limit 1) <= now()${y}
     returning o.id::text`, a)).rows;
  for (const v of cambioV) await ev(db(), v.id, "change_expired", "system", null, { es: "El cambio venció: sigue lo acordado", en: "The change expired: the agreement stands" });
  // Recordatorio del día antes (una vez).
  const rec = (await db().query<{ num: string }>(
    `update operations o set details = o.details || '{"rec1":true}'::jsonb where o.kind = 'private_event' and o.status = 'confirmed' and not coalesce((o.details->>'rec1')::boolean, false)
        and o.scheduled_at > now() and o.scheduled_at < now() + interval '24 hours'${y} returning o.number as num`, a)).rows;
  for (const v of rec) { await avisarEvp(v.num, "cliente", "evp_recordatorio").catch(() => undefined); await avisarEvp(v.num, "negocio", "evp_biz_recordatorio").catch(() => undefined); }
  // «Pasó el evento»: 12 h después del final, si no hay ayuda abierta (el depósito ya es consumo descontado).
  const fin = (await db().query<{ id: string; num: string }>(
    `update operations o set status = 'done', status_detail = null, done_at = now(), updated_at = now()
      where o.kind = 'private_event' and o.status = 'confirmed' and o.scheduled_at + make_interval(mins => o.duration_min) + interval '12 hours' < now()
        and not exists (select 1 from help_requests h where h.operation_id = o.id and h.status <> 'resolved')${y} returning o.id::text, o.number as num`, a)).rows;
  for (const v of fin) { await ev(db(), v.id, "done", "system", null, { es: "Pasó el evento", en: "The event is over" }); await avisarEvp(v.num, "cliente", "evp_done").catch(() => undefined); }
  // Devoluciones que quedaron a medias (Stripe no respondió): la misma llave, una sola devolución.
  const debe = (await db().query<{ num: string }>(
    `select o.number as num from operations o join payments p on p.operation_id = o.id and p.kind = 'deposit'
      where o.kind = 'private_event' and o.status = 'cancelled' and coalesce((o.details->>'dev')::int, 0) > 0 and p.status in ('captured', 'partially_refunded')
        and not exists (select 1 from refunds r where r.idem_key = o.details->>'devIdem')${y} limit 50`, a)).rows;
  for (const v of debe) await moverDinero(v.num).catch(() => undefined);
}

/* Lo pedido, como se copió al pedir (el menú y los extras con su precio de ese momento: solo orientan la propuesta). */
const menuDe = (d: Record<string, unknown>) => { const m = (d.menu ?? {}) as { k?: string; es?: string; en?: string; cents?: number | null }; return { k: String(m.k ?? ""), es: String(m.es ?? ""), en: String(m.en ?? ""), cents: m.cents ?? null }; };
const extrasDe = (d: Record<string, unknown>) => ((d.ext as { k?: string; es: string; en: string; cents?: number | null }[] | undefined) ?? []).map((z) => ({ k: String(z.k ?? ""), es: z.es, en: z.en, cents: z.cents ?? null }));
/* ── El cliente: su solicitud (/privado/[num]) ── */
export type EvpVista = {
  numero: string; status: string; detalle: string | null; negocio: { id: string; nombre: string; foto: string | null; direccion: string | null; telefono: string | null; lat: number | null; lng: number | null };
  pedido: { occ: string; personas: number; area: string; ymd: string; m: number; horas: number; menu: Bi & { k: string; cents: number | null }; bud: string; ext: (Bi & { k: string; cents: number | null })[]; nota: string | null };
  ymd: string; m: number; dur: number; p: number; quote: Quote | null; acuerdo: Quote | null; cambio: Quote | null; pago: { st: string | null; monto: number; devuelto: number; marca: string | null; l4: string | null };
  cancelH: number; hLeft: number; pasada: boolean; motivoNo: string | null; motivoNeg: string | null; motivoCambioNo: string | null; perdio: boolean; asks: { kind: string; nota: string; at: number }[];
  linea: { at: number; kind: string; note: Bi | null }[]; resena: boolean; otros: { id: string; nombre: string; foto: string | null; cap: number }[]; yo: { nombre: string; tel4: string }; cambiosMax: number;
};
export async function evpVista(userId: string, numero: string): Promise<EvpVista | null> {
  if (!NUM_EP.test(numero)) return null;
  await vencerEvp({ userId, numero });
  const o = await leer(db(), "o.user_id = $1 and o.number = $2", [userId, numero]);
  if (!o) return null;
  const [Q, E, A, b, u, cfg] = await Promise.all([
    propuestas(db(), o.id),
    db().query<{ at: number; kind: string; note: Bi | null }>(`select (extract(epoch from at) * 1000)::float8 as at, kind, note from operation_events where operation_id = $1::bigint order by id`, [o.id]),
    db().query<{ kind: string; nota: string; at: number }>(`select kind, note as nota, (extract(epoch from created_at) * 1000)::float8 as at from private_event_asks where operation_id = $1::bigint order by id`, [o.id]),
    db().query<{ foto: string | null; dir: string | null; tel: string | null; lat: number | null; lng: number | null; marca: string | null; l4: string | null; resena: boolean }>(
      `select b.logo_url as foto, b.address as dir, b.phone as tel, st_y(b.geo::geometry) as lat, st_x(b.geo::geometry) as lng,
              (select p.card_brand from payments p where p.operation_id = $2::bigint and p.kind = 'deposit') as marca, (select p.card_last4 from payments p where p.operation_id = $2::bigint and p.kind = 'deposit') as l4,
              exists (select 1 from reviews r where r.operation_id = $2::bigint) as resena from businesses b where b.id = $1`, [o.biz, o.id]),
    db().query<{ nombre: string; tel4: string }>(`select coalesce(nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), ''), '') as nombre, right(phone, 4) as tel4 from users where id = $1`, [userId]),
    valores("evp_cancelar_h", "evp_cambios_max"),
  ]);
  const ult = Q[Q.length - 1] ?? null, acuerdo = acuerdoDe(Q);
  const cambio = ult && ult.kind === "change" && ult.st === "sent" ? ult : null;
  const quote = o.status === "change_proposed" || (["expired", "cancelled", "declined"].includes(o.status) && !acuerdo) ? (ult && ult.kind !== "change" ? ult : null) : null;
  const otros = ["declined", "expired"].includes(o.status) ? (await db().query<{ id: string; nombre: string; foto: string | null; cap: number }>(
    `select b.id, b.name as nombre, b.logo_url as foto, s.capacity as cap from private_event_settings s join businesses b on b.id = s.business_id
      where s.is_on and b.status = 'active' and b.city_id = $1 and b.id <> $2 and s.capacity >= $3 order by b.name limit 2`, [o.city, o.biz, o.p])).rows : [];
  const d = o.det as Record<string, unknown>, bb = b.rows[0]!;
  return {
    numero, status: o.status, detalle: o.detail, negocio: { id: o.biz, nombre: o.negocio, foto: bb.foto, direccion: bb.dir, telefono: bb.tel, lat: bb.lat, lng: bb.lng },
    pedido: { occ: String(d.occ ?? ""), personas: o.p, area: String(d.area ?? "salon"), ymd: o.ymd, m: o.m, horas: Number(d.horas ?? Math.round(o.dur / 60)), menu: menuDe(d), bud: String(d.bud ?? ""), ext: extrasDe(d), nota: o.nota },
    ymd: o.ymd, m: o.m, dur: o.dur, p: o.p, quote, acuerdo, cambio, pago: { st: o.pst, monto: o.amount ?? 0, devuelto: o.refunded ?? 0, marca: bb.marca, l4: bb.l4 },
    cancelH: acuerdo?.cancelH ?? ult?.cancelH ?? cfg.evp_cancelar_h, hLeft: o.h_left, pasada: o.past, motivoNo: (d.motivoNo as string | undefined) ?? null, motivoNeg: (d.motivoNeg as string | undefined) ?? null,
    motivoCambioNo: (d.motivoCambioNo as string | undefined) ?? null, perdio: !!d.perdio, asks: A.rows, linea: E.rows, resena: bb.resena, otros, yo: u.rows[0] ?? { nombre: "", tel4: "" }, cambiosMax: cfg.evp_cambios_max,
  };
}

/* ── El panel: Hoy (esperan tu respuesta · próximos) y el detalle con la propuesta ── */
export type FilaEvp = { numero: string; st: string; detail: string | null; who: string; occ: string; p: number; ymd: string; m: number; resp: number | null; pasada: boolean };
export async function evpHoy(negocio: string): Promise<FilaEvp[]> {
  await vencerEvp({ negocio });
  return (await db().query<FilaEvp>(
    `select o.number as numero, o.status as st, o.status_detail as detail, coalesce(nullif(u.first_name, ''), 'Cliente') || coalesce(' ' || left(nullif(u.last_name, ''), 1) || '.', '') as who,
            o.details->>'occ' as occ, o.party_size as p, (o.scheduled_at at time zone c.timezone)::date::text as ymd,
            (extract(hour from o.scheduled_at at time zone c.timezone) * 60 + extract(minute from o.scheduled_at at time zone c.timezone))::int as m,
            (extract(epoch from o.respond_by) * 1000)::float8 as resp, o.scheduled_at < now() as pasada
       from operations o join users u on u.id = o.user_id join cities c on c.id = o.city_id
      where o.business_id = $1 and o.kind = 'private_event' and (o.status in ('pending', 'change_proposed') or (o.status = 'confirmed' and o.scheduled_at < now() + interval '60 days'))
      order by (o.status = 'pending' or o.status_detail in ('counter', 'change_req')) desc, o.scheduled_at limit 60`, [negocio])).rows;
}
export type EvpPanelV = {
  numero: string; st: string; detail: string | null; who: string; pedido: EvpVista["pedido"]; ymd: string; m: number; dur: number; p: number; resp: number | null; pasada: boolean;
  quotes: Quote[]; acuerdo: Quote | null; asks: { kind: string; nota: string; p: number | null; ymd: string | null; m: number | null; at: number }[]; pago: { st: string | null; monto: number; devuelto: number; comision: number };
  taxBp: number; aj: AjustesEvp; hilo: string | null; eventos: { at: number; kind: string; note: Bi | null }[]; motivoNo: string | null; motivoNeg: string | null; perdio: boolean; cancelH: number; hLeft: number;
  cfg: { propuestaH: number; cancelarH: number };
};
export async function evpPanel(negocio: string, numero: string): Promise<EvpPanelV | null> {
  if (!NUM_EP.test(numero)) return null;
  await vencerEvp({ negocio, numero });
  const o = await leer(db(), "o.business_id = $1 and o.number = $2", [negocio, numero]);
  if (!o) return null;
  const [Q, E, A, P, T, H, aj, cfg] = await Promise.all([
    propuestas(db(), o.id),
    db().query<{ at: number; kind: string; note: Bi | null }>(`select (extract(epoch from at) * 1000)::float8 as at, kind, note from operation_events where operation_id = $1::bigint order by id`, [o.id]),
    db().query<{ kind: string; nota: string; p: number | null; ymd: string | null; m: number | null; at: number }>(
      `select a.kind, a.note as nota, a.party_size as p, (a.starts_at at time zone $2)::date::text as ymd, (extract(hour from a.starts_at at time zone $2) * 60 + extract(minute from a.starts_at at time zone $2))::int as m,
              (extract(epoch from a.created_at) * 1000)::float8 as at from private_event_asks a where a.operation_id = $1::bigint order by a.id`, [o.id, o.tz]),
    db().query<{ fee: number }>(`select fee_cents as fee from payments where operation_id = $1::bigint and kind = 'deposit'`, [o.id]),
    db().query<{ bp: number }>(`select t.parts_bp as bp from tax_rules t where t.city_id = $1 and t.category_id = 'NEG-FOOD' and t.effective_from <= now() order by t.effective_from desc, t.id desc limit 1`, [o.city]),
    db().query<{ id: string }>(`select id::text from chat_threads where user_id = $1::uuid and business_id = $2`, [o.uid, o.biz]),
    ajustesEvp(negocio),
    valores("evp_propuesta_h", "evp_cancelar_h"),
  ]);
  const d = o.det as Record<string, unknown>, acuerdo = acuerdoDe(Q);
  return {
    numero, st: o.status, detail: o.detail, who: o.cliente,
    pedido: { occ: String(d.occ ?? ""), personas: o.p, area: String(d.area ?? "salon"), ymd: o.ymd, m: o.m, horas: Number(d.horas ?? Math.round(o.dur / 60)), menu: menuDe(d), bud: String(d.bud ?? ""), ext: extrasDe(d), nota: o.nota },
    ymd: o.ymd, m: o.m, dur: o.dur, p: o.p, resp: null, pasada: o.past, quotes: Q, acuerdo, asks: A.rows,
    pago: { st: o.pst, monto: o.amount ?? 0, devuelto: o.refunded ?? 0, comision: P.rows[0]?.fee ?? 0 }, taxBp: T.rows[0]?.bp ?? 0, aj, hilo: H.rows[0]?.id ?? null, eventos: E.rows,
    motivoNo: (d.motivoNo as string | undefined) ?? null, motivoNeg: (d.motivoNeg as string | undefined) ?? null, perdio: !!d.perdio, cancelH: acuerdo?.cancelH ?? cfg.evp_cancelar_h, hLeft: o.h_left,
    cfg: { propuestaH: cfg.evp_propuesta_h, cancelarH: cfg.evp_cancelar_h },
  };
}
/* ¿Este restaurante recibe eventos privados? (la tarjeta de «grupo grande» de Reservar). */
export async function evpEncendido(negocio: string): Promise<boolean> {
  return !!(await db().query(`select 1 from private_event_settings s join businesses b on b.id = s.business_id where s.business_id = $1 and s.is_on and b.status = 'active'`, [negocio])).rowCount;
}
export const areaEvpL = (k: string, es: boolean) => (es ? AREAS_EVP[k]?.es : AREAS_EVP[k]?.en) ?? k;
export const occL = (k: string, es: boolean) => lbl(OCASIONES, k, es);
