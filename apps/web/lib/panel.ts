import "server-only";
import { db } from "./db";
import { yo, type Yo } from "./cuenta";

/* Panel del negocio: quién entra. El servidor decide en cada lectura y cada cambio: la persona tiene que ser miembro
   activo del negocio (dueño, o equipo con acceso a esa parte del panel). Nunca se confía en lo que diga la pantalla. */
export type Acceso = { yo: Yo; negocio: { id: string; name: string; city_id: string; category_id: string; status: string }; kind: "owner" | "staff" | "renter"; partes: string[] };

export async function accesoPanel(negocioId: string, parte?: string): Promise<Acceso | null> {
  if (typeof negocioId !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(negocioId) || negocioId.length > 80) return null;
  const me = await yo();
  if (!me) return null;
  const r = (await db().query<{ id: string; name: string; city_id: string; category_id: string; status: string; kind: Acceso["kind"]; panel_access: string[] }>(
    `select b.id, b.name, b.city_id, b.category_id, b.status, m.kind, m.panel_access
       from business_members m join businesses b on b.id = m.business_id
      where m.business_id = $1 and m.user_id = $2 and m.status = 'active' and b.status not in ('merged', 'closed')
      order by (m.kind = 'owner') desc limit 1`, [negocioId, me.id])).rows[0];
  if (!r) return null;
  const partes = r.kind === "owner" ? ["all"] : r.panel_access ?? [];
  if (parte && !partes.includes("all") && !partes.includes(parte)) return null;
  const { kind, panel_access: _p, ...negocio } = r;
  void _p;
  return { yo: me, negocio, kind, partes };
}

/* Los negocios de la persona (para entrar al panel y elegir cuál). */
export async function misNegocios(userId: string) {
  return (await db().query<{ id: string; name: string; kind: string; plan: string; foto: string | null }>(
    `select b.id, b.name, m.kind, coalesce(s.plan, 'free') as plan,
            (select x.url from media x where x.owner_kind = 'business' and x.owner_id = b.id and x.status = 'visible' order by x.sort limit 1) as foto
       from business_members m join businesses b on b.id = m.business_id left join business_stats_cache s on s.business_id = b.id
      where m.user_id = $1 and m.status = 'active' and b.status not in ('merged', 'closed')
      order by (m.kind = 'owner') desc, b.created_at`, [userId])).rows;
}
