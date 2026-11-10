import "server-only";
import { headers } from "next/headers";
import { tapar } from "./compa/tapar";
import { valores } from "./config";
import { hrefAyuda } from "./ayuda-cita";
import { db, tx } from "./db";
import { CON_OPERACION, TEMAS, TEMAS_NEGOCIO, TEMAS_VECINO, horarioEquipo, type EstadoVecino, type Tema } from "./soporte-comun";

/* 7b · Soporte del lado de la persona (fase7-compa.md §4 7b; diseño «To'Latino Soporte.dc.html», APP-SOPORTE). Un caso es de quien lo abrió;
   uno abierto desde el panel de un negocio lo ve también el dueño de ese negocio (y nadie más del negocio). TODO lo que llega aquí trae el
   id de la SESIÓN (nunca uno que mande el teléfono) y cada número se busca con ese id: un número ajeno no existe (404).
   Las notas internas del equipo NUNCA salen de aquí: el hilo de la persona se lee solo con HILO_VECINO_SQL (`not m.internal`; guardián
   notaInternaNoSale). Lo del equipo vive en lib/soporte-equipo.ts. */
type Bi = { es: string; en: string };
export type ResS = { ok: true; numero?: string; mensaje?: Bi } | { ok: false; msg: Bi };
const no = (es: string, en: string): ResS => ({ ok: false, msg: { es, en } });
const ISO = (x: string) => `to_char((${x}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const NUM_TK = /^TK-\d{4,12}$/;
const NEG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const limpio = (t: unknown, max: number) => String(t ?? "").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, max);

/* Quién mira: la persona y, si es desde el panel, el negocio. */
export type Quien = { userId: string; negocio?: string | null };

/* Lo que ve: el caso es suyo, o es del negocio del contexto y la persona es su dueña. Sin negocio: solo los suyos sin negocio. */
const VISIBLE = (u: string, n: string) => `((${n}::text is null and c.business_id is null and c.user_id = ${u})
  or (${n}::text is not null and c.business_id = ${n} and (c.user_id = ${u} or exists (select 1 from business_members bm where bm.business_id = c.business_id and bm.user_id = ${u}
      and bm.status = 'active' and (bm.kind = 'owner' or 'all' = any(bm.panel_access))))))`;

/* El hilo de la persona: nunca las notas internas (ni las líneas internas del sistema). */
export const HILO_VECINO_SQL = `select m.id::text, m.sender, case when m.hidden_at is null then m.body end as body, m.hidden_at is not null as oculto,
    case when m.photo_media_id is not null and m.hidden_at is null then '/api/ayuda/foto/' || m.photo_media_id::text end as foto, m.sys_key, m.vars,
    ${ISO("m.at")} as at, su.first_name as equipo, coalesce(m.user_id = $2, false) as mio
  from support_messages m left join users su on su.id = m.staff_id
 where m.case_id = $1 and not m.internal order by m.at, m.id`;

/* Horario del equipo (Configuración › Soporte). */
export async function horario() {
  const v = await valores("soporte_dias", "soporte_desde_h", "soporte_hasta_h");
  return { dias: v.soporte_dias, desde: v.soporte_desde_h, hasta: v.soporte_hasta_h };
}
/* «hoy antes de las 4 PM» / «el lunes antes de las 11 AM», desde el plazo y la hora de la ciudad. */
export function prometido(due: string, tz: string, es: boolean): string {
  const d = new Date(due), dia = (x: Date) => x.toLocaleDateString("en-CA", { timeZone: tz });
  const h = d.toLocaleTimeString(es ? "es-US" : "en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).replace(/:00/, "").replace(/\s?a\.\s?m\./i, " AM").replace(/\s?p\.\s?m\./i, " PM");
  const hoy = new Date(), man = new Date(Date.now() + 86_400_000);
  if (dia(d) === dia(hoy)) return es ? `hoy antes de las ${h}` : `today before ${h}`;
  if (dia(d) === dia(man)) return es ? `mañana antes de las ${h}` : `tomorrow before ${h}`;
  const wd = d.toLocaleDateString(es ? "es-US" : "en-US", { timeZone: tz, weekday: "long" });
  return es ? `el ${wd} antes de las ${h}` : `on ${wd} before ${h}`;
}

/* El dispositivo y la versión (contexto automático para el equipo). Solo un resumen, nunca la cadena entera. */
async function dispositivo(): Promise<{ device: string; version: string }> {
  const h = await headers(), ua = h.get("user-agent") ?? "";
  const so = /iPhone|iPad/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "Otro";
  const nav = /Edg\//.test(ua) ? "Edge" : /CriOS|Chrome\//.test(ua) ? "Chrome" : /FxiOS|Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Navegador";
  const app = (h.get("x-tl-app") ?? "").replace(/[^A-Za-z0-9 ._-]/g, "").slice(0, 40);
  return { device: `${so} · ${nav}`, version: app || "web" };
}

/* Las operaciones de la persona para «¿CUÁL?» (las del negocio, si es desde el panel: ninguna; el dueño habla de su negocio). */
const KIND_L: Record<string, Bi> = {
  order: { es: "Pedido", en: "Order" }, market_order: { es: "Pedido del mercado", en: "Market order" }, hold: { es: "Apartado", en: "Hold" },
  appointment: { es: "Cita", en: "Appointment" }, table: { es: "Reservación", en: "Reservation" }, party: { es: "Fiesta", en: "Party" }, trip: { es: "Viaje", en: "Trip" },
  night: { es: "Noche", en: "Night out" }, enrollment: { es: "Inscripción", en: "Enrollment" }, visit: { es: "Visita", en: "Visit" }, tickets: { es: "Boletos", en: "Tickets" },
  private_event: { es: "Evento privado", en: "Private event" }, quote: { es: "Cotización", en: "Quote" }, rental: { es: "Renta", en: "Rental" }, plan: { es: "Plan", en: "Plan" },
};
const KINDS: Record<string, string[]> = {
  pedido: ["order", "market_order", "hold"],
  cita: ["appointment", "table", "party", "trip", "night", "enrollment", "visit", "private_event", "quote", "rental"],
};
export type OpSop = { num: string; t: Bi; s: string; tema: Tema[] };
const opLabel = (k: string, num: string, biz: string): Bi => ({ es: `${KIND_L[k]?.es ?? "Operación"} ${num.startsWith("#") || /^\d/.test(num) ? "#" : ""}${num} · ${biz}`, en: `${KIND_L[k]?.en ?? "Operation"} ${/^\d/.test(num) ? "#" : ""}${num} · ${biz}` });
async function operaciones(userId: string): Promise<OpSop[]> {
  const L = (await db().query<{ num: string; k: string; biz: string; total: number; pagado: boolean; at: string }>(
    `select o.number as num, o.kind as k, b.name as biz, o.total_cents as total,
            exists (select 1 from payments p where p.operation_id = o.id and p.status in ('captured', 'partially_refunded', 'refunded', 'held')) as pagado,
            ${ISO("coalesce(o.scheduled_at, o.sent_at)")} as at
       from operations o join businesses b on b.id = o.business_id
      where o.user_id = $1 and o.sent_at > now() - interval '90 days' and o.kind <> 'plan'
      order by o.sent_at desc limit 12`, [userId])).rows;
  return L.map((x) => {
    const tema: Tema[] = [];
    if (KINDS.pedido!.includes(x.k)) tema.push("pedido");
    if (KINDS.cita!.includes(x.k)) tema.push("cita");
    if (x.pagado) tema.push("pago");
    return { num: x.num, t: opLabel(x.k, x.num, x.biz), s: x.total ? `$${(x.total / 100).toFixed(2)}` : "", tema };
  });
}

/* ── Pantalla (APP-SOPORTE) ── */
export type CasoFila = { num: string; tema: Tema; estado: EstadoVecino; titulo: string; ultimo: { quien: "yo" | "equipo" | "sistema"; nombre: string | null; t: string; foto: boolean; at: string }; unidoA: string | null };
function estadoVecino(st: string, asignado: boolean): EstadoVecino {
  return st === "merged" ? "unido" : st === "resolved" ? "res" : st === "waiting" ? "espera" : st === "in_progress" || (st === "reopened" && asignado) ? "curso" : "nuevo";
}
export async function misCasos(q: Quien): Promise<CasoFila[]> {
  const n = q.negocio && NEG.test(q.negocio) ? q.negocio : null;
  const L = (await db().query<{ num: string; topic: Tema; status: string; asignado: boolean; titulo: string | null; usender: string | null; ubody: string | null; ufoto: boolean; uat: string | null; ustaff: string | null; umio: boolean; unido: string | null; at: string }>(
    `select c.number as num, c.topic, c.status, c.assigned_staff_id is not null as asignado,
            (select left(m.body, 120) from support_messages m where m.case_id = c.id and m.sender = 'user' and not m.internal and m.hidden_at is null order by m.at, m.id limit 1) as titulo,
            u.sender as usender, case when u.hidden_at is null then left(u.body, 120) end as ubody, u.photo_media_id is not null as ufoto, ${ISO("u.at")} as uat, us.first_name as ustaff, coalesce(u.user_id = $1, false) as umio,
            (select x.number from support_cases x where x.id = c.merged_into_id) as unido, ${ISO("c.created_at")} as at
       from support_cases c
       left join lateral (select m.* from support_messages m where m.case_id = c.id and not m.internal and m.sender <> 'system' order by m.at desc, m.id desc limit 1) u on true
       left join users us on us.id = u.staff_id
      where ${VISIBLE("$1", "$2")}
      order by (c.status in ('resolved', 'merged')), c.updated_at desc limit 50`, [q.userId, n])).rows;
  return L.map((x) => ({
    num: x.num, tema: x.topic, estado: estadoVecino(x.status, x.asignado), titulo: x.titulo ?? "", unidoA: x.unido,
    ultimo: { quien: x.usender === "staff" ? "equipo" : x.usender === "user" ? (x.umio ? "yo" : "equipo") : "sistema", nombre: x.ustaff, t: x.ubody ?? "", foto: x.ufoto, at: x.uat ?? x.at },
  }));
}
export async function casosAbiertos(userId: string): Promise<number> {
  return (await db().query<{ n: number }>(`select count(*)::int as n from support_cases where user_id = $1 and business_id is null and status not in ('resolved', 'merged')`, [userId])).rows[0]?.n ?? 0;
}

export type MsjVecino = { id: string; sender: "user" | "staff" | "system"; body: string | null; oculto: boolean; foto: string | null; sys_key: string | null; vars: Record<string, string> | null; at: string; equipo: string | null; mio: boolean };
export type CasoVecino = {
  num: string; tema: Tema; estado: EstadoVecino; status: string; titulo: string; ref: Bi | null; quienVe: string | null; resueltoPor: "user" | "staff" | null;
  csat: "yes" | "no" | null; puedeReabrir: boolean; unidoA: string | null; enlazado: string | null; msjs: MsjVecino[]; negocio: { id: string; name: string } | null; propio: boolean;
  cuando: Bi; opNum: string | null;
};
export async function casoVecino(q: Quien, numero: string): Promise<CasoVecino | null> {
  if (!NUM_TK.test(numero)) return null;
  const n = q.negocio && NEG.test(q.negocio) ? q.negocio : null;
  const c = (await db().query<{ id: string; num: string; topic: Tema; status: string; asignado: string | null; resolved_by: "user" | "staff" | null; csat: "yes" | "no" | null; reabrir: boolean;
    unido: string | null; enlazado: string | null; opk: string | null; opnum: string | null; opbiz: string | null; bid: string | null; bname: string | null; propio: boolean; due: string; tz: string }>(
    `select c.id::text, c.number as num, c.topic, c.status, a.first_name as asignado, c.resolved_by, c.csat,
            c.status = 'resolved' and c.resolved_at > now() - make_interval(days => cfg_int('soporte_reabrir_dias')) as reabrir,
            (select x.number from support_cases x where x.id = c.merged_into_id) as unido, (select x.number from support_cases x where x.id = c.linked_case_id) as enlazado,
            o.kind as opk, o.number as opnum, ob.name as opbiz, b.id as bid, b.name as bname, c.user_id = $2 as propio, ${ISO("c.sla_due_at")} as due,
            (select coalesce(ci.timezone, 'America/New_York') from cities ci where ci.id = c.city_id) as tz
       from support_cases c left join users a on a.id = c.assigned_staff_id left join operations o on o.id = c.operation_id left join businesses ob on ob.id = o.business_id
       left join businesses b on b.id = c.business_id
      where c.number = $1 and ${VISIBLE("$2", "$3")}`, [numero, q.userId, n])).rows[0];
  if (!c) return null;
  const M = (await db().query<MsjVecino>(HILO_VECINO_SQL, [c.id, q.userId])).rows;
  return {
    num: c.num, tema: c.topic, estado: estadoVecino(c.status, !!c.asignado), status: c.status, titulo: M.find((m) => m.sender === "user" && m.body)?.body?.slice(0, 120) ?? "",
    ref: c.opk && c.opnum && c.opbiz ? opLabel(c.opk, c.opnum, c.opbiz) : null, quienVe: c.asignado, resueltoPor: c.resolved_by, csat: c.csat, puedeReabrir: c.reabrir,
    unidoA: c.unido, enlazado: c.enlazado, msjs: M, negocio: c.bid ? { id: c.bid, name: c.bname ?? "" } : null, propio: c.propio,
    cuando: { es: prometido(c.due, c.tz, true), en: prometido(c.due, c.tz, false) }, opNum: c.opnum,
  };
}

/* Lo que la pantalla necesita para empezar: casos, operaciones para «¿CUÁL?», ayudas que To'Latino está revisando y el horario. */
export async function datosSoporte(q: Quien) {
  const n = q.negocio && NEG.test(q.negocio) ? q.negocio : null;
  const [casos, ops, revs, h] = await Promise.all([
    misCasos(q),
    n ? Promise.resolve([] as OpSop[]) : operaciones(q.userId),
    n ? Promise.resolve([]) : db().query<{ hnum: string; num: string; k: string; biz: string }>(
      `select h.number as hnum, o.number as num, o.kind as k, b.name as biz from help_requests h join operations o on o.id = h.operation_id join businesses b on b.id = h.business_id
        where h.user_id = $1 and h.status = 'escalated' order by h.escalated_at desc limit 5`, [q.userId])
      .then((r) => r.rows.map((x) => ({ hnum: x.hnum, num: x.num, t: opLabel(x.k, x.num, x.biz), href: x.k === "order" ? `/pedido/${x.num}/ayuda` : hrefAyuda(x.num) }))),
    horario(),
  ]);
  return { casos, ops, revs, horario: h };
}

/* ── Abrir un caso ── */
export type AbrirIn = { tema: string; operacion?: string | null; texto: string; foto?: string | null; enlazado?: string | null; clave?: string | null };
type Origen = "form" | "panel" | "compa";
const ALTA = /(entr[oó]|entraron|metieron)\s+(a|en)\s+mi\s+cuenta|hacke|me\s+robaron\s+(la|mi)\s+cuenta|no\s+fui\s+yo|me\s+amenaz|me\s+est[aá]\s+acosando|someone\s+(got|logged|broke)\s+into|hacked|not\s+me|threat/i;
export async function abrirCaso(q: Quien, x: AbrirIn, o: { origen?: Origen; resumen?: string | null; compaConversacion?: number | null; prioridad?: "alta" | null } = {}): Promise<ResS> {
  const origen: Origen = o.origen ?? (q.negocio ? "panel" : "form");
  const n = q.negocio ? (NEG.test(q.negocio) ? q.negocio : "") : null;
  if (n === "") return no("Ese negocio no existe.", "That business does not exist.");
  const tema = String(x?.tema ?? "") as Tema;
  const permitidos: Tema[] = n ? TEMAS_NEGOCIO : origen === "compa" ? [...TEMAS_VECINO, "seguridad"] : TEMAS_VECINO;
  if (!permitidos.includes(tema)) return no("Elige sobre qué es.", "Pick what it is about.");
  const crudo = limpio(x?.texto, 800);
  if (crudo.replace(/\s+/g, "").length < 10) return no("Cuéntanos un poco más (10 letras o más).", "Tell us a bit more (10 characters or more).");
  const t = tapar(crudo);
  const resumen = o.resumen ? tapar(limpio(o.resumen, 500)).texto : null;
  const foto = x?.foto && UUID.test(String(x.foto)) ? String(x.foto) : null;
  const clave = x?.clave && UUID.test(String(x.clave)) ? String(x.clave) : null;
  const alta = o.prioridad === "alta" || tema === "seguridad" || ALTA.test(crudo);
  const disp = await dispositivo().catch(() => ({ device: "", version: "web" }));
  let r: ResS & { id?: string } = no("Prueba de nuevo.", "Try again.");
  try {
    r = await tx(async (c): Promise<ResS & { id?: string }> => {
      await c.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [`soporte:${q.userId}`]);
      if (clave) {
        const ya = (await c.query<{ number: string }>(`select number from support_cases where user_id = $1 and client_key = $2`, [q.userId, clave])).rows[0];
        if (ya) return { ok: true, numero: ya.number };
      }
      let ciudad = (await c.query<{ city: string }>(`select coalesce(home_city_id, 'hzl') as city from users where id = $1`, [q.userId])).rows[0]?.city ?? "hzl";
      if (n) {
        const m = (await c.query<{ owner: boolean; pay: boolean; city: string }>(
          `select bm.kind = 'owner' or 'all' = any(bm.panel_access) as owner, bm.kind = 'owner' or bm.panel_access && array['all', 'pay']::text[] as pay, b.city_id as city
             from business_members bm join businesses b on b.id = bm.business_id where bm.business_id = $1 and bm.user_id = $2 and bm.status = 'active' and b.status <> 'merged' limit 1`, [n, q.userId])).rows[0];
        if (!m) return no("Ese negocio no existe.", "That business does not exist.");
        if (tema === "pago" && !m.pay) return no("Lo de cobros lo ve quien tiene Cobros en el panel.", "Payouts are for whoever has Payouts in the dashboard.");
        ciudad = m.city;
      }
      let op: string | null = null;
      if (x?.operacion && !n && CON_OPERACION.includes(tema)) {
        op = (await c.query<{ id: string }>(`select id::text from operations where number = $1 and user_id = $2`, [String(x.operacion).slice(0, 20), q.userId])).rows[0]?.id ?? null;
        if (!op) return no("Elige una de la lista.", "Pick one from the list.");
      }
      let enl: string | null = null;
      if (x?.enlazado) {
        enl = (await c.query<{ id: string }>(`select c.id::text from support_cases c where c.number = $1 and ${VISIBLE("$2", "$3")}`, [String(x.enlazado).slice(0, 20), q.userId, n])).rows[0]?.id ?? null;
        if (!enl) return no("Ese caso no existe.", "That case does not exist.");
      }
      if (!alta) {
        const hoy = (await c.query<{ n: number }>(`select count(*)::int as n from support_cases where user_id = $1 and created_at > now() - interval '1 day'`, [q.userId])).rows[0]!.n;
        if (hoy >= (await valores("soporte_casos_dia_max")).soporte_casos_dia_max) return no("Abriste muchos casos hoy. Escribe en uno de los que ya tienes o prueba mañana.", "You opened many cases today. Write in one you already have or try tomorrow.");
      }
      const k = (await c.query<{ id: string; number: string; due: string; tz: string }>(
        `insert into support_cases (number, user_id, business_id, city_id, topic, operation_id, origin, compa_conversation_id, summary, priority, linked_case_id, device, app_version, client_key)
         values ('TK-' || nextval('support_case_seq'), $1, $2, $3, $4, $5::bigint, $6, $7, $8, $9, $10::bigint, $11, $12, $13)
         returning id::text, number, ${ISO("sla_due_at")} as due, (select coalesce(timezone, 'America/New_York') from cities where id = $3) as tz`,
        [q.userId, n, ciudad, tema, op, origen, o.compaConversacion ?? null, resumen, alta ? "alta" : "normal", enl, disp.device.slice(0, 120), disp.version.slice(0, 40), clave])).rows[0]!;
      let mid: string | null = null;
      if (foto) {
        // Foto PRIVADA de la persona (subida por /api/ayuda/foto): pasa a ser del caso. Una pública no entra.
        const u = await c.query(`update media set owner_kind = 'support', owner_id = $1 where id = $2::uuid and uploaded_by = $3 and owner_kind = 'user' and status = 'visible' and private`, [k.id, foto, q.userId]);
        if (!u.rowCount) throw new FotoPerdida();
        mid = foto;
      }
      await c.query(`insert into support_messages (case_id, city_id, sender, user_id, body, photo_media_id) values ($1, $2, 'user', $3, $4, $5::uuid)`, [k.id, ciudad, q.userId, t.texto, mid]);
      const cuando = { es: prometido(k.due, k.tz, true), en: prometido(k.due, k.tz, false) };
      await c.query(`insert into support_messages (case_id, city_id, sender, sys_key, vars) values ($1, $2, 'system', 'recibido', $3)`, [k.id, ciudad, JSON.stringify({ num: k.number, es: cuando.es, en: cuando.en })]);
      return { ok: true, numero: k.number, id: k.id, mensaje: t.tapado ? { es: "Tapamos un dato que no se comparte aquí. Nunca te lo pedimos.", en: "We covered a detail that is not shared here. We never ask for it." } : undefined };
    });
  } catch (e) {
    if (e instanceof FotoPerdida) return no("La foto ya no está. Súbela otra vez.", "The photo is gone. Upload it again.");
    if (/support_sin_secretos/.test(String((e as Error)?.message))) return no("No escribas números de tarjeta ni de seguro social. Nunca te los pedimos.", "Do not write card or social security numbers. We never ask for them.");
    throw e;
  }
  if (r.ok && r.id) await avisarCaso(r.numero!, "sop_recibido");
  return r.ok ? { ok: true, numero: r.numero, mensaje: r.mensaje } : r;
}
class FotoPerdida extends Error {}

/* 7c / 7d · El Compa pasa a una persona: el mismo caso de siempre, con origen 'compa', la referencia de su conversación y el resumen
   («Desde El Compa: …», tapado). No es dinero: abrir un caso no mueve nada. Lo llamará lib/compa/persona.ts (pasarAPersona). */
export async function abrirCasoDesdeCompa(x: { userId: string; conversacion: number; tema: Tema; texto: string; resumen: string; operacion?: string | null; negocio?: string | null; prioridad?: "alta" | null }): Promise<ResS> {
  if (!Number.isSafeInteger(x.conversacion) || x.conversacion <= 0) return no("Prueba de nuevo.", "Try again.");
  return abrirCaso({ userId: x.userId, negocio: x.negocio ?? null }, { tema: x.tema, texto: x.texto, operacion: x.operacion ?? null, clave: null },
    { origen: x.negocio ? "panel" : "compa", resumen: `Desde El Compa: ${x.resumen}`, compaConversacion: x.conversacion, prioridad: x.prioridad ?? null });
}

/* ── En el caso ── */
async function miCaso(c: import("pg").PoolClient, q: Quien, numero: string) {
  if (!NUM_TK.test(numero)) return null;
  const n = q.negocio && NEG.test(q.negocio) ? q.negocio : null;
  return (await c.query<{ id: string; status: string; city_id: string; number: string }>(
    `select c.id::text, c.status, c.city_id, c.number from support_cases c where c.number = $1 and ${VISIBLE("$2", "$3")} for update of c`, [numero, q.userId, n])).rows[0] ?? null;
}
export async function escribirCaso(q: Quien, numero: string, texto: string, foto?: string | null): Promise<ResS> {
  const crudo = limpio(texto, 800), f = foto && UUID.test(String(foto)) ? String(foto) : null;
  if (!crudo && !f) return no("Escribe tu mensaje.", "Write your message.");
  const t = tapar(crudo);
  try {
    return await tx(async (c): Promise<ResS> => {
      const k = await miCaso(c, q, numero);
      if (!k) return no("Ese caso no existe.", "That case does not exist.");
      if (k.status === "merged") return no("Este caso se unió a otro. Escribe ahí.", "This case was merged into another. Write there.");
      if (k.status === "resolved") return no("Este caso está resuelto. Si necesitas algo más, abre otro caso.", "This case is resolved. If you need anything else, open another case.");
      const h = (await c.query<{ n: number }>(`select count(*)::int as n from support_messages where user_id = $1 and sender = 'user' and at > now() - interval '1 hour'`, [q.userId])).rows[0]!.n;
      if (h >= 30) return no("Escribiste muchos mensajes seguidos. Espera un rato: el equipo ya los tiene.", "You wrote many messages in a row. Wait a bit: the team has them.");
      if (f) {
        const u = await c.query(`update media set owner_kind = 'support', owner_id = $1 where id = $2::uuid and uploaded_by = $3 and owner_kind = 'user' and status = 'visible' and private`, [k.id, f, q.userId]);
        if (!u.rowCount) throw new FotoPerdida();
      }
      await c.query(`insert into support_messages (case_id, city_id, sender, user_id, body, photo_media_id) values ($1, $2, 'user', $3, $4, $5::uuid)`, [k.id, k.city_id, q.userId, t.texto || null, f]);
      // Le respondieron y la persona contesta: vuelve al equipo (la base abre la cola con plazo nuevo).
      if (k.status === "waiting") await c.query(`update support_cases set status = 'in_progress' where id = $1`, [k.id]);
      else await c.query(`update support_cases set updated_at = now() where id = $1`, [k.id]);
      return { ok: true, numero: k.number, mensaje: t.tapado ? { es: "Tapamos un dato que no se comparte aquí. Nunca te lo pedimos.", en: "We covered a detail that is not shared here. We never ask for it." } : undefined };
    });
  } catch (e) {
    if (e instanceof FotoPerdida) return no("La foto ya no está. Súbela otra vez.", "The photo is gone. Upload it again.");
    if (/support_sin_secretos/.test(String((e as Error)?.message))) return no("No escribas números de tarjeta ni de seguro social. Nunca te los pedimos.", "Do not write card or social security numbers. We never ask for them.");
    throw e;
  }
}
/* «Ya se resolvió»: la persona lo cierra. */
export async function resolverPorVecino(q: Quien, numero: string): Promise<ResS> {
  return tx(async (c): Promise<ResS> => {
    const k = await miCaso(c, q, numero);
    if (!k) return no("Ese caso no existe.", "That case does not exist.");
    if (k.status === "resolved" || k.status === "merged") return no("Este caso ya se cerró.", "This case is already closed.");
    await c.query(`update support_cases set status = 'resolved', resolved_by = 'user', resolved_at = now() where id = $1`, [k.id]);
    await c.query(`insert into support_messages (case_id, city_id, sender, sys_key) values ($1, $2, 'system', 'resuelto_usuario')`, [k.id, k.city_id]);
    return { ok: true, numero: k.number };
  });
}
/* «¿Se resolvió?» Sí / No (hueco #4). No, dentro de soporte_reabrir_dias: vuelve a la cola (reabierto). Después: abre otro caso enlazado. */
export async function calificarCaso(q: Quien, numero: string, si: boolean): Promise<ResS & { reabierto?: boolean }> {
  return tx(async (c) => {
    const k = await miCaso(c, q, numero);
    if (!k) return no("Ese caso no existe.", "That case does not exist.");
    const x = (await c.query<{ csat: string | null; reabrir: boolean }>(
      `select csat, status = 'resolved' and resolved_at > now() - make_interval(days => cfg_int('soporte_reabrir_dias')) as reabrir from support_cases where id = $1`, [k.id])).rows[0]!;
    if (k.status !== "resolved") return no("Este caso sigue abierto.", "This case is still open.");
    if (x.csat) return no("Ya nos lo dijiste. Gracias.", "You already told us. Thanks.");
    if (si || !x.reabrir) {
      await c.query(`update support_cases set csat = $2, csat_at = now() where id = $1`, [k.id, si ? "yes" : "no"]);
      return { ok: true, numero: k.number, reabierto: false };
    }
    await c.query(`update support_cases set status = 'reopened', resolved_by = null, resolved_at = null, csat = null, csat_at = null where id = $1`, [k.id]);
    await c.query(`insert into support_messages (case_id, city_id, sender, sys_key, vars) values ($1, $2, 'system', 'reabierto_usuario', '{"csat":"no"}')`, [k.id, k.city_id]);
    return { ok: true, numero: k.number, reabierto: true };
  });
}

/* Avisos del caso (en la app; sin SMS): recibido, respuesta del equipo y resuelto. */
export async function avisarCaso(numero: string, tpl: "sop_recibido" | "sop_respuesta" | "sop_resuelto", quien?: string) {
  const { avisar } = await import("./avisos");
  const k = (await db().query<{ uid: string; due: string; tz: string; lang: string; neg: string | null }>(
    `select c.user_id::text as uid, ${ISO("c.sla_due_at")} as due, coalesce(ci.timezone, 'America/New_York') as tz, coalesce(u.lang, 'es') as lang, c.business_id as neg
       from support_cases c join users u on u.id = c.user_id left join cities ci on ci.id = c.city_id where c.number = $1`, [numero])).rows[0];
  if (!k) return;
  const href = `/soporte?caso=${encodeURIComponent(numero)}${k.neg ? `&negocio=${encodeURIComponent(k.neg)}` : ""}`;
  if (tpl === "sop_recibido") await avisar(k.uid, tpl, { num: numero, cuando: prometido(k.due, k.tz, k.lang !== "en") }, { href, ref: ["support", numero] });
  else if (tpl === "sop_respuesta") await avisar(k.uid, tpl, { num: numero, quien: quien || "Una persona" }, { href, ref: ["support", numero] });
  else await avisar(k.uid, tpl, { num: numero }, { href, ref: ["support", numero] });
}

/* La línea del horario («lunes a viernes, de 9 AM a 6 PM») para pantallas del servidor. */
export async function lineaHorario(es: boolean) { return horarioEquipo(await horario(), es); }
export const temaL = (t: Tema, es: boolean) => (es ? TEMAS[t].corto.es : TEMAS[t].corto.en);
