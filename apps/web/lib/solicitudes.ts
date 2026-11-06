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
    if (!(s.st === "expired" || (s.mode === "em" && s.st === "nobody"))) return no("Solo se manda otra vez lo que venció.", "Only an expired request can be sent again.");
    await c.query(`update service_requests set status = 'sent', respond_by = now() + case when mode = 'pq' then interval '48 hours' when mode = 'em' then interval '15 minutes' else interval '24 hours' end, updated_at = now() where id = $1::bigint`, [s.id]);
    const B = (await c.query<{ b: string }>(`update request_targets set status = 'sent', notified_at = now() where request_id = $1::bigint and status = 'expired' returning business_id as b`, [s.id])).rows.map((x) => x.b);
    return { ok: true, biz: B, mode: s.mode, svc: s.svc, cl: s.cl };
  });
  if (r.ok && "biz" in r && r.biz?.length) for (const b of r.biz) await (await import("./avisos")).avisarNegocio(b, r.mode === "pq" ? "biz_pq" : r.mode === "em" ? "biz_em" : "biz_preest", { cliente: r.cl ?? "", svc: r.svc ?? "", que: r.svc ?? "", mi: "—" }, { href: `/panel/${b}/hoy?det=sol:${numero}`, ref: ["request", numero] });
  return r.ok ? { ok: true } : r;
}

/* ── Lo que ve la persona ── */
export type Destino = { negocio: { id: string; nombre: string; telefono: string | null; foto: string | null; quien: string | null }; item: string | null; st: string; reply: { lo?: number; hi?: number; inc?: string[]; chg?: string[]; nota?: string; visita?: number | null; dias?: string | null } | null;
  at: string | null; diag: { id: string; name: Bi; cents: number; cred: boolean } | null; resp: number; precio: number | null; dias: [number, number] | null; eta: number | null; recargo: number };
export type SolicitudVista = {
  numero: string; mode: "pre" | "pq" | "em"; rubro: "auto" | "hogar"; st: string; enviada: string; vence: Bi | null; valida: Bi | null; svc: Bi; k: string;
  form: { nota: string; luces: string[]; code: string | null; cuando: string; area: string | null; marca: string | null; edad: string | null; veh: { t: string; mi: number | null } | null; casa: { dir: string } | null; areas?: string[]; medidas?: string | null; acceso?: string | null; ek?: string | null };
  linea911: Bi;
  fotos: string[]; destinos: Destino[]; otros: { id: string; nombre: string; foto: string | null; meta: string }[]; cita: string | null;
};
export async function solicitudVista(userId: string, numero: string): Promise<SolicitudVista | null> {
  if (!NUM.test(numero)) return null;
  await vencerSolicitudes({ userId });
  await vencerEmergencias({ userId });
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
            coalesce((select response_min from booking_policies where business_id = b.id), 30) as resp, i.price_cents as precio,
            case when i.svc_attrs ? 'days' then array[(i.svc_attrs->'days'->>0)::int, (i.svc_attrs->'days'->>1)::int] end as dias,
            (select emergency_eta_min from trade_settings where business_id = b.id) as eta, coalesce((i.svc_attrs->>'sur')::int, 0) as recargo
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
      veh: (f.veh as unknown as { t: string; mi: number | null }) ?? null, casa: (f.casa as unknown as { dir: string }) ?? null, areas: (f.areas as unknown as string[]) ?? [], medidas: (f.medidas as unknown as string) ?? null, acceso: (f.acceso as unknown as string) ?? null, ek: (f.ek as unknown as string) ?? null },
    linea911: LINE911,
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

/* ── Presupuesto a hasta 3 (Hogar, servicios «presupuesto»): candidatos y pedir ── */
export const AREAS_PQ = ["cocina", "bano", "sotano", "techo", "afuera", "toda"];
export type CandPq = { id: string; nombre: string; foto: string | null; item: string; visita: number; ok: boolean; millas: number | null; dias: [number, number] | null };
/* Negocios Pro de Hogar con un servicio «presupuesto» del mismo tipo de trabajo (comparten subcategoría con el de la ficha);
   el de la ficha primero; los que no llegan a la casa salen marcados y no se pueden elegir. */
export async function candidatosPq(userId: string | null, negocio: string, svc: string): Promise<CandPq[]> {
  if (!/^\d{1,18}$/.test(svc)) return [];
  return (await db().query<CandPq>(
    `with o as (select b.subcategory_ids as subs, b.city_id from businesses b join items i on i.business_id = b.id where b.id = $1 and i.id = $2::bigint and i.svc_kind = 'pres' and b.category_id = 'NEG-HOGAR'),
          casa as (select a.geo from user_homes h join user_addresses a on a.id = h.address_id where h.user_id = $3::uuid and h.removed_at is null and a.removed_at is null order by h.is_default desc, h.created_at desc limit 1)
     select b.id, b.name as nombre, b.logo_url as foto, p.id::text as item, p.price_cents as visita,
            coalesce((select a.geo is null or b.geo is null or ST_DWithin(a.geo, b.geo, coalesce(b.service_radius_mi, 20) * 1609.344) from casa a), true) as ok,
            (select round((ST_Distance(a.geo, b.geo) / 1609.344)::numeric, 1)::float from casa a where a.geo is not null and b.geo is not null) as millas,
            case when p.svc_attrs ? 'days' then array[(p.svc_attrs->'days'->>0)::int, (p.svc_attrs->'days'->>1)::int] end as dias
       from o, businesses b left join business_stats_cache st on st.business_id = b.id
       join lateral (select i.id, i.price_cents, i.svc_attrs from items i where i.business_id = b.id and i.module = 'svc' and i.svc_kind = 'pres' and i.removed_at is null and i.sell and i.status = 'live'
                      order by (i.id = $2::bigint) desc, i.sort, i.id limit 1) p on true
      where b.category_id = 'NEG-HOGAR' and b.status = 'active' and b.city_id = o.city_id and (b.id = $1 or (coalesce(st.plan, 'free') = 'pro' and b.subcategory_ids && o.subs))
      order by (b.id = $1) desc, ok desc, b.name limit 12`, [negocio, svc, userId])).rows;
}

export type PqIn = { negocio: string; svc: string; negocios: string[]; areas?: string[]; nota: string; medidas?: string; fotos: string[]; clave: string };
export async function pedirPq(userId: string, f: PqIn): Promise<Res<{ numero: string }>> {
  if (!UUID.test(String(f?.clave)) || !/^\d{1,18}$/.test(String(f?.svc)) || typeof f.negocio !== "string") return no("Revisa tu solicitud y vuelve a intentarlo.", "Check your request and try again.");
  const nota = String(f.nota ?? "").trim().replace(/\s+/g, " ").slice(0, 500), medidas = String(f.medidas ?? "").trim().slice(0, 60);
  if (TEL.test(nota) || TEL.test(medidas)) return no("Por seguridad, sin teléfonos en la nota.", "For safety, no phone numbers in the note.");
  if (nota.length < 10) return no("Cuéntales qué quieres hacer (al menos 10 letras).", "Tell them what you want done (at least 10 characters).");
  const fotos = Array.isArray(f.fotos) ? [...new Set(f.fotos.map(String).filter((x) => UUID.test(x)))] : [];
  if (!fotos.length) return no("Agrega al menos una foto.", "Add at least one photo.");
  if (fotos.length > 6) return no("Hasta 6 fotos.", "Up to 6 photos.");
  const sel = Array.isArray(f.negocios) ? [...new Set(f.negocios.map(String))] : [];
  if (!sel.length) return no("Elige al menos un negocio.", "Pick at least one business.");
  if (sel.length > 3) return no("Hasta 3 negocios.", "Up to 3 businesses.");
  const areas = (Array.isArray(f.areas) ? f.areas : []).map(String).filter((x) => AREAS_PQ.includes(x)).slice(0, 6);
  const C = await candidatosPq(userId, f.negocio, f.svc);
  const elegidos = sel.map((id) => C.find((x) => x.id === id));
  if (elegidos.some((x) => !x)) return no("Uno de esos negocios ya no recibe presupuestos.", "One of those businesses no longer takes estimate requests.");
  if (elegidos.some((x) => !x!.ok)) return no("Uno de esos negocios no llega hasta tu casa.", "One of those businesses does not reach your home.");
  let numero = "";
  const r = await tx(async (c): Promise<Res<{ numero: string }>> => {
    const ya = (await c.query<{ number: string }>(`select number from service_requests where user_id = $1 and form->>'clave' = $2`, [userId, f.clave])).rows[0];
    if (ya) return { ok: true, numero: ya.number };
    const s = (await c.query<{ id: string; name: Bi; city: string }>(`select i.id::text, i.name, b.city_id as city from items i join businesses b on b.id = i.business_id where i.id = $1::bigint and i.business_id = $2`, [f.svc, f.negocio])).rows[0];
    if (!s) return no("Ese servicio ya no está.", "That service is no longer available.");
    const casa = (await c.query<{ id: string; dir: string; tenure: string }>(
      `select h.id::text, concat_ws(', ', a.street || coalesce(' ' || nullif(a.apt, ''), ''), a.zip) as dir, h.tenure from user_homes h join user_addresses a on a.id = h.address_id
        where h.user_id = $1 and h.removed_at is null and a.removed_at is null order by h.is_default desc, h.created_at desc limit 1`, [userId])).rows[0];
    if (!casa) return no("Agrega tu casa.", "Add your home.");
    numero = `Q-${(await c.query<{ n: string }>(`select nextval('service_request_seq')::text as n`)).rows[0]!.n}`;
    const form = { clave: f.clave, svc: s.name, k: "pres", nota, areas, medidas: medidas || null, cuando: "sem", casa: { dir: casa.dir, tenure: casa.tenure } };
    const id = (await c.query<{ id: string }>(
      `insert into service_requests (number, mode, user_id, city_id, category_id, rubro, home_id, form, respond_by) values ($1, 'pq', $2, $3, 'NEG-HOGAR', 'hogar', $4::uuid, $5::jsonb, now() + interval '48 hours') returning id::text`,
      [numero, userId, s.city, casa.id, JSON.stringify(form)])).rows[0]!.id;
    let k = 0;
    for (const x of elegidos) await c.query(`insert into request_targets (request_id, business_id, item_id, sort) values ($1::bigint, $2, $3::bigint, $4)`, [id, x!.id, x!.item, k++]);
    const ok = await c.query(`update media set owner_kind = 'request', owner_id = $1, sort = array_position($3::uuid[], id) where id = any($3::uuid[]) and uploaded_by = $2 and owner_kind = 'user' and status = 'visible'`, [id, userId, fotos]);
    if (ok.rowCount !== fotos.length) { await c.query("rollback"); return no("Una de las fotos ya no está. Súbela otra vez.", "One of the photos is gone. Upload it again."); }
    return { ok: true, numero };
  });
  if (r.ok && numero) {
    const cl = (await db().query<{ n: string }>(`select coalesce(nullif(first_name, ''), 'Un cliente') as n from users where id = $1`, [userId])).rows[0]?.n ?? "";
    const svc = (await db().query<{ s: string }>(`select form#>>'{svc,es}' as s from service_requests where number = $1`, [numero])).rows[0]?.s ?? "";
    for (const x of elegidos) await (await import("./avisos")).avisarNegocio(x!.id, "biz_pq", { cliente: cl, svc }, { href: `/panel/${x!.id}/hoy?det=sol:${numero}`, ref: ["request", numero] });
  }
  return r;
}

/* ── Emergencia 24/7 (Hogar). Diseño neg-hogar-mas.js: a TODOS los Pro con 24 h que hacen ese trabajo y llegan a tu casa;
   el primero que acepta la toma (update … where accepted_business_id is null: gana uno, sin carreras) y se vuelve una visita
   «va en camino»; nadie en 15 min → «nadie disponible». La línea del 911 nunca se suaviza. ── */
export const LINE911: Bi = { es: "Si huele a gas, hay chispas o humo, sal de la casa y llama al 911.", en: "If you smell gas, see sparks or smoke, leave the house and call 911." };
export const EMER: Record<string, [string, string, string[]]> = {
  "e:fuga": ["Fuga que no para", "Leak that won’t stop", ["NEG-HOGAR-02", "NEG-HOGAR-03", "NEG-HOGAR-04"]],
  "e:calef": ["Sin calefacción", "No heat", ["NEG-HOGAR-06", "NEG-HOGAR-07"]],
  "e:luz": ["Chispas o sin luz", "Sparks or no power", ["NEG-HOGAR-05"]],
  "e:tapado": ["Inodoro o drenaje desbordado", "Toilet or drain overflowing", ["NEG-HOGAR-03", "NEG-HOGAR-02"]],
  "e:cerrado": ["Te quedaste afuera", "Locked out", ["NEG-HOGAR-52"]],
  "e:tormenta": ["Daño por tormenta", "Storm damage", ["NEG-HOGAR-01", "NEG-HOGAR-23", "NEG-HOGAR-36"]],
};
export type CandEm = { id: string; nombre: string; foto: string | null; telefono: string | null; item: string; salida: number; recargo: number; eta: number; millas: number | null };
async function candEm(c: Q, userId: string, ek: string): Promise<CandEm[]> {
  const e = EMER[ek];
  if (!e) return [];
  return (await c.query<CandEm>(
    `with casa as (select a.geo, a.city_id from user_homes h join user_addresses a on a.id = h.address_id where h.user_id = $1 and h.removed_at is null and a.removed_at is null order by h.is_default desc, h.created_at desc limit 1)
     select b.id, b.name as nombre, b.logo_url as foto, b.phone as telefono, i.id::text as item, i.price_cents as salida, coalesce((i.svc_attrs->>'sur')::int, 0) as recargo, coalesce(t.emergency_eta_min, 60) as eta,
            (select round((ST_Distance(a.geo, b.geo) / 1609.344)::numeric, 1)::float from casa a where a.geo is not null and b.geo is not null) as millas
       from businesses b join trade_settings t on t.business_id = b.id left join business_stats_cache st on st.business_id = b.id
       join lateral (select i.id, i.price_cents, i.svc_attrs from items i where i.business_id = b.id and i.module = 'svc' and i.svc_kind = 'emer' and i.removed_at is null and i.sell and i.status = 'live'
                       and (not (i.svc_attrs ? 'sym') or i.svc_attrs->'sym' ? $2) order by i.price_cents limit 1) i on true
      where b.category_id = 'NEG-HOGAR' and b.status = 'active' and t.h24 and coalesce(st.plan, 'free') = 'pro' and b.subcategory_ids && $3::text[]
        and exists (select 1 from casa a where a.geo is null or b.geo is null or ST_DWithin(a.geo, b.geo, coalesce(b.service_radius_mi, 20) * 1609.344))
      order by eta, salida limit 20`, [userId, ek, e[2]])).rows;
}
export async function candidatosEm(userId: string | null, ek: string): Promise<CandEm[]> { return userId && EMER[ek] ? candEm(db(), userId, ek) : []; }

export type EmIn = { ek: string; nota?: string; acceso?: string; cuando: string; fotos?: string[]; clave: string };
export async function pedirEm(userId: string, f: EmIn): Promise<Res<{ numero: string }>> {
  if (!UUID.test(String(f?.clave)) || !EMER[String(f?.ek)]) return no("Elige qué pasa.", "Pick what is going on.");
  const nota = String(f.nota ?? "").trim().replace(/\s+/g, " ").slice(0, 300), acceso = String(f.acceso ?? "").trim().slice(0, 80);
  if (TEL.test(nota) || TEL.test(acceso)) return no("Por seguridad, sin teléfonos en la nota.", "For safety, no phone numbers in the note.");
  const fotos = Array.isArray(f.fotos) ? [...new Set(f.fotos.map(String).filter((x) => UUID.test(x)))] : [];
  if (fotos.length > 3) return no("Hasta 3 fotos.", "Up to 3 photos.");
  let numero = "", L: CandEm[] = [];
  const r = await tx(async (c): Promise<Res<{ numero: string }>> => {
    const ya = (await c.query<{ number: string }>(`select number from service_requests where user_id = $1 and form->>'clave' = $2`, [userId, f.clave])).rows[0];
    if (ya) return { ok: true, numero: ya.number };
    // Una emergencia abierta a la vez: si ya hay una buscando, se abre esa.
    const abierta = (await c.query<{ number: string }>(`select number from service_requests where user_id = $1 and mode = 'em' and status = 'sent' and respond_by > now()`, [userId])).rows[0];
    if (abierta) return { ok: true, numero: abierta.number };
    const casa = (await c.query<{ id: string; dir: string; tenure: string; city: string | null }>(
      `select h.id::text, concat_ws(', ', a.street || coalesce(' ' || nullif(a.apt, ''), ''), a.zip) as dir, h.tenure, a.city_id as city from user_homes h join user_addresses a on a.id = h.address_id
        where h.user_id = $1 and h.removed_at is null and a.removed_at is null order by h.is_default desc, h.created_at desc limit 1`, [userId])).rows[0];
    if (!casa) return no("Agrega tu casa.", "Add your home.");
    L = await candEm(c, userId, f.ek);
    if (!L.length) return no("Nadie 24/7 llega hasta tu casa para esto. Llama a uno directo.", "No 24/7 business reaches your home for this. Call one directly.");
    const city = casa.city ?? (await c.query<{ c: string }>(`select city_id as c from businesses where id = $1`, [L[0]!.id])).rows[0]!.c;
    numero = `E-${(await c.query<{ n: string }>(`select nextval('service_request_seq')::text as n`)).rows[0]!.n}`;
    const form = { clave: f.clave, svc: { es: EMER[f.ek]![0], en: EMER[f.ek]![1] }, k: "emer", ek: f.ek, nota, acceso: acceso || null, cuando: f.cuando === "3h" ? "3h" : "now", casa: { dir: casa.dir, tenure: casa.tenure } };
    const id = (await c.query<{ id: string }>(
      `insert into service_requests (number, mode, user_id, city_id, category_id, rubro, home_id, form, respond_by) values ($1, 'em', $2, $3, 'NEG-HOGAR', 'hogar', $4::uuid, $5::jsonb, now() + interval '15 minutes') returning id::text`,
      [numero, userId, city, casa.id, JSON.stringify(form)])).rows[0]!.id;
    let k = 0;
    for (const x of L) await c.query(`insert into request_targets (request_id, business_id, item_id, sort) values ($1::bigint, $2, $3::bigint, $4)`, [id, x.id, x.item, k++]);
    if (fotos.length) {
      const ok = await c.query(`update media set owner_kind = 'request', owner_id = $1, sort = array_position($3::uuid[], id) where id = any($3::uuid[]) and uploaded_by = $2 and owner_kind = 'user' and status = 'visible'`, [id, userId, fotos]);
      if (ok.rowCount !== fotos.length) { await c.query("rollback"); return no("Una de las fotos ya no está. Súbela otra vez.", "One of the photos is gone. Upload it again."); }
    }
    return { ok: true, numero };
  });
  if (r.ok && numero) for (const x of L) await (await import("./avisos")).avisarNegocio(x.id, "biz_em", { que: EMER[f.ek]![0], mi: x.millas != null ? String(x.millas) : "—" }, { href: `/panel/${x.id}/hoy?det=sol:${numero}`, ref: ["request", numero] });
  return r;
}

/* El negocio acepta: gana el primero. Se crea la visita (confirmada, «va en camino») con la salida como precio. */
export async function aceptarEm(negocio: string, numero: string, actorId: string, entorno: string): Promise<Res<{ cita: string }>> {
  if (!/^E-\d{1,10}$/.test(numero)) return no("Esa emergencia no existe.", "That emergency does not exist.");
  await vencerEmergencias();
  let aviso: { uid: string; negocio: string; eta: number; otros: string[] } | null = null;
  const r = await tx(async (c): Promise<Res<{ cita: string }>> => {
    const t = (await c.query<{ rid: string; tid: string; item: string; st: string }>(
      `select r.id::text as rid, t.id::text as tid, t.item_id::text as item, t.status as st from request_targets t join service_requests r on r.id = t.request_id where t.business_id = $1 and r.number = $2 and r.mode = 'em'`, [negocio, numero])).rows[0];
    if (!t) return no("Esa emergencia no existe.", "That emergency does not exist.");
    const gana = (await c.query<{ uid: string; home: string; form: Record<string, unknown>; city: string }>(
      `update service_requests set accepted_business_id = $2, accepted_at = now(), status = 'taken', updated_at = now()
        where id = $1::bigint and accepted_business_id is null and status = 'sent' and respond_by > now() returning user_id::text as uid, home_id::text as home, form, city_id as city`, [t.rid, negocio])).rows[0];
    if (!gana) {
      const x = (await c.query<{ st: string; acc: string | null }>(`select status as st, accepted_business_id as acc from service_requests where id = $1::bigint`, [t.rid])).rows[0]!;
      return x.acc ? no("Ya la tomó otro negocio.", "Another business already took it.") : no("Pasaron los 15 minutos: la emergencia se cerró.", "The 15 minutes passed: the emergency closed.");
    }
    await c.query(`update request_targets set status = case when business_id = $2 then 'taken' else 'lost' end, answered_at = case when business_id = $2 then now() else answered_at end, answered_by = case when business_id = $2 then $3::uuid else answered_by end where request_id = $1::bigint`, [t.rid, negocio, actorId]);
    const it = (await c.query<{ name: Bi; cents: number; eta: number; mem: string | null; tz: string; m: number }>(
      `select i.name, i.price_cents as cents, coalesce(ts.emergency_eta_min, 60) as eta,
              (select id::text from business_members where business_id = $2 and user_id = $3 and status = 'active' limit 1) as mem, ci.timezone as tz,
              (extract(hour from now() at time zone ci.timezone) * 60 + extract(minute from now() at time zone ci.timezone))::int as m
         from items i join businesses b on b.id = i.business_id join cities ci on ci.id = b.city_id left join trade_settings ts on ts.business_id = b.id where i.id = $1::bigint`, [t.item, negocio, actorId])).rows[0]!;
    const mem = it.mem ?? (await c.query<{ id: string }>(`select id::text from business_members where business_id = $1 and kind = 'owner' and status = 'active' limit 1`, [negocio])).rows[0]?.id ?? null;
    const f = gana.form as { ek: string; nota: string; acceso: string | null; casa: { dir: string; tenure: string } };
    const cita = `C-${(await c.query<{ n: string }>(`select nextval('operations_appt_seq')::text as n`)).rows[0]!.n}`;
    const det = { rubro: "hogar", svc: it.name, svcId: t.item, k: "emer", sel: {}, opts: [], adds: [], sms: true, emer: { num: numero, ek: f.ek, eta: it.eta },
      casa: { id: gana.home, dir: f.casa.dir, tenure: f.casa.tenure }, win: Math.min(1439, it.m + it.eta), area: null, acceso: f.acceso ? "llave" : "casa", accesoNota: f.acceso, landlord: f.casa.tenure === "inq" ? true : null };
    const op = (await c.query<{ id: string }>(
      `insert into operations (number, kind, city_id, business_id, user_id, member_id, status, status_detail, scheduled_at, duration_min, buffer_min, customer_note, details, subtotal_cents, total_cents, deposit_cents, pay_mode, confirmed_at, answered_at, client_key, is_test)
       values ($1, 'appointment', $2, $3, $4, $5, 'confirmed', 'road', now(), 120, 0, nullif($6, ''), $7::jsonb, $8, $8, 0, 'local', now(), now(), gen_random_uuid(), $9) returning id::text`,
      [cita, gana.city, negocio, gana.uid, mem, f.nota ?? "", JSON.stringify(det), it.cents, entorno !== "produccion"])).rows[0]!.id;
    await c.query(`update service_requests set operation_id = $2::bigint where id = $1::bigint`, [t.rid, op]);
    await c.query(`insert into operation_events (operation_id, kind, actor, actor_id, note) values ($1::bigint, 'sent', 'user', $2, $3::jsonb), ($1::bigint, 'accepted', 'member', $4, $5::jsonb), ($1::bigint, 'on_the_way', 'member', $4, null)`,
      [op, gana.uid, JSON.stringify({ es: `Emergencia ${numero}`, en: `Emergency ${numero}` }), actorId, JSON.stringify({ es: "Tomó la emergencia", en: "Took the emergency" })]);
    const otros = (await c.query<{ b: string }>(`select business_id as b from request_targets where request_id = $1::bigint and status = 'lost'`, [t.rid])).rows.map((x) => x.b);
    const nb = (await c.query<{ n: string }>(`select name as n from businesses where id = $1`, [negocio])).rows[0]!.n;
    aviso = { uid: gana.uid, negocio: nb, eta: it.eta, otros };
    return { ok: true, cita };
  });
  if (r.ok && aviso) {
    const a = aviso as { uid: string; negocio: string; eta: number; otros: string[] }, av = await import("./avisos");
    await av.avisar(a.uid, "em_ok", { negocio: a.negocio, eta: String(a.eta) }, { href: `/cita/${r.cita}`, ref: ["appointment", r.cita] });
    for (const b of a.otros) await av.avisarNegocio(b, "em_tomada", { num: numero }, { ref: ["request", numero] });
  }
  return r;
}

/* Nadie aceptó en 15 minutos: «nadie disponible» (no se cobró nada). */
export async function vencerEmergencias(f: { userId?: string } = {}) {
  const L = (await db().query<{ id: string; number: string; uid: string }>(
    `update service_requests set status = 'nobody', updated_at = now() where mode = 'em' and status = 'sent' and respond_by < now() ${f.userId ? "and user_id = $1" : ""}
     returning id::text, number, user_id::text as uid`, f.userId ? [f.userId] : [])).rows;
  for (const x of L) {
    await db().query(`update request_targets set status = 'expired' where request_id = $1::bigint and status = 'sent'`, [x.id]);
    await (await import("./avisos")).avisar(x.uid, "em_nadie", { num: x.number }, { href: `/pre/${x.number}`, ref: ["request", x.number] });
  }
}

/* El panel: las emergencias abiertas que este negocio puede tomar (arriba en Hoy). */
export type EmFila = { numero: string; que: Bi; ek: string; casa: string; millas: number | null; min: number; nota: string; acceso: string | null; fotos: string[]; salida: number; st: string; cita: string | null; quien: string };
export async function emergenciasPanel(negocio: string, numero?: string): Promise<EmFila[]> {
  await vencerEmergencias();
  return (await db().query<EmFila>(
    `select r.number as numero, r.form->'svc' as que, r.form->>'ek' as ek, coalesce(r.form#>>'{casa,dir}', '') as casa, greatest(0, ceil(extract(epoch from r.respond_by - now()) / 60))::int as min,
            coalesce(r.form->>'nota', '') as nota, r.form->>'acceso' as acceso, t.status as st, (select number from operations where id = r.operation_id) as cita,
            coalesce(nullif(u.first_name, ''), 'Cliente') || coalesce(' ' || left(nullif(u.last_name, ''), 1) || '.', '') as quien, i.price_cents as salida,
            (select round((ST_Distance(a.geo, b.geo) / 1609.344)::numeric, 1)::float from user_homes h join user_addresses a on a.id = h.address_id where h.id = r.home_id and a.geo is not null and b.geo is not null) as millas,
            array(select m.url from media m where m.owner_kind = 'request' and m.owner_id = r.id::text and m.status = 'visible' order by m.sort) as fotos
       from request_targets t join service_requests r on r.id = t.request_id join businesses b on b.id = t.business_id join users u on u.id = r.user_id left join items i on i.id = t.item_id
      where t.business_id = $1 and r.mode = 'em' and ${numero ? "r.number = $2" : "t.status = 'sent' and r.status = 'sent'"} order by r.respond_by limit 10`, numero ? [negocio, numero] : [negocio])).rows;
}
