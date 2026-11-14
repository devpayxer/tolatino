import "server-only";
import { auditar, type Staff } from "../admin";
import { destacados } from "../categoria";
import { valores } from "../config";
import { db, tx } from "../db";
import { ciudades, resolver } from "../ubicacion";
import { bien, mal, type Res } from "./comun";

/* 9h · Super Admin › Crecimiento › Destacados (prototipo secMkt «Destacados»: «los Pro de la portada; rotación diaria automática; aquí fijas o quitas a
   mano por 7 días con motivo»). Fijar = sale primero en Negocios › Destacados de su ciudad; quitar = no entra a la rotación. Dura destacados_dias (7) y
   vuelve solo a la rotación; fijados a la vez por ciudad: destacados_por_ciudad (6), lo impone la base (featured_reglas, con candado por ciudad). Nada se
   borra ni se edita: se retira y se crea otro. mkt:editar, con motivo y auditoría. */

const enCiudad = (s: Staff, c: string) => !s.cities.length || s.cities.includes(c);
const NEG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function fijarDestacado(s: Staff, p: { ciudad: string; negocio: string; modo: string; motivo: string }): Promise<Res> {
  if (!s.puede("mkt", "editar")) return mal("Tu rol no cambia los destacados.", "Your role cannot change featured businesses.");
  const motivo = String(p.motivo ?? "").replace(/\s+/g, " ").trim().slice(0, 300), modo = p.modo === "quitar" ? "quitar" : p.modo === "fijar" ? "fijar" : null;
  if (!modo) return mal("Elige fijar o quitar.", "Pick pin or remove.");
  if (!NEG.test(String(p.negocio ?? ""))) return mal("Ese negocio no existe.", "That business does not exist.");
  if (!enCiudad(s, p.ciudad)) return mal("Esa ciudad no es tuya.", "That city is not yours.");
  if (motivo.length < 3) return mal("Escribe el motivo.", "Write the reason.");
  const cfg = await valores("destacados_dias", "destacados_por_ciudad");
  try {
    return await tx(async (c) => {
      const b = (await c.query<{ name: string; city_id: string; status: string }>(`select name, city_id, status from businesses where id = $1`, [p.negocio])).rows[0];
      if (!b || b.city_id !== p.ciudad) return mal("Ese negocio no es de esta ciudad.", "That business is not in this city.");
      if (b.status !== "active") return mal("Ese negocio no está activo.", "That business is not active.");
      const id = (await c.query<{ id: string }>(
        `insert into featured (city_id, business_id, mode, to_at, by_staff_id, reason) values ($1, $2, $3, now() + make_interval(days => $4::int), $5, $6) returning id::text`,
        [p.ciudad, p.negocio, modo, cfg.destacados_dias, s.id, motivo])).rows[0]!.id;
      await auditar(c, { actor: s.id, action: modo === "fijar" ? "mkt.destacado.fijar" : "mkt.destacado.quitar", targetKind: "business", targetId: p.negocio, city: p.ciudad,
        after: { featured: id, modo, dias: cfg.destacados_dias }, reason: motivo });
      return modo === "fijar" ? bien(`${b.name} sale primero en Destacados por ${cfg.destacados_dias} días.`, `${b.name} shows first in Featured for ${cfg.destacados_dias} days.`)
        : bien(`${b.name} sale de la rotación por ${cfg.destacados_dias} días.`, `${b.name} leaves the rotation for ${cfg.destacados_dias} days.`);
    });
  } catch (e) {
    const m = String((e as Error).message ?? "");
    if (m.includes("destacados_tope")) return mal(`Ya hay ${cfg.destacados_por_ciudad} fijados en esta ciudad: retira uno antes.`, `There are already ${cfg.destacados_por_ciudad} pinned in this city: retire one first.`);
    if (m.includes("ya tiene uno vivo")) return mal("Ese negocio ya está fijado o quitado: retira eso antes.", "That business is already pinned or removed: retire that first.");
    throw e;
  }
}

export async function retirarDestacado(s: Staff, id: string, motivo: string): Promise<Res> {
  if (!s.puede("mkt", "editar")) return mal("Tu rol no cambia los destacados.", "Your role cannot change featured businesses.");
  const m = String(motivo ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
  if (!/^\d{1,18}$/.test(String(id))) return mal("Ese destacado no existe.", "That featured entry does not exist.");
  if (m.length < 3) return mal("Escribe el motivo.", "Write the reason.");
  return tx(async (c) => {
    const f = (await c.query<{ city: string; biz: string; vivo: boolean }>(`select city_id as city, business_id as biz, retired_at is null and to_at > now() as vivo from featured where id = $1::bigint for update`, [id])).rows[0];
    if (!f) return mal("Ese destacado no existe.", "That featured entry does not exist.");
    if (!enCiudad(s, f.city)) return mal("Esa ciudad no es tuya.", "That city is not yours.");
    if (!f.vivo) return mal("Ya terminó.", "It is already over.");
    await c.query(`update featured set retired_at = now(), retired_by = $2, retired_reason = $3 where id = $1::bigint`, [id, s.id, m]);
    await auditar(c, { actor: s.id, action: "mkt.destacado.retirar", targetKind: "business", targetId: f.biz, city: f.city, before: { featured: id, vivo: true }, after: { vivo: false }, reason: m });
    return bien("Retirado: vuelve a la rotación de siempre.", "Retired: it goes back to the usual rotation.");
  });
}

export type DestacadoAdm = { id: string; negocio: string; nombre: string; modo: "fijar" | "quitar"; hasta: string; quien: string | null; motivo: string; vivo: boolean; razon: string | null };
/* Lo vivo y lo reciente de una ciudad, y la vitrina de hoy tal como la ve el vecino (los 6 de Negocios › Destacados, desde el centro). */
export async function destacadosAdmin(s: Staff, ciudad: string) {
  if (!enCiudad(s, ciudad)) return null;
  const cs = await ciudades(), ci = cs.find((x) => x.id === ciudad);
  if (!ci) return null;
  const [lista, cfg] = await Promise.all([
    db().query<DestacadoAdm>(
      `select f.id::text, f.business_id as negocio, b.name as nombre, f.mode as modo, to_char(f.to_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as hasta, f.reason as motivo,
              f.retired_at is null and f.to_at > now() as vivo, f.retired_reason as razon,
              nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), '') as quien
         from featured f join businesses b on b.id = f.business_id left join users u on u.id = f.by_staff_id
        where f.city_id = $1 and (f.retired_at is null and f.to_at > now() or f.created_at > now() - interval '30 days')
        order by (f.retired_at is null and f.to_at > now()) desc, f.created_at desc limit 50`, [ciudad]),
    valores("destacados_por_ciudad", "destacados_dias"),
  ]);
  const hoy = ci.status === "on" ? await destacados(resolver(cs, { c: ciudad }), 6) : [];
  return { lista: lista.rows, hoy: hoy.map((b) => ({ id: b.id, nombre: b.name, abierto: b.open })), tope: cfg.destacados_por_ciudad, dias: cfg.destacados_dias,
    fijados: lista.rows.filter((x) => x.vivo && x.modo === "fijar").length };
}

/* Buscar un negocio activo de la ciudad para fijarlo o quitarlo (por nombre; los Pro primero). */
export async function buscarNegocio(s: Staff, ciudad: string, q: string) {
  if (!enCiudad(s, ciudad)) return [];
  const t = String(q ?? "").trim().toLowerCase().slice(0, 40);
  if (t.length < 2) return [];
  return (await db().query<{ id: string; nombre: string; pro: boolean }>(
    `select b.id, b.name as nombre, coalesce(st.plan = 'pro', false) as pro from businesses b left join business_stats_cache st on st.business_id = b.id
      where b.city_id = $1 and b.status = 'active' and lower(unaccent(b.name)) like '%' || unaccent($2::text) || '%' order by (st.plan = 'pro') desc, b.name limit 8`, [ciudad, t])).rows;
}
