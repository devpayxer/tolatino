import "server-only";
import { registroDelCaso, type RegistroEquipo } from "./reportar";
import type { PoolClient } from "pg";
import { auditar, type Staff } from "./admin";
import { tapar } from "./compa/tapar";
import { db, tx } from "./db";
import { telefonoBonito } from "./panel";
import { NUM_TK, avisarCaso, horario, prometido } from "./soporte";
import { TEMAS, type Tema } from "./soporte-comun";

/* 7b · Super Admin › Soporte (diseño Super Admin.dc.html secSop + la ficha `ticket` de Colas; fase7-compa.md §4 7b). Lo que el equipo ve y
   hace con un caso. Permisos (matriz role_permissions, sección «sop»): ver = sop:ver · responder, notas, tomar, resolver, unir, reabrir,
   ligar, escalar = sop:editar · macros y ocultar un mensaje = sop:aprobar · «Resolver y devolver» = sop:editar (con el tope de su rol) o
   tx:aprobar (Finanzas, Admin: hasta lo cobrado). EL TOPE LO DECIDE LA BASE al insertar en support_refunds (soporte_tope_devolver(rol) con
   el valor de Configuración de ese momento); aquí solo se dice. Ciudades: un miembro con ciudades solo ve casos de esas ciudades.
   Este es el ÚNICO archivo que lee las notas internas (guardián notaInternaNoSale). Toda escritura deja su AuditEntry en la misma
   transacción; los mensajes del equipo también pasan por tapar(). */
type Bi = { es: string; en: string };
export type ResE = { ok: true; mensaje?: string; numero?: string } | { ok: false; mensaje: string };
const no = (mensaje: string): ResE => ({ ok: false, mensaje });
const ISO = (x: string) => `to_char((${x}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const limpio = (t: unknown, max: number) => String(t ?? "").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, max);
export const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const CIUDAD = (p: string) => `(cardinality(${p}::text[]) = 0 or c.city_id = any(${p}::text[]))`;
const puedeVer = (s: Staff) => s.puede("sop", "ver");
const puedeEditar = (s: Staff) => s.puede("sop", "ver") && s.puede("sop", "editar");
const puedeDevolverRol = (s: Staff) => s.puede("sop", "ver") && (s.puede("sop", "editar") || s.puede("tx", "aprobar"));

/* ── Lista (Abiertos · Míos · Escalados · Resueltos) ── */
export type TabSop = "open" | "mine" | "esc" | "res";
export type FilaSop = {
  num: string; tema: Tema; status: string; priority: string; escalado: string | null; quien: string; negocio: string | null; titulo: string;
  at: string; due: string; equipo: boolean; vencido: boolean; asignado: string | null; mio: boolean; r: number;
};
export async function listaSoporte(s: Staff, f: { tab: TabSop; q?: string; alta?: boolean; venc?: boolean; tema?: Tema | null; antes?: string | null }) {
  if (!puedeVer(s)) return { filas: [] as FilaSop[], sig: null as string | null };
  const q = limpio(f.q, 60), cur = f.antes && /^\d{1,18}$/.test(f.antes) ? f.antes : null;
  const L = (await db().query<FilaSop & { id: string }>(
    `select c.id::text, c.number as num, c.topic as tema, c.status, c.priority, c.escalated_to as escalado,
            coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), ''), 'Vecino') as quien, b.name as negocio,
            coalesce((select left(m.body, 100) from support_messages m where m.case_id = c.id and m.sender = 'user' and m.hidden_at is null order by m.at, m.id limit 1), '') as titulo,
            ${ISO("c.created_at")} as at, ${ISO("c.sla_due_at")} as due, soporte_toca_equipo(c.status) as equipo,
            soporte_toca_equipo(c.status) and c.sla_due_at < now() as vencido, a.first_name as asignado, coalesce(c.assigned_staff_id = $2, false) as mio,
            case when soporte_toca_equipo(c.status) then extract(epoch from now() - coalesce(q.opened_at, c.created_at)) / greatest(extract(epoch from c.sla_due_at - coalesce(q.opened_at, c.created_at)), 60) else 0 end::float8 as r
       from support_cases c join users u on u.id = c.user_id left join users a on a.id = c.assigned_staff_id left join businesses b on b.id = c.business_id
       left join queue_items q on q.queue = 'ticket' and q.subject_kind = 'support_case' and q.subject_id = c.id::text and q.status = 'open'
      where ${CIUDAD("$1")}
        and case $3 when 'res' then c.status in ('resolved', 'merged') when 'mine' then c.status not in ('resolved', 'merged') and c.assigned_staff_id = $2
                    when 'esc' then c.status not in ('resolved', 'merged') and c.escalated_to is not null else c.status not in ('resolved', 'merged') end
        and ($4::boolean is not true or c.priority = 'alta') and ($5::boolean is not true or (soporte_toca_equipo(c.status) and c.sla_due_at < now()))
        and ($6::text is null or c.topic = $6) and ($7::bigint is null or c.id < $7::bigint)
        and ($8 = '' or c.number = upper($8) or u.first_name ilike $8 || '%' or u.last_name ilike $8 || '%' or b.name ilike '%' || $8 || '%')
      order by case when $3 = 'res' then 0 else (c.priority = 'alta')::int end desc, case when $3 = 'res' then 0 else soporte_toca_equipo(c.status)::int end desc,
               case when $3 = 'res' then null else c.sla_due_at end, c.id desc
      limit 61`, [s.cities, s.id, f.tab, !!f.alta, !!f.venc, f.tema && TEMAS[f.tema] ? f.tema : null, cur, q])).rows;
  return { filas: L.slice(0, 60), sig: f.tab === "res" && L.length > 60 ? L[59]!.id : null };
}
export async function kpisSoporte(s: Staff) {
  const r = (await db().query<{ abiertos: number; vencidos: number; mios: number; equipo: number; esc: number; mediana: number | null; resueltos: number; si: number; no: number }>(
    `select count(*) filter (where c.status not in ('resolved', 'merged'))::int as abiertos,
            count(*) filter (where soporte_toca_equipo(c.status) and c.sla_due_at < now())::int as vencidos,
            count(*) filter (where c.status not in ('resolved', 'merged') and c.assigned_staff_id = $2)::int as mios,
            count(*) filter (where soporte_toca_equipo(c.status))::int as equipo,
            count(*) filter (where c.status not in ('resolved', 'merged') and c.escalated_to is not null)::int as esc,
            (percentile_cont(0.5) within group (order by extract(epoch from c.first_reply_at - c.created_at)) filter (where c.created_at > now() - interval '7 days' and c.first_reply_at is not null))::float8 as mediana,
            count(*) filter (where c.status = 'resolved' and c.resolved_at > now() - interval '7 days')::int as resueltos,
            count(*) filter (where c.csat = 'yes' and c.csat_at > now() - interval '30 days')::int as si,
            count(*) filter (where c.csat = 'no' and c.csat_at > now() - interval '30 days')::int as no
       from support_cases c where ${CIUDAD("$1")} and (c.status not in ('resolved', 'merged') or c.resolved_at > now() - interval '30 days' or c.csat_at > now() - interval '30 days')`,
    [s.cities, s.id])).rows[0]!;
  // 7i · El plazo de 30 días (soporte_analitica_dia, sin personas): primera respuesta dentro del plazo de horas hábiles, vencidos, desde El Compa.
  const p = (await db().query<{ con: number; cumplido: number; vencido: number; casos: number; compa: number }>(
    `select coalesce(sum(con_respuesta), 0)::int as con, coalesce(sum(plazo_cumplido), 0)::int as cumplido, coalesce(sum(plazo_vencido), 0)::int as vencido,
            coalesce(sum(casos), 0)::int as casos, coalesce(sum(desde_compa), 0)::int as compa
       from soporte_analitica_dia where dia >= (now() at time zone 'America/New_York')::date - 29 and (cardinality($1::text[]) = 0 or city_id = any($1::text[]))`, [s.cities])).rows[0]!;
  return { ...r, plazo30: p };
}

/* ── La ficha ── */
export type MsjEquipo = { id: string; sender: "user" | "staff" | "system"; body: string | null; oculto: boolean; motivoOculto: string | null; foto: string | null; internal: boolean; sys_key: string | null; vars: Record<string, string> | null; at: string; quien: string | null; macro: string | null };
export type CasoEquipo = {
  id: string; num: string; tema: Tema; status: string; priority: string; origin: string; escalado: string | null; at: string; due: string; equipo: boolean; vencido: boolean;
  ciudad: string;   // 7g · la ciudad del caso (los interruptores del copiloto por ciudad)
  asignado: { id: string; nombre: string } | null; mio: boolean; primeraRespuesta: string | null; resuelto: { por: string | null; at: string | null }; csat: string | null;
  persona: { id: string; nombre: string; tel: string; ciudad: string | null; lang: string; desde: string; casos: number; estado: string };
  negocio: { id: string; name: string } | null; device: string | null; version: string | null; summary: string | null;
  op: { num: string; kind: string; status: string; total: number; biz: string } | null; ayuda: { num: string; status: string; opnum: string } | null;
  pago: { id: string; status: string; amount: number; devuelto: number; tarjeta: string | null } | null;
  tope: number | null; devueltoCaso: number; puedeDevolver: boolean; devoluciones: { monto: number; quien: string | null; rol: string | null; status: string; at: string }[];
  unidoA: string | null; unidos: string[]; enlazado: string | null; msjs: MsjEquipo[]; historial: { quien: string | null; action: string; before: unknown; after: unknown; reason: string | null; at: string }[];
  macros: Macro[]; horas: number;
  registro: RegistroEquipo;   // 8f · «Reportar un problema»: el registro técnico y de dónde salió la captura (support_case_logs)
};
export type Macro = { key: string; title: Bi; body: Bi; topic: Tema | null; on: boolean; at: string; quien: string | null };

export async function casoEquipo(s: Staff, numero: string): Promise<CasoEquipo | null> {
  if (!puedeVer(s) || !NUM_TK.test(numero)) return null;
  const c = (await db().query<Omit<CasoEquipo, "persona" | "op" | "ayuda" | "pago" | "msjs" | "historial" | "macros" | "tope" | "devoluciones" | "unidos" | "puedeDevolver" | "horas" | "asignado"> & {
    aid: string | null; anom: string | null; uid: string; unom: string; utel: string; uciudad: string | null; ulang: string; udesde: string; ucasos: number; uest: string;
    opnum: string | null; opk: string | null; opst: string | null; optot: number | null; opbiz: string | null; hnum: string | null; hst: string | null; hop: string | null; bid: string | null; bname: string | null }>(
    `select c.id::text, c.number as num, c.topic as tema, c.status, c.priority, c.origin, c.escalated_to as escalado, ${ISO("c.created_at")} as at, ${ISO("c.sla_due_at")} as due, c.city_id as ciudad,
            soporte_toca_equipo(c.status) as equipo, soporte_toca_equipo(c.status) and c.sla_due_at < now() as vencido, c.assigned_staff_id::text as aid, a.first_name as anom,
            coalesce(c.assigned_staff_id = $3, false) as mio, ${ISO("c.first_reply_at")} as "primeraRespuesta", jsonb_build_object('por', c.resolved_by, 'at', ${ISO("c.resolved_at")}) as resuelto, c.csat,
            u.id::text as uid, coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), ''), 'Vecino') as unom, u.phone as utel, ci.name as uciudad,
            coalesce(u.lang, 'es') as ulang, ${ISO("u.created_at")} as udesde, (select count(*)::int from support_cases x where x.user_id = u.id) as ucasos, u.status as uest,
            o.number as opnum, o.kind as opk, o.status as opst, o.total_cents as optot, ob.name as opbiz,
            h.number as hnum, h.status as hst, ho.number as hop, b.id as bid, b.name as bname, c.device, c.app_version as version, c.summary,
            (select x.number from support_cases x where x.id = c.merged_into_id) as "unidoA", (select x.number from support_cases x where x.id = c.linked_case_id) as enlazado
       from support_cases c join users u on u.id = c.user_id left join cities ci on ci.id = u.home_city_id left join users a on a.id = c.assigned_staff_id
       left join operations o on o.id = c.operation_id left join businesses ob on ob.id = o.business_id
       left join help_requests h on h.id = c.help_request_id left join operations ho on ho.id = h.operation_id
       left join businesses b on b.id = c.business_id
      where c.number = $1 and ${CIUDAD("$2")}`, [numero, s.cities, s.id])).rows[0];
  if (!c) return null;
  const [M, P, R, H, mac, U, tope, hs] = await Promise.all([
    db().query<MsjEquipo>(
      `select m.id::text, m.sender, case when m.purged_at is not null then '(Se borró: la cuenta se cerró hace más de 30 días.)' else m.body end as body, m.hidden_at is not null as oculto, m.hidden_reason as "motivoOculto",
              case when m.photo_media_id is not null then '/api/ayuda/foto/' || m.photo_media_id::text end as foto, m.internal, m.sys_key, m.vars, ${ISO("m.at")} as at,
              coalesce(st.first_name, us.first_name) as quien, m.macro_key as macro
         from support_messages m left join users st on st.id = m.staff_id left join users us on us.id = m.user_id where m.case_id = $1 order by m.at, m.id`, [c.id]),
    db().query<{ id: string; status: string; amount: number; devuelto: number; brand: string | null; l4: string | null }>(
      `select p.id::text, p.status, p.amount_cents as amount,
              p.refunded_cents + coalesce((select sum(r.amount_cents) from refunds r where r.payment_id = p.id and r.status = 'pending'), 0)::int as devuelto, p.card_brand as brand, p.card_last4 as l4
         from support_cases c join payments p on p.operation_id = c.operation_id and p.user_id = c.user_id
        where c.id = $1 and p.status in ('captured', 'partially_refunded', 'refunded') order by (p.status <> 'refunded') desc, p.id desc limit 1`, [c.id]),
    db().query<{ monto: number; quien: string | null; rol: string | null; status: string; at: string }>(
      `select r.amount_cents as monto, u.first_name as quien, r.staff_role as rol, r.status, ${ISO("r.created_at")} as at from support_refunds r left join users u on u.id = r.staff_id where r.case_id = $1 order by r.id`, [c.id]),
    db().query<{ quien: string | null; action: string; before: unknown; after: unknown; reason: string | null; at: string }>(
      `select u.first_name as quien, a.action, a.before, a.after, a.reason, ${ISO("a.at")} as at from audit_entries a left join users u on u.id::text = a.actor_id
        where a.target_kind = 'support_case' and a.target_id = $1 order by a.at desc limit 20`, [c.num]),
    listaMacros(s, true),
    db().query<{ num: string }>(`select number as num from support_cases where merged_into_id = $1 order by id`, [c.id]),
    db().query<{ t: number | null }>(`select soporte_tope_devolver($1) as t`, [s.role]),
    db().query<{ h: number }>(`select cfg_int('soporte_sla_h') as h`),
  ]);
  const registro = c.origin === "reporte_app" ? await registroDelCaso(c.id) : null;
  const p = P.rows[0];
  const devueltoCaso = R.rows.filter((x) => x.status !== "failed").reduce((a, x) => a + x.monto, 0);
  // null = sin tope del rol (hasta lo cobrado); 0 = su rol no devuelve. Nunca se confunden.
  const t = tope.rows.length ? tope.rows[0]!.t : 0;
  return {
    id: c.id, num: c.num, tema: c.tema, status: c.status, priority: c.priority, origin: c.origin, escalado: c.escalado, at: c.at, due: c.due, equipo: c.equipo, vencido: c.vencido, ciudad: c.ciudad,
    asignado: c.aid ? { id: c.aid, nombre: c.anom ?? "Equipo" } : null, mio: c.mio, primeraRespuesta: c.primeraRespuesta, resuelto: c.resuelto, csat: c.csat,
    persona: { id: c.uid, nombre: c.unom, tel: telefonoBonito(c.utel), ciudad: c.uciudad, lang: c.ulang, desde: c.udesde, casos: c.ucasos, estado: c.uest },
    negocio: c.bid ? { id: c.bid, name: c.bname ?? "" } : null, device: c.device, version: c.version, summary: c.summary,
    op: c.opnum ? { num: c.opnum, kind: c.opk ?? "", status: c.opst ?? "", total: c.optot ?? 0, biz: c.opbiz ?? "" } : null,
    ayuda: c.hnum ? { num: c.hnum, status: c.hst ?? "", opnum: c.hop ?? "" } : null,
    pago: p ? { id: p.id, status: p.status, amount: p.amount, devuelto: p.devuelto, tarjeta: p.brand && p.l4 ? `${p.brand.toUpperCase()} ·· ${p.l4}` : null } : null,
    tope: t, devueltoCaso, puedeDevolver: puedeDevolverRol(s) && t !== 0, devoluciones: R.rows,
    unidoA: c.unidoA, unidos: U.rows.map((x) => x.num), enlazado: c.enlazado, msjs: M.rows, historial: H.rows, macros: mac, horas: hs.rows[0]?.h ?? 8, registro,
  };
}

/* Los casos de una persona o de un negocio (Usuarios 360° y Negocios 360° › Soporte). */
export async function casosDe(s: Staff, x: { userId?: string; negocio?: string }) {
  if (!puedeVer(s)) return [];
  return (await db().query<{ num: string; tema: Tema; status: string; priority: string; at: string; titulo: string }>(
    `select c.number as num, c.topic as tema, c.status, c.priority, ${ISO("c.created_at")} as at,
            coalesce((select left(m.body, 80) from support_messages m where m.case_id = c.id and m.sender = 'user' and m.hidden_at is null order by m.at, m.id limit 1), '') as titulo
       from support_cases c where ${CIUDAD("$1")} and ($2::uuid is null or c.user_id = $2::uuid) and ($3::text is null or c.business_id = $3) and ($2::uuid is not null or $3::text is not null)
      order by c.id desc limit 30`, [s.cities, x.userId ?? null, x.negocio ?? null])).rows;
}

/* ── Acciones (todas: permiso → caso de su ciudad → cambio → auditoría, en una transacción) ── */
type Fila = { id: string; number: string; status: string; city_id: string; user_id: string; business_id: string | null; assigned_staff_id: string | null; operation_id: string | null; priority: string; first: string | null };
async function abrir(c: PoolClient, s: Staff, numero: string): Promise<Fila | string> {
  if (!NUM_TK.test(String(numero))) return "Ese caso no existe.";
  const k = (await c.query<Fila>(
    `select c.id::text, c.number, c.status, c.city_id, c.user_id::text, c.business_id, c.assigned_staff_id::text, c.operation_id::text, c.priority, u.first_name as first
       from support_cases c join users u on u.id = c.user_id where c.number = $1 and ${CIUDAD("$2")} for update of c`, [numero, s.cities])).rows[0];
  return k ?? "Ese caso no existe.";
}
const cerrado = (k: Fila) => (k.status === "merged" ? "Este caso se unió a otro." : k.status === "resolved" ? "Este caso ya está resuelto. Reábrelo si hace falta." : null);
const audit = (c: PoolClient, s: Staff, k: Fila, action: string, before: unknown, after: unknown, reason?: string | null) =>
  auditar(c, { actor: s.id, action, targetKind: "support_case", targetId: k.number, city: k.city_id, before, after, reason: reason ?? null });
const EST: Record<string, string> = { new: "nuevo", in_progress: "en curso", waiting: "esperando a la persona", resolved: "resuelto", reopened: "reabierto", merged: "unido" };

export async function tomar(s: Staff, numero: string): Promise<ResE> {
  if (!puedeEditar(s)) return no("Tu rol solo puede ver Soporte.");
  return tx(async (c) => {
    const k = await abrir(c, s, numero);
    if (typeof k === "string") return no(k);
    if (cerrado(k)) return no(cerrado(k)!);
    if (k.assigned_staff_id === s.id) return { ok: true, mensaje: "Ya es tuyo." };
    const antes = k.assigned_staff_id ? (await c.query<{ n: string }>(`select first_name as n from users where id = $1`, [k.assigned_staff_id])).rows[0]?.n ?? "otra persona" : null;
    await c.query(`update support_cases set assigned_staff_id = $2, status = case when status in ('new', 'reopened') then 'in_progress' else status end where id = $1`, [k.id, s.id]);
    await audit(c, s, k, "soporte.tomar", { asignado: antes }, { asignado: s.first_name });
    return { ok: true, mensaje: "Lo tomaste. La persona ve que lo están viendo.", numero: k.number };
  });
}
/* «Tomar siguiente»: el primero sin asignar que le toca al equipo (prioridad alta, luego el plazo más cercano). */
export async function tomarSiguienteSop(s: Staff): Promise<ResE> {
  if (!puedeEditar(s)) return no("Tu rol solo puede ver Soporte.");
  const n = (await db().query<{ num: string }>(
    `select c.number as num from support_cases c where soporte_toca_equipo(c.status) and c.assigned_staff_id is null and ${CIUDAD("$1")}
      order by (c.priority = 'alta') desc, c.sla_due_at limit 1`, [s.cities])).rows[0]?.num;
  if (!n) return no("No hay casos sin asignar.");
  const r = await tomar(s, n);
  return r.ok ? { ok: true, numero: n, mensaje: r.mensaje } : r;
}

/* Responder a la persona (con una macro, si se eligió). La persona recibe el aviso; el caso pasa a «te respondieron».
   7g · Si el texto salió de un borrador del copiloto (`borrador` = su id, de ESTE caso, de ESTA persona del equipo, sin usar y de hoy), el mensaje
   queda from_draft y el borrador anota, una vez, si salió tal cual o editado. Un id que no cuadra no cambia nada: el mensaje sale igual, sin marca.
   El que envía es siempre la persona del equipo, con este botón: el copiloto nunca llega aquí. */
export async function responder(s: Staff, numero: string, texto: string, macro?: string | null, borrador?: string | null): Promise<ResE> {
  if (!puedeEditar(s)) return no("Tu rol solo puede ver Soporte.");
  const crudo = limpio(texto, 2000);
  if (crudo.length < 2) return no("Escribe la respuesta.");
  const r = await tx(async (c): Promise<ResE> => {
    const k = await abrir(c, s, numero);
    if (typeof k === "string") return no(k);
    if (cerrado(k)) return no(cerrado(k)!);
    let mk: string | null = null;
    if (macro) {
      mk = (await c.query<{ key: string }>(`select key from support_macros where key = $1 and status = 'on'`, [String(macro).slice(0, 40)])).rows[0]?.key ?? null;
      if (!mk) return no("Esa macro ya no está. Escribe la respuesta.");
    }
    const t = tapar(crudo.replace(/\{nombre\}|\{name\}/g, k.first ?? "")).texto;
    const bd = borrador && UUID.test(String(borrador)) ? (await c.query<{ id: string; draft: string }>(
      `select id::text, draft from compa_drafts where id = $1::uuid and case_id = $2::bigint and staff_id = $3 and used is null and at > now() - interval '1 day' for update`, [borrador, k.id, s.id])).rows[0] : undefined;
    const m = (await c.query<{ id: string }>(`insert into support_messages (case_id, city_id, sender, staff_id, body, macro_key, from_draft) values ($1, $2, 'staff', $3, $4, $5, $6) returning id::text`,
      [k.id, k.city_id, s.id, t, mk, !!bd])).rows[0]!;
    if (bd) await c.query(`update compa_drafts set used = $2, message_id = $3::bigint where id = $1::uuid`, [bd.id, t.replace(/\s+/g, " ").trim() === bd.draft.replace(/\s+/g, " ").trim() ? "sent_as_is" : "edited", m.id]);
    await c.query(`update support_cases set status = 'waiting', first_reply_at = coalesce(first_reply_at, now()), assigned_staff_id = coalesce(assigned_staff_id, $2) where id = $1`, [k.id, s.id]);
    await audit(c, s, k, "soporte.responder", { estado: EST[k.status] }, { estado: EST.waiting, ...(mk ? { macro: mk } : {}), ...(bd ? { borrador: "de El Compa" } : {}) });
    return { ok: true, mensaje: "Enviado. La persona lo ve en su caso.", numero: k.number };
  });
  if (r.ok) await avisarCaso(r.numero!, "sop_respuesta", s.first_name ?? "");
  return r;
}
/* Nota interna: solo el equipo la ve (internal = true; nunca sale por HILO_VECINO_SQL). */
export async function notaInterna(s: Staff, numero: string, texto: string): Promise<ResE> {
  if (!puedeEditar(s)) return no("Tu rol solo puede ver Soporte.");
  const t = limpio(texto, 2000);
  if (t.length < 2) return no("Escribe la nota.");
  return tx(async (c) => {
    const k = await abrir(c, s, numero);
    if (typeof k === "string") return no(k);
    await c.query(`insert into support_messages (case_id, city_id, sender, staff_id, body, internal) values ($1, $2, 'staff', $3, $4, true)`, [k.id, k.city_id, s.id, tapar(t).texto]);
    await audit(c, s, k, "soporte.nota", null, { nota: "interna" });
    return { ok: true, mensaje: "Nota guardada. Solo la ve el equipo." };
  });
}
/* Resolver (con un mensaje para la persona, si se escribe). */
export async function resolver(s: Staff, numero: string, texto: string): Promise<ResE> {
  if (!puedeEditar(s)) return no("Tu rol solo puede ver Soporte.");
  const crudo = limpio(texto, 2000);
  if (crudo.length < 5) return no("Escribe cómo se resolvió (lo lee la persona).");
  const r = await tx(async (c): Promise<ResE> => {
    const k = await abrir(c, s, numero);
    if (typeof k === "string") return no(k);
    if (cerrado(k)) return no(cerrado(k)!);
    await c.query(`insert into support_messages (case_id, city_id, sender, staff_id, body) values ($1, $2, 'staff', $3, $4)`, [k.id, k.city_id, s.id, tapar(crudo).texto]);
    await c.query(`insert into support_messages (case_id, city_id, sender, sys_key) values ($1, $2, 'system', 'resuelto_equipo')`, [k.id, k.city_id]);
    await c.query(`update support_cases set status = 'resolved', resolved_by = 'staff', resolved_at = now(), first_reply_at = coalesce(first_reply_at, now()), assigned_staff_id = coalesce(assigned_staff_id, $2) where id = $1`, [k.id, s.id]);
    await audit(c, s, k, "soporte.resolver", { estado: EST[k.status] }, { estado: EST.resolved }, crudo.slice(0, 300));
    return { ok: true, mensaje: "Resuelto. La persona lo ve y puede decir si se resolvió.", numero: k.number };
  });
  if (r.ok) await avisarCaso(r.numero!, "sop_resuelto");
  return r;
}

/* «Resolver y devolver»: devuelve a la tarjeta lo pagado en la app por la operación del caso, por devolverPago (la misma de siempre) con la
   llave del intento (tk-{clave}: tocar dos veces = una devolución). La base pone el tope del rol al insertar la fila pendiente; si se pasa,
   no se llama a Stripe. Solo quien insertó la fila llama a devolverPago; otro toque con la misma llave espera el resultado. */
export async function resolverYDevolver(s: Staff, numero: string, monto: string, clave: string, texto: string): Promise<ResE> {
  if (!puedeDevolverRol(s)) return no("Tu rol no devuelve dinero.");
  if (!UUID.test(String(clave ?? ""))) return no("Prueba de nuevo.");
  const crudo = limpio(texto, 2000);
  if (crudo.length < 5) return no("Escribe la respuesta para la persona.");
  const cents = Math.round((parseFloat(String(monto ?? "").replace(/[^0-9.]/g, "")) || 0) * 100);
  const idem = `tk-${clave}`;
  let fila = (await db().query<{ id: string; status: string; amount: number; pid: string; fail: string | null; viejo: boolean }>(
    `select r.id::text, r.status, r.amount_cents as amount, r.payment_id::text as pid, r.fail_reason as fail, r.created_at < now() - interval '30 seconds' as viejo
       from support_refunds r join support_cases c on c.id = r.case_id where r.idem_key = $1 and c.number = $2 and r.staff_id = $3`, [idem, numero, s.id])).rows[0];
  if (fila?.status === "done") return { ok: true, mensaje: "Ya se devolvió." };
  if (fila?.status === "failed") return no(fila.fail ?? "No se pudo devolver.");
  if (fila && !fila.viejo) return no("La devolución ya está en camino. Actualiza en un momento.");
  if (!fila) {
    if (!(cents > 0)) return no("Escribe el monto en dólares.");
    const ins = await tx(async (c): Promise<string | { id: string; pid: string; amount: number; nueva: boolean }> => {
      const k = await abrir(c, s, numero);
      if (typeof k === "string") return k;
      if (cerrado(k)) return cerrado(k)!;
      const p = (await c.query<{ id: string }>(
        `select p.id::text from payments p where p.operation_id = $1::bigint and p.user_id = $2::uuid and p.status in ('captured', 'partially_refunded') order by p.id desc limit 1`, [k.operation_id, k.user_id])).rows[0];
      if (!k.operation_id || !p) return "Ahí no hay nada pagado con tarjeta en la app para devolver. Liga el caso a la operación primero.";
      try {
        await c.query("savepoint dev");
        const r = (await c.query<{ id: string }>(
          `insert into support_refunds (case_id, payment_id, idem_key, amount_cents, staff_id) values ($1, $2, $3, $4, $5) on conflict (idem_key) do nothing returning id::text`, [k.id, p.id, idem, cents, s.id])).rows[0];
        return r ? { id: r.id, pid: p.id, amount: cents, nueva: true } : "La devolución ya está en camino. Actualiza en un momento.";
      } catch (e) {
        await c.query("rollback to savepoint dev");
        const m = String((e as Error)?.message ?? "");
        if (/devolucion_sobre_tope/.test(m)) {
          const t = (await c.query<{ t: number | null }>(`select soporte_tope_devolver($1) as t`, [s.role])).rows[0]?.t ?? 0;
          const ya = (await c.query<{ n: number }>(`select coalesce(sum(amount_cents), 0)::int as n from support_refunds where case_id = $1 and status in ('pending', 'done')`, [k.id])).rows[0]!.n;
          return `Tu rol devuelve hasta ${money(t)} por caso${ya ? ` (ya se devolvieron ${money(ya)})` : ""}. Pásalo a Finanzas o a un Admin.`;
        }
        if (/devolucion_sin_rol/.test(m)) return "Tu rol no devuelve dinero.";
        if (/devolucion_sin_cobro|devolucion_otro_cobro/.test(m)) return "Ahí no hay nada cobrado para devolver.";
        if (/devolucion_caso_cerrado/.test(m)) return "Este caso ya se cerró.";
        throw e;
      }
    });
    if (typeof ins === "string") return no(ins);
    fila = { id: ins.id, status: "pending", amount: ins.amount, pid: ins.pid, fail: null, viejo: false };
  }
  const { devolverPago } = await import("./cobros");
  const d = await devolverPago({ paymentId: fila.pid, centavos: fila.amount, por: "admin", actorId: s.id, motivo: crudo.slice(0, 300), idem });
  if (!d.ok) {
    await db().query(`update support_refunds set status = 'failed', fail_reason = $2, done_at = now() where id = $1::bigint and status = 'pending'`, [fila.id, d.msg.es.slice(0, 200)]);
    return no(d.msg.es);
  }
  const r = await tx(async (c): Promise<ResE> => {
    const u = (await c.query(`update support_refunds set status = 'done', done_at = now() where id = $1::bigint and status = 'pending'`, [fila!.id])).rowCount;
    if (!u) return { ok: true, mensaje: "Ya se devolvió." };
    const k = await abrir(c, s, numero);
    if (typeof k === "string") return no(k);
    await c.query(`insert into support_messages (case_id, city_id, sender, staff_id, body) values ($1, $2, 'staff', $3, $4)`, [k.id, k.city_id, s.id, tapar(crudo).texto]);
    await c.query(`insert into support_messages (case_id, city_id, sender, sys_key, vars) values ($1, $2, 'system', 'devuelto', $3)`, [k.id, k.city_id, JSON.stringify({ monto: money(fila!.amount) })]);
    await c.query(`update support_cases set refunded_cents = refunded_cents + $2, status = 'resolved', resolved_by = 'staff', resolved_at = now(), first_reply_at = coalesce(first_reply_at, now()),
                    assigned_staff_id = coalesce(assigned_staff_id, $3) where id = $1 and status not in ('resolved', 'merged')`, [k.id, fila!.amount, s.id]);
    await audit(c, s, k, "soporte.devolver", { estado: EST[k.status] }, { estado: EST.resolved, devuelto: money(fila!.amount) }, crudo.slice(0, 300));
    return { ok: true, mensaje: `Resuelto y devueltos ${money(fila!.amount)} a su tarjeta.`, numero: k.number };
  });
  if (r.ok && r.numero) await avisarCaso(r.numero, "sop_resuelto");
  return r;
}

/* Pasar a Finanzas (o a un Admin): sube la prioridad, queda sin asignar y lo ve la pestaña «Escalados». Nota interna con el motivo. */
export async function pasarAFinanzas(s: Staff, numero: string, a: string, motivo: string): Promise<ResE> {
  if (!puedeEditar(s)) return no("Tu rol solo puede ver Soporte.");
  if (a !== "finanzas" && a !== "admin") return no("Elige a quién se pasa.");
  const m = limpio(motivo, 300);
  if (m.length < 3) return no("Escribe el motivo.");
  return tx(async (c) => {
    const k = await abrir(c, s, numero);
    if (typeof k === "string") return no(k);
    if (cerrado(k)) return no(cerrado(k)!);
    await c.query(`update support_cases set escalated_to = $2, priority = 'alta', assigned_staff_id = null where id = $1`, [k.id, a]);
    await c.query(`insert into support_messages (case_id, city_id, sender, sys_key, vars, internal) values ($1, $2, 'system', 'escalado', $3, true)`, [k.id, k.city_id, JSON.stringify({ a, motivo: m, quien: s.first_name ?? "" })]);
    await audit(c, s, k, "soporte.escalar", { prioridad: k.priority === "alta" ? "alta" : "normal" }, { pasado_a: a === "finanzas" ? "Finanzas" : "Admin", prioridad: "alta" }, m);
    return { ok: true, mensaje: `Pasado a ${a === "finanzas" ? "Finanzas" : "un Admin"}. Sale primero en Escalados.` };
  });
}
/* Unir un duplicado a otro caso de la MISMA persona (y el mismo negocio). El duplicado queda «unido» con un enlace; nada se borra. */
export async function unir(s: Staff, numero: string, destino: string, motivo: string): Promise<ResE> {
  if (!puedeEditar(s)) return no("Tu rol solo puede ver Soporte.");
  const m = limpio(motivo, 300), dst = limpio(destino, 20).toUpperCase();
  if (m.length < 3) return no("Escribe el motivo.");
  if (!NUM_TK.test(dst) || dst === numero) return no("Escribe el número del otro caso (TK-…).");
  return tx(async (c) => {
    // Los dos con candado, siempre en el mismo orden (nunca se cruzan).
    const [a, b] = [numero, dst].sort();
    const ka = await abrir(c, s, a!), kb = await abrir(c, s, b!);
    if (typeof ka === "string" || typeof kb === "string") return no("Ese caso no existe.");
    const k = ka.number === numero ? ka : kb, d = ka.number === numero ? kb : ka;
    if (k.status === "merged" || d.status === "merged") return no("Uno de los dos ya está unido a otro.");
    if (k.user_id !== d.user_id || k.business_id !== d.business_id) return no("Solo se unen casos de la misma persona (y del mismo negocio).");
    await c.query(`update support_cases set status = 'merged', merged_into_id = $2 where id = $1`, [k.id, d.id]);
    await c.query(`insert into support_messages (case_id, city_id, sender, sys_key, vars) values ($1, $2, 'system', 'unido', $3)`, [k.id, k.city_id, JSON.stringify({ num: d.number })]);
    await c.query(`insert into support_messages (case_id, city_id, sender, sys_key, vars) values ($1, $2, 'system', 'unido_desde', $3)`, [d.id, d.city_id, JSON.stringify({ num: k.number })]);
    await audit(c, s, k, "soporte.unir", { estado: EST[k.status] }, { estado: "unido", con: d.number }, m);
    return { ok: true, mensaje: `Unido a ${d.number}. La persona sigue en ese caso.`, numero: d.number };
  });
}
/* Reabrir un caso resuelto (vuelve a la cola con plazo nuevo). */
export async function reabrir(s: Staff, numero: string, motivo: string): Promise<ResE> {
  if (!puedeEditar(s)) return no("Tu rol solo puede ver Soporte.");
  const m = limpio(motivo, 300);
  if (m.length < 3) return no("Escribe el motivo.");
  return tx(async (c) => {
    const k = await abrir(c, s, numero);
    if (typeof k === "string") return no(k);
    if (k.status !== "resolved") return no("Solo se reabre un caso resuelto.");
    await c.query(`update support_cases set status = 'reopened', resolved_by = null, resolved_at = null, csat = null, csat_at = null, assigned_staff_id = $2 where id = $1`, [k.id, s.id]);
    await c.query(`insert into support_messages (case_id, city_id, sender, sys_key) values ($1, $2, 'system', 'reabierto')`, [k.id, k.city_id]);
    await audit(c, s, k, "soporte.reabrir", { estado: EST.resolved }, { estado: EST.reopened }, m);
    return { ok: true, mensaje: "Reabierto. Volvió a la cola." };
  });
}
/* Ligar el caso a una operación (#1234, C-…, B-…) o a una «Ayuda con …» (H-…) de la misma persona (o del mismo negocio). */
export async function ligar(s: Staff, numero: string, ref: string, motivo: string): Promise<ResE> {
  if (!puedeEditar(s)) return no("Tu rol solo puede ver Soporte.");
  const r = limpio(ref, 24).replace(/^#/, "").toUpperCase(), m = limpio(motivo, 300);
  if (!/^([A-Z]{1,3}-)?\d{1,12}$/.test(r)) return no("Escribe el número del pedido, la cita o la ayuda (por ejemplo 1234, C-5678 o H-90).");
  if (m.length < 3) return no("Escribe el motivo.");
  return tx(async (c) => {
    const k = await abrir(c, s, numero);
    if (typeof k === "string") return no(k);
    if (k.status === "merged") return no("Este caso se unió a otro.");
    if (r.startsWith("H-")) {
      const h = (await c.query<{ id: string; op: string }>(`select id::text, operation_id::text as op from help_requests where number = $1 and user_id = $2::uuid`, [r, k.user_id])).rows[0];
      if (!h) return no("Esa ayuda no es de esta persona.");
      await c.query(`update support_cases set help_request_id = $2, operation_id = coalesce(operation_id, $3::bigint) where id = $1`, [k.id, h.id, h.op]);
    } else {
      const o = (await c.query<{ id: string }>(`select id::text from operations where number = $1 and (user_id = $2::uuid or ($3::text is not null and business_id = $3))`, [r, k.user_id, k.business_id])).rows[0];
      if (!o) return no(k.business_id ? "Esa operación no es de esta persona ni de su negocio." : "Esa operación no es de esta persona.");
      await c.query(`update support_cases set operation_id = $2 where id = $1`, [k.id, o.id]);
    }
    await c.query(`insert into support_messages (case_id, city_id, sender, sys_key, vars, internal) values ($1, $2, 'system', 'ligado', $3, true)`, [k.id, k.city_id, JSON.stringify({ ref: r, quien: s.first_name ?? "" })]);
    await audit(c, s, k, "soporte.ligar", null, { ligado_a: r }, m);
    return { ok: true, mensaje: `Ligado a ${r}.` };
  });
}
/* Ocultar el texto de un mensaje (datos que no debían quedar): queda «Mensaje oculto por el equipo» y el motivo en la auditoría. */
export async function ocultarMensaje(s: Staff, numero: string, id: string, motivo: string): Promise<ResE> {
  if (!s.puede("sop", "aprobar")) return no("Solo quien aprueba en Soporte oculta un mensaje.");
  const m = limpio(motivo, 300);
  if (m.length < 3) return no("Escribe el motivo.");
  if (!/^\d{1,18}$/.test(String(id))) return no("Ese mensaje no existe.");
  return tx(async (c) => {
    const k = await abrir(c, s, numero);
    if (typeof k === "string") return no(k);
    const u = await c.query(`update support_messages set hidden_at = now(), hidden_reason = $3, hidden_by = $4 where id = $1::bigint and case_id = $2 and hidden_at is null and sender <> 'system'`, [id, k.id, m, s.id]);
    if (!u.rowCount) return no("Ese mensaje ya está oculto.");
    await audit(c, s, k, "soporte.ocultar", null, { mensaje: "oculto" }, m);
    return { ok: true, mensaje: "Oculto. La persona ve que el equipo lo ocultó." };
  });
}

/* ── Macros ── */
export async function listaMacros(s: Staff, soloOn = false): Promise<Macro[]> {
  if (!puedeVer(s)) return [];
  return (await db().query<Macro>(
    `select m.key, m.title, m.body, m.topic, m.status = 'on' as on, ${ISO("m.updated_at")} as at, u.first_name as quien
       from support_macros m left join users u on u.id = coalesce(m.updated_by, m.created_by) where ($1::boolean is not true or m.status = 'on') order by m.status, m.sort, m.key`, [soloOn])).rows;
}
const SIN_HTML = /<[A-Za-z!/?]|<\s*\/|javascript:|on\w+\s*=/i;
const LLAVES_MALAS = /\{(?!nombre\}|name\})/;
export async function guardarMacro(s: Staff, x: { key?: string | null; tituloEs: string; tituloEn: string; textoEs: string; textoEn: string; tema?: string | null }, motivo: string): Promise<ResE> {
  if (!s.puede("sop", "aprobar")) return no("Solo quien aprueba en Soporte cambia las macros.");
  const t = { es: limpio(x?.tituloEs, 60), en: limpio(x?.tituloEn, 60) }, b = { es: limpio(x?.textoEs, 1000), en: limpio(x?.textoEn, 1000) }, m = limpio(motivo, 300);
  if (t.es.length < 2 || t.en.length < 2) return no("Escribe el título en español y en inglés.");
  if (b.es.length < 10 || b.en.length < 10) return no("Escribe el texto en español y en inglés (10 letras o más).");
  if ([t.es, t.en, b.es, b.en].some((v) => SIN_HTML.test(v))) return no("Las macros son texto: sin etiquetas ni código.");
  if ([b.es, b.en].some((v) => LLAVES_MALAS.test(v))) return no("La única llave que se cambia sola es {nombre} ({name} en inglés).");
  if (m.length < 3) return no("Escribe el motivo.");
  const tema = x?.tema && TEMAS[x.tema as Tema] ? x.tema : null;
  const key = x?.key ? limpio(x.key, 40) : t.es.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 34) || "macro";
  return tx(async (c) => {
    const antes = (await c.query<{ title: Bi; body: Bi }>(`select title, body from support_macros where key = $1 for update`, [key])).rows[0];
    if (x?.key && !antes) return no("Esa macro no existe.");
    const k = x?.key ? key : (await c.query<{ k: string }>(`select $1 || case when exists (select 1 from support_macros where key = $1) then '-' || (select count(*) + 1 from support_macros where key like $1 || '%') else '' end as k`, [key])).rows[0]!.k;
    await c.query(`insert into support_macros (key, title, body, topic, created_by, updated_by) values ($1, $2, $3, $4, $5, $5)
                   on conflict (key) do update set title = excluded.title, body = excluded.body, topic = excluded.topic, updated_by = excluded.updated_by, updated_at = now()`,
      [k, JSON.stringify(t), JSON.stringify(b), tema, s.id]);
    await auditar(c, { actor: s.id, action: "soporte.macro", targetKind: "support_macro", targetId: k, before: antes ? { titulo: antes.title.es, texto: antes.body.es.slice(0, 80) } : null, after: { titulo: t.es, texto: b.es.slice(0, 80) }, reason: m });
    return { ok: true, mensaje: antes ? "Macro guardada." : "Macro creada." };
  });
}
export async function estadoMacro(s: Staff, key: string, on: boolean, motivo: string): Promise<ResE> {
  if (!s.puede("sop", "aprobar")) return no("Solo quien aprueba en Soporte cambia las macros.");
  const m = limpio(motivo, 300);
  if (m.length < 3) return no("Escribe el motivo.");
  return tx(async (c) => {
    const u = await c.query(`update support_macros set status = $2, updated_by = $3, updated_at = now() where key = $1 and status <> $2`, [limpio(key, 40), on ? "on" : "off", s.id]);
    if (!u.rowCount) return no("Esa macro ya estaba así.");
    await auditar(c, { actor: s.id, action: "soporte.macro", targetKind: "support_macro", targetId: limpio(key, 40), before: { estado: on ? "apagada" : "encendida" }, after: { estado: on ? "encendida" : "apagada" }, reason: m });
    return { ok: true, mensaje: on ? "Encendida." : "Apagada. Ya no sale al responder." };
  });
}

/* ── Barrido: un caso que pasó su plazo sin respuesta sube a prioridad alta (sale primero) y se avisa a quien lo tiene; una vez por plazo. ── */
export async function barrerSoporte(): Promise<number> {
  const L = (await db().query<{ num: string; staff: string | null; city: string }>(
    `update support_cases c set priority = 'alta'
      where soporte_toca_equipo(c.status) and c.sla_due_at < now() and c.priority = 'normal'
      returning c.number as num, c.assigned_staff_id::text as staff, c.city_id as city`)).rows;
  if (!L.length) return 0;
  const { avisar } = await import("./avisos");
  const h = (await db().query<{ h: number }>(`select cfg_int('soporte_sla_h') as h`)).rows[0]?.h ?? 8;
  for (const x of L) if (x.staff) await avisar(x.staff, "sop_vencido", { num: x.num, horas: h }, { href: `/admin/soporte?caso=${x.num}`, ref: ["support", x.num] });
  return L.length;
}

/* Lo que dice la ficha del plazo («vence hoy antes de las 4:30 PM»). */
export async function plazoDicho(due: string, ciudad: string | null) {
  const tz = (await db().query<{ tz: string }>(`select coalesce((select timezone from cities where id = $1), 'America/New_York') as tz`, [ciudad])).rows[0]!.tz;
  return prometido(due, tz, true);
}
export { horario };
