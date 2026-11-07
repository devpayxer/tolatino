import "server-only";
import { FOTO_AYUDA_SQL } from "./ayuda-cita";
const MOTIVO_CHAT: Record<string, string> = { spam: "Spam o publicidad", off: "Ofensivo o amenaza", pii: "Pide datos o dinero", otro: "Otra cosa" };
import type { Staff } from "./admin";
import { COLAS, MOTIVO_RESENA, colasDelRol, espera, type Cola } from "./colas";
import { db } from "./db";
import { MOTIVO, evidenciaDe } from "./disputas";
import { telefonoBonito } from "./panel";

/* ADM-COLAS: lo que espera una decisión. El servidor decide qué ve cada persona: las colas de su rol (lib/colas.ts),
   la matriz (colas:ver) y sus ciudades (staff_members.cities; vacío = todas). La más vieja contra su plazo va primero. */
export function colasVisibles(s: Staff): Cola[] {
  return s.puede("colas", "ver") ? colasDelRol(s.role) : [];
}
const SLA_SQL = `case q.queue ${Object.entries(COLAS).map(([k, v]) => `when '${k}' then ${v.sla}`).join(" ")} else 24 end`;

export type CasoLista = {
  id: string; queue: Cola; title: string; sub: string; who: { name: string; image?: string; initials?: string } | null;
  assignee: string | null; mine: boolean; esp: ReturnType<typeof espera>; priority: string;
};

export async function listaCasos(s: Staff, f: { cola?: Cola | null; mios?: boolean; sinAsignar?: boolean; vencidos?: boolean }) {
  const vis = colasVisibles(s);
  const colas = f.cola && vis.includes(f.cola) ? [f.cola] : vis;
  if (!colas.length) return { casos: [] as CasoLista[], conteo: {} as Record<string, number>, vencidos: 0, total: 0 };
  const r = await db().query<{
    id: string; queue: Cola; opened_at: string; priority: string; assigned_to: string | null; assignee: string | null;
    bname: string | null; cover: string | null; rname: string | null; rcat: string | null; mnote: string | null; mreason: string | null; nrep: number; ltitle: string | null;
    subject_kind: string; sctype: string | null; sname: string | null; rpreason: string | null; rpn: number; rpbiz: boolean; chreason: string | null; chn: number; chbiz: boolean; dpnum: string | null; sopk: string | null; dpamt: number | null; dpreason: string | null; dpdue: string | null;
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
            (select cr.reason from content_reports cr where q.queue = 'chat' and cr.target_kind = 'chat' and cr.target_id = q.subject_id and cr.status = 'open' order by cr.created_at limit 1) as chreason,
            (select count(*)::int from content_reports cr where q.queue = 'chat' and cr.target_kind = 'chat' and cr.target_id = q.subject_id and cr.status = 'open') as chn,
            coalesce((select bool_or(cr.by_business) from content_reports cr where q.queue = 'chat' and cr.target_kind = 'chat' and cr.target_id = q.subject_id and cr.status = 'open'), false) as chbiz,
            (select o.number from disputes d join operations o on o.id = d.operation_id where q.queue = 'disputa' and d.id::text = q.subject_id) as dpnum,
            (select o.kind from help_requests h join operations o on o.id = h.operation_id where q.queue = 'sop' and h.id::text = q.subject_id) as sopk,
            (select d.amount_cents from disputes d where q.queue = 'disputa' and d.id::text = q.subject_id) as dpamt,
            (select d.reason from disputes d where q.queue = 'disputa' and d.id::text = q.subject_id) as dpreason,
            (select to_char(d.evidence_due_by at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') from disputes d where q.queue = 'disputa' and d.id::text = q.subject_id) as dpdue
       from queue_items q
       left join businesses b on b.id = q.business_id
       left join users u on u.id = q.assigned_to
       left join recommendations rc on q.queue = 'rec' and rc.id::text = q.subject_id
       left join categories c on c.id = rc.category_id
       left join sensitive_changes sc on q.subject_kind = 'sensitive_change' and sc.id = q.subject_id
       left join users su on sc.target_kind = 'user' and su.id::text = sc.target_id
      where q.status = 'open' and q.queue = any($1::text[]) and (cardinality($2::text[]) = 0 or q.city_id = any($2::text[]))
      order by extract(epoch from now() - q.opened_at) / (${SLA_SQL} * 3600) desc
      limit 200`,
    [colas, s.cities]);
  const conteo: Record<string, number> = {};
  let vencidos = 0;
  const todos = r.rows.map((x): CasoLista => {
    const e = espera(x.opened_at, COLAS[x.queue].sla);
    conteo[x.queue] = (conteo[x.queue] ?? 0) + 1;
    if (e.r >= 1) vencidos++;
    const b = x.bname ?? "";
    const t = x.queue === "sello" ? { title: `Sello · ${b}`, sub: "Pidió el sello de verificación" }
      : x.queue === "nuevo" ? { title: b, sub: "Publicado desde la app · revisión ligera" }
      : x.queue === "lic" ? { title: `Licencia · ${b}`, sub: `${x.ltitle ?? "Licencia"} · por verificar` }
      : x.queue === "cambio" && x.subject_kind === "sensitive_change" ? { title: `${CAMBIO_L[x.sctype ?? ""] ?? "Cambio sensible"} · ${x.sname ?? ""}`, sub: "Cambio sensible · lo aprueba otra persona" }
      : x.queue === "cambio" ? { title: `Reclamo · ${b}`, sub: "Cambio sensible · lo aprueba una persona" }
      : x.queue === "sop" ? { title: `${x.sopk === "appointment" ? "Ayuda con una cita" : x.sopk === "hold" ? "Ayuda con una compra" : x.sopk === "market_order" ? "Ayuda con un pedido del mercado" : "Ayuda con un pedido"} · ${b}`, sub: "El cliente espera una respuesta" }
      : x.queue === "renta" ? { title: `Daño de renta · ${b}`, sub: "El cliente no está de acuerdo · el depósito sigue retenido" }
      : x.queue === "disputa" ? { title: `Disputa · pedido #${x.dpnum ?? "—"} · $${((x.dpamt ?? 0) / 100).toFixed(2)}`, sub: `${b || "Negocio"} · ${MOTIVO[x.dpreason ?? "general"]?.es ?? "Otro motivo del banco"}${x.dpdue ? ` · responder antes del ${new Date(x.dpdue).toLocaleDateString("es-US", { timeZone: "America/New_York", day: "numeric", month: "short" })}` : ""}` }
      : x.queue === "chat" ? { title: `Mensajes reportados · ${b}`, sub: `${x.chreason ? MOTIVO_CHAT[x.chreason] ?? "Otro motivo" : "Reporte"}${x.chn > 1 ? ` · ${x.chn} reportes` : ""}${x.chbiz ? " · lo reportó el negocio" : ""}` }
      : x.queue === "rep" ? { title: `Reseña reportada · ${b}`, sub: `${x.rpbiz ? "El negocio pidió revisarla" : MOTIVO_RESENA[x.rpreason ?? "otro"] ?? "Otro motivo"}${x.rpn > 1 ? ` · ${x.rpn} reportes` : ""}` }
      : x.queue === "medios" ? { title: `Foto marcada · ${b}`, sub: `${MOTIVO_FOTO[x.mreason ?? "otro"] ?? "Otro motivo"}${x.mnote ? ` · «${x.mnote}»` : ""}${x.nrep > 1 ? ` · ${x.nrep} reportes` : ""}` }
      : { title: x.rname ?? "", sub: `Recomendado por un vecino${x.rcat ? ` · ${x.rcat}` : ""}` };
    return {
      id: x.id, queue: x.queue, ...t, priority: x.priority,
      who: x.queue === "rec" ? { name: x.rname ?? "", initials: (x.rname ?? "?").slice(0, 1) } : x.subject_kind === "sensitive_change" ? { name: x.sname ?? "", initials: (x.sname ?? "?").slice(0, 1) } : { name: b, image: x.cover ?? undefined, initials: b.slice(0, 1) },
      assignee: x.assignee, mine: x.assigned_to === s.id, esp: e,
    };
  });
  const casos = todos.filter((c) => (!f.mios || c.mine) && (!f.sinAsignar || !c.assignee) && (!f.vencidos || c.esp.r >= 1));
  return { casos, conteo, vencidos, total: todos.length };
}
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
  const base = { ...q, esp: espera(q.opened_at, COLAS[q.queue].sla), mine: q.assigned_to === s.id, puedeDecidir: s.puede("colas", "aprobar") };
  const negocio = q.business_id ? await negocioCorto(q.business_id) : null;
  if (q.queue === "sello") {
    const v = (await db().query<{ status: string; checks: Record<string, boolean>; note: string | null }>(`select status, checks, note from verification_requests where id = $1::bigint`, [q.subject_id])).rows[0];
    return { ...base, negocio, sello: v ?? null };
  }
  if (q.queue === "cambio" && q.subject_kind === "sensitive_change") {
    const sc = (await db().query<{ id: string; type: string; status: string; reason: string; created_at: string; requested_by: string; quien: string | null; target_id: string;
      nombre: string | null; phone: string; ciudad: string | null; creado: string; negocios: number; estado: string }>(
      `select sc.id, sc.type, sc.status, sc.reason, sc.created_at, sc.requested_by, nullif(trim(coalesce(a.first_name, '') || ' ' || coalesce(a.last_name, '')), '') as quien, sc.target_id,
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
    const l = (await db().query<{ id: string; status: string; title: string; can: string; number: string | null; label: string; checked: string | null; url: string; site: string }>(
      `select l.id::text, l.status, coalesce(nullif(l.title, '{}'::jsonb), k.title)->>'es' as title, k.can->>'es' as can, l.number, k.number_label as label,
              l.checked_at as checked, k.registry_url as url, k.registry_site as site
         from licenses l join license_kinds k on k.key = l.kind where l.id = $1::bigint`, [q.subject_id])).rows[0];
    return { ...base, negocio, licencia: l ?? null };
  }
  if (q.queue === "medios") {
    const m = (await db().query<{ url: string; status: string; visibles: number }>(
      `select m.url, m.status, (select count(*)::int from media x where x.owner_kind = 'business' and x.owner_id = m.owner_id and x.status = 'visible') as visibles
         from media m where m.id = $1::uuid`, [q.subject_id])).rows[0];
    const reps = (await db().query<{ reason: string; note: string | null; at: string }>(
      `select reason, note, created_at as at from photo_reports where media_id = $1::uuid and status = 'open' order by created_at`, [q.subject_id])).rows;
    return { ...base, negocio, foto: m ?? null, reportes: reps };
  }
  if (q.queue === "sop") {
    // Ayuda con un pedido: la solicitud, lo que pidió, la respuesta del negocio (si hubo) y el pedido.
    // Citas (3e): también el monto que pide, la decisión del negocio, sus fotos y lo que se puede devolver a la tarjeta.
    const h = (await db().query<{ number: string; reason: string; items: { n: string; q: number }[]; wants: string; body: string | null; status: string; reply: string | null; escalated_by: string | null; creada: string; num: string; total: number; quien: string; uid: string;
      k: "order" | "appointment" | "market_order" | "hold" | "party" | "trip"; amount: number | null; decision: string | null; offer: number | null; fotos: string[]; pago: number; svc: string | null; rub: string | null }>(
      `select h.number, h.reason, h.items, h.wants, h.body, h.status, h.reply, h.escalated_by, h.created_at as creada, o.number as num, o.total_cents as total,
              coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), ''), u.phone) as quien, u.id::text as uid,
              o.kind as k, h.amount_cents as amount, h.decision, h.offer_cents as offer, o.details->'svc'->>'es' as svc, coalesce(o.details->>'rubro', case o.kind when 'party' then 'fiesta' when 'trip' then 'trans' when 'market_order' then 'merc' when 'hold' then 'tienda' end) as rub,
              array(select ${FOTO_AYUDA_SQL} from media m where m.owner_kind = 'help' and m.owner_id = h.id::text and m.status = 'visible' order by m.sort) as fotos,
              coalesce((select p.amount_cents - p.refunded_cents from payments p where p.operation_id = o.id and p.status in ('captured', 'partially_refunded') order by p.id desc limit 1), 0) as pago
         from help_requests h join operations o on o.id = h.operation_id join users u on u.id = h.user_id where h.id = $1::bigint`, [q.subject_id])).rows[0];
    return { ...base, negocio, ayuda: h ?? null, puedeDinero: s.puede("tx", "aprobar") };
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
    return { ...base, negocio, disputa: d ? { ...d, motivo: MOTIVO[d.reason]?.es ?? "Otro motivo del banco" } : null, evidencia: d ? await evidenciaDe(d.id) : null, puedeDinero: s.puede("tx", "aprobar") };
  }
  if (q.queue === "chat") {
    // La conversación reportada: solo se lee con el caso abierto (si ya se decidió, no se muestra el hilo).
    const t = (await db().query<{ vecino: string; vecino_id: string; ctx: { es: string; en: string } | null; bloqueado: boolean }>(
      `select coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), ''), u.phone) as vecino, u.id::text as vecino_id, t.context as ctx, t.blocked_at is not null as bloqueado
         from chat_threads t join users u on u.id = t.user_id where t.id = $1::bigint`, [q.subject_id])).rows[0];
    const msjs = q.status === "open" && t ? (await db().query<{ id: string; de: string; t: string; at: string; oculto: boolean; quien: string | null }>(
      `select m.id::text, m.sender as de, m.body as t, m.created_at as at, m.hidden_at is not null as oculto,
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
