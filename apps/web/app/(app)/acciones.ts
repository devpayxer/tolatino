"use server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { yo } from "@/lib/cuenta";

export async function cambiarIdioma(lang: "es" | "en") {
  (await cookies()).set("tl_lang", lang === "en" ? "en" : "es", { path: "/", maxAge: 365 * 86400, sameSite: "lax" });
}

/* ── Acciones de las listas de negocios. El servidor valida todo; la pantalla solo pide. ── */

const ID_NEG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export type Respuesta = { ok: true; on?: boolean } | { ok: false; entrar?: true };

/* Guardar / quitar un negocio de Guardados. Sin sesión: la pantalla manda a entrar y vuelve. */
export async function guardarNegocio(id: string): Promise<Respuesta> {
  if (typeof id !== "string" || !ID_NEG.test(id) || id.length > 80) return { ok: false };
  const u = await yo();
  if (!u) return { ok: false, entrar: true };
  const r = await db().query<{ on: boolean }>(
    `with existe as (select 1 from businesses where id = $2 and status = 'active'),
          quita as (delete from favorites where user_id = $1 and kind = 'business' and target_id = $2 returning 1),
          pone as (insert into favorites (user_id, kind, target_id)
                   select $1, 'business', $2 from existe where not exists (select 1 from quita) returning 1)
     select exists (select 1 from pone) as on`,
    [u.id, id],
  );
  return { ok: true, on: !!r.rows[0]?.on };
}

/* Toque de contacto (llamar, cómo llegar): alimenta las estadísticas del negocio en su panel. */
const TOQUES = new Set(["call", "whatsapp", "directions", "share", "calendar", "copy"]);
export async function registrarToque(id: string, kind: string, origen: string): Promise<void> {
  if (typeof id !== "string" || !ID_NEG.test(id) || !TOQUES.has(kind)) return;
  const u = await yo();
  await db().query(
    `insert into contact_taps (business_id, user_id, kind, source)
     select id, $2, $3, left($4, 60) from businesses where id = $1 and status = 'active'`,
    [id, u?.id ?? null, kind, String(origen ?? "")],
  );
}

/* «Avísame cuando haya»: guarda la búsqueda; cuando llegue un negocio que encaje, se avisa (Fase 8, notificaciones). */
export async function avisame(ciudad: string, cat: string, sub: string, filtros: string[]): Promise<Respuesta> {
  const u = await yo();
  if (!u) return { ok: false, entrar: true };
  if (!/^[a-z]{3}$/.test(ciudad) || !/^NEG-[A-Z]+$/.test(cat)) return { ok: false };
  const f = (Array.isArray(filtros) ? filtros : []).filter((x) => typeof x === "string" && x.length <= 40).slice(0, 20);
  const s = typeof sub === "string" ? sub.slice(0, 80) : "";
  await db().query(
    `insert into search_alerts (user_id, city_id, query, filters)
     select $1, $2, $3, $4::jsonb
      where exists (select 1 from categories where id = $5)
        and not exists (select 1 from search_alerts where user_id = $1 and city_id = $2 and query = $3
                          and filters = $4::jsonb and removed_at is null)`,
    [u.id, ciudad, `${cat}${s ? " · " + s : ""}`, JSON.stringify({ cat, sub: s || null, filtros: f }), cat],
  );
  return { ok: true, on: true };
}
