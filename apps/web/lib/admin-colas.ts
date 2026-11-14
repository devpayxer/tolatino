import "server-only";
import { hoyEn } from "./fecha-local";
import { FOTO_AYUDA_SQL } from "./ayuda-cita";
const MOTIVO_CHAT: Record<string, string> = { spam: "Spam o publicidad", off: "Ofensivo o amenaza", pii: "Pide datos o dinero", otro: "Otra cosa", compa: "Una respuesta de El Compa" };
export const MOTIVO_DM: Record<string, string> = { acoso: "Acoso o amenazas", spam: "Spam o ventas", priv: "Pide o comparte datos privados", otro: "Otra cosa" };
import type { Staff } from "./admin";
import { INCIDENTE_SQL, UMBRAL_NOCHE } from "./noche-vigilar";
import { AYUDA_DE, COLAS, MOTIVO_RESENA, colasDelRol, espera, slaCase, type Cola } from "./colas";
import { cfgSql, valor } from "./config";
import { APELABLE, MOTIVO_REP, REGLA_L, type Apelable } from "./moderacion-comun";
import { db } from "./db";
import { MOTIVO, evidenciaDe } from "./disputas";
import { telefonoBonito } from "./panel";
import { TEMAS, type Tema } from "./soporte-comun";

/* ADM-COLAS: lo que espera una decisión. El servidor decide qué ve cada persona: las colas de su rol (lib/colas.ts),
   la matriz (colas:ver) y sus ciudades (staff_members.cities; vacío = todas). La más vieja contra su plazo va primero. */
export function colasVisibles(s: Staff): Cola[] {
  return s.puede("colas", "ver") ? colasDelRol(s.role) : [];
}
export const SLA_SQL = slaCase(cfgSql);
/* El plazo de cada cola en horas (con lo de Configuración), para lo que se dice en pantalla. */
export async function slasColas(): Promise<Record<Cola, number>> {
  const v = await valor("evt_revision_h");
  return Object.fromEntries(Object.entries(COLAS).map(([k, x]) => [k, x.slaCfg ? v : x.sla])) as Record<Cola, number>;
}

export type CasoLista = {
  id: string; queue: Cola; title: string; sub: string; who: { name: string; image?: string; initials?: string } | null;
  assignee: string | null; mine: boolean; esp: ReturnType<typeof espera>; priority: string; tk?: string;
};

export async function listaCasos(s: Staff, f: { cola?: Cola | null; mios?: boolean; sinAsignar?: boolean; vencidos?: boolean }) {
  const vis = colasVisibles(s);
  const colas = f.cola && vis.includes(f.cola) ? [f.cola] : vis;
  if (!colas.length) return { casos: [] as CasoLista[], conteo: {} as Record<string, number>, vencidos: 0, total: 0 };
  const r = await db().query<{
    id: string; queue: Cola; opened_at: string; priority: string; assigned_to: string | null; assignee: string | null;
    bname: string | null; cover: string | null; rname: string | null; rcat: string | null; mnote: string | null; mreason: string | null; nrep: number; ltitle: string | null;
    subject_kind: string; sctype: string | null; sname: string | null; rpreason: string | null; rpn: number; rpbiz: boolean; chreason: string | null; chn: number; chbiz: boolean; dpnum: string | null; sopk: string | null; sopr: string | null; dpamt: number | null; dpreason: string | null; dpdue: string | null;
    lst: string | null; lnext: string | null; vjn: number; vjf: string | null; vji: string | null;
    ctext: string | null; cn: number; creason: string | null; cflag: string | null; uname: string | null; apel: string | null; mkind: string | null; evt: string | null; sla_h: number;
    tk: string | null;
  }>(
    `select q.id::text, q.queue, q.opened_at, q.priority, q.assigned_to, u.first_name as assignee, q.subject_kind, sc.type as sctype,
            coalesce(nullif(trim(coalesce(su.first_name, '') || ' ' || coalesce(su.last_name, '')), ''), su.phone) as sname,
            b.name as bname,
            (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1) as cover,
            rc.business_name as rname, c.name->>'es' as rcat,
            (select pr.note from photo_reports pr where q.queue = 'medios' and pr.media_id::text = q.subject_id and pr.status = 'open' order by pr.created_at limit 1) as mnote,
            (select pr.reason from photo_reports pr where q.queue = 'medios' and pr.media_id::text = q.subject_id and pr.status = 'open' order by pr.created_at limit 1) as mreason,
            (select count(*)::int from photo_reports pr where q.queue = 'medios' and pr.media_id::text = q.subject_id and pr.status = 'open') as nrep,
            (select (coalesce(nullif(l.title, '{}'::jsonb), k.title)->>'es') || coalesce(' · ' || m.display_name, '') from licenses l join license_kinds k on k.key = l.kind left join business_members m on m.id = l.member_id where q.queue = 'lic' and l.id::text = q.subject_id) as ltitle,
            (select cr.reason from content_reports cr where q.queue = 'rep' and cr.target_kind = 'review' and cr.target_id = q.subject_id and cr.status = 'open' order by cr.by_business desc, cr.created_at limit 1) as rpreason,
            (select count(*)::int from content_reports cr where q.queue = 'rep' and cr.target_kind = 'review' and cr.target_id = q.subject_id and cr.status = 'open') as rpn,
            coalesce((select bool_or(cr.by_business) from content_reports cr where q.queue = 'rep' and cr.target_kind = 'review' and cr.target_id = q.subject_id and cr.status = 'open'), false) as rpbiz,
            (select cr.reason from content_reports cr where q.queue = 'chat' and cr.target_kind = (case q.subject_kind when 'dm_thread' then 'dm' else 'chat' end) and cr.target_id = q.subject_id and cr.status = 'open' order by cr.created_at limit 1) as chreason,
            (select count(*)::int from content_reports cr where q.queue = 'chat' and cr.target_kind = (case q.subject_kind when 'dm_thread' then 'dm' else 'chat' end) and cr.target_id = q.subject_id and cr.status = 'open') as chn,
            coalesce((select bool_or(cr.by_business) from content_reports cr where q.queue = 'chat' and cr.target_kind = 'chat' and cr.target_id = q.subject_id and cr.status = 'open'), false) as chbiz,
            (select o.number from disputes d join operations o on o.id = d.operation_id where q.queue = 'disputa' and d.id::text = q.subject_id) as dpnum,
            (select o.kind from help_requests h join operations o on o.id = h.operation_id where q.queue in ('sop', 'cuidado', 'salir', 'estafa') and h.id::text = q.subject_id) as sopk,
            (select h.reason from help_requests h where q.queue in ('sop', 'cuidado', 'salir', 'estafa') and h.id::text = q.subject_id) as sopr,
            (select d.amount_cents from disputes d where q.queue = 'disputa' and d.id::text = q.subject_id) as dpamt,
            (select d.reason from disputes d where q.queue = 'disputa' and d.id::text = q.subject_id) as dpreason,
            (select to_char(d.evidence_due_by at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') from disputes d where q.queue = 'disputa' and d.id::text = q.subject_id) as dpdue,
            (select l.status from licenses l where q.queue = 'lic' and l.id::text = q.subject_id) as lst,
            (select l.next_review::text from licenses l where q.queue = 'lic' and l.id::text = q.subject_id) as lnext,
            (select count(*)::int from audit_entries a where q.queue = 'vivienda' and q.subject_kind = 'business' and a.action = 'inm.vivienda_justa.frenada' and a.target_id = q.subject_id and a.at > now() - interval '30 days') as vjn,
            (select a.after->>'frase' from audit_entries a where q.queue = 'vivienda' and q.subject_kind = 'business' and a.action = 'inm.vivienda_justa.frenada' and a.target_id = q.subject_id order by a.at desc limit 1) as vjf,
            (select i.name->>'es' from items i where q.queue = 'vivienda' and q.subject_kind = 'listing' and i.id::text = q.subject_id) as vji,
            case when q.subject_kind = 'com_post' then (select left(p.body, 90) from com_posts p where p.id::text = q.subject_id)
                 when q.subject_kind = 'com_comment' then (select left(c.body, 90) from com_comments c where c.id::text = q.subject_id) end as ctext,
            (select count(*)::int from content_reports cr where q.subject_kind in ('com_post', 'com_comment', 'user') and cr.target_kind = q.subject_kind and cr.target_id = q.subject_id and cr.status = 'open') as cn,
            (select cr.reason from content_reports cr where q.subject_kind in ('com_post', 'com_comment', 'user') and cr.target_kind = q.subject_kind and cr.target_id = q.subject_id and cr.status = 'open' order by cr.priority desc, cr.created_at limit 1) as creason,
            (select f.rule_key || '|' || f.detail from mod_flags f where f.queue_item_id = q.id order by f.id desc limit 1) as cflag,
            (select coalesce(nullif(trim(coalesce(x.first_name, '') || ' ' || coalesce(x.last_name, '')), ''), 'Vecino') from users x where q.subject_kind = 'user' and x.id::text = q.subject_id) as uname,
            (select a.number || '|' || a.target_kind from appeals a where q.subject_kind = 'appeal' and a.id::text = q.subject_id) as apel,
            (select m.owner_kind from media m where q.queue = 'medios' and m.id::text = q.subject_id) as mkind,
            (select case when e.pending_status = 'review' then 'cambio' else 'nuevo' end || '|' || (e.title->>'es') from events e where q.queue = 'evt' and e.id::text = q.subject_id) as evt,
            (select sc.number || '|' || sc.topic || '|' || coalesce((select left(m.body, 80) from support_messages m where m.case_id = sc.id and m.sender = 'user' and m.hidden_at is null order by m.at, m.id limit 1), '')
               from support_cases sc where q.queue = 'ticket' and sc.id::text = q.subject_id) as tk,
            ${SLA_SQL} as sla_h
       from queue_items q
       left join businesses b on b.id = q.business_id
       left join users u on u.id = q.assigned_to
       left join recommendations rc on q.queue = 'rec' and rc.id::text = q.subject_id
       left join categories c on c.id = rc.category_id
       left join sensitive_changes sc on q.subject_kind = 'sensitive_change' and sc.id = q.subject_id
       left join users su on sc.target_kind = 'user' and su.id::text = sc.target_id
      where q.status = 'open' and q.queue = any($1::text[]) and (cardinality($2::text[]) = 0 or q.city_id = any($2::text[]))
      order by (q.queue = 'cuidado') desc, (q.queue = 'estafa') desc, (q.queue = 'sop' and q.priority = 'alta') desc, extract(epoch from now() - q.opened_at) / (${SLA_SQL} * 3600) desc
      limit 200`,
    [colas, s.cities]);
  const conteo: Record<string, number> = {};
  let vencidos = 0;
  const todos = r.rows.map((x): CasoLista => {
    const e = espera(x.opened_at, x.sla_h);
    conteo[x.queue] = (conteo[x.queue] ?? 0) + 1;
    if (e.r >= 1) vencidos++;
    const b = x.bname ?? "";
    const tk = (x.tk ?? "||").split("|");
    const t = x.queue === "ticket" ? { title: `${tk[0]} · ${TEMAS[tk[1] as Tema]?.corto.es ?? "Soporte"}${b ? ` · ${b}` : ""}`, sub: tk.slice(2).join("|") || "Caso de Soporte" }
      : x.queue === "sello" ? { title: `Sello · ${b}`, sub: "Pidió el sello de verificación" }
      : x.queue === "nuevo" ? { title: b, sub: "Publicado desde la app · revisión ligera" }
      : x.queue === "lic" ? { title: `Licencia · ${b}`, sub: `${x.ltitle ?? "Licencia"} · ${licEstado(x.lst, x.lnext)}` }
      : x.queue === "vivienda" && x.subject_kind === "listing" ? { title: `Vivienda para mayores · ${b}`, sub: `Declaración de 62 o más por revisar · «${x.vji ?? "Propiedad"}»` }
      : x.queue === "vivienda" ? { title: `Vivienda justa · ${b}`, sub: `${x.vjn} texto${x.vjn === 1 ? "" : "s"} frenado${x.vjn === 1 ? "" : "s"} en 30 días${x.vjf ? ` · «${x.vjf}»` : ""} · nada se publicó` }
      : x.queue === "cambio" && x.subject_kind === "sensitive_change" ? { title: `${CAMBIO_L[x.sctype ?? ""] ?? "Cambio sensible"} · ${x.sname ?? ""}`, sub: "Cambio sensible · lo aprueba otra persona" }
      : x.queue === "cambio" ? { title: `Reclamo · ${b}`, sub: "Cambio sensible · lo aprueba una persona" }
      : x.queue === "cuidado" ? { title: `Cuidado de niños · ${b}`, sub: "No cuidaron bien a su niño · directo a To'Latino" }
      : x.queue === "salir" ? { title: `No le dejan cancelar · ${b}`, sub: "Membresía con la baja pedida en la app" }
      : x.queue === "grupo" ? { title: `Grupos que no abrieron · ${b}`, sub: "3 o más grupos cancelados en 90 días" }
      : x.queue === "estafa" ? { title: `Posible estafa · ${b}`, sub: `${ESTAFA_L[x.sopr ?? ""] ?? "Le pidieron dinero"} · el anuncio está en pausa` }
      : x.queue === "plantones" ? { title: `Plantones · ${b}`, sub: "3 o más «No vino» en 30 días · mira cada una" }
      : x.queue === "sop" ? { title: `${AYUDA_DE[x.sopk ?? "order"] ?? "Ayuda con un pedido"} · ${b}`, sub: x.sopr === "inseguro" ? "Se sintió inseguro · va directo a To'Latino" : "El cliente espera una respuesta" }
      : x.queue === "mesa" ? { title: `Mesas no respetadas · ${b}`, sub: `${UMBRAL_NOCHE} o más en 30 noches · mira cada una` }
      : x.queue === "noid" ? { title: `Sin identificación · ${b}`, sub: `${UMBRAL_NOCHE} o más mesas con depósito en 30 noches` }
      : x.queue === "renta" ? { title: `Daño de renta · ${b}`, sub: "El cliente no está de acuerdo · el depósito sigue retenido" }
      : x.queue === "disputa" ? { title: `Disputa · pedido #${x.dpnum ?? "—"} · $${((x.dpamt ?? 0) / 100).toFixed(2)}`, sub: `${b || "Negocio"} · ${MOTIVO[x.dpreason ?? "general"]?.es ?? "Otro motivo del banco"}${x.dpdue ? ` · responder antes del ${new Date(x.dpdue).toLocaleDateString("es-US", { timeZone: "America/New_York", day: "numeric", month: "short" })}` : ""}` }
      : x.queue === "chat" && x.subject_kind === "dm_thread" ? { title: "Mensajes entre vecinos", sub: `${x.chreason ? MOTIVO_DM[x.chreason] ?? "Otro motivo" : "Reporte"}${x.chn > 1 ? ` · ${x.chn} reportes` : ""} · Comunidad` }
      : x.queue === "chat" ? { title: `Mensajes reportados · ${b}`, sub: `${x.chreason ? MOTIVO_CHAT[x.chreason] ?? "Otro motivo" : "Reporte"}${x.chn > 1 ? ` · ${x.chn} reportes` : ""}${x.chbiz ? " · lo reportó el negocio" : ""}` }
      // 5d · Comunidad: publicación o comentario reportado o marcado por una regla; una persona (repUsr); una apelación; una foto.
      : x.queue === "rep" && (x.subject_kind === "com_post" || x.subject_kind === "com_comment") ? { title: `${x.subject_kind === "com_post" ? "Publicación" : "Comentario"} de la Comunidad · «${(x.ctext ?? "").slice(0, 60)}»`, sub: subCom(x.cn, x.creason, x.cflag) }
      : x.queue === "repUsr" ? { title: `Vecino reportado · ${x.uname ?? "Vecino"}`, sub: subCom(x.cn, x.creason, x.cflag) }
      : x.queue === "apel" ? { title: `Apelación ${(x.apel ?? "").split("|")[0]} · ${APELABLE[(x.apel ?? "|sanction").split("|")[1] as Apelable]?.es ?? "contenido"}`, sub: "Segunda revisión · la decide otra persona" }
      // 6a · Eventos a revisar: un evento nuevo o un cambio que importa (la versión anterior sigue en vivo).
      : x.queue === "evtcx" ? { title: `Organizador que cancela · ${b}`, sub: "Canceló eventos con boletos vendidos · a cada comprador se le devolvió todo" }
      : x.queue === "evtpago" ? { title: `Pago de evento retenido · ${b}`, sub: "Primer evento grande de un organizador nuevo · revisa antes de pagar" }
      : x.queue === "evt" ? { title: `Evento · ${(x.evt ?? "|").split("|").slice(1).join("|")}`, sub: `${b}${(x.evt ?? "").startsWith("cambio") ? " · cambio que importa · sigue en vivo la versión anterior" : " · nuevo · nada se publica antes"}` }
      : x.queue === "medios" && x.mkind === "com_post" ? { title: "Foto de la Comunidad", sub: x.cflag ? x.cflag.split("|").slice(1).join("|") : "Espera revisión" }
      : x.queue === "rep" ? { title: `Reseña reportada · ${b}`, sub: `${x.rpbiz ? "El negocio pidió revisarla" : MOTIVO_RESENA[x.rpreason ?? "otro"] ?? "Otro motivo"}${x.rpn > 1 ? ` · ${x.rpn} reportes` : ""}` }
      : x.queue === "medios" ? { title: `Foto marcada · ${b}`, sub: `${MOTIVO_FOTO[x.mreason ?? "otro"] ?? "Otro motivo"}${x.mnote ? ` · «${x.mnote}»` : ""}${x.nrep > 1 ? ` · ${x.nrep} reportes` : ""}` }
      : { title: x.rname ?? "", sub: `Recomendado por un vecino${x.rcat ? ` · ${x.rcat}` : ""}` };
    return {
      id: x.id, queue: x.queue, ...t, priority: x.priority,
      who: x.subject_kind === "dm_thread" || x.subject_kind === "com_post" || x.subject_kind === "com_comment" || x.subject_kind === "appeal" || (x.queue === "medios" && x.mkind === "com_post") ? { name: "Comunidad", initials: "C" }
        : x.subject_kind === "user" ? { name: x.uname ?? "Vecino", initials: (x.uname ?? "V").slice(0, 1) } : x.queue === "rec" ? { name: x.rname ?? "", initials: (x.rname ?? "?").slice(0, 1) } : x.subject_kind === "sensitive_change" ? { name: x.sname ?? "", initials: (x.sname ?? "?").slice(0, 1) } : { name: b, image: x.cover ?? undefined, initials: b.slice(0, 1) },
      assignee: x.assignee, mine: x.assigned_to === s.id, esp: e, ...(x.queue === "ticket" && x.tk ? { tk: x.tk.split("|")[0] } : {}),
    };
  });
  const casos = todos.filter((c) => (!f.mios || c.mine) && (!f.sinAsignar || !c.assignee) && (!f.vencidos || c.esp.r >= 1));
  return { casos, conteo, vencidos, total: todos.length };
}
/* 5d · Lo que dice un caso de la Comunidad en la lista: el motivo principal y cuántos reportes, o la regla que lo marcó. */
function subCom(n: number, reason: string | null, flag: string | null) {
  const [r, ...d] = (flag ?? "").split("|");
  const rep = n ? `${MOTIVO_REP[reason ?? "otro"] ?? "Otro motivo"}${n > 1 ? ` · ${n} reportes` : ""}` : "";
  return [rep, flag ? `Regla: ${REGLA_L[r!] ?? r} · ${d.join("|").slice(0, 80)}` : ""].filter(Boolean).join(" · ") || "Reporte";
}
/* 4ig · Licencias: por verificar (nueva o cambiada) o, si ya estaba verificada, su revisión por vencer (14 días) o vencida (el barrido las abre). */
export function licEstado(st: string | null, next: string | null, hoy = hoyEn()) {
  if (st !== "valid" || !next) return "por verificar";
  const d = new Date(`${next}T12:00:00Z`).toLocaleDateString("es-US", { day: "numeric", month: "short", timeZone: "UTC" });
  return next < hoy ? `revisión vencida desde el ${d}` : `revisión por vencer · ${d}`;
}
/* 4if · Lo que dice la persona en una «Posible estafa» (para la lista; el detalle usa motivoAyuda). */
const ESTAFA_L: Record<string, string> = { ver: "Le cobraron por ver la propiedad", mudar: "Le pidieron más para mudarse de lo publicado", cobro: "Le pidieron dinero por la ayuda" };
export const CAMBIO_L: Record<string, string> = { deleteUser: "Borrar cuenta", mergeUser: "Fusionar cuentas" };
export const MOTIVO_FOTO: Record<string, string> = { no_es: "No es de este negocio", inapropiado: "Contenido inapropiado", datos: "Muestra datos personales", spam: "Es publicidad o spam", otro: "Otro motivo" };

/* Casos abiertos que ve la persona (contador de la barra y del menú). */
export async function casosAbiertos(s: Staff) {
  const vis = colasVisibles(s);
  if (!vis.length) return { n: 0, late: false };
  const r = await db().query<{ n: number; late: number }>(
    `select count(*)::int as n, count(*) filter (where extract(epoch from now() - q.opened_at) / (${SLA_SQL} * 3600) >= 1)::int as late
       from queue_items q where q.status = 'open' and q.queue = any($1::text[]) and (cardinality($2::text[]) = 0 or q.city_id = any($2::text[]))`,
    [vis, s.cities]);
  return { n: r.rows[0]?.n ?? 0, late: (r.rows[0]?.late ?? 0) > 0 };
}

/* Un caso con lo que necesita su decisión. null = no existe o no es para esta persona. */
export async function caso(s: Staff, id: string) {
  if (!/^\d{1,18}$/.test(id)) return null;
  const q = (await db().query<{ id: string; queue: Cola; subject_kind: string; subject_id: string; business_id: string | null; city_id: string | null; opened_at: string; status: string; assigned_to: string | null; assignee: string | null; decision: string | null }>(
    `select q.id::text, q.queue, q.subject_kind, q.subject_id, q.business_id, q.city_id, q.opened_at, q.status, q.assigned_to, u.first_name as assignee, q.decision
       from queue_items q left join users u on u.id = q.assigned_to where q.id = $1`, [id])).rows[0];
  if (!q || !colasVisibles(s).includes(q.queue) || (s.cities.length && (!q.city_id || !s.cities.includes(q.city_id)))) return null;
  const sla = q.queue === "evt" ? await valor("evt_revision_h") : COLAS[q.queue].sla;
  const base = { ...q, esp: espera(q.opened_at, sla), sla, mine: q.assigned_to === s.id, puedeDecidir: s.puede("colas", "aprobar") };
  const negocio = q.business_id ? await negocioCorto(q.business_id) : null;
  // 7b · Un caso de Soporte se trabaja en Super Admin › Soporte (su ficha con el hilo, macros y notas).
  if (q.queue === "ticket") {
    const tk = (await db().query<{ num: string }>(`select number as num from support_cases where id::text = $1`, [q.subject_id])).rows[0]?.num ?? null;
    return { ...base, negocio, tk };
  }
  if (q.queue === "sello") {
    const v = (await db().query<{ status: string; checks: Record<string, boolean>; note: string | null }>(`select status, checks, note from verification_requests where id = $1::bigint`, [q.subject_id])).rows[0];
    return { ...base, negocio, sello: v ?? null };
  }
  if (q.queue === "cambio" && q.subject_kind === "sensitive_change") {
    const sc = (await db().query<{ id: string; type: string; status: string; reason: string; created_at: string; requested_by: string; quien: string | null; target_id: string;
      nombre: string | null; phone: string; ciudad: string | null; creado: string; negocios: number; estado: string; hacia: string | null }>(
      `select sc.id, sc.type, sc.status, sc.reason, sc.created_at, sc.requested_by, nullif(trim(coalesce(a.first_name, '') || ' ' || coalesce(a.last_name, '')), '') as quien, sc.target_id,
              (select coalesce(nullif(trim(coalesce(h.first_name, '') || ' ' || coalesce(h.last_name, '')), ''), h.phone) from users h where h.id::text = sc.payload->>'into') as hacia,
              nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), '') as nombre, u.phone, ci.name as ciudad, u.created_at as creado,
              (select count(*)::int from business_members m where m.user_id = u.id and m.status = 'active' and m.kind = 'owner') as negocios, u.status as estado
         from sensitive_changes sc join users a on a.id = sc.requested_by join users u on u.id::text = sc.target_id left join cities ci on ci.id = u.home_city_id
        where sc.id = $1`, [q.subject_id])).rows[0];
    return { ...base, negocio: null, cambio: sc ? { ...sc, phone: telefonoBonito(sc.phone), mio: sc.requested_by === s.id } : null };
  }
  if (q.queue === "cambio") {
    const cl = (await db().query<{ id: string; role: string; method: string; doc_kind: string | null; note: string | null; source: string; status: string; created_at: string;
      quien: string | null; quien_id: string; quien_tel: string; call_phone: string | null; had_owner: string | null; dueno_actual: string | null; notified: string | null; doc: boolean }>(
      `select cl.id, cl.role, cl.method, cl.doc_kind, cl.note, cl.source, cl.status, cl.created_at,
              nullif(trim(coalesce(u.first_name,'') || ' ' || coalesce(u.last_name,'')), '') as quien, u.id as quien_id, u.phone as quien_tel, cl.call_phone,
              nullif(trim(coalesce(o.first_name,'') || ' ' || coalesce(o.last_name,'')), '') as had_owner,
              nullif(trim(coalesce(d.first_name,'') || ' ' || coalesce(d.last_name,'')), '') as dueno_actual,
              cl.owner_notified_at as notified, cl.doc_media is not null as doc
         from claims cl join users u on u.id = cl.user_id left join users o on o.id = cl.had_owner_id
         left join businesses b on b.id = cl.business_id left join users d on d.id = b.owner_user_id
        where cl.id = $1`, [q.subject_id])).rows[0];
    return { ...base, negocio, reclamo: cl ? { ...cl, quien_tel: telefonoBonito(cl.quien_tel) } : null };
  }
  if (q.queue === "lic") {
    const l = (await db().query<{ id: string; status: string; title: string; can: string; number: string | null; label: string; checked: string | null; url: string; site: string; next: string | null }>(
      `select l.id::text, l.status, coalesce(nullif(l.title, '{}'::jsonb), k.title)->>'es' as title, k.can->>'es' as can, l.number, k.number_label as label,
              l.checked_at as checked, k.registry_url as url, k.registry_site as site, l.next_review::text as next
         from licenses l join license_kinds k on k.key = l.kind where l.id = $1::bigint`, [q.subject_id])).rows[0];
    return { ...base, negocio, licencia: l ?? null };
  }
  // 5d · Comunidad: la foto que el modelo marcó o no pudo revisar (no se ve hasta decidir), la publicación o el comentario reportado o
  // marcado, la persona reportada y la apelación (lo apelado solo con la apelación abierta; un mensaje de vecino, solo ese mensaje).
  if (q.queue === "medios" && !q.business_id) {
    const f = (await db().query<{ url: string; status: string; post: string | null }>(`select m.url, m.status, case when m.owner_kind = 'com_post' then m.owner_id end as post from media m where m.id::text = $1`, [q.subject_id])).rows[0];
    const marcas = (await db().query<{ regla: string; detalle: string; at: string }>(`select rule_key as regla, detail as detalle, created_at as at from mod_flags where target_kind = 'media' and target_id = $1 order by id desc limit 5`, [q.subject_id])).rows;
    return { ...base, negocio: null, fotoCom: f ? { ...f, marcas } : null };
  }
  if (q.queue === "rep" && (q.subject_kind === "com_post" || q.subject_kind === "com_comment")) {
    return { ...base, negocio: null, com: await (await import("./admin-confianza")).casoComunidad(q.subject_kind, q.subject_id) };
  }
  if (q.queue === "repUsr") return { ...base, negocio: null, persona: await (await import("./admin-confianza")).casoPersona(q.subject_id), banea: s.role === "admin" };
  // 6a · Eventos a revisar: el evento (o el cambio que espera) con todo lo que hace falta para decidir.
  if (q.queue === "evt") return { ...base, negocio, evt: await (await import("./evt-revision")).eventoAdmin(s, q.subject_id), puedeEvt: s.puede("evt", "aprobar") };
  // 6e · Organizadores que cancelan: sus cancelaciones del plazo (qué, cuándo, motivo, órdenes y lo devuelto, el costo de la tarjeta que
  // puso To'Latino). Pagos de eventos retenidos: la liquidación y el historial del organizador. Nunca datos de compradores.
  if (q.queue === "evtcx" && q.business_id) {
    const L = (await db().query<{ t: string; eid: string; scope: string; motivo: string; at: string; ordenes: number; devuelto: number; costo: number }>(
      `select e.title->>'es' as t, e.id::text as eid, x.scope, x.reason_key as motivo, to_char(x.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, x.orders_n as ordenes, x.refunded_cents as devuelto, x.card_cost_cents as costo
         from event_cancellations x join events e on e.id = x.event_id where x.business_id = $1 and x.created_at > now() - make_interval(days => cfg_int('evt_cancelaciones_dias')) order by x.created_at desc limit 30`, [q.business_id])).rows;
    const o = (await db().query<{ bloqueado: string | null }>(`select blocked_reason as bloqueado from event_organizers where business_id = $1`, [q.business_id])).rows[0];
    return { ...base, negocio, evtcx: { L, bloqueado: o?.bloqueado ?? null, puedeBloquear: s.puede("evt", "retirar") } };
  }
  if (q.queue === "evtpago") return { ...base, negocio, evtpago: await (await import("./evt-liquidacion")).casoLiquidacion(q.subject_id), puedeSoltar: s.puede("tx", "aprobar") };
  if (q.queue === "apel") {
    const ap = q.status === "open" ? await (await import("./apelaciones")).apelacionDeCaso(q.subject_id) : null;
    return { ...base, negocio: null, apel: ap ? { ...ap, mia: ap.por === s.id } : null };
  }
  if (q.queue === "medios") {
    const m = (await db().query<{ url: string; status: string; visibles: number }>(
      `select m.url, m.status, (select count(*)::int from media x where x.owner_kind = 'business' and x.owner_id = m.owner_id and x.status = 'visible') as visibles
         from media m where m.id = $1::uuid`, [q.subject_id])).rows[0];
    const reps = (await db().query<{ reason: string; note: string | null; at: string }>(
      `select reason, note, created_at as at from photo_reports where media_id = $1::uuid and status = 'open' order by created_at`, [q.subject_id])).rows;
    return { ...base, negocio, foto: m ?? null, reportes: reps };
  }
  if (q.queue === "plantones") {
    // 4ie · Las visitas marcadas «No vino» en 30 días: cuál, qué, para cuándo y cuándo se marcó. Nunca la nota ni la dirección del cliente.
    const L = (await db().query<{ num: string; que: string; item: string | null; dia: string; marcada: string; quien: string }>(
      `select o.number as num, o.details->>'what' as que, o.details->'item'->>'es' as item, (o.details->>'dia') || ' ' || lpad(((o.details->>'min')::int / 60)::text, 2, '0') || ':' || lpad(((o.details->>'min')::int % 60)::text, 2, '0') as dia,
              o.done_at::text as marcada, coalesce(nullif(u.first_name, ''), 'Cliente') as quien
         from operations o join users u on u.id = o.user_id where o.business_id = $1 and o.kind = 'visit' and o.status_detail = 'noshow' and o.done_at > now() - interval '30 days' order by o.done_at desc limit 30`, [q.business_id])).rows;
    const tot = (await db().query<{ n: number }>(`select count(*)::int as n from operations where business_id = $1 and kind = 'visit' and status = 'done' and done_at > now() - interval '30 days'`, [q.business_id])).rows[0]?.n ?? 0;
    const off = (await db().query<{ off: boolean }>(`select coalesce(modules_off ? 'svc', false) as off from businesses where id = $1`, [q.business_id])).rows[0]?.off ?? false;
    return { ...base, negocio, plantones: { L, tot, pausado: off } };
  }
  if (q.queue === "vivienda" && q.business_id) {
    // 4ig · Vivienda justa: las frases frenadas de 30 días (qué frase, en qué propiedad, cuándo, quién del negocio) o la propiedad que se
    // declara vivienda para mayores. Nunca quién vive ni datos de quien pidió una visita.
    const v = await (await import("./vivienda-cola")).datosCasoVivienda(db(), q.subject_kind, q.subject_id, q.business_id);
    return { ...base, negocio, vivienda: v };
  }
  if (q.queue === "grupo") {
    // 4eg · Los grupos que el lugar canceló en 90 días: cuál, cuándo, el motivo y a cuántos se les devolvió todo. Nunca datos de inscritos.
    const L = (await db().query<{ id: string; svc: string; label: string; inicio: string; motivo: string | null; at: string; n: number }>(
      `select g.id::text, i.name->>'es' as svc, g.label->>'es' as label, g.starts_on::text as inicio, g.cancel_reason as motivo, g.updated_at::text as at,
              (select count(*)::int from operations o where o.business_id = g.business_id and o.kind = 'enrollment' and o.cancel_reason = 'grupo' and (o.details->>'group_id' = g.id::text or o.details->>'alt_group_id' = g.id::text)) as n
         from class_groups g join items i on i.id = g.item_id where g.business_id = $1 and g.purpose = 'insc' and g.status = 'cancelled' and g.updated_at > now() - interval '90 days' order by g.updated_at desc limit 30`, [q.business_id])).rows;
    const off = (await db().query<{ off: boolean }>(`select coalesce(modules_off ? 'svc', false) as off from businesses where id = $1`, [q.business_id])).rows[0]?.off ?? false;
    return { ...base, negocio, grupos: { L, pausado: off } };
  }
  if (q.queue === "sop" || q.queue === "cuidado" || q.queue === "salir" || q.queue === "estafa") {
    // Ayuda con un pedido: la solicitud, lo que pidió, la respuesta del negocio (si hubo) y el pedido.
    // Citas (3e): también el monto que pide, la decisión del negocio, sus fotos y lo que se puede devolver a la tarjeta.
    const h = (await db().query<{ number: string; reason: string; items: { n: string; q: number }[]; wants: string; body: string | null; status: string; reply: string | null; escalated_by: string | null; creada: string; num: string; total: number; quien: string; uid: string;
      k: "order" | "appointment" | "market_order" | "hold" | "party" | "trip" | "night" | "enrollment" | "visit" | "tickets"; amount: number | null; decision: string | null; offer: number | null; fotos: string[]; pago: number; svc: string | null; rub: string | null }>(
      `select h.number, h.reason, h.items, h.wants, h.body, h.status, h.reply, h.escalated_by, h.created_at as creada, o.number as num, o.total_cents as total,
              coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), ''), u.phone) as quien, u.id::text as uid,
              o.kind as k, h.amount_cents as amount, h.decision, h.offer_cents as offer, coalesce(o.details->'svc'->>'es', o.details#>>'{item,es}', o.details#>>'{title,es}') as svc, coalesce(o.details->>'rubro', case o.kind when 'party' then 'fiesta' when 'trip' then 'trans' when 'night' then 'noche' when 'enrollment' then o.details->>'rubro' when 'market_order' then 'merc' when 'hold' then 'tienda' when 'tickets' then 'evt' end) as rub,
              array(select ${FOTO_AYUDA_SQL} from media m where m.owner_kind = 'help' and m.owner_id = h.id::text and m.status = 'visible' order by m.sort) as fotos,
              coalesce((select p.amount_cents - p.refunded_cents from payments p where p.operation_id = o.id and p.status in ('captured', 'partially_refunded') order by p.id desc limit 1), 0) as pago
         from help_requests h join operations o on o.id = h.operation_id join users u on u.id = h.user_id where h.id = $1::bigint`, [q.subject_id])).rows[0];
    // 4if · «Posible estafa»: qué está en pausa (la propiedad o el carro, o «Pedir fecha» de la iglesia), desde cuándo, lo que vio la persona al
    // pedir (la copia del total) y cuántas otras ayudas directas tiene el negocio en 90 días. Nunca hay dinero que devolver: no pasó por la app.
    const pausa = q.queue === "estafa" ? (await db().query<{ kind: string | null; ref: string | null; at: string | null; fin: string | null; item: string | null; vivo: boolean | null; copia: Record<string, unknown> | null; otras: number }>(
      `select h.paused_kind as kind, h.paused_ref as ref, h.paused_at::text as at, h.unpaused_at::text as fin,
              case when h.paused_kind = 'item' then (select i.name->>'es' from items i where i.id::text = h.paused_ref) else 'Pedir fecha e inscripciones' end as item,
              case when h.paused_kind = 'item' then (select i.status = 'live' from items i where i.id::text = h.paused_ref) when h.paused_kind = 'svc' then not coalesce((select b.modules_off ? 'svc' from businesses b where b.id = h.business_id), false) end as vivo,
              case when o.kind = 'visit' then jsonb_strip_nulls(jsonb_build_object('rent', o.details->'rent_cents', 'dep', o.details->'deposit_cents', 'moveIn', o.details->'move_in_cents', 'price', o.details->'price_cents', 'otd', o.details#>'{puerta,otd}', 'item', o.details#>'{item,es}', 'que', o.details->'what')) end as copia,
              (select count(*)::int from help_requests x where x.business_id = h.business_id and x.id <> h.id and x.reason in ('ver', 'mudar', 'cobro') and x.created_at > now() - interval '90 days') as otras
         from help_requests h join operations o on o.id = h.operation_id where h.id = $1::bigint`, [q.subject_id])).rows[0] ?? null : null;
    // 7g · «Sugerir respuesta con El Compa» solo en la cola «sop» (nunca Cuidado de niños, No me dejan cancelar ni Posible estafa), para quien
    // resuelve (colas:aprobar), con la ayuda abierta, nunca de Salud, Profesionales ni inscripciones, y con el copiloto encendido y bajo el tope.
    // Lectura barata y con .catch: apagado, al tope o con un error, la ficha es la de siempre.
    const copiloto = q.queue === "sop" && q.status === "open" && base.puedeDecidir && !!h && h.k !== "enrollment" && h.rub !== "salud" && h.rub !== "pro"
      ? await import("./compa/copiloto").then((m) => m.copilotoDisponible({ ciudad: q.city_id, negocio: q.business_id })).catch(() => false) : false;
    return { ...base, negocio, ayuda: h ?? null, puedeDinero: s.puede("tx", "aprobar"), pausa, copiloto };
  }
  if (q.queue === "renta") {
    // Daño de una renta (4f-2): la herramienta, la foto, el monto, la nota del negocio, el depósito y el cliente.
    const r = (await db().query<{ numero: string; n: { es: string }; cents: number; nota: string | null; foto: string | null; dep: number; late: number; st: string | null; cliente: string; uid: string; dias: number; due: string; back: string | null }>(
      `select o.number as numero, r.item_name as n, r.damage_cents as cents, r.damage_note as nota, m.url as foto, r.deposit_cents as dep, r.late_cents as late, r.damage_status as st,
              coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), ''), u.phone) as cliente, u.id::text as uid, r.days as dias, r.due_on::text as due, r.back_at as back
         from rentals r join operations o on o.id = r.operation_id join users u on u.id = r.user_id left join media m on m.id = r.damage_photo where r.id = $1::bigint`, [q.subject_id])).rows[0];
    return { ...base, negocio, renta: r ?? null, puedeDinero: s.puede("tx", "aprobar") };
  }
  if (q.queue === "disputa") {
    // La disputa, el cliente y la evidencia que ya tenemos del pedido (línea de tiempo).
    const d = (await db().query<{ id: string; sid: string; amount: number; reason: string; status: string; due: string | null; num: string | null; uid: string | null; cliente: string | null; resp: string | null; sim: boolean }>(
      `select d.id::text, d.stripe_dispute_id as sid, d.amount_cents as amount, d.reason, d.status, to_char(d.evidence_due_by at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as due,
              o.number as num, o.user_id::text as uid, nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), '') as cliente, d.response_text as resp, d.simulated as sim
         from disputes d left join operations o on o.id = d.operation_id left join users u on u.id = o.user_id where d.id = $1::bigint`, [q.subject_id])).rows[0];
    // 9k · Los archivos que van al banco (recibo, conversación, constancia de entrega) y si ya se enviaron.
    const archivos = d ? await (await import("./disputas")).evidenciaArchivos(d.id) : [];
    return { ...base, negocio, disputa: d ? { ...d, motivo: MOTIVO[d.reason]?.es ?? "Otro motivo del banco" } : null, evidencia: d ? await evidenciaDe(d.id) : null, archivos, puedeDinero: s.puede("tx", "aprobar") };
  }
  if (q.queue === "chat" && q.subject_kind === "dm_thread") {
    // 5c · Mensajes entre vecinos: solo con el caso y un reporte abiertos (lib/admin-dm.ts; guardián dmSoloConReporte).
    const dm = q.status === "open" ? await (await import("./admin-dm")).dmReportado(q.subject_id) : null;
    return { ...base, negocio: null, dm };
  }
  if (q.queue === "chat") {
    // La conversación reportada: solo se lee con el caso abierto (si ya se decidió, no se muestra el hilo).
    // 7f · Con las respuestas de El Compa marcadas (compa) y si El Compa está apagado en esta conversación (compa_off).
    const t = (await db().query<{ vecino: string; vecino_id: string; ctx: { es: string; en: string } | null; bloqueado: boolean; compa_off: string | null }>(
      `select coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), ''), u.phone) as vecino, u.id::text as vecino_id, t.context as ctx, t.blocked_at is not null as bloqueado,
              t.compa_off_reason as compa_off
         from chat_threads t join users u on u.id = t.user_id where t.id = $1::bigint`, [q.subject_id])).rows[0];
    const msjs = q.status === "open" && t ? (await db().query<{ id: string; de: string; t: string; at: string; oculto: boolean; quien: string | null; compa: boolean }>(
      `select m.id::text, m.sender as de, m.body as t, m.created_at as at, m.hidden_at is not null as oculto, m.compa,
              (select coalesce(nullif(trim(coalesce(x.first_name, '')), ''), 'Equipo') from users x where x.id = m.sender_user_id and m.sender = 'business') as quien
         from chat_messages m where m.thread_id = $1::bigint order by m.id desc limit 60`, [q.subject_id])).rows.reverse() : [];
    const reps = (await db().query<{ reason: string; note: string | null; at: string; by_business: boolean; quien: string | null }>(
      `select cr.reason, cr.note, cr.created_at as at, cr.by_business, nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), '') as quien
         from content_reports cr join users u on u.id = cr.reporter_user_id where cr.target_kind = 'chat' and cr.target_id = $1 and cr.status = 'open' order by cr.created_at`, [q.subject_id])).rows;
    return { ...base, negocio, chat: t ? { ...t, msjs } : null, reportesC: reps };
  }
  if (q.queue === "rep") {
    // La reseña (sigue visible mientras se decide), su autor y los reportes abiertos.
    const r = (await db().query<{ stars: number; body: string; src: string; status: string; estado: string | null; autor: string; autor_id: string; reply: string | null; creada: string }>(
      `select r.stars, r.body, r.src, r.status, r.review_state as estado, r.user_id::text as autor_id, r.reply, r.created_at as creada,
              coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(left(u.last_name, 1), '')), ''), 'Vecino') as autor
         from reviews r join users u on u.id = r.user_id where r.id = $1::bigint`, [q.subject_id])).rows[0];
    const reps = (await db().query<{ reason: string; note: string | null; at: string; by_business: boolean; quien: string | null }>(
      `select cr.reason, cr.note, cr.created_at as at, cr.by_business, nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(left(u.last_name, 1), '')), '') as quien
         from content_reports cr join users u on u.id = cr.reporter_user_id where cr.target_kind = 'review' and cr.target_id = $1 and cr.status = 'open' order by cr.created_at`, [q.subject_id])).rows;
    return { ...base, negocio, resena: r ?? null, reportesR: reps };
  }
  if (q.queue === "mesa" || q.queue === "noid") {
    // 4ne · Noche: lo que pasó en los últimos 30 días (cada noche con su número, lo que pasó, el depósito y si hubo ayuda) y si
    // mesas y lista ya están en pausa. Nunca el código de la puerta.
    const L = (await db().query<{ num: string; noche: string; k: string; pax: number; st: string; det: string | null; dep: number; pago: string | null; devuelto: number; quien: string; motivo: string | null; ayuda: string | null }>(
      `select o.number as num, o.night_date::text as noche, o.details->>'k' as k, coalesce(o.party_size, 1) as pax, o.status as st, o.status_detail as det, coalesce(o.deposit_cents, 0) as dep,
              p.status as pago, coalesce(p.refunded_cents, 0) as devuelto, coalesce(nullif(u.first_name, ''), 'Cliente') || coalesce(' ' || left(nullif(u.last_name, ''), 1) || '.', '') as quien,
              o.details->>'motivoNeg' as motivo, (select h.reason from help_requests h where h.operation_id = o.id) as ayuda
         from operations o join users u on u.id = o.user_id left join payments p on p.operation_id = o.id and p.kind = 'deposit'
        where o.business_id = $1 and o.kind = 'night' and o.night_date > current_date - 30 and ${INCIDENTE_SQL[q.queue]}
        order by o.night_date desc, o.id desc limit 50`, [q.business_id])).rows;
    const off = (await db().query<{ off: boolean }>(`select coalesce(modules_off ? 'rsv', false) as off from businesses where id = $1`, [q.business_id])).rows[0]?.off ?? false;
    return { ...base, negocio, noche: { L, pausado: off } };
  }
  if (q.queue === "rec") {
    const r = (await db().query<{ business_name: string; cat: string | null; cat_id: string | null; where: string | null; address: string | null; contact_phone: string | null; how_known: string | null; note: string | null; ciudad: string; by_user_id: string; quien: string | null; reveal_me: boolean; is_mine: boolean }>(
      `select r.business_name, c.name->>'es' as cat, r.category_id as cat_id, r."where", r.address, r.contact_phone, r.how_known, r.note, ci.name as ciudad, r.by_user_id,
              nullif(trim(coalesce(u.first_name,'') || ' ' || coalesce(left(u.last_name, 1), '')), '') as quien, r.reveal_me, r.is_mine
         from recommendations r join cities ci on ci.id = r.city_id left join categories c on c.id = r.category_id left join users u on u.id = r.by_user_id
        where r.id = $1::bigint`, [q.subject_id])).rows[0];
    // ¿Ya existe? Nombre parecido (trigramas) en la misma ciudad, o el mismo teléfono.
    const parecidos = r ? (await db().query<{ id: string }>(
      `select b.id from businesses b where b.city_id = $1 and b.status not in ('merged') and (similarity(lower(b.name), lower($2)) > 0.35 or ($3::text is not null and b.phone = $3))
        order by similarity(lower(b.name), lower($2)) desc limit 3`, [q.city_id, r.business_name, r.contact_phone])).rows : [];
    return { ...base, negocio: null, rec: r ?? null, parecidos: await Promise.all(parecidos.map((p) => negocioCorto(p.id))) };
  }
  return { ...base, negocio };
}
export type Caso = NonNullable<Awaited<ReturnType<typeof caso>>>;

/* Lo que se muestra de un negocio en una fila o en el detalle de un caso. */
export async function negocioCorto(id: string) {
  const b = (await db().query<{
    id: string; name: string; cat: string; cat_id: string; subs: string | null; address: string | null; phone: string | null; founded: number | null;
    fotos: number; reviews: number; plan: string; verified: boolean; status: string; origin: string; cover: string | null; trial: string | null; ciudad: string;
  }>(
    `select b.id, b.name, c.name->>'es' as cat, b.category_id as cat_id,
            (select string_agg(sc.name->>'es', ' · ' order by array_position(b.subcategory_ids, sc.id)) from subcategories sc where sc.id = any(b.subcategory_ids)) as subs,
            b.address, b.phone, b.founded_year as founded, coalesce(s.photo_count, 0) as fotos, coalesce(s.review_count, 0) as reviews,
            coalesce(s.plan, 'free') as plan, coalesce(s.verified, false) as verified, b.status, b.origin,
            (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1) as cover,
            b.category_attrs->'onb'->'trial'->>'until' as trial, ci.name as ciudad
       from businesses b join categories c on c.id = b.category_id join cities ci on ci.id = b.city_id left join business_stats_cache s on s.business_id = b.id
      where b.id = $1`, [id])).rows[0];
  return b ? { ...b, phone: telefonoBonito(b.phone) } : null;
}
