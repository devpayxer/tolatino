import "server-only";
import type { Staff } from "./admin";
import { db } from "./db";

/* 9n-8 · Super Admin › Negocios › «Posibles duplicados» y «Reclamos» (prototipo secNeg: vistas list · dup · claim; bizDups / dupRow).
   Los pares los escribe la base (business_dup_pairs, 0158); aquí se vuelven a comprobar con los nombres de HOY y se les pone su estado:
   POR REVISAR · VINCULADOS · SUCURSAL (business_links aceptado por los dos) · NO ES DUPLICADO (business_dup_decisions) · FUSIÓN EN LA COLA
   (sensitive_changes mergeBiz pendiente) · FUSIONADOS (merged_into). Todo acotado a las ciudades de la persona; paginado por cursor. */
export const DUP_POR_PAGINA = 30;
export type EstadoDup = "open" | "linked" | "no" | "pend" | "merged";
export type ParDup = { a: { id: string; name: string }; b: { id: string; name: string }; addr: boolean; st: EstadoDup; motivo: string | null; sk: string };

const VIVO = `('active', 'temp_closed', 'hidden', 'suspended')`;
/* Las condiciones del par con los nombres de hoy: la misma regla que biz_dup_probe (0158). */
const PAR_SQL = `from business_dup_pairs p join businesses a on a.id = p.a_id join businesses b on b.id = p.b_id
   where (cardinality($1::text[]) = 0 or p.city_id = any($1::text[]))
     and (a.merged_into = b.id or b.merged_into = a.id
          or (a.status in ${VIVO} and b.status in ${VIVO}
              and (similarity(biz_norm_name(a.name), biz_norm_name(b.name)) >= 0.75
                   or (similarity(biz_norm_name(a.name), biz_norm_name(b.name)) >= 0.6 and biz_first_word(a.name) = biz_first_word(b.name)))))`;
const ESTADO_SQL = `case when a.merged_into = b.id or b.merged_into = a.id then 'merged'
    when exists (select 1 from business_links l where l.status = 'ok' and ((l.a_id = p.a_id and l.b_id = p.b_id) or (l.a_id = p.b_id and l.b_id = p.a_id))) then 'linked'
    when exists (select 1 from business_dup_decisions d where d.a_id = p.a_id and d.b_id = p.b_id) then 'no'
    when exists (select 1 from sensitive_changes x where x.type = 'mergeBiz' and x.status = 'pending'
                  and ((x.target_id = p.a_id and x.payload->>'dup' = p.b_id) or (x.target_id = p.b_id and x.payload->>'dup' = p.a_id))) then 'pend'
    else 'open' end`;

/* Los pares de las ciudades de la persona (o de un negocio, en su 360°): primero los que hay que revisar. */
export async function paresDup(s: Staff, o: { negocio?: string; cur?: string | null } = {}): Promise<{ filas: ParDup[]; siguiente: string | null }> {
  const p: unknown[] = [s.cities];
  let extra = "";
  if (o.negocio) { p.push(o.negocio); extra += ` and (p.a_id = $${p.length} or p.b_id = $${p.length})`; }
  const llave = `(case when (${ESTADO_SQL}) = 'open' then '0' else '1' end) || '|' || p.a_id || '|' || p.b_id`;
  if (o.cur && /^[01]\|[a-z0-9-]{1,80}\|[a-z0-9-]{1,80}$/.test(o.cur)) { p.push(o.cur); extra += ` and ${llave} > $${p.length}`; }
  const lim = o.negocio ? 20 : DUP_POR_PAGINA;
  const r = await db().query<{ a_id: string; b_id: string; an: string; bn: string; addr: boolean; st: EstadoDup; motivo: string | null; sk: string }>(
    `select p.a_id, p.b_id, a.name as an, b.name as bn,
            (a.address is not null and biz_norm_name(a.address) = biz_norm_name(b.address)) as addr, ${ESTADO_SQL} as st,
            (select d.reason from business_dup_decisions d where d.a_id = p.a_id and d.b_id = p.b_id) as motivo, ${llave} as sk
       ${PAR_SQL}${extra} order by ${llave} limit ${lim + 1}`, p);
  const hay = r.rows.length > lim, filas = r.rows.slice(0, lim);
  return { filas: filas.map((x) => ({ a: { id: x.a_id, name: x.an }, b: { id: x.b_id, name: x.bn }, addr: x.addr, st: x.st, motivo: x.motivo, sk: x.sk })), siguiente: hay && !o.negocio ? filas[filas.length - 1]!.sk : null };
}

/* Cuántos pares hay por revisar y cuántos reclamos por decidir (los números de las pestañas). */
export async function cuentasVistas(s: Staff): Promise<{ dup: number; rec: number }> {
  const [d, r] = await Promise.all([
    db().query<{ n: number }>(`select count(*)::int as n ${PAR_SQL} and (${ESTADO_SQL}) = 'open'`, [s.cities]),
    db().query<{ n: number }>(`select count(*)::int as n from queue_items q where q.queue = 'cambio' and q.subject_kind = 'claim' and q.status = 'open'
                                and (cardinality($1::text[]) = 0 or q.city_id = any($1::text[]))`, [s.cities]),
  ]);
  return { dup: d.rows[0]?.n ?? 0, rec: r.rows[0]?.n ?? 0 };
}

export type ReclamoFila = { caso: string; id: string; negocio: string; negocio_id: string; quien: string | null; at: string; tieneDueno: boolean };
export type SinDueno = { id: string; name: string; cat: string; phone: boolean; inv: string | null; sk: string };
export const SIN_DUENO_POR_PAGINA = 10;

/* Reclamos por decidir (la cola Cambios sensibles, solo los reclamos) y los negocios activos SIN dueño con su última invitación. */
export async function vistaReclamos(s: Staff, cur: string | null) {
  const p: unknown[] = [s.cities];
  const llave = `lower(b.name) || '|' || b.id`;
  let w = "";
  if (cur && cur.length <= 200 && !/[\u0000-\u001f]/.test(cur)) { p.push(cur); w = ` and ${llave} > $2`; }
  const [rec, sin, total] = await Promise.all([
    db().query<ReclamoFila>(
      `select q.id::text as caso, cl.id, b.name as negocio, b.id as negocio_id,
              nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), '') as quien, cl.created_at as at, b.owner_user_id is not null as "tieneDueno"
         from queue_items q join claims cl on cl.id = q.subject_id join businesses b on b.id = cl.business_id join users u on u.id = cl.user_id
        where q.queue = 'cambio' and q.subject_kind = 'claim' and q.status = 'open' and (cardinality($1::text[]) = 0 or q.city_id = any($1::text[]))
        order by q.opened_at limit 50`, [s.cities]),
    db().query<SinDueno>(
      `select b.id, b.name, c.name->>'es' as cat, b.phone is not null as phone,
              (select max(e.at) from audit_entries e where e.action = 'negocio.invitar_reclamar' and e.target_id = b.id) as inv, ${llave} as sk
         from businesses b join categories c on c.id = b.category_id
        where b.status = 'active' and b.owner_user_id is null and (cardinality($1::text[]) = 0 or b.city_id = any($1::text[]))${w}
        order by ${llave} limit ${SIN_DUENO_POR_PAGINA + 1}`, p),
    db().query<{ n: number }>(`select count(*)::int as n from businesses b where b.status = 'active' and b.owner_user_id is null and (cardinality($1::text[]) = 0 or b.city_id = any($1::text[]))`, [s.cities]),
  ]);
  const hay = sin.rows.length > SIN_DUENO_POR_PAGINA, filas = sin.rows.slice(0, SIN_DUENO_POR_PAGINA);
  return { reclamos: rec.rows, sinDueno: filas, sinDuenoTotal: total.rows[0]?.n ?? 0, siguiente: hay ? filas[filas.length - 1]!.sk : null };
}

/* Los cambios sensibles pendientes de un negocio (su 360°): para no pedir dos veces lo mismo y decir «en la cola». */
export async function cambiosPendientes(id: string) {
  return (await db().query<{ id: string; type: string; caso: string | null }>(
    `select x.id, x.type, (select q.id::text from queue_items q where q.subject_kind = 'sensitive_change' and q.subject_id = x.id and q.status = 'open' limit 1) as caso
       from sensitive_changes x where x.target_kind = 'business' and x.status = 'pending' and (x.target_id = $1 or x.payload->>'dup' = $1) order by x.created_at`, [id])).rows;
}

/* Las 17 categorías (para «Cambiar categoría»). */
export async function categorias() {
  return (await db().query<{ id: string; l: string }>(`select id, name->>'es' as l from categories order by sort, id`)).rows;
}
