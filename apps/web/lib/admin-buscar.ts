import "server-only";
import type { Staff } from "./admin";
import { db } from "./db";
import { gruposNav } from "./admin-nav";
import { telefonoBonito } from "./panel";

/* 9n-3 · El buscador global del Super Admin (⌘K): negocio, usuario, # de operación y sección, en una sola caja. Cada grupo solo se busca si la persona
   tiene `ver` en su sección, y todo va acotado a las ciudades de su vista (`s.cities`: las de su rol o la que eligió). Máximo 6 por grupo. */
export type Hallazgo = { t: string; s: string; href: string; icon: string };
export type Resultados = { q: string; negocios: Hallazgo[]; usuarios: Hallazgo[]; operaciones: Hallazgo[]; secciones: Hallazgo[] };
const MAX = 6;

export async function buscarTodo(s: Staff, entrada: string): Promise<Resultados> {
  const q = entrada.trim().slice(0, 80);
  const vacio: Resultados = { q, negocios: [], usuarios: [], operaciones: [], secciones: [] };
  if (q.length < 2) return vacio;
  const dig = q.replace(/\D/g, "");
  const [neg, usr, ops, grupos] = await Promise.all([
    s.puede("neg", "ver")
      ? db().query<{ id: string; name: string; cat: string; ciudad: string }>(
          `select b.id, b.name, c.name->>'es' as cat, ci.name as ciudad
             from businesses b join categories c on c.id = b.category_id join cities ci on ci.id = b.city_id
            where b.status <> 'merged' and (cardinality($2::text[]) = 0 or b.city_id = any($2::text[]))
              and (lower(b.name) like '%' || lower($1) || '%' or b.id like '%' || lower($1) || '%' or ($3 <> '' and length($3) >= 4 and coalesce(b.phone, '') like '%' || $3 || '%'))
            order by (lower(b.name) like lower($1) || '%') desc, b.name limit ${MAX}`, [q, s.cities, dig])
      : null,
    s.puede("usr", "ver")
      ? db().query<{ id: string; nombre: string | null; phone: string; ciudad: string | null }>(
          `select u.id, nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), '') as nombre, u.phone, ci.name as ciudad
             from users u left join cities ci on ci.id = u.home_city_id
            where (cardinality($2::text[]) = 0 or u.home_city_id = any($2::text[]))
              and (lower(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')) like '%' || lower($1) || '%' or lower(coalesce(u.nick, '')) like '%' || lower($1) || '%'
                   or ($3 <> '' and length($3) >= 3 and u.phone like '%' || $3 || '%') or lower(coalesce(u.email::text, '')) like '%' || lower($1) || '%' or u.id::text = lower($1))
            order by u.last_seen_at desc nulls last limit ${MAX}`, [q, s.cities, dig])
      : null,
    s.puede("tx", "ver") && /^[A-Za-z]{0,3}-?[0-9A-Za-z]{2,}$/.test(q)
      ? db().query<{ number: string; kind: string; total: number; bname: string | null }>(
          `select o.number, o.kind, o.total_cents as total, b.name as bname from operations o left join businesses b on b.id = o.business_id
            where o.kind in ('order', 'market_order', 'hold', 'appointment', 'party', 'private_event', 'table', 'night', 'trip', 'enrollment', 'visit', 'tickets', 'rental', 'plan') and (cardinality($2::text[]) = 0 or o.city_id = any($2::text[])) and upper(o.number) like upper($1) || '%' order by o.created_at desc limit ${MAX}`, [q, s.cities])
      : null,
    gruposNav((k) => s.puede(k, "ver")),
  ]);
  const ql = q.toLowerCase();
  return {
    q,
    negocios: (neg?.rows ?? []).map((x) => ({ t: x.name, s: `${x.cat} · ${x.ciudad}`, href: `/admin/negocios/${x.id}`, icon: "store" })),
    usuarios: (usr?.rows ?? []).map((x) => ({ t: x.nombre ?? "(sin nombre todavía)", s: `${telefonoBonito(x.phone)}${x.ciudad ? ` · ${x.ciudad}` : ""}`, href: `/admin/usuarios/${x.id}`, icon: "users" })),
    operaciones: (ops?.rows ?? []).map((x) => ({ t: `#${x.number}`, s: `${x.bname ?? "Sin negocio"} · $${(x.total / 100).toFixed(2)}`, href: `/admin/transacciones?q=${encodeURIComponent(x.number)}`, icon: "receipt" })),
    secciones: grupos.flatMap((g) => g.items).filter((i) => i.href && i.label.toLowerCase().includes(ql)).slice(0, MAX).map((i) => ({ t: i.label, s: "Sección", href: i.href!, icon: i.icon })),
  };
}
