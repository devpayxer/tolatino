import "server-only";
import type { PoolClient } from "pg";
import { db, tx } from "./db";

/* Solicitudes de servicio (Fase 4 · bloque 4e). Un solo motor para tres cosas del diseño:
   - pre: pre-estimado con fotos (neg-auto-pre.js / neg-hogar-pre.js): un negocio responde con un RANGO (rng), «hay que
     verlo» (see) o «no lo hacemos» (no); 24 h para responder; el rango vale 7 días y se reserva con un toque.
   - pq: presupuesto a hasta 3 negocios (Hogar, servicios «presupuesto»); 48 h; elegir uno cierra los otros.
   - em: emergencia 24/7 (Hogar): a todos los Pro 24/7 que llegan a tu casa; el primero que acepta la toma; 15 min.
   El servidor decide todo (quién puede, zona, plazos); la pantalla solo muestra. Nada se borra: estados. */
type Q = PoolClient | ReturnType<typeof db>;
type Bi = { es: string; en: string };
type Res<T = object> = ({ ok: true } & T) | { ok: false; msg: Bi };
const no = (es: string, en: string): { ok: false; msg: Bi } => ({ ok: false, msg: { es, en } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, NUM = /^[PQE]-\d{1,10}$/;
/* Fechas en los dos idiomas (to_char de Postgres solo sabe inglés: «Fri 13 Nov» saldría en la pantalla en español). */
function fechaBi(iso: string | Date | null, tz: string, hora: boolean): Bi | null {
  if (!iso) return null;
  const d = new Date(iso), o: Intl.DateTimeFormatOptions = { timeZone: tz, weekday: "short", day: "numeric", month: "short", ...(hora ? { hour: "numeric", minute: "2-digit" } : {}) };
  const es = new Intl.DateTimeFormat("es-US", o).formatToParts(d), en = new Intl.DateTimeFormat("en-US", o).formatToParts(d), g = (P: Intl.DateTimeFormatPart[], t: string) => P.find((x) => x.type === t)?.value ?? "";
  const hEs = hora ? ` · ${g(es, "hour")}:${g(es, "minute")} ${g(en, "dayPeriod")}` : "", hEn = hora ? ` · ${g(en, "hour")}:${g(en, "minute")} ${g(en, "dayPeriod")}` : "";
  const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
  return { es: `${cap(g(es, "weekday").replace(".", ""))} ${g(es, "day")} ${g(es, "month").replace(".", "")}${hEs}`, en: `${g(en, "weekday")}, ${g(en, "month")} ${g(en, "day")}${hEn}` };
}
const money = (c: number) => `$${Math.round(c / 100).toLocaleString("en-US")}`;
export const LUCES = ["ce", "bat", "temp", "abs", "oil", "tpms"];
export const AREAS = ["cocina", "bano", "sotano", "cuarto", "sala", "afuera", "toda"];
export const CUANDO = ["hoy", "sem", "nada"];
/* Qué servicios admiten pre-estimado (diseño: Auto «desde» y «se cotiza»; Hogar visita, por hora y por medida). */
export const PRE_K: Record<string, string[]> = { auto: ["desde", "cotiza"], hogar: ["visita", "hora", "area"] };
const TEL = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;

/* ── El vehículo o la casa de la persona, y que el negocio trabaje con ellos (lo mismo que el Booking) ── */
async function suyo(c: Q, userId: string, negocio: string, rubro: "auto" | "hogar"): Promise<Res<{ veh: { id: string; t: string; mi: number | null } | null; casa: { id: string; dir: string; tenure: string } | null }>> {
  const at = (await c.query<{ at: Record<string, unknown> | null; fv: string[] | null; name: string }>(`select category_attrs as at, filter_values as fv, name from businesses where id = $1`, [negocio])).rows[0];
  if (!at) return no("Ese negocio no existe.", "That business does not exist.");
  if (rubro === "auto") {
    const v = (await c.query<{ id: string; t: string; size: string; make: string; mi: number | null }>(`select id::text, year || ' ' || make || ' ' || model as t, size, make, mileage as mi from user_vehicles where user_id = $1 and removed_at is null order by is_default desc, created_at desc limit 1`, [userId])).rows[0];
    if (!v) return no("Agrega tu vehículo.", "Add your vehicle.");
    const cls = v.size === "v" ? "s" : v.size, V = at.at?.veh as string[] | undefined, MK = at.at?.mk as string[] | undefined;
    if ((V && !V.includes(cls)) || (MK && v.make !== "otra" && !MK.includes(v.make))) return no(`${at.name} no trabaja con tu vehículo.`, `${at.name} does not work on your vehicle.`);
    return { ok: true, veh: { id: v.id, t: v.t, mi: v.mi }, casa: null };
  }
  const h = (await c.query<{ id: string; dir: string; tenure: string; enZona: boolean }>(
    `select h.id::text, concat_ws(', ', a.street || coalesce(' ' || nullif(a.apt, ''), ''), a.zip) as dir, h.tenure,
            coalesce(a.geo is null or b.geo is null or ST_DWithin(a.geo, b.geo, coalesce(b.service_radius_mi, 20) * 1609.344), true) as "enZona"
       from user_homes h join user_addresses a on a.id = h.address_id join businesses b on b.id = $2
      where h.user_id = $1 and h.removed_at is null and a.removed_at is null order by h.is_default desc, h.created_at desc limit 1`, [userId, negocio])).rows[0];
  if (!h) return no("Agrega tu casa.", "Add your home.");
  if (!h.enZona) return no(`Tu casa queda fuera de la zona de ${at.name}.`, `Your home is outside ${at.name}'s area.`);
  const fv = at.fv ?? [];
  if (h.tenure === "inq" && (fv.includes("dueno") || fv.includes("land")) && !fv.includes("inq")) return no(`${at.name} solo trabaja con dueños de casa.`, `${at.name} only works with homeowners.`);
  return { ok: true, veh: null, casa: { id: h.id, dir: h.dir, tenure: h.tenure } };
}

/* ── Pedir un pre-estimado ── */
export type PreIn = { negocio: string; svc: string; luces?: string[]; nota: string; code?: string; cuando: string; area?: string | null; marca?: string; edad?: string; fotos: string[]; clave: string };
export async function pedirPre(userId: string, f: PreIn): Promise<Res<{ numero: string }>> {
  if (!UUID.test(String(f?.clave)) || !/^\d{1,18}$/.test(String(f?.svc)) || typeof f.negocio !== "string") return no("Revisa tu solicitud y vuelve a intentarlo.", "Check your request and try again.");
  const nota = String(f.nota ?? "").trim().replace(/\s+/g, " ").slice(0, 400);
  if (TEL.test(nota)) return no("Por seguridad, sin teléfonos en la nota.", "For safety, no phone numbers in the note.");
  const luces = (Array.isArray(f.luces) ? f.luces : []).map(String).filter((z) => LUCES.includes(z)).slice(0, 6);
  const fotos = Array.isArray(f.fotos) ? [...new Set(f.fotos.map(String).filter((x) => UUID.test(x)))] : [];
  if (!fotos.length) return no("Agrega al menos una foto o video.", "Add at least one photo or video.");
  if (fotos.length > 6) return no("Hasta 6 fotos.", "Up to 6 photos.");
  const cuando = CUANDO.includes(String(f.cuando)) ? String(f.cuando) : "sem";
  let numero = "", biz = "", svcN = "";
  const r = await tx(async (c): Promise<Res<{ numero: string }>> => {
    const ya = (await c.query<{ number: string }>(`select number from service_requests where user_id = $1 and form->>'clave' = $2`, [userId, f.clave])).rows[0];
    if (ya) return { ok: true, numero: ya.number };
    const s = (await c.query<{ id: string; k: string; name: Bi; cat: string; city: string; bstatus: string }>(
      `select i.id::text, coalesce(i.svc_kind, 'fijo') as k, i.name, b.category_id as cat, b.city_id as city, b.status as bstatus from items i join businesses b on b.id = i.business_id
        where i.id = $1::bigint and i.business_id = $2 and i.module = 'svc' and i.removed_at is null and i.sell and i.status = 'live'`, [f.svc, f.negocio])).rows[0];
    if (!s || s.bstatus !== "active") return no("Ese servicio ya no está.", "That service is no longer available.");
    const rubro = s.cat === "NEG-AUTO" ? "auto" : s.cat === "NEG-HOGAR" ? "hogar" : null;
    if (!rubro || !PRE_K[rubro]!.includes(s.k)) return no("Ese servicio tiene precio: resérvalo directo.", "That service has a price: book it directly.");
    if (rubro === "auto" ? !luces.length && nota.length < 10 : nota.length < 10) return no("Cuéntanos qué pasa (al menos 10 letras).", "Tell us what is going on (at least 10 characters).");
    const area = rubro === "hogar" && AREAS.includes(String(f.area)) ? String(f.area) : null;
    if (rubro === "hogar" && !area) return no("Elige dónde es.", "Choose where it is.");
    const u = await suyo(c, userId, f.negocio, rubro);
    if (!u.ok) return u;
    // Uno abierto por servicio: si ya lo pediste y está esperando, se abre ese.
    const abierto = (await c.query<{ number: string }>(
      `select r.number from service_requests r join request_targets t on t.request_id = r.id where r.user_id = $1 and r.mode = 'pre' and r.status = 'sent' and t.item_id = $2::bigint`, [userId, s.id])).rows[0];
    if (abierto) return { ok: true, numero: abierto.number };
    numero = `P-${(await c.query<{ n: string }>(`select nextval('service_request_seq')::text as n`)).rows[0]!.n}`;
    const form = { clave: f.clave, svc: s.name, k: s.k, nota, luces, code: rubro === "auto" ? String(f.code ?? "").toUpperCase().replace(/[^A-Z0-9 ,]/g, "").slice(0, 20) || null : null, cuando, area,
      marca: rubro === "hogar" ? String(f.marca ?? "").trim().slice(0, 40) || null : null, edad: rubro === "hogar" ? String(f.edad ?? "").trim().slice(0, 20) || null : null,
      veh: u.veh, casa: u.casa ? { dir: u.casa.dir, tenure: u.casa.tenure } : null };
    const id = (await c.query<{ id: string }>(
      `insert into service_requests (number, mode, user_id, city_id, category_id, rubro, vehicle_id, home_id, form, respond_by)
       values ($1, 'pre', $2, $3, $4, $5, $6::uuid, $7::uuid, $8::jsonb, now() + interval '24 hours') returning id::text`,
      [numero, userId, s.city, s.cat, rubro, u.veh?.id ?? null, u.casa?.id ?? null, JSON.stringify(form)])).rows[0]!.id;
    await c.query(`insert into request_targets (request_id, business_id, item_id) values ($1::bigint, $2, $3::bigint)`, [id, f.negocio, s.id]);
    const ok = await c.query(`update media set owner_kind = 'request', owner_id = $1, sort = array_position($3::uuid[], id) where id = any($3::uuid[]) and uploaded_by = $2 and owner_kind = 'user' and status = 'visible'`, [id, userId, fotos]);
    if (ok.rowCount !== fotos.length) { await c.query("rollback"); return no("Una de las fotos ya no está. Súbela otra vez.", "One of the photos is gone. Upload it again."); }
    biz = f.negocio; svcN = s.name.es;
    return { ok: true, numero };
  });
  if (r.ok && biz) {
    const cl = (await db().query<{ n: string }>(`select coalesce(nullif(first_name, ''), 'Un cliente') as n from users where id = $1`, [userId])).rows[0]?.n ?? "";
    await (await import("./avisos")).avisarNegocio(biz, "biz_preest", { cliente: cl, svc: svcN }, { href: `/panel/${biz}/hoy?det=sol:${r.numero}`, ref: ["request", r.numero] });
  }
  return r;
}

/* ── Vencer: lo que nadie contestó a tiempo (se llama al mirar la solicitud o el panel; barato: índice parcial) ── */
export async function vencerSolicitudes(f: { userId?: string; negocio?: string } = {}) {
  const L = (await db().query<{ id: string; number: string; uid: string; mode: string; biz: string; negocio: string }>(
    `with v as (update request_targets t set status = 'expired' from service_requests r
                where t.request_id = r.id and t.status = 'sent' and r.status in ('sent', 'answered') and r.mode in ('pre', 'pq') and r.respond_by < now()
                  ${f.userId ? "and r.user_id = $1" : f.negocio ? "and t.business_id = $1" : ""}
                returning t.request_id, t.business_id)
     select r.id::text, r.number, r.user_id::text as uid, r.mode, v.business_id as biz, b.name as negocio from v join service_requests r on r.id = v.request_id join businesses b on b.id = v.business_id`,
    f.userId ? [f.userId] : f.negocio ? [f.negocio] : [])).rows;
  for (const x of L) {
    // La solicitud vence si nadie respondió; si alguno respondió, sigue (presupuesto).
    await db().query(`update service_requests set status = 'expired', updated_at = now() where id = $1::bigint and status = 'sent' and not exists (select 1 from request_targets where request_id = $1::bigint and status in ('rng', 'see', 'no'))`, [x.id]);
    if (x.mode === "pre") await (await import("./avisos")).avisar(x.uid, "preest_exp", { negocio: x.negocio, num: x.number }, { href: `/pre/${x.number}`, ref: ["request", x.number] });
  }
}

/* ── El negocio responde (pre y presupuesto) ── */
export type RespIn = { que: string; lo?: number; hi?: number; inc?: string[]; chg?: string[]; nota?: string; visita?: number | null; dias?: string | null };
export async function responderSolicitud(negocio: string, numero: string, actorId: string, f: RespIn): Promise<Res> {
  if (!NUM.test(numero)) return no("Esa solicitud no existe.", "That request does not exist.");
  await vencerSolicitudes({ negocio });
  const que = ["rng", "see", "no"].includes(String(f?.que)) ? (f.que as "rng" | "see" | "no") : null;
  if (!que) return no("Elige qué le respondes.", "Choose your reply.");
  const lo = Math.round(Number(f.lo)), hi = Math.round(Number(f.hi));
  if (que !== "no" && !(lo > 0 && hi >= lo && hi <= 10000000)) return no("Pon el rango: desde y hasta (el «hasta» no puede ser menor).", "Enter the range: from and to (“to” cannot be lower).");
  if (que === "rng" && hi > lo * 4) return no("El rango es muy amplio para un pre-estimado: si no lo puedes cerrar, usa «Hay que verlo».", "The range is too wide: if you cannot narrow it, use “Needs an inspection”.");
  const lim = (L: unknown) => (Array.isArray(L) ? L : []).map((x) => String(x ?? "").trim().replace(/\s+/g, " ").slice(0, 120)).filter((x) => x.length >= 2).slice(0, 5);
  const nota = String(f.nota ?? "").trim().replace(/\s+/g, " ").slice(0, 300);
  if (TEL.test(nota)) return no("Sin teléfonos en la respuesta: el cliente te escribe por Mensajes.", "No phone numbers in the reply: the client writes through Messages.");
  const visita = f.visita == null || f.visita === ("" as never) ? null : Math.round(Number(f.visita));
  if (visita != null && !(visita >= 0 && visita <= 100000)) return no("Revisa el costo de la visita.", "Check the visit fee.");
  let aviso: { uid: string; mode: string; negocio: string } | null = null;
  const r = await tx(async (c): Promise<Res> => {
    const t = (await c.query<{ tid: string; rid: string; st: string; rst: string; mode: string; uid: string; negocio: string }>(
      `select t.id::text as tid, r.id::text as rid, t.status as st, r.status as rst, r.mode, r.user_id::text as uid, b.name as negocio
         from request_targets t join service_requests r on r.id = t.request_id join businesses b on b.id = t.business_id
        where t.business_id = $1 and r.number = $2 for update of t, r`, [negocio, numero])).rows[0];
    if (!t || t.mode === "em") return no("Esa solicitud no existe.", "That request does not exist.");
    if (t.st === "expired") return no("Pasó el plazo para responder.", "The time to reply has passed.");
    if (t.st !== "sent" || !["sent", "answered"].includes(t.rst)) return no("Esta solicitud ya cambió. Actualiza la pantalla.", "This request already changed. Refresh the screen.");
    const reply = que === "no" ? { nota } : { lo, hi, inc: lim(f.inc), chg: lim(f.chg), nota, visita, dias: f.dias ? String(f.dias).slice(0, 20) : null };
    await c.query(`update request_targets set status = $2, reply = $3::jsonb, answered_at = now(), answered_by = $4 where id = $1::bigint`, [t.tid, que, JSON.stringify(reply), actorId]);
    await c.query(`update service_requests set status = 'answered', valid_until = coalesce(valid_until, now() + interval '7 days'), updated_at = now() where id = $1::bigint and status = 'sent'`, [t.rid]);
    aviso = { uid: t.uid, mode: t.mode, negocio: t.negocio };
    return { ok: true };
  });
  if (r.ok && aviso) {
    const a = aviso as { uid: string; mode: string; negocio: string };
    await (await import("./avisos")).avisar(a.uid, a.mode === "pq" ? "pq_resp" : `preest_${que}`, { negocio: a.negocio, num: numero, rango: que === "no" ? "" : `${money(lo)}–${money(hi)}` }, { href: `/pre/${numero}`, ref: ["request", numero] });
  }
  return r;
}

/* ── La persona: cancelar, mandar otra vez ── */
export async function solicitudCliente(userId: string, numero: string, que: "cancelar" | "reenviar"): Promise<Res> {
  if (!NUM.test(numero)) return no("Esa solicitud no existe.", "That request does not exist.");
  await vencerSolicitudes({ userId });
  const r = await tx(async (c): Promise<Res & { biz?: string[]; mode?: string; svc?: string; cl?: string }> => {
    const s = (await c.query<{ id: string; st: string; mode: string; svc: string; cl: string }>(`select r.id::text, r.status as st, r.mode, coalesce(r.form#>>'{svc,es}', '') as svc, coalesce(nullif(u.first_name, ''), 'Un cliente') as cl
      from service_requests r join users u on u.id = r.user_id where r.user_id = $1 and r.number = $2 for update of r`, [userId, numero])).rows[0];
    if (!s) return no("Esa solicitud no existe.", "That request does not exist.");
    if (que === "cancelar") {
      if (!["sent", "answered"].includes(s.st)) return no("Esta solicitud ya cambió.", "This request already changed.");
      await c.query(`update service_requests set status = 'cancelled', updated_at = now() where id = $1::bigint`, [s.id]);
      await c.query(`update request_targets set status = 'cancelled' where request_id = $1::bigint and status in ('sent', 'rng', 'see')`, [s.id]);
      return { ok: true };
    }
    if (s.st !== "expired" || s.mode === "em") return no("Solo se manda otra vez lo que venció.", "Only an expired request can be sent again.");
    await c.query(`update service_requests set status = 'sent', respond_by = now() + case when mode = 'pq' then interval '48 hours' else interval '24 hours' end, updated_at = now() where id = $1::bigint`, [s.id]);
    const B = (await c.query<{ b: string }>(`update request_targets set status = 'sent', notified_at = now() where request_id = $1::bigint and status = 'expired' returning business_id as b`, [s.id])).rows.map((x) => x.b);
    return { ok: true, biz: B, mode: s.mode, svc: s.svc, cl: s.cl };
  });
  if (r.ok && "biz" in r && r.biz?.length) for (const b of r.biz) await (await import("./avisos")).avisarNegocio(b, r.mode === "pq" ? "biz_pq" : "biz_preest", { cliente: r.cl ?? "", svc: r.svc ?? "" }, { href: `/panel/${b}/hoy?det=sol:${numero}`, ref: ["request", numero] });
  return r.ok ? { ok: true } : r;
}

/* ── Lo que ve la persona ── */
export type Destino = { negocio: { id: string; nombre: string; telefono: string | null; foto: string | null; quien: string | null }; item: string | null; st: string; reply: { lo?: number; hi?: number; inc?: string[]; chg?: string[]; nota?: string; visita?: number | null; dias?: string | null } | null;
  at: string | null; diag: { id: string; name: Bi; cents: number; cred: boolean } | null; resp: number };
export type SolicitudVista = {
  numero: string; mode: "pre" | "pq" | "em"; rubro: "auto" | "hogar"; st: string; enviada: string; vence: Bi | null; valida: Bi | null; svc: Bi; k: string;
  form: { nota: string; luces: string[]; code: string | null; cuando: string; area: string | null; marca: string | null; edad: string | null; veh: { t: string; mi: number | null } | null; casa: { dir: string } | null };
  fotos: string[]; destinos: Destino[]; otros: { id: string; nombre: string; foto: string | null; meta: string }[]; cita: string | null;
};
export async function solicitudVista(userId: string, numero: string): Promise<SolicitudVista | null> {
  if (!NUM.test(numero)) return null;
  await vencerSolicitudes({ userId });
  const s = (await db().query<{ id: string; mode: SolicitudVista["mode"]; rubro: SolicitudVista["rubro"]; st: string; enviada: string; vence: Date | null; valida: Date | null; tz: string; form: Record<string, unknown>; cat: string; city: string; cita: string | null }>(
    `select r.id::text, r.mode, r.rubro, r.status as st, to_char(r.created_at at time zone c.timezone, 'FMHH12:MI AM') as enviada,
            r.respond_by as vence, r.valid_until as valida, c.timezone as tz, r.form, r.category_id as cat, r.city_id as city,
            (select number from operations where id = r.operation_id) as cita
       from service_requests r join cities c on c.id = r.city_id where r.user_id = $1 and r.number = $2`, [userId, numero])).rows[0];
  if (!s) return null;
  const D = (await db().query<Destino & { bid: string; k: string; svc: Bi }>(
    `select jsonb_build_object('id', b.id, 'nombre', b.name, 'telefono', b.phone, 'foto', b.logo_url,
              'quien', (select display_name from business_members m where m.business_id = b.id and m.kind = 'owner' and m.status = 'active' limit 1)) as negocio,
            t.item_id::text as item, t.status as st, t.reply, to_char(t.answered_at at time zone 'America/New_York', 'FMHH12:MI AM') as at, i.svc_kind as k, i.name as svc,
            (select jsonb_build_object('id', d.id::text, 'name', d.name, 'cents', d.price_cents, 'cred', coalesce((d.svc_attrs->>'cred')::boolean, false)) from items d
              where d.business_id = b.id and d.module = 'svc' and d.removed_at is null and d.sell and d.status = 'live' and d.svc_kind in ('diag', 'visita') order by d.price_cents limit 1) as diag,
            coalesce((select response_min from booking_policies where business_id = b.id), 30) as resp
       from request_targets t join businesses b on b.id = t.business_id left join items i on i.id = t.item_id where t.request_id = $1::bigint order by t.sort, t.id`, [s.id])).rows;
  const f = s.form as Record<string, never>;
  const fotos = (await db().query<{ url: string }>(`select url from media where owner_kind = 'request' and owner_id = $1 and status = 'visible' order by sort`, [s.id])).rows.map((x) => x.url);
  // «No lo hacen» o sin respuesta: otros negocios de la ciudad que sí lo hacen (Pro primero, con servicios de estimado).
  const otros = D.every((d) => ["no", "expired"].includes(d.st)) ? (await db().query<{ id: string; nombre: string; foto: string | null; meta: string }>(
    `select b.id, b.name as nombre, b.logo_url as foto, coalesce(b.address, '') as meta from businesses b left join business_stats_cache st on st.business_id = b.id
      where b.category_id = $1 and b.city_id = $2 and b.status = 'active' and not (b.id = any($3::text[]))
        and exists (select 1 from items i where i.business_id = b.id and i.module = 'svc' and i.removed_at is null and i.sell and i.svc_kind = any($4::text[]))
      order by (coalesce(st.plan, 'free') = 'pro') desc, b.name limit 3`, [s.cat, s.city, D.map((d) => d.negocio.id), PRE_K[s.rubro]])).rows : [];
  return { numero, mode: s.mode, rubro: s.rubro, st: s.st, enviada: s.enviada, vence: fechaBi(s.vence, s.tz, true), valida: fechaBi(s.valida, s.tz, false), svc: (f.svc as unknown as Bi) ?? { es: "", en: "" }, k: String(f.k ?? ""),
    form: { nota: String(f.nota ?? ""), luces: (f.luces as unknown as string[]) ?? [], code: (f.code as unknown as string) ?? null, cuando: String(f.cuando ?? "sem"), area: (f.area as unknown as string) ?? null, marca: (f.marca as unknown as string) ?? null, edad: (f.edad as unknown as string) ?? null,
      veh: (f.veh as unknown as { t: string; mi: number | null }) ?? null, casa: (f.casa as unknown as { dir: string }) ?? null },
    fotos, destinos: D.map(({ bid: _b, k: _k, svc: _s, ...d }) => d), otros, cita: s.cita };
}

/* ── El panel: las que esperan respuesta (Hoy) y el detalle ── */
export type SolFila = { numero: string; mode: string; quien: string; svc: Bi; st: string; hace: number; vence: Bi; veh: string | null; casa: string | null };
export async function solicitudesPanel(negocio: string): Promise<SolFila[]> {
  await vencerSolicitudes({ negocio });
  return (await db().query<Omit<SolFila, "vence"> & { vence: Date; tz: string }>(
    `select r.number as numero, r.mode, coalesce(nullif(u.first_name, ''), 'Cliente') || coalesce(' ' || left(nullif(u.last_name, ''), 1) || '.', '') as quien, r.form->'svc' as svc, t.status as st,
            floor(extract(epoch from now() - t.notified_at) / 60)::int as hace, r.respond_by as vence, ci.timezone as tz,
            r.form#>>'{veh,t}' as veh, r.form#>>'{casa,dir}' as casa
       from request_targets t join service_requests r on r.id = t.request_id join users u on u.id = r.user_id join cities ci on ci.id = r.city_id
      where t.business_id = $1 and t.status = 'sent' and r.status in ('sent', 'answered') and r.mode in ('pre', 'pq') order by r.respond_by limit 30`, [negocio])).rows
    .map(({ tz, vence, ...x }) => ({ ...x, vence: fechaBi(vence, tz, true)! }));
}
export type SolPanel = SolFila & { form: SolicitudVista["form"]; fotos: string[]; reply: Destino["reply"]; otros: number };
export async function solicitudPanel(negocio: string, numero: string): Promise<SolPanel | null> {
  if (!NUM.test(numero)) return null;
  await vencerSolicitudes({ negocio });
  const r = (await db().query<Omit<SolFila, "vence"> & { vence: Date; tz: string; id: string; form: Record<string, unknown>; reply: Destino["reply"]; otros: number }>(
    `select r.id::text, r.number as numero, r.mode, coalesce(nullif(u.first_name, ''), 'Cliente') || coalesce(' ' || left(nullif(u.last_name, ''), 1) || '.', '') as quien, r.form->'svc' as svc, t.status as st,
            floor(extract(epoch from now() - t.notified_at) / 60)::int as hace, r.respond_by as vence, ci.timezone as tz,
            r.form#>>'{veh,t}' as veh, r.form#>>'{casa,dir}' as casa, r.form, t.reply, (select count(*)::int - 1 from request_targets x where x.request_id = r.id) as otros
       from request_targets t join service_requests r on r.id = t.request_id join users u on u.id = r.user_id join cities ci on ci.id = r.city_id
      where t.business_id = $1 and r.number = $2 and r.mode in ('pre', 'pq')`, [negocio, numero])).rows[0];
  if (!r) return null;
  await db().query(`update request_targets set seen_at = coalesce(seen_at, now()) where business_id = $1 and request_id = $2::bigint`, [negocio, r.id]);
  const f = r.form as Record<string, never>;
  const fotos = (await db().query<{ url: string }>(`select url from media where owner_kind = 'request' and owner_id = $1 and status = 'visible' order by sort`, [r.id])).rows.map((x) => x.url);
  const { id: _i, form: _f, tz, vence, ...rest } = r;
  return { ...rest, vence: fechaBi(vence, tz, true)!, fotos, form: { nota: String(f.nota ?? ""), luces: (f.luces as unknown as string[]) ?? [], code: (f.code as unknown as string) ?? null, cuando: String(f.cuando ?? "sem"), area: (f.area as unknown as string) ?? null, marca: (f.marca as unknown as string) ?? null, edad: (f.edad as unknown as string) ?? null,
    veh: (f.veh as unknown as { t: string; mi: number | null }) ?? null, casa: (f.casa as unknown as { dir: string }) ?? null } };
}

/* ── Reservar con el pre-estimado (lo llama el Booking dentro de su transacción): debe ser de la persona, de ese negocio,
   con rango o «hay que verlo», y vigente. Marca la solicitud como usada y deja el rango en la cita. ── */
export async function usarPre(c: PoolClient, userId: string, numero: string, negocio: string): Promise<{ num: string; lo: number; hi: number; fotos: string[]; nota: string } | null> {
  if (!NUM.test(numero)) return null;
  const t = (await c.query<{ rid: string; tid: string; reply: { lo: number; hi: number }; nota: string }>(
    `select r.id::text as rid, t.id::text as tid, t.reply, coalesce(r.form->>'nota', '') as nota from service_requests r join request_targets t on t.request_id = r.id
      where r.user_id = $1 and r.number = $2 and t.business_id = $3 and t.status in ('rng', 'see') and r.status = 'answered' and r.valid_until > now() for update of r, t`, [userId, numero, negocio])).rows[0];
  if (!t) return null;
  await c.query(`update request_targets set status = 'used' where id = $1::bigint`, [t.tid]);
  await c.query(`update service_requests set status = 'used', updated_at = now() where id = $1::bigint`, [t.rid]);
  // Presupuesto: los otros negocios se cierran (y se les avisa después).
  await c.query(`update request_targets set status = 'closed' where request_id = $1::bigint and id <> $2::bigint and status in ('sent', 'rng', 'see')`, [t.rid, t.tid]);
  const fotos = (await c.query<{ url: string }>(`select url from media where owner_kind = 'request' and owner_id = $1 and status = 'visible' order by sort`, [t.rid])).rows.map((x) => x.url);
  return { num: numero, lo: t.reply.lo, hi: t.reply.hi, fotos, nota: t.nota };
}
export async function ligarCita(numero: string, opNumero: string) {
  await db().query(`update service_requests set operation_id = (select id from operations where number = $2) where number = $1`, [numero, opNumero]);
  const L = (await db().query<{ b: string; cl: string }>(`select t.business_id as b, coalesce(nullif(u.first_name, ''), 'El cliente') as cl from request_targets t join service_requests r on r.id = t.request_id join users u on u.id = r.user_id
    where r.number = $1 and r.mode = 'pq' and t.status = 'closed'`, [numero])).rows;
  for (const x of L) await (await import("./avisos")).avisarNegocio(x.b, "pq_cerrado", { cliente: x.cl, num: numero }, { ref: ["request", numero] });
}

/* Para el Booking: el pre-estimado o presupuesto vigente que la persona trae (solo lectura; usarPre lo confirma al enviar). */
export async function preVigente(userId: string, numero: string, negocio: string): Promise<{ num: string; lo: number; hi: number; nota: string; mode: string } | null> {
  if (!NUM.test(numero)) return null;
  return (await db().query<{ num: string; lo: number; hi: number; nota: string; mode: string }>(
    `select r.number as num, (t.reply->>'lo')::int as lo, (t.reply->>'hi')::int as hi, coalesce(r.form->>'nota', '') as nota, r.mode from service_requests r join request_targets t on t.request_id = r.id
      where r.user_id = $1 and r.number = $2 and t.business_id = $3 and t.status in ('rng', 'see') and r.status = 'answered' and r.valid_until > now()`, [userId, numero, negocio])).rows[0] ?? null;
}
