import "server-only";
import type { Pool, PoolClient } from "pg";
import { cifrar, descifrar } from "./cifrado";
import { db, tx } from "./db";
import { TOPE_FREE } from "./plan";
import { kindAutosDe, lineaAutos, type Bhph, type Pago, type Puerta, type Titulo } from "./autos-comun";
import { kindInmDe, lineaInm, soloZona, type KindProp } from "./inmuebles-comun";
import { usdI } from "./inscripciones-comun";
import { NUM_P, QUE, TEL, cuandoVis, horaVis, slotDe, taparNumeros, type Bi, type HoraVis, type QueVis, type RubroVis, type TradeIn } from "./visitas-inm-comun";

/* Pedir visita, prueba de manejo, cita, precalificación u oferta (Fase 4 · 4ie · fase4-iglesias-inmuebles-autos.md §2 «0094», §3 y §4ie).
   (lib/visitas.ts ya es el Booking de Auto y Hogar: esto es otra cosa.)
   - Una visita es una operación `visit` (D-8101…). Lo que importa se COPIA al enviar (renta, depósito y lo de mudarse; precio, total en la
     puerta, cargo del dealer y el pago de ejemplo con tasa, meses y enganche; título y millas): cambiar la herramienta no cambia una visita viva.
   - CERO DINERO: ni por ver, ni por la prueba, ni por apartar; ningún pago ni retención (guardián sinDineroEnVisitas).
   - La HORA: un grupo de un día (class_groups 'visita' por propiedad o 'prueba' por negocio) se toma con el candado `ver:{grupo}` y la
     base no deja pasarse; la cita, la precalificación y la oferta son una hora del horario del negocio (sin cupo: el negocio confirma).
   - RESPONDER: 4 horas hábiles (del horario del negocio) y nunca después de la hora − 1 h (§6 #3). Sin respuesta → SIN RESPUESTA.
   - DATOS: la nota se filtra (seguro social, ITIN, tarjetas y cuentas tapados) antes de guardar; nunca se pide licencia (solo «la tengo
     vigente»), ni seguro social, ni ingresos, ni crédito (guardián sinDatosDeCredito). La dirección del cliente (prueba en casa) va cifrada
     en op_private ('casa') y el dealer la ve solo confirmada, con auditoría de cada vista.
   - DIRECCIÓN EXACTA: ÚNICO archivo (con lib/inmuebles.ts) que lee la calle exacta de una propiedad (guardián direccionAlConfirmar), y solo para
     la persona con la visita CONFIRMADA o pasada. Antes, la zona (ciudad y código postal).
   - Se rentó o se vendió: retirarAnuncio cancela las vivas sin culpa (en la misma transacción) y avisarRetiradas avisa después. */
type Q = Pool | PoolClient;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, ID = /^\d{1,18}$/, YMD = /^\d{4}-\d{2}-\d{2}$/;
const VIVAS = ["pending", "change_proposed", "confirmed"];
type Res<T = object> = ({ ok: true } & T) | { ok: false; msg: Bi; hora?: true };
const no = (es: string, en: string, extra?: { hora?: true }) => ({ ok: false as const, msg: { es, en }, ...extra });
const limpio = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, n) : "");

/* ── El negocio ── */
type Ctx = { id: string; name: string; cat: string; city: string; ciudad: string; tz: string; plan: string; off: Record<string, unknown>; address: string | null; casaNeg: boolean; phone: string | null;
  foto: string | null; hoy: string; mes: string; subs: string[]; ovInm: string | null; ovAutos: string | null; homeTest: boolean; trade: boolean; usados: number; cap: number };
async function contexto(c: Q, negocio: string): Promise<(Ctx & { rubro: RubroVis }) | null> {
  const x = (await c.query<Ctx>(
    `select b.id, b.name, b.category_id as cat, b.city_id as city, ci.name as ciudad, ci.timezone as tz, coalesce(st.plan, 'free') as plan, coalesce(b.modules_off, '{}'::jsonb) as off,
            b.address, b.works_from_home as "casaNeg", b.phone, (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1) as foto,
            (now() at time zone ci.timezone)::date::text as hoy, to_char(now() at time zone ci.timezone, 'YYYY-MM') as mes,
            coalesce((select array_agg(sc.name->>'es' order by array_position(b.subcategory_ids, sc.id)) from subcategorias_vivas sc where sc.id = any(b.subcategory_ids)), '{}') as subs,
            (select s.kind_override from inm_settings s where s.business_id = b.id) as "ovInm", (select s.kind_override from dealer_settings s where s.business_id = b.id) as "ovAutos",
            coalesce((select s.home_test from dealer_settings s where s.business_id = b.id), false) as "homeTest", coalesce((select s.trade from dealer_settings s where s.business_id = b.id), false) as trade,
            (select count(*)::int from operations o where o.business_id = b.id and o.kind <> 'table' and o.free_quota_month = to_char(now() at time zone ci.timezone, 'YYYY-MM')) as usados,
            coalesce((select (value #>> '{}')::int from platform_config where key = 'free_ops_cap'), $2) as cap
       from businesses b join cities ci on ci.id = b.city_id left join business_stats_cache st on st.business_id = b.id
      where b.id = $1 and b.status = 'active' and b.category_id in ('NEG-INMUEBLE', 'NEG-DEALER')`, [negocio, TOPE_FREE])).rows[0];
  if (!x) return null;
  return { ...x, rubro: x.cat === "NEG-DEALER" ? "dealer" : "inm" };
}

/* ── Lo que se pide: una propiedad, un carro o un servicio (con su copia) ── */
export type CopiaVis = {
  rent: number | null; dep: number; appFee: number; fees: { label: Bi; cents: number }[]; moveIn: number | null; price: number | null; cuota: number | null; downPct: number | null;
  puerta: Puerta | null; est: Pago | null; bhph: Bhph | null; titulo: Titulo | null; miles: number | null; year: number | null; svcCents: number | null;
};
export type ItemVis = { id: string; que: QueVis; name: Bi; foto: string | null; kind: string | null; sub: Bi; copia: CopiaVis; papers: Bi | null; ssnReq: boolean | null; soloZona: boolean; zip: string | null; groupItem: boolean };
const COPIA0: CopiaVis = { rent: null, dep: 0, appFee: 0, fees: [], moveIn: null, price: null, cuota: null, downPct: null, puerta: null, est: null, bhph: null, titulo: null, miles: null, year: null, svcCents: null };
async function itemDe(c: Q, x: Ctx & { rubro: RubroVis }, itemId: string): Promise<ItemVis | null> {
  if (!ID.test(itemId)) return null;
  if (x.rubro === "inm") {
    // La propiedad: NUNCA la dirección exacta aquí (esto alimenta la pantalla pública de pedir).
    const p = (await c.query<{ id: string; name: Bi; foto: string | null; kind: KindProp; deal: string; rent: number | null; price: number | null; dep: number; fee: number; fees: { label: Bi; cents: number }[];
      moveIn: number | null; cuota: number | null; pct: number | null; papers: Bi | null; pide: boolean; zip: string | null; zona: boolean; beds: number | null; baths: number | null }>(
      `select i.id::text, i.name, i.photos[1] as foto, pl.kind, i.svc_kind as deal, pl.rent_cents as rent, pl.price_cents as price, pl.deposit_cents as dep, pl.app_fee_cents as fee, pl.fees,
              pl.move_in_cents as "moveIn", pl.est_payment_cents as cuota, pl.est_down_pct::float as pct, pl.papers, pl.ssn_required as pide, pl.zip, not pl.addr_public as zona, pl.beds, pl.baths::float as baths
         from property_listings pl join items i on i.id = pl.item_id
        where pl.item_id = $2::bigint and pl.business_id = $1 and i.removed_at is null and i.status = 'live' and pl.status in ('available', 'pending')`, [x.id, itemId])).rows[0];
    if (p) {
      const cuartos = [p.beds != null ? (p.beds === 0 ? ["Estudio", "Studio"] : [`${p.beds} ${p.beds === 1 ? "recámara" : "recámaras"}`, `${p.beds} bed`]) : null, p.baths != null ? [`${String(p.baths).replace(".5", "½")} ${p.baths === 1 ? "baño" : "baños"}`, `${String(p.baths).replace(".5", "½")} bath`] : null].filter((z): z is string[] => !!z);
      return { id: p.id, que: "visita", name: p.name, foto: p.foto, kind: p.kind, sub: { es: cuartos.map((z) => z[0]).join(" · "), en: cuartos.map((z) => z[1]).join(" · ") },
        copia: { ...COPIA0, rent: p.deal === "renta" ? p.rent : null, dep: p.dep, appFee: p.fee, fees: p.fees ?? [], moveIn: p.moveIn, price: p.deal === "venta" ? p.price : null, cuota: p.cuota, downPct: p.pct },
        papers: p.papers, ssnReq: p.pide, soloZona: p.zona || soloZona(p.kind), zip: p.zip, groupItem: true };
    }
  } else {
    const v = (await c.query<{ id: string; name: Bi; foto: string | null; year: number; make: string; model: string; miles: number | null; title: Titulo; price: number; taxBp: number; tax: number; tags: number; fee: number; otd: number;
      ed: number | null; ea: number | null; em: number | null; ep: number | null; et: number | null; bd: number | null; bw: number | null; bk: number | null; bt: number | null; ba: number | null }>(
      `select i.id::text, i.name, i.photos[1] as foto, v.year, v.make, v.model, v.miles, v.title, v.price_cents as price, v.tax_bp as "taxBp", v.tax_cents as tax, v.tags_cents as tags, v.doc_fee_cents as fee, v.otd_cents as otd,
              v.est_down_cents as ed, v.est_apr_bp as ea, v.est_months as em, v.est_payment_cents as ep, v.est_total_cents as et, v.bhph_down_cents as bd, v.bhph_week_cents as bw, v.bhph_weeks as bk, v.bhph_total_cents as bt, v.bhph_apr_bp as ba
         from vehicle_listings v join items i on i.id = v.item_id
        where v.item_id = $2::bigint and v.business_id = $1 and i.removed_at is null and i.status = 'live' and v.status in ('lot', 'pending')`, [x.id, itemId])).rows[0];
    if (v) {
      const mi = v.miles != null ? v.miles.toLocaleString("en-US") : null;
      return { id: v.id, que: "prueba", name: v.name, foto: v.foto, kind: null,
        sub: { es: [String(v.year), mi ? `${mi} millas` : "", { limpio: "Título limpio", reconstruido: "Título reconstruido", salvage: "Título salvage" }[v.title]].filter(Boolean).join(" · "), en: [String(v.year), mi ? `${mi} miles` : "", { limpio: "Clean title", reconstruido: "Rebuilt title", salvage: "Salvage title" }[v.title]].filter(Boolean).join(" · ") },
        copia: { ...COPIA0, price: v.price, puerta: { price: v.price, taxBp: v.taxBp, tax: v.tax, tags: v.tags, fee: v.fee, otd: v.otd },
          est: v.ep != null ? { down: v.ed!, aprBp: v.ea!, months: v.em!, pago: v.ep, total: v.et! } : null,
          bhph: v.bt != null ? { down: v.bd!, week: v.bw!, weeks: v.bk!, months: Math.round((v.bk! * 12) / 52), total: v.bt, aprBp: v.ba! } : null, titulo: v.title, miles: v.miles, year: v.year },
        papers: null, ssnReq: null, soloZona: false, zip: null, groupItem: false };
    }
  }
  // Un servicio: precalificación, oferta en efectivo o cita (btnOf). Los que tienen precio (cotización) se piden llamando.
  const s = (await c.query<{ id: string; name: Bi; foto: string | null; cents: number }>(
    `select i.id::text, i.name, i.photos[1] as foto, i.price_cents as cents from items i
      where i.business_id = $1 and i.id = $2::bigint and i.module = 'svc' and i.removed_at is null and i.sell and i.status = 'live' and not i.is_extra
        and coalesce(i.svc_kind, '') not in ('renta', 'venta', 'auto')`, [x.id, itemId])).rows[0];
  if (!s) return null;
  const que = queServicio(x, s.cents);
  if (!que) return null;
  return { id: s.id, que, name: s.name, foto: s.foto, kind: null, sub: { es: s.cents ? `Precio total ${usdI(s.cents)}` : "Gratis", en: s.cents ? `Total price ${usdI(s.cents)}` : "Free" },
    copia: { ...COPIA0, svcCents: s.cents }, papers: null, ssnReq: null, soloZona: false, zip: null, groupItem: false };
}
/* btnOf (inm L90, dealer L106): hipotecas → precalificación; compradores en efectivo (casas) y compra de carros → oferta; financiamiento →
   precalificación; lo demás gratis o de autos → cita. Un servicio de Bienes Raíces con precio (cotización) se pide llamando. */
function queServicio(x: Ctx & { rubro: RubroVis }, cents: number): QueVis | null {
  if (x.rubro === "inm") {
    const k = kindInmDe(x.subs, x.ovInm);
    if (k === "hipo") return "precal";
    if (x.subs.includes("Compradores en efectivo")) return "oferta";
    return cents ? null : "cita";
  }
  const k = kindAutosDe(x.subs, x.ovAutos);
  if (k === "mayor") return null;
  return k === "cash" ? "oferta" : k === "fin" ? "precal" : "cita";
}

/* ── Las horas que se pueden pedir ── */
async function horasDe(c: Q, x: Ctx, it: ItemVis, _quien: string | null): Promise<HoraVis[]> {
  if (it.que === "visita" || it.que === "prueba") {
    const r = await c.query<{ id: string; dia: string; min: number; libres: number }>(
      `select g.id::text, g.starts_on::text as dia, g.start_min as min, greatest(0, g.seats_total - g.seats_outside - g.seats_booked)::int as libres
         from class_groups g
        where g.business_id = $1 and g.status = 'open' and g.purpose = $2 and ($2 = 'prueba' or g.item_id = $3::bigint) and ($2 = 'visita' or g.item_id is null or g.item_id = $3::bigint)
          and g.starts_on between $4::date and $4::date + 13 and ((g.starts_on + make_interval(mins => g.start_min)) at time zone $5) > now() + interval '2 hours'
        order by g.starts_on, g.start_min limit 120`, [x.id, it.que, it.id, x.hoy, x.tz]);
    return r.rows;
  }
  // Cita, precalificación u oferta: una hora en punto del horario del negocio, 14 días adelante (sin cupo: el negocio confirma).
  const r = await c.query<{ dia: string; min: number }>(
    `select d::date::text as dia, m::int as min
       from generate_series($2::date, $2::date + 13, interval '1 day') d
       join business_hours h on h.business_id = $1 and h.module = '' and h.weekday = extract(dow from d)::int and h.open
       cross join jsonb_array_elements(h.ranges) rg
       cross join lateral generate_series(split_part(rg->>0, ':', 1)::int * 60 + split_part(rg->>0, ':', 2)::int,
                   (case when rg->>1 in ('00:00', '24:00') then 1440 else split_part(rg->>1, ':', 1)::int * 60 + split_part(rg->>1, ':', 2)::int end) - 60, 60) m
      where ((d::date + make_interval(mins => m::int)) at time zone $3) > now() + interval '2 hours'
      order by 1, 2 limit 160`, [x.id, x.hoy, x.tz]);
  return r.rows.map((h) => ({ id: slotDe(h.dia, h.min), dia: h.dia, min: h.min, libres: null }));
}

/* Hasta cuándo responde el negocio: 4 horas hábiles de su horario (sin horario: 4 horas) y nunca después de la hora − 1 h (§6 #3). */
async function plazo(c: Q, negocio: string, tz: string, ini: string): Promise<{ rb: string; ok: boolean }> {
  return (await c.query<{ rb: string; ok: boolean }>(
    `with r as (
       select (d::date + (rg->>0)::time) at time zone $2 as a,
              (d::date + case when rg->>1 in ('00:00', '24:00') then interval '24 hours' else (rg->>1)::time::interval end) at time zone $2 as z
         from generate_series((now() at time zone $2)::date, (now() at time zone $2)::date + 8, interval '1 day') d
         join business_hours h on h.business_id = $1 and h.module = '' and h.weekday = extract(dow from d)::int and h.open
         cross join jsonb_array_elements(h.ranges) rg),
     v as (select greatest(a, now()) as a, z from r where z > now()),
     s as (select z, sum(extract(epoch from z - a)) over (order by a) as cum from v),
     h4 as (select min(z - make_interval(secs => (cum - 14400)::float8)) as t from s where cum >= 14400),
     t as (select least(coalesce((select t from h4), now() + interval '4 hours'), $3::timestamptz - interval '1 hour') as t)
     select t::text as rb, t > now() + interval '30 minutes' as ok from t`, [negocio, tz, ini])).rows[0]!;
}

/* ── La pantalla de pedir (APP-NEG-EDU-INSCRIPCION con visit: Día y hora → Revisa y envía) ── */
export type BookingVis = {
  negocio: { id: string; nombre: string; foto: string | null; telefono: string | null; ciudad: string }; rubro: RubroVis; item: ItemVis; horas: HoraVis[]; casa: boolean; trade: boolean;
  linea: Bi; mia: string | null; tope: boolean; pausa: boolean; hoy: string;
};
export async function bookingVisita(negocio: string, itemId: string, userId: string | null): Promise<BookingVis | null> {
  const x = await contexto(db(), negocio);
  const it = x ? await itemDe(db(), x, itemId) : null;
  if (!x || !it) return null;
  const mia = userId ? (await db().query<{ n: string }>(`select number as n from operations where user_id = $1::uuid and kind = 'visit' and business_id = $2 and details->>'item_id' = $3 and status = any($4::text[]) order by id desc limit 1`, [userId, x.id, it.id, VIVAS])).rows[0]?.n ?? null : null;
  const kIn = x.rubro === "inm" ? kindInmDe(x.subs, x.ovInm) : null, kAu = x.rubro === "dealer" ? kindAutosDe(x.subs, x.ovAutos) : null;
  return {
    negocio: { id: x.id, nombre: x.name, foto: x.foto, telefono: x.phone, ciudad: x.ciudad }, rubro: x.rubro, item: it, horas: await horasDe(db(), x, it, userId),
    casa: it.que === "prueba" && x.homeTest, trade: it.que === "prueba" && x.trade, linea: kIn ? lineaInm(kIn, x.subs) : lineaAutos(kAu!, x.plan === "pro"), mia,
    tope: x.plan !== "pro" && x.usados >= x.cap, pausa: !!(x.off.svc || x.off.citas), hoy: x.hoy,
  };
}

/* ── Pedir ── */
export type VisIn = { item: string; hora: string; nota?: string; sms?: boolean; licencia?: boolean; casa?: { calle: string; zip: string } | null; trade?: TradeIn | null; clave: string };
export async function pedirVisita(userId: string, negocio: string, f: VisIn, entorno: string): Promise<Res<{ numero: string }>> {
  if (!UUID.test(String(f?.clave)) || !ID.test(String(f?.item)) || typeof f?.hora !== "string" || f.hora.length > 40) return no("Revisa tu solicitud y vuelve a intentarlo.", "Check your request and try again.");
  // La nota: se tapan seguro social, ITIN, tarjetas y cuentas ANTES de guardar; sin teléfonos (por seguridad, como en todas las notas).
  const nota = taparNumeros(limpio(f.nota, 200)).texto;
  if (TEL.test(nota)) return no("Por seguridad, sin teléfonos en la nota.", "For safety, no phone numbers in the note.");
  const u = (await db().query<{ ok: boolean }>(`select phone_verified_at is not null and status = 'active' as ok from users where id = $1::uuid`, [userId])).rows[0];
  if (!u?.ok) return no("Verifica tu teléfono para pedir.", "Verify your phone to request.");
  const c = await db().connect();
  try {
    await c.query("begin");
    const ya = (await c.query<{ number: string }>(`select number from operations where user_id = $1 and client_key = $2`, [userId, f.clave])).rows[0];
    if (ya) { await c.query("rollback"); return { ok: true, numero: ya.number }; }
    // Candados: la persona y la propiedad (una viva por persona), y la hora (`ver:{grupo}`; sin grupo, el negocio).
    await c.query(`select pg_advisory_xact_lock(hashtext('verp:' || $1 || ':' || $2))`, [userId, String(f.item)]);
    const grupo = ID.test(f.hora) ? f.hora : null;
    await c.query(`select pg_advisory_xact_lock(hashtext('ver:' || $1))`, [grupo ?? negocio]);
    const x = await contexto(c, negocio);
    const it = x ? await itemDe(c, x, String(f.item)) : null;
    if (!x || !it) { await c.query("rollback"); return no("Eso ya no se puede pedir: puede que ya no esté disponible.", "That can no longer be requested: it may no longer be available."); }
    if (x.off.svc || x.off.citas) { await c.query("rollback"); return no(`${x.name} no recibe solicitudes en la app por ahora: llama al lugar.`, `${x.name} is not taking requests in the app right now: call the place.`); }
    // Free recibe solicitudes, hasta 10 al mes (§6 #6).
    if (x.plan !== "pro" && x.usados >= x.cap) { await c.query("rollback"); return no(`${x.name} ya recibió las solicitudes de este mes en la app: llama al lugar.`, `${x.name} already got this month's in-app requests: call the place.`); }
    // La hora: tiene que ser una de las que se ofrecen ahora.
    const H = await horasDe(c, x, it, userId), h = H.find((z) => z.id === f.hora);
    if (!h) { await c.query("rollback"); return no("Esa hora ya no está. Elige otra.", "That time is gone. Pick another.", { hora: true }); }
    if (h.libres != null && h.libres < 1) { await c.query("rollback"); return no("Esa hora ya la tomó otra persona. Elige otra.", "Someone else just took that time. Pick another.", { hora: true }); }
    // Una viva por persona y propiedad o carro (o servicio); y hasta 5 esperando respuesta en total.
    if ((await c.query(`select 1 from operations where user_id = $1 and kind = 'visit' and business_id = $2 and details->>'item_id' = $3 and status = any($4::text[]) limit 1`, [userId, x.id, it.id, VIVAS])).rowCount)
      { await c.query("rollback"); return no("Ya tienes una solicitud viva para esto. Mírala en Mi cuenta.", "You already have a live request for this. See it in My account."); }
    if (((await c.query<{ n: number }>(`select count(*)::int as n from operations where user_id = $1 and kind = 'visit' and status in ('pending', 'change_proposed')`, [userId])).rows[0]?.n ?? 0) >= 5)
      { await c.query("rollback"); return no("Tienes 5 solicitudes esperando respuesta. Espera a que te contesten.", "You have 5 requests waiting for a reply. Wait for an answer."); }
    // Prueba de manejo: la licencia se marca, nunca se pide el número; en casa, solo si el dealer la ofrece.
    if (it.que === "prueba" && f.licencia !== true) { await c.query("rollback"); return no("Marca que tienes licencia de conducir vigente.", "Check that you have a valid driver’s license."); }
    const enCasa = it.que === "prueba" && !!f.casa;
    if (enCasa && !x.homeTest) { await c.query("rollback"); return no("Este dealer no hace la prueba en tu casa.", "This dealer does not do test drives at your home."); }
    const calle = enCasa ? limpio(f.casa?.calle, 120) : "", zip = enCasa ? limpio(f.casa?.zip, 5) : "";
    if (enCasa && (calle.length < 4 || !/^\d{5}$/.test(zip))) { await c.query("rollback"); return no("Escribe la calle y el código postal de donde te recogen.", "Write the street and ZIP code where they pick you up."); }
    let trade: TradeIn | null = null;
    if (it.que === "prueba" && f.trade && x.trade) {
      const y = Math.round(Number(f.trade.year)), mk = limpio(f.trade.make, 30), md = limpio(f.trade.model, 30), mi = f.trade.miles == null || (f.trade.miles as unknown) === "" ? null : Math.round(Number(f.trade.miles));
      if (!(y >= 1950 && y <= Number(x.hoy.slice(0, 4)) + 1) || mk.length < 2 || md.length < 1 || (mi != null && !(mi >= 0 && mi <= 999999))) { await c.query("rollback"); return no("Revisa el carro que das a cambio: año, marca, modelo y millas.", "Check your trade-in: year, make, model and miles."); }
      trade = { year: y, make: mk, model: md, miles: mi };
    }
    const ini = (await c.query<{ t: string }>(`select ((($1::date + make_interval(mins => $2::int)) at time zone $3))::text as t`, [h.dia, h.min, x.tz])).rows[0]!.t;
    const p = await plazo(c, x.id, x.tz, ini);
    if (!p.ok) { await c.query("rollback"); return no("Esa hora es muy pronto para que te confirmen. Elige otra.", "That time is too soon for them to confirm. Pick another.", { hora: true }); }
    const numero = `D-${(await c.query<{ n: string }>(`select nextval('visit_seq')::text as n`)).rows[0]!.n}`;
    // Lo que importa se COPIA al enviar (copiaDelPrecio).
    const cp = it.copia;
    const det = { rubro: x.rubro, what: it.que, item_id: it.id, group_id: grupo, item: it.name, sub: it.sub, kind: it.kind, dia: h.dia, min: h.min,
      rent_cents: cp.rent, deposit_cents: cp.dep, app_fee_cents: cp.appFee, fees: cp.fees, move_in_cents: cp.moveIn, price_cents: cp.price, est_cuota_cents: cp.cuota, est_down_pct: cp.downPct,
      otd_cents: cp.puerta?.otd ?? null, doc_fee_cents: cp.puerta?.fee ?? null, puerta: cp.puerta, est_payment: cp.est, bhph: cp.bhph, title: cp.titulo, miles: cp.miles, year: cp.year, svc_cents: cp.svcCents,
      papers: it.papers, ssn_req: it.ssnReq, solo_zona: it.soloZona, zip: it.zip, ciudad: x.ciudad, at_home: enCasa, has_license: it.que === "prueba" ? true : null, trade_in: trade, sms: f.sms !== false };
    const op = (await c.query<{ id: string }>(
      `insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, customer_note, details, party_size, subtotal_cents, total_cents, deposit_cents, pay_mode, respond_by, client_key, is_test, free_quota_month)
       values ($1, 'visit', $2, $3, $4, 'pending', $5::timestamptz, nullif($6, ''), $7::jsonb, 1, 0, 0, 0, 'none', $8::timestamptz, $9, $10, $11) returning id::text`,
      [numero, x.city, x.id, userId, ini, nota, JSON.stringify(det), p.rb, f.clave, entorno !== "produccion", x.plan === "pro" ? null : x.mes])).rows[0]!.id;
    // La hora, dentro del candado (la base no deja pasarse).
    if (grupo) {
      const up = await c.query(`update class_groups set seats_booked = seats_booked + 1, updated_at = now() where id = $1::bigint and status = 'open' and seats_total - seats_outside - seats_booked >= 1`, [grupo]);
      if (!up.rowCount) { await c.query("rollback"); return no("Esa hora ya la tomó otra persona. Elige otra.", "Someone else just took that time. Pick another.", { hora: true }); }
    }
    if (enCasa) await c.query(`insert into op_private (operation_id, reason, note_enc) values ($1::bigint, 'casa', $2)`, [op, cifrar(JSON.stringify({ calle, zip }))]);
    await c.query(`insert into operation_events (operation_id, kind, actor, actor_id) values ($1, 'vis_sent', 'user', $2)`, [op, userId]);
    await c.query("commit");
    return { ok: true, numero };
  } catch (err) {
    await c.query("rollback").catch(() => undefined);
    throw err;
  } finally {
    c.release();
  }
}

/* ── Datos y avisos ── */
type Op = { id: string; num: string; biz: string; negocio: string; uid: string; cliente: string; status: string; detail: string | null; tz: string; city: string; det: Record<string, any>; at: string; sent: string };
const SEL = `select o.id::text, o.number as num, o.business_id as biz, b.name as negocio, o.user_id::text as uid, coalesce(nullif(u.first_name, ''), 'Cliente') as cliente, o.status, o.status_detail as detail,
                    c.timezone as tz, o.city_id as city, o.details as det, o.scheduled_at::text as at, o.sent_at::text as sent
               from operations o join businesses b on b.id = o.business_id and o.kind = 'visit' join cities c on c.id = o.city_id join users u on u.id = o.user_id`;
async function leer(c: Q, where: string, args: unknown[], lock = false): Promise<Op | null> {
  return (await c.query<Op>(`${SEL} where o.kind = 'visit' and ${where}${lock ? " for update of o" : ""}`, args)).rows[0] ?? null;
}
const lockV = (c: PoolClient, k: string) => c.query(`select pg_advisory_xact_lock(hashtext('ver:' || $1))`, [k]);
async function ev(c: PoolClient, op: string, kind: string, actor: "user" | "member" | "system", actorId: string | null, note?: Bi) {
  await c.query(`insert into operation_events (operation_id, kind, actor, actor_id, note) values ($1::bigint, $2, $3, $4, $5::jsonb)`, [op, kind, actor, actorId, note ? JSON.stringify(note) : null]);
}
/* La hora que ocupa una visita viva: la pedida o, si le propusieron otra, la propuesta. Solo aquí y dentro del candado. */
async function soltar(c: PoolClient, grupo: unknown) {
  if (grupo && ID.test(String(grupo))) await c.query(`update class_groups set seats_booked = greatest(0, seats_booked - 1), updated_at = now() where id = $1::bigint`, [String(grupo)]);
}
const grupoVivo = (o: Op) => (o.status === "change_proposed" ? o.det.alt_group_id : o.det.group_id);
const queDe = (o: Op) => (o.det.what as QueVis) ?? "visita";
const itemL = (o: Op) => (o.det.item as Bi)?.es ?? "";
const cuandoL = (o: Op) => cuandoVis(String(o.det.dia), Number(o.det.min), true);
/* La dirección que le llega al cliente al confirmar (Bienes Raíces: la de la propiedad; Autos: la del lote, o «en tu casa»). */
async function direccionCliente(c: Q, o: Op): Promise<string | null> {
  const que = queDe(o);
  if (que === "precal" || que === "oferta") return null;
  if (que === "visita") {
    const r = (await c.query<{ d: string | null }>(`select pl.addr_line || coalesce(', ' || pl.zip, '') as d from property_listings pl where pl.item_id = $1::bigint and pl.business_id = $2`, [String(o.det.item_id), o.biz])).rows[0];
    return r?.d ?? null;
  }
  if (o.det.at_home) return null;
  return (await c.query<{ d: string | null }>(`select case when works_from_home then null else address end as d from businesses where id = $1`, [o.biz])).rows[0]?.d ?? null;
}
async function avisarCliente(o: Op, tpl: string, extra: Record<string, string> = {}) {
  const { avisar } = await import("./avisos");
  await avisar(o.uid, tpl, { negocio: o.negocio, num: o.num, cuando: cuandoL(o), dir: "", item: itemL(o), motivo: "", hora: horaVis(Number(o.det.min)), ...extra }, { href: `/vis/${o.num}`, ref: ["visit", o.num], sinSms: o.det.sms === false });
}
async function avisarNeg(o: Op, tpl: string, extra: Record<string, string> = {}) {
  const { avisarNegocio } = await import("./avisos");
  await avisarNegocio(o.biz, tpl, { cliente: o.cliente, num: o.num, cuando: cuandoL(o), item: itemL(o), que: QUE[queDe(o)].t.es.toLowerCase(), extra: "", vence: "", ...extra }, { href: `/panel/${o.biz}/hoy?det=vis:${o.num}`, ref: ["visit", o.num] });
}
export async function avisarVisitaNueva(numero: string) {
  const o = await leer(db(), "o.number = $1", [numero]);
  if (!o) return;
  const v = (await db().query<{ v: string }>(`select to_char(respond_by at time zone $2, 'FMHH12:MI AM') || ' del ' || to_char(respond_by at time zone $2, 'FMDD/FMMM') as v from operations where id = $1::bigint`, [o.id, o.tz])).rows[0]?.v ?? "";
  const t = o.det.trade_in as TradeIn | null;
  await avisarNeg(o, "biz_vis", { vence: v, extra: `${o.det.at_home ? " En su casa." : ""}${t ? ` Da a cambio un ${t.year} ${t.make} ${t.model}.` : ""}` });
}
type ResV = { ok: true } | { ok: false; msg: Bi };
const yaCambio = () => no("Esta solicitud ya cambió. Actualiza la pantalla.", "This request already changed. Refresh the screen.");

/* ── El negocio responde: Confirmar · Otra hora · No se puede ── */
export type PasoVis = "confirmar" | "otra" | "nopuede";
export async function responderVisita(negocio: string, numero: string, paso: PasoVis, actorId: string, alt?: string): Promise<ResV> {
  if (!NUM_P.test(numero)) return no("Esa solicitud no existe.", "That request does not exist.");
  await barrerVisitas({ numero });
  const o0 = await leer(db(), "o.business_id = $1 and o.number = $2", [negocio, numero]);
  if (!o0) return no("Esa solicitud no existe.", "That request does not exist.");
  let despues: (() => Promise<void>) | null = null;
  const r = await tx(async (c): Promise<ResV> => {
    // Los candados en orden (la hora pedida y la propuesta) para que dos respuestas no se crucen.
    const ks = [String(o0.det.group_id ?? negocio), ...(paso === "otra" && alt && ID.test(alt) ? [alt] : [])].sort();
    for (const k of ks) await lockV(c, k);
    const o = await leer(c, "o.business_id = $1 and o.number = $2", [negocio, numero], true);
    if (!o) return no("Esa solicitud no existe.", "That request does not exist.");
    if (o.status !== "pending") return o.status === "expired" ? no("Pasó el tiempo para responder: la solicitud venció.", "The time to reply passed: the request expired.") : yaCambio();
    if (paso === "nopuede") {
      await c.query(`update operations set status = 'declined', answered_at = now(), respond_by = null, updated_at = now() where id = $1::bigint`, [o.id]);
      await soltar(c, o.det.group_id);
      await ev(c, o.id, "vis_no", "member", actorId);
      despues = async () => { await avisarCliente(o, "vis_no"); };
      return { ok: true };
    }
    if (paso === "otra") {
      const x = (await contexto(c, negocio))!, it = await itemDe(c, x, String(o.det.item_id));
      if (!it) return no("Eso ya no está disponible.", "That is no longer available.");
      const h = (await horasDe(c, x, it, null)).find((z) => z.id === String(alt ?? ""));
      if (!h || (h.libres != null && h.libres < 1)) return no("Esa hora no está libre.", "That time is not free.");
      if (h.dia === o.det.dia && h.min === Number(o.det.min)) return no("Esa es la misma hora que pidieron.", "That is the same time they asked for.");
      const g = ID.test(h.id) ? h.id : null;
      await soltar(c, o.det.group_id);
      if (g && !(await c.query(`update class_groups set seats_booked = seats_booked + 1, updated_at = now() where id = $1::bigint and seats_total - seats_outside - seats_booked >= 1`, [g])).rowCount) throw new Error("cupo");
      const t = (await c.query<{ ini: string; rb: string }>(`select ((($1::date + make_interval(mins => $2::int)) at time zone $3))::text as ini,
                                                                   least(now() + interval '24 hours', (($1::date + make_interval(mins => $2::int)) at time zone $3) - interval '1 hour')::text as rb`, [h.dia, h.min, o.tz])).rows[0]!;
      await c.query(`insert into change_proposals (operation_id, kind, proposed, created_by, side, respond_by) values ($1::bigint, 'time', $2::jsonb, $3, 'business', $4::timestamptz)`,
        [o.id, JSON.stringify({ group_id: g, dia: h.dia, min: h.min, at: t.ini, from: { group_id: o.det.group_id, dia: o.det.dia, min: o.det.min } }), actorId, t.rb]);
      await c.query(`update operations set status = 'change_proposed', answered_at = now(), respond_by = $2::timestamptz, details = details || $3::jsonb, updated_at = now() where id = $1::bigint`,
        [o.id, t.rb, JSON.stringify({ alt_group_id: g, alt: { dia: h.dia, min: h.min } })]);
      await ev(c, o.id, "vis_alt", "member", actorId, { es: `Propusiste ${cuandoVis(h.dia, h.min, true)}`, en: `You proposed ${cuandoVis(h.dia, h.min, false)}` });
      despues = async () => { await avisarCliente(o, "vis_alt", { cuando: cuandoVis(h.dia, h.min, true) }); };
      return { ok: true };
    }
    await c.query(`update operations set status = 'confirmed', answered_at = now(), confirmed_at = now(), respond_by = null, updated_at = now() where id = $1::bigint`, [o.id]);
    await ev(c, o.id, "vis_ok", "member", actorId);
    const d = await direccionCliente(c, o);
    despues = async () => { await avisarCliente(o, "vis_ok", { dir: d ? ` Dirección: ${d}.` : o.det.at_home ? " Te recogen en tu casa." : "" }); };
    return { ok: true };
  });
  if (r.ok && despues) await (despues as () => Promise<void>)();
  return r;
}

/* ── La persona: aceptar la otra hora o «No me sirve» (flow L67) ── */
export async function decidirOtraHora(userId: string, numero: string, acepta: boolean): Promise<ResV> {
  if (!NUM_P.test(numero)) return no("Esa solicitud no existe.", "That request does not exist.");
  await barrerVisitas({ numero });
  const o0 = await leer(db(), "o.user_id = $1 and o.number = $2", [userId, numero]);
  if (!o0) return no("Esa solicitud no existe.", "That request does not exist.");
  let despues: (() => Promise<void>) | null = null;
  const r = await tx(async (c): Promise<ResV> => {
    await lockV(c, String(o0.det.alt_group_id ?? o0.biz));
    const o = await leer(c, "o.user_id = $1 and o.number = $2", [userId, numero], true);
    if (!o || o.status !== "change_proposed") return yaCambio();
    const p = (await c.query<{ id: string; v: { group_id: string | null; dia: string; min: number; at: string } }>(`select id::text, proposed as v from change_proposals where operation_id = $1::bigint and side = 'business' and status = 'open' order by id desc limit 1`, [o.id])).rows[0];
    if (!p) return yaCambio();
    if (!acepta) {
      await c.query(`update change_proposals set status = 'declined', answered_at = now() where id = $1`, [p.id]);
      await c.query(`update operations set status = 'cancelled', cancelled_by = 'user', cancelled_at = now(), cancel_reason = 'alt_no', respond_by = null, updated_at = now() where id = $1::bigint`, [o.id]);
      await soltar(c, o.det.alt_group_id);
      await ev(c, o.id, "alt_declined", "user", userId);
      despues = async () => { await avisarNeg(o, "biz_vis_alt_no"); };
      return { ok: true };
    }
    await c.query(`update operations set status = 'confirmed', confirmed_at = now(), respond_by = null, scheduled_at = $2::timestamptz, details = details || $3::jsonb, updated_at = now() where id = $1::bigint`,
      [o.id, p.v.at, JSON.stringify({ group_id: p.v.group_id, alt_group_id: null, alt: null, dia: p.v.dia, min: p.v.min })]);
    await c.query(`update change_proposals set status = 'accepted', answered_at = now() where id = $1`, [p.id]);
    await ev(c, o.id, "alt_accepted", "user", userId);
    despues = async () => { await avisarNeg({ ...o, det: { ...o.det, dia: p.v.dia, min: p.v.min } }, "biz_vis_alt_ok"); };
    return { ok: true };
  });
  if (r.ok && despues) await (despues as () => Promise<void>)();
  return r;
}

/* ── Cancelar: la persona, gratis siempre y con un toque (cancelarSiempreSePuede); el negocio, una confirmada y con motivo ── */
export async function cancelarVisita(por: { userId: string } | { negocio: string; actorId: string }, numero: string, motivo?: string): Promise<ResV> {
  if (!NUM_P.test(numero)) return no("Esa solicitud no existe.", "That request does not exist.");
  const cliente = "userId" in por, mot = limpio(motivo, 200);
  if (!cliente && mot.length < 4) return no("Escribe el motivo: la persona lo ve.", "Write the reason: the person sees it.");
  const w = cliente ? ["o.user_id = $1 and o.number = $2", [por.userId, numero]] as const : ["o.business_id = $1 and o.number = $2", [por.negocio, numero]] as const;
  const o0 = await leer(db(), w[0], [...w[1]]);
  if (!o0) return no("Esa solicitud no existe.", "That request does not exist.");
  let despues: (() => Promise<void>) | null = null;
  const r = await tx(async (c): Promise<ResV> => {
    await lockV(c, String(grupoVivo(o0) ?? o0.biz));
    const o = await leer(c, w[0], [...w[1]], true);
    if (!o || !VIVAS.includes(o.status)) return yaCambio();
    if (!cliente && o.status !== "confirmed") return no("Una solicitud que espera se responde con «No se puede».", "A pending request is answered with “Cannot”.");
    await c.query(`update operations set status = 'cancelled', cancelled_by = $2, cancelled_at = now(), cancel_reason = $3, respond_by = null, details = details || $4::jsonb, updated_at = now() where id = $1::bigint`,
      [o.id, cliente ? "user" : "business", cliente ? (o.status === "confirmed" ? "cliente" : "solicitud") : "negocio", JSON.stringify(cliente ? {} : { motivoNeg: mot })]);
    await c.query(`update change_proposals set status = 'declined', answered_at = now() where operation_id = $1::bigint and status = 'open'`, [o.id]);
    await soltar(c, grupoVivo(o));
    await ev(c, o.id, cliente ? "vis_cx" : "vis_biz_cx", cliente ? "user" : "member", cliente ? (por as { userId: string }).userId : (por as { actorId: string }).actorId, cliente ? undefined : { es: `Canceló el negocio: ${mot}`, en: `Cancelled by the business: ${mot}` });
    despues = cliente ? async () => { await avisarCliente(o, "vis_cx"); await avisarNeg(o, "biz_vis_cx"); } : async () => { await avisarCliente(o, "vis_biz_cx", { motivo: mot }); };
    return { ok: true };
  });
  if (r.ok && despues) await (despues as () => Promise<void>)();
  return r;
}

/* ── El negocio marca: Pasó · No vino (solo inserción, sin multa). 3 «No vino» en 30 días → cola «Plantones». ── */
export async function marcarVisita(negocio: string, numero: string, que: "paso" | "no_vino", actorId: string): Promise<ResV> {
  if (!NUM_P.test(numero)) return no("Esa solicitud no existe.", "That request does not exist.");
  let despues: (() => Promise<void>) | null = null;
  const r = await tx(async (c): Promise<ResV> => {
    const o = await leer(c, "o.business_id = $1 and o.number = $2", [negocio, numero], true);
    if (!o || o.status !== "confirmed") return yaCambio();
    if (!(await c.query<{ ok: boolean }>(`select scheduled_at <= now() + interval '15 minutes' as ok from operations where id = $1::bigint`, [o.id])).rows[0]?.ok) return no("Todavía no es la hora.", "It is not time yet.");
    await c.query(`update operations set status = 'done', done_at = now(), status_detail = $2, updated_at = now() where id = $1::bigint`, [o.id, que === "no_vino" ? "noshow" : null]);
    await ev(c, o.id, que === "no_vino" ? "vis_noshow" : "vis_done", "member", actorId);
    if (que === "no_vino") await c.query(
      `insert into queue_items (queue, subject_kind, subject_id, business_id, city_id, priority)
       select 'plantones', 'business', b.id, b.id, b.city_id, 'normal' from businesses b
        where b.id = $1 and (select count(*) from operations o where o.business_id = b.id and o.kind = 'visit' and o.status_detail = 'noshow' and o.done_at > now() - interval '30 days') >= 3
       on conflict do nothing`, [negocio]);
    else despues = async () => { await avisarCliente(o, "vis_resena"); };
    return { ok: true };
  });
  if (r.ok && despues) await (despues as () => Promise<void>)();
  return r;
}

/* ── Se rentó o se vendió (o se ocultó): las visitas vivas se cancelan SIN CULPA en la misma transacción del cambio de estado; el aviso
   sale después (avisarRetiradas, también desde el barrido por si algo falló). La reseña no se abre. ── */
export async function retirarAnuncio(c: PoolClient, negocio: string, itemId: string, por: "rented" | "sold" | "hidden"): Promise<number> {
  const L = (await c.query<{ id: string; g: string | null }>(
    `select id::text, case when status = 'change_proposed' then details->>'alt_group_id' else details->>'group_id' end as g from operations
      where kind = 'visit' and business_id = $1 and details->>'item_id' = $2 and status = any($3::text[]) for update`, [negocio, itemId, VIVAS])).rows;
  for (const x of L) {
    await c.query(`update operations set status = 'cancelled', cancelled_by = 'business', cancelled_at = now(), cancel_reason = 'retirado', status_detail = $2, respond_by = null, updated_at = now() where id = $1::bigint`,
      [x.id, por === "rented" ? "rentada" : por === "sold" ? "vendida" : "retirada"]);
    await c.query(`update change_proposals set status = 'declined', answered_at = now() where operation_id = $1::bigint and status = 'open'`, [x.id]);
    await soltar(c, x.g);
    await ev(c, x.id, "vis_listing_gone", "member", null, por === "rented" ? { es: "Se rentó antes de la visita", en: "It was rented before the visit" } : por === "sold" ? { es: "Se vendió antes de la visita", en: "It was sold before the visit" } : { es: "El anuncio se retiró", en: "The listing was withdrawn" });
  }
  return L.length;
}
export async function avisarRetiradas(negocio?: string): Promise<number> {
  const L = (await db().query<{ num: string; id: string }>(
    `select o.number as num, o.id::text from operations o where o.kind = 'visit' and o.status = 'cancelled' and o.cancel_reason = 'retirado' and o.cancelled_at > now() - interval '2 days'${negocio ? " and o.business_id = $1" : ""}
        and not exists (select 1 from operation_events e where e.operation_id = o.id and e.kind = 'vis_gone_sent') limit 200`, negocio ? [negocio] : [])).rows;
  let n = 0;
  for (const x of L) {
    const ok = await db().query(`insert into operation_events (operation_id, kind, actor) select $1::bigint, 'vis_gone_sent', 'system' where not exists (select 1 from operation_events where operation_id = $1::bigint and kind = 'vis_gone_sent')`, [x.id]);
    if (!ok.rowCount) continue;
    const o = await leer(db(), "o.number = $1", [x.num]);
    if (o) { await avisarCliente(o, "vis_vendido"); n++; }
  }
  return n;
}

/* ── Horas de prueba de manejo «cualquier carro»: el patrón semanal del dealer → grupos de un día sin carro, 14 días adelante. Lo que ya no
   va se cancela si nadie la pidió (las pedidas siguen). ── */
export type PatronPrueba = { dow: number; min: number; on: boolean };
export async function horasPrueba(c: Q, negocio: string) {
  const s = (await c.query<{ city: string; vp: PatronPrueba[] | null; cupo: number; hoy: string; ahora: number }>(
    `select b.city_id as city, s.test_pattern as vp, s.test_cupo as cupo, (now() at time zone ci.timezone)::date::text as hoy,
            (extract(hour from now() at time zone ci.timezone) * 60 + extract(minute from now() at time zone ci.timezone))::int as ahora
       from dealer_settings s join businesses b on b.id = s.business_id join cities ci on ci.id = b.city_id where s.business_id = $1 and b.status = 'active'`, [negocio])).rows[0];
  if (!s) return;
  const quiero = (await c.query<{ dia: string; min: number }>(
    `with pat as (select (e->>'dow')::int as dow, (e->>'min')::int as min from jsonb_array_elements($1::jsonb) e where coalesce((e->>'on')::boolean, true))
     select d::date::text as dia, pat.min from generate_series($2::date, $2::date + 13, interval '1 day') d join pat on pat.dow = extract(dow from d)::int
      where d::date > $2::date or pat.min > $3 + 60 order by 1, 2`, [JSON.stringify(s.vp ?? []), s.hoy, s.ahora])).rows;
  const hay = (await c.query<{ id: string; dia: string; min: number; ocup: number }>(
    `select id::text, starts_on::text as dia, start_min as min, seats_booked + seats_outside as ocup from class_groups
      where business_id = $1 and item_id is null and purpose = 'prueba' and status in ('open', 'started') and starts_on >= $2::date`, [negocio, s.hoy])).rows;
  const k = (d: string, m: number) => `${d}|${m}`, Qs = new Set(quiero.map((x) => k(x.dia, x.min))), Hs = new Set(hay.map((x) => k(x.dia, x.min)));
  const fuera = hay.filter((x) => !Qs.has(k(x.dia, x.min)) && x.ocup === 0).map((x) => x.id);
  if (fuera.length) await c.query(`update class_groups set status = 'cancelled', cancel_reason = 'Ya no hay prueba a esa hora', updated_at = now() where id = any($1::bigint[])`, [fuera]);
  for (const x of quiero.filter((z) => !Hs.has(k(z.dia, z.min))))
    await c.query(
      `insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, dur_min, seats_total, purpose)
       select $1, $2, null, jsonb_build_object('es', 'Prueba · ' || (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from $3::date)::int + 1], 'en', 'Test drive · ' || (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from $3::date)::int + 1]),
              $3::date, $3::date, '{}'::smallint[], $4, 30, $5, 'prueba'
        where not exists (select 1 from class_groups where business_id = $1 and item_id is null and purpose = 'prueba' and status <> 'cancelled' and starts_on = $3::date and start_min = $4)`,
      [negocio, s.city, x.dia, x.min, s.cupo]);
  await c.query(`update class_groups set seats_total = $2, updated_at = now() where business_id = $1 and item_id is null and purpose = 'prueba' and status = 'open' and seats_total <> $2 and seats_booked + seats_outside <= $2`, [negocio, s.cupo]);
}

/* ── El barrido (cada minuto) ── */
export async function barrerVisitas(f: { negocio?: string; userId?: string; numero?: string } = {}): Promise<number> {
  const w: string[] = [], a: unknown[] = [];
  if (f.negocio) { a.push(f.negocio); w.push(`o.business_id = $${a.length}`); }
  if (f.userId) { a.push(f.userId); w.push(`o.user_id = $${a.length}::uuid`); }
  if (f.numero) { a.push(f.numero); w.push(`o.number = $${a.length}`); }
  const y = w.length ? ` and ${w.join(" and ")}` : "";
  let n = 0;
  // 1. Sin respuesta a tiempo → SIN RESPUESTA (la hora vuelve a estar libre). Otra hora sin respuesta → cancelada.
  const P = (await db().query<{ num: string }>(`select o.number as num from operations o where o.kind = 'visit' and o.status in ('pending', 'change_proposed') and o.respond_by < now()${y} limit 200`, a)).rows;
  for (const p of P) {
    const o0 = await leer(db(), "o.number = $1", [p.num]);
    if (!o0) continue;
    const o = await tx(async (c) => {
      await lockV(c, String(grupoVivo(o0) ?? o0.biz));
      const o = await leer(c, "o.number = $1", [p.num], true);
      if (!o || !["pending", "change_proposed"].includes(o.status)) return null;
      const alt = o.status === "change_proposed";
      await c.query(alt
        ? `update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now(), cancel_reason = 'alt_vencida', respond_by = null, updated_at = now() where id = $1::bigint`
        : `update operations set status = 'expired', status_detail = 'sin_respuesta', respond_by = null, updated_at = now() where id = $1::bigint`, [o.id]);
      if (alt) await c.query(`update change_proposals set status = 'expired', answered_at = now() where operation_id = $1::bigint and status = 'open'`, [o.id]);
      await soltar(c, grupoVivo(o));
      await ev(c, o.id, "vis_exp", "system", null, alt ? { es: "No respondió a la otra hora", en: "No answer to the other time" } : { es: "El negocio no contestó a tiempo", en: "The business did not reply in time" });
      return o;
    });
    if (!o) continue;
    n++;
    if (o.status === "pending") await avisarCliente(o, "vis_exp");
  }
  // 2. «Pasó»: si nadie marca, a las 24 h de la hora se da por pasada y se abre la reseña.
  const D = (await db().query<{ num: string; id: string }>(
    `update operations o set status = 'done', done_at = now(), status_detail = 'sin_marcar', updated_at = now() where o.kind = 'visit' and o.status = 'confirmed' and o.scheduled_at < now() - interval '24 hours'${y}
     returning o.number as num, o.id::text`, a)).rows;
  for (const d of D) {
    await db().query(`insert into operation_events (operation_id, kind, actor) values ($1::bigint, 'vis_done', 'system')`, [d.id]);
    const o = await leer(db(), "o.number = $1", [d.num]);
    if (o) await avisarCliente(o, "vis_resena");
  }
  n += D.length;
  // 3. Recordatorio: 2 horas antes, una sola vez.
  const R = (await db().query<{ num: string; id: string }>(
    `select o.number as num, o.id::text from operations o where o.kind = 'visit' and o.status = 'confirmed' and o.scheduled_at between now() and now() + interval '2 hours'
        and not exists (select 1 from operation_events e where e.operation_id = o.id and e.kind = 'vis_remind')${y} limit 200`, a)).rows;
  for (const r of R) {
    const ok = await db().query(`insert into operation_events (operation_id, kind, actor) select $1::bigint, 'vis_remind', 'system' where not exists (select 1 from operation_events where operation_id = $1::bigint and kind = 'vis_remind')`, [r.id]);
    const o = ok.rowCount ? await leer(db(), "o.number = $1", [r.num]) : null;
    if (o) { const d = await direccionCliente(db(), o); await avisarCliente(o, "vis_recordatorio", { dir: d ? ` ${d}.` : "" }); }
  }
  if (f.userId || f.numero) return n;
  // 4. Los avisos de «ya no está disponible» que no salieron.
  n += await avisarRetiradas(f.negocio);
  // 5. Horas de prueba de manejo: las pasadas se cierran; las de 14 días adelante se rehacen.
  await db().query(`update class_groups g set status = 'finished', updated_at = now() from cities c where c.id = g.city_id and g.purpose = 'prueba' and g.status in ('open', 'started') and g.starts_on < (now() at time zone c.timezone)::date`);
  const T = (await db().query<{ id: string }>(
    `select s.business_id as id from dealer_settings s join businesses b on b.id = s.business_id join cities ci on ci.id = b.city_id
      where b.status = 'active' and jsonb_array_length(s.test_pattern) > 0${f.negocio ? " and s.business_id = $1" : ""}
        and coalesce((select max(g.starts_on) from class_groups g where g.business_id = s.business_id and g.purpose = 'prueba' and g.status <> 'cancelled'), '1900-01-01'::date) < (now() at time zone ci.timezone)::date + 13
      limit 50`, f.negocio ? [f.negocio] : [])).rows;
  for (const t of T) await horasPrueba(db(), t.id);
  // 6. Lo privado se borra a los 30 días de cerrar: la nota y la dirección de la prueba en casa.
  await db().query(`update operations set customer_note = null, updated_at = now() where kind = 'visit' and customer_note is not null and status in ('done', 'cancelled', 'expired', 'declined')
                      and coalesce(done_at, cancelled_at, updated_at) < now() - interval '30 days'`);
  await db().query(`update op_private p set note_enc = null, purge_at = now() from operations o where o.id = p.operation_id and o.kind = 'visit' and p.reason = 'casa' and p.note_enc is not null
                      and o.status in ('done', 'cancelled', 'expired', 'declined') and coalesce(o.done_at, o.cancelled_at, o.updated_at) < now() - interval '30 days'`);
  return n;
}

/* ── Vistas ── */
export type VisVista = {
  numero: string; estado: string; detalle: string | null; rubro: RubroVis; que: QueVis; item: Bi; itemId: string; sub: Bi; dia: string; min: number; alt: { dia: string; min: number } | null;
  copia: CopiaVis & { papers: Bi | null; ssnReq: boolean | null }; zona: string; direccion: string | null; enCasa: boolean; licencia: boolean; trade: TradeIn | null; nota: string | null;
  negocio: { id: string; nombre: string; foto: string | null; telefono: string | null }; cancelo: string | null; motivoNeg: string | null; enviada: string; vence: string | null; resena: boolean;
  pasos: { k: string; t: Bi; hecho: boolean }[];
  // 4if · Ayuda: se pide cuando pasó (o, confirmada, ya llegó la hora) y hasta 7 días después; una por visita.
  ayuda: { puede: boolean; hay: boolean };
};
function copiaDe(det: Record<string, any>): VisVista["copia"] {
  return { rent: det.rent_cents ?? null, dep: det.deposit_cents ?? 0, appFee: det.app_fee_cents ?? 0, fees: det.fees ?? [], moveIn: det.move_in_cents ?? null, price: det.price_cents ?? null,
    cuota: det.est_cuota_cents ?? null, downPct: det.est_down_pct ?? null, puerta: det.puerta ?? null, est: det.est_payment ?? null, bhph: det.bhph ?? null, titulo: det.title ?? null,
    miles: det.miles ?? null, year: det.year ?? null, svcCents: det.svc_cents ?? null, papers: det.papers ?? null, ssnReq: det.ssn_req ?? null };
}
async function vista(o: Op, cliente: boolean): Promise<VisVista> {
  const x = (await db().query<{ foto: string | null; phone: string | null; vence: string | null; cxr: string | null; mn: string | null; nota: string | null; resena: boolean; ay: boolean; puedeAy: boolean }>(
    `select (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1) as foto, b.phone,
            o.respond_by::text as vence, o.cancel_reason as cxr, o.details->>'motivoNeg' as mn, o.customer_note as nota, exists (select 1 from reviews r where r.operation_id = o.id) as resena,
            exists (select 1 from help_requests h where h.operation_id = o.id) as ay,
            (o.status = 'done' or (o.status = 'confirmed' and o.scheduled_at <= now() + interval '15 minutes')) and coalesce(o.done_at, o.updated_at) > now() - interval '7 days' as "puedeAy"
       from operations o join businesses b on b.id = o.business_id where o.id = $1::bigint`, [o.id])).rows[0]!;
  const conf = o.status === "confirmed" || (o.status === "done" && o.detail !== "noshow");
  // La dirección exacta de una propiedad: SOLO confirmada o pasada (§3, §6 #15). Antes, la zona.
  const direccion = cliente && conf ? await direccionCliente(db(), o) : !cliente && queDe(o) !== "visita" && !o.det.at_home ? await direccionCliente(db(), o) : null;
  return {
    numero: o.num, estado: o.status, detalle: o.detail, rubro: o.det.rubro as RubroVis, que: queDe(o), item: o.det.item as Bi, itemId: String(o.det.item_id), sub: (o.det.sub as Bi) ?? { es: "", en: "" }, dia: String(o.det.dia), min: Number(o.det.min),
    alt: o.status === "change_proposed" && o.det.alt ? (o.det.alt as { dia: string; min: number }) : null, copia: copiaDe(o.det), zona: `${o.det.ciudad ?? ""}${o.det.zip ? ` · ${o.det.zip}` : ""}`,
    direccion, enCasa: !!o.det.at_home, licencia: !!o.det.has_license, trade: (o.det.trade_in as TradeIn) ?? null, nota: x.nota,
    negocio: { id: o.biz, nombre: o.negocio, foto: x.foto, telefono: x.phone }, cancelo: x.cxr, motivoNeg: x.mn, enviada: o.sent, vence: x.vence, resena: x.resena,
    ayuda: { puede: cliente && x.puedeAy && !x.ay, hay: cliente && x.ay },
    pasos: [{ k: "enviada", t: { es: "Enviada", en: "Sent" }, hecho: true }, { k: "confirmada", t: { es: "Confirmada", en: "Confirmed" }, hecho: conf },
      { k: "paso", t: QUE[queDe(o)].paso, hecho: o.status === "done" && o.detail !== "noshow" }],
  };
}
export async function visVista(userId: string, numero: string): Promise<VisVista | null> {
  if (!NUM_P.test(numero)) return null;
  await barrerVisitas({ userId, numero });
  const o = await leer(db(), "o.user_id = $1 and o.number = $2", [userId, numero]);
  return o ? vista(o, true) : null;
}

/* Panel › Hoy y Visitas. */
export type FilaVis = { numero: string; estado: string; detalle: string | null; cliente: string; que: QueVis; item: Bi; itemId: string; dia: string; min: number; vence: string | null; enCasa: boolean;
  trade: TradeIn | null; enviada: string; hoy: boolean; yaPaso: boolean };
const FILA = `select o.number as numero, o.status as estado, o.status_detail as detalle, coalesce(nullif(u.first_name, ''), 'Cliente') as cliente, o.details->>'what' as que, o.details->'item' as item,
                     o.details->>'item_id' as "itemId", o.details->>'dia' as dia, (o.details->>'min')::int as min, o.respond_by::text as vence, coalesce((o.details->>'at_home')::boolean, false) as "enCasa",
                     o.details->'trade_in' as trade, o.sent_at::text as enviada, (o.scheduled_at at time zone c.timezone)::date = (now() at time zone c.timezone)::date as hoy, o.scheduled_at <= now() + interval '15 minutes' as "yaPaso"
                from operations o join users u on u.id = o.user_id and o.kind = 'visit' join cities c on c.id = o.city_id`;
export type VisPanel = { esperan: FilaVis[]; hoy: FilaVis[]; proximas: FilaVis[]; pasadas: FilaVis[]; porItem: { id: string; item: Bi; vivas: number; total: number }[] };
export async function visPanel(negocio: string): Promise<VisPanel> {
  await barrerVisitas({ negocio });
  const F = (await db().query<FilaVis>(`${FILA} where o.business_id = $1 and o.kind = 'visit' and o.status in ('pending', 'change_proposed', 'confirmed') order by o.scheduled_at limit 300`, [negocio])).rows;
  const P = (await db().query<FilaVis>(`${FILA} where o.business_id = $1 and o.kind = 'visit' and o.status not in ('pending', 'change_proposed', 'confirmed') order by o.id desc limit 40`, [negocio])).rows;
  const I = (await db().query<{ id: string; item: Bi; vivas: number; total: number }>(
    `select o.details->>'item_id' as id, (array_agg(o.details->'item' order by o.id desc))[1] as item, count(*) filter (where o.status = any($2::text[]))::int as vivas, count(*)::int as total
       from operations o where o.business_id = $1 and o.kind = 'visit' and o.sent_at > now() - interval '90 days' group by o.details->>'item_id' order by 3 desc, 4 desc limit 60`, [negocio, VIVAS])).rows;
  return { esperan: F.filter((x) => x.estado !== "confirmed"), hoy: F.filter((x) => x.estado === "confirmed" && (x.hoy || x.yaPaso)), proximas: F.filter((x) => x.estado === "confirmed" && !x.hoy && !x.yaPaso), pasadas: P, porItem: I };
}
/* El detalle en el panel: la dirección del cliente (prueba en casa) SOLO confirmada, y cada vista queda en la auditoría. */
export type VisDetalle = VisVista & { cliente: string; casa: { calle: string; zip: string } | null; casaOculta: boolean; historial: { at: string; kind: string; note: Bi | null }[]; otras: HoraVis[]; yaPaso: boolean };
export async function visDetalle(negocio: string, numero: string, actorId: string): Promise<VisDetalle | null> {
  if (!NUM_P.test(numero)) return null;
  await barrerVisitas({ numero });
  const o = await leer(db(), "o.business_id = $1 and o.number = $2", [negocio, numero]);
  if (!o) return null;
  const v = await vista(o, false);
  let casa: VisDetalle["casa"] = null;
  const confirmada = o.status === "confirmed" || o.status === "done";
  if (o.det.at_home && confirmada) {
    const r = (await db().query<{ enc: Buffer | null }>(
      `select p.note_enc as enc from op_private p join operations o on o.id = p.operation_id where p.operation_id = $1::bigint and p.reason = 'casa' and o.business_id = $2 and o.kind = 'visit' and o.status in ('confirmed', 'done')`, [o.id, negocio])).rows[0];
    const t = r ? descifrar(r.enc) : null;
    if (t) {
      try { casa = JSON.parse(t) as { calle: string; zip: string }; } catch { casa = null; }
      await db().query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, 'vis.ver_direccion', 'operation', $2, $3, null, null)`, [actorId, o.num, o.city]);
    }
  }
  const historial = (await db().query<{ at: string; kind: string; note: Bi | null }>(`select at::text, kind, note from operation_events where operation_id = $1::bigint order by at, id`, [o.id])).rows;
  let otras: HoraVis[] = [];
  if (o.status === "pending") {
    const x = await contexto(db(), negocio), it = x ? await itemDe(db(), x, String(o.det.item_id)) : null;
    otras = x && it ? (await horasDe(db(), x, it, null)).filter((h) => (h.libres == null || h.libres > 0) && !(h.dia === o.det.dia && h.min === Number(o.det.min))).slice(0, 24) : [];
  }
  const yaPaso = !!(await db().query<{ ok: boolean }>(`select scheduled_at <= now() + interval '15 minutes' as ok from operations where id = $1::bigint`, [o.id])).rows[0]?.ok;
  return { ...v, cliente: o.cliente, casa, casaOculta: !!o.det.at_home && !confirmada, historial, otras, yaPaso };
}
