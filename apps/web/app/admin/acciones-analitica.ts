"use server";
/* Exportar (ADM-ANALIT › Exportar): CSV para abrir en Excel o Sheets. Permiso analit:exportar, acotado a las ciudades de
   quien exporta, y cada exportación queda en la auditoría. Las celdas que empiezan con = + - @ se neutralizan (una
   hoja de cálculo nunca ejecuta lo que escribió un negocio o un vecino). */
import { auditar, staff } from "@/lib/admin";
import { csv } from "@/lib/csv";
import { tx } from "@/lib/db";
import type { ResAdm } from "./acciones-colas";
import { hoyEn } from "../../lib/fecha-local";

const TOPE = 50_000;
const NOMBRES: Record<string, string> = { biz: "Negocios", audit: "Historial", nosup: "Búsquedas sin oferta" };

export async function exportar(tipo: "biz" | "audit" | "nosup"): Promise<ResAdm & { archivo?: string; nombre?: string }> {
  const s = await staff();
  if (!s || !s.puede("analit", "exportar")) return { ok: false, mensaje: "Tu rol no exporta datos." };
  if (!NOMBRES[tipo]) return { ok: false, mensaje: "Ese reporte no existe." };
  const archivo = await tx(async (c) => {
    let out: string;
    if (tipo === "biz") {
      const r = await c.query(
        `select b.id, b.name, b.category_id, b.city_id, coalesce(st.plan, 'free') as plan, coalesce(st.verified, false) as verificado,
                st.rating_avg, coalesce(st.review_count, 0) as resenas, b.status, b.created_at
           from businesses b left join business_stats_cache st on st.business_id = b.id
          where (cardinality($1::text[]) = 0 or b.city_id = any($1::text[])) order by b.created_at limit ${TOPE}`, [s.cities]);
      out = csv(["id", "nombre", "categoria", "ciudad", "plan", "verificado", "calificacion", "resenas", "estado", "alta"],
        r.rows.map((x) => [x.id, x.name, x.category_id, x.city_id, x.plan, x.verificado ? 1 : 0, x.rating_avg ?? "", x.resenas, x.status, x.created_at]));
    } else if (tipo === "audit") {
      const r = await c.query(
        `select e.at, coalesce(nullif(trim(coalesce(a.first_name, '') || ' ' || coalesce(a.last_name, '')), ''), e.actor_kind) as quien, e.action, e.target_kind, e.target_id, e.before, e.after, e.reason
           from audit_entries e left join users a on a.id::text = e.actor_id
          where (cardinality($1::text[]) = 0 or e.city_id = any($1::text[])) order by e.at desc limit ${TOPE}`, [s.cities]);
      out = csv(["fecha", "quien", "accion", "objeto", "id", "antes", "despues", "motivo"], r.rows.map((x) => [x.at, x.quien, x.action, x.target_kind, x.target_id, x.before, x.after, x.reason]));
    } else {
      const r = await c.query(
        `select min(a.query) as q, max(a.filters->>'cat') as cat, count(distinct a.user_id)::int as n from search_alerts a
          where a.removed_at is null and a.created_at > now() - interval '30 days' and (cardinality($1::text[]) = 0 or a.city_id = any($1::text[]))
          group by lower(a.query) order by n desc limit ${TOPE}`, [s.cities]);
      out = csv(["busqueda", "categoria", "avisos"], r.rows.map((x) => [x.q, x.cat ?? "", x.n]));
    }
    await auditar(c, { actor: s.id, action: "analitica.exportar", targetKind: "report", targetId: tipo, after: { reporte: NOMBRES[tipo], formato: "CSV" }, reason: "Exportar desde Analítica" });
    return out;
  });
  return { ok: true, mensaje: "Descargado. Quedó en la auditoría.", archivo, nombre: `tolatino-${tipo}-${hoyEn()}.csv` };
}
