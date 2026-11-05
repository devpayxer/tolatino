"use server";
import { db } from "@/lib/db";
import { mismoOrigen, normalizarTelefono, yo } from "@/lib/cuenta";
import { ciudades } from "@/lib/ubicacion";

/* APP-NEG-RECOMENDAR: un vecino recomienda un negocio que no está. Va a la cola de Recomendaciones del Super Admin.
   El SMS al negocio («X te recomendó…», una sola vez) se manda con las notificaciones (Fase 2); nada se publica sin
   que el negocio diga que sí. */

export type Recomendacion = { ciudad: string; name: string; cat: string | null; where: string; casa: boolean; con: string; know: string | null; why: string; show: boolean };
export type RespRec =
  | { ok: true; id: string; at: string; name: string; ciudad: string }
  | { ok: false; error: "entrar" | "faltan" | "repetida" | "muchas" | "origen" };

const KNOW = new Set(["cli", "fam", "mio"]);
const limpio = (s: unknown, max: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

export async function enviarRecomendacion(r: Recomendacion): Promise<RespRec> {
  if (!(await mismoOrigen())) return { ok: false, error: "origen" };
  const me = await yo();
  if (!me) return { ok: false, error: "entrar" };
  const name = limpio(r.name, 80), where = limpio(r.where, 120), why = limpio(r.why, 280), con = limpio(r.con, 60);
  const casa = !!r.casa, know = KNOW.has(String(r.know)) ? String(r.know) : null;
  const c = (await ciudades()).find((x) => x.id === r.ciudad);
  const cat = typeof r.cat === "string" && /^NEG-[A-Z]+$/.test(r.cat) ? r.cat : null;
  if (!c || name.length < 2 || !cat || (!casa && where.length < 3) || !know) return { ok: false, error: "faltan" };
  // Contacto: teléfono de EE. UU. normalizado o @usuario de Instagram; si no es ninguno se guarda tal cual (lo revisa el equipo).
  const tel = con ? normalizarTelefono(con) : null;
  const ig = !tel && /^@?[A-Za-z0-9._]{2,30}$/.test(con) ? `@${con.replace(/^@/, "")}` : null;
  const contacto = tel ?? ig ?? (con || null), kind = tel ? "phone" : ig ? "instagram" : con ? "otro" : null;
  const n = (await db().query<{ n: number }>(`select count(*)::int as n from recommendations where by_user_id = $1 and created_at > now() - interval '1 day'`, [me.id])).rows[0]?.n ?? 0;
  if (n >= 20) return { ok: false, error: "muchas" };
  const ins = await db().query<{ id: string; at: string }>(
    `insert into recommendations (by_user_id, city_id, business_name, category_id, "where", address, contact_phone, contact_kind, how_known, is_mine, reveal_me, note)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     on conflict do nothing
     returning id::text, to_char(created_at at time zone (select timezone from cities where id = $2), 'HH12:MI AM') as at`,
    [me.id, c.id, name, cat, casa ? "sin_local" : "address", casa ? null : where, contacto, kind, know, know === "mio", !!r.show, why || null]);
  if (!ins.rows[0]) return { ok: false, error: "repetida" };
  return { ok: true, id: ins.rows[0].id, at: ins.rows[0].at.replace(/^0/, ""), name, ciudad: c.name };
}
