import "server-only";
import { ligarCita, usarPre } from "./solicitudes";
import { db } from "./db";
import { comision, cobrarOperacion, registrarRetencion } from "./cobros";
import { contexto, fecha, gente, horaL, huecos, ocupadas, type Ctx, type Hueco, type Persona, type Q } from "./citas";
import { depositoDe, type OficioPub, type PolPub } from "./oficios-publico";
import { pasarela } from "./pagos/pasarela";

/* El Booking de un taller (Auto) o un servicio del hogar (Hogar) — Fase 4 · 4b. Diseño: neg-auto-flow.js (TLAutoFlow,
   APP-NEG-AUTO-BOOKING: Tu carro → Día y hora + cómo te lo devuelven → Revisa y envía) y neg-hogar-flow.js (TLHogarFlow,
   APP-NEG-HOGAR-BOOKING: Tu casa → Franja de llegada de 2 h → Revisa y envía). Usa el motor de citas (agenda de cada
   persona, candado por negocio, depósito retenido antes de guardar) con lo propio: el vehículo o la casa (y si el negocio
   trabaja con ellos), cómo te devuelven el carro, la franja de 2 h y cómo entrar. La operación es una cita (C-48xx). */
type Bi = { es: string; en: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, ID = /^\d{1,18}$/;
export const DIAS_V = 14;
export type PedidoVisita = { svc: string; opts: Record<string, number>; adds: number[]; z: number | null; w: string | null };

async function servicio(c: Q, negocio: string, id: string) {
  return (await c.query<OficioPub & { cat: string }>(
    `select i.id::text, i.section_id::text as sec, i.name, coalesce(i.descr, '{"es":"","en":""}'::jsonb) as desc, coalesce(i.svc_kind, 'fijo') as k, i.price_cents as cents, i.duration_min as dur,
            i.svc_attrs as a, i.svc_opts as opts, i.photos[1] as foto, b.category_id as cat
       from items i join businesses b on b.id = i.business_id
      where i.id = $1::bigint and i.business_id = $2 and i.module = 'svc' and i.removed_at is null and i.sell and i.status = 'live' and not i.is_extra`, [id, negocio])).rows[0] ?? null;
}
async function politica(c: Q, negocio: string): Promise<PolPub> {
  return (await c.query<PolPub>(`select auto_approve as auto, response_min as resp, deposit_cents as dep, cancel_free_h as cxh, expires_h as exp, deposit_kinds as kinds, deposit_big_over_cents as "bigOver", deposit_big_cents as big, deposit_min_price_cents as min from booking_policies where business_id = $1`, [negocio])).rows[0]
    ?? { auto: false, resp: 30, dep: 0, cxh: 2, exp: 2, kinds: [], bigOver: null, big: null, min: null };
}

/* Precio y tiempo de lo elegido (el mismo cálculo al mostrar y al enviar). Cada grupo de opciones es obligatorio. */
export function calcularVisita(s: OficioPub, q: PedidoVisita, tam: string | null) {
  const a = s.a ?? {};
  let cents = s.cents, dur = s.dur ?? 60;
  if (a.sz) { const i = tam ? (tam === "c" ? 0 : tam === "v" ? 2 : 1) : q.z; if (i == null || !a.sz[i]) return null; cents = a.sz[i]!; }
  const ol: { g: Bi; o: Bi; p: number }[] = [];
  for (const [gi, g] of (s.opts ?? []).entries()) { const o = g.o[q.opts[String(gi)] ?? -1]; if (!o) return null; cents += o.p; dur += o.m; ol.push({ g: g.t, o: o.n, p: o.p }); }
  const al: { n: Bi; cents: number; m: number }[] = [];
  for (const i of [...new Set(q.adds)]) { const x = a.x?.[i]; if (!x) return null; cents += x.p; dur += x.m; al.push({ n: x.n, cents: x.p, m: x.m }); }
  return { cents: Math.max(0, cents), dur: Math.max(15, Math.min(600, dur)), ol, al };
}

/* La franja que ocupa en la agenda: Hogar = franja de 2 h (llega dentro); Auto = lo que dura (si lo deja o tarda días,
   se reserva la hora de entrega de 30 min y el trabajo sigue en el taller — decisión reversible, plan 4b, pregunta #4). */
function ocupa(rubro: "auto" | "hogar", s: OficioPub, dur: number, w: string | null) {
  if (rubro === "hogar") return 120;
  if (s.a?.days || w === "deja" || s.a?.w === "deja") return 30;
  return dur;
}
async function preparar(c: Q, negocio: string, q: PedidoVisita) {
  const x = await contexto(c, negocio, ["NEG-AUTO", "NEG-HOGAR"]);
  if (!x || !ID.test(q.svc)) return null;
  const s = await servicio(c, negocio, q.svc);
  if (!s || s.a?.walk || ["grua", "emer", "plan"].includes(s.k)) return null;
  const rubro = s.cat === "NEG-AUTO" ? "auto" as const : "hogar" as const;
  const G = (await gente(c, x)).filter((p) => p.recibe);
  return { x, s, rubro, G, occ: await ocupadas(c, x) };
}
/* Hogar: franjas de 2 h que empiezan en hora par (8–10, 10–12…), como el diseño (nextWin). */
const franjas = (L: Hueco[]) => L.filter((h) => h.m % 120 === 0);

export type HorasVisita = { dias: { i: number; ymd: string; dow: number; num: string; off: boolean }[]; sl: Hueco[]; sig: { i: number; m: number } | null; dur: number; cents: number | null; rubro: "auto" | "hogar" };
export async function horasVisita(negocio: string, q: PedidoVisita, i0: number, tam: string | null): Promise<HorasVisita | null> {
  const c = db(), P = await preparar(c, negocio, q);
  if (!P || !P.G.length) return null;
  const calc = calcularVisita(P.s, q, tam), dur = ocupa(P.rubro, P.s, calc?.dur ?? 60, q.w);
  const L = (k: number) => { const h = huecos(P.x, P.G, k, dur, 0, P.occ); return P.rubro === "hogar" ? franjas(h) : h; };
  const i = Math.max(0, Math.min(DIAS_V - 1, Math.floor(i0) || 0));
  const dias = Array.from({ length: DIAS_V }, (_, k) => { const ymd = fecha(P.x.hoy, k); return { i: k, ymd, dow: new Date(`${ymd}T12:00:00Z`).getUTCDay(), num: String(Number(ymd.slice(8))), off: !L(k).some((h) => h.free) }; });
  const sl = L(i).map((h) => ({ ...h, who: undefined }));
  let sig: HorasVisita["sig"] = null;
  if (!sl.some((h) => h.free)) for (let k = i + 1; k < DIAS_V && !sig; k++) { const h = L(k).find((z) => z.free); if (h) sig = { i: k, m: h.m }; }
  return { dias, sl, sig, dur: calc?.dur ?? dur, cents: calc?.cents ?? null, rubro: P.rubro };
}

/* ── Enviar ── */
export type VisitaIn = PedidoVisita & {
  i: number; m: number; nota?: string; sms?: boolean; pm?: string | null; clave: string; fotos?: string[];
  luces?: string[]; area?: string | null; acceso?: "casa" | "llave" | null; accesoNota?: string; landlord?: boolean; piezas?: boolean;
  pre?: string | null; // 4e: reservar con un pre-estimado o un presupuesto (P-/Q-)
};
type Res = { ok: true; numero: string; st: "pend" | "ok" } | { ok: false; msg: Bi; tarjeta?: true; hora?: true };
const no = (es: string, en: string, extra?: { tarjeta?: true; hora?: true }): Res => ({ ok: false, msg: { es, en }, ...extra });
const LUCES = ["ce", "bat", "temp", "abs", "oil", "tpms"]; // diseño LIGHTS
const AREAS = ["cocina", "bano", "sotano", "cuarto", "sala", "afuera", "toda"]; // diseño AREAS

export async function enviarVisita(userId: string, negocio: string, f: VisitaIn, entorno: string): Promise<Res> {
  if (!UUID.test(String(f?.clave)) || !ID.test(String(f?.svc))) return no("Revisa tu cita y vuelve a intentarlo.", "Check your booking and try again.");
  const q: PedidoVisita = { svc: String(f.svc), opts: {}, adds: (Array.isArray(f.adds) ? f.adds : []).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n < 6), z: f.z == null ? null : Math.round(Number(f.z)), w: ["espera", "deja"].includes(String(f.w)) ? String(f.w) : null };
  for (const [k, v] of Object.entries(f.opts && typeof f.opts === "object" ? f.opts : {})) if (/^[0-2]$/.test(k) && Number.isInteger(v) && v >= 0 && v < 6) q.opts[k] = v;
  const nota = String(f.nota ?? "").trim().slice(0, 400);
  if (/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(nota)) return no("Por seguridad, sin teléfonos en la nota.", "For safety, no phone numbers in the note.");
  const m = Math.floor(Number(f.m)), i = Math.floor(Number(f.i));
  if (!(m >= 0 && m < 1440 && i >= 0 && i < DIAS_V)) return no("Elige día y hora.", "Choose day and time.");
  const fotos = Array.isArray(f.fotos) ? [...new Set(f.fotos.map(String).filter((x) => UUID.test(x)))] : [];
  if (fotos.length > 6) return no("Hasta 6 fotos.", "Up to 6 photos.");
  const c = await db().connect();
  let retenido: string | null = null;
  try {
    await c.query("begin");
    const ya = (await c.query<{ number: string; status: string }>(`select number, status from operations where user_id = $1 and client_key = $2`, [userId, f.clave])).rows[0];
    if (ya) { await c.query("rollback"); return { ok: true, numero: ya.number, st: ya.status === "confirmed" ? "ok" : "pend" }; }
    await c.query(`select pg_advisory_xact_lock(hashtext('cita:' || $1))`, [negocio]);
    const P = await preparar(c, negocio, q);
    if (!P) { await c.query("rollback"); return no("Ese servicio no se reserva en línea.", "That service is not booked online."); }
    const { x, s, rubro } = P;
    const off = await puedeVisita(c, x);
    if (off) { await c.query("rollback"); return off === "tope" ? no(`${x.name} no recibe más citas en línea este mes. Llama para pedir tu cita.`, `${x.name} takes no more online bookings this month. Call to book.`) : no(`${x.name} no toma citas en línea por ahora: llama al negocio.`, `${x.name} is not taking online bookings right now: call the business.`); }
    // El vehículo o la casa: suyos, y que el negocio trabaje con ellos (el servidor decide, no la pantalla).
    const attrs = (await c.query<{ at: Record<string, unknown>; fv: string[]; zone: number | null }>(`select category_attrs as at, filter_values as fv, service_radius_mi as zone from businesses where id = $1`, [negocio])).rows[0]!;
    let veh: { id: string; t: string; size: string; make: string; mileage: number | null } | null = null, casa: { id: string; dir: string; tenure: string; access: string | null; enZona: boolean } | null = null;
    if (rubro === "auto") {
      veh = (await c.query<{ id: string; t: string; size: string; make: string; mileage: number | null }>(`select id::text, year || ' ' || make || ' ' || model as t, size, make, mileage from user_vehicles where user_id = $1 and removed_at is null order by is_default desc, created_at desc limit 1`, [userId])).rows[0] ?? null;
      if (!veh) { await c.query("rollback"); return no("Agrega tu vehículo.", "Add your vehicle."); }
      const cls = veh.size === "v" ? "s" : veh.size, V = attrs.at?.veh as string[] | undefined, MK = attrs.at?.mk as string[] | undefined;
      if ((V && !V.includes(cls)) || (MK && veh.make !== "otra" && !MK.includes(veh.make))) { await c.query("rollback"); return no(`${x.name} no trabaja con tu vehículo.`, `${x.name} does not work on your vehicle.`); }
    } else {
      casa = (await c.query<{ id: string; dir: string; tenure: string; access: string | null; enZona: boolean }>(
        `select h.id::text, concat_ws(', ', a.street || coalesce(' ' || nullif(a.apt, ''), ''), a.zip) as dir, h.tenure, h.access_note as access,
                coalesce(a.geo is null or b.geo is null or ST_DWithin(a.geo, b.geo, coalesce(b.service_radius_mi, 20) * 1609.344), true) as "enZona"
           from user_homes h join user_addresses a on a.id = h.address_id join businesses b on b.id = $2
          where h.user_id = $1 and h.removed_at is null and a.removed_at is null order by h.is_default desc, h.created_at desc limit 1`, [userId, negocio])).rows[0] ?? null;
      if (!casa) { await c.query("rollback"); return no("Agrega tu casa.", "Add your home."); }
      if (!casa.enZona) { await c.query("rollback"); return no(`Tu casa queda fuera de la zona de ${x.name}.`, `Your home is outside ${x.name}'s area.`); }
      const fv = attrs.fv ?? [];
      if (casa.tenure === "inq" && (fv.includes("dueno") || fv.includes("land")) && !fv.includes("inq")) { await c.query("rollback"); return no(`${x.name} solo trabaja con dueños de casa.`, `${x.name} only works with homeowners.`); }
      if (casa.tenure === "inq" && !f.landlord) { await c.query("rollback"); return no("Confirma que tienes el permiso de tu landlord.", "Confirm you have your landlord's permission."); }
    }
    const calc = calcularVisita(s, q, veh?.size ?? null);
    if (!calc) { await c.query("rollback"); return no("Elige las opciones del servicio.", "Choose the service options."); }
    if (rubro === "auto" && s.a?.w === "ambos" && !q.w) { await c.query("rollback"); return no("Elige si esperas o lo dejas.", "Choose whether you wait or drop it off."); }
    const dur = ocupa(rubro, s, calc.dur, q.w);
    const L = huecos(x, P.G, i, dur, 0, P.occ), h = (rubro === "hogar" ? franjas(L) : L).find((z) => z.m === m);
    if (!h?.free || !h.who) { await c.query("rollback"); return no(rubro === "hogar" ? "Esa franja ya no está libre. Elige otra." : "Esa hora ya no está libre. Elige otra.", rubro === "hogar" ? "That window is no longer open. Pick another." : "That time is no longer open. Pick another.", { hora: true }); }
    const quien: Persona = P.G.find((p) => p.id === h.who)!;
    const pend = (await c.query<{ n: number }>(`select count(*)::int as n from operations where user_id = $1 and kind = 'appointment' and status = 'pending'`, [userId])).rows[0]?.n ?? 0;
    if (pend >= 3) { await c.query("rollback"); return no("Tienes 3 solicitudes esperando respuesta. Espera a que te contesten.", "You have 3 requests waiting for a reply. Wait for an answer."); }
    const pol = await politica(c, negocio);
    let dep = quien.cuenta ? depositoDe(pol, s, calc.cents) : 0;
    // Hogar · trabajos de más de $1,000: el depósito nunca pasa de un tercio (regla de PA para contratistas, no se muestra).
    if (rubro === "hogar" && calc.cents > 100000) dep = Math.min(dep, Math.floor(calc.cents / 3));
    const auto = pol.auto, ymd = fecha(x.hoy, i);
    const numero = `C-${(await c.query<{ n: string }>(`select nextval('operations_appt_seq')::text as n`)).rows[0]!.n}`;
    let ret: Awaited<ReturnType<typeof pasarela.retener>> | null = null, fee = 0;
    if (dep > 0) {
      const pm = typeof f.pm === "string" && /^pm_[A-Za-z0-9_]{3,200}$/.test(f.pm) ? f.pm : null;
      if (!pm) { await c.query("rollback"); return no("Elige la tarjeta para el depósito.", "Choose the card for the deposit.", { tarjeta: true }); }
      fee = Math.min(await comision(c, "cita", dep), dep);
      const cliente = await pasarela.cliente(userId).catch(() => null);
      ret = await pasarela.retener({ centavos: dep, comision: fee, destino: quien.cuenta!, pm, cliente, idem: `visita-${f.clave}-${pm.slice(-24)}`, meta: { appointment: numero, business_id: x.id } });
      if (!ret.ok) { await c.query("rollback"); return no(ret.mensaje.es, ret.mensaje.en, { tarjeta: true }); }
      retenido = ret.pi;
      if (ret.estado === "accion") { await c.query("rollback"); await pasarela.liberar(ret.pi).catch(() => undefined); retenido = null; return no("Tu banco pide una verificación extra. Prueba con otra tarjeta.", "Your bank asks for an extra verification. Try another card.", { tarjeta: true }); }
    }
    // Con un pre-estimado o un presupuesto: debe ser suyo, de este negocio y vigente; queda en la cita (y se compara con el estimado).
    const pre = f.pre ? await usarPre(c, userId, String(f.pre), negocio) : null;
    if (f.pre && !pre) { await c.query("rollback"); if (retenido) { await pasarela.liberar(retenido).catch(() => undefined); retenido = null; } return no("Ese pre-estimado ya no está vigente. Pídelo otra vez o reserva sin él.", "That pre-estimate is no longer valid. Ask again or book without it."); }
    const luces = (Array.isArray(f.luces) ? f.luces : []).map(String).filter((z) => LUCES.includes(z)).slice(0, 8);
    const area = AREAS.includes(String(f.area)) ? String(f.area) : null;
    const det = {
      ...(pre ? { pre: { num: pre.num, lo: pre.lo, hi: pre.hi }, preFotos: pre.fotos } : {}),
      svc: s.name, svcId: s.id, k: s.k, opts: calc.ol, adds: calc.al.map((a) => ({ name: a.n, cents: a.cents })), sel: q.opts, rubro, sms: f.sms !== false,
      ...(veh ? { veh: { id: veh.id, t: veh.t, size: veh.size, mi: veh.mileage }, w: q.w ?? s.a?.w ?? "espera", luces, piezas: !!f.piezas } : {}),
      ...(casa ? { casa: { id: casa.id, dir: casa.dir, tenure: casa.tenure }, win: m + 120, area, acceso: f.acceso === "llave" ? "llave" : "casa", accesoNota: String(f.accesoNota ?? casa.access ?? "").slice(0, 120) || null, landlord: casa.tenure === "inq" ? true : null, piezas: !!f.piezas } : {}),
    };
    const op = (await c.query<{ id: string }>(
      `insert into operations (number, kind, city_id, business_id, user_id, member_id, status, scheduled_at, duration_min, buffer_min, customer_note, details,
                               subtotal_cents, total_cents, deposit_cents, pay_mode, respond_by, confirmed_at, answered_at, free_quota_month, client_key, is_test)
       values ($1, 'appointment', $2, $3, $4, $5, $6, ($7::date + make_interval(mins => $8::int)) at time zone $9, $10, 0, nullif($11, ''), $12::jsonb,
               $13, $13, $14, $15, case when $6 = 'pending' then least(now() + make_interval(hours => $16::int), ($7::date + make_interval(mins => $8::int)) at time zone $9) end,
               case when $6 = 'confirmed' then now() end, case when $6 = 'confirmed' then now() end, $17, $18, $19) returning id::text`,
      [numero, x.city, x.id, userId, quien.id, auto ? "confirmed" : "pending", ymd, m, x.tz, dur, nota, JSON.stringify(det), calc.cents, dep, dep > 0 ? "app" : "local", pol.exp, x.plan === "pro" ? null : x.mes, f.clave, entorno !== "produccion"])).rows[0]!.id;
    await c.query(`insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct, options) values ($1, $2, $3::jsonb, 1, $4, $4, 0, $5::jsonb)`,
      [op, s.id, JSON.stringify(s.name), calc.cents - calc.al.reduce((n, a) => n + a.cents, 0), JSON.stringify(calc.ol.map((o) => ({ g: o.g, o: o.o, cents: o.p })))]);
    for (const a of calc.al) await c.query(`insert into operation_lines (operation_id, name, qty, unit_price_cents, line_total_cents, tax_pct, options) values ($1, $2::jsonb, 1, $3, $3, 0, '[]'::jsonb)`, [op, JSON.stringify(a.n), a.cents]);
    if (ret?.ok) await registrarRetencion(c, { opId: op, userId, negocio: x.id, city: x.city, total: dep, comision: fee, r: ret, pm: f.pm ?? undefined, kind: "deposit" });
    if (fotos.length) {
      const ok = await c.query(`update media set owner_kind = 'appointment', owner_id = $1, sort = array_position($3::uuid[], id)
                                 where id = any($3::uuid[]) and uploaded_by = $2 and owner_kind = 'user' and status = 'visible'`, [op, userId, fotos]);
      if (ok.rowCount !== fotos.length) { await c.query("rollback"); if (retenido) { await pasarela.liberar(retenido).catch(() => undefined); retenido = null; } return no("Una de las fotos ya no está. Súbela otra vez.", "One of the photos is gone. Upload it again."); }
    }
    await c.query(`insert into operation_events (operation_id, kind, actor, actor_id) values ($1, 'sent', 'user', $2)`, [op, userId]);
    if (auto) await c.query(`insert into operation_events (operation_id, kind, actor, note) values ($1, 'accepted', 'system', $2::jsonb)`, [op, JSON.stringify({ es: "Confirmada al instante", en: "Confirmed instantly" })]);
    await c.query("commit");
    retenido = null;
    if (auto && dep > 0) await cobrarOperacion(op);
    if (pre) await ligarCita(pre.num, numero).catch(() => undefined);
    return { ok: true, numero, st: auto ? "ok" : "pend" };
  } catch (e) {
    await c.query("rollback").catch(() => undefined);
    if (retenido) await pasarela.liberar(retenido).catch(() => undefined);
    throw e;
  } finally {
    c.release();
  }
}
async function puedeVisita(c: Q, x: Ctx): Promise<"pausa" | "tope" | "apagado" | null> {
  if (!x.mods.includes("citas")) return "apagado";
  if (x.off.citas || x.off.svc) return "pausa";
  if (x.plan === "pro") return null;
  const r = (await c.query<{ cap: number; usados: number }>(
    `select coalesce((select (value #>> '{}')::int from platform_config where key = 'free_ops_cap'), 10) as cap,
            (select count(*)::int from operations where business_id = $1 and kind <> 'table' and free_quota_month = $2) as usados`, [x.id, x.mes])).rows[0];
  return r && r.usados >= r.cap ? "tope" : null;
}
export { horaL };
