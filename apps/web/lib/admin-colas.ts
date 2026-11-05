import "server-only";
import type { Staff } from "./admin";
import { COLAS, colasDelRol, espera, type Cola } from "./colas";
import { db } from "./db";
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
    bname: string | null; cover: string | null; rname: string | null; rcat: string | null; mnote: string | null; mreason: string | null; nrep: number;
  }>(
    `select q.id::text, q.queue, q.opened_at, q.priority, q.assigned_to, u.first_name as assignee,
            b.name as bname,
            (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1) as cover,
            rc.business_name as rname, c.name->>'es' as rcat,
            (select pr.note from photo_reports pr where q.queue = 'medios' and pr.media_id::text = q.subject_id and pr.status = 'open' order by pr.created_at limit 1) as mnote,
            (select pr.reason from photo_reports pr where q.queue = 'medios' and pr.media_id::text = q.subject_id and pr.status = 'open' order by pr.created_at limit 1) as mreason,
            (select count(*)::int from photo_reports pr where q.queue = 'medios' and pr.media_id::text = q.subject_id and pr.status = 'open') as nrep
       from queue_items q
       left join businesses b on b.id = q.business_id
       left join users u on u.id = q.assigned_to
       left join recommendations rc on q.queue = 'rec' and rc.id::text = q.subject_id
       left join categories c on c.id = rc.category_id
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
      : x.queue === "medios" ? { title: `Foto marcada · ${b}`, sub: `${MOTIVO_FOTO[x.mreason ?? "otro"] ?? "Otro motivo"}${x.mnote ? ` · «${x.mnote}»` : ""}${x.nrep > 1 ? ` · ${x.nrep} reportes` : ""}` }
      : { title: x.rname ?? "", sub: `Recomendado por un vecino${x.rcat ? ` · ${x.rcat}` : ""}` };
    return {
      id: x.id, queue: x.queue, ...t, priority: x.priority,
      who: x.queue === "rec" ? { name: x.rname ?? "", initials: (x.rname ?? "?").slice(0, 1) } : { name: b, image: x.cover ?? undefined, initials: b.slice(0, 1) },
      assignee: x.assignee, mine: x.assigned_to === s.id, esp: e,
    };
  });
  const casos = todos.filter((c) => (!f.mios || c.mine) && (!f.sinAsignar || !c.assignee) && (!f.vencidos || c.esp.r >= 1));
  return { casos, conteo, vencidos, total: todos.length };
}
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
  const q = (await db().query<{ id: string; queue: Cola; subject_id: string; business_id: string | null; city_id: string; opened_at: string; status: string; assigned_to: string | null; assignee: string | null; decision: string | null }>(
    `select q.id::text, q.queue, q.subject_id, q.business_id, q.city_id, q.opened_at, q.status, q.assigned_to, u.first_name as assignee, q.decision
       from queue_items q left join users u on u.id = q.assigned_to where q.id = $1`, [id])).rows[0];
  if (!q || !colasVisibles(s).includes(q.queue) || (s.cities.length && !s.cities.includes(q.city_id))) return null;
  const base = { ...q, esp: espera(q.opened_at, COLAS[q.queue].sla), mine: q.assigned_to === s.id, puedeDecidir: s.puede("colas", "aprobar") };
  const negocio = q.business_id ? await negocioCorto(q.business_id) : null;
  if (q.queue === "sello") {
    const v = (await db().query<{ status: string; checks: Record<string, boolean>; note: string | null }>(`select status, checks, note from verification_requests where id = $1::bigint`, [q.subject_id])).rows[0];
    return { ...base, negocio, sello: v ?? null };
  }
  if (q.queue === "medios") {
    const m = (await db().query<{ url: string; status: string; visibles: number }>(
      `select m.url, m.status, (select count(*)::int from media x where x.owner_kind = 'business' and x.owner_id = m.owner_id and x.status = 'visible') as visibles
         from media m where m.id = $1::uuid`, [q.subject_id])).rows[0];
    const reps = (await db().query<{ reason: string; note: string | null; at: string }>(
      `select reason, note, created_at as at from photo_reports where media_id = $1::uuid and status = 'open' order by created_at`, [q.subject_id])).rows;
    return { ...base, negocio, foto: m ?? null, reportes: reps };
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
